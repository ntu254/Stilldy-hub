import { Injectable, Logger } from '@nestjs/common'
import { InjectModel, InjectConnection } from '@nestjs/mongoose'
import { Model, Connection } from 'mongoose'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Subscription, SubscriptionStatus } from './schemas/subscription.schema'
import { User } from '../users/entities/user.entity'
import { Payment, PaymentStatus } from './schemas/payment.schema'
import { MyDocument, MyDocumentType } from '../documents/schemas/document.schema'
import { DocumentChunk, DocumentChunkDocument } from '../chatbot/schemas/document-chunk.schema'
import { SavedDocument, SavedDocumentDocument } from '../documents/schemas/saved-document.schema'
import { Report, ReportDocument } from '../documents/schemas/report.schema'
import { DocumentConversation, DocumentConversationDocument } from '../documents/schemas/document-conversation.schema'
import { FirebaseStorageService } from '../documents/firebase-storage.service'
import { SettingsService } from '../settings/settings.service'
import { NotificationsService } from '../notifications/notifications.service'
import { NotificationType } from '../notifications/notification-type.enum'

@Injectable()
export class SubscriptionExpirationService {
  private readonly logger = new Logger(SubscriptionExpirationService.name)

  constructor(
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<Subscription>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectModel(MyDocument.name) private readonly myDocumentModel: Model<MyDocumentType>,
    @InjectModel(DocumentChunk.name) private readonly documentChunkModel: Model<DocumentChunkDocument>,
    @InjectModel(SavedDocument.name) private readonly savedDocumentModel: Model<SavedDocumentDocument>,
    @InjectModel(Report.name) private readonly reportModel: Model<ReportDocument>,
    @InjectModel(DocumentConversation.name)
    private readonly documentConversationModel: Model<DocumentConversationDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly firebaseStorageService: FirebaseStorageService,
    private readonly settingsService: SettingsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Chạy định kỳ mỗi tiếng để kiểm tra các gói hết hạn
  @Cron(CronExpression.EVERY_HOUR)
  async handleSubscriptionExpiration() {
    this.logger.log('Bắt đầu kiểm tra các gói đăng ký hết hạn...')

    const now = new Date()
    const expiredSubscriptions = await this.subscriptionModel
      .find({
        status: SubscriptionStatus.ACTIVE,
        endDate: { $lt: now },
      })
      .exec()

    if (expiredSubscriptions.length === 0) {
      this.logger.log('Không có gói đăng ký nào cần xử lý hết hạn.')
      return
    }

    this.logger.log(`Tìm thấy ${expiredSubscriptions.length} gói đăng ký đã hết hạn. Bắt đầu xử lý...`)

    for (const sub of expiredSubscriptions) {
      const session = await this.connection.startSession()
      session.startTransaction()

      try {
        // 1. Cập nhật trạng thái Subscription thành expired
        await this.subscriptionModel
          .findByIdAndUpdate(sub._id, { status: SubscriptionStatus.EXPIRED }, { session })
          .exec()

        // 2. Kiểm tra xem người dùng có gói active nào khác hay không
        const otherActive = await this.subscriptionModel
          .findOne({
            userId: sub.userId,
            status: SubscriptionStatus.ACTIVE,
            _id: { $ne: sub._id },
          })
          .session(session)
          .exec()

        // 3. Nếu không còn gói active nào khác, hạ cấp User về Free
        if (!otherActive) {
          const limit = 2 * 1024 * 1024 * 1024 // 2GB Free Limit

          // Tính tổng dung lượng hiện tại
          const sizeStats = await this.myDocumentModel
            .aggregate([
              { $match: { uploadedBy: sub.userId, _destroy: { $ne: true } } },
              { $unwind: '$versions' },
              { $group: { _id: null, totalBytes: { $sum: '$versions.fileSize' } } },
            ])
            .session(session)
          const usedBytes = sizeStats[0]?.totalBytes ?? 0

          let willDeleteDataAt: Date | null = null

          if (usedBytes > limit) {
            // Lấy tất cả tài liệu hiện hoạt động
            const activeDocs = await this.myDocumentModel
              .find({ uploadedBy: sub.userId, _destroy: { $ne: true } })
              .sort({ createdAt: 1 })
              .session(session)
              .exec()

            let activeBytesSum = 0
            for (const doc of activeDocs) {
              const docSize = doc.versions.reduce((sum, v) => sum + v.fileSize, 0)
              if (activeBytesSum + docSize <= limit) {
                activeBytesSum += docSize
              } else {
                // Vượt limit, chuyển sang system soft-delete
                doc._destroy = true
                doc.isSystemSoftDeleted = true
                await doc.save({ session })
              }
            }

            const gracePeriodDays = await this.settingsService.getSubscriptionGracePeriodDays()
            willDeleteDataAt = new Date(now.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000)
          }

          await this.userModel
            .findByIdAndUpdate(
              sub.userId,
              {
                subscriptionId: null,
                isPro: false,
                storageLimit: limit,
                willDeleteDataAt,
              },
              { session },
            )
            .exec()
          this.logger.log(
            `Hạ cấp thành công người dùng ID: ${sub.userId.toString()} về gói Free (2GB). Hạn chót xóa tài liệu: ${willDeleteDataAt}`,
          )
        } else {
          // Nếu có gói active khác (ví dụ: gói gia hạn hoặc gói khác), cập nhật subscriptionId của user sang gói đó
          await this.userModel
            .findByIdAndUpdate(
              sub.userId,
              {
                subscriptionId: otherActive._id,
              },
              { session },
            )
            .exec()
        }

        await session.commitTransaction()
      } catch (error: any) {
        await session.abortTransaction()
        this.logger.error(`Lỗi xử lý hết hạn cho subscription ${sub._id.toString()}: ${error.message}`)
      } finally {
        await session.endSession()
      }
    }

    this.logger.log('Hoàn thành tiến trình kiểm tra hết hạn.')
  }

  // Chạy định kỳ mỗi phút để quét và cập nhật các giao dịch PENDING đã hết hạn
  @Cron(CronExpression.EVERY_MINUTE)
  async handlePaymentExpiration() {
    const now = new Date()
    const result = await this.paymentModel
      .updateMany(
        {
          status: PaymentStatus.PENDING,
          $or: [
            { expiredAt: { $ne: null, $lte: now } },
            {
              expiredAt: null,
              createdAt: { $lte: new Date(now.getTime() - 15 * 60 * 1000) },
            },
          ],
        },
        {
          $set: { status: PaymentStatus.EXPIRED },
        },
      )
      .exec()

    if (result.modifiedCount > 0) {
      this.logger.log(`Đã cập nhật trạng thái EXPIRED cho ${result.modifiedCount} giao dịch quá hạn.`)
    }
  }

  // Chạy định kỳ mỗi ngày 1 lần để dọn dẹp các tài liệu quá hạn của người dùng
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredSubscriptionsCleanup() {
    this.logger.log('Bắt đầu chạy Cron-job dọn dẹp tài liệu của người dùng hết hạn...')

    const now = new Date()

    // Tìm tất cả người dùng có thời hạn xóa dữ liệu quá hạn
    const expiredUsers = await this.userModel
      .find({
        willDeleteDataAt: { $ne: null, $lte: now },
      })
      .exec()

    if (expiredUsers.length === 0) {
      this.logger.log('Không có người dùng nào hết hạn quá hạn cần dọn dẹp tài liệu.')
      return
    }

    this.logger.log(`Tìm thấy ${expiredUsers.length} người dùng quá hạn cần dọn dẹp dữ liệu.`)

    for (const user of expiredUsers) {
      this.logger.log(
        `Tiến hành xóa vĩnh viễn các tài liệu vượt giới hạn của user ${user._id.toString()} (${user.email})`,
      )

      // Tìm tất cả tài liệu bị hệ thống xóa mềm trước đó của user này
      const systemSoftDeletedDocs = await this.myDocumentModel
        .find({
          uploadedBy: user._id,
          _destroy: true,
          isSystemSoftDeleted: true,
        })
        .exec()

      this.logger.log(`Tìm thấy ${systemSoftDeletedDocs.length} tài liệu bị hệ thống xóa mềm. Bắt đầu xóa vật lý...`)

      for (const doc of systemSoftDeletedDocs) {
        // 1. Xóa các file vật lý trên Firebase Storage
        const versions = doc.versions || []
        for (const version of versions) {
          if (version.fileUrl) {
            try {
              await this.firebaseStorageService.deleteFile(version.fileUrl)
              this.logger.log(`[Firebase] Đã xóa file vật lý thành công: ${version.fileUrl}`)
            } catch (err: any) {
              this.logger.error(`[Firebase] Lỗi khi xóa file vật lý ${version.fileUrl}: ${err.message}`)
            }
          }
        }

        // 2. Xóa các dữ liệu liên kết trong MongoDB
        try {
          await this.documentChunkModel.deleteMany({ documentId: doc._id }).exec()
          await this.savedDocumentModel.deleteMany({ documentId: doc._id }).exec()
          await this.reportModel.deleteMany({ documentId: doc._id }).exec()
          await this.documentConversationModel.deleteMany({ documentId: doc._id }).exec()

          // 3. Xóa cứng document khỏi database
          await this.myDocumentModel.deleteOne({ _id: doc._id }).exec()
          this.logger.log(`[MongoDB] Đã xóa vĩnh viễn document ID: ${doc._id} (${doc.title})`)
        } catch (err: any) {
          this.logger.error(`[MongoDB] Lỗi khi xóa document ID ${doc._id}: ${err.message}`)
        }
      }

      // Reset warning date về null sau khi đã đưa dung lượng về đúng hạn mức
      user.willDeleteDataAt = null
      await user.save()
      this.logger.log(`Hoàn tất dọn dẹp cho user ${user._id.toString()}`)
    }

    this.logger.log('Hoàn thành Cron-job dọn dẹp tài liệu hết hạn.')
  }

  // Chạy định kỳ mỗi ngày 1 lần để dọn dẹp tài liệu của người dùng bị khóa tài khoản (banned) quá hạn
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleBannedUsersCleanup() {
    this.logger.log('Bắt đầu chạy Cron-job dọn dẹp tài liệu của người dùng bị khóa...')

    const now = new Date()

    // Tìm tất cả người dùng bị khóa tài khoản và đã quá hạn xóa dữ liệu
    const expiredBannedUsers = await this.userModel
      .find({
        isActive: false,
        bannedDataDeletionAt: { $ne: null, $lte: now },
      })
      .exec()

    if (expiredBannedUsers.length === 0) {
      this.logger.log('Không có người dùng bị khóa nào cần dọn dẹp tài liệu.')
      return
    }

    this.logger.log(`Tìm thấy ${expiredBannedUsers.length} người dùng bị khóa quá hạn cần dọn dẹp dữ liệu.`)

    for (const user of expiredBannedUsers) {
      this.logger.log(
        `Tiến hành xóa vĩnh viễn toàn bộ tài liệu của user bị khóa: ${user._id.toString()} (${user.email})`,
      )

      // Tìm tất cả tài liệu của user này (bao gồm cả tài liệu bình thường và đã xóa mềm)
      const userDocs = await this.myDocumentModel
        .find({
          uploadedBy: user._id,
        })
        .exec()

      this.logger.log(`Tìm thấy ${userDocs.length} tài liệu. Bắt đầu xóa vật lý và liên kết...`)

      for (const doc of userDocs) {
        // 1. Xóa các file vật lý trên Firebase Storage
        const versions = doc.versions || []
        for (const version of versions) {
          if (version.fileUrl) {
            try {
              await this.firebaseStorageService.deleteFile(version.fileUrl)
              this.logger.log(`[Firebase] Đã xóa file vật lý thành công: ${version.fileUrl}`)
            } catch (err: any) {
              this.logger.error(`[Firebase] Lỗi khi xóa file vật lý ${version.fileUrl}: ${err.message}`)
            }
          }
        }

        // 2. Xóa các dữ liệu liên kết trong MongoDB
        try {
          await this.documentChunkModel.deleteMany({ documentId: doc._id }).exec()
          await this.savedDocumentModel.deleteMany({ documentId: doc._id }).exec()
          await this.reportModel.deleteMany({ documentId: doc._id }).exec()
          await this.documentConversationModel.deleteMany({ documentId: doc._id }).exec()

          // 3. Xóa cứng document khỏi database
          await this.myDocumentModel.deleteOne({ _id: doc._id }).exec()
          this.logger.log(`[MongoDB] Đã xóa vĩnh viễn document ID: ${doc._id} (${doc.title})`)
        } catch (err: any) {
          this.logger.error(`[MongoDB] Lỗi khi xóa document ID ${doc._id}: ${err.message}`)
        }
      }

      // Reset bannedDataDeletionAt về null sau khi đã xóa toàn bộ tài liệu
      user.bannedDataDeletionAt = null
      await user.save()
      this.logger.log(`Hoàn tất dọn dẹp dữ liệu cho user bị khóa: ${user._id.toString()}`)
    }

    this.logger.log('Hoàn thành Cron-job dọn dẹp tài liệu của người dùng bị khóa.')
  }

  // Chạy định kỳ mỗi đêm lúc 0h để quét và cảnh báo các gói sắp hết hạn (còn 3 ngày)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionExpirationWarning() {
    this.logger.log('Bắt đầu kiểm tra các gói đăng ký sắp hết hạn (3 ngày)...')

    const startOfThreeDaysLater = new Date()
    startOfThreeDaysLater.setDate(startOfThreeDaysLater.getDate() + 3)
    startOfThreeDaysLater.setHours(0, 0, 0, 0)

    const endOfThreeDaysLater = new Date()
    endOfThreeDaysLater.setDate(endOfThreeDaysLater.getDate() + 3)
    endOfThreeDaysLater.setHours(23, 59, 59, 999)

    const expiringSubscriptions = await this.subscriptionModel
      .find({
        status: SubscriptionStatus.ACTIVE,
        endDate: { $gte: startOfThreeDaysLater, $lte: endOfThreeDaysLater },
      })
      .exec()

    if (expiringSubscriptions.length === 0) {
      this.logger.log('Không có gói đăng ký nào sắp hết hạn sau 3 ngày.')
      return
    }

    this.logger.log(`Tìm thấy ${expiringSubscriptions.length} gói đăng ký sắp hết hạn sau 3 ngày. Bắt đầu gửi cảnh báo...`)

    for (const sub of expiringSubscriptions) {
      try {
        await this.notificationsService.createAndSendNotification(sub.userId.toString(), {
          type: NotificationType.SUBSCRIPTION_EXPIRING,
          title: 'Gói cước sắp hết hạn',
          message: 'Nhắc nhở gia hạn gói cước để hệ thống không tự động xóa tài liệu lưu trữ.',
          metadata: {
            endDate: sub.endDate.toISOString(),
          },
        })
      } catch (error: any) {
        this.logger.error(`Lỗi khi gửi thông báo hết hạn cho user ${sub.userId.toString()}: ${error.message}`)
      }
    }
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { InjectModel, InjectConnection } from '@nestjs/mongoose'
import { Model, Connection, Types } from 'mongoose'
import { ConfigService } from '@nestjs/config'
import { PayOS } from '@payos/node'
import { SubscriptionPlan } from './schemas/subscription-plan.schema'
import { Payment, PaymentStatus } from './schemas/payment.schema'
import { Subscription, SubscriptionStatus } from './schemas/subscription.schema'
import { User } from '../users/entities/user.entity'
import { MyDocument, MyDocumentType } from '../documents/schemas/document.schema'
import { SettingsService } from '../settings/settings.service'
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto'
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto'
import { PurchaseDto } from './dto/purchase.dto'
import { QueryPaymentDto } from './dto/query-payment.dto'
import { QueryPaymentStatsDto } from './dto/query-payment-stats.dto'
import { QueryUserPaymentDto } from './dto/query-user-payment.dto'
import { NotificationsService } from '../notifications/notifications.service'
import { NotificationType } from '../notifications/notification-type.enum'

@Injectable()
export class SubscriptionsService {
  private readonly payos: PayOS
  private readonly feUrl: string

  constructor(
    @InjectModel(SubscriptionPlan.name) private readonly planModel: Model<SubscriptionPlan>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<Subscription>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(MyDocument.name) private readonly documentModel: Model<MyDocumentType>,
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.payos = new PayOS({
      clientId: this.configService.get<string>('PAYOS_CLIENT_ID') || '',
      apiKey: this.configService.get<string>('PAYOS_API_KEY') || '',
      checksumKey: this.configService.get<string>('PAYOS_CHECKSUM_KEY') || '',
    })
    this.feUrl = this.configService.get<string>('FE_URL') || 'http://localhost:5173/'
  }

  /**
   * Chuẩn hóa URL để đối chiếu: chuyển sang chữ thường, xóa khoảng trắng ở hai đầu,
   * và loại bỏ ký tự gạch chéo (/) ở cuối nếu có.
   */
  private normalizeUrl(url: string): string {
    if (!url) return ''
    let normalized = url.trim().toLowerCase()
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  }

  /**
   * Kiểm tra xem URL chuyển hướng có nằm trong danh sách trắng (whitelist) dựa trên tiền tố hay không.
   * Đảm bảo tính linh hoạt cho client có thể đính kèm tham số truy vấn (e.g. ?orderCode=xxx).
   */
  private validateRedirectUrl(url: string): boolean {
    if (!url) return false

    const normalizedTarget = this.normalizeUrl(url)

    // Lấy danh sách tiền tố được cấu hình
    const allowedUrlsString = this.configService.get<string>('PAYOS_ALLOWED_REDIRECT_URLS') || ''
    const allowedPrefixes = allowedUrlsString
      .split(',')
      .map((item) => this.normalizeUrl(item))
      .filter(Boolean)

    // Tự động thêm các cấu hình mặc định vào danh sách trắng
    const defaultReturn = this.configService.get<string>('PAYMENT_RETURN_URL') || ''
    const defaultCancel = this.configService.get<string>('PAYMENT_CANCEL_URL') || ''

    if (defaultReturn) {
      allowedPrefixes.push(this.normalizeUrl(defaultReturn))
    }
    if (defaultCancel) {
      allowedPrefixes.push(this.normalizeUrl(defaultCancel))
    }

    // Thêm feUrl dự phòng
    if (this.feUrl) {
      allowedPrefixes.push(this.normalizeUrl(this.feUrl))
    }

    // So khớp tiền tố
    return allowedPrefixes.some((prefix) => normalizedTarget.startsWith(prefix))
  }

  // --- CRUD GÓI DỊCH VỤ (ADMIN) ---

  async createPlan(dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const created = new this.planModel(dto)
    return await created.save()
  }

  async updatePlan(id: string, dto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const updated = await this.planModel.findByIdAndUpdate(id, dto, { new: true }).exec()
    if (!updated) {
      throw new NotFoundException('Không tìm thấy gói nâng cấp!')
    }
    return updated
  }

  async deletePlan(id: string): Promise<SubscriptionPlan> {
    const deleted = await this.planModel
      .findByIdAndUpdate(id, { _destroy: true, isActive: false }, { new: true })
      .exec()
    if (!deleted) {
      throw new NotFoundException('Không tìm thấy gói nâng cấp!')
    }
    return deleted
  }

  async getPlansForAdmin(): Promise<SubscriptionPlan[]> {
    return await this.planModel
      .find({ _destroy: { $ne: true } })
      .sort({ sortOrder: 1, createdAt: -1 })
      .exec()
  }

  // --- LẤY DANH SÁCH GÓI DỊCH VỤ (USER/GUEST) ---

  async getPlans(): Promise<SubscriptionPlan[]> {
    return await this.planModel
      .find({ isActive: true, _destroy: { $ne: true } })
      .sort({ sortOrder: 1, createdAt: -1 })
      .exec()
  }

  async getPlanById(id: string): Promise<SubscriptionPlan> {
    const plan = await this.planModel.findOne({ _id: id, _destroy: { $ne: true } }).exec()
    if (!plan) {
      throw new NotFoundException('Không tìm thấy gói nâng cấp!')
    }
    return plan
  }

  // --- MUA GÓI NÂNG CẤP ---

  async purchasePlan(userId: string, dto: PurchaseDto): Promise<{ checkoutUrl: string; orderCode: number }> {
    // 1. Kiểm tra gói dịch vụ
    const plan = await this.planModel.findOne({ _id: dto.planId, isActive: true, _destroy: { $ne: true } }).exec()
    if (!plan) {
      throw new NotFoundException('Gói nâng cấp không tồn tại hoặc đã bị vô hiệu hóa!')
    }

    const user = await this.userModel.findById(userId).exec()
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng!')
    }

    // Kiểm tra xem đã có giao dịch PENDING nào chưa hết hạn cho gói này hay chưa
    const existingPendingPayment = await this.paymentModel
      .findOne({
        userId: new Types.ObjectId(userId),
        planId: plan._id,
        status: PaymentStatus.PENDING,
        expiredAt: { $gt: new Date() },
      })
      .exec()

    if (existingPendingPayment && existingPendingPayment.checkoutUrl) {
      return {
        checkoutUrl: existingPendingPayment.checkoutUrl,
        orderCode: existingPendingPayment.orderCode,
      }
    }

    let isUpgrade = false
    let discountAmount = 0
    let finalAmount = plan.price

    // Kiểm tra xem người dùng có đang sở hữu gói dịch vụ nào khác đang hoạt động hay không
    if (user.subscriptionId) {
      const currentSub = await this.subscriptionModel.findById(user.subscriptionId).exec()
      if (currentSub && currentSub.status === SubscriptionStatus.ACTIVE) {
        // Nếu mua gói khác gói hiện tại
        if (currentSub.planId.toString() !== plan._id.toString()) {
          const currentPlan = await this.planModel.findById(currentSub.planId).exec()
          if (currentPlan) {
            // Kiểm tra hạ cấp (downgrade): có storageLimit nhỏ hơn hoặc có price nhỏ hơn gói hiện tại
            if (currentPlan.storageLimit > plan.storageLimit || currentPlan.price > plan.price) {
              throw new BadRequestException(
                'Bạn đang sử dụng gói cao hơn, không thể hạ cấp gói khi gói cũ còn thời hạn!',
              )
            }

            // Tính toán khấu trừ nâng cấp (proration)
            const currentPayment = await this.paymentModel.findById(currentSub.paymentId).exec()
            const actualAmountPaid = currentPayment ? currentPayment.planPrice : currentPlan.price
            const planDurationDays = currentPayment ? currentPayment.durationDays : currentPlan.durationDays
            const totalDurationMs = planDurationDays * 24 * 60 * 60 * 1000
            const now = new Date()
            const remainingTimeMs = Math.max(0, currentSub.endDate.getTime() - now.getTime())

            let remainingValue =
              totalDurationMs > 0 ? Math.floor(actualAmountPaid * (remainingTimeMs / totalDurationMs)) : 0
            remainingValue = Math.max(0, remainingValue)

            isUpgrade = true
            discountAmount = remainingValue
            finalAmount = plan.price - remainingValue

            // Nếu số tiền thanh toán thực tế nhỏ hơn 2,000 VND, coi như nâng cấp miễn phí
            if (finalAmount < 2000) {
              finalAmount = 0
              discountAmount = plan.price // Giảm trừ toàn bộ giá gói mới
            }
          }
        }
      }
    }

    // 2. Sinh orderCode duy nhất dạng số nguyên an toàn
    const orderCode = Date.now() * 1000 + Math.floor(Math.random() * 1000)

    // Chuẩn hóa mô tả đơn hàng: Không dấu, không kí tự đặc biệt, tối đa 25 kí tự
    const description = `Nang cap goi ${plan.name}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .substring(0, 25)

    // Xác định returnUrl và cancelUrl (ưu tiên giá trị truyền từ client, fallback về cấu hình env)
    const returnUrl =
      dto.returnUrl ||
      this.configService.get<string>('PAYMENT_RETURN_URL') ||
      `${this.feUrl.replace(/\/$/, '')}/payment/success`
    const cancelUrl =
      dto.cancelUrl ||
      this.configService.get<string>('PAYMENT_CANCEL_URL') ||
      `${this.feUrl.replace(/\/$/, '')}/payment/cancel`

    // Kiểm tra tính hợp lệ của returnUrl và cancelUrl đối với danh sách trắng (whitelist) ngăn chặn lỗ hổng Open Redirect
    if (!this.validateRedirectUrl(returnUrl)) {
      throw new BadRequestException('returnUrl không hợp lệ hoặc không nằm trong danh sách trắng cho phép!')
    }
    if (!this.validateRedirectUrl(cancelUrl)) {
      throw new BadRequestException('cancelUrl không hợp lệ hoặc không nằm trong danh sách trắng cho phép!')
    }

    // 3. Xử lý thanh toán PayOS hoặc miễn phí
    let checkoutUrl = ''
    let expiredAt: Date | null = null

    if (finalAmount > 0) {
      const expiryMins = await this.settingsService.getPaymentExpiryMins()
      expiredAt = new Date(Date.now() + expiryMins * 60 * 1000)

      try {
        const paymentLinkData = await this.payos.paymentRequests.create({
          orderCode,
          amount: finalAmount,
          description,
          returnUrl,
          cancelUrl,
          expiredAt: Math.floor(expiredAt.getTime() / 1000),
        })
        checkoutUrl = paymentLinkData.checkoutUrl
      } catch (error: any) {
        throw new InternalServerErrorException(`Lỗi tạo cổng thanh toán PayOS: ${error.message}`)
      }
    } else {
      // Nâng cấp miễn phí: trả về returnUrl đính kèm orderCode để Frontend tự chuyển hướng và load
      const separator = returnUrl.includes('?') ? '&' : '?'
      checkoutUrl = `${returnUrl}${separator}orderCode=${orderCode}`
    }

    // 4. Lưu bản ghi Payment
    const payment = await this.paymentModel.create({
      userId: new Types.ObjectId(userId),
      planId: plan._id,
      orderCode,
      amount: finalAmount,
      status: finalAmount > 0 ? PaymentStatus.PENDING : PaymentStatus.PAID,
      checkoutUrl,
      couponCode: dto.couponCode || null,
      planName: plan.name,
      planPrice: plan.price,
      storageLimit: plan.storageLimit,
      durationDays: plan.durationDays,
      originalAmount: plan.price,
      discountAmount,
      isUpgrade,
      paidAt: finalAmount > 0 ? null : new Date(),
      expiredAt,
    })

    // Kích hoạt ngay lập tức nếu nâng cấp miễn phí
    if (finalAmount === 0) {
      await this.activateSubscription(payment, 'FREE_UPGRADE')
    }

    return {
      checkoutUrl,
      orderCode,
    }
  }

  // --- XEM TRƯỚC GIÁ NÂNG CẤP GÓI DỊCH VỤ ---

  async getUpgradePreview(userId: string, targetPlanId: string): Promise<any> {
    const plan = await this.planModel.findOne({ _id: targetPlanId, isActive: true, _destroy: { $ne: true } }).exec()
    if (!plan) {
      throw new NotFoundException('Gói nâng cấp không tồn tại hoặc đã bị vô hiệu hóa!')
    }

    const user = await this.userModel.findById(userId).exec()
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng!')
    }

    let isUpgrade = false
    let discountAmount = 0
    let finalAmount = plan.price

    if (user.subscriptionId) {
      const currentSub = await this.subscriptionModel.findById(user.subscriptionId).exec()
      if (currentSub && currentSub.status === SubscriptionStatus.ACTIVE) {
        if (currentSub.planId.toString() !== plan._id.toString()) {
          const currentPlan = await this.planModel.findById(currentSub.planId).exec()
          if (currentPlan) {
            if (currentPlan.storageLimit > plan.storageLimit || currentPlan.price > plan.price) {
              throw new BadRequestException(
                'Bạn đang sử dụng gói cao hơn, không thể hạ cấp gói khi gói cũ còn thời hạn!',
              )
            }

            const currentPayment = await this.paymentModel.findById(currentSub.paymentId).exec()
            const actualAmountPaid = currentPayment ? currentPayment.planPrice : currentPlan.price
            const planDurationDays = currentPayment ? currentPayment.durationDays : currentPlan.durationDays
            const totalDurationMs = planDurationDays * 24 * 60 * 60 * 1000
            const now = new Date()
            const remainingTimeMs = Math.max(0, currentSub.endDate.getTime() - now.getTime())

            let remainingValue =
              totalDurationMs > 0 ? Math.floor(actualAmountPaid * (remainingTimeMs / totalDurationMs)) : 0
            remainingValue = Math.max(0, remainingValue)

            isUpgrade = true
            discountAmount = remainingValue
            finalAmount = plan.price - remainingValue

            if (finalAmount < 2000) {
              finalAmount = 0
              discountAmount = plan.price
            }
          }
        }
      }
    }

    return {
      originalPrice: plan.price,
      remainingValueOffset: discountAmount,
      finalAmountToPay: finalAmount,
      isUpgrade,
    }
  }

  // --- XỬ LÝ WEBHOOK PAYOS ---

  private async activateSubscription(payment: any, payosPaymentId: string): Promise<void> {
    const session = await this.connection.startSession()
    session.startTransaction()

    try {
      // Bước A: Cập nhật Payment thành PAID
      const paidDate = new Date()
      await this.paymentModel
        .findByIdAndUpdate(
          payment._id,
          {
            status: PaymentStatus.PAID,
            paidAt: paidDate,
            payosPaymentId,
          },
          { session },
        )
        .exec()

      // Bước B: Xử lý kích hoạt/gia hạn gói
      const activeSubscription = await this.subscriptionModel
        .findOne({
          userId: payment.userId,
          status: SubscriptionStatus.ACTIVE,
        })
        .session(session)
        .exec()

      let activeSubId: Types.ObjectId
      let finalEndDate: Date

      if (activeSubscription && activeSubscription.planId.toString() === payment.planId.toString()) {
        // Trường hợp 1: Gia hạn gói cũ (Mua gói trùng với gói hiện tại đang active)
        const extendedEndDate = new Date(
          activeSubscription.endDate.getTime() + payment.durationDays * 24 * 60 * 60 * 1000,
        )

        const updatedSub = await this.subscriptionModel
          .findByIdAndUpdate(
            activeSubscription._id,
            {
              endDate: extendedEndDate,
              paymentId: payment._id,
            },
            { session, new: true },
          )
          .exec()

        activeSubId = updatedSub!._id
        finalEndDate = extendedEndDate
      } else {
        // Trường hợp 2: Đăng ký mới hoặc chuyển đổi gói (Mua gói khác gói đang active)
        if (activeSubscription) {
          // Hủy gói cũ
          await this.subscriptionModel
            .findByIdAndUpdate(activeSubscription._id, { status: SubscriptionStatus.CANCELLED }, { session })
            .exec()
        }

        // Tạo Subscription mới
        const startDate = new Date()
        const endDate = new Date(startDate.getTime() + payment.durationDays * 24 * 60 * 60 * 1000)

        const newSub = await this.subscriptionModel.create(
          [
            {
              userId: payment.userId,
              planId: payment.planId,
              startDate,
              endDate,
              status: SubscriptionStatus.ACTIVE,
              paymentId: payment._id,
            },
          ],
          { session },
        )

        activeSubId = newSub[0]._id
        finalEndDate = endDate
      }

      // Bước C: Cập nhật thông tin User & khôi phục tài liệu (Cap-Aware Restore)
      const activeStats = await this.documentModel
        .aggregate([
          { $match: { uploadedBy: payment.userId, _destroy: { $ne: true } } },
          { $unwind: '$versions' },
          { $group: { _id: null, totalBytes: { $sum: '$versions.fileSize' } } },
        ])
        .session(session)
      let activeBytes = activeStats[0]?.totalBytes ?? 0

      const systemSoftDeletedDocs = await this.documentModel
        .find({ uploadedBy: payment.userId, _destroy: true, isSystemSoftDeleted: true })
        .sort({ createdAt: 1 })
        .session(session)
        .exec()

      for (const doc of systemSoftDeletedDocs) {
        const docSize = doc.versions.reduce((sum, v) => sum + v.fileSize, 0)
        if (activeBytes + docSize <= payment.storageLimit) {
          doc._destroy = false
          doc.isSystemSoftDeleted = false
          await doc.save({ session })
          activeBytes += docSize
        }
      }

      const remainingSystemDocs = await this.documentModel
        .countDocuments({
          uploadedBy: payment.userId,
          _destroy: true,
          isSystemSoftDeleted: true,
        })
        .session(session)

      let willDeleteDataAt: Date | null = null
      if (remainingSystemDocs > 0) {
        const gracePeriodDays = await this.settingsService.getSubscriptionGracePeriodDays()
        willDeleteDataAt = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000)
      }

      await this.userModel
        .findByIdAndUpdate(
          payment.userId,
          {
            subscriptionId: activeSubId,
            isPro: true,
            storageLimit: payment.storageLimit,
            willDeleteDataAt,
          },
          { session },
        )
        .exec()

      const storageInGb = Math.round(payment.storageLimit / (1024 * 1024 * 1024))
      await this.notificationsService.createAndSendNotification(payment.userId.toString(), {
        type: NotificationType.SUBSCRIPTION_ACTIVATED,
        title: 'Nâng cấp gói thành công',
        message: `Xác nhận nâng cấp gói dung lượng lên ${payment.planName} (${storageInGb}GB) thành công.`,
        metadata: {
          planName: payment.planName,
          storageLimit: payment.storageLimit,
          endDate: finalEndDate.toISOString(),
        },
      })

      // Bước D: Commit Transaction
      await session.commitTransaction()
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      await session.endSession()
    }
  }

  /**
   * XỬ LÝ WEBHOOK PAYOS (Nguồn xác thực duy nhất cho giao dịch thành công)
   *
   * ĐÂY LÀ ĐẦU MỐI TIN CẬY DUY NHẤT để hệ thống cập nhật trạng thái thanh toán và kích hoạt gói nâng cấp.
   * Tất cả mọi hành động chuyển hướng ở phía client (returnUrl/cancelUrl) chỉ mang tính chất hiển thị giao diện UI,
   * tuyệt đối không dùng để xác nhận giao dịch đã hoàn tất.
   */
  async handleWebhook(body: any): Promise<{ status: string }> {
    // 1. Xác thực chữ ký webhook từ PayOS để đảm bảo dữ liệu không bị thay đổi hoặc giả mạo
    let verifiedData
    try {
      verifiedData = await this.payos.webhooks.verify(body)
    } catch (error: any) {
      throw new BadRequestException(`Xác thực Webhook thất bại: ${error.message}`)
    }

    const orderCode = verifiedData.orderCode
    if (orderCode === 123) {
      return { status: 'success' }
    }

    const payment = await this.paymentModel.findOne({ orderCode }).exec()
    if (!payment) {
      throw new NotFoundException(`Không tìm thấy đơn thanh toán với mã đơn ${orderCode}`)
    }

    // 2. Kiểm tra tính Idempotent: Nếu đã thanh toán rồi thì dừng lại, trả về thành công
    if (payment.status === PaymentStatus.PAID) {
      return { status: 'success' }
    }

    // 3. Kiểm tra chênh lệch số tiền giao dịch
    if (payment.amount !== verifiedData.amount) {
      // Cập nhật trạng thái payment thành FAILED và báo lỗi
      await this.paymentModel.updateOne({ _id: payment._id }, { status: PaymentStatus.FAILED })
      throw new BadRequestException('Số tiền thanh toán thực tế không khớp với giá trị hóa đơn!')
    }

    // 4. Kiểm tra mã giao dịch thành công của PayOS (thông thường code là '00')
    if (verifiedData.code !== '00') {
      await this.paymentModel.updateOne({ _id: payment._id }, { status: PaymentStatus.FAILED })
      return { status: 'failed' }
    }

    // 5. Kích hoạt gói nâng cấp
    await this.activateSubscription(payment, verifiedData.paymentLinkId)

    return { status: 'success' }
  }

  // --- TRUY VẤN TRẠNG THÁI GIAO DỊCH (USER) ---

  /**
   * Truy vấn trạng thái giao dịch hiện tại của hóa đơn.
   * Nếu hóa đơn đang PENDING, hệ thống sẽ thực hiện truy vấn trực tiếp thông qua kênh truyền tin cậy Server-to-Server với PayOS
   * để đồng bộ trạng thái thực tế nhất của đơn hàng.
   */
  async getPaymentStatus(orderCode: number, userId: string): Promise<Payment> {
    const payment = await this.paymentModel.findOne({ orderCode, userId: new Types.ObjectId(userId) }).exec()
    if (!payment) {
      throw new NotFoundException('Không tìm thấy giao dịch thanh toán!')
    }

    // Nếu giao dịch ở trạng thái PENDING, hãy đồng bộ trạng thái thực tế bằng cách gọi trực tiếp API của PayOS
    if (payment.status === PaymentStatus.PENDING) {
      const now = new Date()
      const createdAtTime = (payment as any).createdAt ? new Date((payment as any).createdAt).getTime() : now.getTime()
      const isExpired = payment.expiredAt ? payment.expiredAt <= now : createdAtTime + 15 * 60 * 1000 <= now.getTime()

      if (isExpired) {
        payment.status = PaymentStatus.EXPIRED
        await payment.save()
        return payment
      }

      try {
        const payosInfo = await this.payos.paymentRequests.get(orderCode)
        if (payosInfo.status === 'PAID') {
          await this.activateSubscription(payment, payosInfo.id || '')
        } else if (payosInfo.status === 'CANCELLED') {
          payment.status = PaymentStatus.CANCELLED
          await payment.save()
        } else if (payosInfo.status === 'EXPIRED') {
          payment.status = PaymentStatus.EXPIRED
          await payment.save()
        }

        // Tải lại hóa đơn đã cập nhật từ cơ sở dữ liệu để trả về kết quả mới nhất
        const updatedPayment = await this.paymentModel.findById(payment._id).exec()
        if (updatedPayment) {
          return updatedPayment
        }
      } catch (error: any) {
        // Chỉ log cảnh báo nếu không lấy được thông tin từ PayOS (ví dụ link thanh toán chưa từng được truy cập hoặc bị lỗi)
        Logger.error(`Lỗi đồng bộ trạng thái từ PayOS cho đơn hàng ${orderCode}: ${error.message}`)
      }
    }

    return payment
  }

  // --- LẤY LỊCH SỬ GIAO DỊCH (USER) ---

  async getPaymentHistory(userId: string, query: QueryUserPaymentDto) {
    const { page, limit, search, status, sortBy, sortOrder } = query
    const skip = (page - 1) * limit
    const findFilter: Record<string, any> = {
      userId: new Types.ObjectId(userId),
    }

    const now = new Date()
    await this.paymentModel
      .updateMany(
        {
          userId: new Types.ObjectId(userId),
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

    if (status) {
      findFilter.status = status
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' }
      const orConditions: any[] = [{ planName: searchRegex }]

      const searchNum = Number(search)
      if (!isNaN(searchNum)) {
        orConditions.push({ orderCode: searchNum })
      }
      findFilter.$or = orConditions
    }

    const totalItems = await this.paymentModel.countDocuments(findFilter)

    const sortObj: Record<string, any> = {}
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1

    const items = await this.paymentModel.find(findFilter).sort(sortObj).skip(skip).limit(limit).exec()

    return {
      data: items,
      meta: {
        total: totalItems,
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
      },
    }
  }

  // --- LẤY TOÀN BỘ LỊCH SỬ GIAO DỊCH (ADMIN) ---

  async getAllPayments(query: QueryPaymentDto) {
    const { page, limit, search, status, sortBy, sortOrder } = query
    const skip = (page - 1) * limit
    const findFilter: Record<string, any> = {}

    if (status) {
      findFilter.status = status
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' }

      const matchedUsers = await this.userModel
        .find({
          $or: [{ displayName: searchRegex }, { email: searchRegex }],
        })
        .select('_id')
        .exec()

      const userIds = matchedUsers.map((u) => u._id)

      const orConditions: any[] = [{ planName: searchRegex }, { userId: { $in: userIds } }]

      const searchNum = Number(search)
      if (!isNaN(searchNum)) {
        orConditions.push({ orderCode: searchNum })
      }

      findFilter.$or = orConditions
    }

    const totalItems = await this.paymentModel.countDocuments(findFilter)

    const sortObj: Record<string, any> = {}
    if (sortBy === 'user') {
      sortObj['userName'] = sortOrder === 'asc' ? 1 : -1
    } else {
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1
    }

    const items = await this.paymentModel
      .aggregate([
        { $match: findFilter },
        // Lookup user
        {
          $lookup: {
            from: this.userModel.collection.name,
            localField: 'userId',
            foreignField: '_id',
            as: 'userDocs',
          },
        },
        // Add computed fields
        {
          $addFields: {
            userName: {
              $ifNull: [{ $arrayElemAt: ['$userDocs.displayName', 0] }, { $arrayElemAt: ['$userDocs.email', 0] }],
            },
            userId: {
              _id: { $arrayElemAt: ['$userDocs._id', 0] },
              displayName: { $arrayElemAt: ['$userDocs.displayName', 0] },
              email: { $arrayElemAt: ['$userDocs.email', 0] },
            },
          },
        },
        // Exclude temporary field
        {
          $project: {
            userDocs: 0,
          },
        },
        // Sort
        { $sort: sortObj },
        // Pagination
        { $skip: skip },
        { $limit: limit },
      ])
      .exec()

    // Map list to ensure plain JS objects are properly typed and compatible with the original find result
    const mappedItems = items.map((payment) => ({
      ...payment,
      _id: payment._id.toString(),
    }))

    return {
      data: mappedItems,
      meta: {
        total: totalItems,
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
      },
    }
  }

  // --- LẤY SỐ LIỆU THỐNG KÊ GIAO DỊCH (ADMIN) ---

  async getPaymentStats(query: QueryPaymentStatsDto) {
    const matchFilter: Record<string, any> = {}

    if (query.startDate) {
      const start = new Date(query.startDate)
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0)
        matchFilter.createdAt = { ...matchFilter.createdAt, $gte: start }
      }
    }

    if (query.endDate) {
      const end = new Date(query.endDate)
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999)
        matchFilter.createdAt = { ...matchFilter.createdAt, $lte: end }
      }
    }

    // 1. Thống kê tổng quan (overview)
    const overviewStats = await this.paymentModel.aggregate<{
      totalTransactions: number
      totalRevenue: number
      cancelledRevenue: number
      unpaidRevenue: number
      successfulTransactions: number
      pendingTransactions: number
      failedTransactions: number
      cancelledTransactions: number
      expiredTransactions: number
    }>([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.PAID] }, '$amount', 0] },
          },
          cancelledRevenue: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.CANCELLED] }, '$amount', 0] },
          },
          unpaidRevenue: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.PENDING] }, '$amount', 0] },
          },
          successfulTransactions: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.PAID] }, 1, 0] },
          },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.PENDING] }, 1, 0] },
          },
          failedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.FAILED] }, 1, 0] },
          },
          cancelledTransactions: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.CANCELLED] }, 1, 0] },
          },
          expiredTransactions: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.EXPIRED] }, 1, 0] },
          },
        },
      },
    ])

    const overview = overviewStats[0] || {
      totalTransactions: 0,
      totalRevenue: 0,
      cancelledRevenue: 0,
      unpaidRevenue: 0,
      successfulTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0,
      cancelledTransactions: 0,
      expiredTransactions: 0,
    }

    const successRate =
      overview.totalTransactions > 0
        ? parseFloat(((overview.successfulTransactions / overview.totalTransactions) * 100).toFixed(2))
        : 0

    // 2. Thống kê theo gói (plan breakdown)
    const planStats = await this.paymentModel.aggregate<{
      planName: string
      totalCount: number
      purchasesCount: number
      revenue: number
    }>([
      { $match: matchFilter },
      {
        $group: {
          _id: '$planName',
          planName: { $first: '$planName' },
          totalCount: { $sum: 1 },
          purchasesCount: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.PAID] }, 1, 0] },
          },
          revenue: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.PAID] }, '$amount', 0] },
          },
        },
      },
      { $sort: { revenue: -1 } },
    ])

    // 3. Biểu đồ dòng thời gian (timeline stats)
    const format = query.groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d'
    const timelineStats = await this.paymentModel.aggregate<{
      date: string
      revenue: number
      cancelledRevenue: number
      unpaidRevenue: number
      totalTransactions: number
      successfulTransactions: number
    }>([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: format, date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' },
          },
          revenue: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.PAID] }, '$amount', 0] },
          },
          cancelledRevenue: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.CANCELLED] }, '$amount', 0] },
          },
          unpaidRevenue: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.PENDING] }, '$amount', 0] },
          },
          totalTransactions: { $sum: 1 },
          successfulTransactions: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.PAID] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          revenue: 1,
          cancelledRevenue: 1,
          unpaidRevenue: 1,
          totalTransactions: 1,
          successfulTransactions: 1,
        },
      },
      { $sort: { date: 1 } },
    ])

    return {
      overview: {
        totalTransactions: overview.totalTransactions,
        totalRevenue: overview.totalRevenue,
        cancelledRevenue: overview.cancelledRevenue,
        unpaidRevenue: overview.unpaidRevenue,
        successfulTransactions: overview.successfulTransactions,
        pendingTransactions: overview.pendingTransactions,
        failedTransactions: overview.failedTransactions,
        cancelledTransactions: overview.cancelledTransactions,
        expiredTransactions: overview.expiredTransactions,
        successRate,
      },
      plans: planStats,
      timeline: timelineStats,
    }
  }

  // --- LẤY GÓI ĐĂNG KÝ HIỆN TẠI (USER) ---

  async getMySubscription(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId).select('subscriptionId').exec()
    if (!user || !user.subscriptionId) {
      return { activePlan: null }
    }

    const subscription = await this.subscriptionModel.findById(user.subscriptionId).populate('planId').exec()

    return subscription
  }
}

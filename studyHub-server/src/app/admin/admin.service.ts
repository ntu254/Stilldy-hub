import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { MyDocument, MyDocumentType } from '../documents/schemas/document.schema'
import { Report, ReportDocument } from '../documents/schemas/report.schema'
import { FirebaseStorageService } from '../documents/firebase-storage.service'
import { User, UserDocument } from '../users/entities/user.entity'
import { QueryReportedDocumentDto } from './dto/query-reported-document.dto'
import { QueryDocumentDto } from './dto/query-document.dto'
import { NotificationsService } from '../notifications/notifications.service'
import { NotificationType } from '../notifications/notification-type.enum'

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(MyDocument.name) private documentModel: Model<MyDocumentType>,
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly firebaseStorageService: FirebaseStorageService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getDashboardStats() {
    const userStats = await this.userModel.aggregate<{
      totalUsers: number
      activeUsers: number
      inactiveUsers: number
    }>([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          inactiveUsers: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
        },
      },
    ])

    const docCounts = await this.documentModel.aggregate<{
      totalFiles: number
      publicFiles: number
      privateFiles: number
      reportedFiles: number
    }>([
      { $match: { _destroy: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          publicFiles: { $sum: { $cond: [{ $eq: ['$isPublic', true] }, 1, 0] } },
          privateFiles: { $sum: { $cond: [{ $eq: ['$isPublic', false] }, 1, 0] } },
          reportedFiles: { $sum: { $cond: [{ $eq: ['$isReported', true] }, 1, 0] } },
        },
      },
    ])

    const docStats = await this.documentModel.aggregate([
      { $match: { _destroy: { $ne: true } } }, // Chỉ tính tài liệu chưa bị xóa mềm
      { $unwind: '$versions' }, // Trải phương mảng versions để tính dung lượng từng file
      {
        $group: {
          _id: null,
          totalSizeInBytes: { $sum: '$versions.fileSize' },
        },
      },
    ])

    return {
      users: {
        total: userStats[0]?.totalUsers || 0,
        active: userStats[0]?.activeUsers || 0,
        inactive: userStats[0]?.inactiveUsers || 0,
      },
      documents: {
        totalFiles: docCounts[0]?.totalFiles || 0,
        publicFiles: docCounts[0]?.publicFiles || 0,
        privateFiles: docCounts[0]?.privateFiles || 0,
        reportedFiles: docCounts[0]?.reportedFiles || 0,
        totalReported: docCounts[0]?.reportedFiles || 0, // Hỗ trợ tương thích ngược
        totalCloudSizeInMb: parseFloat(((docStats[0]?.totalSizeInBytes || 0) / (1024 * 1024)).toFixed(2)), // Quy đổi ra MB hiển thị cho đẹp
      },
    }
  }

  async getAllDocuments(query: QueryDocumentDto) {
    const { page, limit, search, subjectId, isPublic, isReported, sortBy, sortOrder } = query
    const skip = (page - 1) * limit
    const findFilter: Record<string, any> = {}

    if (subjectId) {
      findFilter.subjectId = new Types.ObjectId(subjectId)
    }

    if (isPublic !== undefined) {
      findFilter.isPublic = isPublic
    }

    if (isReported !== undefined) {
      findFilter.isReported = isReported
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

      findFilter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: { $in: [search] } },
        { uploadedBy: { $in: userIds } },
      ]
    }

    const totalItems = await this.documentModel.countDocuments(findFilter)

    const sortObj: Record<string, any> = {}
    if (sortBy === 'uploader') {
      sortObj['uploaderName'] = sortOrder === 'asc' ? 1 : -1
    } else if (sortBy === 'size') {
      sortObj['totalSize'] = sortOrder === 'asc' ? 1 : -1
    } else {
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1
    }

    const items = await this.documentModel
      .aggregate([
        { $match: findFilter },
        // Lookup uploader
        {
          $lookup: {
            from: this.userModel.collection.name,
            localField: 'uploadedBy',
            foreignField: '_id',
            as: 'uploaderDocs',
          },
        },
        // Add computed fields for uploader name and total size
        {
          $addFields: {
            uploaderName: {
              $ifNull: [
                { $arrayElemAt: ['$uploaderDocs.displayName', 0] },
                { $arrayElemAt: ['$uploaderDocs.email', 0] },
              ],
            },
            uploadedBy: {
              _id: { $arrayElemAt: ['$uploaderDocs._id', 0] },
              displayName: { $arrayElemAt: ['$uploaderDocs.displayName', 0] },
              email: { $arrayElemAt: ['$uploaderDocs.email', 0] },
            },
            totalSize: {
              $reduce: {
                input: '$versions',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.fileSize'] },
              },
            },
          },
        },
        // Exclude temporary uploaderDocs field
        {
          $project: {
            uploaderDocs: 0,
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
    const mappedItems = items.map((doc) => ({
      ...doc,
      _id: doc._id.toString(),
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

  async getReportedDocuments(query: QueryReportedDocumentDto) {
    const { page, limit, search, subjectId, isPublic, sortBy, sortOrder } = query
    const skip = (page - 1) * limit
    const findFilter: Record<string, any> = { isReported: true }

    if (subjectId) {
      findFilter.subjectId = new Types.ObjectId(subjectId)
    }

    if (isPublic !== undefined) {
      findFilter.isPublic = isPublic
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

      findFilter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: { $in: [search] } },
        { uploadedBy: { $in: userIds } },
      ]
    }

    const totalItems = await this.documentModel.countDocuments(findFilter)

    const sortObj: Record<string, any> = {}
    if (sortBy === 'uploader') {
      sortObj['uploaderName'] = sortOrder === 'asc' ? 1 : -1
    } else if (sortBy === 'size') {
      sortObj['totalSize'] = sortOrder === 'asc' ? 1 : -1
    } else {
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1
    }

    const items = await this.documentModel
      .aggregate([
        { $match: findFilter },
        // Lookup uploader
        {
          $lookup: {
            from: this.userModel.collection.name,
            localField: 'uploadedBy',
            foreignField: '_id',
            as: 'uploaderDocs',
          },
        },
        // Add computed fields for uploader name and total size
        {
          $addFields: {
            uploaderName: {
              $ifNull: [
                { $arrayElemAt: ['$uploaderDocs.displayName', 0] },
                { $arrayElemAt: ['$uploaderDocs.email', 0] },
              ],
            },
            uploadedBy: {
              _id: { $arrayElemAt: ['$uploaderDocs._id', 0] },
              displayName: { $arrayElemAt: ['$uploaderDocs.displayName', 0] },
              email: { $arrayElemAt: ['$uploaderDocs.email', 0] },
            },
            totalSize: {
              $reduce: {
                input: '$versions',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.fileSize'] },
              },
            },
          },
        },
        // Exclude temporary uploaderDocs field
        {
          $project: {
            uploaderDocs: 0,
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
    const mappedItems = items.map((doc) => ({
      ...doc,
      _id: doc._id.toString(),
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

  async rejectReport(documentId: string) {
    const doc = await this.documentModel.findById(documentId)
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu học tập này!')

    doc.isReported = false
    await doc.save()

    await this.reportModel.updateMany(
      { documentId: new Types.ObjectId(documentId), status: 'PENDING' },
      { $set: { status: 'REJECTED' } },
    )

    return { message: 'Đã bác bỏ các báo cáo vi phạm, tài liệu hoạt động bình thường.' }
  }

  async getReportsByDocument(documentId: string) {
    const reports = await this.reportModel
      .find({ documentId: new Types.ObjectId(documentId) })
      .populate('reportedBy', 'displayName email avatar')
      .sort({ createdAt: -1 })
      .exec()
    return reports
  }

  async supremeDeleteDocument(documentId: string) {
    const doc = await this.documentModel.findById(documentId)
    if (!doc) throw new NotFoundException('Tài liệu vi phạm không tồn tại hoặc đã bị xóa trước đó!')

    const bucket = this.firebaseStorageService['bucket']

    for (const version of doc.versions) {
      try {
        // Trích xuất lại đường dẫn tương đối từ fileUrl để gọi lệnh xóa của Firebase SDK
        // URL có cấu trúc: https://storage.googleapis.com/bucket-name/documents/timestamp-filename.pdf
        const filePath = version.fileUrl.split(`${bucket.name}/`)[1]
        if (filePath) {
          const fileInCloud = bucket.file(filePath)
          await fileInCloud.delete()
        }
      } catch (cloudError) {
        // Log lỗi nếu file trên máy không tìm thấy hoặc đã bị xóa bằng tay trước đó, vẫn tiếp tục lương xóa DB
        const errMsg = cloudError instanceof Error ? cloudError.message : String(cloudError)
        console.error(`Không thể xóa file vật lý trên Cloud: ${errMsg}`)
      }
    }

    // Xóa bản ghi tài liệu khỏi MongoDB
    await this.documentModel.findByIdAndDelete(documentId)

    // Cập nhật trạng thái các đơn từ báo liên quan thành RESOLVED (Đã giải quyết)
    await this.reportModel.updateMany({ documentId: new Types.ObjectId(documentId) }, { $set: { status: 'RESOLVED' } })

    return {
      message: 'Đã thực thi lệnh xóa tối cao, dọn sạch dữ liệu vi phạm khỏi hệ thống đám mây!',
    }
  }

  async moderateDocument(documentId: string, action: 'KEEP' | 'DELETE') {
    const doc = await this.documentModel.findById(documentId)
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu này!')

    // Lấy danh sách báo cáo PENDING để phản hồi trước khi cập nhật trạng thái
    const pendingReports = await this.reportModel
      .find({ documentId: new Types.ObjectId(documentId), status: 'PENDING' })
      .exec()

    const reporterIds = Array.from(new Set(pendingReports.map((r) => r.reportedBy.toString())))
    for (const reporterId of reporterIds) {
      await this.notificationsService.createAndSendNotification(reporterId, {
        type: NotificationType.REPORT_RESOLVED,
        title: 'Phản hồi báo cáo',
        message: 'Quản trị viên đã tiếp nhận và xử lý báo cáo của bạn.',
        metadata: {
          documentId,
          action,
        },
      })
    }

    if (action === 'KEEP') {
      doc.isReported = false
      await doc.save()

      await this.reportModel.updateMany(
        { documentId: new Types.ObjectId(documentId), status: 'PENDING' },
        { $set: { status: 'RESOLVED_KEPT' } },
      )

      return { message: 'Đã giữ lại tài liệu và gỡ cờ vi phạm.' }
    } else if (action === 'DELETE') {
      // Xóa file vật lý trên Firebase
      for (const version of doc.versions) {
        await this.firebaseStorageService.deleteFile(version.fileUrl)
      }

      // Xóa cứng Document
      await this.documentModel.findByIdAndDelete(documentId)

      // Cập nhật Report
      await this.reportModel.updateMany(
        { documentId: new Types.ObjectId(documentId) },
        { $set: { status: 'RESOLVED_DELETED' } },
      )

      const uploaderIdStr = doc.uploadedBy.toString()

      // Gửi thông báo Sự kiện 1: Admin xóa tài liệu vi phạm
      await this.notificationsService.createAndSendNotification(uploaderIdStr, {
        type: NotificationType.DOCUMENT_DELETED,
        title: 'Cảnh báo vi phạm tài liệu',
        message: 'Cảnh báo tài liệu của bạn đã bị xóa do vi phạm nội quy nền tảng.',
        metadata: {
          documentId,
          documentTitle: doc.title,
        },
      })

      // Tăng violationCount của User
      const uploader = await this.userModel.findById(doc.uploadedBy)
      if (uploader) {
        uploader.violationCount = (uploader.violationCount || 0) + 1
        let isBanned = false
        let bannedUntil: Date | null = null
        if (uploader.violationCount >= 3) {
          bannedUntil = new Date()
          bannedUntil.setDate(bannedUntil.getDate() + 7) // Banned for 7 days
          uploader.uploadBannedUntil = bannedUntil
          isBanned = true
        }
        await uploader.save()

        // Gửi thông báo Sự kiện 2: Khóa quyền Upload nếu chạm mốc 3 lần
        if (isBanned && bannedUntil) {
          await this.notificationsService.createAndSendNotification(uploaderIdStr, {
            type: NotificationType.UPLOAD_BANNED,
            title: 'Tài khoản bị hạn chế',
            message: `Tài khoản bị cấm upload trong 7 ngày (mở khóa vào: ${bannedUntil.toLocaleString('vi-VN')})`,
            metadata: {
              unlockAt: bannedUntil.toISOString(),
            },
          })
        }
      }

      return { message: 'Đã xóa tài liệu và ghi nhận vi phạm của người đăng.' }
    }
  }
}

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { MyDocument, MyDocumentType } from './schemas/document.schema'
import { FirebaseStorageService } from './firebase-storage.service'
import { UploadDocumentDto } from './dto/upload-document.dto'
import { UpdateDocumentDto } from './dto/update-document.dto'
import { QueryDocumentDto } from './dto/query-document.dto'
import { User, UserDocument, UserRole } from '../users/entities/user.entity'
import { Report, ReportDocument } from './schemas/report.schema'
import { ReportDocumentDto } from './dto/report-document.dto'
import { SavedDocument, SavedDocumentDocument } from './schemas/saved-document.schema'
import { DocumentConversation, DocumentConversationDocument } from './schemas/document-conversation.schema'
import { ChatbotService } from '../chatbot/chatbot.service'
import * as crypto from 'crypto'

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(MyDocument.name) private documentModel: Model<MyDocumentType>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly firebaseStorageService: FirebaseStorageService,
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(SavedDocument.name) private savedDocumentModel: Model<SavedDocumentDocument>,
    @InjectModel(DocumentConversation.name) private documentConversationModel: Model<DocumentConversationDocument>,
    private readonly chatbotService: ChatbotService,
  ) {}

  // Mã hóa nội dung file nhị phân thành chuỗi 64 ký tự SHA-256 duy nhất
  private calculateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
  }

  /**
   * Kiểm tra dung lượng storage của user có đủ để upload file mới không.
   * Ném BadRequestException ngay nếu vượt quá giới hạn.
   */
  private async checkStorageLimit(userId: string, incomingFileSize: number): Promise<void> {
    const userObjectId = new Types.ObjectId(userId)

    // 1. Lấy thông tin storageLimit từ bảng User
    const user = await this.userModel.findById(userObjectId).select('storageLimit isPro').exec()
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản người dùng!')

    const storageLimit: number = user.storageLimit ?? 2 * 1024 * 1024 * 1024 // fallback 2GB

    // 2. Tính tổng bytes đã sử dụng (toàn bộ phiên bản của tài liệu chưa xóa mềm)
    const sizeStats = await this.documentModel.aggregate([
      { $match: { uploadedBy: userObjectId, _destroy: { $ne: true } } },
      { $unwind: '$versions' },
      { $group: { _id: null, totalBytes: { $sum: '$versions.fileSize' } } },
    ])
    const usedBytes: number = sizeStats[0]?.totalBytes ?? 0

    // 3. Kiểm tra xem sau khi upload xong có vượt giới hạn không
    if (usedBytes + incomingFileSize > storageLimit) {
      const usedMB = (usedBytes / (1024 * 1024)).toFixed(1)
      const limitMB = (storageLimit / (1024 * 1024)).toFixed(0)
      const remainingMB = ((storageLimit - usedBytes) / (1024 * 1024)).toFixed(1)
      const tier = user.isPro ? 'Pro (5 GB)' : 'Free (2 GB)'
      throw new BadRequestException(
        `Vượt giới hạn dung lượng! Bạn đang dùng ${usedMB} MB / ${limitMB} MB (${tier}). ` +
          `Còn trống: ${remainingMB} MB. ` +
          (user.isPro ? '' : 'Nâng cấp lên Pro để được 5 GB dung lượng lưu trữ.'),
      )
    }
  }

  async uploadNewDocument(userId: string, file: Express.Multer.File, dto: UploadDocumentDto): Promise<MyDocument> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng đính kèm tệp tài liệu học tập hợp lệ!')
    }

    const user = await this.userModel.findById(userId)
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản người dùng!')

    if (user.uploadBannedUntil && new Date(user.uploadBannedUntil) > new Date()) {
      const bannedDate = new Date(user.uploadBannedUntil).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
      throw new ForbiddenException(
        `Tài khoản của bạn đã bị cấm đăng tải tài liệu do vi phạm quá nhiều lần. Bạn có thể tiếp tục sử dụng tính năng này sau: ${bannedDate}`,
      )
    }

    // Kiểm tra giới hạn dung lượng storage trước khi upload
    await this.checkStorageLimit(userId, file.size)

    const currentFileHash = this.calculateFileHash(file.buffer)

    const isDuplicate = await this.documentModel.findOne({
      _destroy: false,
      uploadedBy: new Types.ObjectId(userId), // Chỉ kiểm tra trùng lặp trong tài liệu của chính user này
      'versions.fileHash': currentFileHash, // Cú pháp quét mảng nhúng đặc trưng của Mongoose
    })

    if (isDuplicate) {
      throw new BadRequestException(
        `Tải lên thất bại! Bạn đã tải lên tài liệu có nội dung này rồi với tiêu đề: "${isDuplicate.title}". Vui lòng không upload trùng lặp dữ liệu.`,
      )
    }

    // Tải file lên hộc chứa đám mây Firebase
    const cloudFile = await this.firebaseStorageService.uploadFile(file)

    // Tiến hành khởi tạo bản ghi dữ liệu mới kèm phiên bản số 1
    const createdDoc = new this.documentModel({
      title: dto.title,
      description: dto.description,
      subjectId: new Types.ObjectId(dto.subjectId),
      uploadedBy: new Types.ObjectId(userId),
      tags: dto.tags ?? [],
      isPublic: false, // Mặc định là kho riêng tư cá nhân, sinh viên tự bật công khai sau
      versions: [
        {
          versionNumber: 1,
          fileName: cloudFile.fileName,
          fileUrl: cloudFile.fileUrl,
          fileSize: cloudFile.fileSize,
          fileHash: currentFileHash,
          createdAt: new Date(),
        },
      ],
    })

    const savedDoc = await createdDoc.save()

    // Kích hoạt xử lý nền trích xuất, băm nhỏ và nhúng vector bất đồng bộ (không await)
    if (file && file.buffer) {
      void this.chatbotService.processDocument(
        savedDoc._id.toString(),
        1,
        file.buffer,
        file.originalname || cloudFile.fileName,
      )
    }

    return savedDoc
  }

  async findPublicDocuments(query: QueryDocumentDto) {
    return this.queryDocuments({ isPublic: true, _destroy: { $ne: true } }, query)
  }

  async findMyDocuments(userId: string, query: QueryDocumentDto) {
    return this.queryDocuments({ uploadedBy: new Types.ObjectId(userId), _destroy: { $ne: true } }, query, userId)
  }

  async getRecentUploadedDocuments(userId: string, limit: number = 4) {
    return await this.documentModel
      .find({
        uploadedBy: new Types.ObjectId(userId),
        _destroy: { $ne: true },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
  }

  private async queryDocuments(baseFilter: Record<string, unknown>, query: QueryDocumentDto, userId?: string) {
    const { page, limit, title, subjectId, tags, fileType, sortBy, sortOrder } = query

    if (title) {
      baseFilter.title = { $regex: title, $options: 'i' }
    }

    if (subjectId) {
      baseFilter.subjectId = new Types.ObjectId(subjectId)
    }

    if (tags && tags.length > 0) {
      baseFilter.tags = { $in: tags }
    }

    if (fileType) {
      if (fileType === 'image') {
        // 'image' là alias gộp: khớp tất cả định dạng hình ảnh (png, jpg, jpeg)
        baseFilter['versions'] = {
          $elemMatch: { fileName: { $regex: `\\.(png|jpg|jpeg)$`, $options: 'i' } },
        }
      } else {
        // Xử lý các đuôi file có dạng rút gọn: docx? khớp cả .doc, xlsx? khớp cả .xls
        const extPattern = fileType === 'docx' ? 'docx?' : fileType === 'xlsx' ? 'xlsx?' : fileType
        baseFilter['versions'] = {
          $elemMatch: { fileName: { $regex: `\\.${extPattern}$`, $options: 'i' } },
        }
      }
    }

    const skip = (page - 1) * limit
    const sortValue = sortOrder === 'asc' ? 1 : -1

    const sortField = sortBy || 'createdAt'
    const sortObj: Record<string, any> = {}
    if (sortField === 'fileSize') {
      sortObj['versions.0.fileSize'] = sortValue
    } else {
      sortObj[sortField] = sortValue
    }

    const [data, total] = await Promise.all([
      this.documentModel
        .find(baseFilter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('subjectId', 'name')
        .populate('uploadedBy', 'fullName email')
        .exec(),
      this.documentModel.countDocuments(baseFilter),
    ])

    const savedDocIds = new Set<string>()
    if (userId && data.length > 0) {
      const savedDocs = await this.savedDocumentModel
        .find({
          userId: new Types.ObjectId(userId),
          documentId: { $in: data.map((d) => d._id) },
        })
        .exec()
      savedDocs.forEach((sd) => savedDocIds.add(sd.documentId.toString()))
    }

    const mappedData = data.map((doc) => {
      const docObj = doc.toObject()
      return {
        ...docObj,
        isLikedByUser: userId ? doc.likes?.some((likeId) => likeId.toString() === userId) || false : false,
        isDislikedByUser: userId ? doc.dislikes?.some((dislikeId) => dislikeId.toString() === userId) || false : false,
        isSavedByUser: userId ? savedDocIds.has(doc._id.toString()) : false,
        totalLikes: doc.likes?.length || 0,
        totalDislikes: doc.dislikes?.length || 0,
      }
    })

    return {
      data: mappedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findDocumentByIdPublic(id: string) {
    const doc = await this.documentModel
      .findOne({
        _id: id,
        _destroy: { $ne: true },
      })
      .exec()

    if (!doc) {
      throw new NotFoundException('Không tìm thấy tài liệu')
    }

    return doc
  }

  // GET /documents/:id — Chi tiết tài liệu + tăng viewCount
  // userId là optional: nếu chưa đăng nhập chỉ xem được tài liệu isPublic=true. Admin được quyền xem hết.
  async findDocumentById(userId: string | undefined, id: string, role?: string) {
    const isAdmin = role === UserRole.ADMIN
    const accessFilter = userId
      ? isAdmin
        ? { $or: [{ isPublic: true }, { isReported: true }, { uploadedBy: new Types.ObjectId(userId) }] }
        : { $or: [{ isPublic: true }, { uploadedBy: new Types.ObjectId(userId) }] }
      : { isPublic: true }

    const doc = await this.documentModel
      .findOne({
        _id: id,
        _destroy: { $ne: true },
        ...accessFilter,
      })
      .populate('subjectId', 'name')
      .populate('uploadedBy', 'fullName email')
      .exec()

    if (!doc) {
      throw new NotFoundException('Không tìm thấy tài liệu hoặc bạn không có quyền xem')
    }

    // Tăng viewCount bất đồng bộ, không chặn response
    void this.documentModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec()

    // Nếu chưa đăng nhập: trả về false cho tất cả trạng thái tương tác
    if (!userId) {
      return {
        ...doc.toObject(),
        totalLikes: doc.likes.length,
        totalDislikes: doc.dislikes.length,
        isLikedByUser: false,
        isDislikedByUser: false,
        isSavedByUser: false,
      }
    }

    // Kiểm tra trạng thái like / dislike / saved của user hiện tại (để frontend tô màu nút)
    const savedRecord = await this.savedDocumentModel.findOne({
      userId: new Types.ObjectId(userId),
      documentId: new Types.ObjectId(id),
    })

    return {
      ...doc.toObject(),
      totalLikes: doc.likes.length,
      totalDislikes: doc.dislikes.length,
      isLikedByUser: doc.likes.some((likeId) => likeId.toString() === userId),
      isDislikedByUser: doc.dislikes.some((dislikeId) => dislikeId.toString() === userId),
      isSavedByUser: !!savedRecord,
    }
  }

  async updatePrivacy(userId: string, id: string, isPublic: boolean, dmcaAccepted?: boolean) {
    const doc = await this.documentModel.findOne({ _id: id, uploadedBy: new Types.ObjectId(userId) }).exec()
    if (!doc) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa tài liệu này')
    }

    // Bắt buộc phải xác nhận DMCA khi muốn công khai tài liệu
    if (isPublic && !dmcaAccepted) {
      throw new BadRequestException(
        'Bạn phải xác nhận chịu trách nhiệm pháp lý theo tiêu chuẩn DMCA trước khi công khai tài liệu. ' +
          'Vui lòng đọc và đồng ý với điều khoản bản quyền của nền tảng.',
      )
    }

    doc.isPublic = isPublic

    if (isPublic && dmcaAccepted) {
      // Ghi lại audit trail: thời điểm chấp nhận DMCA
      doc.dmcaAcceptedAt = new Date()
    } else if (!isPublic) {
      // Khi tắt public: reset audit trail về null
      doc.dmcaAcceptedAt = null
    }

    return doc.save()
  }

  async getShareLink(userId: string, id: string): Promise<{ shareLink: string }> {
    const doc = await this.documentModel
      .findOne({
        _id: id,
        $or: [{ isPublic: true }, { uploadedBy: new Types.ObjectId(userId) }],
      })
      .exec()

    if (!doc) {
      throw new NotFoundException('Không tìm thấy tài liệu hoặc bạn không có quyền truy cập')
    }

    const latestVersion = doc.versions[doc.versions.length - 1]
    if (!latestVersion) {
      throw new NotFoundException('Tài liệu chưa có phiên bản nào')
    }

    const shareLink = await this.firebaseStorageService.getSignedUrl(latestVersion.fileUrl)
    return { shareLink }
  }

  async getFileStream(publicFileUrl: string) {
    return this.firebaseStorageService.getFileStream(publicFileUrl)
  }

  async getFileMetadata(publicFileUrl: string) {
    return this.firebaseStorageService.getFileMetadata(publicFileUrl)
  }

  async updateDocument(userId: string, id: string, dto: UpdateDocumentDto) {
    const doc = await this.documentModel
      .findOne({ _id: id, uploadedBy: new Types.ObjectId(userId), _destroy: { $ne: true } })
      .exec()

    if (!doc) {
      throw new ForbiddenException('Không tìm thấy tài liệu hoặc bạn không có quyền chỉnh sửa')
    }

    if (dto.title !== undefined) doc.title = dto.title
    if (dto.description !== undefined) doc.description = dto.description

    return doc.save()
  }

  async uploadNewVersion(userId: string, id: string, file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng đính kèm tệp phiên bản mới hợp lệ!')
    }

    // Kiểm tra giới hạn dung lượng storage trước khi upload phiên bản mới
    await this.checkStorageLimit(userId, file.size)

    const doc = await this.documentModel
      .findOne({ _id: id, uploadedBy: new Types.ObjectId(userId), _destroy: { $ne: true } })
      .exec()

    if (!doc) {
      throw new ForbiddenException('Không tìm thấy tài liệu hoặc bạn không có quyền tải phiên bản mới')
    }
    const currentFileHash = this.calculateFileHash(file.buffer)

    const isDuplicate = await this.documentModel.findOne({
      _destroy: false,
      'versions.fileHash': currentFileHash,
    })

    if (isDuplicate) {
      throw new BadRequestException(
        `Nội dung tệp này đã tồn tại trên hệ thống trong tài liệu: "${isDuplicate.title}". Vui lòng kiểm tra lại file tải lên!`,
      )
    }
    // Tải file mới lên Firebase
    const cloudFile = await this.firebaseStorageService.uploadFile(file)

    // Tự động tăng số phiên bản dựa trên phiên bản hiện có
    const nextVersionNumber = doc.versions.length > 0 ? doc.versions[doc.versions.length - 1].versionNumber + 1 : 1

    const newVersion = {
      versionNumber: nextVersionNumber,
      fileName: cloudFile.fileName,
      fileUrl: cloudFile.fileUrl,
      fileSize: cloudFile.fileSize,
      fileHash: currentFileHash,
      createdAt: new Date(),
    }

    const updatedDoc = await this.documentModel
      .findByIdAndUpdate(id, { $push: { versions: newVersion } }, { returnDocument: 'after' })
      .populate('subjectId', 'name')
      .populate('uploadedBy', 'fullName email')
      .exec()

    // Kích hoạt xử lý nền trích xuất, băm nhỏ và nhúng vector bất đồng bộ (không await)
    if (updatedDoc && file && file.buffer) {
      void this.chatbotService.processDocument(
        id,
        nextVersionNumber,
        file.buffer,
        file.originalname || cloudFile.fileName,
      )
    }

    return updatedDoc
  }

  async deleteDocument(userId: string, id: string, userRole: UserRole) {
    const isAdmin = userRole === UserRole.ADMIN

    const filter = isAdmin
      ? { _id: id, _destroy: { $ne: true } }
      : { _id: id, uploadedBy: new Types.ObjectId(userId), _destroy: { $ne: true } }

    const doc = await this.documentModel.findOne(filter).exec()

    if (!doc) {
      throw new ForbiddenException('Không tìm thấy tài liệu hoặc bạn không có quyền xóa')
    }

    doc._destroy = true
    await doc.save()

    return { message: 'Tài liệu đã được xóa thành công' }
  }

  async reportDocument(documentId: string, userId: string, dto: ReportDocumentDto) {
    // 1. Kiểm tra tài liệu bị báo cáo có tồn tại không
    const doc = await this.documentModel.findById(documentId)
    if (!doc) {
      throw new NotFoundException('Không tìm thấy tài liệu bạn muốn báo cáo!')
    }

    // 2. Bảo mật nâng cao: Không cho phép tự báo cáo tài liệu của chính mình
    if (doc.uploadedBy.toString() === userId) {
      throw new BadRequestException('Bạn không thể tự báo cáo tài liệu do chính mình tải lên!')
    }

    // 3. Kiểm tra xem sinh viên này đã báo cáo file này trước đó chưa (Tránh spam ép cờ)
    const existingReport = await this.reportModel.findOne({
      documentId: new Types.ObjectId(documentId),
      reportedBy: new Types.ObjectId(userId),
      status: 'PENDING',
    })
    if (existingReport) {
      throw new BadRequestException('Bạn đã báo cáo tài liệu này rồi, vui lòng đợi Admin phê duyệt!')
    }

    // 4. Lưu đơn tố cáo vào bảng Report để làm bằng chứng cho Admin xem (UI ảnh 2)
    const newReport = new this.reportModel({
      documentId: new Types.ObjectId(documentId),
      reportedBy: new Types.ObjectId(userId),
      reason: dto.reason,
      status: 'PENDING',
    })
    await newReport.save()

    // 5. Dựng cờ báo cáo ở bảng Document lên để đẩy vào danh sách kiểm duyệt của Admin
    doc.isReported = true
    await doc.save()

    return {
      message: 'Gửi báo cáo vi phạm thành công. Ban quản trị sẽ tiến hành kiểm duyệt tài liệu này!',
    }
  }

  async getUserStats(userId: string) {
    const userObjectId = new Types.ObjectId(userId)

    const [sizeStats, totalDocs, user] = await Promise.all([
      // 1. Tính tổng dung lượng tất cả phiên bản file (loại trừ tài liệu đã xóa mềm)
      this.documentModel.aggregate([
        {
          // Bước 1: Lọc đúng tài liệu của sinh viên này, bỏ qua tài liệu đã xóa mềm
          $match: { uploadedBy: userObjectId, _destroy: { $ne: true } },
        },
        {
          // Bước 2: Trải phẳng mảng versions để chạm vào fileSize của từng phiên bản file
          $unwind: '$versions',
        },
        {
          // Bước 3: Gom nhóm lại để cộng dồn dung lượng
          $group: {
            _id: null,
            totalBytes: { $sum: '$versions.fileSize' },
          },
        },
      ]),
      // 2. Đếm tổng số lượng đầu tài liệu (loại trừ tài liệu đã xóa mềm)
      this.documentModel.countDocuments({ uploadedBy: userObjectId, _destroy: { $ne: true } }),
      // 3. Lấy thông tin quota của user
      this.userModel.findById(userObjectId).select('storageLimit isPro').exec(),
    ])

    // Lấy ra dữ liệu byte gốc (nếu chưa upload file nào thì mặc định là 0)
    const totalBytes = sizeStats[0]?.totalBytes || 0
    const storageLimit = user?.storageLimit ?? 2 * 1024 * 1024 * 1024 // fallback 2GB
    const isPro = user?.isPro ?? false
    const storageUsedPercent = storageLimit > 0 ? parseFloat(((totalBytes / storageLimit) * 100).toFixed(1)) : 0

    return {
      totalDocuments: totalDocs,
      totalStorageUsed: {
        bytes: totalBytes,
        megaBytes: parseFloat((totalBytes / (1024 * 1024)).toFixed(2)),
        gigaBytes: parseFloat((totalBytes / (1024 * 1024 * 1024)).toFixed(3)),
      },
      storageLimit: {
        bytes: storageLimit,
        megaBytes: parseFloat((storageLimit / (1024 * 1024)).toFixed(0)),
        gigaBytes: parseFloat((storageLimit / (1024 * 1024 * 1024)).toFixed(1)),
      },
      storageUsedPercent,
      isPro,
    }
  }

  async downloadDocument(
    id: string,
    userID: string,
    userRole?: string,
  ): Promise<{ stream: NodeJS.ReadableStream; fileName: string }> {
    // 1. Tìm tài liệu trong cơ sở dữ liệu
    const doc = await this.documentModel.findById(id)
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu này!')

    // 2. Kiểm tra phân quyền bảo mật
    const isAdmin = userRole === UserRole.ADMIN
    const isOwner = doc.uploadedBy.toString() === userID
    if (!doc.isPublic && !isOwner) {
      if (!isAdmin || !doc.isReported) {
        throw new ForbiddenException('Bạn không có quyền tải tài liệu riêng tư của người khác!')
      }
    }

    // 3. Lấy ra phiên bản mới nhất của file để tải về
    const latestVersion = doc.versions[doc.versions.length - 1]
    if (!latestVersion) throw new NotFoundException('Tài liệu chưa có phiên bản file nào!')

    // 4. Kiểm tra file tồn tại và lấy stream qua FirebaseStorageService (không dùng admin SDK trực tiếp)
    const stream = await this.firebaseStorageService.getFileStream(latestVersion.fileUrl)

    // 5. Tăng tự động số lượt tải (+1 downloadCount) bất đồng bộ — không chặn response
    void this.documentModel.findByIdAndUpdate(id, { $inc: { downloadCount: 1 } }).exec()

    // 6. Trả về stream và tên file để Controller xử lý HTTP Response (đúng separation of concerns)
    return { stream, fileName: latestVersion.fileName }
  }

  async toggleLike(documentId: string, userId: string) {
    const doc = await this.documentModel.findById(documentId)
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu!')

    const userOid = new Types.ObjectId(userId)
    const isLiked = doc.likes.some((id) => id.toString() === userId)

    if (isLiked) {
      doc.likes = doc.likes.filter((id) => id.toString() !== userId)
    } else {
      doc.likes.push(userOid)
      doc.dislikes = doc.dislikes.filter((id) => id.toString() !== userId)
    }

    await doc.save()

    return {
      totalLikes: doc.likes.length,
      totalDislikes: doc.dislikes.length,
      isLikedByUser: doc.likes.some((id) => id.toString() === userId),
      isDislikedByUser: doc.dislikes.some((id) => id.toString() === userId),
    }
  }

  async toggleDislike(documentId: string, userId: string) {
    const doc = await this.documentModel.findById(documentId)
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu!')

    const userOid = new Types.ObjectId(userId)
    const isDisliked = doc.dislikes.some((id) => id.toString() === userId)

    if (isDisliked) {
      doc.dislikes = doc.dislikes.filter((id) => id.toString() !== userId)
    } else {
      doc.dislikes.push(userOid)
      doc.likes = doc.likes.filter((id) => id.toString() !== userId)
    }

    await doc.save()

    return {
      totalLikes: doc.likes.length,
      totalDislikes: doc.dislikes.length,
      isLikedByUser: doc.likes.some((id) => id.toString() === userId),
      isDislikedByUser: doc.dislikes.some((id) => id.toString() === userId),
    }
  }

  async toggleSaveDocument(documentId: string, userId: string) {
    // Validate: Tài liệu phải tồn tại và chưa bị xóa mềm trước khi cho phép lưu
    const doc = await this.documentModel.findOne({ _id: documentId, _destroy: { $ne: true } })
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu hoặc tài liệu đã bị xóa!')

    const query = {
      userId: new Types.ObjectId(userId),
      documentId: new Types.ObjectId(documentId),
    }

    const isSaved = await this.savedDocumentModel.findOne(query)

    if (isSaved) {
      // Nếu tồn tại bản ghi rồi -> Tiến hành HỦY LƯU (Unsave)
      await this.savedDocumentModel.deleteOne(query)
      return { isSaved: false, message: 'Đã bỏ lưu tài liệu khỏi thư viện cá nhân' }
    } else {
      // Nếu chưa lưu -> Tiến hành TẠO MỚI BẢN GHI LƯU
      const newSave = new this.savedDocumentModel(query)
      await newSave.save()
      return { isSaved: true, message: 'Đã lưu tài liệu vào thư viện cá nhân thành công' }
    }
  }

  async getSavedDocumentsByUser(userId: string) {
    const savedList = await this.savedDocumentModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'documentId',
        match: { _destroy: { $ne: true } }, // Lọc bỏ tài liệu đã bị xóa mềm khỏi danh sách
        populate: { path: 'subjectId', select: 'name' }, // Lấy kèm thông tin môn học hiển thị lên UI
      })
      .sort({ createdAt: -1 })
      .exec()

    const documents = savedList.map((item) => item.documentId).filter(Boolean)

    return documents.map((doc) => {
      // documentId được populate bởi Mongoose, nên có thể có toất cả các field của Document
      const populatedDoc = doc as unknown as {
        toObject?: () => Record<string, unknown>
        likes?: Array<{ toString: () => string }>
        dislikes?: Array<{ toString: () => string }>
        _id: { toString: () => string }
        [key: string]: unknown
      }
      const docObj = populatedDoc.toObject ? populatedDoc.toObject() : populatedDoc
      return {
        ...docObj,
        isLikedByUser: populatedDoc.likes?.some((likeId) => likeId.toString() === userId) || false,
        isDislikedByUser: populatedDoc.dislikes?.some((dislikeId) => dislikeId.toString() === userId) || false,
        isSavedByUser: true,
        totalLikes: populatedDoc.likes?.length || 0,
        totalDislikes: populatedDoc.dislikes?.length || 0,
      }
    })
  }

  private async checkDocumentAccess(userId: string, documentId: string): Promise<void> {
    const doc = await this.documentModel
      .findOne({
        _id: documentId,
        _destroy: { $ne: true },
        $or: [{ isPublic: true }, { uploadedBy: new Types.ObjectId(userId) }],
      })
      .exec()

    if (!doc) {
      throw new NotFoundException('Không tìm thấy tài liệu học tập hoặc bạn không có quyền truy cập!')
    }
  }

  async getOrCreateConversation(userId: string, documentId: string): Promise<DocumentConversationDocument> {
    // 1. Kiểm tra quyền truy cập tài liệu
    await this.checkDocumentAccess(userId, documentId)

    // 2. Tìm hoặc tạo cuộc hội thoại
    let conversation = await this.documentConversationModel
      .findOne({
        userId: new Types.ObjectId(userId),
        documentId: new Types.ObjectId(documentId),
      })
      .exec()

    if (!conversation) {
      conversation = new this.documentConversationModel({
        userId: new Types.ObjectId(userId),
        documentId: new Types.ObjectId(documentId),
        messages: [],
      })
      await conversation.save()
    }

    return conversation
  }

  async addMessageToConversation(
    userId: string,
    documentId: string,
    textContent: string,
  ): Promise<DocumentConversationDocument> {
    // 1. Tìm hoặc tạo cuộc hội thoại (đồng thời kiểm tra quyền truy cập tài liệu)
    const conversation = await this.getOrCreateConversation(userId, documentId)

    // 2. Gọi ChatbotService để lấy câu trả lời RAG & AI
    try {
      const { response: aiResponseText, citations: uniqueCitations } =
        await this.chatbotService.getAIResponseForContext(
          textContent,
          [new Types.ObjectId(documentId)],
          conversation.messages,
        )

      // 3. Đẩy tin nhắn của user và AI vào cuộc hội thoại
      const userMsg = {
        sender: 'user',
        textContent,
        citations: [],
        createdAt: new Date(),
      }

      const aiMsg = {
        sender: 'ai',
        textContent: aiResponseText,
        citations: uniqueCitations,
        createdAt: new Date(),
      }

      conversation.messages.push(userMsg, aiMsg)
      return await conversation.save()
    } catch (error: any) {
      // Lưu tin nhắn lỗi vào DB để giữ hội thoại đồng nhất nếu có lỗi hệ thống xảy ra
      const userMsg = {
        sender: 'user',
        textContent,
        citations: [],
        createdAt: new Date(),
      }

      const aiMsg = {
        sender: 'ai',
        textContent: 'Đã có lỗi không mong muốn, vui lòng thử lại sau ít phút!!!',
        citations: [],
        createdAt: new Date(),
      }

      conversation.messages.push(userMsg, aiMsg)
      return await conversation.save()
    }
  }
}

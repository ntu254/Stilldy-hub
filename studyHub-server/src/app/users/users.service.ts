import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import type { UpdateQuery } from 'mongoose'
import { User, UserDocument } from './entities/user.entity'
import { MyDocument, MyDocumentType } from '../documents/schemas/document.schema'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { PaginationUtilService } from '../../common/utils/pagination-util/pagination-util.service'
import { QueryUserDto } from './dto/query-user.dto'
import { CloudinaryService } from '../../common/services/cloudinary/cloudinary.service'
import { SettingsService } from '../settings/settings.service'

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(MyDocument.name) private documentModel: Model<MyDocumentType>,
    private readonly paginationService: PaginationUtilService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly settingsService: SettingsService,
  ) {}

  async updateAvatar(userId: string, file: Express.Multer.File) {
    try {
      const uploadResult = await this.cloudinaryService.uploadImage(file)
      const avatarUrl = uploadResult.secure_url

      const updatedUser = await this.updateById(userId, { avatar: avatarUrl })
      if (!updatedUser) {
        throw new NotFoundException('Không tìm thấy tài khoản người dùng!')
      }

      return {
        message: 'Cập nhật ảnh đại diện thành công!',
        avatar: avatarUrl,
        user: updatedUser,
      }
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Tải ảnh đại diện lên Cloudinary thất bại!')
    }
  }

  async getUser(filter: Partial<User> & Record<string, any>): Promise<UserDocument | null> {
    return this.userModel.findOne(filter).exec()
  }

  async createUser(data: Partial<User>): Promise<UserDocument> {
    return this.userModel.create(data)
  }

  async findAll(query: QueryUserDto) {
    const { page, limit, search, role, isActive, isVerified, sortBy, sortOrder } = query

    const filter: Record<string, any> = { _destroy: { $ne: true } }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' }
      filter.$or = [
        { email: searchRegex },
        { displayName: searchRegex },
        { phoneNumber: searchRegex },
        { address: searchRegex },
        { identityNumber: searchRegex },
      ]
    }

    if (role) {
      filter.role = role
    }

    if (isActive !== undefined) {
      filter.isActive = isActive
    }

    if (isVerified !== undefined) {
      filter.isVerified = isVerified
    }

    const totalItems = await this.userModel.countDocuments(filter)

    const paginator = this.paginationService.paging({
      page,
      itemPerPage: limit,
      totalItems,
    })

    const sortObj: Record<string, any> = {}
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1

    // Build aggregate query to compute stats dynamically and allow sorting by all columns
    const list = await this.userModel
      .aggregate([
        { $match: filter },
        // Lookup active documents
        {
          $lookup: {
            from: this.documentModel.collection.name,
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$uploadedBy', '$$userId'] }, { $ne: ['$_destroy', true] }],
                  },
                },
              },
            ],
            as: 'uploadedDocs',
          },
        },
        // Compute counts and total file size (used storage)
        {
          $addFields: {
            publicFilesCount: {
              $size: {
                $filter: {
                  input: '$uploadedDocs',
                  as: 'doc',
                  cond: { $eq: ['$$doc.isPublic', true] },
                },
              },
            },
            privateFilesCount: {
              $size: {
                $filter: {
                  input: '$uploadedDocs',
                  as: 'doc',
                  cond: { $eq: ['$$doc.isPublic', false] },
                },
              },
            },
            reportedFilesCount: {
              $size: {
                $filter: {
                  input: '$uploadedDocs',
                  as: 'doc',
                  cond: { $eq: ['$$doc.isReported', true] },
                },
              },
            },
            totalFilesCount: { $size: '$uploadedDocs' },
            usedStorage: {
              $reduce: {
                input: '$uploadedDocs',
                initialValue: 0,
                in: {
                  $add: [
                    '$$value',
                    {
                      $reduce: {
                        input: '$$this.versions',
                        initialValue: 0,
                        in: { $add: ['$$value', '$$this.fileSize'] },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        // Exclude password and temporary fields
        {
          $project: {
            password: 0,
            uploadedDocs: 0,
          },
        },
        // Sort
        { $sort: sortObj },
        // Pagination
        { $skip: paginator.skip },
        { $limit: paginator.itemPerPage },
      ])
      .exec()

    // Map list to include string properties/compatibility if needed, since Mongoose aggregate returns plain JS objects.
    const mappedList = list.map((user) => ({
      ...user,
      id: user._id.toString(),
    }))

    return paginator.format(mappedList)
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-password').exec()
  }

  async findOneWithStats(id: string) {
    const user = await this.findById(id)
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng!')
    }

    const userObj = user.toObject()

    const documents = await this.documentModel
      .find({
        uploadedBy: user._id,
        _destroy: { $ne: true },
      })
      .exec()

    const publicFiles: MyDocumentType[] = []
    const privateFiles: MyDocumentType[] = []
    const reportedFiles: MyDocumentType[] = []

    for (const doc of documents) {
      if (doc.isReported) {
        reportedFiles.push(doc)
      }
      if (doc.isPublic) {
        publicFiles.push(doc)
      } else {
        privateFiles.push(doc)
      }
    }

    return {
      ...userObj,
      publicFilesCount: publicFiles.length,
      privateFilesCount: privateFiles.length,
      reportedFilesCount: reportedFiles.length,
      totalFilesCount: documents.length,
      uploadedFiles: {
        public: publicFiles,
        private: privateFiles,
        reported: reportedFiles,
      },
    }
  }

  async updateById(id: string, data: UpdateQuery<UserDocument>): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, data, { returnDocument: 'after' }).select('-password').exec()
  }

  async deleteById(id: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndDelete(id).exec()
  }

  // Alias methods used by UsersController DTOs
  create(createUserDto: CreateUserDto) {
    return this.createUser(createUserDto as unknown as Partial<User>)
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.updateById(id, updateUserDto)
  }

  remove(id: string) {
    return this.deleteById(id)
  }

  async banUser(id: string) {
    const gracePeriodDays = await this.settingsService.getBannedUserGracePeriodDays()
    const bannedDataDeletionAt = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000)

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        id,
        { isActive: false, bannedDataDeletionAt },
        { returnDocument: 'after' },
      )
      .select('-password')
      .exec()

    if (!updatedUser) {
      throw new NotFoundException('User not found')
    }

    return {
      message: 'User banned successfully',
      data: updatedUser,
    }
  }

  async unbanUser(id: string) {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        id,
        { isActive: true, bannedDataDeletionAt: null },
        { returnDocument: 'after' },
      )
      .select('-password')
      .exec()

    if (!updatedUser) {
      throw new NotFoundException('User not found')
    }

    return {
      message: 'User unbanned successfully',
      data: updatedUser,
    }
  }

  // Giới hạn storage: Free = 2GB, Pro = 5GB
  static readonly FREE_STORAGE_LIMIT = 2 * 1024 * 1024 * 1024 // 2 GB
  static readonly PRO_STORAGE_LIMIT = 5 * 1024 * 1024 * 1024 // 5 GB

  async upgradeUserToPro(id: string) {
    const userObjectId = new Types.ObjectId(id)

    // 1. Lấy tất cả các tài liệu hiện đang hoạt động
    const activeStats = await this.documentModel.aggregate([
      { $match: { uploadedBy: userObjectId, _destroy: { $ne: true } } },
      { $unwind: '$versions' },
      { $group: { _id: null, totalBytes: { $sum: '$versions.fileSize' } } },
    ])
    let activeBytes = activeStats[0]?.totalBytes ?? 0
    const limit = UsersService.PRO_STORAGE_LIMIT

    // 2. Tìm tất cả tài liệu bị xóa bởi hệ thống và khôi phục dần
    const systemSoftDeletedDocs = await this.documentModel
      .find({ uploadedBy: userObjectId, _destroy: true, isSystemSoftDeleted: true })
      .sort({ createdAt: 1 })
      .exec()

    for (const doc of systemSoftDeletedDocs) {
      const docSize = doc.versions.reduce((sum, v) => sum + v.fileSize, 0)
      if (activeBytes + docSize <= limit) {
        doc._destroy = false
        doc.isSystemSoftDeleted = false
        await doc.save()
        activeBytes += docSize
      }
    }

    // 3. Kiểm tra xem còn tài liệu bị xóa bởi hệ thống hay không
    const remainingSystemDocs = await this.documentModel.countDocuments({
      uploadedBy: userObjectId,
      _destroy: true,
      isSystemSoftDeleted: true,
    })

    let willDeleteDataAt: Date | null = null
    if (remainingSystemDocs > 0) {
      const gracePeriodDays = await this.settingsService.getSubscriptionGracePeriodDays()
      willDeleteDataAt = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000)
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          isPro: true,
          storageLimit: limit,
          willDeleteDataAt,
        },
        { returnDocument: 'after' },
      )
      .select('-password')
      .exec()

    if (!updatedUser) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng!')
    }

    return {
      message: `Nâng cấp tài khoản lên Pro thành công! Giới hạn dung lượng: 5 GB`,
      data: updatedUser,
    }
  }

  async downgradeUserToFree(id: string) {
    const userObjectId = new Types.ObjectId(id)
    const limit = UsersService.FREE_STORAGE_LIMIT

    // 1. Tính tổng dung lượng hiện tại
    const sizeStats = await this.documentModel.aggregate([
      { $match: { uploadedBy: userObjectId, _destroy: { $ne: true } } },
      { $unwind: '$versions' },
      { $group: { _id: null, totalBytes: { $sum: '$versions.fileSize' } } },
    ])
    const usedBytes = sizeStats[0]?.totalBytes ?? 0

    let willDeleteDataAt: Date | null = null

    // 2. Nếu vượt quá giới hạn 2GB, thực hiện soft-delete các file vượt giới hạn
    if (usedBytes > limit) {
      const activeDocs = await this.documentModel
        .find({ uploadedBy: userObjectId, _destroy: { $ne: true } })
        .sort({ createdAt: 1 })
        .exec()

      let activeBytesSum = 0
      for (const doc of activeDocs) {
        const docSize = doc.versions.reduce((sum, v) => sum + v.fileSize, 0)
        if (activeBytesSum + docSize <= limit) {
          activeBytesSum += docSize
        } else {
          // Vượt quá limit, chuyển sang system soft-delete
          doc._destroy = true
          doc.isSystemSoftDeleted = true
          await doc.save()
        }
      }

      const gracePeriodDays = await this.settingsService.getSubscriptionGracePeriodDays()
      willDeleteDataAt = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000)
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          isPro: false,
          storageLimit: limit,
          willDeleteDataAt,
        },
        { returnDocument: 'after' },
      )
      .select('-password')
      .exec()

    if (!updatedUser) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng!')
    }

    return {
      message: `Hạ cấp tài khoản về Free thành công. Giới hạn dung lượng: 2 GB`,
      data: updatedUser,
    }
  }
}

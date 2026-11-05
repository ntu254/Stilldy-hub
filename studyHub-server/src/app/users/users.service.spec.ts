import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from './users.service'
import { getModelToken } from '@nestjs/mongoose'
import { User } from './entities/user.entity'
import { MyDocument } from '../documents/schemas/document.schema'
import { PaginationUtilService } from '../../common/utils/pagination-util/pagination-util.service'
import { CloudinaryService } from '../../common/services/cloudinary/cloudinary.service'
import { SettingsService } from '../settings/settings.service'

describe('UsersService', () => {
  let service: UsersService

  const mockUserModel = {
    findByIdAndUpdate: jest.fn(),
  }
  const mockDocumentModel = {}
  const mockPaginationService = {}
  const mockCloudinaryService = {
    uploadImage: jest.fn(),
  }
  const mockSettingsService = {
    getBannedUserGracePeriodDays: jest.fn().mockResolvedValue(30),
    getSubscriptionGracePeriodDays: jest.fn().mockResolvedValue(30),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(MyDocument.name),
          useValue: mockDocumentModel,
        },
        {
          provide: PaginationUtilService,
          useValue: mockPaginationService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('updateAvatar', () => {
    it('should upload image to cloudinary and update user avatar url', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.png',
      } as Express.Multer.File

      mockCloudinaryService.uploadImage.mockResolvedValue({
        secure_url: 'https://cloudinary.com/avatar.png',
      })

      const mockUpdatedUser = {
        _id: 'userId',
        email: 'test@example.com',
        avatar: 'https://cloudinary.com/avatar.png',
      }

      jest.spyOn(service, 'updateById').mockResolvedValue(mockUpdatedUser as any)

      const result = await service.updateAvatar('userId', mockFile)

      expect(mockCloudinaryService.uploadImage).toHaveBeenCalledWith(mockFile)
      expect(service.updateById).toHaveBeenCalledWith('userId', { avatar: 'https://cloudinary.com/avatar.png' })
      expect(result).toEqual({
        message: 'Cập nhật ảnh đại diện thành công!',
        avatar: 'https://cloudinary.com/avatar.png',
        user: mockUpdatedUser,
      })
    })

    it('should throw BadRequestException when cloudinary upload fails', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.png',
      } as Express.Multer.File

      mockCloudinaryService.uploadImage.mockRejectedValue(new Error('Cloudinary upload failed'))

      await expect(service.updateAvatar('userId', mockFile)).rejects.toThrow('Cloudinary upload failed')
    })
  })

  describe('banUser', () => {
    it('should set isActive to false and compute bannedDataDeletionAt date', async () => {
      const mockUser = {
        _id: 'userId',
        email: 'test@example.com',
        isActive: false,
        bannedDataDeletionAt: new Date(),
      }

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      })

      const result = await service.banUser('userId')

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'userId',
        expect.objectContaining({
          isActive: false,
          bannedDataDeletionAt: expect.any(Date),
        }),
        { returnDocument: 'after' },
      )
      expect(result).toEqual({
        message: 'User banned successfully',
        data: mockUser,
      })
    })

    it('should throw NotFoundException if user is not found', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      })

      await expect(service.banUser('invalidUserId')).rejects.toThrow('User not found')
    })
  })

  describe('unbanUser', () => {
    it('should set isActive to true and clear bannedDataDeletionAt date', async () => {
      const mockUser = {
        _id: 'userId',
        email: 'test@example.com',
        isActive: true,
        bannedDataDeletionAt: null,
      }

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      })

      const result = await service.unbanUser('userId')

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'userId',
        {
          isActive: true,
          bannedDataDeletionAt: null,
        },
        { returnDocument: 'after' },
      )
      expect(result).toEqual({
        message: 'User unbanned successfully',
        data: mockUser,
      })
    })

    it('should throw NotFoundException if user is not found', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      })

      await expect(service.unbanUser('invalidUserId')).rejects.toThrow('User not found')
    })
  })
})

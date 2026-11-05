import { Test, TestingModule } from '@nestjs/testing'
import { SubscriptionExpirationService } from './subscription-expiration.service'
import { getModelToken } from '@nestjs/mongoose'
import { Subscription, SubscriptionStatus } from './schemas/subscription.schema'
import { User } from '../users/entities/user.entity'
import { Payment } from './schemas/payment.schema'
import { MyDocument } from '../documents/schemas/document.schema'
import { DocumentChunk } from '../chatbot/schemas/document-chunk.schema'
import { SavedDocument } from '../documents/schemas/saved-document.schema'
import { Report } from '../documents/schemas/report.schema'
import { DocumentConversation } from '../documents/schemas/document-conversation.schema'
import { FirebaseStorageService } from '../documents/firebase-storage.service'
import { Connection, Types } from 'mongoose'
import { SettingsService } from '../settings/settings.service'
import { NotificationsService } from '../notifications/notifications.service'

describe('SubscriptionExpirationService', () => {
  let service: SubscriptionExpirationService
  let mockSubscriptionModel: any
  let mockUserModel: any
  let mockPaymentModel: any
  let mockDocumentModel: any
  let mockDocumentChunkModel: any
  let mockSavedDocumentModel: any
  let mockReportModel: any
  let mockDocumentConversationModel: any
  let mockFirebaseStorageService: any
  let mockSettingsService: any

  const mockQuery = (val: any) => ({
    exec: jest.fn().mockResolvedValue(val),
    populate: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
  })

  beforeEach(async () => {
    mockSubscriptionModel = {
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOne: jest.fn(),
    }
    mockUserModel = {
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    }
    mockPaymentModel = {
      updateMany: jest.fn(),
    }
    mockDocumentModel = {
      aggregate: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      deleteOne: jest.fn(),
    }
    mockDocumentChunkModel = {
      deleteMany: jest.fn(),
    }
    mockSavedDocumentModel = {
      deleteMany: jest.fn(),
    }
    mockReportModel = {
      deleteMany: jest.fn(),
    }
    mockDocumentConversationModel = {
      deleteMany: jest.fn(),
    }
    mockFirebaseStorageService = {
      deleteFile: jest.fn().mockResolvedValue(undefined),
    }
    mockSettingsService = {
      getSubscriptionGracePeriodDays: jest.fn().mockResolvedValue(30),
      getBannedUserGracePeriodDays: jest.fn().mockResolvedValue(30),
    }

    const mockConnection = {
      startSession: jest.fn().mockReturnValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionExpirationService,
        {
          provide: getModelToken(Subscription.name),
          useValue: mockSubscriptionModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Payment.name),
          useValue: mockPaymentModel,
        },
        {
          provide: getModelToken(MyDocument.name),
          useValue: mockDocumentModel,
        },
        {
          provide: getModelToken(DocumentChunk.name),
          useValue: mockDocumentChunkModel,
        },
        {
          provide: getModelToken(SavedDocument.name),
          useValue: mockSavedDocumentModel,
        },
        {
          provide: getModelToken(Report.name),
          useValue: mockReportModel,
        },
        {
          provide: getModelToken(DocumentConversation.name),
          useValue: mockDocumentConversationModel,
        },
        {
          provide: FirebaseStorageService,
          useValue: mockFirebaseStorageService,
        },
        {
          provide: 'DatabaseConnection',
          useValue: mockConnection,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
        {
          provide: NotificationsService,
          useValue: {
            createAndSendNotification: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile()

    service = module.get<SubscriptionExpirationService>(SubscriptionExpirationService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('handleSubscriptionExpiration', () => {
    it('should do nothing if no subscriptions are expired', async () => {
      mockSubscriptionModel.find.mockReturnValue(mockQuery([]))
      await service.handleSubscriptionExpiration()
      expect(mockSubscriptionModel.find).toHaveBeenCalled()
    })

    it('should downgrade user and soft-delete excess documents if expired', async () => {
      const mockSub = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(),
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date(Date.now() - 1000),
      }
      mockSubscriptionModel.find.mockReturnValue(mockQuery([mockSub]))
      mockSubscriptionModel.findByIdAndUpdate.mockReturnValue(mockQuery(mockSub))
      mockSubscriptionModel.findOne.mockReturnValue(mockQuery(null))

      mockDocumentModel.aggregate.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((resolve) => resolve([{ totalBytes: 3 * 1024 * 1024 * 1024 }])),
      })

      const mockDoc1 = {
        _id: new Types.ObjectId(),
        versions: [{ fileSize: 1.5 * 1024 * 1024 * 1024 }],
        _destroy: false,
        save: jest.fn().mockResolvedValue(null),
      }
      const mockDoc2 = {
        _id: new Types.ObjectId(),
        versions: [{ fileSize: 1.5 * 1024 * 1024 * 1024 }],
        _destroy: false,
        save: jest.fn().mockResolvedValue(null),
      }
      mockDocumentModel.find.mockReturnValue(mockQuery([mockDoc1, mockDoc2]))
      mockUserModel.findByIdAndUpdate.mockReturnValue(mockQuery({}))

      await service.handleSubscriptionExpiration()

      expect(mockDoc1._destroy).toBe(false)
      expect(mockDoc2._destroy).toBe(true)
      expect(mockDoc2.isSystemSoftDeleted).toBe(true)
      expect(mockDoc2.save).toHaveBeenCalled()

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockSub.userId,
        expect.objectContaining({
          subscriptionId: null,
          isPro: false,
          storageLimit: 2 * 1024 * 1024 * 1024,
          willDeleteDataAt: expect.any(Date),
        }),
        expect.any(Object),
      )
    })
  })

  describe('handleExpiredSubscriptionsCleanup', () => {
    it('should delete files physically and clean database collections for users whose deadline has passed', async () => {
      const mockUser = {
        _id: new Types.ObjectId(),
        email: 'test@example.com',
        willDeleteDataAt: new Date(Date.now() - 1000),
        save: jest.fn().mockResolvedValue(null),
      }
      mockUserModel.find.mockReturnValue(mockQuery([mockUser]))

      const mockDoc = {
        _id: new Types.ObjectId(),
        title: 'Document to delete',
        versions: [{ fileUrl: 'https://storage.googleapis.com/bucket/documents/test.pdf' }],
      }
      mockDocumentModel.find.mockReturnValue(mockQuery([mockDoc]))
      mockDocumentChunkModel.deleteMany.mockReturnValue(mockQuery({}))
      mockSavedDocumentModel.deleteMany.mockReturnValue(mockQuery({}))
      mockReportModel.deleteMany.mockReturnValue(mockQuery({}))
      mockDocumentConversationModel.deleteMany.mockReturnValue(mockQuery({}))
      mockDocumentModel.deleteOne.mockReturnValue(mockQuery({}))

      await service.handleExpiredSubscriptionsCleanup()

      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledWith(
        'https://storage.googleapis.com/bucket/documents/test.pdf',
      )
      expect(mockDocumentChunkModel.deleteMany).toHaveBeenCalledWith({ documentId: mockDoc._id })
      expect(mockSavedDocumentModel.deleteMany).toHaveBeenCalledWith({ documentId: mockDoc._id })
      expect(mockReportModel.deleteMany).toHaveBeenCalledWith({ documentId: mockDoc._id })
      expect(mockDocumentConversationModel.deleteMany).toHaveBeenCalledWith({ documentId: mockDoc._id })
      expect(mockDocumentModel.deleteOne).toHaveBeenCalledWith({ _id: mockDoc._id })

      expect(mockUser.willDeleteDataAt).toBeNull()
      expect(mockUser.save).toHaveBeenCalled()
    })
  })

  describe('handleBannedUsersCleanup', () => {
    it('should do nothing if no expired banned users are found', async () => {
      mockUserModel.find.mockReturnValue(mockQuery([]))
      await service.handleBannedUsersCleanup()
      expect(mockUserModel.find).toHaveBeenCalledWith({
        isActive: false,
        bannedDataDeletionAt: { $ne: null, $lte: expect.any(Date) },
      })
    })

    it('should delete all documents physically and in DB for expired banned users', async () => {
      const mockBannedUser = {
        _id: new Types.ObjectId(),
        email: 'banned@example.com',
        bannedDataDeletionAt: new Date(Date.now() - 1000),
        save: jest.fn().mockResolvedValue(null),
      }
      mockUserModel.find.mockReturnValue(mockQuery([mockBannedUser]))

      const mockDoc = {
        _id: new Types.ObjectId(),
        title: 'Banned User Document',
        versions: [{ fileUrl: 'https://storage.googleapis.com/bucket/banned/test.pdf' }],
      }
      mockDocumentModel.find.mockReturnValue(mockQuery([mockDoc]))
      mockDocumentChunkModel.deleteMany.mockReturnValue(mockQuery({}))
      mockSavedDocumentModel.deleteMany.mockReturnValue(mockQuery({}))
      mockReportModel.deleteMany.mockReturnValue(mockQuery({}))
      mockDocumentConversationModel.deleteMany.mockReturnValue(mockQuery({}))
      mockDocumentModel.deleteOne.mockReturnValue(mockQuery({}))

      await service.handleBannedUsersCleanup()

      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledWith(
        'https://storage.googleapis.com/bucket/banned/test.pdf',
      )
      expect(mockDocumentChunkModel.deleteMany).toHaveBeenCalledWith({ documentId: mockDoc._id })
      expect(mockSavedDocumentModel.deleteMany).toHaveBeenCalledWith({ documentId: mockDoc._id })
      expect(mockReportModel.deleteMany).toHaveBeenCalledWith({ documentId: mockDoc._id })
      expect(mockDocumentConversationModel.deleteMany).toHaveBeenCalledWith({ documentId: mockDoc._id })
      expect(mockDocumentModel.deleteOne).toHaveBeenCalledWith({ _id: mockDoc._id })

      expect(mockBannedUser.bannedDataDeletionAt).toBeNull()
      expect(mockBannedUser.save).toHaveBeenCalled()
    })
  })
})

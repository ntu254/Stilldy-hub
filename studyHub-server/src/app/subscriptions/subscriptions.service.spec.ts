import { Test, TestingModule } from '@nestjs/testing'
import { SubscriptionsService } from './subscriptions.service'
import { getModelToken } from '@nestjs/mongoose'
import { SubscriptionPlan } from './schemas/subscription-plan.schema'
import { Payment } from './schemas/payment.schema'
import { Subscription } from './schemas/subscription.schema'
import { User } from '../users/entities/user.entity'
import { Connection, Types } from 'mongoose'
import { MyDocument } from '../documents/schemas/document.schema'
import { ConfigService } from '@nestjs/config'
import { BadRequestException } from '@nestjs/common'
import { SettingsService } from '../settings/settings.service'
import { NotificationsService } from '../notifications/notifications.service'

jest.mock('@payos/node', () => {
  return {
    PayOS: jest.fn().mockImplementation(() => {
      return {
        paymentRequests: {
          create: jest.fn().mockResolvedValue({ checkoutUrl: 'mock-checkout-url' }),
        },
      }
    }),
  }
})

describe('SubscriptionsService', () => {
  let service: SubscriptionsService

  const mockQuery = (val: any) => ({
    exec: jest.fn().mockResolvedValue(val),
    populate: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  })

  const mockPlanModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
  }
  const mockPaymentModel = {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn().mockImplementation(() => mockQuery(null)),
    updateMany: jest.fn(),
    updateOne: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  }
  const mockSubscriptionModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  }
  const mockUserModel = {
    findById: jest.fn(),
  }
  const mockDocumentModel = {
    aggregate: jest.fn().mockImplementation(() => ({
      session: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation((resolve) => resolve([])),
    })),
    find: jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
    countDocuments: jest.fn().mockImplementation(() => ({
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(0),
    })),
  }
  const mockConnection = {
    startSession: jest.fn().mockReturnValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    }),
  }
  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'PAYMENT_RETURN_URL') return 'http://localhost/payment/success'
      if (key === 'PAYMENT_CANCEL_URL') return 'http://localhost/payment/cancel'
      return 'mock-value'
    }),
  }
  const mockSettingsService = {
    getPaymentExpiryMins: jest.fn().mockResolvedValue(15),
    getSubscriptionGracePeriodDays: jest.fn().mockResolvedValue(30),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getModelToken(SubscriptionPlan.name),
          useValue: mockPlanModel,
        },
        {
          provide: getModelToken(Payment.name),
          useValue: mockPaymentModel,
        },
        {
          provide: getModelToken(Subscription.name),
          useValue: mockSubscriptionModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(MyDocument.name),
          useValue: mockDocumentModel,
        },
        {
          provide: 'DatabaseConnection', // InjectConnection token
          useValue: mockConnection,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
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

    service = module.get<SubscriptionsService>(SubscriptionsService)

    // Reset all mocks
    jest.clearAllMocks()
    mockPaymentModel.findOne.mockImplementation(() => mockQuery(null))
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getUpgradePreview & purchasePlan', () => {
    const userId = new Types.ObjectId().toString()
    const targetPlanId = new Types.ObjectId().toString()
    const currentPlanId = new Types.ObjectId().toString()
    const currentPaymentId = new Types.ObjectId().toString()
    const currentSubId = new Types.ObjectId().toString()

    const targetPlan = {
      _id: targetPlanId,
      name: 'Gold',
      price: 300000,
      storageLimit: 50 * 1024 * 1024 * 1024, // 50GB
      durationDays: 30,
    }

    const currentPlan = {
      _id: currentPlanId,
      name: 'Silver',
      price: 100000,
      storageLimit: 10 * 1024 * 1024 * 1024, // 10GB
      durationDays: 30,
    }

    const currentSub = {
      _id: currentSubId,
      planId: currentPlanId,
      paymentId: currentPaymentId,
      status: 'active',
      // Dùng 15 ngày, còn 15 ngày (50%)
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    }

    const currentPayment = {
      _id: currentPaymentId,
      amount: 100000,
      planPrice: 100000,
      durationDays: 30,
    }

    const mockUser = {
      _id: userId,
      subscriptionId: currentSubId,
    }

    it('should correctly preview upgrade pricing (50% proration discount)', async () => {
      mockPlanModel.findOne.mockReturnValue(mockQuery(targetPlan))
      mockUserModel.findById.mockReturnValue(mockQuery(mockUser))
      mockSubscriptionModel.findById.mockReturnValue(mockQuery(currentSub))
      mockPlanModel.findById.mockReturnValue(mockQuery(currentPlan))
      mockPaymentModel.findById.mockReturnValue(mockQuery(currentPayment))

      const preview = await service.getUpgradePreview(userId, targetPlanId)

      expect(preview.originalPrice).toBe(300000)
      // Silver đã trả 100k, còn hạn 50% => Khấu trừ 50k
      expect(preview.remainingValueOffset).toBeCloseTo(50000, -2)
      expect(preview.finalAmountToPay).toBeCloseTo(250000, -2)
      expect(preview.isUpgrade).toBe(true)
    })

    it('should block downgrade if target plan has lower storage limit', async () => {
      const lowerPlan = {
        _id: currentPlanId,
        name: 'Silver',
        price: 100000,
        storageLimit: 10 * 1024 * 1024 * 1024,
      }
      const activeGoldSub = {
        ...currentSub,
        planId: targetPlanId, // Hiện tại đang dùng Gold
      }

      mockPlanModel.findOne.mockReturnValue(mockQuery(lowerPlan))
      mockUserModel.findById.mockReturnValue(mockQuery(mockUser))
      mockSubscriptionModel.findById.mockReturnValue(mockQuery(activeGoldSub))
      mockPlanModel.findById.mockReturnValue(mockQuery(targetPlan)) // Đang dùng Gold

      await expect(service.getUpgradePreview(userId, currentPlanId)).rejects.toThrow(BadRequestException)
    })

    it('should purchase upgrade and create a PayOS link with discounted amount', async () => {
      mockPlanModel.findOne.mockReturnValue(mockQuery(targetPlan))
      mockUserModel.findById.mockReturnValue(mockQuery(mockUser))
      mockSubscriptionModel.findById.mockReturnValue(mockQuery(currentSub))
      mockPlanModel.findById.mockReturnValue(mockQuery(currentPlan))
      mockPaymentModel.findById.mockReturnValue(mockQuery(currentPayment))
      mockPaymentModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        ...targetPlan,
      })

      const dto = {
        planId: targetPlanId,
        returnUrl: 'http://localhost/payment/success',
        cancelUrl: 'http://localhost/payment/cancel',
      }

      const result = await service.purchasePlan(userId, dto)
      expect(result.checkoutUrl).toBe('mock-checkout-url')
      expect(mockPaymentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: expect.any(Number),
          originalAmount: 300000,
          isUpgrade: true,
          status: 'pending',
        }),
      )
    })

    it('should return existing pending payment details if one exists and is not expired', async () => {
      const activePendingPayment = {
        _id: new Types.ObjectId(),
        orderCode: 998877,
        checkoutUrl: 'existing-checkout-url',
        status: 'pending',
        expiredAt: new Date(Date.now() + 10 * 60 * 1000),
      }
      mockPlanModel.findOne.mockReturnValue(mockQuery(targetPlan))
      mockUserModel.findById.mockReturnValue(mockQuery(mockUser))
      mockPaymentModel.findOne.mockReturnValue(mockQuery(activePendingPayment))

      const dto = {
        planId: targetPlanId,
        returnUrl: 'http://localhost/payment/success',
        cancelUrl: 'http://localhost/payment/cancel',
      }

      const result = await service.purchasePlan(userId, dto)
      expect(result.checkoutUrl).toBe('existing-checkout-url')
      expect(result.orderCode).toBe(998877)
      expect(mockPaymentModel.create).not.toHaveBeenCalled()
    })

    it('should upgrade directly (free) when remaining offset covers the new plan price', async () => {
      // Gói hiện tại là Silver (100k, 10GB).
      // Người dùng đã gia hạn nhiều lần nên tổng tiền trả là 300k cho 90 ngày.
      // Đã dùng 10 ngày, còn lại 80 ngày. Giá trị còn lại = 300k * (80/90) = 266k.
      // Muốn nâng cấp lên gói Gold (250k, 50GB). Do 50GB > 10GB và 250k > 100k nên là nâng cấp hợp lệ.
      // Giá nâng cấp = 250k - 266k = -16k -> Miễn phí (0đ).
      const renewedSilverSub = {
        ...currentSub,
        planId: currentPlanId, // Vẫn là gói Silver
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000),
      }
      const renewedSilverPayment = {
        _id: currentPaymentId,
        amount: 300000, // Thanh toán tổng cộng 300k
        planPrice: 100000, // Giá trị gốc của 1 chu kỳ gói Silver là 100k
        durationDays: 30, // Thời lượng gốc của 1 chu kỳ gói Silver là 30 ngày
      }

      const targetPromoPlan = {
        ...targetPlan,
        price: 250000,
      }

      mockPlanModel.findOne.mockReturnValue(mockQuery(targetPromoPlan)) // Target là Promo Gold (250k, 50GB)
      mockUserModel.findById.mockReturnValue(mockQuery(mockUser))
      mockSubscriptionModel.findById.mockReturnValue(mockQuery(renewedSilverSub))
      mockPlanModel.findById.mockReturnValue(mockQuery(currentPlan)) // Gói hiện tại là Silver
      mockPaymentModel.findById.mockReturnValue(mockQuery(renewedSilverPayment))

      const mockCreatedPayment = {
        _id: new Types.ObjectId(),
        planId: targetPromoPlan._id,
        userId: new Types.ObjectId(userId),
        durationDays: targetPromoPlan.durationDays,
        storageLimit: targetPromoPlan.storageLimit,
      }
      mockPaymentModel.create.mockResolvedValue(mockCreatedPayment)

      // Spy on activateSubscription to make sure it gets called
      const activateSpy = jest.spyOn(service as any, 'activateSubscription').mockResolvedValue(undefined)

      const dto = {
        planId: targetPlanId,
        returnUrl: 'http://localhost/payment/success',
        cancelUrl: 'http://localhost/payment/cancel',
      }

      const result = await service.purchasePlan(userId, dto)

      // checkoutUrl phải chứa đường dẫn thành công của client để redirect
      expect(result.checkoutUrl).toContain('http://localhost/payment/success')
      expect(result.checkoutUrl).toContain('orderCode=')
      expect(activateSpy).toHaveBeenCalledWith(mockCreatedPayment, 'FREE_UPGRADE')
      expect(mockPaymentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 0,
          status: 'paid',
          isUpgrade: true,
        }),
      )
    })
  })

  describe('getPaymentHistory', () => {
    const userId = new Types.ObjectId().toString()

    it('should update expired pending payments before returning history', async () => {
      const mockPayments = [
        {
          _id: new Types.ObjectId(),
          orderCode: 123456,
          status: 'pending',
          expiredAt: new Date(Date.now() - 1000),
        },
      ]
      mockPaymentModel.updateMany.mockReturnValue(mockQuery({ nModified: 1 }))
      mockPaymentModel.countDocuments.mockResolvedValue(1)
      mockPaymentModel.find.mockReturnValue(mockQuery(mockPayments))

      const history = await service.getPaymentHistory(userId, {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      } as any)
      expect(mockPaymentModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: new Types.ObjectId(userId),
          status: 'pending',
          $or: expect.any(Array),
        }),
        expect.objectContaining({
          $set: { status: 'expired' },
        }),
      )
      expect(mockPaymentModel.find).toHaveBeenCalledWith({ userId: new Types.ObjectId(userId) })
      expect(history).toEqual({
        data: mockPayments,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      })
    })
  })

  describe('getPaymentStatus', () => {
    const userId = new Types.ObjectId().toString()

    it('should return expired status immediately if expiredAt has passed', async () => {
      const expiredPayment = {
        _id: new Types.ObjectId(),
        orderCode: 123456,
        status: 'pending',
        expiredAt: new Date(Date.now() - 1000),
        save: jest.fn().mockResolvedValue(true),
      }
      mockPaymentModel.findOne.mockReturnValue(mockQuery(expiredPayment))

      const result = await service.getPaymentStatus(123456, userId)
      expect(result.status).toBe('expired')
      expect(expiredPayment.save).toHaveBeenCalled()
    })

    it('should return expired status using legacy createdAt fallback if expiredAt is missing and createdAt is in the past', async () => {
      const legacyPayment = {
        _id: new Types.ObjectId(),
        orderCode: 123456,
        status: 'pending',
        expiredAt: null,
        createdAt: new Date(Date.now() - 20 * 60 * 1000),
        save: jest.fn().mockResolvedValue(true),
      }
      mockPaymentModel.findOne.mockReturnValue(mockQuery(legacyPayment))

      const result = await service.getPaymentStatus(123456, userId)
      expect(result.status).toBe('expired')
      expect(legacyPayment.save).toHaveBeenCalled()
    })
  })

  describe('getPaymentStats', () => {
    it('should aggregate and return payment stats with cancelled and unpaid revenue', async () => {
      const mockOverview = {
        totalTransactions: 10,
        totalRevenue: 500000,
        cancelledRevenue: 100000,
        unpaidRevenue: 50000,
        successfulTransactions: 5,
        pendingTransactions: 2,
        failedTransactions: 1,
        cancelledTransactions: 1,
        expiredTransactions: 1,
      }

      const mockPlanStats = [
        {
          planName: 'PRO_MONTH',
          totalCount: 5,
          purchasesCount: 4,
          revenue: 400000,
        },
      ]

      const mockTimeline = [
        {
          date: '2026-07-18',
          revenue: 500000,
          cancelledRevenue: 100000,
          unpaidRevenue: 50000,
          totalTransactions: 10,
          successfulTransactions: 5,
        },
      ]

      mockPaymentModel.aggregate
        .mockReturnValueOnce([mockOverview]) // First call: overviewStats
        .mockReturnValueOnce(mockPlanStats)  // Second call: planStats
        .mockReturnValueOnce(mockTimeline)   // Third call: timelineStats

      const result = await service.getPaymentStats({
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        groupBy: 'day',
      })

      expect(mockPaymentModel.aggregate).toHaveBeenCalledTimes(3)
      expect(result.overview.cancelledRevenue).toBe(100000)
      expect(result.overview.unpaidRevenue).toBe(50000)
      expect((result.overview as any).expectedRevenue).toBeUndefined()
      expect(result.timeline[0].cancelledRevenue).toBe(100000)
      expect(result.timeline[0].unpaidRevenue).toBe(50000)
      expect((result.timeline[0] as any).expectedRevenue).toBeUndefined()
    })
  })
})

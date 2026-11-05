import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { SettingsService } from './settings.service'
import { SystemSetting } from './schemas/system-setting.schema'

describe('SettingsService', () => {
  let service: SettingsService
  let mockSettingModel: any

  const mockQuery = (val: any) => ({
    exec: jest.fn().mockResolvedValue(val),
  })

  beforeEach(async () => {
    mockSettingModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getModelToken(SystemSetting.name),
          useValue: mockSettingModel,
        },
      ],
    }).compile()

    service = module.get<SettingsService>(SettingsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('onModuleInit', () => {
    it('should seed default settings if they do not exist', async () => {
      mockSettingModel.findOne.mockReturnValue(mockQuery(null))

      await service.onModuleInit()

      expect(mockSettingModel.findOne).toHaveBeenCalledTimes(3)
      expect(mockSettingModel.create).toHaveBeenCalledTimes(3)
    })

    it('should not seed default settings if they already exist', async () => {
      mockSettingModel.findOne.mockReturnValue(mockQuery({ value: 10 }))

      await service.onModuleInit()

      expect(mockSettingModel.findOne).toHaveBeenCalledTimes(3)
      expect(mockSettingModel.create).not.toHaveBeenCalled()
    })
  })

  describe('getSettingValue', () => {
    it('should return value from DB if key exists', async () => {
      mockSettingModel.findOne.mockReturnValue(mockQuery({ value: 45 }))
      const val = await service.getSettingValue('payment_expiry_mins', 15)
      expect(val).toBe(45)
    })

    it('should return default value if key does not exist', async () => {
      mockSettingModel.findOne.mockReturnValue(mockQuery(null))
      const val = await service.getSettingValue('payment_expiry_mins', 15)
      expect(val).toBe(15)
    })
  })

  describe('getters', () => {
    it('should retrieve payment expiry mins', async () => {
      mockSettingModel.findOne.mockReturnValue(mockQuery({ value: 20 }))
      expect(await service.getPaymentExpiryMins()).toBe(20)
    })

    it('should retrieve subscription grace period days', async () => {
      mockSettingModel.findOne.mockReturnValue(mockQuery({ value: 14 }))
      expect(await service.getSubscriptionGracePeriodDays()).toBe(14)
    })

    it('should retrieve banned user grace period days', async () => {
      mockSettingModel.findOne.mockReturnValue(mockQuery({ value: 10 }))
      expect(await service.getBannedUserGracePeriodDays()).toBe(10)
    })
  })

  describe('getAllSettingsAndUpdates', () => {
    it('should return all settings', async () => {
      mockSettingModel.find.mockReturnValue(mockQuery([{ key: 'a', value: 1 }]))
      const all = await service.getAllSettings()
      expect(all).toEqual([{ key: 'a', value: 1 }])
    })

    it('should update a setting', async () => {
      mockSettingModel.findOneAndUpdate.mockReturnValue(mockQuery({ key: 'a', value: 2 }))
      const updated = await service.updateSetting('a', 2)
      expect(mockSettingModel.findOneAndUpdate).toHaveBeenCalledWith({ key: 'a' }, { value: 2 }, { new: true })
      expect(updated).toEqual({ key: 'a', value: 2 })
    })
  })
})

import { Test, TestingModule } from '@nestjs/testing'
import { SettingsController } from './settings.controller'
import { SettingsService } from './settings.service'
import { Reflector } from '@nestjs/core'
import { UsersService } from '../users/users.service'

describe('SettingsController', () => {
  let controller: SettingsController
  let mockSettingsService: any

  beforeEach(async () => {
    mockSettingsService = {
      getAllSettings: jest.fn().mockResolvedValue([]),
      updateSetting: jest.fn().mockResolvedValue({}),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
        {
          provide: UsersService,
          useValue: {},
        },
        {
          provide: Reflector,
          useValue: {},
        },
      ],
    }).compile()

    controller = module.get<SettingsController>(SettingsController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('getSettings', () => {
    it('should return all settings', async () => {
      const result = await controller.getSettings()
      expect(mockSettingsService.getAllSettings).toHaveBeenCalled()
      expect(result).toEqual({
        message: 'Lấy danh sách cấu hình thành công',
        data: [],
      })
    })
  })

  describe('updateSettings', () => {
    it('should update provided settings', async () => {
      const result = await controller.updateSettings({
        paymentExpiryMins: 10,
        subscriptionGracePeriodDays: 5,
        bannedUserGracePeriodDays: 7,
      })
      expect(mockSettingsService.updateSetting).toHaveBeenCalledTimes(3)
      expect(result.message).toBe('Cập nhật cấu hình thành công')
    })
  })
})

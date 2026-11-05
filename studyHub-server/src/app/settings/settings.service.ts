import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { SystemSetting, SystemSettingDocument } from './schemas/system-setting.schema'

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name)

  constructor(
    @InjectModel(SystemSetting.name)
    private readonly settingModel: Model<SystemSettingDocument>,
  ) {}

  async onModuleInit() {
    const defaults = [
      { key: 'payment_expiry_mins', value: 15, description: 'Thời gian hết hạn của mã QR thanh toán (phút)' },
      {
        key: 'subscription_grace_period_days',
        value: 30,
        description: 'Thời gian ân hạn trước khi xóa tài liệu của người dùng hết hạn Pro (ngày)',
      },
      {
        key: 'banned_user_grace_period_days',
        value: 30,
        description: 'Thời gian ân hạn trước khi xóa tài liệu của người dùng bị khóa (ngày)',
      },
    ]

    for (const item of defaults) {
      const exists = await this.settingModel.findOne({ key: item.key }).exec()
      if (!exists) {
        await this.settingModel.create(item)
        this.logger.log(`Đã khởi tạo cấu hình mặc định: ${item.key} = ${item.value}`)
      }
    }
  }

  async getSettingValue<T>(key: string, defaultValue: T): Promise<T> {
    const setting = await this.settingModel.findOne({ key }).exec()
    return setting ? (setting.value as T) : defaultValue
  }

  async getPaymentExpiryMins(): Promise<number> {
    return this.getSettingValue<number>('payment_expiry_mins', 15)
  }

  async getSubscriptionGracePeriodDays(): Promise<number> {
    return this.getSettingValue<number>('subscription_grace_period_days', 30)
  }

  async getBannedUserGracePeriodDays(): Promise<number> {
    return this.getSettingValue<number>('banned_user_grace_period_days', 30)
  }

  async getAllSettings(): Promise<SystemSetting[]> {
    return this.settingModel.find().exec()
  }

  async updateSetting(key: string, value: any): Promise<SystemSetting | null> {
    return this.settingModel.findOneAndUpdate({ key }, { value }, { new: true }).exec()
  }
}

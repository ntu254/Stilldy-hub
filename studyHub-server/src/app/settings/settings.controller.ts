import { Controller, Get, Body, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '../users/entities/user.entity'
import { SettingsService } from './settings.service'
import { UpdateSettingsDto } from './dto/update-settings.dto'

@ApiTags('Admin — Settings')
@ApiBearerAuth('accessToken')
@Controller('admin/settings')
@Roles(UserRole.ADMIN)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả cấu hình hệ thống' })
  async getSettings() {
    const settings = await this.settingsService.getAllSettings()
    return {
      message: 'Lấy danh sách cấu hình thành công',
      data: settings,
    }
  }

  @Patch()
  @ApiOperation({ summary: 'Cập nhật cấu hình hệ thống' })
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    const results: any[] = []

    if (dto.paymentExpiryMins !== undefined) {
      results.push(await this.settingsService.updateSetting('payment_expiry_mins', dto.paymentExpiryMins))
    }
    if (dto.subscriptionGracePeriodDays !== undefined) {
      results.push(
        await this.settingsService.updateSetting('subscription_grace_period_days', dto.subscriptionGracePeriodDays),
      )
    }
    if (dto.bannedUserGracePeriodDays !== undefined) {
      results.push(
        await this.settingsService.updateSetting('banned_user_grace_period_days', dto.bannedUserGracePeriodDays),
      )
    }

    return {
      message: 'Cập nhật cấu hình thành công',
      data: results,
    }
  }
}

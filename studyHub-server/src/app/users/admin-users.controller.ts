import { Controller, Param, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { UsersService } from './users.service'
import { UserRole } from './entities/user.entity'

@ApiTags('Admin — Users Management')
@ApiBearerAuth('accessToken')
@Controller('admin/users')
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch(':id/ban')
  @ApiOperation({ summary: 'Admin khóa tài khoản người dùng' })
  banUser(@Param('id') id: string) {
    return this.usersService.banUser(id)
  }

  @Patch(':id/unban')
  @ApiOperation({ summary: 'Admin mở khóa tài khoản người dùng' })
  unbanUser(@Param('id') id: string) {
    return this.usersService.unbanUser(id)
  }

  @Patch(':id/upgrade-pro')
  @ApiOperation({
    summary: 'Admin nâng cấp tài khoản lên Pro (storageLimit: 2GB → 5GB)',
  })
  upgradeToPro(@Param('id') id: string) {
    return this.usersService.upgradeUserToPro(id)
  }

  @Patch(':id/downgrade-free')
  @ApiOperation({
    summary: 'Admin hạ cấp tài khoản về Free (storageLimit: 5GB → 2GB)',
  })
  downgradeToFree(@Param('id') id: string) {
    return this.usersService.downgradeUserToFree(id)
  }
}

import { Controller, Get, Patch, Query, Body } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { User } from '../../common/decorators/user.decorator'
import type { UserInfo } from '../../common/decorators/user.decorator'
import { QueryNotificationDto } from './dto/query-notification.dto'

@ApiTags('Notifications')
@ApiBearerAuth('accessToken')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy lịch sử thông báo của tôi (có phân trang và lọc trạng thái đọc)' })
  getUserNotifications(
    @User() user: UserInfo,
    @Query() query: QueryNotificationDto,
  ) {
    const isReadBool = query.isRead === 'true' ? true : query.isRead === 'false' ? false : undefined

    return this.notificationsService.getUserNotifications(user.userID, {
      page: query.page,
      limit: query.limit,
      isRead: isReadBool,
    })
  }

  @Patch('read')
  @ApiOperation({ summary: 'Đánh dấu các thông báo đã được chọn hoặc tất cả thông báo là đã đọc' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        notificationIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Danh sách ID thông báo cần đánh dấu đã đọc. Để trống để đánh dấu tất cả.',
        },
      },
    },
  })
  markAsRead(@User() user: UserInfo, @Body('notificationIds') notificationIds?: string[]) {
    return this.notificationsService.markAsRead(user.userID, notificationIds)
  }
}

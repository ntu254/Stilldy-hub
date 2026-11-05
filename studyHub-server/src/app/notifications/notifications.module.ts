import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { NotificationGateway } from './notification.gateway'
import { DbNotification, DbNotificationSchema } from './schemas/notification.schema'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DbNotification.name, schema: DbNotificationSchema }]),
    AuthModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationGateway],
  exports: [NotificationsService, NotificationGateway],
})
export class NotificationsModule {}

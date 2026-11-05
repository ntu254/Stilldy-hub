import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { DbNotification, DbNotificationDocument } from './schemas/notification.schema'
import { NotificationGateway } from './notification.gateway'
import { NotificationType } from './notification-type.enum'

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(DbNotification.name) private readonly notificationModel: Model<DbNotificationDocument>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async createAndSendNotification(
    userId: string,
    data: {
      type: NotificationType
      title: string
      message: string
      metadata?: Record<string, any>
    },
  ): Promise<DbNotificationDocument> {
    const createdNotification = new this.notificationModel({
      userId: new Types.ObjectId(userId),
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata || {},
      isRead: false,
    })

    const saved = await createdNotification.save()

    // Send via socket gateway
    this.notificationGateway.sendNotificationToUser(userId, {
      id: saved._id.toString(),
      _id: saved._id.toString(),
      type: saved.type,
      title: saved.title,
      message: saved.message,
      isRead: saved.isRead,
      metadata: saved.metadata,
      createdAt: (saved as any).createdAt,
    })

    return saved
  }

  async getUserNotifications(
    userId: string,
    query: { page: number; limit: number; isRead?: boolean },
  ) {
    const { page = 1, limit = 10, isRead } = query
    const skip = (page - 1) * limit
    const findFilter: Record<string, any> = { userId: new Types.ObjectId(userId) }

    if (isRead !== undefined) {
      findFilter.isRead = isRead
    }

    const total = await this.notificationModel.countDocuments(findFilter)
    const items = await this.notificationModel
      .find(findFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec()

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async markAsRead(userId: string, notificationIds?: string[]) {
    const filter: Record<string, any> = { userId: new Types.ObjectId(userId) }

    if (notificationIds && notificationIds.length > 0) {
      filter._id = { $in: notificationIds.map((id) => new Types.ObjectId(id)) }
    }

    const result = await this.notificationModel.updateMany(filter, { $set: { isRead: true } })

    return {
      message: 'Đã đánh dấu các thông báo là đã đọc.',
      modifiedCount: result.modifiedCount,
    }
  }
}

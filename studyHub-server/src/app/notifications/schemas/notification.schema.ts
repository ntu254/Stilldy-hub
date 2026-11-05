import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { NotificationType } from '../notification-type.enum'

export type DbNotificationDocument = DbNotification & Document

@Schema({ timestamps: true })
export class DbNotification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId

  @Prop({ type: String, enum: NotificationType, required: true })
  type!: NotificationType

  @Prop({ required: true })
  title!: string

  @Prop({ required: true })
  message!: string

  @Prop({ type: Boolean, default: false })
  isRead!: boolean

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, any>
}

export const DbNotificationSchema = SchemaFactory.createForClass(DbNotification)

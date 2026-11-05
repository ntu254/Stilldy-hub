import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type SubscriptionPlanDocument = SubscriptionPlan & Document

@Schema({ timestamps: true })
export class SubscriptionPlan {
  @Prop({ required: true, unique: true, trim: true })
  name!: string

  @Prop({ required: true, min: 0 })
  price!: number

  @Prop({ required: true, min: 0 })
  storageLimit!: number // Dung lượng lưu trữ tính bằng byte

  @Prop({ required: true, min: 1 })
  durationDays!: number // Thời hạn sử dụng tính bằng ngày

  @Prop({ default: true })
  isActive!: boolean

  @Prop({ type: String, default: null })
  description!: string | null

  @Prop({ type: [String], default: [] })
  features!: string[]

  @Prop({ type: Number, default: 0 })
  sortOrder!: number

  @Prop({ default: false })
  _destroy!: boolean
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan)

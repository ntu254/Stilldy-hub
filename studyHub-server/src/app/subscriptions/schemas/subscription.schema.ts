import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type SubscriptionDocument = Subscription & Document

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'SubscriptionPlan', required: true })
  planId!: Types.ObjectId

  @Prop({ required: true })
  startDate!: Date

  @Prop({ required: true })
  endDate!: Date

  @Prop({ type: String, enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus

  @Prop({ type: Types.ObjectId, ref: 'Payment', required: true })
  paymentId!: Types.ObjectId

  @Prop({ type: Boolean, default: false })
  isCleanedUp!: boolean
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription)

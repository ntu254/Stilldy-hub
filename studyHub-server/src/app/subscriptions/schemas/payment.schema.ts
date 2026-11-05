import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type PaymentDocument = Payment & Document

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'SubscriptionPlan', required: true })
  planId!: Types.ObjectId

  @Prop({ required: true, unique: true })
  orderCode!: number

  @Prop({ required: true })
  amount!: number

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus

  @Prop({ type: String, default: null })
  checkoutUrl!: string | null

  @Prop({ type: String, default: null })
  payosPaymentId!: string | null

  @Prop({ type: String, default: null })
  couponCode!: string | null

  // Snapshots of the plan at the time of purchase
  @Prop({ required: true })
  planName!: string

  @Prop({ required: true })
  planPrice!: number

  @Prop({ required: true })
  storageLimit!: number

  @Prop({ required: true })
  durationDays!: number

  @Prop({ type: Number, default: null })
  originalAmount!: number | null

  @Prop({ type: Number, default: 0 })
  discountAmount!: number

  @Prop({ type: Boolean, default: false })
  isUpgrade!: boolean

  @Prop({ type: Date, default: null })
  paidAt!: Date | null

  @Prop({ type: Date, default: null })
  expiredAt!: Date | null
}

export const PaymentSchema = SchemaFactory.createForClass(Payment)

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  ADMIN = 'admin',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

export type UserDocument = HydratedDocument<User>

@Schema({ timestamps: true })
export class User {
  id!: string

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string

  @Prop({ required: false })
  password?: string

  @Prop({ type: String, unique: true, sparse: true })
  googleId?: string

  @Prop({ type: String, enum: AuthProvider, default: AuthProvider.LOCAL })
  provider!: AuthProvider

  @Prop({ type: String, trim: true, default: null })
  phoneNumber!: string | null

  @Prop({ trim: true })
  identityNumber!: string

  @Prop({ type: String, enum: ['male', 'female', 'other'], default: null })
  gender!: string | null

  @Prop({ type: Date, default: null })
  dateOfBirth!: Date | null

  @Prop({ type: String, trim: true, default: null })
  address!: string | null

  @Prop({ trim: true })
  displayName!: string

  @Prop({ type: String, trim: true, default: null })
  avatar!: string | null

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role!: UserRole

  @Prop({ default: true })
  isActive!: boolean

  @Prop({ default: false })
  isVerified!: boolean

  // --- LUỒNG FORGOT PASSWORD ---

  @Prop({ type: String, default: null })
  resetPasswordToken!: string | null // Dùng cho link reset qua Email

  @Prop({ type: String, default: null })
  resetPasswordOtp!: string | null // Dùng cho mã OTP qua SMS

  @Prop({ type: Date, default: null })
  resetPasswordExpiresAt!: Date | null // Thời hạn của Token hoặc OTP

  // --- STORAGE QUOTA ---

  @Prop({ type: Number, default: 2147483648 }) // Mặc định 2GB cho Free tier
  storageLimit!: number

  @Prop({ default: false })
  isPro!: boolean

  @Prop({ type: Types.ObjectId, ref: 'Subscription', default: null })
  subscriptionId!: Types.ObjectId | null

  @Prop({ type: Date, default: null })
  willDeleteDataAt!: Date | null

  @Prop({ type: Date, default: null })
  bannedDataDeletionAt!: Date | null

  @Prop({ default: false })
  _destroy!: boolean

  // --- HỆ THỐNG BÁO CÁO VI PHẠM ---
  @Prop({ type: Number, default: 0 })
  violationCount!: number

  @Prop({ type: Date, default: null })
  uploadBannedUntil!: Date | null
}

export const UserSchema = SchemaFactory.createForClass(User)

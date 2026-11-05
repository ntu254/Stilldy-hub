import { z } from 'zod'
import { UserRole } from '../entities/user.entity'

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  phoneNumber: z.string().optional(),
  identityNumber: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  dateOfBirth: z.string().datetime({ offset: true }).nullable().optional(),
  address: z.string().nullable().optional(),
  displayName: z.string().optional(),
  avatar: z.string().nullable().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  resetPasswordToken: z.string().nullable().optional(),
  resetPasswordOtp: z.string().nullable().optional(),
  resetPasswordExpiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  _destroy: z.boolean().optional(),
  googleId: z.string().nullable().optional(),
  provider: z.enum(['local', 'google']).optional(),
})

export type UserSchemaType = z.infer<typeof UserSchema>

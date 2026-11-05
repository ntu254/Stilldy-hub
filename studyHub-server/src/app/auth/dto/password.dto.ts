import z from 'zod'
import { createZodDto } from 'nestjs-zod'
import { UserSchema } from '../../users/schemas/user.zod'

const forgotPasswordSchema = z.object({
  email: UserSchema.shape.email.optional(),
})

export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) {}

const changePasswordSchema = z.object({
  oldPassword: UserSchema.shape.password,
  newPassword: UserSchema.shape.password,
})

export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}

const resetPasswordSchema = z.object({
  newPassword: UserSchema.shape.password,
})

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}

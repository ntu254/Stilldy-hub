import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { TokenKeys } from '../consts/jwt.const'
import { UserSchema } from '../../users/schemas/user.zod'

const SignInSchema = UserSchema.pick({ email: true, password: true })

const SignUpSchema = SignInSchema.merge(UserSchema.pick({ displayName: true }).partial())

const SignInResponseSchema = z.object({
  [TokenKeys.ACCESS_TOKEN_KEY]: z.string(),
  [TokenKeys.REFRESH_TOKEN_KEY]: z.string(),
})

class SignInDto extends createZodDto(SignInSchema) {}

class SignInResponseDto extends createZodDto(SignInResponseSchema) {}

class SignUpDto extends createZodDto(SignUpSchema) {}

export { SignInDto, SignInResponseDto, SignUpDto }

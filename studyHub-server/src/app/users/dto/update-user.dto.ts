import { createZodDto } from 'nestjs-zod'
import { UserSchema } from '../schemas/user.zod'

const UpdateUserSchema = UserSchema.omit({ id: true }).partial()

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}

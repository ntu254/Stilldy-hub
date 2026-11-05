import { createZodDto } from 'nestjs-zod'
import { UserSchema } from '../schemas/user.zod'

const CreateUserSchema = UserSchema.omit({ id: true })

export class CreateUserDto extends createZodDto(CreateUserSchema) {}

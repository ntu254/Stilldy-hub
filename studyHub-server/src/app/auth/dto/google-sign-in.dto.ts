import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const GoogleSignInSchema = z.object({
  idToken: z.string().min(1, 'Google idToken is required'),
})

export class GoogleSignInDto extends createZodDto(GoogleSignInSchema) {}

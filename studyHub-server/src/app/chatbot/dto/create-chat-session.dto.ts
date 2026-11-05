import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const CreateChatSessionSchema = z.object({
  sessionTitle: z.string().optional().default('Đoạn chat mới'),
  documentIds: z.array(z.string()).optional().default([]),
})

export class CreateChatSessionDto extends createZodDto(CreateChatSessionSchema) {}

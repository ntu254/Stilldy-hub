import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const SendMessageSchema = z.object({
  textContent: z.string().min(1, 'Nội dung tin nhắn không được để trống'),
  documentId: z.string().optional(),
})

export class SendMessageDto extends createZodDto(SendMessageSchema) {}

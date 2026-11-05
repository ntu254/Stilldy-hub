import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const SendDocumentMessageSchema = z.object({
  textContent: z.string().min(1, 'Nội dung tin nhắn không được để trống'),
})

export class SendDocumentMessageDto extends createZodDto(SendDocumentMessageSchema) {}

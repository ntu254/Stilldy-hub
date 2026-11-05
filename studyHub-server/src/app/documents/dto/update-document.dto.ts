import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1, 'Tiêu đề tài liệu không được để trống').optional(),
  description: z.string().optional(),
})

export class UpdateDocumentDto extends createZodDto(UpdateDocumentSchema) {}

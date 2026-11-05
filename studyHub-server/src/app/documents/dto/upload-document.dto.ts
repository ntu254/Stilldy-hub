import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const UploadDocumentSchema = z.object({
  title: z.string().min(1, 'Tiêu đề tài liệu không được để trống'),
  description: z.string().optional(),
  subjectId: z.string().min(1, 'Vui lòng chọn môn học hợp lệ'),
  tags: z
    .union([z.array(z.string()), z.string()])
    .transform((v) => {
      const arr = Array.isArray(v) ? v : v.split(',')
      return arr.map((t) => t.trim()).filter(Boolean)
    })
    .pipe(z.array(z.string()).min(1, 'Vui lòng nhập ít nhất 1 tag'))
    .optional(),
})

export class UploadDocumentDto extends createZodDto(UploadDocumentSchema) {}

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const ReportDocumentSchema = z.object({
  reason: z.string().min(5, 'Lý do báo cáo phải có ít nhất 5 ký tự để Admin duyệt'),
})

export class ReportDocumentDto extends createZodDto(ReportDocumentSchema) {}

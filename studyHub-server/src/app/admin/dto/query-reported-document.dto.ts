import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const QueryReportedDocumentSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  // Search keyword for document title, description, tags, or uploader displayName/email
  search: z.string().optional(),

  // Filter by subject category
  subjectId: z.string().optional(),

  // Filter by isPublic status
  isPublic: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => val === true || val === 'true')
    .optional(),

  // Sorting
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'title', 'viewCount', 'downloadCount', 'uploader', 'size', 'isPublic'])
    .default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export class QueryReportedDocumentDto extends createZodDto(QueryReportedDocumentSchema) {}

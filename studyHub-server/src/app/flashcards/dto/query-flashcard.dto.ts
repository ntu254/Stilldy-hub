import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const QueryFlashcardSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  // Tìm kiếm theo title (text search nếu có index, fallback regex nếu không)
  search: z.string().optional(),

  // Sắp xếp
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  sortBy: z.enum(['createdAt', 'title', 'viewCount']).default('createdAt'),
})

export class QueryFlashcardDto extends createZodDto(QueryFlashcardSchema) {}

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const QueryLearningHistorySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  // Lọc theo chế độ học
  mode: z.string().optional(),

  // Lọc theo điểm số
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),

  // Sorting
  sortBy: z.enum(['createdAt', 'score', 'durationSeconds', 'totalQuestions', 'correctAnswers']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export class QueryLearningHistoryDto extends createZodDto(QueryLearningHistorySchema) {}

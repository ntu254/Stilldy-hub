import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const QueryPaymentStatsSchema = z.object({
  // ISO date string (YYYY-MM-DD or standard datetime string)
  startDate: z.string().optional(),
  endDate: z.string().optional(),

  // Grouping factor for history/timeline chart ('day' or 'month')
  groupBy: z.enum(['day', 'month']).default('day'),
})

export class QueryPaymentStatsDto extends createZodDto(QueryPaymentStatsSchema) {}

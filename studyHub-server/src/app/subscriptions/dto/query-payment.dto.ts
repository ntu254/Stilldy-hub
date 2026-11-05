import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { PaymentStatus } from '../schemas/payment.schema'

export const QueryPaymentSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  // Search keyword for user displayName/email, planName, or orderCode
  search: z.string().optional(),

  // Filter by status (pending, paid, failed, cancelled, expired)
  status: z.nativeEnum(PaymentStatus).optional(),

  // Sorting
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'amount', 'paidAt', 'orderCode', 'user', 'planName', 'status'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export class QueryPaymentDto extends createZodDto(QueryPaymentSchema) {}

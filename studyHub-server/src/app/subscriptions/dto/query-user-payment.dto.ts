import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { PaymentStatus } from '../schemas/payment.schema'

export const QueryUserPaymentSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  // Search keyword for planName or orderCode (optional)
  search: z.string().optional(),

  // Filter by status (pending, paid, failed, cancelled, expired)
  status: z.nativeEnum(PaymentStatus).optional(),

  // Sorting
  sortBy: z.enum(['createdAt', 'amount', 'paidAt', 'orderCode']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export class QueryUserPaymentDto extends createZodDto(QueryUserPaymentSchema) {}

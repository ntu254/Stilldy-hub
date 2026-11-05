import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const PurchaseSchema = z.object({
  planId: z.string().min(1, 'PlanId không được để trống'),
  couponCode: z.string().nullable().optional(),
  returnUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
})

export class PurchaseDto extends createZodDto(PurchaseSchema) {}

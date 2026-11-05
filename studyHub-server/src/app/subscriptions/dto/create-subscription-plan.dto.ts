import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const CreateSubscriptionPlanSchema = z.object({
  name: z.string().min(1, 'Tên gói nâng cấp không được để trống'),
  price: z.number().min(0, 'Giá gói phải >= 0'),
  storageLimit: z.number().min(0, 'Dung lượng lưu trữ phải >= 0'),
  durationDays: z.number().min(1, 'Thời gian sử dụng phải >= 1 ngày'),
  isActive: z.boolean().optional(),
  description: z.string().nullable().optional(),
  features: z.array(z.string()).default([]),
  sortOrder: z.number().default(0),
})

export class CreateSubscriptionPlanDto extends createZodDto(CreateSubscriptionPlanSchema) {}

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const UpdateSettingsSchema = z.object({
  paymentExpiryMins: z.number().int().min(1).max(1440).optional(), // 1 phút đến 24 giờ
  subscriptionGracePeriodDays: z.number().int().min(0).max(365).optional(), // 0 đến 1 năm
  bannedUserGracePeriodDays: z.number().int().min(0).max(365).optional(), // 0 đến 1 năm
})

export class UpdateSettingsDto extends createZodDto(UpdateSettingsSchema) {}

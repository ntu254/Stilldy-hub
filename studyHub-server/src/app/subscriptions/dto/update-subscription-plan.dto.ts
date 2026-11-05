import { createZodDto } from 'nestjs-zod'
import { CreateSubscriptionPlanSchema } from './create-subscription-plan.dto'

export const UpdateSubscriptionPlanSchema = CreateSubscriptionPlanSchema.partial()

export class UpdateSubscriptionPlanDto extends createZodDto(UpdateSubscriptionPlanSchema) {}

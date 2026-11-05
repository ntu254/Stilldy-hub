import { z } from 'zod'

export function withResponse<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    message: z.string().optional(),
    errors: z.array(z.record(z.string(), z.any())).nullable().optional(),
  })
}

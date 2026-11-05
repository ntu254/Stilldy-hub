import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const QueryNotificationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  
  // Select filter for read/unread state (renders as a dropdown in Swagger)
  isRead: z.enum(['true', 'false']).optional(),
})

export class QueryNotificationDto extends createZodDto(QueryNotificationSchema) {}

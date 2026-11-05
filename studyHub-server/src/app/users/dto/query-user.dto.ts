import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { UserRole } from '../entities/user.entity'

export const QueryUserSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  // Search keyword for name, email, phone number, address, identity number
  search: z.string().optional(),

  // Role filter
  role: z.nativeEnum(UserRole).optional(),

  // Active filter
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => val === true || val === 'true')
    .optional(),

  // Verified filter
  isVerified: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => val === true || val === 'true')
    .optional(),

  // Sorting
  sortBy: z
    .enum([
      'createdAt',
      'email',
      'displayName',
      'role',
      'isActive',
      'isPro',
      'storageLimit',
      'usedStorage',
      'totalFilesCount',
    ])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export class QueryUserDto extends createZodDto(QueryUserSchema) {}

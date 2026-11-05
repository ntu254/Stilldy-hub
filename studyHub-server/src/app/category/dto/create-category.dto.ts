import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống'),
  description: z.string().optional(),
})

export class CreateCategoryDto extends createZodDto(CreateCategorySchema) {}

import { createZodDto } from 'nestjs-zod'
import { CreateCategorySchema } from './create-category.dto'

export class UpdateCategoryDto extends createZodDto(CreateCategorySchema.partial()) {}

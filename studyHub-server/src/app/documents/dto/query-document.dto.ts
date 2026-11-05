import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const QueryDocumentSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  // Tìm kiếm mờ theo title
  title: z.string().optional(),

  // Lọc theo môn học
  subjectId: z.string().optional(),

  // Tìm kiếm theo tags (nhiều tag phân tách bằng dấu phẩy: "sql,database")
  tags: z
    .union([z.array(z.string()), z.string()])
    .transform((v) => {
      const arr = Array.isArray(v) ? v : v.split(',')
      return arr.map((t) => t.trim()).filter(Boolean)
    })
    .optional(),

  // Lọc theo loại file dựa trên tên file (pdf | docx | png | jpg | xlsx | image)
  // 'image' là alias đặc biệt: khớp cả png + jpg + jpeg cùng lúc (dùng cho frontend filter "Hình ảnh")
  fileType: z.enum(['pdf', 'docx', 'png', 'jpg', 'xlsx', 'image']).optional(),

  // Sắp xếp theo ngày tạo
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  // Trường sắp xếp
  sortBy: z.enum(['createdAt', 'title', 'fileSize']).default('createdAt'),
})

export class QueryDocumentDto extends createZodDto(QueryDocumentSchema) {}

import { api } from '@/lib/api'

export interface Category {
  _id: string
  name: string
}

export const categoryService = {
  /**
   * Lấy toàn bộ danh sách danh mục (môn học)
   */
  getAll: async (): Promise<Category[]> => {
    return api.get<Category[]>('/categories')
  },
}

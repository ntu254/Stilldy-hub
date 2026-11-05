import apiClient from './apiClient'

export interface Category {
  _id: string
  name: string
  description?: string
}

export const categoriesApi = {
  /**
   * Fetch all active categories (subjects) from the backend.
   */
  getCategories: async (): Promise<Category[]> => {
    try {
      const response = await apiClient.get('/categories')
      return response.data.data || []
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải danh sách môn học.'
    }
  },
}

export default categoriesApi

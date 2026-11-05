import apiClient from './apiClient'

export interface CardItem {
  _id: string
  term: string
  definition: string
  markedBy?: string[]
  masteredBy?: string[]
}

export interface FlashcardAuthor {
  _id: string
  displayName: string
  email: string
  avatar?: string | null
}

export interface FlashcardCollection {
  _id: string
  title: string
  description?: string
  createdBy: FlashcardAuthor | string
  isPublic: boolean
  cards: CardItem[]
  totalCards?: number
  viewCount: number
  isDeleted?: boolean
  deletedAt?: string | null
  isOwner?: boolean
  createdAt: string
  updatedAt: string
}

export interface FlashcardPaginatedResponse {
  data: FlashcardCollection[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CreateFlashcardPayload {
  title: string
  description?: string
  isPublic?: boolean
  cards: { term: string; definition: string }[]
}

export interface UpdateFlashcardPayload {
  title?: string
  description?: string
  isPublic?: boolean
  cards?: { term: string; definition: string; _id?: string }[]
}

export interface ToggleMarkResponse {
  marked: boolean
  message: string
}

export const flashcardApi = {
  /**
   * Tạo bộ thẻ ghi nhớ mới
   */
  create: async (payload: CreateFlashcardPayload): Promise<FlashcardCollection> => {
    try {
      const response = await apiClient.post('/flashcards', payload)
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tạo bộ thẻ ghi nhớ mới.'
    }
  },

  /**
   * Lấy danh sách bộ thẻ của tôi
   */
  getMyCollections: async (params?: Record<string, string>): Promise<FlashcardPaginatedResponse> => {
    try {
      const response = await apiClient.get('/flashcards/my-collections', { params })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải danh sách bộ thẻ cá nhân.'
    }
  },

  /**
   * Lấy danh sách bộ thẻ đã xóa mềm (Thùng rác)
   */
  getTrashCollections: async (params?: Record<string, string>): Promise<FlashcardPaginatedResponse> => {
    try {
      const response = await apiClient.get('/flashcards/trash', { params })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải danh sách bộ thẻ trong thùng rác.'
    }
  },

  /**
   * Lấy danh sách bộ thẻ công khai
   */
  getPublicCollections: async (params?: Record<string, string>): Promise<FlashcardPaginatedResponse> => {
    try {
      const response = await apiClient.get('/flashcards/public', { params })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải danh sách bộ thẻ công khai.'
    }
  },

  /**
   * Lấy chi tiết bộ thẻ
   */
  getById: async (id: string): Promise<FlashcardCollection> => {
    try {
      const response = await apiClient.get(`/flashcards/${id}`)
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải chi tiết bộ thẻ.'
    }
  },

  /**
   * Cập nhật bộ thẻ
   */
  update: async (id: string, payload: UpdateFlashcardPayload): Promise<FlashcardCollection> => {
    try {
      const response = await apiClient.put(`/flashcards/${id}`, payload)
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể cập nhật bộ thẻ.'
    }
  },

  /**
   * Xóa mềm bộ thẻ
   */
  remove: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.delete(`/flashcards/${id}`)
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể xóa bộ thẻ.'
    }
  },

  /**
   * Khôi phục bộ thẻ đã xóa mềm
   */
  restore: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.patch(`/flashcards/${id}/restore`)
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể khôi phục bộ thẻ.'
    }
  },

  /**
   * Đánh dấu hoặc hủy đánh dấu thẻ con (Star)
   */
  toggleMarkCard: async (collectionId: string, cardId: string): Promise<ToggleMarkResponse> => {
    try {
      const response = await apiClient.patch(`/flashcards/${collectionId}/cards/${cardId}/mark`)
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể đánh dấu thẻ.'
    }
  },

  /**
   * Xóa một thẻ con
   */
  removeCard: async (collectionId: string, cardId: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.delete(`/flashcards/${collectionId}/cards/${cardId}`)
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể xóa thẻ này.'
    }
  },

  /**
   * Cập nhật trạng thái "Đã biết" của thẻ con (Mastered status)
   */
  updateCardStatus: async (collectionId: string, cardId: string, isMastered: boolean): Promise<any> => {
    try {
      const response = await apiClient.patch(`/flashcards/${collectionId}/cards/${cardId}/status`, { isMastered })
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể cập nhật tiến độ thẻ.'
    }
  },

  /**
   * Đặt lại toàn bộ tiến độ học tập
   */
  resetProgress: async (collectionId: string): Promise<any> => {
    try {
      const response = await apiClient.put(`/flashcards/${collectionId}/reset-progress`)
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể đặt lại tiến độ học tập.'
    }
  },
}

export default flashcardApi

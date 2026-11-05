import { api } from '@/lib/api'
import type {
  FlashcardCollection,
  FlashcardPaginatedResponse,
  CreateFlashcardPayload,
  UpdateFlashcardPayload,
  ToggleMarkResponse,
} from '@/types/flashcard'

export const flashcardService = {
  /**
   * Tạo bộ thẻ ghi nhớ mới
   */
  create: async (payload: CreateFlashcardPayload): Promise<FlashcardCollection> => {
    return api.post<FlashcardCollection>('/flashcards', payload)
  },

  /**
   * Lấy danh sách bộ thẻ của tôi (my-collections)
   */
  getMyCollections: async (params?: Record<string, string>): Promise<FlashcardPaginatedResponse> => {
    return api.get<FlashcardPaginatedResponse>('/flashcards/my-collections', { params })
  },

  /**
   * Lấy danh sách bộ thẻ công khai
   */
  getPublicCollections: async (params?: Record<string, string>): Promise<FlashcardPaginatedResponse> => {
    return api.get<FlashcardPaginatedResponse>('/flashcards/public', { params })
  },

  /**
   * Lấy chi tiết một bộ thẻ (kèm toàn bộ mảng cards)
   */
  getById: async (id: string): Promise<FlashcardCollection> => {
    return api.get<FlashcardCollection>(`/flashcards/${id}`)
  },

  /**
   * Cập nhật toàn bộ bộ thẻ (chỉ tác giả)
   */
  update: async (id: string, payload: UpdateFlashcardPayload): Promise<FlashcardCollection> => {
    return api.put<FlashcardCollection>(`/flashcards/${id}`, payload)
  },

  /**
   * Xóa mềm bộ thẻ (chỉ tác giả)
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/flashcards/${id}`)
  },

  /**
   * Khôi phục bộ thẻ đã xóa mềm (chỉ tác giả)
   */
  restore: async (id: string): Promise<{ message: string }> => {
    return api.patch<{ message: string }>(`/flashcards/${id}/restore`)
  },

  /**
   * Toggle đánh dấu / hủy đánh dấu thẻ con (Star)
   */
  toggleMarkCard: async (collectionId: string, cardId: string): Promise<ToggleMarkResponse> => {
    return api.patch<ToggleMarkResponse>(`/flashcards/${collectionId}/cards/${cardId}/mark`)
  },

  /**
   * Cập nhật nội dung (thủ thuật & định nghĩa) của 1 thẻ con (chỉ tác giả)
   */
  updateCard: async (
    collectionId: string,
    cardId: string,
    payload: { term: string; definition: string }
  ): Promise<any> => {
    return api.patch<any>(`/flashcards/${collectionId}/cards/${cardId}`, payload)
  },

  /**
   * Xóa một thẻ con (chỉ tác giả)
   */
  removeCard: async (collectionId: string, cardId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/flashcards/${collectionId}/cards/${cardId}`)
  },

  /**
   * Cập nhật trạng thái "Đã biết" của thẻ con (Mastered status)
   */
  updateCardStatus: async (collectionId: string, cardId: string, isMastered: boolean): Promise<any> => {
    return api.patch<any>(`/flashcards/${collectionId}/cards/${cardId}/status`, { isMastered })
  },

  /**
   * Đặt lại toàn bộ tiến độ học tập
   */
  resetProgress: async (collectionId: string): Promise<any> => {
    return api.put<any>(`/flashcards/${collectionId}/reset-progress`)
  },
}

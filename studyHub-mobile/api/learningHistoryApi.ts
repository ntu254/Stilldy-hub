import apiClient from './apiClient'

export interface RecordLearningPayload {
  flashcardId: string
  score: number
  totalQuestions: number
  correctAnswers: number
  durationSeconds: number
  mode?: string
  incorrectTerms?: string[]
}

export interface LearningHistory {
  _id: string
  userId: string
  flashcardId: string
  mode: string
  totalQuestions: number
  correctAnswers: number
  score: number
  durationSeconds: number
  incorrectTerms?: string[]
  createdAt: string
  updatedAt: string
}

export interface QueryLearningHistoryParams {
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'score' | 'durationSeconds'
  sortOrder?: 'asc' | 'desc'
  mode?: string
}

export interface LearningHistoryListResponse {
  list: LearningHistory[]
  totalItems: number
  page: number
  limit: number
  totalPages: number
}

const learningHistoryApi = {
  recordResult: async (payload: RecordLearningPayload): Promise<LearningHistory> => {
    try {
      const res = await apiClient.post('/learning-stats/record', payload)
      return res.data?.data || res.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể ghi nhận kết quả kiểm tra.'
    }
  },

  getHistoryByFlashcard: async (
    flashcardId: string,
    params?: QueryLearningHistoryParams
  ): Promise<LearningHistoryListResponse> => {
    try {
      const queryParams: Record<string, string> = {}
      if (params) {
        if (params.page !== undefined) queryParams['page'] = String(params.page)
        if (params.limit !== undefined) queryParams['limit'] = String(params.limit)
        if (params.sortBy) queryParams['sortBy'] = params.sortBy
        if (params.sortOrder) queryParams['sortOrder'] = params.sortOrder
        if (params.mode) queryParams['mode'] = params.mode
      }
      const res = await apiClient.get(
        `/learning-stats/flashcard/${flashcardId}`,
        { params: queryParams }
      )
      return res.data?.data || res.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải lịch sử kiểm tra.'
    }
  },

  getHistoryById: async (historyId: string): Promise<LearningHistory> => {
    try {
      const res = await apiClient.get(`/learning-stats/history/${historyId}`)
      return res.data?.data || res.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải chi tiết lịch sử.'
    }
  },
}

export default learningHistoryApi

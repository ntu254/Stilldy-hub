import { api } from '@/lib/api'
import type {
  LearningHistory,
  LearningHistoryListResponse,
  QueryLearningHistoryParams,
  RecordTestResultPayload,
} from '@/types/learningHistory'

export const learningHistoryService = {
  /**
   * Ghi nhận kết quả bài Kiểm tra
   * POST /learning-stats/record
   */
  recordTestResult: async (payload: RecordTestResultPayload): Promise<LearningHistory> => {
    return api.post<LearningHistory>('/learning-stats/record', payload)
  },

  /**
   * Lấy danh sách lịch sử kiểm tra của một bộ thẻ (có phân trang & sắp xếp)
   * GET /learning-stats/flashcard/:flashcardId
   */
  getHistoriesByFlashcard: async (
    flashcardId: string,
    params?: QueryLearningHistoryParams,
  ): Promise<LearningHistoryListResponse> => {
    // Convert number params to string for URLSearchParams
    const queryParams: Record<string, string> = {}
    if (params) {
      if (params.page !== undefined) queryParams['page'] = String(params.page)
      if (params.limit !== undefined) queryParams['limit'] = String(params.limit)
      if (params.sortBy) queryParams['sortBy'] = params.sortBy
      if (params.sortOrder) queryParams['sortOrder'] = params.sortOrder
      if (params.mode) queryParams['mode'] = params.mode
      if (params.minScore !== undefined) queryParams['minScore'] = String(params.minScore)
      if (params.maxScore !== undefined) queryParams['maxScore'] = String(params.maxScore)
    }
    return api.get<LearningHistoryListResponse>(`/learning-stats/flashcard/${flashcardId}`, {
      params: queryParams,
    })
  },

  /**
   * Lấy chi tiết một lần làm bài cũ
   * GET /learning-stats/history/:historyId
   */
  getHistoryDetail: async (historyId: string): Promise<LearningHistory> => {
    return api.get<LearningHistory>(`/learning-stats/history/${historyId}`)
  },
}

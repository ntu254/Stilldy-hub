// ─── Request Payload ──────────────────────────────────────────────────────
export interface RecordTestResultPayload {
  flashcardId: string
  /** Chế độ học – mặc định 'TEST' */
  mode?: string
  /** Điểm số (%) */
  score: number
  /** Tổng số câu hỏi */
  totalQuestions: number
  /** Số câu đúng */
  correctAnswers: number
  /** Thời gian làm bài (giây) */
  durationSeconds: number
  /** Mảng các card _id mà user trả lời sai */
  incorrectTerms?: string[]
}

// ─── Response Shape ────────────────────────────────────────────────────────
export interface LearningHistory {
  _id: string
  userId: string
  flashcardId: string
  mode: string
  score: number
  totalQuestions: number
  correctAnswers: number
  durationSeconds: number
  incorrectTerms: string[]
  createdAt: string
  updatedAt: string
}

// ─── Paginated list response (matches pagination-util.service.ts format) ──
export interface LearningHistoryListResponse {
  list: LearningHistory[]
  totalPages: number
  totalItems: number
}

// ─── Query params ──────────────────────────────────────────────────────────
export type LearningHistorySortBy =
  | 'createdAt'
  | 'score'
  | 'durationSeconds'
  | 'totalQuestions'
  | 'correctAnswers'

export type SortOrder = 'asc' | 'desc'

export interface QueryLearningHistoryParams {
  page?: number
  limit?: number
  sortBy?: LearningHistorySortBy
  sortOrder?: SortOrder
  mode?: string
  minScore?: number
  maxScore?: number
}

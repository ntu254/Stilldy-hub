// ─── Card Item (sub-document) ─────────────────────────────────────────────
export interface CardItem {
  _id: string
  term: string
  definition: string
  markedBy?: string[]
  masteredBy?: string[]
}

// ─── Author info (populated from User) ────────────────────────────────────
export interface FlashcardAuthor {
  _id: string
  displayName: string
  email: string
  avatar?: string | null
}

// ─── FlashcardCollection (full) ───────────────────────────────────────────
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

// ─── Paginated response ────────────────────────────────────────────────────
export interface FlashcardPaginatedResponse {
  data: FlashcardCollection[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// ─── API Payloads ──────────────────────────────────────────────────────────
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

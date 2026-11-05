import { api } from '@/lib/api'

// ─── Types matching backend ChatSession schema ─────────────────────────────
export interface ChatMessageFromServer {
  sender: 'user' | 'ai'
  textContent: string
  citations: string[]
  createdAt: string
}

export interface ChatSessionFromServer {
  _id: string
  userId: string
  documentIds: string[]
  sessionTitle: string
  isPinned: boolean
  isArchived: boolean
  messages: ChatMessageFromServer[]
  createdAt: string
  updatedAt: string
}

export interface CreateChatSessionPayload {
  sessionTitle?: string
  documentIds?: string[]
}

export interface SendMessagePayload {
  textContent: string
  documentId?: string
}

// ─── Service ────────────────────────────────────────────────────────────────
export const chatSessionService = {
  /**
   * Lấy danh sách tất cả phiên chat của sinh viên hiện tại
   */
  getAll: async (archived?: boolean): Promise<ChatSessionFromServer[]> => {
    const params: Record<string, string> = {}
    if (archived !== undefined) {
      params.archived = String(archived)
    }
    return api.get<ChatSessionFromServer[]>('/chat-sessions', { params })
  },

  /**
   * Lấy chi tiết một phiên chat kèm lịch sử messages
   */
  getById: async (id: string): Promise<ChatSessionFromServer> => {
    return api.get<ChatSessionFromServer>(`/chat-sessions/${id}`)
  },

  /**
   * Khởi tạo phiên chat mới
   */
  create: async (data?: CreateChatSessionPayload): Promise<ChatSessionFromServer> => {
    return api.post<ChatSessionFromServer>('/chat-sessions', data || {})
  },

  /**
   * Gửi tin nhắn vào phiên chat (kích hoạt RAG + AI response)
   */
  sendMessage: async (sessionId: string, data: SendMessagePayload): Promise<ChatSessionFromServer> => {
    return api.post<ChatSessionFromServer>(`/chat-sessions/${sessionId}/messages`, data)
  },

  /**
   * Đổi tên phiên chat
   */
  rename: async (id: string, title: string): Promise<ChatSessionFromServer> => {
    return api.patch<ChatSessionFromServer>(`/chat-sessions/${id}/rename`, { title })
  },

  /**
   * Ghim / Bỏ ghim phiên chat
   */
  pin: async (id: string, isPinned: boolean): Promise<ChatSessionFromServer> => {
    return api.patch<ChatSessionFromServer>(`/chat-sessions/${id}/pin`, { isPinned })
  },

  /**
   * Lưu trữ / Hủy lưu trữ phiên chat
   */
  archive: async (id: string, isArchived: boolean): Promise<ChatSessionFromServer> => {
    return api.patch<ChatSessionFromServer>(`/chat-sessions/${id}/archive`, { isArchived })
  },

  /**
   * Xóa phiên chat
   */
  delete: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/chat-sessions/${id}`)
  },
}

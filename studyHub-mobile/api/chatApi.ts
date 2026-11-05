import apiClient from './apiClient'

export interface ChatMessage {
  _id: string
  role: 'user' | 'assistant' | 'system'
  textContent: string
  documentId?: string
  createdAt: string
}

export interface ChatSession {
  _id: string
  sessionTitle: string
  documentIds: string[]
  isPinned: boolean
  isArchived: boolean
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export const chatApi = {
  /**
   * Create a new RAG AI chat session
   */
  createChatSession: async (sessionTitle?: string, documentIds?: string[]): Promise<ChatSession> => {
    try {
      const response = await apiClient.post('/chat-sessions', { sessionTitle, documentIds })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tạo phiên hội thoại mới.'
    }
  },

  /**
   * Retrieve all chat sessions for the current logged-in user
   */
  getChatSessions: async (archived?: boolean): Promise<ChatSession[]> => {
    try {
      const response = await apiClient.get('/chat-sessions', {
        params: archived !== undefined ? { archived: archived ? 'true' : 'false' } : undefined,
      })
      return response.data.data || []
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải danh sách phiên hội thoại.'
    }
  },

  /**
   * Fetch chat session detail including history of messages
   */
  getChatSessionDetail: async (id: string): Promise<ChatSession> => {
    try {
      const response = await apiClient.get(`/chat-sessions/${id}`)
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải chi tiết phiên hội thoại.'
    }
  },

  /**
   * Send a query message to RAG AI context engine
   */
  sendMessage: async (
    sessionId: string,
    textContent: string,
    documentId?: string,
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> => {
    try {
      const response = await apiClient.post(`/chat-sessions/${sessionId}/messages`, {
        textContent,
        documentId,
      })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Gửi câu hỏi thất bại.'
    }
  },

  /**
   * Rename a chat session
   */
  renameChatSession: async (id: string, title: string): Promise<ChatSession> => {
    try {
      const response = await apiClient.patch(`/chat-sessions/${id}/rename`, { title })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể đổi tên cuộc hội thoại.'
    }
  },

  /**
   * Pin or unpin a chat session
   */
  pinChatSession: async (id: string, isPinned: boolean): Promise<ChatSession> => {
    try {
      const response = await apiClient.patch(`/chat-sessions/${id}/pin`, { isPinned })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể ghim cuộc hội thoại.'
    }
  },

  /**
   * Archive or unarchive a chat session
   */
  archiveChatSession: async (id: string, isArchived: boolean): Promise<ChatSession> => {
    try {
      const response = await apiClient.patch(`/chat-sessions/${id}/archive`, { isArchived })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể lưu trữ cuộc hội thoại.'
    }
  },

  /**
   * Delete a chat session
   */
  deleteChatSession: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.delete(`/chat-sessions/${id}`)
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể xóa cuộc hội thoại.'
    }
  },
}

export default chatApi

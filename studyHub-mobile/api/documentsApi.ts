import apiClient from './apiClient'

export interface QueryDocumentParams {
  page?: number
  limit?: number
  title?: string
  subjectId?: string
  tags?: string
  fileType?: 'pdf' | 'docx' | 'pptx' | 'png' | 'jpg' | 'xlsx'
  sortBy?: 'createdAt' | 'title' | 'fileSize'
  sortOrder?: 'asc' | 'desc'
}

export interface DocumentVersion {
  versionNumber: number
  fileName: string
  fileUrl: string
  fileSize: number
  createdAt: string
}

export interface DocumentInfo {
  _id: string
  title: string
  description?: string
  subjectId?: {
    _id: string
    name: string
  }
  uploadedBy?: {
    _id: string
    fullName: string
    displayName?: string
    email: string
  }
  tags?: string[]
  isPublic: boolean
  versions: DocumentVersion[]
  viewCount: number
  downloadCount: number
  likes: string[]
  dislikes: string[]
  isLikedByUser: boolean
  isDislikedByUser: boolean
  isSavedByUser: boolean
  totalLikes: number
  totalDislikes: number
  createdAt: string
  updatedAt: string
}

export interface DocumentStats {
  totalDocuments: number
  totalStorageUsed: {
    bytes: number
    megaBytes: number
  }
}

export const documentsApi = {
  /**
   * Get public documents list (for browsing)
   */
  getPublicDocuments: async (params?: QueryDocumentParams): Promise<{ data: DocumentInfo[]; meta: any }> => {
    try {
      const response = await apiClient.get('/documents/public', { params })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải danh sách tài liệu công khai.'
    }
  },

  /**
   * Get user's own documents list
   */
  getMyDocuments: async (params?: QueryDocumentParams): Promise<{ data: DocumentInfo[]; meta: any }> => {
    try {
      const response = await apiClient.get('/documents/mine', { params })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải danh sách tài liệu cá nhân.'
    }
  },

  /**
   * Get user's personal storage stats (files uploaded, storage used)
   */
  getDocumentStats: async (): Promise<DocumentStats> => {
    try {
      const response = await apiClient.get('/documents/user/stats')
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải thống kê lưu trữ.'
    }
  },

  /**
   * Get list of bookmarks saved by this user
   */
  getSavedDocuments: async (): Promise<DocumentInfo[]> => {
    try {
      const response = await apiClient.get('/documents/user/saved-list')
      return response.data.data || []
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải danh sách tài liệu đã lưu.'
    }
  },

  /**
   * Get dynamic details of a specific document (increments views)
   */
  getDocumentDetail: async (id: string): Promise<DocumentInfo> => {
    try {
      const response = await apiClient.get(`/documents/${id}`)
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải thông tin chi tiết tài liệu.'
    }
  },

  /**
   * Toggle privacy of a document (only owner)
   */
  updatePrivacy: async (id: string, isPublic: boolean, dmcaAccepted: boolean = true): Promise<DocumentInfo> => {
    try {
      const response = await apiClient.patch(`/documents/${id}/privacy`, { isPublic, dmcaAccepted })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể cập nhật quyền riêng tư.'
    }
  },

  /**
   * Fetch a signed sharing/downloading URL for latest file version
   */
  getShareLink: async (id: string): Promise<{ shareLink: string }> => {
    try {
      const response = await apiClient.get(`/documents/${id}/share-link`)
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể lấy liên kết tải tài liệu.'
    }
  },

  /**
   * Upload a new document record with physical file
   */
  uploadDocument: async (formData: FormData): Promise<DocumentInfo> => {
    try {
      const response = await apiClient.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải lên tài liệu mới.'
    }
  },

  /**
   * Upload a new file version of an existing document record
   */
  uploadNewVersion: async (id: string, formData: FormData): Promise<DocumentInfo> => {
    try {
      const response = await apiClient.post(`/documents/${id}/new-version`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải lên phiên bản mới.'
    }
  },

  /**
   * Update title and description metadata of a document
   */
  updateDocument: async (id: string, data: { title?: string; description?: string }): Promise<DocumentInfo> => {
    try {
      const response = await apiClient.put(`/documents/${id}`, data)
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể cập nhật thông tin tài liệu.'
    }
  },

  /**
   * Soft-delete a document
   */
  deleteDocument: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.delete(`/documents/${id}`)
      return { message: response.data.message || 'Tài liệu đã được xóa.' }
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể xóa tài liệu.'
    }
  },

  /**
   * Submit an academic/content violation report
   */
  reportDocument: async (id: string, reason: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.post(`/documents/${id}/report`, { reason })
      return { message: response.data.message || 'Gửi báo cáo vi phạm thành công.' }
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể gửi báo cáo vi phạm.'
    }
  },

  /**
   * Toggle Like
   */
  toggleLike: async (id: string): Promise<{
    totalLikes: number
    totalDislikes: number
    isLikedByUser: boolean
    isDislikedByUser: boolean
  }> => {
    try {
      const response = await apiClient.post(`/documents/${id}/like`)
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Lỗi khi thích tài liệu.'
    }
  },

  /**
   * Toggle Dislike
   */
  toggleDislike: async (id: string): Promise<{
    totalLikes: number
    totalDislikes: number
    isLikedByUser: boolean
    isDislikedByUser: boolean
  }> => {
    try {
      const response = await apiClient.post(`/documents/${id}/dislike`)
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Lỗi khi phản đối tài liệu.'
    }
  },

  /**
   * Toggle Bookmark Save
   */
  toggleSave: async (id: string): Promise<{ isSaved: boolean; message: string }> => {
    try {
      const response = await apiClient.post(`/documents/${id}/save`)
      return {
        isSaved: response.data.data.isSaved,
        message: response.data.message || 'Lưu tài liệu thành công.',
      }
    } catch (error: any) {
      throw error.response?.data?.message || 'Lỗi khi lưu tài liệu.'
    }
  },

  /**
   * Get direct download url
   */
  getDownloadUrl: (id: string): string => {
    return `${apiClient.defaults.baseURL}/documents/${id}/download`
  },

  /**
   * Get file stream url for rendering (CORS bridge)
   */
  getFileStreamUrl: (id: string): string => {
    return `${apiClient.defaults.baseURL}/documents/${id}/file`
  },

  /**
   * Get document chat conversation history (chatbot collapse)
   */
  getDocumentConversation: async (id: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/documents/${id}/conversation`)
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải lịch sử trò chuyện của tài liệu.'
    }
  },

  /**
   * Send a chatbot message for a specific document context
   */
  sendDocumentMessage: async (id: string, textContent: string): Promise<any> => {
    try {
      const response = await apiClient.post(`/documents/${id}/conversation`, { textContent })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể gửi tin nhắn chatbot tài liệu.'
    }
  },
}

export default documentsApi

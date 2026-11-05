import axios, { type AxiosProgressEvent } from 'axios'
import { api, API_BASE_URL } from '@/lib/api'
import type { UserStats } from '@/types/dashboard'
import type { PaginatedResponse, ServerDocument, ToggleLikeResponse } from '@/types/document'

export const documentService = {
  /**
   * Lấy thông tin thống kê tài liệu của người dùng hiện tại
   */
  getUserStats: async (): Promise<UserStats> => {
    return api.get<UserStats>('/documents/user/stats')
  },

  /**
   * Sinh viên lấy danh sách 4 tài liệu vừa mới tải lên
   */
  getRecentUploaded: async (): Promise<ServerDocument[]> => {
    return api.get<ServerDocument[]>('/documents/user/recent-uploaded')
  },

  /**
   * Lấy danh sách tài liệu cá nhân (phân trang & lọc)
   */
  getMine: async (params?: Record<string, string>): Promise<PaginatedResponse> => {
    return api.get<PaginatedResponse>('/documents/mine', { params })
  },

  /**
   * Lấy thông tin chi tiết một tài liệu theo ID
   */
  getById: async (id: string): Promise<ServerDocument> => {
    return api.get<ServerDocument>(`/documents/${id}`)
  },

  /**
   * Lưu hoặc hủy lưu tài liệu (toggle save)
   */
  save: async (id: string): Promise<{ isSaved: boolean; message: string }> => {
    return api.post<{ isSaved: boolean; message: string }>(`/documents/${id}/save`)
  },

  /**
   * Thích tài liệu (like)
   */
  like: async (id: string): Promise<ToggleLikeResponse> => {
    return api.post<ToggleLikeResponse>(`/documents/${id}/like`)
  },

  /**
   * Không thích tài liệu (dislike)
   */
  dislike: async (id: string): Promise<ToggleLikeResponse> => {
    return api.post<ToggleLikeResponse>(`/documents/${id}/dislike`)
  },

  /**
   * Báo cáo tài liệu vi phạm
   */
  report: async (id: string, reason: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>(`/documents/${id}/report`, { reason })
  },

  /**
   * Thay đổi trạng thái công khai/riêng tư của tài liệu
   */
  updatePrivacy: async (id: string, isPublic: boolean, dmcaAccepted?: boolean): Promise<any> => {
    return api.patch(`/documents/${id}/privacy`, { isPublic, dmcaAccepted })
  },

  /**
   * Lấy liên kết chia sẻ tài liệu
   */
  getShareLink: async (id: string): Promise<{ shareLink: string }> => {
    return api.get<{ shareLink: string }>(`/documents/${id}/share-link`)
  },

  /**
   * Xóa tài liệu theo ID
   */
  delete: async (id: string): Promise<any> => {
    return api.delete(`/documents/${id}`)
  },

  /**
   * Tải xuống tài liệu (trả về blob)
   */
  download: async (id: string): Promise<Blob> => {
    return api.get<Blob>(`/documents/${id}/download`, { responseType: 'blob' })
  },

  /**
   * Cập nhật thông tin tài liệu (tiêu đề & mô tả)
   */
  update: async (
    id: string,
    data: { title: string; description: string }
  ): Promise<any> => {
    return api.put(`/documents/${id}`, data)
  },

  /**
   * Lấy danh sách tài liệu công khai (dành cho Landing Page / Cộng đồng)
   */
  getPublic: async (params?: Record<string, string>): Promise<any> => {
    return api.get<any>('/documents/public', { params })
  },

  /**
   * Tải lên tài liệu mới (sử dụng Axios hỗ trợ theo dõi tiến trình upload thực tế)
   */
  upload: async (
    formData: FormData,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
  ): Promise<any> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.post(`${API_BASE_URL}/documents/upload`, formData, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      withCredentials: true,
      onUploadProgress,
    })

    const json = response.data
    if (json && typeof json === 'object' && 'data' in json) {
      return json.data
    }
    return json
  },

  /**
   * Lấy danh sách tài liệu học tập sinh viên đã bấm lưu (Bookmark)
   */
  getSavedList: async (): Promise<ServerDocument[]> => {
    return api.get<ServerDocument[]>('/documents/user/saved-list')
  },

  /**
   * Lấy lịch sử chat của tài liệu (chatbot collapse)
   */
  getConversation: async (id: string): Promise<any> => {
    return api.get<any>(`/documents/${id}/conversation`)
  },

  /**
   * Gửi tin nhắn chatbot collapse cho tài liệu
   */
  sendMessageConversation: async (id: string, textContent: string): Promise<any> => {
    return api.post<any>(`/documents/${id}/conversation`, { textContent })
  },
}

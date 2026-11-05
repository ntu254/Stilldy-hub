import apiClient, { API_BASE_URL } from './apiClient'
import { io, Socket } from 'socket.io-client'

export interface NotificationItem {
  _id?: string
  id?: string
  type: 'DOCUMENT_DELETED' | 'UPLOAD_BANNED' | 'SUBSCRIPTION_ACTIVATED' | 'SUBSCRIPTION_EXPIRING' | 'REPORT_RESOLVED'
  title: string
  message: string
  isRead: boolean
  metadata?: Record<string, any>
  createdAt: string
}

export interface NotificationResponse {
  data: NotificationItem[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export const notificationsApi = {
  /**
   * Lấy lịch sử thông báo của tôi (có phân trang và lọc trạng thái đọc)
   */
  getNotifications: async (params?: { page?: number; limit?: number; isRead?: boolean }): Promise<NotificationResponse> => {
    try {
      const queryParams: Record<string, string> = {}
      if (params?.page !== undefined) queryParams.page = String(params.page)
      if (params?.limit !== undefined) queryParams.limit = String(params.limit)
      if (params?.isRead !== undefined) queryParams.isRead = String(params.isRead)

      const response = await apiClient.get('/notifications', { params: queryParams })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải danh sách thông báo.'
    }
  },

  /**
   * Đánh dấu các thông báo đã chọn hoặc tất cả là đã đọc
   */
  markAsRead: async (notificationIds?: string[]): Promise<{ message: string; modifiedCount: number }> => {
    try {
      const response = await apiClient.patch('/notifications/read', { notificationIds })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể đánh dấu đã đọc.'
    }
  },

  /**
   * Khởi tạo kết nối Socket.io nhận thông báo thời gian thực từ máy chủ Backend
   */
  initNotificationSocket: (
    userId: string,
    token: string,
    onNewNotification: (notification: NotificationItem) => void
  ): Socket => {
    const socketUrl = API_BASE_URL.replace(/\/api\/?$/, '')

    const socket: Socket = io(socketUrl, {
      query: {
        userId,
        token,
      },
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    })

    socket.on('newNotification', (newNotif: NotificationItem) => {
      onNewNotification(newNotif)
    })

    return socket
  },
}

export default notificationsApi

import { api } from '@/lib/api'
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

export const notificationService = {
  /**
   * Lấy lịch sử thông báo của tôi (có phân trang và lọc trạng thái đọc)
   */
  getNotifications: async (params?: { page?: number; limit?: number; isRead?: boolean }): Promise<NotificationResponse> => {
    const queryParams: Record<string, string> = {}
    if (params?.page !== undefined) queryParams.page = String(params.page)
    if (params?.limit !== undefined) queryParams.limit = String(params.limit)
    if (params?.isRead !== undefined) queryParams.isRead = String(params.isRead)

    return api.get<NotificationResponse>('/notifications', { params: queryParams })
  },

  /**
   * Đánh dấu các thông báo đã được chọn hoặc tất cả thông báo là đã đọc
   */
  markAsRead: async (notificationIds?: string[]): Promise<{ message: string; modifiedCount: number }> => {
    return api.patch<{ message: string; modifiedCount: number }>('/notifications/read', { notificationIds })
  },

  /**
   * Khởi tạo kết nối Socket.io nhận thông báo thời gian thực từ máy chủ Backend
   */
  initNotificationSocket: (
    userId: string,
    token: string,
    onNewNotification: (notification: NotificationItem) => void
  ): Socket => {
    const rawUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888/api'
    const socketUrl = rawUrl.replace(/\/api\/?$/, '')

    const query: Record<string, string> = { token }
    if (userId && userId !== 'undefined') {
      query.userId = userId
    }

    const socket: Socket = io(socketUrl, {
      query,
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

import { api } from '@/lib/api'
import type {
  SubscriptionPlan,
  PurchaseRequest,
  PurchaseResponse,
  PaymentStatusResponse,
  Subscription,
  UpgradePreviewResponse,
} from '@/types/subscription'

export const paymentService = {
  /**
   * Lấy danh sách các gói dịch vụ đang hoạt động (Public)
   */
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    return api.get<SubscriptionPlan[]>('/subscription-plans')
  },

  /**
   * Khởi tạo thanh toán mua gói nâng cấp
   */
  purchasePlan: async (data: PurchaseRequest): Promise<PurchaseResponse> => {
    return api.post<PurchaseResponse>('/subscriptions/purchase', data)
  },

  /**
   * Truy vấn trạng thái một hóa đơn cụ thể (từ hệ thống của mình)
   */
  getPaymentStatus: async (orderCode: number | string): Promise<PaymentStatusResponse> => {
    return api.get<PaymentStatusResponse>(`/subscriptions/status/${orderCode}`)
  },

  /**
   * Lấy lịch sử giao dịch thanh toán của tôi
   */
  getPaymentHistory: async (params?: { page?: number, limit?: number, status?: string }): Promise<{
    data: PaymentStatusResponse[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }> => {
    return api.get('/payments/history', { params })
  },

  /**
   * Lấy thông tin gói đăng ký hiện tại của tôi
   */
  getMySubscription: async (): Promise<Subscription | { activePlan: null }> => {
    return api.get<Subscription | { activePlan: null }>('/subscriptions/my')
  },

  /**
   * Xem trước chi phí nâng cấp gói dịch vụ
   */
  getUpgradePreview: async (planId: string): Promise<UpgradePreviewResponse> => {
    return api.get<UpgradePreviewResponse>(`/subscriptions/upgrade-preview?planId=${planId}`)
  },
}

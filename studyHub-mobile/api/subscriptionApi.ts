import apiClient from './apiClient'

export interface SubscriptionPlan {
  _id: string
  name: string
  price: number
  storageLimit: number
  durationDays: number
  isActive: boolean
  description: string | null
  features: string[]
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}

export interface PurchaseRequest {
  planId: string
  couponCode?: string | null
}

export interface PurchaseResponse {
  checkoutUrl: string
  orderCode: number
}

export interface Subscription {
  _id: string
  userId: string
  planId: SubscriptionPlan | string
  startDate: string
  endDate: string
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'active' | 'cancelled' | 'expired'
  paymentId: string
}

export interface Payment {
  _id: string
  userId: string
  planId: string | SubscriptionPlan
  orderCode: number
  amount: number
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired'
  checkoutUrl: string | null
  payosPaymentId: string | null
  couponCode: string | null
  planName: string
  planPrice: number
  storageLimit: number
  durationDays: number
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export const subscriptionApi = {
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    try {
      const response = await apiClient.get('/subscription-plans')
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể lấy danh sách gói dịch vụ.'
    }
  },

  purchasePlan: async (planId: string): Promise<PurchaseResponse> => {
    try {
      const response = await apiClient.post('/subscriptions/purchase', { planId })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể khởi tạo thanh toán.'
    }
  },

  getMySubscription: async (): Promise<Subscription | { activePlan: null }> => {
    try {
      const response = await apiClient.get('/subscriptions/my')
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể lấy thông tin gói đăng ký hiện tại.'
    }
  },

  getPaymentHistory: async (): Promise<Payment[]> => {
    try {
      const response = await apiClient.get('/payments/history')
      const resData = response.data?.data
      if (resData && Array.isArray(resData.data)) {
        return resData.data
      }
      if (Array.isArray(resData)) {
        return resData
      }
      return []
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể lấy lịch sử giao dịch.'
    }
  },

  // Admin endpoints
  getPlansForAdmin: async (): Promise<SubscriptionPlan[]> => {
    try {
      const response = await apiClient.get('/admin/subscription-plans')
      return response.data.data
    } catch (error: any) {
      const serverMsg = error.response?.data?.errors?.[0]?.message || error.response?.data?.message
      throw serverMsg || 'Không thể lấy toàn bộ gói dịch vụ (Admin).'
    }
  },

  createPlan: async (data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
    try {
      const response = await apiClient.post('/admin/subscription-plans', data)
      return response.data.data
    } catch (error: any) {
      const serverMsg = error.response?.data?.errors?.[0]?.message || error.response?.data?.message
      throw serverMsg || 'Không thể tạo gói mới.'
    }
  },

  updatePlan: async (id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
    try {
      const response = await apiClient.put(`/admin/subscription-plans/${id}`, data)
      return response.data.data
    } catch (error: any) {
      const serverMsg = error.response?.data?.errors?.[0]?.message || error.response?.data?.message
      throw serverMsg || 'Không thể cập nhật gói.'
    }
  },

  deletePlan: async (id: string): Promise<SubscriptionPlan> => {
    try {
      const response = await apiClient.delete(`/admin/subscription-plans/${id}`)
      return response.data.data
    } catch (error: any) {
      const serverMsg = error.response?.data?.errors?.[0]?.message || error.response?.data?.message
      throw serverMsg || 'Không thể xóa/vô hiệu hóa gói.'
    }
  },
}

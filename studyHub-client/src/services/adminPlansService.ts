import { api } from '@/lib/api'
import type { SubscriptionPlan } from '@/types/subscription'

export const adminPlansService = {
  /**
   * Lấy toàn bộ danh sách gói dịch vụ (kể cả gói bị vô hiệu hóa) - Admin
   */
  getPlansForAdmin: async (): Promise<SubscriptionPlan[]> => {
    return api.get<SubscriptionPlan[]>('/admin/subscription-plans')
  },

  /**
   * Tạo gói dịch vụ mới
   */
  createPlan: async (data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
    return api.post<SubscriptionPlan>('/admin/subscription-plans', data)
  },

  /**
   * Cập nhật gói dịch vụ
   */
  updatePlan: async (id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
    return api.put<SubscriptionPlan>(`/admin/subscription-plans/${id}`, data)
  },

  /**
   * Xóa (vô hiệu hóa) gói dịch vụ
   */
  deletePlan: async (id: string): Promise<SubscriptionPlan> => {
    return api.delete<SubscriptionPlan>(`/admin/subscription-plans/${id}`)
  },
}

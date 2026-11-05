import apiClient from './apiClient'

export interface AdminStatsDto {
  users: {
    total: number
    active: number
    inactive: number
  }
  documents: {
    totalFiles: number
    totalReported: number
    totalCloudSizeInMb: number
  }
}

export interface ReportedDocInfo {
  _id: string
  title: string
  description?: string
  isReported: boolean
  isPublic?: boolean
  viewCount: number
  downloadCount: number
  uploadedBy?: {
    _id: string
    displayName: string
    email: string
  }
  versions: Array<{
    versionNumber: number
    fileName: string
    fileSize: number
    fileUrl: string
    createdAt: string
  }>
  updatedAt: string
}

export interface DocumentReport {
  _id: string
  documentId: string
  reason: string
  reportedBy: {
    _id: string
    displayName: string
    email: string
    avatar?: string
  }
  status: string
  createdAt: string
  updatedAt: string
}

export interface ReportedDocsResponse {
  items: ReportedDocInfo[]
  meta: {
    totalItems: number
    totalPages: number
    currentPage: number
  }
}

export interface UserManagementInfo {
  _id: string
  email: string
  displayName: string
  avatar?: string | null
  role: string
  isActive: boolean
  createdAt: string
  publicFilesCount?: number
  privateFilesCount?: number
  reportedFilesCount?: number
  totalFilesCount?: number
  usedStorage?: number
  storageLimit?: number
}

export interface UsersResponse {
  list: UserManagementInfo[]
  totalPages: number
  totalItems: number
}

export const adminApi = {
  /**
   * Get dashboard metrics and stats
   */
  getDashboardStats: async (): Promise<AdminStatsDto> => {
    try {
      const response = await apiClient.get('/admin/dashboard/stats')
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể lấy thông tin thống kê Dashboard.'
    }
  },

  getReportedDocs: async (page = 1, limit = 10, search = ''): Promise<ReportedDocsResponse> => {
    try {
      const response = await apiClient.get('/admin/documents/reported', {
        params: { page, limit, search },
      })
      return {
        items: response.data.data?.data || [],
        meta: {
          totalItems: response.data.data?.meta?.total || 0,
          totalPages: response.data.data?.meta?.totalPages || 0,
          currentPage: response.data.data?.meta?.page || 1,
        }
      }
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể lấy danh sách tài liệu bị báo cáo.'
    }
  },

  /**
   * Dismiss document reports (unflag)
   */
  rejectDocReport: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.patch(`/admin/documents/${id}/reject-report`)
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể bác bỏ báo cáo vi phạm.'
    }
  },

  /**
   * Supreme delete document (removes from db and firebase cloud storage)
   */
  deleteViolatedDoc: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.delete(`/admin/documents/${id}`)
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể xóa tài liệu vi phạm.'
    }
  },

  /**
   * Lấy danh sách báo cáo vi phạm của một tài liệu
   */
  getDocumentReports: async (id: string): Promise<DocumentReport[]> => {
    try {
      const response = await apiClient.get(`/admin/documents/${id}/reports`)
      return response.data.data ?? response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể lấy danh sách báo cáo.'
    }
  },

  /**
   * Phê duyệt xử lý tài liệu vi phạm (Giữ lại hoặc Xóa)
   */
  moderateDocument: async (id: string, action: 'KEEP' | 'DELETE'): Promise<{ message: string }> => {
    try {
      const response = await apiClient.post(`/admin/moderate-document/${id}`, { action })
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể xử lý tài liệu.'
    }
  },

  /**
   * Get all registered users list (Admin only)
   */
  getUsers: async (page = 1, limit = 10, search = '', isActive?: boolean): Promise<UsersResponse> => {
    try {
      const response = await apiClient.get('/users', {
        params: {
          page,
          limit,
          search: search || undefined,
          isActive: isActive !== undefined ? String(isActive) : undefined,
        }
      })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể lấy danh sách thành viên.'
    }
  },

  /**
   * Get user detailed information and stats (Admin only)
   */
  getUserDetails: async (id: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/users/${id}`)
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải chi tiết người dùng.'
    }
  },

  /**
   * Ban user by ID (deactivate)
   */
  banUser: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.patch(`/admin/users/${id}/ban`)
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể khóa tài khoản thành viên.'
    }
  },

  /**
   * Unban user by ID (reactivate)
   */
  unbanUser: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.patch(`/admin/users/${id}/unban`)
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể mở khóa tài khoản thành viên.'
    }
  },

  /**
   * Get list of all documents with search and pagination (Admin only)
   */
  getAllDocs: async (page = 1, limit = 10, search = ''): Promise<ReportedDocsResponse> => {
    try {
      const response = await apiClient.get('/admin/documents', {
        params: { page, limit, search },
      })
      return {
        items: response.data.data?.data || [],
        meta: {
          totalItems: response.data.data?.meta?.total || 0,
          totalPages: response.data.data?.meta?.totalPages || 0,
          currentPage: response.data.data?.meta?.page || 1,
        }
      }
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể lấy danh sách tài liệu hệ thống.'
    }
  },

  /**
   * Get list of all platform payments (Admin only)
   */
  getAllPayments: async (page = 1, limit = 10, search = '', status = ''): Promise<PaginatedAdminPayments> => {
    try {
      const response = await apiClient.get('/admin/payments', {
        params: {
          page,
          limit,
          search: search || undefined,
          status: status !== 'all' && status ? status : undefined,
        }
      })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể lấy lịch sử giao dịch toàn hệ thống.'
    }
  },

  /**
   * Get overall payment transaction metrics (Admin only)
   */
  getPaymentStats: async (): Promise<PaymentStatsResponse> => {
    try {
      const response = await apiClient.get('/admin/payments/stats')
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể lấy thống kê doanh thu.'
    }
  },

  /**
   * Get all platform system settings (Admin only)
   */
  getSettings: async (): Promise<{ message: string; data: SystemSetting[] }> => {
    try {
      const response = await apiClient.get('/admin/settings')
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể lấy cấu hình hệ thống.'
    }
  },

  /**
   * Update system settings (Admin only)
   */
  updateSettings: async (dto: UpdateSettingsDto): Promise<{ message: string; data: any }> => {
    try {
      const response = await apiClient.patch('/admin/settings', dto)
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể cập nhật cấu hình hệ thống.'
    }
  },
}

export interface SystemSetting {
  _id?: string
  key: string
  value: number
  description: string
  createdAt?: string
  updatedAt?: string
}

export interface UpdateSettingsDto {
  paymentExpiryMins?: number
  subscriptionGracePeriodDays?: number
  bannedUserGracePeriodDays?: number
}

export interface AdminPaymentItem {
  _id: string
  userId: {
    _id: string
    displayName: string
    email: string
  }
  planId: string
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

export interface PaginatedAdminPayments {
  data: AdminPaymentItem[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface PaymentStatsResponse {
  overview: {
    totalTransactions: number
    totalRevenue: number
    successfulTransactions: number
    pendingTransactions: number
    failedTransactions: number
    cancelledTransactions: number
    expiredTransactions: number
    successRate: number
  }
}

export default adminApi

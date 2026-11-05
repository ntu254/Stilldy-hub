import { api } from '@/lib/api'

export interface DashboardStats {
  users: {
    total: number
    active: number
    inactive: number
  }
  documents: {
    totalFiles: number
    publicFiles: number
    privateFiles: number
    reportedFiles: number
    totalReported: number
    totalCloudSizeInMb: number
  }
}

// ─── Admin Settings ────────────────────────────────────────────────────────

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


// ─── Admin Document List ───────────────────────────────────────────────────

export interface AdminDocumentVersion {
  versionNumber: number
  fileName: string
  fileUrl: string
  fileSize: number
  createdAt: string
}

export interface AdminDocument {
  _id: string
  title: string
  description: string
  subjectId: string
  tags: string[]
  uploadedBy: {
    _id: string
    displayName: string
    email: string
  } | null
  isPublic: boolean
  viewCount: number
  downloadCount: number
  versions: AdminDocumentVersion[]
  createdAt: string
  updatedAt: string
  isReported: boolean
  _destroy?: boolean
}

export interface PaginatedAdminDocuments {
  data: AdminDocument[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface QueryAdminDocumentsParams {
  page?: number
  limit?: number
  search?: string
  subjectId?: string
  isPublic?: string // 'true' | 'false'
  isReported?: string // 'true' | 'false'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ─── Reported Document (legacy) ────────────────────────────────────────────

export interface ReportedDocument {
  _id: string
  title: string
  description: string
  subjectId: string
  tags: string[]
  uploadedBy: {
    _id: string
    displayName: string
    email: string
  } | null
  isPublic: boolean
  viewCount: number
  downloadCount: number
  versions: {
    versionNumber: number
    fileName: string
    fileUrl: string
    fileSize: number
    createdAt: string
  }[]
  createdAt: string
  updatedAt: string
  isReported: boolean
}

export interface PaginatedReportedDocuments {
  data: ReportedDocument[]
  meta: {
    totalItems?: number
    totalPages: number
    currentPage?: number
    total?: number
  }
}

export interface QueryReportedDocumentsParams {
  page?: number
  limit?: number
  search?: string
  subjectId?: string
  isPublic?: boolean | string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ─── Admin Payments ────────────────────────────────────────────────────────

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

export interface QueryAdminPaymentsParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaymentStatsResponse {
  overview: {
    totalTransactions: number
    totalRevenue: number
    expectedRevenue: number
    successfulTransactions: number
    pendingTransactions: number
    failedTransactions: number
    cancelledTransactions: number
    expiredTransactions: number
    successRate: number
  }
  plans: {
    planName: string
    totalCount: number
    purchasesCount: number
    revenue: number
  }[]
  timeline: {
    date: string
    revenue: number
    expectedRevenue: number
    totalTransactions: number
    successfulTransactions: number
  }[]
}

export interface QueryPaymentStatsParams {
  startDate?: string
  endDate?: string
  groupBy?: 'day' | 'month'
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

export const adminService = {
  /**
   * Lấy số liệu thống kê tổng quan của trang Dashboard Admin
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    return api.get<DashboardStats>('/admin/dashboard/stats')
  },

  /**
   * Lấy toàn bộ danh sách tài liệu (có tìm kiếm, lọc, sắp xếp, phân trang)
   * GET /api/admin/documents
   */
  getAllDocuments: async (params?: QueryAdminDocumentsParams): Promise<PaginatedAdminDocuments> => {
    const queryParams: Record<string, string> = {}
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams[key] = String(value)
        }
      })
    }
    return api.get<PaginatedAdminDocuments>('/admin/documents', { params: queryParams })
  },

  /**
   * Xóa mềm tài liệu – chỉ chuyển _destroy thành true (không xóa trên Cloud)
   * DELETE /api/documents/{id}
   */
  softDeleteDocument: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/documents/${id}`)
  },

  /**
   * Xóa vĩnh viễn tài liệu khỏi DB lẫn Firebase Cloud Storage
   * DELETE /api/admin/documents/{id}
   */
  hardDeleteDocument: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/admin/documents/${id}`)
  },

  /**
   * Lấy danh sách tài liệu bị báo cáo vi phạm
   */
  getReportedDocuments: async (params?: QueryReportedDocumentsParams): Promise<PaginatedReportedDocuments> => {
    const queryParams: Record<string, string> = {}
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams[key] = String(value)
        }
      })
    }
    return api.get<PaginatedReportedDocuments>('/admin/documents/reported', { params: queryParams })
  },

  /**
   * Phê duyệt xử lý tài liệu vi phạm (Giữ lại hoặc Xóa)
   * POST /admin/moderate-document/:id
   */
  moderateDocument: async (id: string, action: 'KEEP' | 'DELETE'): Promise<{ message: string }> => {
    return api.post<{ message: string }>(`/admin/moderate-document/${id}`, { action })
  },

  /**
   * Bác bỏ báo cáo (giữ lại tài liệu sạch)
   * @deprecated dùng moderateDocument(id, 'KEEP') thay thế
   */
  rejectReport: async (id: string): Promise<{ message: string }> => {
    return api.patch<{ message: string }>(`/admin/documents/${id}/reject-report`)
  },

  /**
   * Lấy danh sách các báo cáo vi phạm của một tài liệu
   */
  getDocumentReports: async (id: string): Promise<DocumentReport[]> => {
    return api.get<DocumentReport[]>(`/admin/documents/${id}/reports`)
  },

  /**
   * @deprecated dùng hardDeleteDocument thay thế
   * Thực thi lệnh xóa vĩnh viễn tài liệu vi phạm khỏi DB và Cloud Storage
   */
  deleteViolatedDoc: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/admin/documents/${id}`)
  },

  /**
   * Nâng cấp tài khoản sinh viên lên Pro
   */
  upgradeUserToPro: async (id: string): Promise<{ message: string; data: any }> => {
    return api.patch<{ message: string; data: any }>(`/admin/users/${id}/upgrade-pro`)
  },

  /**
   * Hạ cấp tài khoản sinh viên về Free
   */
  downgradeUserToFree: async (id: string): Promise<{ message: string; data: any }> => {
    return api.patch<{ message: string; data: any }>(`/admin/users/${id}/downgrade-free`)
  },

  /**
   * Lấy toàn bộ danh sách lịch sử giao dịch toàn hệ thống
   * GET /api/admin/payments
   */
  getAllPayments: async (params?: QueryAdminPaymentsParams): Promise<PaginatedAdminPayments> => {
    const queryParams: Record<string, string> = {}
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams[key] = String(value)
        }
      })
    }
    return api.get<PaginatedAdminPayments>('/admin/payments', { params: queryParams })
  },

  /**
   * Lấy số liệu thống kê giao dịch
   * GET /api/admin/payments/stats
   */
  getPaymentStats: async (params?: QueryPaymentStatsParams): Promise<PaymentStatsResponse> => {
    const queryParams: Record<string, string> = {}
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams[key] = String(value)
        }
      })
    }
    return api.get<PaymentStatsResponse>('/admin/payments/stats', { params: queryParams })
  },

  /**
   * Lấy toàn bộ cấu hình hệ thống
   * GET /api/admin/settings
   */
  getSettings: async (): Promise<{ message: string; data: SystemSetting[] }> => {
    return api.get<{ message: string; data: SystemSetting[] }>('/admin/settings')
  },

  /**
   * Cập nhật cấu hình hệ thống
   * PATCH /api/admin/settings
   */
  updateSettings: async (dto: UpdateSettingsDto): Promise<{ message: string; data: any }> => {
    return api.patch<{ message: string; data: any }>('/admin/settings', dto)
  },
}

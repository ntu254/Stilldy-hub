import { api } from '@/lib/api'

export interface User {
  _id: string
  email: string
  displayName: string
  phoneNumber?: string
  identityNumber?: string
  gender?: string | null
  dateOfBirth?: string | null
  address?: string | null
  avatar?: string | null
  role: 'guest' | 'user' | 'admin'
  isActive: boolean
  isVerified: boolean
  isPro?: boolean
  storageLimit?: number
  usedStorage?: number
  createdAt: string
  updatedAt: string
}

export interface QueryUserParams {
  page?: number
  limit?: number
  search?: string
  role?: string
  isActive?: boolean | string
  isVerified?: boolean | string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedUsers {
  list: User[]
  totalPages: number
  totalItems: number
}

export const userService = {
  /**
   * Lấy danh sách thành viên (có phân trang, tìm kiếm, lọc)
   */
  getUsers: async (params?: QueryUserParams): Promise<PaginatedUsers> => {
    const queryParams: Record<string, string> = {}
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams[key] = String(value)
        }
      })
    }
    return api.get<PaginatedUsers>('/users', { params: queryParams })
  },

  /**
   * Khóa tài khoản thành viên
   */
  banUser: async (id: string): Promise<User> => {
    return api.patch<User>(`/admin/users/${id}/ban`)
  },

  /**
   * Mở khóa tài khoản thành viên
   */
  unbanUser: async (id: string): Promise<User> => {
    return api.patch<User>(`/admin/users/${id}/unban`)
  },

  /**
   * Lấy chi tiết tài khoản thành viên kèm thống kê tài liệu
   */
  getUserDetails: async (id: string): Promise<any> => {
    return api.get<any>(`/users/${id}`)
  },
}

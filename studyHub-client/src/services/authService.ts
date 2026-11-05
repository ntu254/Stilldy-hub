import { api } from '@/lib/api'
import type { UserProfile } from '@/contexts/AuthContext'

export const authService = {
  /**
   * Lấy thông tin tài khoản hiện tại
   */
  getProfile: async (): Promise<UserProfile> => {
    return api.get<UserProfile>('/users/me')
  },

  /**
   * Đăng nhập tài khoản
   */
  signIn: async (data: any): Promise<{ accessToken: string; refreshToken: string }> => {
    return api.post<{ accessToken: string; refreshToken: string }>('/auth/sign-in', data)
  },

  /**
   * Đăng nhập bằng Google (ID Token)
   */
  googleSignIn: async (idToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    return api.post<{ accessToken: string; refreshToken: string }>('/auth/google', { idToken })
  },

  /**
   * Đăng ký tài khoản mới
   */
  signUp: async (data: any): Promise<any> => {
    return api.post<any>('/auth/sign-up', data)
  },

  /**
   * Đăng xuất
   */
  logout: async (): Promise<any> => {
    return api.get<any>('/auth/logout')
  },

  /**
   * Yêu cầu quên mật khẩu
   */
  forgotPassword: async (data: any): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/auth/forgot-password', data)
  },

  /**
   * Đặt lại mật khẩu mới bằng token
   */
  resetPassword: async (data: any, params: { token: string }): Promise<{ message: string }> => {
    return api.post<{ message: string }>(`/auth/reset-password`, data, { params })
  },

  /**
   * Cập nhật thông tin tài khoản cá nhân
   */
  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    return api.patch<UserProfile>('/users/me', data)
  },

  /**
   * Đổi mật khẩu tài khoản
   */
  changePassword: async (data: any): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/auth/change-password', data)
  },

  /**
   * Cập nhật ảnh đại diện
   */
  updateAvatar: async (file: File): Promise<{ message: string; avatar: string; user: UserProfile }> => {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.request<{ message: string; avatar: string; user: UserProfile }>('/users/me/avatar', {
      method: 'PATCH',
      body: formData,
    })
  },
}

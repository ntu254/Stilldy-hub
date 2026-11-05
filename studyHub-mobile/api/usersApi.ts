import apiClient from './apiClient'

export interface UpdateProfileDto {
  displayName?: string
  email?: string
  phoneNumber?: string
  identityNumber?: string
  gender?: 'male' | 'female' | 'other' | null
  address?: string | null
  dateOfBirth?: string | null
  avatar?: string | null
}

export const usersApi = {
  /**
   * Get current logged-in user profile details
   */
  getProfile: async () => {
    try {
      const response = await apiClient.get('/users/me')
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể tải thông tin cá nhân.'
    }
  },

  /**
   * Update profile information
   */
  updateProfile: async (data: UpdateProfileDto) => {
    try {
      const response = await apiClient.patch('/users/me', data)
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể cập nhật thông tin cá nhân.'
    }
  },

  /**
   * Change user account password
   */
  changePassword: async (oldPassword: string, newPassword: string) => {
    try {
      const response = await apiClient.post('/auth/change-password', {
        oldPassword,
        newPassword,
      })
      return response.data.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Không thể đổi mật khẩu.'
    }
  },
}

export default usersApi

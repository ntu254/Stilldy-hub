import axios from 'axios'

const API_URL = 'http://localhost:3000/api/auth'

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  // Try to get token from AsyncStorage in future if needed
  return config
})

export const authService = {
  login: async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/login', { email, password })
      if (response.data.token) {
        // In real app, save to AsyncStorage
        // await AsyncStorage.setItem('authToken', response.data.token)
      }
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Login failed'
    }
  },

  register: async (name: string, email: string, password: string) => {
    try {
      const response = await apiClient.post('/register', { name, email, password })
      if (response.data.token) {
        // await AsyncStorage.setItem('authToken', response.data.token)
      }
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Registration failed'
    }
  },

  resetPassword: async (email: string) => {
    try {
      const response = await apiClient.post('/reset-password', { email })
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Reset password failed'
    }
  },

  checkAuth: async (token: string) => {
    try {
      const response = await apiClient.get('/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.data
    } catch (error: any) {
      throw error.response?.data?.message || 'Auth check failed'
    }
  },
}

export default authService

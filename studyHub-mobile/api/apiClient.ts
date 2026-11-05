import axios from 'axios'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

// Dynamic resolution of host IP address for local development (supports physical devices over Wi-Fi and emulators)
const debuggerHost = Constants.expoConfig?.hostUri
const ip = debuggerHost ? debuggerHost.split(':')[0] : (Platform.OS === 'android' ? '10.0.2.2' : 'localhost')
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${ip}:8888/api`

console.log('[API Client] Resolving API Base URL:', API_BASE_URL)

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to dynamically attach the Redux auth token if it exists
apiClient.interceptors.request.use(
  (config) => {
    try {
      // Lazy-load store to avoid circular dependency loop: apiClient -> store -> authSlice -> apiClient
      const { store } = require('../redux/store')
      const token = store.getState().auth?.token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.warn('[API Client] Interceptor was unable to load auth token:', error)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default apiClient

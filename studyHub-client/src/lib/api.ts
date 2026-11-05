export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888/api'

/**
 * Trả về URL đầy đủ đến API bằng cách kết hợp API_BASE_URL với endpoint path.
 */
export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${cleanPath}`
}

interface RequestOptions extends RequestInit {
  params?: Record<string, any>
  _retry?: boolean
  responseType?: 'json' | 'blob'
}

class ApiClient {
  private isRefreshing = false
  private refreshSubscribers: ((token: string | null) => void)[] = []

  private addRefreshSubscriber(callback: (token: string | null) => void) {
    this.refreshSubscribers.push(callback)
  }

  private onTokenRefreshed(token: string | null) {
    this.refreshSubscribers.forEach((cb) => cb(token))
    this.refreshSubscribers = []
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers, _retry, ...restOptions } = options
    
    // Construct query parameters
    let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    if (params) {
      const query = new URLSearchParams(params).toString()
      url += `?${query}`
    }

    // Default Headers
    const defaultHeaders: Record<string, string> = {}
    if (!(restOptions.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json'
    }

    // Attach Authorization header if token exists in Redux store or localStorage
    const reduxStore = (await import('@/redux/store')).store
    const token = reduxStore.getState().auth.accessToken || localStorage.getItem('accessToken')
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`
    }

    const config: RequestInit = {
      ...restOptions,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
      // Ensure cross-origin cookies are sent for refresh/logout cookies
      credentials: 'include',
    }

    try {
      const response = await fetch(url, config)

      // Handle 401/419 Unauthorized or Token Expired
      if (
        (response.status === 401 || response.status === 419) &&
        !options._retry &&
        !endpoint.includes('/auth/refresh-token') &&
        !endpoint.includes('/auth/sign-in')
      ) {
        options._retry = true
        return this.handleUnauthorized<T>(endpoint, options)
      }

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { message: 'Có lỗi xảy ra trên hệ thống.' }
        }

        let errorMessage = 'Có lỗi xảy ra trên hệ thống.'
        if (errorData) {
          if (Array.isArray(errorData.errors) && errorData.errors.length > 0 && errorData.errors[0]?.message) {
            errorMessage = errorData.errors[0].message
          } else if (errorData.message && errorData.message !== 'ERROR') {
            errorMessage = errorData.message
          }
        }
        throw new Error(errorMessage)
      }

      // Check for empty body / NoContent
      if (response.status === 204) {
        return {} as T
      }

      if (options.responseType === 'blob') {
        const blob = await response.blob()
        return blob as unknown as T
      }

      const json = await response.json()
      // Unwrap NestJS Standard API Format: { errors: any, data: T, message: string }
      if (json && typeof json === 'object' && 'data' in json) {
        if (json.data && typeof json.data === 'object') {
          if ('message' in json && json.message) {
            ;(json.data as any).message = json.message
          }
          return json.data as T
        }
        if (!json.data && 'message' in json && json.message) {
          return { message: json.message } as unknown as T
        }
        return json.data as T
      }
      return json as T
    } catch (error) {
      throw error
    }
  }

  private async handleUnauthorized<T>(endpoint: string, options: RequestOptions): Promise<T> {
    if (this.isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        this.addRefreshSubscriber(async (token) => {
          if (!token) {
            return reject(new Error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.'))
          }
          if (!options.headers) options.headers = {}
          ;(options.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
          this.request<T>(endpoint, options).then(resolve).catch(reject)
        })
      })
    }

    this.isRefreshing = true

    try {
      // Call endpoint to refresh token
      // Note: NestJS reads the refresh token from cookies, which will be automatically passed because of credentials: 'include'
      const refreshResult = await this.request<{ accessToken: string; refreshToken: string }>('/auth/refresh-token', {
        method: 'GET',
      })

      // Dispatch tokens to Redux store
      const { store } = await import('@/redux/store')
      const { setTokens } = await import('@/redux/slices/authSlice')
      store.dispatch(setTokens({
        accessToken: refreshResult.accessToken,
        refreshToken: refreshResult.refreshToken
      }))

      this.isRefreshing = false
      this.onTokenRefreshed(refreshResult.accessToken)

      // Retry original request with new token
      if (!options.headers) options.headers = {}
      ;(options.headers as Record<string, string>)['Authorization'] = `Bearer ${refreshResult.accessToken}`
      return this.request<T>(endpoint, options)
    } catch (error) {
      this.isRefreshing = false
      this.onTokenRefreshed(null)
      
      // Dispatch clearAuth to Redux store
      const { store } = await import('@/redux/store')
      const { clearAuth } = await import('@/redux/slices/authSlice')
      store.dispatch(clearAuth())

      // Custom event to notify the application to redirect to /login
      window.dispatchEvent(new Event('auth_logout'))
      throw new Error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.')
    }
  }

  get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  post<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  put<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  patch<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const api = new ApiClient()

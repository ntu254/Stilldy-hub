import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import apiClient from '../api/apiClient'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string | null
  role?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  isAuthenticated: false,
}

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      // 1. Gọi API đăng nhập để lấy token
      const response = await apiClient.post('/auth/sign-in', { email, password })
      const { accessToken } = response.data.data

      // 2. Lấy thông tin chi tiết của user hiện tại từ /users/me
      const userResponse = await apiClient.get('/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      return {
        token: accessToken,
        user: {
          id: userResponse.data.data._id || userResponse.data.data.id,
          email: userResponse.data.data.email,
          name: userResponse.data.data.displayName || userResponse.data.data.name || userResponse.data.data.email.split('@')[0],
          avatar: userResponse.data.data.avatar || null,
          role: userResponse.data.data.role || 'user',
        },
      }
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập!'
      )
    }
  },
)

export const loginWithGoogle = createAsyncThunk(
  'auth/loginWithGoogle',
  async (idToken: string, { rejectWithValue }) => {
    try {
      // 1. Gọi API đăng nhập Google để lấy token
      const response = await apiClient.post('/auth/google', { idToken })
      const { accessToken } = response.data.data

      // 2. Lấy thông tin chi tiết của user hiện tại từ /users/me
      const userResponse = await apiClient.get('/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      return {
        token: accessToken,
        user: {
          id: userResponse.data.data._id || userResponse.data.data.id,
          email: userResponse.data.data.email,
          name: userResponse.data.data.displayName || userResponse.data.data.name || userResponse.data.data.email.split('@')[0],
          avatar: userResponse.data.data.avatar || null,
          role: userResponse.data.data.role || 'user',
        },
      }
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại!'
      )
    }
  },
)


export const register = createAsyncThunk(
  'auth/register',
  async ({ name, email, password }: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      // Chỉ gọi API đăng ký tài khoản mới, không tự động đăng nhập
      const response = await apiClient.post('/auth/sign-up', {
        email,
        password,
        displayName: name,
      })
      return response.data?.data || null
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Đăng ký tài khoản thất bại!')
    }
  },
)

export const checkAuth = createAsyncThunk('auth/checkAuth', async (token: string, { rejectWithValue }) => {
  try {
    const response = await apiClient.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return {
      user: {
        id: response.data.data._id || response.data.data.id,
        email: response.data.data.email,
        name: response.data.data.displayName || response.data.data.name,
        avatar: response.data.data.avatar || null,
        role: response.data.data.role || 'user',
      },
      token,
    }
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Phiên đăng nhập hết hạn')
  }
})

export const resetPassword = createAsyncThunk('auth/resetPassword', async (email: string, { rejectWithValue }) => {
  try {
    const response = await apiClient.post('/auth/forgot-password', { email })
    return response.data.data
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Yêu cầu đặt lại mật khẩu thất bại!')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      // Gọi API logout chạy ngầm để xóa cookie trên server nếu cần
      apiClient.get('/auth/logout').catch(() => null)
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
    },
    updateUser: (state, action) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
        }
      }
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder.addCase(login.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false
      state.token = action.payload.token
      state.user = action.payload.user
      state.isAuthenticated = true
    })
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
      state.isAuthenticated = false
    })

    builder.addCase(loginWithGoogle.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(loginWithGoogle.fulfilled, (state, action) => {
      state.loading = false
      state.token = action.payload.token
      state.user = action.payload.user
      state.isAuthenticated = true
    })
    builder.addCase(loginWithGoogle.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
      state.isAuthenticated = false
    })

    builder.addCase(register.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(register.fulfilled, (state) => {
      state.loading = false
      state.isAuthenticated = false
    })
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
      state.isAuthenticated = false
    })

    builder.addCase(checkAuth.pending, (state) => {
      state.loading = true
    })
    builder.addCase(checkAuth.fulfilled, (state, action) => {
      state.loading = false
      state.token = action.payload.token
      state.user = action.payload.user
      state.isAuthenticated = true
    })
    builder.addCase(checkAuth.rejected, (state) => {
      state.loading = false
      state.isAuthenticated = false
    })

    builder.addCase(resetPassword.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(resetPassword.fulfilled, (state) => {
      state.loading = false
    })
    builder.addCase(resetPassword.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })
  },
})

export const { logout, clearError, updateUser } = authSlice.actions
export default authSlice.reducer

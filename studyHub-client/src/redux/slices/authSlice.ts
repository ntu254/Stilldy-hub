import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { authService } from '@/services/authService'
import { paymentService } from '@/services/paymentService'
import type { UserProfile } from '@/contexts/AuthContext'
import type { Subscription } from '@/types/subscription'

interface AuthState {
  user: UserProfile | null
  currentSubscription: Subscription | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Initial state loaded from localStorage
const storedToken = localStorage.getItem('accessToken')
const storedRefreshToken = localStorage.getItem('refreshToken')
const storedUserStr = localStorage.getItem('user')

let initialUser: UserProfile | null = null
if (storedUserStr && storedUserStr !== 'undefined') {
  try {
    initialUser = JSON.parse(storedUserStr)
  } catch {
    initialUser = null
  }
}

const initialState: AuthState = {
  user: initialUser,
  currentSubscription: null,
  accessToken: storedToken && storedToken !== 'undefined' ? storedToken : null,
  refreshToken: storedRefreshToken && storedRefreshToken !== 'undefined' ? storedRefreshToken : null,
  isAuthenticated: !!initialUser,
  isLoading: false,
}

// Async Thunks
export const fetchProfileThunk = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const profile = await authService.getProfile()
      localStorage.setItem('user', JSON.stringify(profile))
      return profile
    } catch (error: any) {
      return rejectWithValue(error.message || 'Lấy thông tin profile thất bại')
    }
  }
)

export const fetchSubscriptionThunk = createAsyncThunk(
  'auth/fetchSubscription',
  async (_, { rejectWithValue }) => {
    try {
      const subData = await paymentService.getMySubscription()
      if (subData && 'activePlan' in subData === false && (subData as Subscription).status === 'active') {
        return subData as Subscription
      }
      return null
    } catch (error: any) {
      return rejectWithValue(error.message || 'Lấy thông tin gói cước thất bại')
    }
  }
)

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { dispatch, rejectWithValue }) => {
    try {
      const response = await authService.signIn(credentials)
      
      // Save tokens to localStorage
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)
      
      dispatch(setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      }))

      // Fetch profile data
      const profile = await dispatch(fetchProfileThunk()).unwrap()
      // Fetch subscription data
      await dispatch(fetchSubscriptionThunk()).unwrap()
      return profile
    } catch (error: any) {
      dispatch(clearAuth())
      return rejectWithValue(error.message || 'Đăng nhập thất bại')
    }
  }
)

export const loginWithGoogleThunk = createAsyncThunk(
  'auth/loginWithGoogle',
  async (idToken: string, { dispatch, rejectWithValue }) => {
    try {
      const response = await authService.googleSignIn(idToken)

      // Save tokens to localStorage
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)

      dispatch(setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      }))

      // Fetch profile data
      const profile = await dispatch(fetchProfileThunk()).unwrap()
      // Fetch subscription data
      await dispatch(fetchSubscriptionThunk()).unwrap()
      return profile
    } catch (error: any) {
      dispatch(clearAuth())
      return rejectWithValue(error.message || 'Đăng nhập Google thất bại')
    }
  }
)


export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    try {
      await authService.logout()
    } catch {
      // Proceed with local logout regardless of API response
    } finally {
      dispatch(clearAuth())
    }
  }
)

export const updateProfileThunk = createAsyncThunk(
  'auth/updateProfile',
  async (data: Partial<UserProfile>, { rejectWithValue }) => {
    try {
      const updated = await authService.updateProfile(data)
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    } catch (error: any) {
      return rejectWithValue(error.message || 'Cập nhật thông tin thất bại')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      localStorage.setItem('accessToken', action.payload.accessToken)
      localStorage.setItem('refreshToken', action.payload.refreshToken)
    },
    updateUser(state, action: PayloadAction<UserProfile>) {
      state.user = action.payload
      state.isAuthenticated = true
      localStorage.setItem('user', JSON.stringify(action.payload))
    },
    clearAuth(state) {
      state.user = null
      state.currentSubscription = null
      state.accessToken = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.isLoading = false
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    },
  },
  extraReducers: (builder) => {
    // loginThunk
    builder.addCase(loginThunk.pending, (state) => {
      state.isLoading = true
    })
    builder.addCase(loginThunk.fulfilled, (state, action) => {
      state.user = action.payload
      state.isAuthenticated = true
      state.isLoading = false
    })
    builder.addCase(loginThunk.rejected, (state) => {
      state.isLoading = false
    })

    // loginWithGoogleThunk
    builder.addCase(loginWithGoogleThunk.pending, (state) => {
      state.isLoading = true
    })
    builder.addCase(loginWithGoogleThunk.fulfilled, (state, action) => {
      state.user = action.payload
      state.isAuthenticated = true
      state.isLoading = false
    })
    builder.addCase(loginWithGoogleThunk.rejected, (state) => {
      state.isLoading = false
    })


    // fetchProfileThunk
    builder.addCase(fetchProfileThunk.fulfilled, (state, action) => {
      state.user = action.payload
      state.isAuthenticated = true
    })

    // logoutThunk
    builder.addCase(logoutThunk.pending, (state) => {
      state.isLoading = true
    })
    builder.addCase(logoutThunk.fulfilled, (state) => {
      state.isLoading = false
    })
    builder.addCase(logoutThunk.rejected, (state) => {
      state.isLoading = false
    })

    // updateProfileThunk
    builder.addCase(updateProfileThunk.fulfilled, (state, action) => {
      state.user = action.payload
    })

    // fetchSubscriptionThunk
    builder.addCase(fetchSubscriptionThunk.fulfilled, (state, action) => {
      state.currentSubscription = action.payload
    })
    builder.addCase(fetchSubscriptionThunk.rejected, (state) => {
      state.currentSubscription = null
    })
  },
})

export const { setTokens, updateUser, clearAuth } = authSlice.actions
export default authSlice.reducer

import * as React from 'react'
import { authService } from '@/services/authService'
import { useAppDispatch, useAppSelector } from '@/redux/store'
import {
  clearAuth,
  fetchProfileThunk,
  fetchSubscriptionThunk,
  loginThunk,
  loginWithGoogleThunk,
  logoutThunk,
  updateProfileThunk,
} from '@/redux/slices/authSlice'

export interface UserProfile {
  createdAt: any
  id: string
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
  willDeleteDataAt?: string | null
  bannedDataDeletionAt?: string | null
}

interface AuthContextType {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<UserProfile>
  loginWithGoogle: (idToken: string) => Promise<UserProfile>
  register: (fullName: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<{ message: string }>
  resetPassword: (token: string, newPassword: string) => Promise<{ message: string }>
  updateProfile: (data: Partial<UserProfile>) => Promise<UserProfile>
  updateAvatar: (file: File) => Promise<{ message: string; avatar: string; user: UserProfile }>
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ message: string }>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const isLoadingState = useAppSelector((state) => state.auth.isLoading)
  const [isInitializing, setIsInitializing] = React.useState(true)

  // Initialization check
  React.useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken')
      if (token && token !== 'undefined') {
        try {
          // Verify & fetch fresh profile in background
          await dispatch(fetchProfileThunk()).unwrap()
          // Fetch subscription concurrently or after profile
          await dispatch(fetchSubscriptionThunk()).unwrap()
        } catch {
          // If silent fetch fails, clearAuth handles logout if tokens invalid
        }
      }
      setIsInitializing(false)
    }

    initAuth()

    // Listen to global auth_logout event triggered from API client
    const handleGlobalLogout = () => {
      dispatch(clearAuth())
    }
    window.addEventListener('auth_logout', handleGlobalLogout)

    return () => {
      window.removeEventListener('auth_logout', handleGlobalLogout)
    }
  }, [dispatch])

  const login = async (email: string, password: string) => {
    return await dispatch(loginThunk({ email, password })).unwrap()
  }

  const loginWithGoogle = async (idToken: string) => {
    return await dispatch(loginWithGoogleThunk(idToken)).unwrap()
  }

  const register = async (fullName: string, email: string, password: string) => {
    await authService.signUp({
      email,
      password,
      displayName: fullName,
    })
  }

  const logout = async () => {
    await dispatch(logoutThunk()).unwrap()
  }

  const forgotPassword = async (email: string) => {
    return await authService.forgotPassword({ email })
  }

  const resetPassword = async (token: string, newPassword: string) => {
    return await authService.resetPassword({
      newPassword,
    }, { token })
  }

  const updateProfile = async (data: Partial<UserProfile>) => {
    return await dispatch(updateProfileThunk(data)).unwrap()
  }

  const updateAvatar = async (file: File) => {
    const response = await authService.updateAvatar(file)
    // Sau khi update avatar thành công, fetch lại profile để đồng bộ Redux store
    await dispatch(fetchProfileThunk()).unwrap()
    return response
  }

  const changePassword = async (oldPassword: string, newPassword: string) => {
    return await authService.changePassword({
      oldPassword,
      newPassword,
    })
  }

  const value = React.useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading: isInitializing || isLoadingState,
      login,
      loginWithGoogle,
      register,
      logout,
      forgotPassword,
      resetPassword,
      updateProfile,
      updateAvatar,
      changePassword,
    }),
    [user, isAuthenticated, isInitializing, isLoadingState]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

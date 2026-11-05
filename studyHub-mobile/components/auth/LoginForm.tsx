import React, { useState, useEffect } from 'react'
import { TextInput, Pressable, View, Text, ActivityIndicator, Keyboard } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon } from 'lucide-react-native'
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'
import Svg, { Path } from 'react-native-svg'
import { login, loginWithGoogle } from '../../redux/authSlice'
import { AppDispatch, RootState } from '../../redux/store'
import { useToast } from '../../components/ui/ToastProvider'


interface LoginFormProps {
  onNavigateToForgot: () => void
  onNavigateToRegister: () => void
}

export default function LoginForm({ onNavigateToForgot, onNavigateToRegister }: LoginFormProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { loading } = useSelector((state: RootState) => state.auth)
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    const resolvedClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '278813085423-jh6g37pjps4tcmthvd4d7famqhvu2891.apps.googleusercontent.com'
    console.log('[Google Signin] Configuring with webClientId:', resolvedClientId)
    GoogleSignin.configure({
      webClientId: resolvedClientId,
      offlineAccess: false,
    })
  }, [])

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true)
      await GoogleSignin.hasPlayServices()
      try {
        await GoogleSignin.signOut()
      } catch (err) {
        // Ignored if user was not signed in
      }
      const response = await GoogleSignin.signIn()
      const res = response as any
      const idToken = res.data?.idToken || res.idToken
      if (!idToken) {
        throw new Error('Không lấy được Google ID Token từ thiết bị')
      }

      const result = await dispatch(loginWithGoogle(idToken))
      if (loginWithGoogle.fulfilled.match(result)) {
        toast.success('Đăng nhập bằng Google thành công!')
      } else if (loginWithGoogle.rejected.match(result)) {
        toast.error(String(result.payload ?? 'Đăng nhập Google thất bại'))
      }
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        toast.error('Đăng nhập bị hủy')
      } else if (err.code === statusCodes.IN_PROGRESS) {
        toast.error('Đang xử lý đăng nhập...')
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        toast.error('Thiết bị không hỗ trợ Google Play Services')
      } else {
        toast.error('Lỗi: ' + (err.message || String(err)))
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  // State quản lý lỗi của từng ô
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const handleLogin = async () => {
    let valid = true
    let newErrors: { email?: string; password?: string } = {}

    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) {
      newErrors.email = 'Email không được để trống'
      valid = false
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Định dạng email không hợp lệ'
      valid = false
    }

    // Validate Mật khẩu
    if (!password) {
      newErrors.password = 'Mật khẩu không được để trống'
      valid = false
    }

    setErrors(newErrors)

    if (valid) {
      try {
        const result = await dispatch(login({ email, password }))

if (login.fulfilled.match(result)) {
  Keyboard.dismiss()

  // Test
  await new Promise(resolve => setTimeout(resolve, 1000))

  toast.success('Đăng nhập thành công!')

  setEmail('')
  setPassword('')
} else if (login.rejected.match(result)) {
          toast.error(String(result.payload ?? 'Đăng nhập thất bại'))
        }
      } catch (err) {
        toast.error('Lỗi: ' + String(err))
      }
    }
  }

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Email</Text>
        <View
          style={{
            flexDirection: 'row',
            borderWidth: 1,
            borderColor: errors.email ? '#EF4444' : '#E2E8F0', // 🟢 Đổi sang viền Đỏ nếu có lỗi
            borderRadius: 16,
            backgroundColor: '#F8FAFC',
            paddingHorizontal: 16,
            alignItems: 'center',
            height: 56,
          }}
        >
          <MailIcon color={errors.email ? '#EF4444' : '#94A3B8'} size={20} />
          <TextInput
            placeholder='name@example.com'
            placeholderTextColor='#94A3B8'
            value={email}
            onChangeText={(text) => {
              setEmail(text)
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined })) // Xóa chữ lỗi khi user gõ lại
            }}
            keyboardType='email-address'
            autoCapitalize='none'
            style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#0F172A', paddingVertical: 0 }}
          />
        </View>
        {errors.email && (
          <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.email}</Text>
        )}
      </View>

      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569' }}>Mật khẩu</Text>
          <Pressable onPress={onNavigateToForgot}>
            <Text style={{ fontSize: 13, color: '#475569', fontWeight: '500' }}>Quên mật khẩu?</Text>
          </Pressable>
        </View>
        <View
          style={{
            flexDirection: 'row',
            borderWidth: 1,
            borderColor: errors.password ? '#EF4444' : '#E2E8F0', // 🟢 Đổi sang viền Đỏ nếu có lỗi
            borderRadius: 16,
            backgroundColor: '#F8FAFC',
            paddingHorizontal: 16,
            alignItems: 'center',
            height: 56,
          }}
        >
          <LockIcon color={errors.password ? '#EF4444' : '#94A3B8'} size={20} />
          <TextInput
            placeholder='••••••••'
            placeholderTextColor='#94A3B8'
            value={password}
            onChangeText={(text) => {
              setPassword(text)
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
            }}
            secureTextEntry={!showPassword}
            autoCapitalize='none'
            style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#0F172A', paddingVertical: 0 }}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOffIcon color='#94A3B8' size={20} /> : <EyeIcon color='#94A3B8' size={20} />}
          </Pressable>
        </View>
        {errors.password && (
          <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.password}</Text>
        )}
      </View>

      <Pressable onPress={handleLogin} disabled={loading || googleLoading} style={{ marginTop: 8 }}>
        <View
          style={{
            backgroundColor: (loading || googleLoading) ? '#64748B' : '#0F172A',
            height: 56,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: (loading || googleLoading) ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator size='small' color='#FFFFFF' />
          ) : (
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Đăng nhập  →</Text>
          )}
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
        <Text style={{ marginHorizontal: 16, fontSize: 12, color: '#94A3B8', fontWeight: '600', letterSpacing: 1 }}>HOẶC</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
      </View>

      <Pressable onPress={handleGoogleLogin} disabled={loading || googleLoading}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            height: 56,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            opacity: (loading || googleLoading) ? 0.7 : 1,
          }}
        >
          {googleLoading ? (
            <ActivityIndicator size='small' color='#0F172A' />
          ) : (
            <>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.58 14.97 1 12 1 7.35 1 3.37 3.68 1.48 7.58l3.77 2.92C6.13 7.07 8.87 5.04 12 5.04z"
                />
                <Path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.58h6.43c-.28 1.47-1.11 2.72-2.36 3.56l3.68 2.85c2.15-1.98 3.38-4.89 3.38-8.65z"
                />
                <Path
                  fill="#FBBC05"
                  d="M5.25 14.75a7.16 7.16 0 0 1 0-5.5L1.48 6.33a11.95 11.95 0 0 0 0 11.34l3.77-2.92z"
                />
                <Path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.68-2.85c-1.1.74-2.52 1.18-4.28 1.18-3.13 0-5.87-2.03-6.82-5.06L1.4 16.27C3.3 20.27 7.32 23 12 23z"
                />
              </Svg>
              <Text style={{ color: '#334155', fontWeight: '600', fontSize: 15 }}>Đăng nhập bằng Google</Text>
            </>
          )}
        </View>
      </Pressable>


      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '500' }}>Chưa có tài khoản? </Text>
        <Pressable onPress={onNavigateToRegister}>
          <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '700' }}>Đăng ký ngay</Text>
        </Pressable>
      </View>

    </View>
  )
}

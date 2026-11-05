import React, { useState, useEffect } from 'react'
import { TextInput, Pressable, View, Text, ActivityIndicator, Keyboard } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { MailIcon, CheckCircleIcon } from 'lucide-react-native'
import { resetPassword } from '../../redux/authSlice'
import { AppDispatch, RootState } from '../../redux/store'
import { useToast } from '../../components/ui/ToastProvider'

interface ForgotPasswordProps {
  onBackToLogin: () => void
}

export default function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { loading } = useSelector((state: RootState) => state.auth)
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleForgot = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('Vui lòng nhập Email tài khoản để khôi phục')
      return
    } else if (!emailRegex.test(cleanEmail)) {
      setError('Định dạng email nhập vào không đúng')
      return
    }

    setError(undefined)
    try {
      const result = await dispatch(resetPassword(cleanEmail))
      if (resetPassword.fulfilled.match(result)) {
        Keyboard.dismiss()
        setIsSubmitted(true)
        setCountdown(60)
        toast.success('Hệ thống đã gửi liên kết đặt lại mật khẩu vào email của bạn!')
      } else if (resetPassword.rejected.match(result)) {
        toast.error(String(result.payload ?? 'Gửi email thất bại'))
      }
    } catch (err) {
      toast.error('Lỗi: ' + String(err))
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || loading) return
    try {
      const result = await dispatch(resetPassword(email.trim()))
      if (resetPassword.fulfilled.match(result)) {
        setCountdown(60)
        toast.success('Đã gửi lại liên kết thành công!')
      } else if (resetPassword.rejected.match(result)) {
        toast.error(String(result.payload ?? 'Gửi lại email thất bại'))
      }
    } catch (err) {
      toast.error('Lỗi: ' + String(err))
    }
  }

  return (
    <View style={{ width: '100%', gap: 20 }}>
      {!isSubmitted ? (
        <>
          <View style={{ width: '100%' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Email</Text>
            <View
              style={{
                flexDirection: 'row',
                borderWidth: 1,
                borderColor: error ? '#EF4444' : '#E2E8F0',
                borderRadius: 16,
                backgroundColor: '#F8FAFC',
                paddingHorizontal: 16,
                alignItems: 'center',
                height: 56,
                width: '100%',
              }}
            >
              <MailIcon color={error ? '#EF4444' : '#94A3B8'} size={20} />
              <TextInput
                placeholder='name@example.com'
                placeholderTextColor='#94A3B8'
                value={email}
                onChangeText={(text) => {
                  setEmail(text)
                  if (error) setError(undefined) // Xóa lỗi khi gõ ký tự mới
                }}
                keyboardType='email-address'
                autoCapitalize='none'
                style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#0F172A', paddingVertical: 0 }}
              />
            </View>
            {error && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{error}</Text>}
          </View>

          <Pressable onPress={handleForgot} disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            <View
              style={{
                backgroundColor: loading ? '#64748B' : '#0F172A',
                height: 56,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator size='small' color='#FFFFFF' />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Gửi link đặt lại  ✈</Text>
              )}
            </View>
          </Pressable>

          <Pressable onPress={onBackToLogin} style={{ alignSelf: 'center', marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#64748B', fontSize: 15, fontWeight: '500' }}>← </Text>
              <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 15 }}>Quay lại đăng nhập</Text>
            </View>
          </Pressable>
        </>
      ) : (
        /* Success State */
        <View style={{ width: '100%', gap: 16, alignItems: 'center' }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: '#ECFDF5',
              borderWidth: 1,
              borderColor: '#A7F3D0',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            <CheckCircleIcon color='#059669' size={28} />
          </View>

          <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
            Kiểm tra hộp thư email
          </Text>

          <Text style={{ fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 20 }}>
            Chúng tôi đã gửi hướng dẫn và link khôi phục mật khẩu đến{' '}
            <Text style={{ fontWeight: '600', color: '#0F172A' }}>{email}</Text>.
          </Text>

          <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18, marginTop: 4 }}>
            Vui lòng kiểm tra kỹ cả thư mục Spam / Thư rác nếu bạn không thấy email trong hộp thư đến.
          </Text>

          <Pressable
            onPress={handleResend}
            disabled={countdown > 0 || loading}
            style={{ width: '100%', marginTop: 12 }}
          >
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                height: 56,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                opacity: (countdown > 0 || loading) ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator size='small' color='#0F172A' />
              ) : (
                <Text style={{ color: '#0F172A', fontWeight: '600', fontSize: 15 }}>
                  {countdown > 0 ? `Gửi lại sau (${countdown}s)` : 'Gửi lại email'}
                </Text>
              )}
            </View>
          </Pressable>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '100%',
              marginTop: 16,
              paddingHorizontal: 4,
            }}
          >
            <Pressable onPress={() => setIsSubmitted(false)}>
              <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' }}>
                Nhập email khác
              </Text>
            </Pressable>

            <Pressable onPress={onBackToLogin}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 14 }}>Đăng nhập</Text>
                <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '700' }}> →</Text>
              </View>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

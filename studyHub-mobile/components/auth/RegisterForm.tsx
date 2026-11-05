import React, { useState } from 'react'
import { TextInput, Pressable, View, Text, ActivityIndicator, Keyboard } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { MailIcon, LockIcon, UserIcon, EyeIcon, EyeOffIcon } from 'lucide-react-native'
import { register } from '../../redux/authSlice'
import { AppDispatch, RootState } from '../../redux/store'
import { useToast } from '../../components/ui/ToastProvider'

interface RegisterFormProps {
  onNavigateToLogin: () => void
}

export default function RegisterForm({ onNavigateToLogin }: RegisterFormProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { loading } = useSelector((state: RootState) => state.auth)
  const toast = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // State quản lý lỗi
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>(
    {},
  )

  const handleRegister = async () => {
    let valid = true
    let newErrors: typeof errors = {}

    // Validate Họ tên
    if (!name.trim()) {
      newErrors.name = 'Họ và tên không được để trống'
      valid = false
    }

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
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải chứa ít nhất 6 ký tự'
      valid = false
    }

    // Validate Xác nhận mật khẩu
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận lại mật khẩu'
      valid = false
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp'
      valid = false
    }

    setErrors(newErrors)

    if (valid) {
      setIsSubmitting(true)
      try {
        const result = await dispatch(register({ name, email, password }))
        if (register.fulfilled.match(result)) {
          Keyboard.dismiss()
          toast.success('Đăng ký thành công, vui lòng đăng nhập!')
          setName('')
          setEmail('')
          setPassword('')
          setConfirmPassword('')
          setTimeout(() => {
            onNavigateToLogin()
            setIsSubmitting(false)
          }, 5000)
        } else if (register.rejected.match(result)) {
          toast.error(String(result.payload ?? 'Đăng ký thất bại'))
          setIsSubmitting(false)
        }
      } catch (err) {
        toast.error('Lỗi: ' + String(err))
        setIsSubmitting(false)
      }
    }
  }

  return (
    <View style={{ width: '100%', gap: 16 }}>
      <View style={{ width: '100%' }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Họ và tên</Text>
        <View
          style={{
            flexDirection: 'row',
            borderWidth: 1,
            borderColor: errors.name ? '#EF4444' : '#E2E8F0',
            borderRadius: 16,
            backgroundColor: '#F8FAFC',
            paddingHorizontal: 16,
            alignItems: 'center',
            height: 56,
            width: '100%',
          }}
        >
          <UserIcon color={errors.name ? '#EF4444' : '#94A3B8'} size={20} />
          <TextInput
            placeholder='Nguyễn Văn A'
            placeholderTextColor='#94A3B8'
            value={name}
            onChangeText={(text) => {
              setName(text)
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
            }}
            style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#0F172A', paddingVertical: 0 }}
          />
        </View>
        {errors.name && (
          <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.name}</Text>
        )}
      </View>

      <View style={{ width: '100%' }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Email</Text>
        <View
          style={{
            flexDirection: 'row',
            borderWidth: 1,
            borderColor: errors.email ? '#EF4444' : '#E2E8F0',
            borderRadius: 16,
            backgroundColor: '#F8FAFC',
            paddingHorizontal: 16,
            alignItems: 'center',
            height: 56,
            width: '100%',
          }}
        >
          <MailIcon color={errors.email ? '#EF4444' : '#94A3B8'} size={20} />
          <TextInput
            placeholder='name@example.com'
            placeholderTextColor='#94A3B8'
            value={email}
            onChangeText={(text) => {
              setEmail(text)
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
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

      <View style={{ width: '100%' }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Mật khẩu</Text>
        <View
          style={{
            flexDirection: 'row',
            borderWidth: 1,
            borderColor: errors.password ? '#EF4444' : '#E2E8F0',
            borderRadius: 16,
            backgroundColor: '#F8FAFC',
            paddingHorizontal: 16,
            alignItems: 'center',
            height: 56,
            width: '100%',
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

      <View style={{ width: '100%' }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Xác nhận mật khẩu</Text>
        <View
          style={{
            flexDirection: 'row',
            borderWidth: 1,
            borderColor: errors.confirmPassword ? '#EF4444' : '#E2E8F0',
            borderRadius: 16,
            backgroundColor: '#F8FAFC',
            paddingHorizontal: 16,
            alignItems: 'center',
            height: 56,
            width: '100%',
          }}
        >
          <LockIcon color={errors.confirmPassword ? '#EF4444' : '#94A3B8'} size={20} />
          <TextInput
            placeholder='••••••••'
            placeholderTextColor='#94A3B8'
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text)
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
            }}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize='none'
            style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#0F172A', paddingVertical: 0 }}
          />
          <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            {showConfirmPassword ? <EyeOffIcon color='#94A3B8' size={20} /> : <EyeIcon color='#94A3B8' size={20} />}
          </Pressable>
        </View>
        {errors.confirmPassword && (
          <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.confirmPassword}</Text>
        )}
      </View>

      <Pressable onPress={handleRegister} disabled={isSubmitting} style={{ marginTop: 8, width: '100%' }}>
        <View
          style={{
            backgroundColor: isSubmitting ? '#64748B' : '#0F172A',
            height: 56,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator size='small' color='#FFFFFF' />
          ) : (
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Đăng ký  →</Text>
          )}
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '500' }}>Đã có tài khoản? </Text>
        <Pressable onPress={onNavigateToLogin}>
          <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '700' }}>Đăng nhập</Text>
        </Pressable>
      </View>

    </View>
  )
}

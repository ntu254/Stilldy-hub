import React, { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { ArrowLeft, Save, ShieldCheck, Eye, EyeOff } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import { usersApi } from '../../api/usersApi'
import { useToast } from '../../components/ui/ToastProvider'

export default function ChangePasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const toast = useToast()

  // States for inputs
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Validation States
  const [errors, setErrors] = useState<{
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }>({})

  // UI States
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    let valid = true
    const newErrors: {
      currentPassword?: string
      newPassword?: string
      confirmPassword?: string
    } = {}

    if (!currentPassword.trim()) {
      newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.'
      valid = false
    }
    if (!newPassword.trim()) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới.'
      valid = false
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có tối thiểu 6 ký tự.'
      valid = false
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
      valid = false
    }

    setErrors(newErrors)

    if (!valid) return

    setSaving(true)
    try {
      await usersApi.changePassword(currentPassword, newPassword)
      toast.success('Đổi mật khẩu thành công!')
      navigation.goBack()
    } catch (err: any) {
      toast.error(err.toString() || 'Đổi mật khẩu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScreenShell>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 220 }}
      >
        <View
          style={{
            backgroundColor: '#0F172A',
            borderRadius: 32,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#111827',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#334155',
              }}
            >
              <ArrowLeft color='#FFFFFF' size={18} />
            </Pressable>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '700' }}>Bảo mật</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginTop: 4 }}>
                Thay đổi mật khẩu
              </Text>
            </View>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#111827',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#334155',
              }}
            >
              <ShieldCheck color='#FFFFFF' size={18} />
            </View>
          </View>
        </View>

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 32,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            padding: 18,
            shadowColor: '#0F172A',
            shadowOpacity: 0.05,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 2,
          }}
        >
          <View style={{ gap: 14 }}>
            <PasswordField
              label="Mật khẩu hiện tại"
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text)
                if (errors.currentPassword) setErrors((prev) => ({ ...prev, currentPassword: undefined }))
              }}
              placeholder="Nhập mật khẩu hiện tại"
              error={errors.currentPassword}
            />

            <PasswordField
              label="Mật khẩu mới"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text)
                if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }))
              }}
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              error={errors.newPassword}
            />

            <PasswordField
              label="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text)
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
              }}
              placeholder="Xác nhận lại mật khẩu mới"
              error={errors.confirmPassword}
            />
          </View>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={{
              marginTop: 24,
              backgroundColor: saving ? '#94A3B8' : '#0F172A',
              borderRadius: 20,
              height: 54,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 10,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save color="#FFFFFF" size={18} />
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Cập nhật mật khẩu</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ScreenShell>
  )
}

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  error?: string
}) {
  const [secure, setSecure] = useState(true)

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: error ? '#EF4444' : '#64748B', fontSize: 13, fontWeight: '700' }}>{label}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 52,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: error ? '#EF4444' : '#E2E8F0',
          backgroundColor: '#F8FAFC',
          paddingHorizontal: 14,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secure}
          style={{
            flex: 1,
            color: '#0F172A',
            fontSize: 15,
            paddingVertical: 0,
          }}
        />
        <Pressable onPress={() => setSecure(!secure)} style={{ padding: 4 }}>
          {secure ? (
            <EyeOff color="#94A3B8" size={20} />
          ) : (
            <Eye color="#94A3B8" size={20} />
          )}
        </Pressable>
      </View>
      {error ? (
        <Text style={{ color: '#EF4444', fontSize: 12, marginTop: -2, marginLeft: 4 }}>{error}</Text>
      ) : null}
    </View>
  )
}

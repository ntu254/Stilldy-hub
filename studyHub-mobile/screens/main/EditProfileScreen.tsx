import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View, Modal, Platform } from 'react-native'
import { ArrowLeft, Save, UserPen, Camera, Image as ImageIcon, X, Calendar } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as ImagePicker from 'expo-image-picker'
import DateTimePicker from '@react-native-community/datetimepicker'

import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import type { RootState, AppDispatch } from '../../redux/store'
import { updateUser } from '../../redux/authSlice'
import { usersApi } from '../../api/usersApi'
import { useToast } from '../../components/ui/ToastProvider'

// Cấu hình Cloudinary (điền thông tin của bạn từ Cloudinary dashboard)
// Cần tạo một "Unsigned Upload Preset" trong Settings -> Upload -> Upload Presets
const CLOUDINARY_CLOUD_NAME = 'djfr51v2j'
const CLOUDINARY_UPLOAD_PRESET = 'studyHub-avatar'

const uploadToCloudinary = async (uri: string): Promise<string> => {
  const data = new FormData()
  
  const filename = uri.split('/').pop() || 'avatar.jpg'
  const match = /\.(\w+)$/.exec(filename)
  const type = match ? `image/${match[1]}` : 'image/jpeg'

  data.append('file', {
    uri: uri,
    name: filename,
    type: type,
  } as any)
  
  data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: data,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'multipart/form-data',
    },
  })

  if (!response.ok) {
    const errorResult = await response.json().catch(() => null)
    const errorMsg = errorResult?.error?.message || response.statusText || 'Unknown error'
    throw new Error(errorMsg)
  }

  const responseJson = await response.json()
  return responseJson.secure_url
}

export default function EditProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const dispatch = useDispatch<AppDispatch>()
  const user = useSelector((state: RootState) => state.auth.user)
  const toast = useToast()

  // Fields
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState('')
  const [identityNumber, setIdentityNumber] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null)
  const [dob, setDob] = useState('') // Hiển thị ngày sinh YYYY-MM-DD
  const [address, setAddress] = useState('')
  
  // Datepicker states
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dateVal, setDateVal] = useState<Date>(new Date(2000, 0, 1))

  // Avatar states
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar || null)
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null)

  // UI States
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarModalVisible, setAvatarModalVisible] = useState(false)

  useEffect(() => {
    let active = true
    async function loadLatestProfile() {
      setLoading(true)
      try {
        const profile = await usersApi.getProfile()
        if (active) {
          setName(profile.displayName || profile.name || '')
          setEmail(profile.email || '')
          setPhone(profile.phoneNumber || '')
          setIdentityNumber(profile.identityNumber || '')
          setGender(profile.gender || null)
          setAddress(profile.address || '')
          if (profile.avatar) {
            setAvatarUri(profile.avatar)
          }

          // Format ISO date sang YYYY-MM-DD và set Date object
          if (profile.dateOfBirth) {
            const dateObj = new Date(profile.dateOfBirth)
            if (!isNaN(dateObj.getTime())) {
              setDateVal(dateObj)
              const yyyy = dateObj.getFullYear()
              const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
              const dd = String(dateObj.getDate()).padStart(2, '0')
              setDob(`${yyyy}-${mm}-${dd}`)
            }
          }
        }
      } catch (err: any) {
        console.warn('Could not load detailed user profile:', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadLatestProfile()
    return () => {
      active = false
    }
  }, [])

  // Chọn ảnh hoặc chụp ảnh đại diện
  const handleSelectAvatar = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        // Yêu cầu quyền Máy ảnh khi chụp trực tiếp
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync()
        if (!cameraPermission.granted) {
          setAvatarModalVisible(false)
          toast.warning('Vui lòng cấp quyền sử dụng Máy ảnh trong cài đặt thiết bị để chụp ảnh.')
          return
        }
      } else {
        // Yêu cầu quyền truy cập thư viện ảnh
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!libraryPermission.granted) {
          setAvatarModalVisible(false)
          toast.warning('Vui lòng cấp quyền truy cập Thư viện ảnh trong cài đặt thiết bị để chọn ảnh.')
          return
        }
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8, // Chất lượng tốt hơn khi lưu qua Cloudinary
      }

      let result;
      try {
        result = useCamera
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions)
      } catch (pickerErr: any) {
        console.warn('Image picker error with editing, trying fallback without editing:', pickerErr)
        const fallbackOptions = { ...pickerOptions, allowsEditing: false }
        result = useCamera
          ? await ImagePicker.launchCameraAsync(fallbackOptions)
          : await ImagePicker.launchImageLibraryAsync(fallbackOptions)
      }

      // Đóng modal sau khi đã kết thúc cuộc gọi chọn ảnh hệ thống (thành công hoặc hủy)
      setAvatarModalVisible(false)

      if (result.canceled) return

      const asset = result.assets?.[0]
      if (asset) {
        setAvatarUri(asset.uri)
        setNewAvatarUri(asset.uri)
      }
    } catch (error: any) {
      setAvatarModalVisible(false)
      console.warn('Error picking image:', error)
      toast.error('Lỗi thiết bị: ' + (error?.message || 'Không thể mở trình chọn ảnh.'))
    }
  }

  // Xử lý khi đổi ngày trong Picker
  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false)
    }
    if (selectedDate) {
      setDateVal(selectedDate)
      const yyyy = selectedDate.getFullYear()
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const dd = String(selectedDate.getDate()).padStart(2, '0')
      setDob(`${yyyy}-${mm}-${dd}`)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.warning('Họ và tên không được để trống.')
      return
    }
    if (!email.trim()) {
      toast.warning('Email không được để trống.')
      return
    }

    let isoDob: string | null = null
    if (dob) {
      isoDob = dateVal.toISOString()
    }

    setSaving(true)
    try {
      const payload: any = {
        displayName: name.trim(),
        email: email.trim(),
        phoneNumber: phone.trim(),
        identityNumber: identityNumber.trim(),
        gender,
        address: address.trim(),
        dateOfBirth: isoDob,
      }

      if (newAvatarUri) {
        toast.info('Đang tải ảnh đại diện lên Cloudinary...')
        try {
          const cloudinaryUrl = await uploadToCloudinary(newAvatarUri)
          payload.avatar = cloudinaryUrl
        } catch (uploadErr: any) {
          console.error('Cloudinary upload error:', uploadErr)
          toast.error('Không thể tải ảnh đại diện lên Cloudinary. Vui lòng kiểm tra lại cấu hình.')
          setSaving(false)
          return
        }
      }

      const updated = await usersApi.updateProfile(payload)

      // Cập nhật Redux store đồng bộ
      dispatch(
        updateUser({
          name: updated.displayName || name,
          email: updated.email || email,
          avatar: updated.avatar || avatarUri,
        })
      )

      toast.success('Thông tin cá nhân đã được cập nhật thành công.')
      navigation.goBack()
    } catch (err: any) {
      toast.error(err.toString() || 'Cập nhật thông tin cá nhân thất bại.')
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
              <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '700' }}>Hồ sơ</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginTop: 4 }}>
                Chỉnh sửa thông tin
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
              <UserPen color='#FFFFFF' size={18} />
            </View>
          </View>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size='large' color='#06B6D4' />
            <Text style={{ marginTop: 12, color: '#64748B' }}>Đang tải thông tin cá nhân...</Text>
          </View>
        ) : (
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
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Pressable onPress={() => setAvatarModalVisible(true)}>
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: '#F1F5F9',
                    borderWidth: 2,
                    borderColor: '#E2E8F0',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <UserPen color='#94A3B8' size={32} />
                  )}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(15,23,42,0.65)',
                      height: 28,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Camera color='#FFFFFF' size={14} />
                  </View>
                </View>
              </Pressable>
              <Text style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>Bấm để thay đổi ảnh đại diện</Text>
            </View>

            <View style={{ gap: 14 }}>
              <EditField label='Họ và tên' value={name} onChangeText={setName} placeholder='Nhập họ tên' />
              
              <EditField label='Email' value={email} onChangeText={setEmail} placeholder='Nhập email' keyboardType='email-address' />
              
              <EditField label='Số điện thoại' value={phone} onChangeText={setPhone} placeholder='Nhập số điện thoại' keyboardType='phone-pad' />
              
              <EditField label='Số CMND/CCCD' value={identityNumber} onChangeText={setIdentityNumber} placeholder='Nhập số CMND hoặc CCCD' keyboardType='numeric' />
              
              <View style={{ gap: 8 }}>
                <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '700' }}>Giới tính</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => setGender(g)}
                      style={{
                        flex: 1,
                        height: 48,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: gender === g ? '#0F172A' : '#E2E8F0',
                        backgroundColor: gender === g ? '#0F172A' : '#F8FAFC',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: '700',
                          fontSize: 13,
                          color: gender === g ? '#FFFFFF' : '#0F172A',
                        }}
                      >
                        {g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '700' }}>Ngày sinh</Text>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    height: 52,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    backgroundColor: '#F8FAFC',
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ color: dob ? '#0F172A' : '#94A3B8', fontSize: 15 }}>
                    {dob ? dob.split('-').reverse().join('/') : 'Chọn ngày sinh từ lịch'}
                  </Text>
                  <Calendar color='#64748B' size={18} />
                </Pressable>
              </View>

              <EditField label='Địa chỉ cư trú' value={address} onChangeText={setAddress} placeholder='Nhập địa chỉ nhà' />
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
                <ActivityIndicator size='small' color='#FFFFFF' />
              ) : (
                <>
                  <Save color='#FFFFFF' size={18} />
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Lưu thay đổi</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>

      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent visible={showDatePicker} animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', paddingHorizontal: 20 }} onPress={() => setShowDatePicker(false)}>
              <Pressable onPress={() => null} style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <Text style={{ fontWeight: '800', fontSize: 17, color: '#0F172A' }}>Chọn ngày sinh</Text>
                  <Pressable onPress={() => setShowDatePicker(false)}>
                    <Text style={{ color: '#06B6D4', fontWeight: '800', fontSize: 15 }}>Xong</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={dateVal}
                  mode="date"
                  display="spinner"
                  textColor="#0F172A"
                  maximumDate={new Date()}
                  onChange={onChangeDate}
                />
              </Pressable>
            </Pressable>
          </Modal>
        ) : (
          <DateTimePicker
            value={dateVal}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={onChangeDate}
          />
        )
      )}

      <Modal visible={avatarModalVisible} transparent animationType='fade' onRequestClose={() => setAvatarModalVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', paddingHorizontal: 20 }}
          onPress={() => setAvatarModalVisible(false)}
        >
          <Pressable
            onPress={() => null}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 20,
              paddingBottom: 24,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 5,
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}
            >
              <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '800' }}>Đổi ảnh đại diện</Text>
              <Pressable onPress={() => setAvatarModalVisible(false)}>
                <X color='#64748B' size={20} />
              </Pressable>
            </View>

            <View style={{ gap: 12 }}>
              <Pressable
                onPress={() => handleSelectAvatar(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <Camera color='#06B6D4' size={20} style={{ marginRight: 12 }} />
                <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 15 }}>Chụp ảnh mới (Camera)</Text>
              </Pressable>

              <Pressable
                onPress={() => handleSelectAvatar(false)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <ImageIcon color='#06B6D4' size={20} style={{ marginRight: 12 }} />
                <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 15 }}>Chọn từ thư viện ảnh</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  )
}

function EditField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric'
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '700' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor='#94A3B8'
        keyboardType={keyboardType}
        style={{
          minHeight: 52,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          backgroundColor: '#F8FAFC',
          paddingHorizontal: 14,
          color: '#0F172A',
          fontSize: 15,
        }}
      />
    </View>
  )
}

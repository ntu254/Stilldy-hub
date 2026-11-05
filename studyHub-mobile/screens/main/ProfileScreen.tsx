import React, { useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View, Platform } from 'react-native'
import { ChevronRight, FileText, LogOut, Shield, Bookmark, Sparkles, UserPen, User, CreditCard, Settings } from 'lucide-react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { logout } from '../../redux/authSlice'
import type { AppDispatch, RootState } from '../../redux/store'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import { documentsApi } from '../../api/documentsApi'
import { adminApi } from '../../api/adminApi'
import { useToast } from '../../components/ui/ToastProvider'

const settings = [
  { id: '0', title: 'Chỉnh sửa thông tin', icon: UserPen },
  { id: '1', title: 'Thay đổi mật khẩu', icon: Shield },
  { id: '4', title: 'Nâng cấp tài khoản', icon: Sparkles },
  { id: '5', title: 'Lịch sử giao dịch', icon: CreditCard },
  { id: '2', title: 'Tài liệu đã lưu', icon: Bookmark },
  { id: '3', title: 'Điều khoản sử dụng', icon: FileText },
  { id: '6', title: 'Quản lý dịch vụ & Cấu hình', icon: Settings },
]

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const dispatch = useDispatch<AppDispatch>()
  const user = useSelector((state: RootState) => state.auth.user)
  const toast = useToast()
  const studentName = user?.name ?? 'Nguyễn Đức'
  const studentEmail = user?.email ?? 'duc@studyhub.app'
  const isAdmin = user?.role === 'admin'

  const [docCount, setDocCount] = useState(0)
  const [storageUsedMB, setStorageUsedMB] = useState(0)
  const [loadingStats, setLoadingStats] = useState(false)

  // Tải thông tin thống kê một lần khi component mount
  React.useEffect(() => {
    let active = true
    async function fetchStats() {
      setLoadingStats(true)
      try {
        if (isAdmin) {
          const stats = await adminApi.getDashboardStats()
          if (active) {
            setDocCount(stats.documents.totalFiles)
            setStorageUsedMB(stats.users.total)
          }
        } else {
          const stats = await documentsApi.getDocumentStats()
          if (active) {
            setDocCount(stats.totalDocuments)
            setStorageUsedMB(stats.totalStorageUsed.megaBytes)
          }
        }
      } catch (err) {
        console.warn('Cannot fetch profile workspace stats:', err)
      } finally {
        if (active) setLoadingStats(false)
      }
    }
    fetchStats()
    return () => {
      active = false
    }
  }, [isAdmin])

  const usedPercent = Math.min((storageUsedMB / 5120) * 100, 100) // 5GB limit = 5120MB

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 220 }}
      >
        {/* Top Brand Header */}
        <View
          style={{
            paddingTop: Platform.OS === 'ios' ? 54 : 44, // Safe area space
            paddingHorizontal: 20,
            paddingBottom: 14,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#0F172A',
            shadowOpacity: 0.02,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 1,
            marginBottom: 18,
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: '900', fontStyle: 'italic', color: '#0F172A', letterSpacing: -0.5 }}>
            NEXUS<Text style={{ color: '#8678EA', fontStyle: 'normal' }}>.</Text>
          </Text>
          <Pressable
            onPress={() => {
              // Already on Profile
            }}
            style={{
              shadowColor: '#8678EA',
              shadowOpacity: 0.12,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 1,
            }}
          >
            <Image
              source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80' }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                borderWidth: 1.5,
                borderColor: '#8678EA',
              }}
            />
          </Pressable>
        </View>

        {/* Synced Profile introductory card */}
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 16,
            borderRadius: 28,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            padding: 16,
            shadowColor: '#0F172A',
            shadowOpacity: 0.06,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: '#0F172A',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <User color='#FFFFFF' size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#0F172A', fontSize: 24, fontWeight: '900' }}>Hồ sơ</Text>
              <Text style={{ color: '#64748B', marginTop: 3, fontSize: 13, lineHeight: 18 }}>
                Quản lý thông tin cá nhân và tuỳ chọn bảo mật.
              </Text>
            </View>
          </View>
        </View>

        {/* User Card */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 32,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            padding: 18,
            alignItems: 'center',
            marginHorizontal: 20,
            marginBottom: 16,
            shadowColor: '#0F172A',
            shadowOpacity: 0.05,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 2,
          }}
        >
          <View
            style={{
              width: 110,
              height: 110,
              borderRadius: 55,
              padding: 4,
              backgroundColor: '#E0F2FE',
              marginBottom: 16,
            }}
          >
            <Image
              source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80' }}
              style={{ width: '100%', height: '100%', borderRadius: 55 }}
            />
          </View>

          <Text style={{ color: '#0F172A', fontSize: 24, fontWeight: '900' }}>{studentName}</Text>
          <Text style={{ color: '#64748B', marginTop: 6 }}>{studentEmail}</Text>

          {loadingStats ? (
            <ActivityIndicator size='small' color='#06B6D4' style={{ marginTop: 16 }} />
          ) : isAdmin ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 20,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800' }}>{docCount}</Text>
                <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>Tài liệu hệ thống</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 20,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800' }}>{storageUsedMB}</Text>
                <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>Tổng thành viên</Text>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 20,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800' }}>{docCount}</Text>
                <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>Tài liệu tải lên</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 20,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800' }}>
                  {usedPercent === 0 
                    ? '0%' 
                    : usedPercent < 0.01 
                    ? '<0.01%' 
                    : usedPercent < 1 
                    ? `${usedPercent.toFixed(2)}%` 
                    : `${usedPercent.toFixed(1)}%`
                  }
                </Text>
                <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>Dung lượng ({storageUsedMB.toFixed(1)} MB)</Text>
              </View>
            </View>
          )}
        </View>

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 32,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            overflow: 'hidden',
            marginHorizontal: 20,
            marginBottom: 16,
          }}
        >
          {settings
            .filter((item) => {
              if (isAdmin && item.id === '2') return false // Hide saved documents for admin
              if (!isAdmin && item.id === '6') return false // Hide system settings for regular users
              return true
            })
            .map((item, index, arr) => {
              const Icon = item.icon
              const displayTitle = (item.id === '4' && isAdmin) ? 'Quản lý gói dịch vụ' : item.title
              const isLast = index === arr.length - 1
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    if (item.id === '0') {
                      const parentNavigation = (navigation as any).getParent?.()
                      if (parentNavigation?.navigate) {
                        parentNavigation.navigate('EditProfile')
                      } else {
                        navigation.navigate('EditProfile' as any)
                      }
                    } else if (item.id === '1') {
                      const parentNavigation = (navigation as any).getParent?.()
                      if (parentNavigation?.navigate) {
                        parentNavigation.navigate('ChangePassword')
                      } else {
                        navigation.navigate('ChangePassword' as any)
                      }
                    } else if (item.id === '2') {
                      navigation.navigate('MainTabs', {
                        screen: 'Documents',
                        params: { tab: 'saved' }
                      })
                    } else if (item.id === '4') {
                      const parentNavigation = (navigation as any).getParent?.()
                      if (parentNavigation?.navigate) {
                        parentNavigation.navigate('Subscription')
                      } else {
                        navigation.navigate('Subscription' as any)
                      }
                    } else if (item.id === '5') {
                      const parentNavigation = (navigation as any).getParent?.()
                      if (parentNavigation?.navigate) {
                        parentNavigation.navigate('TransactionHistory')
                      } else {
                        navigation.navigate('TransactionHistory' as any)
                      }
                    } else if (item.id === '3') {
                      const parentNavigation = (navigation as any).getParent?.()
                      if (parentNavigation?.navigate) {
                        parentNavigation.navigate('Terms')
                      } else {
                        navigation.navigate('Terms' as any)
                      }
                    } else if (item.id === '6') {
                      navigation.navigate('MainTabs', {
                        screen: 'AdminPlans'
                      })
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: '#F1F5F9',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: '#E0F2FE',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Icon color='#06B6D4' size={18} />
                  </View>
                  <Text style={{ flex: 1, color: '#0F172A', fontWeight: '700' }}>{displayTitle}</Text>
                  <ChevronRight color='#CBD5E1' size={18} />
                </Pressable>
              )
            })}
        </View>

        <Pressable
          onPress={() => {
            toast.success('Đăng xuất thành công!')
            setTimeout(() => {
              dispatch(logout())
            }, 1000)
          }}
          style={{
            marginTop: 6,
            backgroundColor: '#0F172A',
            borderRadius: 24,
            paddingVertical: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 10,
            marginHorizontal: 20,
          }}
        >
          <LogOut color='#FFFFFF' size={18} />
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Đăng xuất</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  )
}

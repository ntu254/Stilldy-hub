import React, { useState, useEffect } from 'react'
import { FlatList, Image, Pressable, ScrollView, Text, View, ActivityIndicator, Platform } from 'react-native'
import {
  Search,
  Sparkles,
  HardDriveDownload,
  ArrowUpRight,
  FileText,
  ChevronRight,
  BookOpen,
  Layers,
  Bell,
} from 'lucide-react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import type { RootState } from '../../redux/store'
import Svg, { Circle } from 'react-native-svg'
import { documentsApi, DocumentInfo } from '../../api/documentsApi'
import { notificationsApi } from '../../api/notificationsApi'
import NotificationPopover from '../../components/layout/NotificationPopover'
import { useToast } from '../../components/ui/ToastProvider'

const PRESET_COLORS = ['#DBEAFE', '#E0F2FE', '#DCFCE7', '#E9D5FF', '#FDE68A']

function getDocColor(id: string) {
  if (!id) return PRESET_COLORS[0]
  const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return PRESET_COLORS[sum % PRESET_COLORS.length]
}

function formatBytes(bytes?: number) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StorageMiniRing({ usedPercent }: { usedPercent: number }) {
  const size = 66
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const dashOffset = circumference - (usedPercent / 100) * circumference

  const pctText = usedPercent === 0
    ? '0%'
    : usedPercent < 0.01
    ? '<0.01%'
    : usedPercent < 1
    ? `${usedPercent.toFixed(2)}%`
    : `${usedPercent.toFixed(0)}%`
  const fontSize = pctText.length > 3 ? 11 : 15

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke='#E2E8F0'
          strokeWidth={strokeWidth}
          fill='none'
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke='#8678EA'
          strokeWidth={strokeWidth}
          fill='none'
          strokeLinecap='round'
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: '#8678EA', fontSize, fontWeight: '800' }}>{pctText}</Text>
      </View>
    </View>
  )
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const user = useSelector((state: RootState) => state.auth.user)
  const displayName = user?.name || 'Đức'
  const token = useSelector((state: RootState) => state.auth.token)
  const toast = useToast()

  const [usedMb, setUsedMb] = useState(0)
  const [totalGb] = useState(5) // Default total allocation: 5GB
  const [savedCount, setSavedCount] = useState(0)
  const [totalDocsCount, setTotalDocsCount] = useState(0)
  const [recentDocs, setRecentDocs] = useState<DocumentInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsVisible, setNotificationsVisible] = useState(false)

  useFocusEffect(
    React.useCallback(() => {
      let active = true
      async function loadDashboardData() {
        setLoading(true)
        try {
          // 1. Tải dung lượng đã sử dụng
          const stats = await documentsApi.getDocumentStats()
          // 2. Tải số lượng tài liệu đã lưu
          const savedList = await documentsApi.getSavedDocuments()
          // 3. Tải danh sách tài liệu cá nhân gần đây
          const myDocsResult = await documentsApi.getMyDocuments({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' })
          // 4. Tải danh sách thông báo để đếm số chưa đọc
          const notifRes = await notificationsApi.getNotifications({ page: 1, limit: 30 })
          const unread = notifRes.data ? notifRes.data.filter((n: any) => !n.isRead).length : 0

          if (active) {
            setUsedMb(stats.totalStorageUsed.megaBytes || 0)
            setTotalDocsCount(stats.totalDocuments || 0)
            setSavedCount(savedList.length)
            setRecentDocs(myDocsResult.data || [])
            setUnreadCount(unread)
          }
        } catch (err) {
          console.warn('Error loading dashboard data:', err)
        } finally {
          if (active) setLoading(false)
        }
      }
      loadDashboardData()
      return () => {
        active = false
      }
    }, [])
  )

  useEffect(() => {
    if (!token || !user?.id) return

    // Kết nối Socket.io để nhận thông báo thời gian thực
    const socket = notificationsApi.initNotificationSocket(user.id, token, (newNotif) => {
      setUnreadCount((prev) => prev + 1)
      toast.info(newNotif.message || 'Bạn có thông báo mới.')
    })

    return () => {
      socket.disconnect()
    }
  }, [token, user?.id])

  const usedGb = usedMb / 1024
  const usedPercent = Math.min((usedGb / totalGb) * 100, 100)

  const formattedUsed = usedMb === 0
    ? '0.0 MB'
    : usedMb < 0.1
    ? `${(usedMb * 1024).toFixed(1)} KB`
    : usedMb < 1024
    ? `${usedMb.toFixed(1)} MB`
    : `${(usedMb / 1024).toFixed(2)} GB`

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
      {/* Top Brand Header (Được đưa ra ngoài ScrollView để luôn nổi trên cùng và không bị đè) */}
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
          elevation: 4,
          zIndex: 50,
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: '900', fontStyle: 'italic', color: '#0F172A', letterSpacing: -0.5 }}>
          NEXUS<Text style={{ color: '#8678EA', fontStyle: 'normal' }}>.</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ position: 'relative', zIndex: 999 }}>
            <Pressable
              onPress={() => setNotificationsVisible(!notificationsVisible)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell color="#475569" size={20} />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    backgroundColor: '#EF4444',
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                    borderWidth: 1.5,
                    borderColor: '#FFFFFF',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>

            <NotificationPopover
              visible={notificationsVisible}
              onClose={() => setNotificationsVisible(false)}
              onUnreadCountChange={(count) => setUnreadCount(count)}
              navigation={navigation}
            />
          </View>

          <Pressable
            onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
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
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 18, paddingBottom: 140 }}
        style={{ zIndex: 1 }}
      >

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 32,
            padding: 18,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginHorizontal: 20,
            marginBottom: 16,
            shadowColor: '#0F172A',
            shadowOpacity: 0.05,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: '#0F172A',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Layers color='#FFFFFF' size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '700' }}>Chào bạn, {displayName}!</Text>
              <Text style={{ color: '#0F172A', fontSize: 27, fontWeight: '900', marginTop: 4, lineHeight: 33 }}>
                Trung tâm tài liệu học tập của bạn
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => navigation.navigate('MainTabs', { screen: 'Documents', params: { tab: 'public' } })}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 32,
            padding: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginHorizontal: 20,
            marginBottom: 16,
            shadowColor: '#0F172A',
            shadowOpacity: 0.04,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 1,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: 999,
              paddingHorizontal: 16,
              height: 54,
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
          >
            <Search color='#94A3B8' size={19} />
            <Text style={{ flex: 1, marginLeft: 12, color: '#94A3B8', fontSize: 15 }}>
              Tìm tài liệu, môn học, tác giả...
            </Text>
            <Sparkles color='#06B6D4' size={18} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('MainTabs', { screen: 'Documents', params: { tab: 'mine' } })}
          style={{
            backgroundColor: '#CCCAFF',
            borderRadius: 40,
            padding: 18,
            marginHorizontal: 20,
            marginBottom: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}>Dung lượng bộ nhớ</Text>
            <Text style={{ color: '#0F172A', fontSize: 24, fontWeight: '800', marginTop: 6 }}>
              {formattedUsed} / {totalGb} GB
            </Text>
            <Text style={{ color: '#5B6478', marginTop: 10, fontSize: 12 }}>
              Còn {Math.max(totalGb - usedGb, 0).toFixed(2)} GB để đồng bộ thêm tài liệu mới
            </Text>
          </View>

          <View style={{ alignItems: 'center' }}>
            <StorageMiniRing usedPercent={usedPercent} />
            <Text style={{ color: '#0F172A', fontSize: 11, fontWeight: '600', marginTop: 4 }}>đã dùng</Text>
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 20, marginBottom: 18 }}>
          <Pressable
            onPress={() => navigation.navigate('MainTabs', { screen: 'Documents', params: { tab: 'saved' } })}
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 40,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <FileText color='#06B6D4' size={18} />
              <ArrowUpRight color='#CBD5E1' size={18} />
            </View>
            <Text style={{ color: '#0F172A', fontSize: 24, fontWeight: '800', marginTop: 18 }}>{savedCount}</Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>Tài liệu đã lưu</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('MainTabs', { screen: 'Documents', params: { tab: 'mine' } })}
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 40,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Layers color='#06B6D4' size={18} />
              <ArrowUpRight color='#CBD5E1' size={18} />
            </View>
            <Text style={{ color: '#0F172A', fontSize: 24, fontWeight: '800', marginTop: 18 }}>
              {totalDocsCount}
            </Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>Tài liệu tải lên</Text>
          </Pressable>
        </View>

        {/* Flashcards Shortcut */}
        <Pressable
          onPress={() => navigation.navigate('MainTabs', { screen: 'Flashcards', params: { showBack: true } })}
          style={{
            backgroundColor: '#EEF2FF',
            borderRadius: 32,
            padding: 20,
            borderWidth: 1,
            borderColor: '#C7D2FE',
            marginHorizontal: 20,
            marginBottom: 18,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#8678EA',
            shadowOpacity: 0.05,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 2,
          }}
        >
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: '#8678EA',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}
          >
            <Layers color='#FFFFFF' size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#4338CA', fontSize: 16, fontWeight: '800' }}>Học qua Thẻ ghi nhớ</Text>
            <Text style={{ color: '#6366F1', fontSize: 12, marginTop: 4 }}>Ôn tập kiến thức nhanh và hiệu quả hơn</Text>
          </View>
          <ChevronRight color='#8678EA' size={20} />
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 14 }}>
          <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '800' }}>Tài liệu gần đây</Text>
          <Pressable
            onPress={() => navigation.navigate('MainTabs', { screen: 'Documents' })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ color: '#06B6D4', fontSize: 13, fontWeight: '700' }}>Xem tất cả</Text>
            <ChevronRight color='#06B6D4' size={14} />
          </Pressable>
        </View>

        {loading && recentDocs.length === 0 ? (
          <ActivityIndicator size='small' color='#06B6D4' style={{ marginTop: 20 }} />
        ) : recentDocs.length === 0 ? (
          <View
            style={{
              padding: 24,
              backgroundColor: '#FFFFFF',
              borderRadius: 32,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              alignItems: 'center',
              marginHorizontal: 20,
            }}
          >
            <BookOpen color='#94A3B8' size={32} />
            <Text style={{ color: '#64748B', marginTop: 12, fontSize: 14 }}>Chưa tải lên tài liệu nào</Text>
            <Pressable
              onPress={() => navigation.navigate('MainTabs', { screen: 'Documents' })}
              style={{
                marginTop: 12,
                backgroundColor: '#0F172A',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Tải lên ngay</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={recentDocs}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 14, paddingBottom: 4, paddingHorizontal: 20 }}
            renderItem={({ item }) => {
              const latestVersion = item.versions?.[item.versions.length - 1]
              const sizeLabel = latestVersion ? formatBytes(latestVersion.fileSize) : 'N/A'
              const subjectName = item.subjectId?.name || 'Chung'
              const bg = getDocColor(item._id)

              return (
                <Pressable
                  onPress={() =>
                    navigation.navigate('DocumentViewer', {
                      documentId: item._id,
                      documentTitle: item.title,
                      sourceSubject: subjectName,
                    })
                  }
                  style={{
                    width: 230,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 32,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    overflow: 'hidden',
                  }}
                >
                  <View style={{ height: 150, backgroundColor: bg, padding: 14, justifyContent: 'space-between' }}>
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '700' }}>{subjectName}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: '#FFFFFF',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FileText color='#0F172A' size={20} />
                      </View>
                    </View>
                  </View>
                  <View style={{ padding: 16 }}>
                    <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800' }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={{ color: '#64748B', fontSize: 13, marginTop: 6 }}>
                      {item.uploadedBy?.displayName || item.uploadedBy?.fullName || (item.uploadedBy?.email ? item.uploadedBy.email.split('@')[0] : '') || 'Tôi'}
                    </Text>
                    <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 10 }}>{sizeLabel}</Text>
                  </View>
                </Pressable>
              )
            }}
          />
        )}
      </ScrollView>
    </ScreenShell>
  )
}

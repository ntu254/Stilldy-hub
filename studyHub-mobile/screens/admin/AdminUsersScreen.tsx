import React, { useState, useRef } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
  Modal,
  ScrollView,
} from 'react-native'
import {
  Search,
  UserCheck,
  UserX,
  ShieldAlert,
  Layers,
  Sparkles,
  Users,
  Globe,
  Lock,
  TriangleAlert,
  X,
  Eye,
  Calendar,
  HardDrive,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native'
import { useSelector } from 'react-redux'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Svg, { Circle, Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg'

import ScreenShell from '../../components/layout/ScreenShell'
import type { RootState } from '../../redux/store'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import { adminApi, UserManagementInfo } from '../../api/adminApi'
import { useToast } from '../../components/ui/ToastProvider'

export default function AdminUsersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const currentUser = useSelector((state: RootState) => state.auth.user)
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'banned'>('all')

  const [allUsers, setAllUsers] = useState<UserManagementInfo[]>([])
  const [activeUsers, setActiveUsers] = useState<UserManagementInfo[]>([])
  const [bannedUsers, setBannedUsers] = useState<UserManagementInfo[]>([])

  const [allPage, setAllPage] = useState(1)
  const [activePage, setActivePage] = useState(1)
  const [bannedPage, setBannedPage] = useState(1)

  const [allTotalPages, setAllTotalPages] = useState(1)
  const [activeTotalPages, setActiveTotalPages] = useState(1)
  const [bannedTotalPages, setBannedTotalPages] = useState(1)

  const [stats, setStats] = useState<{ total: number; active: number; inactive: number } | null>(null)

  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const isLoadingRef = useRef(false)
  const isMomentumRef = useRef(false)
  const [refreshEnabled, setRefreshEnabled] = useState(true)

  // Detail Modal states
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Custom Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean
    title: string
    message: string
    confirmText: string
    isDestructive: boolean
    onConfirm: () => void
  }>({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    isDestructive: false,
    onConfirm: () => {},
  })

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  const fetchStats = async () => {
    try {
      const data = await adminApi.getDashboardStats()
      setStats({
        total: data.users.total,
        active: data.users.active,
        inactive: data.users.inactive,
      })
    } catch (err) {
      console.warn('Cannot fetch users stats:', err)
    }
  }

  const loadUsers = async (targetPage = 1, isRefresh = false) => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true

    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      let isActiveFilter: boolean | undefined = undefined
      if (activeTab === 'active') isActiveFilter = true
      if (activeTab === 'banned') isActiveFilter = false

      const data = await adminApi.getUsers(targetPage, 10, searchQuery, isActiveFilter)
      const list = data?.list || []
      const totalPages = data?.totalPages || 1

      // Sort users locally if needed
      const sorted = [...list].sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1
        if (a.role !== 'admin' && b.role === 'admin') return 1
        return a.displayName.localeCompare(b.displayName)
      })

      if (activeTab === 'all') {
        setAllUsers(sorted)
        setAllPage(targetPage)
        setAllTotalPages(totalPages)
      } else if (activeTab === 'active') {
        setActiveUsers(sorted)
        setActivePage(targetPage)
        setActiveTotalPages(totalPages)
      } else {
        setBannedUsers(sorted)
        setBannedPage(targetPage)
        setBannedTotalPages(totalPages)
      }
    } catch (err: any) {
      console.error('[loadUsers] Error:', err)
      toast.error(err.toString() || 'Không thể tải danh sách thành viên.')
    } finally {
      isLoadingRef.current = false
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      fetchStats()
      const hasData =
        activeTab === 'all'
          ? allUsers.length > 0
          : activeTab === 'active'
          ? activeUsers.length > 0
          : bannedUsers.length > 0

      if (!hasData) {
        loadUsers(1)
      }
    }, [activeTab, allUsers.length, activeUsers.length, bannedUsers.length])
  )

  const handleBanUser = (id: string, name: string) => {
    setConfirmModal({
      visible: true,
      title: 'Khóa tài khoản',
      message: `Bạn có chắc chắn muốn khóa tài khoản của "${name}" không? Người dùng này sẽ không thể đăng nhập hệ thống.`,
      confirmText: 'Khóa tài khoản',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await adminApi.banUser(id)
          toast.success('Đã khóa tài khoản thành công.')
          
          // Update local lists
          setAllUsers((prev) => prev.map((u) => (u._id === id ? { ...u, isActive: false } : u)))
          setActiveUsers((prev) => prev.filter((u) => u._id !== id))
          
          setBannedUsers((prev) => {
            const exists = prev.some((u) => u._id === id)
            if (exists) {
              return prev.map((u) => (u._id === id ? { ...u, isActive: false } : u))
            }
            // Find user in other lists to append to banned
            const foundUser = allUsers.find((u) => u._id === id) || activeUsers.find((u) => u._id === id)
            if (foundUser) {
              return [...prev, { ...foundUser, isActive: false }].sort((a, b) => {
                if (a.role === 'admin' && b.role !== 'admin') return -1
                if (a.role !== 'admin' && b.role === 'admin') return 1
                return a.displayName.localeCompare(b.displayName)
              })
            }
            return prev
          })

          setSelectedUser((prev: any) => prev && prev._id === id ? { ...prev, isActive: false } : prev)

          // Update stats
          setStats((prev) => {
            if (!prev) return null
            return {
              ...prev,
              active: Math.max(0, prev.active - 1),
              inactive: prev.inactive + 1,
            }
          })
        } catch (err: any) {
          toast.error(err.toString())
        }
      },
    })
  }

  const handleUnbanUser = (id: string, name: string) => {
    setConfirmModal({
      visible: true,
      title: 'Mở khóa tài khoản',
      message: `Bạn có chắc chắn muốn mở khóa tài khoản của "${name}" không?`,
      confirmText: 'Mở khóa',
      isDestructive: false,
      onConfirm: async () => {
        try {
          const res = await adminApi.unbanUser(id)
          toast.success('Đã mở khóa tài khoản thành công.')
          
          // Update local lists
          setAllUsers((prev) => prev.map((u) => (u._id === id ? { ...u, isActive: true } : u)))
          setBannedUsers((prev) => prev.filter((u) => u._id !== id))

          setActiveUsers((prev) => {
            const exists = prev.some((u) => u._id === id)
            if (exists) {
              return prev.map((u) => (u._id === id ? { ...u, isActive: true } : u))
            }
            const foundUser = allUsers.find((u) => u._id === id) || bannedUsers.find((u) => u._id === id)
            if (foundUser) {
              return [...prev, { ...foundUser, isActive: true }].sort((a, b) => {
                if (a.role === 'admin' && b.role !== 'admin') return -1
                if (a.role !== 'admin' && b.role === 'admin') return 1
                return a.displayName.localeCompare(b.displayName)
              })
            }
            return prev
          })

          setSelectedUser((prev: any) => prev && prev._id === id ? { ...prev, isActive: true } : prev)

          // Update stats
          setStats((prev) => {
            if (!prev) return null
            return {
              ...prev,
              active: prev.active + 1,
              inactive: Math.max(0, prev.inactive - 1),
            }
          })
        } catch (err: any) {
          toast.error(err.toString())
        }
      },
    })
  }

  const handleViewDetails = async (id: string) => {
    setLoadingDetail(true)
    setIsDetailModalOpen(true)
    try {
      const data = await adminApi.getUserDetails(id)
      setSelectedUser(data)
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể tải chi tiết người dùng.')
      setIsDetailModalOpen(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  const currentUsers = activeTab === 'all' ? allUsers : activeTab === 'active' ? activeUsers : bannedUsers

  const renderPaginationControls = () => {
    const currentPage = activeTab === 'all' ? allPage : activeTab === 'active' ? activePage : bannedPage
    const totalPages = activeTab === 'all' ? allTotalPages : activeTab === 'active' ? activeTotalPages : bannedTotalPages
    const usersCount = currentUsers.length

    if (usersCount === 0 || totalPages <= 1) return null

    const getPageNumbers = () => {
      const pages: (number | string)[] = []
      if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        if (currentPage <= 3) {
          pages.push(1, 2, 3, 4, '...', totalPages)
        } else if (currentPage >= totalPages - 2) {
          pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
        } else {
          pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
        }
      }
      return pages
    }

    const pageNumbers = getPageNumbers()

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 24,
          marginBottom: 16,
          gap: 8,
        }}
      >
        {/* Left Arrow */}
        <Pressable
          disabled={currentPage === 1}
          onPress={() => loadUsers(currentPage - 1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: currentPage === 1 ? 0.3 : 1,
            shadowColor: '#0F172A',
            shadowOpacity: 0.02,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <ChevronLeft color='#64748B' size={15} />
        </Pressable>

        {/* Pages */}
        {pageNumbers.map((page, idx) => {
          if (page === '...') {
            return (
              <View key={`ellipsis-${idx}`} style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '800' }}>...</Text>
              </View>
            )
          }

          const isSelected = page === currentPage
          return (
            <Pressable
              key={`page-${page}`}
              onPress={() => loadUsers(page as number)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isSelected ? '#0F172A' : '#FFFFFF',
                borderWidth: isSelected ? 0 : 1,
                borderColor: '#E2E8F0',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#0F172A',
                shadowOpacity: 0.02,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isSelected ? '900' : '800',
                  color: isSelected ? '#FFFFFF' : '#1E293B',
                }}
              >
                {page}
              </Text>
            </Pressable>
          )
        })}

        {/* Right Arrow */}
        <Pressable
          disabled={currentPage === totalPages}
          onPress={() => loadUsers(currentPage + 1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: currentPage === totalPages ? 0.3 : 1,
            shadowColor: '#0F172A',
            shadowOpacity: 0.02,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <ChevronRight color='#64748B' size={15} />
        </Pressable>
      </View>
    )
  }

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
      {/* Top Brand Header */}
      <View
        style={{
          paddingTop: 54, // Safe area space
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
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: '900', fontStyle: 'italic', color: '#0F172A', letterSpacing: -0.5 }}>
          NEXUS<Text style={{ color: '#7C3AED', fontStyle: 'normal' }}>.</Text>
        </Text>
        <Pressable
          onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
          style={{
            shadowColor: '#7C3AED',
            shadowOpacity: 0.12,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 1,
          }}
        >
          <Image
            source={{ uri: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80' }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              borderWidth: 1.5,
              borderColor: '#7C3AED',
            }}
          />
        </Pressable>
      </View>

      <FlatList
        data={currentUsers}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 160 }}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y
          setRefreshEnabled(y <= 2)
        }}
        onMomentumScrollBegin={() => {
          isMomentumRef.current = true
        }}
        onMomentumScrollEnd={() => {
          isMomentumRef.current = false
        }}
        onScrollBeginDrag={() => {
          isMomentumRef.current = false
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            enabled={refreshEnabled}
            onRefresh={() => {
              if (isMomentumRef.current) return
              loadUsers(1, true)
            }}
            colors={['#7C3AED']}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            {/* Header Banner */}
            <View style={{ marginBottom: 20, borderRadius: 24, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <Svg height="100%" width="100%">
                  <Defs>
                    <LinearGradient id="gradUsers" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#F5F3FF" />
                      <Stop offset="100%" stopColor="#EDE9FE" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#gradUsers)" />
                  <Circle cx="90%" cy="10%" r="50" fill="#DDD6FE" opacity="0.6" />
                  <Circle cx="80%" cy="90%" r="30" fill="#C7D2FE" opacity="0.4" />
                </Svg>
              </View>
              <View
                style={{
                  padding: 20,
                  borderWidth: 1.5,
                  borderColor: '#E9D5FF',
                  borderRadius: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: '#8B5CF6', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Ban điều hành
                  </Text>
                  <Text style={{ color: '#5B21B6', fontSize: 26, fontWeight: '900', marginTop: 4, lineHeight: 32 }}>
                    Thành Viên
                  </Text>
                  <Text style={{ color: '#6D28D9', marginTop: 8, lineHeight: 18, fontSize: 13, opacity: 0.8 }}>
                    Quản lý tài khoản người dùng và thiết lập khóa/mở khóa tài khoản khi có hành vi vi phạm.
                  </Text>
                </View>
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 18,
                    backgroundColor: '#7C3AED',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#7C3AED',
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 3,
                  }}
                >
                  <Users color='#FFFFFF' size={24} />
                </View>
              </View>
            </View>

            {/* Stats Overview */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
              style={{ marginBottom: 16 }}
            >
              {/* Card 1 */}
              <View style={{ width: 140, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Users color='#4F46E5' size={18} />
                </View>
                <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '800', marginTop: 10, textTransform: 'uppercase', textAlign: 'center' }}>Tổng thành viên</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 4 }}>{stats ? stats.total : '--'}</Text>
              </View>

              {/* Card 2 */}
              <View style={{ width: 140, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#E6FBF0', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck color='#10B981' size={18} />
                </View>
                <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '800', marginTop: 10, textTransform: 'uppercase', textAlign: 'center' }}>Đang hoạt động</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 4 }}>{stats ? stats.active : '--'}</Text>
              </View>

              {/* Card 3 */}
              <View style={{ width: 140, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center' }}>
                  <UserX color='#EF4444' size={18} />
                </View>
                <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '800', marginTop: 10, textTransform: 'uppercase', textAlign: 'center' }}>Tài khoản bị khóa</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 4 }}>{stats ? stats.inactive : '--'}</Text>
              </View>
            </ScrollView>

            {/* Search Box */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOpacity: 0.02,
                shadowRadius: 10,
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
                  height: 48,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Search color='#94A3B8' size={18} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => {
                    setAllUsers([])
                    setActiveUsers([])
                    setBannedUsers([])
                    loadUsers(1)
                  }}
                  placeholder='Tìm theo tên hoặc email...'
                  placeholderTextColor='#94A3B8'
                  style={{ flex: 1, marginLeft: 10, color: '#0F172A', fontSize: 14 }}
                />
              </View>
            </View>

            {/* Segmented control tab switcher */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4, marginTop: 16 }}>
              <Pressable
                onPress={() => setActiveTab('all')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: activeTab === 'all' ? '#FFFFFF' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#0F172A',
                  shadowOpacity: activeTab === 'all' ? 0.05 : 0,
                  shadowRadius: 4,
                  elevation: activeTab === 'all' ? 1 : 0,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: activeTab === 'all' ? '#0F172A' : '#64748B' }}>Tất cả</Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('active')}
                style={{
                  flex: 1.2,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: activeTab === 'active' ? '#FFFFFF' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#0F172A',
                  shadowOpacity: activeTab === 'active' ? 0.05 : 0,
                  shadowRadius: 4,
                  elevation: activeTab === 'active' ? 1 : 0,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: activeTab === 'active' ? '#0F172A' : '#64748B' }}>Đang hoạt động</Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('banned')}
                style={{
                  flex: 1.1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: activeTab === 'banned' ? '#FFFFFF' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#0F172A',
                  shadowOpacity: activeTab === 'banned' ? 0.05 : 0,
                  shadowRadius: 4,
                  elevation: activeTab === 'banned' ? 1 : 0,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: activeTab === 'banned' ? '#0F172A' : '#64748B' }}>Đã khóa</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 32,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 32,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 20,
              }}
            >
              <Users color='#94A3B8' size={44} />
              <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800', marginTop: 14 }}>
                Không tìm thấy thành viên
              </Text>
              <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                Không có người dùng nào khớp với từ khóa tìm kiếm của bạn.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isMe = item._id === currentUser?.id
          const userAvatar = item.avatar || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&q=80'
          const dateLabel = new Date(item.createdAt).toLocaleDateString('vi-VN')

          return (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 28,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 16,
                marginBottom: 12,
                shadowColor: '#0F172A',
                shadowOpacity: 0.02,
                shadowRadius: 10,
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* User Avatar */}
                <Image
                  source={{ uri: userAvatar }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: '#E2E8F0',
                    marginRight: 14,
                  }}
                />

                {/* User Info */}
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <Text style={{ color: '#0F172A', fontWeight: '800', fontSize: 16 }} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                    {item.role === 'admin' && (
                      <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: '#7C3AED', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>Admin</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                    {item.email}
                  </Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, flexWrap: 'wrap', gap: 6 }}>
                    <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                      Tham gia: {dateLabel}
                    </Text>
                    
                    {/* Stats Icons */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {/* Public count */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Globe color='#7C3AED' size={12} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#7C3AED' }}>{item.publicFilesCount || 0}</Text>
                      </View>
                      {/* Private count */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Lock color='#64748B' size={12} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>{item.privateFilesCount || 0}</Text>
                      </View>
                      {/* Reported count */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <TriangleAlert color='#EF4444' size={12} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>{item.reportedFilesCount || 0}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Active Status Badge */}
                <View
                  style={{
                    backgroundColor: item.isActive ? '#DCFCE7' : '#FEE2E2',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: item.isActive ? '#15803D' : '#EF4444', fontSize: 10, fontWeight: '800' }}>
                    {item.isActive ? 'Hoạt động' : 'Bị khóa'}
                  </Text>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#F1F5F9',
                  flexDirection: 'row',
                  gap: 10,
                }}
              >
                {/* 1. Chi tiết button */}
                <Pressable
                  onPress={() => handleViewDetails(item._id)}
                  style={{
                    flex: 1,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: '#EEF2FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    borderWidth: 1,
                    borderColor: '#DDD6FE',
                  }}
                >
                  <Eye color='#7C3AED' size={14} />
                  <Text style={{ color: '#7C3AED', fontSize: 12, fontWeight: '700' }}>Chi tiết</Text>
                </Pressable>

                {/* 2. Ban/Unban button */}
                {!isMe && item.role !== 'admin' && (
                  <>
                    {item.isActive ? (
                      <Pressable
                        onPress={() => handleBanUser(item._id, item.displayName)}
                        style={{
                          flex: 1,
                          height: 38,
                          borderRadius: 10,
                          backgroundColor: '#FEF2F2',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 6,
                          borderWidth: 1,
                          borderColor: '#FEE2E2',
                        }}
                      >
                        <UserX color='#EF4444' size={14} />
                        <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Khóa tài khoản</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => handleUnbanUser(item._id, item.displayName)}
                        style={{
                          flex: 1,
                          height: 38,
                          borderRadius: 10,
                          backgroundColor: '#DCFCE7',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 6,
                          borderWidth: 1,
                          borderColor: '#D1FAE5',
                        }}
                      >
                        <UserCheck color='#10B981' size={14} />
                        <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>Mở khóa</Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            </View>
          )
        }}
        ListFooterComponent={renderPaginationControls()}
      />

      {/* ─── MEMBER DETAILS MODAL ─────────────────────────────────────────── */}
      <Modal
        visible={isDetailModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsDetailModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setIsDetailModalOpen(false)} />
          
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              width: '90%',
              maxHeight: '80%',
              overflow: 'hidden',
              shadowColor: '#0F172A',
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 10,
            }}
          >
            {loadingDetail ? (
              <View style={{ paddingVertical: 60, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="small" color="#7C3AED" />
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 12, fontWeight: '700' }}>
                  Đang tải chi tiết hồ sơ...
                </Text>
              </View>
            ) : selectedUser ? (
              <View>
                {/* Banner Background */}
                <View style={{ height: 90, backgroundColor: '#7C3AED', position: 'relative' }}>
                  <View style={{ position: 'absolute', right: -20, top: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                  <View style={{ position: 'absolute', left: -10, bottom: -30, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />
                  
                  {/* Close Button on Top Right */}
                  <Pressable
                    onPress={() => setIsDetailModalOpen(false)}
                    style={{
                      position: 'absolute',
                      right: 16,
                      top: 16,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                    }}
                  >
                    <X color='#FFFFFF' size={14} />
                  </Pressable>
                </View>

                {/* Avatar Overlap */}
                <View style={{ alignItems: 'center', marginTop: -40, zIndex: 5 }}>
                  <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFFFFF', backgroundColor: '#F1F5F9', shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, overflow: 'hidden' }}>
                    <Image
                      source={{ uri: selectedUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80' }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                </View>

                {/* Profile Meta Details */}
                <View style={{ alignItems: 'center', marginTop: 10, paddingHorizontal: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                    {selectedUser.displayName}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1, textAlign: 'center' }}>{selectedUser.email}</Text>
                  
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                    <View style={{ backgroundColor: selectedUser.role === 'admin' ? '#EEF2FF' : '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Shield color={selectedUser.role === 'admin' ? '#7C3AED' : '#64748B'} size={11} />
                      <Text style={{ fontSize: 10, color: selectedUser.role === 'admin' ? '#7C3AED' : '#475569', fontWeight: '800', textTransform: 'uppercase' }}>
                        {selectedUser.role === 'admin' ? 'Admin' : 'Sinh viên'}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: selectedUser.isActive ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, color: selectedUser.isActive ? '#15803D' : '#EF4444', fontWeight: '800', textTransform: 'uppercase' }}>
                        {selectedUser.isActive ? 'Hoạt động' : 'Bị khóa'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Modal Scroll Content */}
                <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} style={{ maxHeight: 340 }}>
                  {/* Joined Date Box */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 12 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar color='#7C3AED' size={14} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 9, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ngày gia nhập</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', marginTop: 1 }}>
                        {new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                  </View>

                  {/* Storage Quota Usage Box */}
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
                        <HardDrive color='#7C3AED' size={14} />
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>Dung lượng lưu trữ</Text>
                    </View>
                    
                    <View style={{ height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                      <View
                        style={{
                          width: `${Math.min(100, (selectedUser.usedStorage / selectedUser.storageLimit) * 100) || 0}%`,
                          height: '100%',
                          backgroundColor: '#7C3AED',
                          borderRadius: 3,
                        }}
                      />
                    </View>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        Đã dùng: <Text style={{ fontWeight: '800', color: '#1E293B' }}>{formatBytes(selectedUser.usedStorage || 0)}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        Tối đa: <Text style={{ fontWeight: '800', color: '#1E293B' }}>{formatBytes(selectedUser.storageLimit || 2 * 1024 * 1024 * 1024)}</Text>
                      </Text>
                    </View>
                  </View>

                  {/* Split Stats Dashboard */}
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 14, flexDirection: 'row' }}>
                    {/* Public */}
                    <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E2E8F0' }}>
                      <Globe color='#7C3AED' size={16} style={{ marginBottom: 3 }} />
                      <Text style={{ fontSize: 9, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 }}>Công khai</Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#7C3AED', marginTop: 1 }}>{selectedUser.publicFilesCount || 0}</Text>
                    </View>
                    
                    {/* Private */}
                    <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E2E8F0' }}>
                      <Lock color='#64748B' size={16} style={{ marginBottom: 3 }} />
                      <Text style={{ fontSize: 9, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 }}>Riêng tư</Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#475569', marginTop: 1 }}>{selectedUser.privateFilesCount || 0}</Text>
                    </View>
                    
                    {/* Reported */}
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <TriangleAlert color='#EF4444' size={16} style={{ marginBottom: 3 }} />
                      <Text style={{ fontSize: 9, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 }}>Vi phạm</Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#EF4444', marginTop: 1 }}>{selectedUser.reportedFilesCount || 0}</Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Modal Footer Actions */}
                <View style={{ flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10, backgroundColor: '#FFFFFF' }}>
                  <Pressable
                    onPress={() => setIsDetailModalOpen(false)}
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 12,
                      backgroundColor: '#F1F5F9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700' }}>Đóng</Text>
                  </Pressable>

                  {selectedUser && selectedUser._id !== currentUser?.id && selectedUser.role !== 'admin' && (
                    <>
                      {selectedUser.isActive ? (
                        <Pressable
                          onPress={() => {
                            handleBanUser(selectedUser._id, selectedUser.displayName)
                            setIsDetailModalOpen(false)
                          }}
                          style={{
                            flex: 1.3,
                            height: 42,
                            borderRadius: 12,
                            backgroundColor: '#FEF2F2',
                            borderWidth: 1,
                            borderColor: '#FEE2E2',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            gap: 6,
                          }}
                        >
                          <UserX color='#EF4444' size={14} />
                          <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '800' }}>Khóa tài khoản</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => {
                            handleUnbanUser(selectedUser._id, selectedUser.displayName)
                            setIsDetailModalOpen(false)
                          }}
                          style={{
                            flex: 1.3,
                            height: 42,
                            borderRadius: 12,
                            backgroundColor: '#DCFCE7',
                            borderWidth: 1,
                            borderColor: '#D1FAE5',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            gap: 6,
                          }}
                        >
                          <UserCheck color='#10B981' size={14} />
                          <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>Mở khóa</Text>
                        </Pressable>
                      )}
                    </>
                  )}
                </View>
              </View>
            ) : (
              <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert color='#CBD5E1' size={48} />
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 14, fontWeight: '700' }}>
                  Không có thông tin chi tiết
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── CUSTOM CONFIRMATION DIALOG ────────────────────────────────────── */}
      <Modal
        visible={confirmModal.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setConfirmModal(prev => ({ ...prev, visible: false }))} />
          
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              width: '85%',
              padding: 24,
              shadowColor: '#0F172A',
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 10,
              alignItems: 'center',
            }}
          >
            {/* Warning Icon background */}
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: confirmModal.isDestructive ? '#FEE2E2' : '#DCFCE7',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              {confirmModal.isDestructive ? (
                <ShieldAlert color='#EF4444' size={26} />
              ) : (
                <UserCheck color='#10B981' size={26} />
              )}
            </View>

            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
              {confirmModal.title}
            </Text>
            
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
              {confirmModal.message}
            </Text>

            {/* Buttons Row */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' }}>
              <Pressable
                onPress={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700' }}>Hủy</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setConfirmModal(prev => ({ ...prev, visible: false }))
                  confirmModal.onConfirm()
                }}
                style={{
                  flex: 1.2,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: confirmModal.isDestructive ? '#EF4444' : '#10B981',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: confirmModal.isDestructive ? '#EF4444' : '#10B981',
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 2,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                  {confirmModal.confirmText}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  )
}

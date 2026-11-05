import React, { useState, useRef } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  Image,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native'
import {
  TriangleAlert,
  FileText,
  Trash2,
  Check,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Sparkles,
  CircleCheck,
  Calendar,
  User,
  HardDrive,
  Eye,
  Download,
  Flag,
  MessageSquare,
  X,
  Globe,
  Lock,
  Search,
} from 'lucide-react-native'
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSelector } from 'react-redux'

import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import type { RootState } from '../../redux/store'
import { adminApi, ReportedDocInfo, DocumentReport, ReportedDocsResponse } from '../../api/adminApi'
import { useToast } from '../../components/ui/ToastProvider'
import Svg, { Circle, Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg'

function formatBytes(bytes?: number) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminReportedDocsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const toast = useToast()
  const user = useSelector((state: RootState) => state.auth.user)

  // Separate list caches
  const [allDocs, setAllDocs] = useState<ReportedDocInfo[]>([])
  const [reportedDocs, setReportedDocs] = useState<ReportedDocInfo[]>([])

  const [allPage, setAllPage] = useState(1)
  const [reportedPage, setReportedPage] = useState(1)

  const [allTotalPages, setAllTotalPages] = useState(1)
  const [reportedTotalPages, setReportedTotalPages] = useState(1)

  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const route = useRoute<any>()
  const tabParam = route.params?.tab

  // Tabs and Search states
  const [activeTab, setActiveTab] = useState<'all' | 'reported'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  React.useEffect(() => {
    if (tabParam === 'all' || tabParam === 'reported') {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Stats state
  const [stats, setStats] = useState<{ totalFiles: number; totalReported: number; totalCloudSizeInMb: number } | null>(null)

  // Reports Modal states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<ReportedDocInfo | null>(null)
  const [reportList, setReportList] = useState<DocumentReport[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean
    title: string
    message: string
    confirmText: string
    cancelText: string
    confirmColor: string
    onConfirm: () => void
  }>({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    confirmColor: '#EF4444',
    onConfirm: () => {},
  })

  const isLoadingRef = useRef(false)
  const isMomentumRef = useRef(false)
  const [refreshEnabled, setRefreshEnabled] = useState(true)

  const fetchStats = async () => {
    try {
      const data = await adminApi.getDashboardStats()
      setStats({
        totalFiles: data.documents.totalFiles,
        totalReported: data.documents.totalReported,
        totalCloudSizeInMb: data.documents.totalCloudSizeInMb,
      })
    } catch (err) {
      console.warn('Cannot fetch reported docs stats:', err)
    }
  }

  const loadDocs = async (targetPage = 1, isRefresh = false) => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true

    const isAll = activeTab === 'all'
    
    console.log('[loadDocs] activeTab:', activeTab, 'targetPage:', targetPage, 'isRefresh:', isRefresh)

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      let data: ReportedDocsResponse
      if (isAll) {
        data = await adminApi.getAllDocs(targetPage, 10, searchQuery.trim())
        console.log('[loadDocs] getAllDocs successful. items:', data.items?.length, 'total:', data.meta?.totalItems)
        
        setAllDocs(data.items || [])
        setAllPage(targetPage)
        setAllTotalPages(data.meta?.totalPages || 1)
      } else {
        data = await adminApi.getReportedDocs(targetPage, 10, searchQuery.trim())
        console.log('[loadDocs] getReportedDocs successful. items:', data.items?.length, 'total:', data.meta?.totalItems)
        
        setReportedDocs(data.items || [])
        setReportedPage(targetPage)
        setReportedTotalPages(data.meta?.totalPages || 1)
      }
    } catch (err: any) {
      console.error('[loadDocs] Error loading documents:', err)
      toast.error(err.toString() || 'Không thể tải danh sách tài liệu.')
    } finally {
      isLoadingRef.current = false
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      fetchStats()
      const hasData = activeTab === 'all' ? allDocs.length > 0 : reportedDocs.length > 0
      if (!hasData) {
        loadDocs(1)
      }
    }, [activeTab, allDocs.length, reportedDocs.length])
  )

  const handleRejectReport = (id: string) => {
    setConfirmModal({
      visible: true,
      title: 'Giữ lại tài liệu',
      message: 'Bạn có chắc chắn muốn giữ lại tài liệu này và gỡ bỏ tất cả báo cáo vi phạm?',
      confirmText: 'Giữ lại',
      cancelText: 'Hủy',
      confirmColor: '#059669',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }))
        try {
          const res = await adminApi.moderateDocument(id, 'KEEP')
          toast.success(res.message || 'Đã giữ lại tài liệu và gỡ cờ vi phạm.')
          // Remove from lists
          setAllDocs((prev) => prev.filter((d) => d._id !== id))
          setReportedDocs((prev) => prev.filter((d) => d._id !== id))
          // Update stats
          setStats((prevStats) => {
            if (!prevStats) return null
            return {
              ...prevStats,
              totalReported: Math.max(0, prevStats.totalReported - 1),
            }
          })
          // Close reports modal if open for this doc
          setIsReportModalOpen(false)
        } catch (err: any) {
          toast.error(err.toString())
        }
      }
    })
  }

  const handleDeleteViolated = (id: string) => {
    setConfirmModal({
      visible: true,
      title: 'Xóa file học liệu',
      message: 'Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu này? Sinh viên đăng tải sẽ bị ghi nhận 1 lần vi phạm.',
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy',
      confirmColor: '#EF4444',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }))
        try {
          const res = await adminApi.moderateDocument(id, 'DELETE')
          toast.success(res.message || 'Đã xóa tài liệu và ghi nhận vi phạm.')
          // Remove from lists
          setAllDocs((prev) => prev.filter((d) => d._id !== id))
          setReportedDocs((prev) => prev.filter((d) => d._id !== id))
          // Update stats
          setStats((prevStats) => {
            if (!prevStats) return null
            return {
              ...prevStats,
              totalFiles: Math.max(0, prevStats.totalFiles - 1),
              totalReported: Math.max(0, prevStats.totalReported - 1),
            }
          })
          // Close reports modal if open for this doc
          setIsReportModalOpen(false)
        } catch (err: any) {
          toast.error(err.toString())
        }
      }
    })
  }

  const handleViewReports = async (doc: ReportedDocInfo) => {
    setSelectedDoc(doc)
    setIsReportModalOpen(true)
    setIsLoadingReports(true)
    try {
      const list = await adminApi.getDocumentReports(doc._id)
      setReportList(list)
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể lấy danh sách lý do báo cáo.')
    } finally {
      setIsLoadingReports(false)
    }
  }

  const renderPaginationControls = () => {
    const isAll = activeTab === 'all'
    const currentPage = isAll ? allPage : reportedPage
    const totalPages = isAll ? allTotalPages : reportedTotalPages
    const docsCount = isAll ? allDocs.length : reportedDocs.length

    if (docsCount === 0 || totalPages <= 1) return null

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
          onPress={() => loadDocs(currentPage - 1)}
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
              onPress={() => loadDocs(page as number)}
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
          onPress={() => loadDocs(currentPage + 1)}
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
            source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80' }}
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
        data={activeTab === 'all' ? allDocs : reportedDocs}
        keyExtractor={(item, index) => `${item._id}-${index}`}
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
              loadDocs(1, true)
            }}
            colors={['#7C3AED']}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 20 }}>
            {/* Header Banner */}
            <View style={{ marginBottom: 16, borderRadius: 24, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <Svg height="100%" width="100%">
                  <Defs>
                    <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor={activeTab === 'all' ? '#EEF2FF' : '#FFF1F2'} />
                      <Stop offset="100%" stopColor={activeTab === 'all' ? '#E0E7FF' : '#FFF5F5'} />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#grad)" />
                  <Circle cx="90%" cy="10%" r="50" fill={activeTab === 'all' ? '#C7D2FE' : '#FFE4E6'} opacity="0.6" />
                  <Circle cx="80%" cy="90%" r="30" fill={activeTab === 'all' ? '#DDD6FE' : '#FECDD3'} opacity="0.4" />
                </Svg>
              </View>
              <View
                style={{
                  padding: 20,
                  borderWidth: 1.5,
                  borderColor: activeTab === 'all' ? '#C7D2FE' : '#FEE2E2',
                  borderRadius: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: activeTab === 'all' ? '#4F46E5' : '#EF4444', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    {activeTab === 'all' ? 'Quản lý File hệ thống' : 'Kiểm duyệt báo cáo'}
                  </Text>
                  <Text style={{ color: activeTab === 'all' ? '#312E81' : '#991B1B', fontSize: 26, fontWeight: '900', marginTop: 4, lineHeight: 32 }}>
                    {activeTab === 'all' ? 'Tài Liệu' : 'File Vi Phạm'}
                  </Text>
                  <Text style={{ color: activeTab === 'all' ? '#3730A3' : '#7F1D1D', marginTop: 8, lineHeight: 18, fontSize: 13, opacity: 0.8 }}>
                    {activeTab === 'all'
                      ? 'Xem và dọn dẹp các tệp tin học liệu sinh viên tải lên hệ thống học tập.'
                      : 'Xem xét báo cáo vi phạm, quyết định giữ lại hoặc xóa bỏ vĩnh viễn.'}
                  </Text>
                </View>
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 18,
                    backgroundColor: activeTab === 'all' ? '#7C3AED' : '#EF4444',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: activeTab === 'all' ? '#7C3AED' : '#EF4444',
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 3,
                  }}
                >
                  {activeTab === 'all' ? (
                    <FileText color='#FFFFFF' size={24} />
                  ) : (
                    <ShieldAlert color='#FFFFFF' size={24} />
                  )}
                </View>
              </View>
            </View>

            {/* Split Metrics Stats Cards */}
            {stats && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {/* 1. Tổng số file */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText color='#2563EB' size={14} />
                  </View>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' }}>Tổng File</Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#1E293B' }}>{stats.totalFiles}</Text>
                </View>

                {/* 2. Dung lượng đám mây */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                    <HardDrive color='#059669' size={14} />
                  </View>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' }}>Dung lượng</Text>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B' }}>
                    {(stats.totalCloudSizeInMb || 0).toFixed(1)} MB
                  </Text>
                </View>

                {/* 3. Bị báo cáo */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center' }}>
                    <TriangleAlert color='#EF4444' size={14} />
                  </View>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' }}>Bị báo cáo</Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#EF4444' }}>{stats.totalReported}</Text>
                </View>
              </View>
            )}

            {/* Segmented control tab switcher */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4, marginBottom: 16 }}>
              <Pressable
                onPress={() => setActiveTab('all')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: activeTab === 'all' ? '#FFFFFF' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: activeTab === 'all' ? '#0F172A' : 'transparent',
                  shadowOpacity: activeTab === 'all' ? 0.05 : 0,
                  shadowRadius: 4,
                  elevation: activeTab === 'all' ? 1 : 0,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: activeTab === 'all' ? '#7C3AED' : '#64748B' }}>
                  Tất cả tài liệu
                </Text>
              </Pressable>
              
              <Pressable
                onPress={() => setActiveTab('reported')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: activeTab === 'reported' ? '#FFFFFF' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: activeTab === 'reported' ? '#0F172A' : 'transparent',
                  shadowOpacity: activeTab === 'reported' ? 0.05 : 0,
                  shadowRadius: 4,
                  elevation: activeTab === 'reported' ? 1 : 0,
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: activeTab === 'reported' ? '#F43F5E' : '#64748B' }}>
                  Tài liệu vi phạm
                </Text>
                {stats && stats.totalReported > 0 && (
                  <View style={{ backgroundColor: '#F43F5E', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 999 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '900' }}>{stats.totalReported}</Text>
                  </View>
                )}
              </Pressable>
            </View>

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
                  onSubmitEditing={() => loadDocs(1)}
                  placeholder={activeTab === 'all' ? 'Tìm theo tên file hoặc người tải...' : 'Tìm tài liệu bị báo cáo...'}
                  placeholderTextColor='#94A3B8'
                  style={{ flex: 1, marginLeft: 10, color: '#0F172A', fontSize: 14 }}
                />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 28,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 40,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 20,
                shadowColor: '#0F172A',
                shadowOpacity: 0.02,
                shadowRadius: 12,
                elevation: 1,
              }}
            >
              <CircleCheck color='#10B981' size={52} />
              <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '900', marginTop: 16, textAlign: 'center' }}>
                {activeTab === 'all' ? 'Danh sách trống!' : 'Hàng đợi trống!'}
              </Text>
              <Text style={{ color: '#64748B', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
                {activeTab === 'all'
                  ? 'Hệ thống chưa ghi nhận bất kỳ tệp tài liệu học tập nào.'
                  : 'Tuyệt vời, hiện tại không có tài liệu học tập nào bị gắn cờ báo cáo vi phạm.'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const latestVersion = item.versions?.[item.versions.length - 1]
          const sizeLabel = latestVersion ? formatBytes(latestVersion.fileSize) : 'N/A'
          const authorLabel = item.uploadedBy?.displayName || item.uploadedBy?.email || 'Ẩn danh'
          const dateLabel = new Date(item.updatedAt).toLocaleDateString('vi-VN')

          return (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderLeftWidth: 5,
                borderLeftColor: activeTab === 'all' ? '#7C3AED' : '#F43F5E',
                padding: 18,
                marginBottom: 16,
                shadowColor: '#0F172A',
                shadowOpacity: 0.03,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 1,
              }}
            >
              {/* Header Title Row */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 }}>
                  <FileText color={activeTab === 'all' ? '#7C3AED' : '#F43F5E'} size={20} />
                  <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 16, flex: 1 }} numberOfLines={1}>
                    {item.title}
                  </Text>
                </View>

                {/* Status Badges */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {activeTab === 'all' && item.isReported && (
                    <View style={{ backgroundColor: '#FFE4E6', borderWidth: 1, borderColor: '#FECDD3', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <TriangleAlert color='#E11D48' size={11} />
                      <Text style={{ color: '#E11D48', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>Bị báo cáo</Text>
                    </View>
                  )}
                  <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    {item.isPublic ? <Globe color='#64748B' size={10} /> : <Lock color='#64748B' size={10} />}
                    <Text style={{ color: '#64748B', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>
                      {item.isPublic ? 'Công khai' : 'Riêng tư'}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18, marginBottom: 12 }} numberOfLines={2}>
                {item.description || 'Không có mô tả tài liệu.'}
              </Text>

              {/* Stats Row */}
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Eye size={12} color='#64748B' />
                  <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>{item.viewCount || 0} xem</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Download size={12} color='#64748B' />
                  <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>{item.downloadCount || 0} tải</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <HardDrive size={12} color='#64748B' />
                  <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>{sizeLabel}</Text>
                </View>
              </View>

              {/* Uploader and Date Box */}
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderStyle: 'dashed',
                  padding: 12,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <User size={13} color='#475569' />
                  <Text style={{ color: '#475569', fontSize: 12 }}>
                    Người đăng: <Text style={{ fontWeight: '800', color: '#1E293B' }}>{authorLabel}</Text>
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Calendar size={13} color='#94A3B8' />
                  <Text style={{ color: '#64748B', fontSize: 11 }}>
                    Cập nhật: {dateLabel} (Phiên bản V{item.versions?.length || 1})
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              {activeTab === 'all' ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  {/* Xem button */}
                  {!item.isPublic ? (
                    <Pressable
                      onPress={() => toast.warning('Tài liệu này ở chế độ riêng tư, không thể xem.')}
                      style={{
                        flex: 1,
                        height: 38,
                        borderRadius: 12,
                        backgroundColor: '#F1F5F9',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                        opacity: 0.45,
                      }}
                    >
                      <Lock color='#94A3B8' size={14} />
                      <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '800' }}>Xem</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() =>
                        navigation.navigate('DocumentViewer', {
                          documentId: item._id,
                          documentTitle: item.title,
                          sourceSubject: 'Tài liệu',
                        })
                      }
                      style={{
                        flex: 1,
                        height: 38,
                        borderRadius: 12,
                        backgroundColor: '#EEF2FF',
                        borderWidth: 1,
                        borderColor: '#DDD6FE',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                      }}
                    >
                      <Eye color='#7C3AED' size={14} />
                      <Text style={{ color: '#7C3AED', fontSize: 12, fontWeight: '800' }}>Xem</Text>
                    </Pressable>
                  )}

                  {/* Xóa button */}
                  <Pressable
                    onPress={() => handleDeleteViolated(item._id)}
                    style={{
                      flex: 1.2,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: '#FEE2E2',
                      borderWidth: 1,
                      borderColor: '#FCA5A5',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                    }}
                  >
                    <Trash2 color='#DC2626' size={14} />
                    <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '800' }}>Xóa vĩnh viễn</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
                  {/* Xem */}
                  {!item.isPublic ? (
                    <Pressable
                      onPress={() => toast.warning('Tài liệu này ở chế độ riêng tư, không thể xem.')}
                      style={{
                        flex: 1.1,
                        height: 38,
                        borderRadius: 12,
                        backgroundColor: '#F1F5F9',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 4,
                        opacity: 0.45,
                      }}
                    >
                      <Lock color='#94A3B8' size={13} />
                      <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '800' }}>Xem</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() =>
                        navigation.navigate('DocumentViewer', {
                          documentId: item._id,
                          documentTitle: item.title,
                          sourceSubject: 'Báo cáo',
                        })
                      }
                      style={{
                        flex: 1.1,
                        height: 38,
                        borderRadius: 12,
                        backgroundColor: '#EEF2FF',
                        borderWidth: 1,
                        borderColor: '#DDD6FE',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 4,
                      }}
                    >
                      <Eye color='#7C3AED' size={13} />
                      <Text style={{ color: '#7C3AED', fontSize: 10, fontWeight: '800' }}>Xem</Text>
                    </Pressable>
                  )}

                  {/* Lý do */}
                  <Pressable
                    onPress={() => handleViewReports(item)}
                    style={{
                      flex: 1.1,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: '#FEF3C7',
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 4,
                    }}
                  >
                    <Flag color='#B45309' size={13} />
                    <Text style={{ color: '#B45309', fontSize: 10, fontWeight: '800' }}>Lý do</Text>
                  </Pressable>

                  {/* Giữ lại */}
                  <Pressable
                    onPress={() => handleRejectReport(item._id)}
                    style={{
                      flex: 1.2,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: '#D1FAE5',
                      borderWidth: 1,
                      borderColor: '#A7F3D0',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 4,
                    }}
                  >
                    <Check color='#047857' size={13} />
                    <Text style={{ color: '#047857', fontSize: 10, fontWeight: '800' }}>Giữ lại</Text>
                  </Pressable>

                  {/* Xóa file */}
                  <Pressable
                    onPress={() => handleDeleteViolated(item._id)}
                    style={{
                      flex: 1.2,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: '#FEE2E2',
                      borderWidth: 1,
                      borderColor: '#FCA5A5',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 4,
                    }}
                  >
                    <Trash2 color='#DC2626' size={13} />
                    <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '800' }}>Xóa file</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )
        }}
        ListFooterComponent={renderPaginationControls()}
      />

      <Modal
        visible={isReportModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsReportModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => setIsReportModalOpen(false)}
          />
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 28,
              width: '100%',
              maxWidth: 340,
              maxHeight: '75%',
              paddingBottom: 20,
              shadowColor: '#0F172A',
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 10,
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 18,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A' }}>Lý do báo cáo</Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontStyle: 'italic' }} numberOfLines={1}>
                  {selectedDoc?.title}
                </Text>
              </View>
              <Pressable
                onPress={() => setIsReportModalOpen(false)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X color='#64748B' size={14} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18 }}>
              {isLoadingReports ? (
                <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 12, fontWeight: '700' }}>
                    Đang tải danh sách báo cáo...
                  </Text>
                </View>
              ) : reportList.length > 0 ? (
                <View style={{ gap: 12 }}>
                  {reportList.map((report) => {
                    const avatarUrl = report.reportedBy?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${report.reportedBy?.displayName || report.reportedBy?.email}&backgroundColor=c0aede`
                    return (
                      <View
                        key={report._id}
                        style={{
                          backgroundColor: '#F8FAFC',
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          padding: 14,
                          gap: 10,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Image
                            source={{ uri: avatarUrl }}
                            style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: '#FFFFFF' }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }} numberOfLines={1}>
                              {report.reportedBy?.displayName || 'Ẩn danh'}
                            </Text>
                            <Text style={{ fontSize: 10, color: '#64748B', marginTop: 0.5 }} numberOfLines={1}>
                              {report.reportedBy?.email}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 9, color: '#94A3B8', fontWeight: '800' }}>
                            {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                          </Text>
                        </View>

                        <View
                          style={{
                            backgroundColor: '#FFF5F5',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#FEE2E2',
                            padding: 10,
                            flexDirection: 'row',
                            gap: 6,
                          }}
                        >
                          <MessageSquare color='#EF4444' size={13} style={{ marginTop: 1.5 }} />
                          <Text style={{ fontSize: 12, color: '#991B1B', flex: 1, lineHeight: 16, fontWeight: '600' }}>
                            {report.reason}
                          </Text>
                        </View>
                      </View>
                    )
                  })}
                </View>
              ) : (
                <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert color='#CBD5E1' size={44} />
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 12, fontWeight: '700' }}>
                    Chưa có báo cáo nào cho tài liệu này
                  </Text>
                </View>
              )}
            </ScrollView>

            {selectedDoc && (
              <View
                style={{
                  flexDirection: 'row',
                  paddingHorizontal: 18,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: '#F1F5F9',
                  gap: 8,
                }}
              >
                <Pressable
                  onPress={() => handleRejectReport(selectedDoc._id)}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: '#E6FBF0',
                    borderWidth: 1,
                    borderColor: '#A7F3D0',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#047857', fontSize: 13, fontWeight: '800' }}>Giữ lại (Bỏ qua)</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleDeleteViolated(selectedDoc._id)}
                  style={{
                    flex: 1.1,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: '#EF4444',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#EF4444',
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 1,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Xóa file</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Confirmation Modal */}
      <Modal
        visible={confirmModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 320,
              alignItems: 'center',
              shadowColor: '#0F172A',
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 10,
            }}
          >
            {/* Header Icon */}
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: confirmModal.confirmColor === '#EF4444' ? '#FEE2E2' : '#D1FAE5',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              {confirmModal.confirmColor === '#EF4444' ? (
                <Trash2 color="#EF4444" size={24} />
              ) : (
                <Check color="#059669" size={24} />
              )}
            </View>

            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
              {confirmModal.title}
            </Text>

            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 10, textAlign: 'center', lineHeight: 18, fontWeight: '500' }}>
              {confirmModal.message}
            </Text>

            {/* Buttons Row */}
            <View style={{ flexDirection: 'row', width: '100%', gap: 10, marginTop: 24 }}>
              <Pressable
                onPress={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '800' }}>
                  {confirmModal.cancelText}
                </Text>
              </Pressable>

              <Pressable
                onPress={confirmModal.onConfirm}
                style={{
                  flex: 1.2,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: confirmModal.confirmColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: confirmModal.confirmColor,
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

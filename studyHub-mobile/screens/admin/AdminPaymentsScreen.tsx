import React, { useEffect, useState, useRef } from 'react'
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, TextInput, View, Modal, ScrollView, Linking } from 'react-native'
import { ArrowLeft, Search, Activity, DollarSign, CheckCircle, CreditCard, Clock, Trash2, ChevronLeft, ChevronRight, Calendar, User, Hash, Layers, HardDrive, Sparkles, AlertCircle } from 'lucide-react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSelector } from 'react-redux'
import type { RootState } from '../../redux/store'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import { adminApi, AdminPaymentItem, PaymentStatsResponse } from '../../api/adminApi'
import { useToast } from '../../components/ui/ToastProvider'
import Svg, { Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg'

export default function AdminPaymentsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute<any>()
  const currentUser = useSelector((state: RootState) => state.auth.user)
  const fromDashboard = route.params?.fromDashboard === true
  const toast = useToast()

  const [payments, setPayments] = useState<AdminPaymentItem[]>([])
  const [stats, setStats] = useState<PaymentStatsResponse['overview'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshEnabled, setRefreshEnabled] = useState(true)
  const isMomentumRef = useRef(false)
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Filters & Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'paid', 'pending', 'cancelled', 'failed', 'expired'

  const fetchStats = async () => {
    try {
      const data = await adminApi.getPaymentStats()
      setStats(data.overview)
    } catch (err: any) {
      console.warn('Cannot fetch payment stats:', err)
    }
  }

  const fetchPayments = async (pageNum = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const result = await adminApi.getAllPayments(pageNum, 10, search, statusFilter)
      setPayments(result.data || [])
      setPage(result.meta.page)
      setTotalPages(result.meta.totalPages)
    } catch (err: any) {
      toast.error(err.toString() || 'Lỗi khi tải lịch sử giao dịch.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchStats(), fetchPayments(1, true)])
    setRefreshing(false)
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchPayments(1)
  }, [search, statusFilter])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  const getStatusBadge = (status: AdminPaymentItem['status']) => {
    let bg = '#F1F5F9'
    let color = '#475569'
    let text = 'Đang chờ'

    if (status === 'paid') {
      bg = '#ECFDF5'
      color = '#047857'
      text = 'Thành công'
    } else if (status === 'pending') {
      bg = '#FFFBEB'
      color = '#B45309'
      text = 'Chờ xử lý'
    } else if (status === 'cancelled') {
      bg = '#F1F5F9'
      color = '#475569'
      text = 'Đã hủy'
    } else if (status === 'failed') {
      bg = '#FFF1F2'
      color = '#BE123C'
      text = 'Thất bại'
    } else if (status === 'expired') {
      bg = '#EEF2FF'
      color = '#4338CA'
      text = 'Hết hạn'
    }

    return (
      <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
        <Text style={{ color, fontSize: 10, fontWeight: '800' }}>{text}</Text>
      </View>
    )
  }

  const renderPaginationControls = () => {
    const currentPage = page
    const totalPagesCount = totalPages
    const paymentsCount = payments.length

    if (paymentsCount === 0 || totalPagesCount <= 1) return null

    const getPageNumbers = () => {
      const pages: (number | string)[] = []
      if (totalPagesCount <= 5) {
        for (let i = 1; i <= totalPagesCount; i++) {
          pages.push(i)
        }
      } else {
        if (currentPage <= 3) {
          pages.push(1, 2, 3, 4, '...', totalPagesCount)
        } else if (currentPage >= totalPagesCount - 2) {
          pages.push(1, '...', totalPagesCount - 3, totalPagesCount - 2, totalPagesCount - 1, totalPagesCount)
        } else {
          pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPagesCount)
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
          onPress={() => fetchPayments(currentPage - 1)}
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
        {pageNumbers.map((pageNo, idx) => {
          if (pageNo === '...') {
            return (
              <View key={`ellipsis-${idx}`} style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '800' }}>...</Text>
              </View>
            )
          }

          const isSelected = pageNo === currentPage
          return (
            <Pressable
              key={`page-${pageNo}`}
              onPress={() => fetchPayments(pageNo as number)}
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
                {pageNo}
              </Text>
            </Pressable>
          )
        })}

        {/* Right Arrow */}
        <Pressable
          disabled={currentPage === totalPagesCount}
          onPress={() => fetchPayments(currentPage + 1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: currentPage === totalPagesCount ? 0.3 : 1,
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

  const totalTx = stats ? stats.totalTransactions : 0
  const totalSafe = totalTx > 0 ? totalTx : 1
  const successPercent = stats ? ((stats.successfulTransactions / totalSafe) * 100).toFixed(1) : '0'
  const pendingPercent = stats ? ((stats.pendingTransactions / totalSafe) * 100).toFixed(1) : '0'
  const cancelledPercent = stats ? ((stats.cancelledTransactions / totalSafe) * 100).toFixed(1) : '0'
  const expiredPercent = stats ? ((stats.expiredTransactions / totalSafe) * 100).toFixed(1) : '0'
  const failedPercent = stats ? ((stats.failedTransactions / totalSafe) * 100).toFixed(1) : '0'

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
      {/* Conditional Header Section */}
      {fromDashboard ? (
        <View
          style={{
            paddingTop: 54,
            paddingHorizontal: 20,
            paddingBottom: 16,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <Pressable
            onPress={() => navigation.navigate('AdminDashboard' as any)}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <ArrowLeft size={20} color='#0F172A' />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Giao dịch hệ thống</Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>Xem doanh thu & hóa đơn nền tảng</Text>
          </View>
        </View>
      ) : (
        <>
          {/* Brand Header */}
          <View
            style={{
              paddingTop: 54,
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
              NEXUS<Text style={{ color: '#8678EA', fontStyle: 'normal' }}>.</Text>
            </Text>
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
                source={{ uri: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80' }}
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
        </>
      )}

      {/* Main List */}
      <FlatList
        data={payments}
        keyExtractor={(item) => item._id}
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
              handleRefresh()
            }}
            colors={['#8678EA']}
          />
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 20 }}>
            {/* Banner Card styled exactly like the other dashboard options */}
            <View style={{ marginBottom: 24, borderRadius: 24, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <Svg height="100%" width="100%">
                  <Defs>
                    <LinearGradient id="payBannerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#EEF2FF" />
                      <Stop offset="100%" stopColor="#E0F2FE" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#payBannerGrad)" />
                  <Circle cx="90%" cy="10%" r="50" fill="#C7D2FE" opacity="0.5" />
                  <Circle cx="80%" cy="90%" r="30" fill="#BAE6FD" opacity="0.4" />
                </Svg>
              </View>
              <View
                style={{
                  padding: 20,
                  borderWidth: 1.5,
                  borderColor: '#C7D2FE',
                  borderRadius: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: '#4F46E5', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Ban điều hành
                  </Text>
                  <Text style={{ color: '#1E1B4B', fontSize: 26, fontWeight: '900', marginTop: 4, lineHeight: 32 }}>
                    Giao Dịch
                  </Text>
                  <Text style={{ color: '#312E81', marginTop: 8, lineHeight: 18, fontSize: 13, opacity: 0.8 }}>
                    Theo dõi doanh thu, lịch sử mua các gói dịch vụ nâng cấp tài khoản của sinh viên trên toàn hệ thống.
                  </Text>
                </View>
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 18,
                    backgroundColor: '#8678EA',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#8678EA',
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 3,
                  }}
                >
                  <CreditCard color='#FFFFFF' size={24} />
                </View>
              </View>
            </View>

            {/* Overview cards (Total Revenue & Success Rate) */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
              {/* Card 1: Total Revenue */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.02,
                  shadowRadius: 8,
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#FEF3C7',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DollarSign size={18} color='#D97706' />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>
                    Tổng doanh thu
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A', marginTop: 4 }} numberOfLines={1}>
                    {stats ? formatCurrency(stats.totalRevenue) : '0 ₫'}
                  </Text>
                </View>
              </View>

              {/* Card 2: Success Rate */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.02,
                  shadowRadius: 8,
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#EEF2FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Activity size={18} color='#4F46E5' />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>
                    Tỷ lệ thành công
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A', marginTop: 4 }} numberOfLines={1}>
                    {stats ? `${stats.successRate.toFixed(1)}%` : '0%'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Visual breakdown progress bar (Mobile-friendly replacement for complex web charts) */}
            {stats ? (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  marginTop: 14,
                  gap: 16,
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.02,
                  shadowRadius: 8,
                  elevation: 1,
                }}
              >
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        backgroundColor: '#EEF2FF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#E0F2FE',
                      }}
                    >
                      <Activity color='#4F46E5' size={18} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>
                        Phân Tích Trạng Thái Giao Dịch
                      </Text>
                      <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                        Tổng số: {stats.totalTransactions} giao dịch nền tảng
                      </Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748B' }}>Toàn bộ</Text>
                  </View>
                </View>

                {/* Visual bar stacked */}
                <View style={{ height: 16, borderRadius: 8, backgroundColor: '#F1F5F9', flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' }}>
                  {stats.successfulTransactions > 0 && (
                    <View style={{ flex: stats.successfulTransactions, backgroundColor: '#10B981', marginRight: (stats.pendingTransactions > 0 || stats.cancelledTransactions > 0 || stats.failedTransactions > 0 || stats.expiredTransactions > 0) ? 2 : 0 }} />
                  )}
                  {stats.pendingTransactions > 0 && (
                    <View style={{ flex: stats.pendingTransactions, backgroundColor: '#F59E0B', marginRight: (stats.cancelledTransactions > 0 || stats.failedTransactions > 0 || stats.expiredTransactions > 0) ? 2 : 0 }} />
                  )}
                  {stats.cancelledTransactions > 0 && (
                    <View style={{ flex: stats.cancelledTransactions, backgroundColor: '#94A3B8', marginRight: (stats.failedTransactions > 0 || stats.expiredTransactions > 0) ? 2 : 0 }} />
                  )}
                  {stats.failedTransactions > 0 && (
                    <View style={{ flex: stats.failedTransactions, backgroundColor: '#EF4444', marginRight: stats.expiredTransactions > 0 ? 2 : 0 }} />
                  )}
                  {stats.expiredTransactions > 0 && (
                    <View style={{ flex: stats.expiredTransactions, backgroundColor: '#6366F1' }} />
                  )}
                </View>

                {/* 6 Premium Stats Cards in a 2x3 Grid */}
                <View style={{ gap: 10 }}>
                  {/* Row 1 */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {/* Card 1: Success */}
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 20,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderLeftWidth: 4,
                        borderLeftColor: '#10B981',
                        shadowColor: '#10B981',
                        shadowOpacity: 0.03,
                        shadowRadius: 8,
                        elevation: 1,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle size={14} color='#10B981' />
                        </View>
                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803D' }}>{successPercent}%</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 12 }}>
                        {stats.successfulTransactions}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 2 }}>Thành công</Text>
                    </View>

                    {/* Card 2: Pending */}
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 20,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderLeftWidth: 4,
                        borderLeftColor: '#F59E0B',
                        shadowColor: '#F59E0B',
                        shadowOpacity: 0.03,
                        shadowRadius: 8,
                        elevation: 1,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center' }}>
                          <Clock size={14} color='#F59E0B' />
                        </View>
                        <View style={{ backgroundColor: '#FEF9C3', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>{pendingPercent}%</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 12 }}>
                        {stats.pendingTransactions}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 2 }}>Chờ xử lý</Text>
                    </View>
                  </View>

                  {/* Row 2 */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {/* Card 3: Cancelled */}
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 20,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderLeftWidth: 4,
                        borderLeftColor: '#94A3B8',
                        shadowColor: '#94A3B8',
                        shadowOpacity: 0.03,
                        shadowRadius: 8,
                        elevation: 1,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={14} color='#64748B' />
                        </View>
                        <View style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569' }}>{cancelledPercent}%</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 12 }}>
                        {stats.cancelledTransactions}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 2 }}>Đã hủy</Text>
                    </View>

                    {/* Card 4: Failed */}
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 20,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderLeftWidth: 4,
                        borderLeftColor: '#EF4444',
                        shadowColor: '#EF4444',
                        shadowOpacity: 0.03,
                        shadowRadius: 8,
                        elevation: 1,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#FFF2F2', alignItems: 'center', justifyContent: 'center' }}>
                          <AlertCircle size={14} color='#EF4444' />
                        </View>
                        <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#B91C1C' }}>{failedPercent}%</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 12 }}>
                        {stats.failedTransactions}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 2 }}>Thất bại</Text>
                    </View>
                  </View>

                  {/* Card 5: Expired (Full width) */}
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 20,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderLeftWidth: 4,
                      borderLeftColor: '#6366F1',
                      shadowColor: '#6366F1',
                      shadowOpacity: 0.03,
                      shadowRadius: 8,
                      elevation: 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={14} color='#6366F1' />
                      </View>
                      <View style={{ backgroundColor: '#E0E7FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#4338CA' }}>{expiredPercent}%</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 12 }}>
                      {stats.expiredTransactions}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 2 }}>Hết hạn</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Filter Tabs Segmented (Horizontal Scrollable để tránh bị tràn màn hình điện thoại) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 4,
                paddingVertical: 4,
                gap: 8,
              }}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginTop: 18,
              }}
            >
              {[
                { label: 'Tất cả', value: 'all' },
                { label: 'Thành công', value: 'paid' },
                { label: 'Chờ xử lý', value: 'pending' },
                { label: 'Đã hủy', value: 'cancelled' },
                { label: 'Thất bại', value: 'failed' },
                { label: 'Đã hết hạn', value: 'expired' },
              ].map((tab) => (
                <Pressable
                  key={tab.value}
                  onPress={() => setStatusFilter(tab.value)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    backgroundColor: statusFilter === tab.value ? '#8678EA' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: statusFilter === tab.value ? '#FFFFFF' : '#64748B',
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Search Bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 16,
                paddingHorizontal: 14,
                marginTop: 14,
                height: 48,
              }}
            >
              <Search size={18} color='#94A3B8' style={{ marginRight: 10 }} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={() => fetchPayments(1)}
                placeholder='Tìm theo mã đơn hoặc email...'
                placeholderTextColor='#94A3B8'
                style={{ flex: 1, fontSize: 14, color: '#0F172A' }}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const email = item.userId?.email || 'Thành viên ẩn danh'
          
          let statusColor = '#64748B'
          let statusBg = '#F1F5F9'
          let statusText = 'Đang chờ'
          let StatusIcon = Activity

          if (item.status === 'paid') {
            statusColor = '#10B981'
            statusBg = '#E6FBF0'
            statusText = 'Thành công'
            StatusIcon = CheckCircle
          } else if (item.status === 'cancelled' || item.status === 'failed') {
            statusColor = '#EF4444'
            statusBg = '#FFF5F5'
            statusText = 'Đã hủy'
            StatusIcon = Trash2
          } else if (item.status === 'expired') {
            statusColor = '#F59E0B'
            statusBg = '#FEF3C7'
            statusText = 'Hết hạn'
            StatusIcon = Clock
          }

          return (
            <Pressable
              onPress={() => {
                setSelectedPayment(item)
                setIsDetailModalOpen(true)
              }}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 12,
                shadowColor: '#0F172A',
                shadowOpacity: 0.02,
                shadowRadius: 10,
                elevation: 2,
                overflow: 'hidden',
                flexDirection: 'row',
              }}
            >
              {/* Status indicator line on the left */}
              <View style={{ width: 5, backgroundColor: statusColor }} />
              
              <View style={{ flex: 1, padding: 16 }}>
                {/* Header Row: User Info & Status */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 10 }}>
                    {/* Status Circle Icon */}
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: statusBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <StatusIcon size={16} color={statusColor} />
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }} numberOfLines={1}>
                        {email}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2, fontWeight: '600' }}>
                        Mã đơn: #{item.orderCode}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Status Badge */}
                  <View style={{ backgroundColor: statusBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: statusColor, fontSize: 10, fontWeight: '800' }}>{statusText}</Text>
                  </View>
                </View>

                {/* Details Section */}
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: '#F1F5F9',
                    borderStyle: 'dashed',
                    marginTop: 12,
                    paddingTop: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>Gói nâng cấp</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#475569', marginTop: 3 }}>
                      {item.planName}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1, fontWeight: '500' }}>
                      Thời hạn: {item.durationDays} ngày
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>Số tiền</Text>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A', marginTop: 3 }}>
                      {formatCurrency(item.amount)}
                    </Text>
                  </View>
                </View>

                {/* Footer Time Section */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 10,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: '#F8FAFC',
                    gap: 6,
                  }}
                >
                  <Clock size={11} color='#94A3B8' />
                  <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '600' }}>
                    Thanh toán lúc: {item.paidAt ? new Date(item.paidAt).toLocaleString('vi-VN') : 'Chưa thanh toán'}
                  </Text>
                </View>
              </View>
            </Pressable>
          )
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size='small' color='#8678EA' style={{ marginTop: 20 }} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <CreditCard size={40} color='#94A3B8' />
              <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '700', color: '#64748B' }}>
                Không có dữ liệu giao dịch
              </Text>
            </View>
          )
        }
        ListFooterComponent={renderPaginationControls()}
      />
      {/* ─── TRANSACTION DETAILS MODAL ─────────────────────────────────────────── */}
      <Modal
        visible={isDetailModalOpen}
        animationType='fade'
        transparent
        onRequestClose={() => setIsDetailModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 30,
              width: '100%',
              maxWidth: 360,
              shadowColor: '#0F172A',
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
          >
            {selectedPayment && (() => {
              const email = selectedPayment.userId?.email || 'Thành viên ẩn danh'
              const displayName = selectedPayment.userId?.displayName || 'Ẩn danh'
              
              let statusColor = '#64748B'
              let statusBg = '#F1F5F9'
              let statusText = 'Đang chờ'
              let StatusIcon = Activity

              if (selectedPayment.status === 'paid') {
                statusColor = '#047857'
                statusBg = '#ECFDF5'
                statusText = 'Thành công'
                StatusIcon = CheckCircle
              } else if (selectedPayment.status === 'pending') {
                statusColor = '#B45309'
                statusBg = '#FFFBEB'
                statusText = 'Chờ xử lý'
                StatusIcon = Clock
              } else if (selectedPayment.status === 'cancelled') {
                statusColor = '#475569'
                statusBg = '#F1F5F9'
                statusText = 'Đã hủy'
                StatusIcon = Trash2
              } else if (selectedPayment.status === 'failed') {
                statusColor = '#BE123C'
                statusBg = '#FFF1F2'
                statusText = 'Thất bại'
                StatusIcon = AlertCircle
              } else if (selectedPayment.status === 'expired') {
                statusColor = '#4338CA'
                statusBg = '#EEF2FF'
                statusText = 'Hết hạn'
                StatusIcon = Clock
              }

              const formatBytes = (bytes: number) => {
                if (!bytes) return '0 GB'
                const gb = bytes / (1024 * 1024 * 1024)
                return `${gb.toFixed(0)} GB`
              }

              return (
                <View>
                  {/* Modal Header */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingHorizontal: 24,
                      paddingTop: 24,
                      paddingBottom: 16,
                      backgroundColor: '#F8FAFC',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                        <CreditCard size={14} color="#7C3AED" />
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>Chi tiết hóa đơn</Text>
                    </View>
                    <Pressable
                      onPress={() => setIsDetailModalOpen(false)}
                      style={({ pressed }) => ({
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: pressed ? '#E2E8F0' : '#FFFFFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                      })}
                    >
                      <Text style={{ fontSize: 14, color: '#64748B', fontWeight: '900', marginTop: -2 }}>×</Text>
                    </Pressable>
                  </View>

                  <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 16, gap: 14 }} style={{ maxHeight: 460 }}>
                    {/* Amount & Status Top Card */}
                    <View style={{ alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOpacity: 0.01, shadowRadius: 8, elevation: 1 }}>
                      <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 }}>Tổng tiền thanh toán</Text>
                      <Text style={{ fontSize: 26, fontWeight: '900', color: '#0F172A', marginTop: 8 }}>
                        {formatCurrency(selectedPayment.amount)}
                      </Text>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: statusBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginTop: 12 }}>
                        <StatusIcon size={12} color={statusColor} />
                        <Text style={{ color: statusColor, fontSize: 11, fontWeight: '800' }}>{statusText}</Text>
                      </View>
                    </View>

                    {/* Receipt Punchout Section */}
                    <View style={{ height: 24, justifyContent: 'center', marginVertical: 4, position: 'relative' }}>
                      {/* Left Punchout */}
                      <View style={{ position: 'absolute', left: -34, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(15, 23, 42, 0.3)', zIndex: 10 }} />
                      {/* Dashed Separator */}
                      <View style={{ borderTopWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed', flex: 1 }} />
                      {/* Right Punchout */}
                      <View style={{ position: 'absolute', right: -34, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(15, 23, 42, 0.3)', zIndex: 10 }} />
                    </View>

                    {/* Metadata Grid */}
                    <View style={{ gap: 10 }}>
                      {/* Customer info */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <User size={13} color='#94A3B8' />
                          <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700' }}>Khách hàng</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', flex: 1, paddingLeft: 20 }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B', textAlign: 'right' }} numberOfLines={1}>
                            {displayName}
                          </Text>
                          <Text style={{ fontSize: 10, color: '#64748B', marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                            {email}
                          </Text>
                        </View>
                      </View>

                      {/* Order Code */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 10, paddingVertical: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Hash size={13} color='#94A3B8' />
                          <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700' }}>Mã đơn hàng</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>
                          #{selectedPayment.orderCode}
                        </Text>
                      </View>

                      {/* Plan service name */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 10, paddingVertical: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Layers size={13} color='#94A3B8' />
                          <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700' }}>Gói dịch vụ</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>
                            {selectedPayment.planName}
                          </Text>
                          <Text style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>
                            Thời hạn: {selectedPayment.durationDays} ngày
                          </Text>
                        </View>
                      </View>

                      {/* Storage limit */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 10, paddingVertical: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <HardDrive size={13} color='#94A3B8' />
                          <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700' }}>Dung lượng</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>
                          +{formatBytes(selectedPayment.storageLimit)}
                        </Text>
                      </View>

                      {/* Coupon code */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 10, paddingVertical: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Sparkles size={13} color='#94A3B8' />
                          <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700' }}>Mã giảm giá</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: selectedPayment.couponCode ? '#7C3AED' : '#64748B' }}>
                          {selectedPayment.couponCode || 'Không có'}
                        </Text>
                      </View>

                      {/* PayOS ID */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 10, paddingVertical: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <CreditCard size={13} color='#94A3B8' />
                          <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700' }}>Mã giao dịch</Text>
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textAlign: 'right', flex: 1, paddingLeft: 20 }} numberOfLines={1}>
                          {selectedPayment.payosPaymentId || 'Không có'}
                        </Text>
                      </View>

                      {/* Created date */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 10, paddingVertical: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Calendar size={13} color='#94A3B8' />
                          <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700' }}>Thời gian tạo</Text>
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E293B' }}>
                          {new Date(selectedPayment.createdAt).toLocaleString('vi-VN')}
                        </Text>
                      </View>

                      {/* Paid date */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 10, paddingVertical: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Clock size={13} color='#94A3B8' />
                          <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700' }}>Thanh toán lúc</Text>
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: selectedPayment.paidAt ? '#1E293B' : '#EF4444' }}>
                          {selectedPayment.paidAt ? new Date(selectedPayment.paidAt).toLocaleString('vi-VN') : 'Chưa thanh toán'}
                        </Text>
                      </View>
                    </View>

                    {/* Checkout URL Action if pending */}
                    {selectedPayment.status === 'pending' && selectedPayment.checkoutUrl && (
                      <Pressable
                        onPress={() => {
                          if (selectedPayment.checkoutUrl) {
                            Linking.openURL(selectedPayment.checkoutUrl)
                          }
                        }}
                        style={({ pressed }) => ({
                          backgroundColor: '#7C3AED',
                          paddingVertical: 12,
                          borderRadius: 14,
                          alignItems: 'center',
                          marginTop: 10,
                          opacity: pressed ? 0.9 : 1,
                        })}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                          Mở link thanh toán
                        </Text>
                      </Pressable>
                    )}
                  </ScrollView>

                  {/* Modal Footer Controls */}
                  <View
                    style={{
                      padding: 20,
                      borderTopWidth: 1,
                      borderTopColor: '#F1F5F9',
                      backgroundColor: '#F8FAFC',
                    }}
                  >
                    <Pressable
                      onPress={() => setIsDetailModalOpen(false)}
                      style={({ pressed }) => ({
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        paddingVertical: 12,
                        borderRadius: 14,
                        alignItems: 'center',
                        opacity: pressed ? 0.9 : 1,
                        shadowColor: '#0F172A',
                        shadowOpacity: 0.02,
                        shadowRadius: 4,
                        elevation: 1,
                      })}
                    >
                      <Text style={{ color: '#1E293B', fontSize: 13, fontWeight: '800' }}>Đóng hóa đơn</Text>
                    </Pressable>
                  </View>
                </View>
              )
            })()}
          </View>
        </View>
      </Modal>
    </ScreenShell>
  )
}

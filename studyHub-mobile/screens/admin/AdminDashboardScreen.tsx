import React, { useState, useRef } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View, StyleSheet, Image } from 'react-native'
import {
  Users,
  FileText,
  TriangleAlert,
  HardDrive,
  TrendingUp,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Settings,
  CreditCard,
} from 'lucide-react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'

import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import type { RootState } from '../../redux/store'
import { adminApi, AdminStatsDto } from '../../api/adminApi'
import { useToast } from '../../components/ui/ToastProvider'
import Svg, { Circle, Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg'

function CustomMiniRing({ percent, color }: { percent: number; color: string }) {
  const size = 70
  const strokeWidth = 7
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const dashOffset = circumference - (percent / 100) * circumference

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke='#F1F5F9'
          strokeWidth={strokeWidth}
          fill='none'
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill='none'
          strokeLinecap='round'
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '800' }}>{percent.toFixed(0)}%</Text>
      </View>
    </View>
  )
}

export default function AdminDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const user = useSelector((state: RootState) => state.auth.user)
  const displayName = user?.name || 'Admin'
  const toast = useToast()

  const [stats, setStats] = useState<AdminStatsDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshEnabled, setRefreshEnabled] = useState(true)
  const isMomentumRef = useRef(false)

  const loadStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await adminApi.getDashboardStats()
      setStats(data)
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể tải số liệu thống kê.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      loadStats()
    }, [])
  )

  const activeUsersPercent = stats?.users.total
    ? Math.min((stats.users.active / stats.users.total) * 100, 100)
    : 0

  const reportedDocsPercent = stats?.documents.totalFiles
    ? Math.min((stats.documents.totalReported / stats.documents.totalFiles) * 100, 100)
    : 0

  const storageLimit = 5120 // 5GB limit = 5120MB
  const storagePercent = stats?.documents.totalCloudSizeInMb
    ? Math.min((stats.documents.totalCloudSizeInMb / storageLimit) * 100, 100)
    : 0

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
      <StatusBar style="dark" />

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
            source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80' }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              borderWidth: 1.5,
              borderColor: '#8678EA',
              backgroundColor: '#E2E8F0',
            }}
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 140 }}
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
              loadStats(true)
            }}
            colors={['#8678EA']}
          />
        }
      >
        {/* Welcome Banner */}
        <View
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            marginBottom: 16,
            shadowColor: '#8678EA',
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 2,
            position: 'relative',
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}
        >
          <View style={StyleSheet.absoluteFillObject}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="welcomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#F5F3FF" />
                  <Stop offset="100%" stopColor="#E0F2FE" />
                </LinearGradient>
              </Defs>
              <Rect width="100" height="100" fill="url(#welcomeGrad)" />
              {/* Radar or tech decorative circles in light style */}
              <Circle cx="95" cy="5" r="40" stroke="rgba(134, 120, 234, 0.08)" strokeWidth="1" fill="none" />
              <Circle cx="95" cy="5" r="28" stroke="rgba(134, 120, 234, 0.06)" strokeWidth="1" fill="none" />
              <Circle cx="95" cy="5" r="16" stroke="rgba(134, 120, 234, 0.04)" strokeWidth="1" fill="none" />
            </Svg>
          </View>
          <View style={{ padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 }}>
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  backgroundColor: 'rgba(134, 120, 234, 0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(134, 120, 234, 0.25)',
                }}
              >
                <Layers color='#8678EA' size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Chào quay lại, {displayName}!
                </Text>
                <Text style={{ color: '#0F172A', fontSize: 24, fontWeight: '900', marginTop: 4, lineHeight: 30 }}>
                  Bảng Điều Hành Hệ Thống
                </Text>
              </View>
            </View>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <Sparkles color='#8678EA' size={18} />
            </View>
          </View>
        </View>

        {loading && !stats ? (
          <ActivityIndicator size='large' color='#8678EA' style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Quick overview of Storage and stats */}
            <View
              style={{
                borderRadius: 24,
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
                marginBottom: 16,
                shadowColor: '#4F46E5',
                shadowOpacity: 0.08,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 3,
                position: 'relative',
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <View style={StyleSheet.absoluteFillObject}>
                <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <Defs>
                    <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#FFFFFF" />
                      <Stop offset="100%" stopColor="#EEF2FF" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100" height="100" fill="url(#bgGrad)" />
                  {/* Subtle waveform grid lines */}
                  <Path d="M 0,80 Q 25,60 50,80 T 100,80" stroke="rgba(99, 102, 241, 0.04)" strokeWidth="1.5" fill="none" />
                  <Path d="M 0,85 Q 25,75 50,85 T 100,85" stroke="rgba(99, 102, 241, 0.02)" strokeWidth="1" fill="none" />
                </Svg>
              </View>
              <View style={{ padding: 22 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: '#4F46E5', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Dung lượng Cloud đã sử dụng
                  </Text>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(99, 102, 241, 0.15)',
                    }}
                  >
                    <HardDrive color='#4F46E5' size={20} />
                  </View>
                </View>

                <Text style={{ color: '#0F172A', fontSize: 34, fontWeight: '900', letterSpacing: -0.5 }}>
                  {stats?.documents.totalCloudSizeInMb ? stats.documents.totalCloudSizeInMb.toFixed(2) : '0.00'} <Text style={{ fontSize: 20, color: '#4F46E5' }}>MB</Text>
                </Text>

                {/* Progress bar using a gradient bar */}
                <View style={{ marginTop: 16 }}>
                  <View style={{ height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                    <Svg width="100%" height="8">
                      <Defs>
                        <LinearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <Stop offset="0%" stopColor="#8678EA" />
                          <Stop offset="100%" stopColor="#06B6D4" />
                        </LinearGradient>
                      </Defs>
                      <Rect width={`${Math.max(storagePercent, 2)}%`} height="8" rx="4" fill="url(#barGrad)" />
                    </Svg>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>
                      Đã sử dụng {storagePercent < 0.01 && storagePercent > 0 ? '<0.01%' : `${storagePercent.toFixed(2)}%`}
                    </Text>
                    <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>Giới hạn: 5 GB (5120 MB)</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Quick Navigation Cards */}
            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 20 }}>
              <Pressable
                onPress={() => navigation.navigate('MainTabs', { screen: 'AdminUsers' })}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderLeftWidth: 4,
                  borderLeftColor: '#8678EA',
                  shadowColor: '#8678EA',
                  shadowOpacity: 0.05,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: 'rgba(134, 120, 234, 0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Users color='#8678EA' size={18} />
                  </View>
                  <ChevronRight color='#94A3B8' size={18} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 14, gap: 4 }}>
                  <Text style={{ color: '#0F172A', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>
                    {stats?.users.total || 0}
                  </Text>
                  <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 }}>
                    <Text style={{ color: '#15803D', fontSize: 9, fontWeight: '800' }}>+2</Text>
                  </View>
                </View>
                <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700', marginTop: 2 }}>Thành viên</Text>
                <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>Tổng số tài khoản</Text>
              </Pressable>

              <Pressable
                onPress={() => navigation.navigate('MainTabs', { screen: 'AdminReportedDocs', params: { tab: 'reported' } })}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderLeftWidth: 4,
                  borderLeftColor: '#EF4444',
                  shadowColor: '#EF4444',
                  shadowOpacity: 0.05,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TriangleAlert color='#EF4444' size={18} />
                  </View>
                  <ChevronRight color='#94A3B8' size={18} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 14, gap: 4 }}>
                  <Text style={{ color: '#EF4444', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>
                    {stats?.documents.totalReported || 0}
                  </Text>
                  {stats?.documents.totalReported && stats.documents.totalReported > 0 ? (
                    <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 }}>
                      <Text style={{ color: '#B91C1C', fontSize: 9, fontWeight: '800' }}>Cần duyệt</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700', marginTop: 2 }}>Báo cáo vi phạm</Text>
                <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>Tài liệu chờ duyệt</Text>
              </Pressable>
            </View>

            {/* Detailed metrics */}
            <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '800', marginBottom: 14, paddingLeft: 4 }}>
              Phân Tích Chi Tiết
            </Text>

            {/* Users detail card */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 20,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 16,
                shadowColor: '#0F172A',
                shadowOpacity: 0.03,
                shadowRadius: 10,
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: '#10B981' }} />
                  <TrendingUp color='#64748B' size={18} />
                  <Text style={{ color: '#0F172A', fontSize: 15, fontWeight: '800' }}>Trạng thái tài khoản</Text>
                </View>
                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ color: '#15803D', fontSize: 10, fontWeight: '800' }}>Hoạt động</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ gap: 12, flex: 1, paddingRight: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                      <Text style={{ color: '#475569', fontSize: 13, fontWeight: '600' }}>Hoạt động bình thường</Text>
                    </View>
                    <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: '#0F172A', fontWeight: '800', fontSize: 13 }}>
                        {stats?.users.active || 0}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                      <Text style={{ color: '#475569', fontSize: 13, fontWeight: '600' }}>Đang bị tạm khóa</Text>
                    </View>
                    <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: '#0F172A', fontWeight: '800', fontSize: 13 }}>
                        {stats?.users.inactive || 0}
                      </Text>
                    </View>
                  </View>
                </View>
                <CustomMiniRing percent={activeUsersPercent} color='#10B981' />
              </View>
            </View>

            {/* Documents detail card */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 20,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 20,
                shadowColor: '#0F172A',
                shadowOpacity: 0.03,
                shadowRadius: 10,
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: '#8678EA' }} />
                  <FileText color='#64748B' size={18} />
                  <Text style={{ color: '#0F172A', fontSize: 15, fontWeight: '800' }}>Hồ sơ tài liệu học tập</Text>
                </View>
                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ color: '#4F46E5', fontSize: 10, fontWeight: '800' }}>Hệ thống</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ gap: 12, flex: 1, paddingRight: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#8678EA' }} />
                      <Text style={{ color: '#475569', fontSize: 13, fontWeight: '600' }}>Tổng số tệp tải lên</Text>
                    </View>
                    <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: '#0F172A', fontWeight: '800', fontSize: 13 }}>
                        {stats?.documents.totalFiles || 0}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                      <Text style={{ color: '#475569', fontSize: 13, fontWeight: '600' }}>Tài liệu bị báo lỗi</Text>
                    </View>
                    <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: '#0F172A', fontWeight: '800', fontSize: 13 }}>
                        {stats?.documents.totalReported || 0}
                      </Text>
                    </View>
                  </View>
                </View>
                <CustomMiniRing percent={reportedDocsPercent} color='#EF4444' />
              </View>
            </View>

            {/* Quick Actions Shortcuts */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 22,
                marginBottom: 20,
                shadowColor: '#0F172A',
                shadowOpacity: 0.05,
                shadowRadius: 15,
                elevation: 3,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800', marginBottom: 16 }}>
                Lối tắt nhanh điều hành
              </Text>
              <View style={{ gap: 12 }}>
                <Pressable
                  onPress={() => navigation.navigate('MainTabs', { screen: 'AdminReportedDocs', params: { tab: 'reported' } })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 15,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <ShieldAlert color='#EF4444' size={18} />
                  </View>
                  <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 14, flex: 1 }}>
                    Kiểm duyệt tài liệu báo lỗi
                  </Text>
                  <ChevronRight color='#94A3B8' size={18} />
                </Pressable>

                <Pressable
                  onPress={() => navigation.navigate('MainTabs', { screen: 'AdminUsers' })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 15,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <UserCheck color='#10B981' size={18} />
                  </View>
                  <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 14, flex: 1 }}>
                    Quản lý danh sách thành viên
                  </Text>
                  <ChevronRight color='#94A3B8' size={18} />
                </Pressable>

                <Pressable
                  onPress={() => navigation.navigate('AdminDocs', { tab: 'all' })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 15,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <FileText color='#4F46E5' size={18} />
                  </View>
                  <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 14, flex: 1 }}>
                    Quản lý tài liệu hệ thống
                  </Text>
                  <ChevronRight color='#94A3B8' size={18} />
                </Pressable>

                <Pressable
                  onPress={() => navigation.navigate('MainTabs', { screen: 'AdminPlans', params: { fromDashboard: true } })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 15,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(79, 70, 229, 0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <Settings color='#4F46E5' size={18} />
                  </View>
                  <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 14, flex: 1 }}>
                    Quản lý gói dịch vụ
                  </Text>
                  <ChevronRight color='#94A3B8' size={18} />
                </Pressable>

                <Pressable
                  onPress={() => navigation.navigate('MainTabs', { screen: 'AdminPayments', params: { fromDashboard: true } })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 15,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(6, 182, 212, 0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <CreditCard color='#06B6D4' size={18} />
                  </View>
                  <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 14, flex: 1 }}>
                    Lịch sử giao dịch hệ thống
                  </Text>
                  <ChevronRight color='#94A3B8' size={18} />
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenShell>
  )
}

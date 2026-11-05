import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  Text,
  View,
  Modal,
  Alert,
  Platform
} from 'react-native'
import { ArrowLeft, CreditCard, ExternalLink, Calendar, RefreshCw, FileText, X } from 'lucide-react-native'
import { WebView } from 'react-native-webview'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import { subscriptionApi, Payment } from '../../api/subscriptionApi'
import { useToast } from '../../components/ui/ToastProvider'

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' đ'
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${time} - ${date}`
  } catch {
    return dateStr
  }
}

function getStatusDetails(status: string) {
  switch (status) {
    case 'paid':
      return {
        label: 'Thành công',
        color: '#16A34A',
        bgColor: '#DCFCE7',
      }
    case 'pending':
      return {
        label: 'Chờ thanh toán',
        color: '#D97706',
        bgColor: '#FEF3C7',
      }
    case 'failed':
      return {
        label: 'Thất bại',
        color: '#DC2626',
        bgColor: '#FEE2E2',
      }
    case 'cancelled':
      return {
        label: 'Đã hủy',
        color: '#64748B',
        bgColor: '#F1F5F9',
      }
    case 'expired':
      return {
        label: 'Hết hạn',
        color: '#94A3B8',
        bgColor: '#F8FAFC',
      }
    default:
      return {
        label: status.toUpperCase(),
        color: '#0F172A',
        bgColor: '#E2E8F0',
      }
  }
}

export default function TransactionHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const toast = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // WebView payment states
  const [showWebView, setShowWebView] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState('')

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState
    // Fallback detection in state change
    if (url.includes('payment/success') && showWebView) {
      setShowWebView(false)
      toast.success('Thanh toán thành công!')
      fetchHistory(true)
    } else if (url.includes('payment/cancel') && showWebView) {
      setShowWebView(false)
      toast.error('Giao dịch thanh toán đã bị hủy.')
      fetchHistory(true)
    }
  }

  const handleShouldStartLoad = (request: any) => {
    const { url } = request
    
    // Intercept payment success/cancel immediately to avoid ERR_CONNECTION_REFUSED on localhost
    if (url.includes('payment/success')) {
      setShowWebView(false)
      toast.success('Thanh toán thành công!')
      fetchHistory(true)
      return false
    }
    if (url.includes('payment/cancel')) {
      setShowWebView(false)
      toast.error('Giao dịch thanh toán đã bị hủy.')
      fetchHistory(true)
      return false
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Linking.openURL(url).catch((err) => {
        console.warn('[WebView] Không thể mở liên kết ngân hàng:', err)
      })
      return false
    }
    return true
  }

  const fetchHistory = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true)
    setError(null)
    try {
      const data = await subscriptionApi.getPaymentHistory()
      const list = Array.isArray(data) ? data : (data as any)?.data || []
      setPayments(list)
    } catch (err: any) {
      console.error('[Transaction History] Error fetching data:', err)
      setError(err?.toString() || 'Đã xảy ra lỗi khi tải lịch sử giao dịch.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      fetchHistory()
    }, [])
  )

  const handleRefresh = () => {
    setRefreshing(true)
    fetchHistory(false)
  }

  const handleContinuePayment = (checkoutUrl: string | null) => {
    if (!checkoutUrl) {
      toast.error('Không tìm thấy liên kết thanh toán!')
      return
    }
    setPaymentUrl(checkoutUrl)
    setShowWebView(true)
  }

  const renderPaymentItem = ({ item }: { item: Payment }) => {
    const statusInfo = getStatusDetails(item.status)

    return (
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          padding: 16,
          marginBottom: 12,
          shadowColor: '#0F172A',
          shadowOpacity: 0.03,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
              {item.planName || 'Gói Nâng Cấp'}
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              Mã đơn: #{item.orderCode}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Calendar size={12} color='#94A3B8' />
              <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 4 }}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: item.status === 'paid' ? '#16A34A' : '#0F172A' }}>
              {item.status === 'paid' ? '+' : ''}
              {formatVND(item.amount)}
            </Text>
            <View
              style={{
                backgroundColor: statusInfo.bgColor,
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginTop: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: statusInfo.color }}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
        </View>

        {item.status === 'pending' && item.checkoutUrl && (
          <Pressable
            onPress={() => handleContinuePayment(item.checkoutUrl)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#8678EA',
              borderRadius: 16,
              paddingVertical: 10,
              marginTop: 14,
              opacity: pressed ? 0.9 : 1,
              gap: 6,
            })}
          >
            <ExternalLink size={14} color='#FFFFFF' />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
              Tiếp tục thanh toán
            </Text>
          </Pressable>
        )}
      </View>
    )
  }

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
      {/* Header */}
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
          shadowColor: '#0F172A',
          shadowOpacity: 0.02,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#F8FAFC',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <ArrowLeft size={18} color='#0F172A' />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
          Lịch sử giao dịch
        </Text>
        <Pressable
          onPress={() => fetchHistory(true)}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#F8FAFC',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <RefreshCw size={16} color='#64748B' />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size='large' color='#8678EA' />
          <Text style={{ marginTop: 12, color: '#64748B', fontSize: 14, fontWeight: '600' }}>
            Đang tải dữ liệu...
          </Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ color: '#DC2626', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
            {error}
          </Text>
          <Pressable
            onPress={() => fetchHistory(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#0F172A',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 20,
            }}
          >
            <RefreshCw size={14} color='#FFFFFF' />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#8678EA']}
              tintColor='#8678EA'
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 20 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: '#E0F2FE',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <CreditCard size={36} color='#0284C7' />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                Chưa có giao dịch
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 18 }}>
                Lịch sử thanh toán mua các gói nâng cấp của bạn sẽ được hiển thị ở đây.
              </Text>
            </View>
          }
        />
      )}

      {/* PayOS Checkout WebView Modal */}
      <Modal visible={showWebView} animationType="slide" onRequestClose={() => setShowWebView(false)}>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {/* Header */}
          <View
            style={{
              paddingTop: Platform.OS === 'ios' ? 54 : 44,
              paddingHorizontal: 20,
              paddingBottom: 14,
              backgroundColor: '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ width: 40 }} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Thanh toán</Text>
            <Pressable
              onPress={() => {
                Alert.alert(
                  'Hủy thanh toán',
                  'Bạn có chắc muốn đóng trang thanh toán? Trạng thái giao dịch sẽ được cập nhật sau khi hoàn tất.',
                  [
                    { text: 'Tiếp tục thanh toán', style: 'cancel' },
                    { text: 'Đóng', onPress: () => setShowWebView(false) }
                  ]
                )
              }}
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
              <X size={18} color='#64748B' />
            </Pressable>
          </View>

          {/* WebView */}
          {paymentUrl ? (
            <WebView
              source={{ uri: paymentUrl }}
              onNavigationStateChange={handleNavigationStateChange}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              style={{ flex: 1 }}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
                  <ActivityIndicator size="large" color="#8678EA" />
                  <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Đang tải trang thanh toán...</Text>
                </View>
              )}
            />
          ) : null}
        </View>
      </Modal>
    </ScreenShell>
  )
}

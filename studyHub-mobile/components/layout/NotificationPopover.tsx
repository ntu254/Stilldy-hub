import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  Pressable,
  Text,
  View,
  Alert,
  Dimensions
} from 'react-native'
import {
  MessageSquare,
  Sparkles,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react-native'

import notificationsApi, { NotificationItem } from '../../api/notificationsApi'
import { useToast } from '../ui/ToastProvider'

interface NotificationPopoverProps {
  visible: boolean
  onClose: () => void
  onUnreadCountChange: (count: number) => void
  navigation: any
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    const day = d.getDate()
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`
  } catch {
    return dateStr || ''
  }
}

function getItemStyles(type: NotificationItem['type'], isRead: boolean) {
  const baseStyles = {
    borderRadius: 16, // Bo góc cho từng thông báo
    borderWidth: 1,
    padding: 14,
    flexDirection: 'column' as const, // Xếp dọc bên trong thẻ
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  }

  // Đổi nền thẻ đã đọc sang màu xám nhạt để phân biệt rõ với nền Popover trắng
  let backgroundColor = '#F8FAFC'
  let borderColor = '#E2E8F0'
  let iconBg = '#F1F5F9'
  let iconColor = '#64748B'

  switch (type) {
    case 'REPORT_RESOLVED':
      backgroundColor = isRead ? '#F8FAFC' : '#EFF6FF' // Xanh lam nhạt khi chưa đọc
      borderColor = isRead ? '#E2E8F0' : '#BFDBFE'
      iconBg = isRead ? '#F1F5F9' : '#DBEAFE'
      iconColor = isRead ? '#94A3B8' : '#2563EB'
      break
    case 'DOCUMENT_DELETED':
      backgroundColor = isRead ? '#F8FAFC' : '#FFF5F6' // Hồng nhạt
      borderColor = isRead ? '#E2E8F0' : '#FFE4E6'
      iconBg = isRead ? '#F1F5F9' : '#FFE4E6'
      iconColor = isRead ? '#94A3B8' : '#E11D48'
      break
    case 'UPLOAD_BANNED':
      backgroundColor = isRead ? '#F8FAFC' : '#FEF2F2' // Đỏ nhạt
      borderColor = isRead ? '#E2E8F0' : '#FEE2E2'
      iconBg = isRead ? '#F1F5F9' : '#FEE2E2'
      iconColor = isRead ? '#94A3B8' : '#DC2626'
      break
    case 'SUBSCRIPTION_ACTIVATED':
      backgroundColor = isRead ? '#F8FAFC' : '#F0FDF4' // Xanh lá nhạt
      borderColor = isRead ? '#E2E8F0' : '#DCFCE7'
      iconBg = isRead ? '#F1F5F9' : '#D1FAE5'
      iconColor = isRead ? '#94A3B8' : '#10B981'
      break
    case 'SUBSCRIPTION_EXPIRING':
      backgroundColor = isRead ? '#F8FAFC' : '#FEF3C7' // Cam nhạt
      borderColor = isRead ? '#E2E8F0' : '#FEF3C7'
      iconBg = isRead ? '#F1F5F9' : '#FEF3C7'
      iconColor = isRead ? '#94A3B8' : '#D97706'
      break
    default:
      backgroundColor = isRead ? '#F8FAFC' : '#F8FAFC'
      borderColor = '#E2E8F0'
      iconBg = '#F1F5F9'
      iconColor = '#64748B'
      break
  }

  return {
    container: {
      ...baseStyles,
      backgroundColor,
      borderColor,
    },
    iconWrapper: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: iconBg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    iconColor,
  }
}

export default function NotificationPopover({ visible, onClose, onUnreadCountChange, navigation }: NotificationPopoverProps) {
  const toast = useToast()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadNotifications = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true)
    try {
      const response = await notificationsApi.getNotifications({ page: 1, limit: 15 })
      const data = response.data || []
      setNotifications(data)

      const unreadCount = data.filter((n) => !n.isRead).length
      onUnreadCountChange(unreadCount)

      // Automatically mark all as read on backend
      if (unreadCount > 0) {
        await notificationsApi.markAsRead()
      }
    } catch (err: any) {
      console.warn('[NotificationPopover] Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (visible) {
      loadNotifications(true)
    }
  }, [visible])

  const handleItemPress = (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === item._id || n.id === item.id ? { ...n, isRead: true } : n))
    )
    onClose()

    // Thay thế các Alert.alert cũ bằng thông báo toast hiện đại như yêu cầu
    switch (item.type) {
      case 'REPORT_RESOLVED':
        if (item.metadata?.action === 'KEEP' && item.metadata?.documentId) {
          navigation.navigate('DocumentViewer', {
            documentId: item.metadata.documentId,
            documentTitle: 'Tài liệu đã duyệt',
          })
        } else {
          toast.success(item.message || 'Quản trị viên đã tiếp nhận và xử lý báo cáo của bạn.')
        }
        break

      case 'DOCUMENT_DELETED':
        toast.info(item.message || 'Tài liệu của bạn đã bị xóa do vi phạm quy định.')
        break

      case 'UPLOAD_BANNED':
        const bannedUntilStr = item.metadata?.bannedUntil
          ? new Date(item.metadata.bannedUntil).toLocaleDateString('vi-VN')
          : 'Thời gian quy định'
        toast.info(`${item.message}\n⏱️ Thời gian mở khóa: ${bannedUntilStr}`)
        break

      case 'SUBSCRIPTION_ACTIVATED':
        toast.success('Gói dịch vụ đã được kích hoạt thành công!')
        navigation.navigate('MainTabs', { screen: 'Profile' })
        break

      case 'SUBSCRIPTION_EXPIRING':
        navigation.navigate('Subscription')
        break

      default:
        break
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      onUnreadCountChange(0)
      toast.success('Đã đánh dấu đọc tất cả.')
    } catch (err: any) {
      toast.error('Không thể đánh dấu đọc tất cả.')
    }
  }

  const renderIconComponent = (type: NotificationItem['type'], color: string) => {
    const iconSize = 14
    switch (type) {
      case 'DOCUMENT_DELETED':
        return <Trash2 color={color} size={iconSize} />
      case 'UPLOAD_BANNED':
        return <AlertCircle color={color} size={iconSize} />
      case 'SUBSCRIPTION_ACTIVATED':
        return <Sparkles color={color} size={iconSize} />
      case 'SUBSCRIPTION_EXPIRING':
        return <Clock color={color} size={iconSize} />
      case 'REPORT_RESOLVED':
        return <MessageSquare color={color} size={iconSize} />
      default:
        return <MessageSquare color={color} size={iconSize} />
    }
  }

  if (!visible) return null

  return (
    <>
      <Pressable
        style={{
          position: 'absolute',
          top: -200,
          left: -screenWidth,
          width: screenWidth * 3,
          height: screenHeight * 2,
          backgroundColor: 'transparent',
          zIndex: 998,
        }}
        onPress={onClose}
      />

      <View
        style={{
          position: 'absolute',
          top: 46,
          right: -10,
          width: 324,
          maxHeight: 410,
          backgroundColor: '#FFFFFF', // Đổi về nền Popover trắng tinh tế như Web
          borderRadius: 26,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          shadowColor: '#0F172A',
          shadowOpacity: 0.1,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 15,
          zIndex: 999,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9',
            backgroundColor: '#FFFFFF',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>Thông báo</Text>
            {notifications.length > 0 && (
              <View style={{ backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>{notifications.length}</Text>
              </View>
            )}
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {notifications.some((n) => !n.isRead) && (
              <Pressable
                onPress={handleMarkAllRead}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#F3F2FF',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 10,
                }}
              >
                <CheckCircle size={13} color="#8678EA" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#8678EA' }}>Đọc tất cả</Text>
              </Pressable>
            )}
            
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <X color="#64748B" size={18} />
            </Pressable>
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <View style={{ paddingVertical: 50, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="small" color="#8678EA" />
          </View>
        ) : notifications.length === 0 ? (
          <View style={{ paddingVertical: 50, alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare color="#94A3B8" size={36} style={{ opacity: 0.8, marginBottom: 8 }} />
            <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600' }}>Không có thông báo nào.</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {notifications.map((item, index) => {
              const itemStyles = getItemStyles(item.type, item.isRead)
              return (
                <React.Fragment key={item._id || item.id || Math.random().toString()}>
                  {/* Chèn View ngăn cách vật lý để tạo khoảng cách giữa các thẻ rõ rệt hơn */}
                  {index > 0 && <View style={{ height: 16 }} />}
                  
                  <Pressable
                    onPress={() => handleItemPress(item)}
                    style={({ pressed }) => [
                      itemStyles.container,
                      pressed && { opacity: 0.85 }
                    ]}
                  >
                    {/* Hàng 1: Icon tròn và Tiêu đề cùng một hàng */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <View style={itemStyles.iconWrapper}>
                        {renderIconComponent(item.type, itemStyles.iconColor)}
                      </View>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: item.isRead ? '600' : '800',
                          color: item.isRead ? '#475569' : '#0F172A',
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {!item.isRead && (
                        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#2563EB' }} />
                      )}
                    </View>

                    {/* Nội dung thông báo */}
                    <Text
                      style={{
                        fontSize: 12,
                        color: item.isRead ? '#64748B' : '#334155',
                        lineHeight: 18,
                        marginBottom: 4,
                        paddingLeft: 2,
                      }}
                      numberOfLines={3}
                    >
                      {item.message}
                    </Text>

                    {/* Thời gian */}
                    <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '500', paddingLeft: 2 }}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </Pressable>
                </React.Fragment>
              )
            })}
          </ScrollView>
        )}
      </View>
    </>
  )
}

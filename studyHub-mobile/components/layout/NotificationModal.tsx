import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  View,
  Alert,
  Dimensions,
  StyleSheet
} from 'react-native'
import {
  X,
  MessageSquare,
  FileText,
  AlertCircle,
  Sparkles,
  Clock,
  Trash2,
  CheckCircle
} from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import type { RootStackParamList } from '../../navigation/AppNavigator'
import notificationsApi, { NotificationItem } from '../../api/notificationsApi'
import { useToast } from '../ui/ToastProvider'

interface NotificationModalProps {
  visible: boolean
  onClose: () => void
  onUnreadCountChange: (count: number) => void
}

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

export default function NotificationModal({ visible, onClose, onUnreadCountChange }: NotificationModalProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const toast = useToast()

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadNotifications = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true)
    try {
      const response = await notificationsApi.getNotifications({ page: 1, limit: 30 })
      const data = response.data || []
      setNotifications(data)

      const unreadCount = data.filter((n) => !n.isRead).length
      onUnreadCountChange(unreadCount)

      // If there are unread notifications, mark them all as read on backend
      if (unreadCount > 0) {
        await notificationsApi.markAsRead()
        // Wait briefly, then update local unread counts to 0 for next time
        // but keep the current local state isRead values so user can see which were new during this view
      }
    } catch (err: any) {
      console.warn('[NotificationModal] Failed to load notifications:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  };

  useEffect(() => {
    if (visible) {
      loadNotifications(true)
    }
  }, [visible])

  const handleRefresh = () => {
    setRefreshing(true)
    loadNotifications(false)
  }

  const handleItemPress = (item: NotificationItem) => {
    // 1. Mark as read locally
    setNotifications((prev) =>
      prev.map((n) => (n._id === item._id || n.id === item.id ? { ...n, isRead: true } : n))
    )

    // 2. Perform actions based on notification type
    onClose() // Close notifications modal first

    switch (item.type) {
      case 'REPORT_RESOLVED':
        if (item.metadata?.action === 'KEEP' && item.metadata?.documentId) {
          navigation.navigate('DocumentViewer', {
            documentId: item.metadata.documentId,
            documentTitle: 'Tài liệu đã duyệt',
          })
        } else {
          Alert.alert(
            item.title || 'Phản hồi báo cáo',
            item.message || 'Quản trị viên đã tiếp nhận và xử lý báo cáo của bạn.',
            [{ text: 'Đóng', style: 'cancel' }]
          )
        }
        break

      case 'DOCUMENT_DELETED':
        Alert.alert(
          'Tài liệu đã xóa',
          item.message || 'Tài liệu của bạn đã bị xóa do vi phạm quy định.',
          [{ text: 'Đóng', style: 'cancel' }]
        )
        break

      case 'UPLOAD_BANNED':
        const bannedUntilStr = item.metadata?.bannedUntil
          ? new Date(item.metadata.bannedUntil).toLocaleDateString('vi-VN')
          : 'Thời gian quy định'
        Alert.alert(
          'Cảnh báo tài khoản',
          `${item.message}\n\n⏱️ Thời gian mở khóa: ${bannedUntilStr}\n⚠️ Vui lòng tuân thủ quy chế chia sẻ tài liệu của Nexus.`,
          [{ text: 'Đã hiểu', style: 'default' }]
        )
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
      toast.success('Đã đánh dấu đọc tất cả thông báo.')
    } catch (err: any) {
      toast.error('Không thể đánh dấu đọc tất cả.')
    }
  }

  const renderIcon = (type: NotificationItem['type']) => {
    const iconSize = 20
    switch (type) {
      case 'DOCUMENT_DELETED':
        return <Trash2 color="#E11D48" size={iconSize} />
      case 'UPLOAD_BANNED':
        return <AlertCircle color="#B91C1C" size={iconSize} />
      case 'SUBSCRIPTION_ACTIVATED':
        return <Sparkles color="#D97706" size={iconSize} />
      case 'SUBSCRIPTION_EXPIRING':
        return <Clock color="#D97706" size={iconSize} />
      case 'REPORT_RESOLVED':
        return <MessageSquare color="#2563EB" size={iconSize} />
      default:
        return <MessageSquare color="#475569" size={iconSize} />
    }
  }

  const getIconBackground = (type: NotificationItem['type']) => {
    switch (type) {
      case 'DOCUMENT_DELETED':
        return '#FFE4E6'
      case 'UPLOAD_BANNED':
        return '#FEE2E2'
      case 'SUBSCRIPTION_ACTIVATED':
        return '#FEF3C7'
      case 'SUBSCRIPTION_EXPIRING':
        return '#FEF3C7'
      case 'REPORT_RESOLVED':
        return '#DBEAFE'
      default:
        return '#F1F5F9'
    }
  }

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
    return (
      <Pressable
        onPress={() => handleItemPress(item)}
        style={({ pressed }) => [
          styles.itemContainer,
          {
            backgroundColor: pressed ? '#F1F5F9' : item.isRead ? '#FFFFFF' : '#F8FAFC',
            borderColor: item.isRead ? '#F1F5F9' : '#E2E8F0',
          },
        ]}
      >
        <View style={[styles.iconWrapper, { backgroundColor: getIconBackground(item.type) }]}>
          {renderIcon(item.type)}
        </View>
        <View style={styles.textWrapper}>
          <View style={styles.titleRow}>
            <Text style={[styles.itemTitle, !item.isRead && styles.unreadText]}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadBadge} />}
          </View>
          <Text style={styles.itemMessage} numberOfLines={3}>
            {item.message}
          </Text>
          <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </Pressable>
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <SafeAreaView style={styles.safeContainer} pointerEvents="box-none">
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Thông báo</Text>
                {notifications.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{notifications.length}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.headerActions}>
                {notifications.some((n) => !n.isRead) && (
                  <Pressable onPress={handleMarkAllRead} style={styles.markAllButton}>
                    <CheckCircle size={16} color="#8678EA" />
                    <Text style={styles.markAllText}>Đọc tất cả</Text>
                  </Pressable>
                )}
                <Pressable onPress={onClose} style={styles.closeButton}>
                  <X color="#64748B" size={20} />
                </Pressable>
              </View>
            </View>

            {/* List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8678EA" />
                <Text style={styles.loadingText}>Đang tải thông báo...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MessageSquare color="#94A3B8" size={48} style={styles.emptyIcon} />
                <Text style={styles.emptyText}>Không có thông báo nào.</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                renderItem={renderNotificationItem}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                showsVerticalScrollIndicator={false}
              />
            )}
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  )
}

const screenHeight = Dimensions.get('window').height

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  safeContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: screenHeight * 0.75,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 24,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8678EA',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  itemContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  textWrapper: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
  },
  unreadText: {
    color: '#0F172A',
    fontWeight: '800',
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  itemMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 6,
  },
  itemDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
})

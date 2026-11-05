import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import {
  FileX,
  ShieldAlert,
  Sparkles,
  Clock,
  MessageSquare,
  X,
  ExternalLink,
  Ban,
} from 'lucide-react'
import { toast } from 'sonner'

import { BellIcon } from '@/components/animate-ui/icons/bell'
import { useAuth } from '@/contexts/AuthContext'
import { notificationService, type NotificationItem } from '@/services/notificationService'
import { Button } from '@/components/ui/button'

export default function NotificationBell() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [bannedModalItem, setBannedModalItem] = useState<NotificationItem | null>(null)
  
  const popoverRef = useRef<HTMLDivElement>(null)

  const userId = user?.id || (user as any)?._id
  const token = localStorage.getItem('accessToken') || ''

  // 1. WebSocket connection & initial fetch via notificationService
  useEffect(() => {
    if (!isAuthenticated || !user) return

    // Gọi API lấy danh sách thông báo & số lượng chưa đọc
    notificationService
      .getNotifications({ page: 1, limit: 20 })
      .then((res) => {
        setNotifications(res.data)
        const unread = res.data.filter((n) => !n.isRead).length
        setUnreadCount(unread)
      })
      .catch(() => {})

    // Khởi tạo kết nối Socket.io qua notificationService
    const socket = notificationService.initNotificationSocket(userId || '', token, (newNotif) => {
      setUnreadCount((prev) => prev + 1)
      setNotifications((prev) => [newNotif, ...prev])

      // Toast thông báo (có id để chống trùng lặp Toast khi có nhiều NotificationBell component)
      const notifId = newNotif.id || newNotif._id || `${newNotif.type}-${newNotif.createdAt}`
      toast(newNotif.title || 'Thông báo mới', {
        id: `notif-${notifId}`,
        description: newNotif.message,
      })

      // Bắn pháo hoa nếu nâng cấp tài khoản
      if (newNotif.type === 'SUBSCRIPTION_ACTIVATED') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })
      }
    })

    // Dọn dẹp kết nối socket khi unmount
    return () => {
      socket.off('newNotification')
      socket.disconnect()
    }
  }, [isAuthenticated, userId, token])

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Toggle Bell click
  const handleBellClick = () => {
    const nextState = !isOpen
    setIsOpen(nextState)

    if (nextState && unreadCount > 0) {
      // Clear badge count
      setUnreadCount(0)
      // Mark as read in backend
      notificationService.markAsRead().catch(() => {})
      // Update local state isRead flag
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    }
  }

  // Handle clicking individual notification item
  const handleNotificationClick = (item: NotificationItem) => {
    setIsOpen(false)

    switch (item.type) {
      case 'DOCUMENT_DELETED':
        // Redirect to "My Documents"
        navigate('/dashboard/documents')
        break

      case 'UPLOAD_BANNED':
        // Open detailed modal with ban info & terms
        setBannedModalItem(item)
        break

      case 'SUBSCRIPTION_ACTIVATED':
        // Confetti fireworks & redirect to upgrade/profile
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
        })
        navigate('/dashboard/profile')
        break

      case 'SUBSCRIPTION_EXPIRING':
        // Redirect to upgrade page to renew
        navigate('/dashboard/upgrade')
        break

      case 'REPORT_RESOLVED':
        if (item.metadata?.action === 'KEEP' && item.metadata?.documentId) {
          navigate(`/preview/${item.metadata.documentId}`)
        } else {
          toast.success('Cảm ơn bạn đã báo cáo vi phạm giúp giữ sạch cộng đồng Nexus!')
        }
        break

      default:
        break
    }
  }

  // Render notification icon based on type
  const renderIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'DOCUMENT_DELETED':
        return <FileX className="h-5 w-5 text-rose-600 shrink-0" />
      case 'UPLOAD_BANNED':
        return <Ban className="h-5 w-5 text-red-700 shrink-0" />
      case 'SUBSCRIPTION_ACTIVATED':
        return <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
      case 'SUBSCRIPTION_EXPIRING':
        return <Clock className="h-5 w-5 text-amber-600 shrink-0" />
      case 'REPORT_RESOLVED':
        return <MessageSquare className="h-5 w-5 text-blue-600 shrink-0" />
      default:
        return <BellIcon  size={20} className="h-5 w-5 text-slate-500 shrink-0" />
    }
  }

  // Render card background color based on type
  const getTypeColorClasses = (type: NotificationItem['type']) => {
    switch (type) {
      case 'DOCUMENT_DELETED':
        return 'bg-rose-50/60 border-rose-100 hover:bg-rose-50'
      case 'UPLOAD_BANNED':
        return 'bg-red-50/90 border-red-200 hover:bg-red-100/80'
      case 'SUBSCRIPTION_ACTIVATED':
        return 'bg-emerald-50/60 border-emerald-100 hover:bg-emerald-50'
      case 'SUBSCRIPTION_EXPIRING':
        return 'bg-amber-50/60 border-amber-100 hover:bg-amber-50'
      case 'REPORT_RESOLVED':
        return 'bg-blue-50/60 border-blue-100 hover:bg-blue-50'
      default:
        return 'bg-slate-50 border-slate-100 hover:bg-slate-100'
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* 2. Notification Bell Icon */}
      <button
        onClick={handleBellClick}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:text-slate-900 focus:outline-none"
        aria-label="Thông báo"
      >
        <BellIcon animateOnHover size={20} className="h-5 w-5 text-slate-500" />

        {/* Red Dot Badge (only if unreadCount > 0) */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-white p-4 shadow-xl ring-1 ring-slate-900/10 z-50 animate-in fade-in-80 slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">Thông báo</h3>
              {notifications.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {notifications.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Không có thông báo nào.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item._id || item.id || Math.random().toString()}
                  onClick={() => handleNotificationClick(item)}
                  className={`flex items-start gap-3 p-3 rounded-md border transition-all cursor-pointer ${getTypeColorClasses(
                    item.type
                  )}`}
                >
                  <div className="mt-0.5">{renderIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                      {item.message}
                    </p>
                    {item.createdAt && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* UPLOAD_BANNED Modal */}
      {bannedModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl ring-1 ring-slate-900/10 space-y-4">
            <div className="flex items-center gap-3 text-red-600 border-b border-slate-100 pb-3">
              <ShieldAlert className="h-7 w-7 shrink-0" />
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Cảnh báo cấm tải lên tài liệu
                </h3>
                <p className="text-xs text-red-600 font-semibold">Tài khoản bị tạm khóa tính năng upload</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <p>{bannedModalItem.message}</p>
              
              <div className="rounded-md bg-red-50 p-3 border border-red-200 space-y-1 text-xs text-red-800 font-medium">
                <div>
                  ⏱️ <strong>Thời gian mở khóa:</strong>{' '}
                  {bannedModalItem.metadata?.bannedUntil
                    ? new Date(bannedModalItem.metadata.bannedUntil).toLocaleString('vi-VN')
                    : 'Sau 7 ngày kể từ khi vi phạm'}
                </div>
                <div>⚠️ Vui lòng tuân thủ quy chế chia sẻ tài liệu của hệ thống.</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-md gap-1.5"
                onClick={() => {
                  setBannedModalItem(null)
                  window.open('/terms', '_blank')
                }}
              >
                <ExternalLink className="h-4 w-4" />
                Điều khoản sử dụng
              </Button>
              <Button
                size="sm"
                className="rounded-md bg-slate-900 text-white"
                onClick={() => setBannedModalItem(null)}
              >
                Đã hiểu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

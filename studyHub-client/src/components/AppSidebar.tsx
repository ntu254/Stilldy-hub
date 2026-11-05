import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/animate-ui/components/radix/sidebar'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from '@/components/animate-ui/primitives/headless/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  Bookmark,
  BookOpen,
  Bot,
  FolderOpen,
  Globe,
  LayoutDashboard,
  Library,
  Lightbulb,
  LogOut,
  Sparkles,
  UserCircle,
  Receipt
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const navSections = [
  {
    title: 'Tổng quan',
    items: [
      {
        to: '/dashboard',
        icon: LayoutDashboard,
        label: 'Dashboard',
        end: true,
      },
    ],
  },
  {
    title: 'Học tập & Tài liệu',
    items: [
      {
        to: '/dashboard/documents',
        icon: FolderOpen,
        label: 'Tài liệu của tôi',
        end: false,
      },
      {
        to: '/dashboard/saved',
        icon: Bookmark,
        label: 'Tài liệu đã lưu',
        end: false,
      },
      {
        to: '/dashboard/public-docs',
        icon: Globe,
        label: 'Khám phá tài liệu',
        end: false,
      },
      {
        to: '/dashboard/public-flashcards',
        icon: Library,
        label: 'Thư viện Flashcard',
        end: false,
      },
      {
        to: '/dashboard/flashcards',
        icon: Lightbulb,
        label: 'Flashcard của tôi',
        end: false,
      },
    ],
  },
  {
    title: 'Trợ lý AI',
    items: [
      {
        to: '/dashboard/ai-chat',
        icon: Bot,
        label: 'AI Chatbot',
        end: false,
      },
    ],
  },
  {
    title: 'Cá nhân',
    items: [
      {
        to: '/dashboard/profile',
        icon: UserCircle,
        label: 'Hồ sơ cá nhân',
        end: false,
      },
      {
        to: '/dashboard/upgrade',
        icon: Sparkles,
        label: 'Nâng cấp gói hội viên',
        end: false,
      },
      {
        to: '/dashboard/payment-history',
        icon: Receipt,
        label: 'Lịch sử thanh toán',
        end: false,
      },
    ],
  },
]

interface AppSidebarProps {
  onLogoutClick?: () => void
}

export default function AppSidebar({ onLogoutClick }: AppSidebarProps = {}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { state, setOpenMobile, isMobile } = useSidebar()
  const collapsed = state === 'collapsed'
  const { user, logout } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogoutRowClick = () => {
    if (isMobile) setOpenMobile(false)
    if (onLogoutClick) {
      onLogoutClick()
    } else {
      setShowLogoutConfirm(true)
    }
  }

  const handleConfirmLogout = async () => {
    try {
      await logout()
      toast.success('Đăng xuất thành công!')
      setShowLogoutConfirm(false)
    } catch {
      toast.error('Có lỗi xảy ra khi đăng xuất.')
    }
  }

  const avatarLetter = user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'

  return (
    <Sidebar className="border-r border-slate-100 bg-white">
      {/* Header / Logo */}
      <SidebarHeader className="h-16 px-4 flex flex-row items-center border-b border-slate-100 shrink-0">
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2.5 overflow-hidden w-full cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
            <BookOpen className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
              Nexus
            </span>
          )}
        </div>
      </SidebarHeader>

      {/* Main Content / Navigation */}
      <SidebarContent className="py-4 px-2 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <SidebarGroup key={section.title} className="p-0">
            {!collapsed && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
                {section.title}
              </div>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map(({ to, icon: Icon, label, end }) => {
                  const isActive = end
                    ? location.pathname === to
                    : location.pathname.startsWith(to)

                  return (
                    <SidebarMenuItem key={to}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={label}
                        onClick={() => {
                          if (isMobile) setOpenMobile(false)
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative overflow-hidden',
                          'data-[active=true]:bg-[#0F172A]! data-[active=true]:text-[#F8FAFC]! [&>svg]:text-slate-500 [&>svg]:data-[active=true]:text-[#F8FAFC]! hover:bg-slate-50 hover:text-slate-900'
                        )}
                      >
                        <NavLink to={to} end={end}>
                          <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                          <span>{label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer / User Profile */}
      <SidebarFooter className="border-t border-slate-100 p-3">
        <div
          onClick={handleLogoutRowClick}
          className={cn(
            'flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer group',
            collapsed && 'justify-center px-0'
          )}
        >
          <div className="relative shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-sm overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                avatarLetter
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-800">{user?.displayName || 'Người dùng'}</p>
              <p className="truncate text-[10px] text-slate-400">{user?.email || 'student@Nexus.vn'}</p>
            </div>
          )}

          {!collapsed && (
            <LogOut className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
          )}
        </div>
      </SidebarFooter>

      {/* Fallback Confirmation Dialog Overlay if onLogoutClick not provided */}
      {!onLogoutClick && (
        <Dialog open={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} className="relative z-[100]">
          <DialogBackdrop className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel>
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">Đăng xuất tài khoản</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?
                </p>
                <div className="mt-6 flex justify-end gap-2.5">
                  <Button
                    variant="outline"
                    onClick={() => setShowLogoutConfirm(false)}
                    className="rounded-xl border-slate-200 text-slate-700 font-semibold text-sm h-9 px-4"
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleConfirmLogout}
                    className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm h-9 px-4"
                  >
                    Đăng xuất
                  </Button>
                </div>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </Sidebar>
  )
}

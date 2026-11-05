import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Users,
  Files,
  Sliders,
  BookOpen,
  LogOut,
  UserCircle,
  CreditCard,
  Settings,
} from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from '@/components/animate-ui/primitives/headless/dialog'
import { Button } from '@/components/ui/button'

const adminNavSections = [
  {
    title: 'Quản lý hệ thống',
    items: [
      {
        to: '/admin/users',
        icon: Users,
        label: 'Quản lý Thành viên',
        end: false,
      },
      {
        to: '/admin/documents',
        icon: BookOpen,
        label: 'Quản lý Tài liệu',
        end: false,
      },
      {
        to: '/admin/files',
        icon: Files,
        label: 'Tài liệu vi phạm',
        end: false,
      },
    ],
  },
  {
    title: 'Dịch vụ & Giao dịch',
    items: [
      {
        to: '/admin/plans',
        icon: Sliders,
        label: 'Cấu hình gói dịch vụ',
        end: false,
      },
      {
        to: '/admin/settings',
        icon: Settings,
        label: 'Cấu hình hệ thống',
        end: false,
      },
      {
        to: '/admin/payments',
        icon: CreditCard,
        label: 'Lịch sử giao dịch',
        end: false,
      },
    ],
  },
  {
    title: 'Cá nhân',
    items: [
      {
        to: '/admin/profile',
        icon: UserCircle,
        label: 'Hồ sơ cá nhân',
        end: false,
      },
    ],
  },
]

export default function AdminSidebar() {
  const location = useLocation()
  const { state, setOpenMobile, isMobile } = useSidebar()
  const collapsed = state === 'collapsed'
  const { user, logout } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleConfirmLogout = async () => {
    try {
      await logout()
      toast.success('Đăng xuất thành công!')
      setShowLogoutConfirm(false)
    } catch {
      toast.error('Có lỗi xảy ra khi đăng xuất.')
    }
  }

  const avatarLetters = user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'AD'

  return (
    <Sidebar className="border-r border-slate-100 bg-white">
      {/* Header / Logo */}
      <SidebarHeader className="h-16 px-4 flex flex-row items-center border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden w-full">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <BookOpen className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-extrabold tracking-tight text-slate-900 leading-none">
                Nexus
              </span>
              <span className="text-[9px] font-black tracking-widest text-indigo-600 uppercase mt-0.5">
                Admin Panel
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="py-4 px-2 space-y-4 overflow-y-auto">
        {adminNavSections.map((section) => (
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

      {/* Footer / Admin Profile */}
      <SidebarFooter className="border-t border-slate-100 p-3">
        <div
          onClick={() => setShowLogoutConfirm(true)}
          className={cn(
            'flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer group',
            collapsed && 'justify-center px-0'
          )}
        >
          <div className="relative shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                avatarLetters
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-400 animate-pulse" />
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-800">{user?.displayName || 'Quản trị viên'}</p>
              <p className="truncate text-[10px] text-slate-400">{user?.email || 'admin@Nexus.vn'}</p>
            </div>
          )}

          {!collapsed && (
            <LogOut className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
          )}
        </div>
      </SidebarFooter>

      {/* Confirmation Dialog Overlay */}
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
    </Sidebar>
  )
}

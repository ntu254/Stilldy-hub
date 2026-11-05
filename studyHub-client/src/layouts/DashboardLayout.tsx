import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AppSidebar from '@/components/AppSidebar'
import NotificationBell from '@/components/NotificationBell'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/animate-ui/components/radix/sidebar'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from '@/components/animate-ui/primitives/headless/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export default function DashboardLayout() {
  const { logout } = useAuth()
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[#F8FAFC] w-full">
        {/* Sidebar */}
        <AppSidebar onLogoutClick={() => setShowLogoutConfirm(true)} />

        {/* Main Content Wrapper */}
        <SidebarInset className="flex flex-1 flex-col min-w-0 overflow-hidden bg-[#F8FAFC]">
          {/* Mobile Top Bar */}
          <header className="flex md:hidden items-center justify-between h-14 px-4 bg-white border-b border-slate-100 shrink-0 sticky top-0 z-20">
            <div className="flex items-center">
              <SidebarTrigger className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors [&>svg]:size-5" />
              <div className="flex items-center gap-2 ml-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 stroke-current stroke-2">
                    <path
                      d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm font-extrabold text-slate-900 tracking-tight">Nexus</span>
              </div>
            </div>
            <NotificationBell />
          </header>

          {/* Desktop Sidebar Toggle & Trigger Bar */}
          <div className="hidden md:flex items-center justify-between h-16 px-6 bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-center">
              <SidebarTrigger className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg [&>svg]:size-4" />
              <span className="ml-4 text-xs font-semibold text-slate-400">Điều hướng nhanh</span>
            </div>
            <NotificationBell />
          </div>

          {/* Page Content — renders child routes */}
          <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
            <Outlet />
          </main>
        </SidebarInset>
      </div>

      {/* Logout Confirmation Dialog Overlay */}
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
    </SidebarProvider>
  )
}

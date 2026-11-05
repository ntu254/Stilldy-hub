import { Outlet } from 'react-router-dom'
import AdminSidebar from '@/components/AdminSidebar'
import NotificationBell from '@/components/NotificationBell'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/animate-ui/components/radix/sidebar'

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[#F8FAFC] w-full">
        {/* Admin Sidebar */}
        <AdminSidebar />

        {/* Main Content Wrapper */}
        <SidebarInset className="flex flex-1 flex-col min-w-0 overflow-hidden bg-[#F8FAFC]">
          
          {/* Mobile Top Bar */}
          <header className="flex md:hidden items-center justify-between h-14 px-4 bg-white border-b border-slate-100 shrink-0 sticky top-0 z-20">
            <div className="flex items-center">
              <SidebarTrigger className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors [&>svg]:size-5" />
              <div className="flex items-center gap-2 ml-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 stroke-current stroke-2">
                    <path
                      d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-slate-900 tracking-tight leading-none">Nexus</span>
                  <span className="text-[8px] font-black text-indigo-600 tracking-wider uppercase mt-0.5">Admin</span>
                </div>
              </div>
            </div>
            <NotificationBell />
          </header>

          {/* Desktop Top Bar */}
          <div className="hidden md:flex items-center justify-between h-16 px-6 bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-center">
              <SidebarTrigger className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg [&>svg]:size-4" />
              <span className="ml-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-[9px]">Quản trị hệ thống</span>
            </div>
            <NotificationBell />
          </div>

          {/* Page Content Outlet */}
          <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

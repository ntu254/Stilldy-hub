import { motion, AnimatePresence } from 'motion/react'
import {
  Search,
  Calendar,
  Mail,
  UserCircle,
  CreditCard,
  Hash,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import DocPagination from '@/pages/documents/DocPagination'
import type { AdminPaymentItem } from '@/services/adminService'

interface PaymentManagementTableProps {
  payments: AdminPaymentItem[]
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  totalItems: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void
}

export default function PaymentManagementTable({
  payments,
  currentPage,
  totalPages,
  onPageChange,
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  totalItems,
  sortBy,
  sortOrder,
  onSortChange,
}: PaymentManagementTableProps) {

  const renderSortHeader = (title: string, columnKey: string, widthClass?: string, center?: boolean, right?: boolean) => {
    return (
      <th className={cn("px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap", widthClass, center && "text-center", right && "text-right")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className={cn("flex items-center gap-1 cursor-pointer hover:text-slate-700 transition-colors", center ? "justify-center" : "", right ? "justify-end" : "")}>
              {title}
              <ChevronDown strokeWidth={3} className={cn("h-3 w-3", sortBy === columnKey ? "text-indigo-500" : "text-slate-400")} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={center ? "center" : right ? "end" : "start"} className="w-36">
            <DropdownMenuLabel>SẮP XẾP</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={sortBy === columnKey && sortOrder === 'asc'}
              onCheckedChange={() => onSortChange?.(columnKey, 'asc')}
            >
              Tăng dần
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortBy === columnKey && sortOrder === 'desc'}
              onCheckedChange={() => onSortChange?.(columnKey, 'desc')}
            >
              Giảm dần
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </th>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const renderStatus = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 w-fit">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Thành công</span>
          </div>
        )
      case 'pending':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-100 w-fit">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Chờ xử lý</span>
          </div>
        )
      case 'cancelled':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 w-fit">
            <XCircle className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Đã hủy</span>
          </div>
        )
      case 'failed':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-100 w-fit">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Thất bại</span>
          </div>
        )
      case 'expired':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 w-fit">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Hết hạn</span>
          </div>
        )
      default:
        return (
          <span className="text-[10px] font-bold uppercase text-slate-500">{status}</span>
        )
    }
  }

  return (
    <div className="space-y-6">
      
      {/* ─── FILTERS & SEARCH BAR ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Tìm mã đơn, tên, email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 bg-slate-50/30 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {(['all', 'paid', 'pending', 'cancelled', 'failed', 'expired'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => onStatusFilterChange(filter)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all",
                statusFilter === filter
                  ? "bg-[#0F172A] border-slate-900 text-white shadow-xs"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {filter === 'all' && 'Tất cả'}
              {filter === 'paid' && 'Thành công'}
              {filter === 'pending' && 'Chờ xử lý'}
              {filter === 'cancelled' && 'Đã hủy'}
              {filter === 'failed' && 'Thất bại'}
              {filter === 'expired' && 'Đã hết hạn'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── DATA TABLE ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Responsive Horizontal Scroll wrapper */}
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-32">Mã đơn</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[200px]">Thành viên</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gói dịch vụ</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái</th>
                {renderSortHeader('Ngày thanh toán', 'createdAt', '', false, true)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <AnimatePresence initial={false}>
                {payments.length > 0 ? (
                  payments.map((payment) => (
                    <motion.tr
                      key={payment._id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Order Code */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                          <Hash className="h-3.5 w-3.5 text-indigo-400" />
                          <span>{payment.orderCode}</span>
                        </div>
                      </td>

                      {/* User Info */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                            <UserCircle className="h-3.5 w-3.5 text-slate-400" />
                            <span>{payment.userId.displayName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Mail className="h-3 w-3" />
                            <span>{payment.userId.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Plan Info */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-bold text-indigo-600">
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>{payment.planName}</span>
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {formatCurrency(payment.amount)} / {payment.durationDays} ngày
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {renderStatus(payment.status)}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-slate-600">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatDate(payment.paidAt || payment.createdAt)}</span>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                      Không tìm thấy giao dịch phù hợp
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-3 flex justify-between items-center text-[10px] text-slate-400 font-bold shrink-0">
          <span>HIỂN THỊ {payments.length} TRÊN {totalItems} GIAO DỊCH</span>
          <span>HỆ THỐNG Nexus</span>
        </div>
      </div>

      {/* ─── PAGINATION CONTROLS ─────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <DocPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  )
}

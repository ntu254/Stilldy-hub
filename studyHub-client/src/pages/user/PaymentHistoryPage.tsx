import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import {
  Receipt,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Lock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ChevronDown
} from 'lucide-react'
import { paymentService } from '@/services/paymentService'
import type { PaymentStatusResponse } from '@/types/subscription'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Trạng thái "pending" có đếm ngược
const PendingStatusWithCountdown = ({ payment }: { payment: PaymentStatusResponse }) => {
  const [timeLeft, setTimeLeft] = useState<number>(1); // Khởi tạo > 0 để tránh flash "hết hạn"
  const isExpired = timeLeft <= 0;

  useEffect(() => {
    if (!payment.expiredAt) return;
    const expiryTime = new Date(payment.expiredAt).getTime();

    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const diff = expiryTime - now;
      setTimeLeft(diff > 0 ? diff : 0);
    };

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [payment.expiredAt]);

  if (isExpired || payment.status === 'expired') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold w-fit border border-slate-200">
        <Lock className="h-3.5 w-3.5" />
        Đã hết hạn
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-2.5 items-start">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 text-xs font-semibold w-fit border border-amber-200/50">
        <Clock className="h-3.5 w-3.5 animate-pulse" />
        Chờ thanh toán ({formattedTime})
      </div>
      {payment.checkoutUrl && (
        <Button
          size="sm"
          onClick={() => window.location.href = payment.checkoutUrl}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-lg text-xs h-8 px-4 font-bold flex items-center gap-1.5"
        >
          Thanh toán ngay
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<PaymentStatusResponse[]>([])
  const [loading, setLoading] = useState(true)
  
  // Phân trang
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 10

  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchHistory()
  }, [page, sortBy, sortOrder])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const res = await paymentService.getPaymentHistory({ page, limit, sortBy, sortOrder })
      setPayments(res.data)
      setTotalPages(res.meta.totalPages)
    } catch (error) {
      console.error('Failed to fetch payment history', error)
    } finally {
      setLoading(false)
    }
  }

  const renderStatus = (payment: PaymentStatusResponse) => {
    switch (payment.status) {
      case 'paid':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 text-xs font-semibold w-fit border border-emerald-200/50">
            <CheckCircle className="h-3.5 w-3.5" />
            Thành công
          </div>
        )
      case 'failed':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 text-xs font-semibold w-fit border border-rose-200/50">
            <XCircle className="h-3.5 w-3.5" />
            Thất bại
          </div>
        )
      case 'cancelled':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-500 text-xs font-semibold w-fit border border-slate-200/50">
            <AlertCircle className="h-3.5 w-3.5" />
            Đã hủy
          </div>
        )
      case 'expired':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold w-fit border border-slate-200">
            <Lock className="h-3.5 w-3.5" />
            Đã hết hạn
          </div>
        )
      case 'pending':
        return <PendingStatusWithCountdown payment={payment} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Receipt className="h-4 w-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Lịch sử giao dịch
          </p>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Lịch sử thanh toán
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Xem lại toàn bộ lịch sử giao dịch và hóa đơn cho các gói dịch vụ của bạn trên hệ thống.
        </p>
      </motion.div>

      {/* DANH SÁCH LỊCH SỬ */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-400">Đang tải lịch sử giao dịch...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
              <Receipt className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-slate-400">Bạn chưa có giao dịch nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Mã Đơn</th>
                  <th className="px-6 py-4">Gói dịch vụ</th>
                  <th className="px-6 py-4">Số tiền</th>
                  <th className="px-6 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-1 cursor-pointer hover:text-slate-700 transition-colors">
                          Ngày tạo
                          <ChevronDown strokeWidth={3} className={cn("h-3 w-3", sortBy === 'createdAt' ? "text-indigo-500" : "text-slate-400")} />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-36">
                        <DropdownMenuLabel>SẮP XẾP</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={sortBy === 'createdAt' && sortOrder === 'asc'}
                          onCheckedChange={() => { setSortBy('createdAt'); setSortOrder('asc'); }}
                        >
                          Cũ nhất
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={sortBy === 'createdAt' && sortOrder === 'desc'}
                          onCheckedChange={() => { setSortBy('createdAt'); setSortOrder('desc'); }}
                        >
                          Mới nhất
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </th>
                  <th className="px-6 py-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                {payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                        #{payment.orderCode}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{payment.planName}</span>
                        {payment.couponCode && (
                          <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            Mã giảm: <span className="font-bold text-emerald-600">{payment.couponCode}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-extrabold text-slate-900">
                        {formatCurrency(payment.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-slate-500">
                        {formatDate(payment.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {renderStatus(payment)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PHÂN TRANG */}
        {!loading && totalPages > 1 && (
          <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500">
              Trang <span className="text-slate-900">{page}</span> / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 rounded-lg border-slate-200 text-slate-600 font-semibold text-xs px-3"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 rounded-lg border-slate-200 text-slate-600 font-semibold text-xs px-3"
              >
                Tiếp
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

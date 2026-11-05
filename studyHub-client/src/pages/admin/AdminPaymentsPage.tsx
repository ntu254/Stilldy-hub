import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  CreditCard,
  Loader2,
  DollarSign,
  CheckCircle,
  Activity,
  Percent
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import PaymentManagementTable from '@/components/admin/PaymentManagementTable'
import CountingNumber from '@/components/ui/counting-number'
import { adminService, type AdminPaymentItem, type PaymentStatsResponse } from '@/services/adminService'
import { toast } from 'sonner'

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent === 0) return null;

  if (percent < 0.06) {
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: '10px', fontWeight: '800', textShadow: '0px 1px 3px rgba(0,0,0,0.7)' }}
      >
        {`${value}`}
      </text>
    );
  }

  return (
    <g>
      <text
        x={x}
        y={y - 6}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: '11px', fontWeight: '800', textShadow: '0px 1px 3px rgba(0,0,0,0.7)' }}
      >
        {`${value} GD`}
      </text>
      <text
        x={x}
        y={y + 6}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: '9px', fontWeight: '700', opacity: 0.95, textShadow: '0px 1px 3px rgba(0,0,0,0.7)' }}
      >
        {`(${(percent * 100).toFixed(1)}%)`}
      </text>
    </g>
  );
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentItem[]>([])
  const [loading, setLoading] = useState(true)

  // Pagination states
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Stats states (Fetched from API)
  const [stats, setStats] = useState<PaymentStatsResponse | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1) // Reset page to 1 when search query changes
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page to 1 when status filter changes
  const handleStatusFilterChange = (filter: string) => {
    setStatusFilter(filter)
    setPage(1)
  }

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const data = await adminService.getAllPayments({
        page,
        limit: 10,
        search: debouncedSearch,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sortBy,
        sortOrder
      })

      setPayments(data.data)
      setTotalPages(data.meta.totalPages)
      setTotalItems(data.meta.total)
      
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải danh sách giao dịch')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      const data = await adminService.getPaymentStats({ groupBy: 'day' })
      setStats(data)
    } catch (error: any) {
      console.error('Failed to fetch payment stats', error)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])
  useEffect(() => {
    fetchPayments()
  }, [page, debouncedSearch, statusFilter, sortBy, sortOrder])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  const pieData = stats ? [
    { name: 'Thành công', value: stats.overview.successfulTransactions, color: '#4f46e5' }, // indigo-600
    { name: 'Đang xử lý', value: stats.overview.pendingTransactions, color: '#818cf8' }, // indigo-400
    { name: 'Thất bại', value: stats.overview.failedTransactions, color: '#f43f5e' }, // rose-500
    { name: 'Bị hủy', value: stats.overview.cancelledTransactions, color: '#94a3b8' }, // slate-400
    { name: 'Hết hạn', value: stats.overview.expiredTransactions, color: '#cbd5e1' }, // slate-300
  ].filter(item => item.value > 0) : []

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      
      {/* ─── PAGE TITLE HEADER ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <CreditCard className="h-4 w-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Quản trị hệ thống
          </p>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Lịch sử Giao dịch
        </h1>
        <p className="text-sm text-slate-400">
          Xem thông tin chi tiết các giao dịch mua gói dịch vụ từ người dùng.
        </p>
      </motion.div>

      {/* ─── METRIC STAT CARDS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Transactions */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span 
              className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none block whitespace-nowrap truncate"
              title="Tổng giao dịch / TC / Chờ / Hủy"
            >
              Tổng giao dịch / TC / Chờ / Hủy
            </span>
            <h3 className="text-xl font-black text-slate-800 mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              {statsLoading ? '...' : (
                <>
                  <span><CountingNumber value={stats?.overview?.totalTransactions || 0} /></span>
                  <span className="text-xs font-bold text-indigo-600/80 whitespace-nowrap" title="Thành công">/ {stats?.overview?.successfulTransactions || 0} TC</span>
                  <span className="text-xs font-bold text-amber-600/70 whitespace-nowrap" title="Chưa thanh toán/Chờ">/ {stats?.overview?.pendingTransactions || 0} Chờ</span>
                  <span className="text-xs font-bold text-rose-500/70 whitespace-nowrap" title="Hủy & Thất bại & Hết hạn">/ {(stats?.overview?.cancelledTransactions || 0) + (stats?.overview?.failedTransactions || 0) + (stats?.overview?.expiredTransactions || 0)} Hủy</span>
                </>
              )}
            </h3>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100/50">
            <DollarSign className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span 
              className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none block whitespace-nowrap truncate"
              title="Tổng doanh thu / Chưa TT / Hủy"
            >
              Tổng doanh thu / Chưa TT / Hủy
            </span>
            <h3 className="text-xl font-black text-slate-800 mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              {statsLoading ? '...' : (
                <>
                  <span className="whitespace-nowrap">{formatCurrency(stats?.overview?.totalRevenue || 0)}</span>
                  <span className="text-xs font-bold text-amber-600/70 whitespace-nowrap" title="Chưa thanh toán">/ {formatCurrency(stats?.overview?.unpaidRevenue || 0)}</span>
                  <span className="text-xs font-bold text-rose-500/70 whitespace-nowrap" title="Bị hủy">/ {formatCurrency(stats?.overview?.cancelledRevenue || 0)}</span>
                </>
              )}
            </h3>
          </div>
        </div>

        {/* Successful Transactions */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none block whitespace-nowrap truncate">
              Đơn thành công
            </span>
            <h3 className="text-xl font-black text-slate-800 mt-1 truncate">
              {statsLoading ? '...' : <CountingNumber value={stats?.overview?.successfulTransactions || 0} />}
            </h3>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/50">
            <Percent className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none block whitespace-nowrap truncate">
              Tỷ lệ thành công
            </span>
            <h3 className="text-xl font-black text-slate-800 mt-1 truncate">
              {statsLoading ? '...' : `${stats?.overview?.successRate || 0}%`}
            </h3>
          </div>
        </div>

      </div>

      {/* ─── CHARTS SECTION ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs lg:col-span-1 flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-900 mb-2">Tỷ lệ Trạng thái Giao dịch</h3>
          <div className="h-[250px] relative w-full">
            {statsLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
              </div>
            ) : pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} giao dịch`, 'Số lượng']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={44} 
                      iconType="circle" 
                      wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#64748b', paddingTop: '8px' }}
                      formatter={(value: string, entry: any) => (
                        <span className="text-slate-700 font-semibold mr-1.5">
                          {value}: <strong className="font-extrabold text-slate-900">{entry.payload.value}</strong>
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                   <span className="text-[10px] font-bold text-slate-500">Tổng giao dịch</span>
                   <span className="text-xl font-black text-slate-800">{stats?.overview?.totalTransactions}</span>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400 font-medium">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>

        {/* Timeline Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs lg:col-span-2 flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-900 mb-2">Doanh thu theo thời gian</h3>
          <div className="flex-1 h-[250px] relative w-full mt-4">
            {statsLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
              </div>
            ) : stats?.timeline && stats.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.timeline} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    tickFormatter={(val) => {
                      // format "YYYY-MM-DD" to "DD/MM"
                      if (!val) return ''
                      const parts = val.split('-')
                      if (parts.length === 3) return `${parts[2]}/${parts[1]}`
                      return val
                    }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}K`
                      return val
                    }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 600 }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Doanh thu thực tế') return [formatCurrency(value), 'Thực thu']
                      if (name === 'Chưa thanh toán') return [formatCurrency(value), 'Chưa thanh toán']
                      if (name === 'Đã hủy') return [formatCurrency(value), 'Đã hủy']
                      return [value, name]
                    }}
                    labelFormatter={(label) => `Ngày: ${label}`}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }} />
                  <Bar dataKey="unpaidRevenue" name="Chưa thanh toán" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="cancelledRevenue" name="Đã hủy" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="revenue" name="Doanh thu thực tế" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400 font-medium">
                Chưa có dữ liệu giao dịch
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── DATA TABLE COMPONENT ─────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <p className="text-slate-400 text-xs font-semibold">Đang tải danh sách giao dịch...</p>
        </div>
      ) : (
        <PaymentManagementTable
          payments={payments}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          totalItems={totalItems}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(col, order) => {
            setSortBy(col)
            setSortOrder(order)
            setPage(1)
          }}
        />
      )}
    </div>
  )
}

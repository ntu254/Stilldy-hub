import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Users,
  UserCheck,
  UserX,
  Loader2,
  X,
  FileText,
  Eye,
  EyeOff,
  Calendar,
  Mail,
  Shield,
  Activity,
  Phone,
  HardDrive,
  CheckCircle,
  XCircle,
  Globe,
  Lock,
  AlertTriangle,
  Download,
  ExternalLink,
  Layers,
  FileQuestion,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import UserManagementTable from '@/components/admin/UserManagementTable'
import type { UserItem } from '@/components/admin/UserManagementTable'
import CountingNumber from '@/components/ui/counting-number'
import { userService } from '@/services/userService'
import { adminService } from '@/services/adminService'
import { categoryService, type Category } from '@/services/categoryService'
import { toast } from 'sonner'

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'pdf':
      return <FileText className="h-4 w-4 text-rose-500" />
    case 'docx':
    case 'doc':
      return <FileText className="h-4 w-4 text-blue-500" />
    case 'pptx':
    case 'ppt':
      return <FileText className="h-4 w-4 text-orange-500" />
    case 'zip':
    case 'rar':
      return <FileText className="h-4 w-4 text-amber-500" />
    default:
      return <FileQuestion className="h-4 w-4 text-slate-500" />
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [detailUser, setDetailUser] = useState<any | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Document states inside details modal
  const [categories, setCategories] = useState<Category[]>([])
  const [activeTab, setActiveTab] = useState<'public' | 'private' | 'reported'>('public')
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null)

  // Pagination states
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Stats states
  const [totalCount, setTotalCount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [bannedCount, setBannedCount] = useState(0)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1) // Reset page to 1 when search query changes
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page to 1 when status filter changes
  const handleStatusFilterChange = (filter: 'all' | 'active' | 'banned') => {
    setStatusFilter(filter)
    setPage(1)
  }

  const fetchStats = async () => {
    try {
      const stats = await adminService.getDashboardStats()
      setTotalCount(stats.users.total)
      setActiveCount(stats.users.active)
      setBannedCount(stats.users.inactive)
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      let isActive: boolean | undefined = undefined
      if (statusFilter === 'active') {
        isActive = true
      } else if (statusFilter === 'banned') {
        isActive = false
      }

      const data = await userService.getUsers({
        page,
        limit: 10,
        search: debouncedSearch,
        isActive,
        sortBy,
        sortOrder,
      })

      const mapped = data.list.map((u: any) => ({
        id: u._id,
        name: u.displayName || u.email.split('@')[0],
        email: u.email,
        joinDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'N/A',
        status: (u.isActive ? 'online' : 'banned') as 'online' | 'offline' | 'banned',
        isPro: u.isPro,
        storageLimit: u.storageLimit,
        usedStorage: u.usedStorage,
        publicFilesCount: u.publicFilesCount || 0,
        privateFilesCount: u.privateFilesCount || 0,
        reportedFilesCount: u.reportedFilesCount || 0,
      }))
      setUsers(mapped)
      setTotalPages(data.totalPages)
      setTotalItems(data.totalItems)
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải danh sách thành viên')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, debouncedSearch, statusFilter, sortBy, sortOrder])

  useEffect(() => {
    fetchStats()
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getAll()
        setCategories(data)
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }
    fetchCategories()
  }, [])

  // Ban or Unban Handler
  const handleToggleBan = async (userId: string) => {
    const userToToggle = users.find((u) => u.id === userId)
    if (!userToToggle) return

    const isCurrentlyBanned = userToToggle.status === 'banned'
    try {
      if (isCurrentlyBanned) {
        await userService.unbanUser(userId)
        toast.success(`Mở khóa tài khoản ${userToToggle.name} thành công!`)
      } else {
        await userService.banUser(userId)
        toast.success(`Khóa tài khoản ${userToToggle.name} thành công!`)
      }
      
      // Update local state directly so we don't need a full page reload/spinner
      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          if (user.id === userId) {
            return {
              ...user,
              status: isCurrentlyBanned ? 'online' : 'banned',
            }
          }
          return user
        })
      )
      // Refresh database stats
      fetchStats()
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra khi thực hiện thao tác.')
    }
  }

  const handleViewDetails = async (userId: string) => {
    try {
      setLoadingDetail(true)
      const data = await userService.getUserDetails(userId)
      setDetailUser(data)
      setSelectedDoc(null)
      setActiveTab('public')
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải chi tiết thành viên.')
    } finally {
      setLoadingDetail(false)
    }
  }

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
            <Users className="h-4 w-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Quản trị hệ thống
          </p>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Quản lý Thành viên
        </h1>
        <p className="text-sm text-slate-400">
          Xem thông tin chi tiết, lọc trạng thái hoạt động và quản lý quyền truy cập của sinh viên.
        </p>
      </motion.div>

      {/* ─── METRIC STAT CARDS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Users Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Tổng thành viên</span>
            <h3 className="text-xl font-black text-slate-800 mt-1">
              <CountingNumber value={totalCount} />
            </h3>
          </div>
        </div>

        {/* Online Users Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
            <UserCheck className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Đang hoạt động</span>
            <h3 className="text-xl font-black text-slate-800 mt-1">
              <CountingNumber value={activeCount} />
            </h3>
          </div>
        </div>

        {/* Banned Users Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100/50">
            <UserX className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Tài khoản bị khóa</span>
            <h3 className="text-xl font-black text-slate-800 mt-1">
              <CountingNumber value={bannedCount} />
            </h3>
          </div>
        </div>

      </div>

      {/* ─── DATA TABLE COMPONENT ─────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <p className="text-slate-400 text-xs font-semibold">Đang tải danh sách thành viên...</p>
        </div>
      ) : (
        <UserManagementTable
          users={users}
          onToggleBan={handleToggleBan}
          onViewDetails={handleViewDetails}
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

      {/* ─── LOADING OVERLAY ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {loadingDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center gap-3"
            >
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="text-slate-500 text-xs font-semibold">Đang tải thông tin...</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── DETAIL MODAL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {detailUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs">
            {/* Modal Overlay Background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setDetailUser(null); setSelectedDoc(null); }}
              className="absolute inset-0"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white border border-slate-100 shadow-2xl rounded-3xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white select-none shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-xs font-black text-slate-800 tracking-wider uppercase">Chi tiết hồ sơ & kho tài liệu thành viên</span>
                </div>
                <button
                  onClick={() => { setDetailUser(null); setSelectedDoc(null); }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                
                {/* Left Panel: Profile & Tabbed Doc List */}
                <div className="w-full md:w-[38%] flex flex-col h-full border-r border-slate-100 min-h-0 overflow-hidden bg-white">
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    
                    {/* User profile compact section */}
                    <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl text-md font-bold bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0 shadow-2xs select-none overflow-hidden">
                        {detailUser.avatar ? (
                          <img src={detailUser.avatar} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          (detailUser.displayName || detailUser.email).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="text-sm font-black text-slate-900 truncate">
                          {detailUser.displayName || 'Thành viên'}
                        </h3>
                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 font-medium">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {detailUser.email}
                        </p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {detailUser.role === 'admin' ? (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-50 border border-violet-100 text-violet-600 px-1.5 py-0.5 text-[8px] font-black">
                              <Shield className="h-2.5 w-2.5" /> ADMIN
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-500 px-1.5 py-0.5 text-[8px] font-black">
                              USER
                            </span>
                          )}

                          {detailUser.isPro ? (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-600 px-1.5 py-0.5 text-[8px] font-black">
                              PRO ⭐
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-slate-50 border border-slate-200 text-slate-400 px-1.5 py-0.5 text-[8px] font-black">
                              FREE
                            </span>
                          )}

                          {detailUser.isActive ? (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600 px-1.5 py-0.5 text-[8px] font-black">
                              <Activity className="h-2.5 w-2.5" /> ONLINE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 border border-rose-100 text-rose-600 px-1.5 py-0.5 text-[8px] font-black">
                              <UserX className="h-2.5 w-2.5" /> BANNED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* User Details metadata */}
                    <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50/50 border border-slate-100/50 p-3 rounded-xl select-none">
                      <div className="space-y-0.5">
                        <span className="text-slate-400 font-medium">Số điện thoại</span>
                        <p className="text-slate-800 font-bold truncate">{detailUser.phoneNumber || 'Chưa cập nhật'}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-400 font-medium">Ngày gia nhập</span>
                        <p className="text-slate-800 font-bold">
                          {detailUser.createdAt ? new Date(detailUser.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-400 font-medium">Xác thực email</span>
                        <div>
                          {detailUser.isVerified ? (
                            <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">
                              Đã xác thực <CheckCircle className="h-3 w-3 fill-emerald-50 text-emerald-600 shrink-0" />
                            </span>
                          ) : (
                            <span className="text-amber-600 font-extrabold flex items-center gap-0.5">
                              Chưa xác thực <XCircle className="h-3 w-3 fill-amber-50 text-amber-600 shrink-0" />
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-400 font-medium">Dung lượng tối đa</span>
                        <p className="text-slate-800 font-bold">
                          {detailUser.storageLimit ? `${detailUser.storageLimit / (1024 * 1024 * 1024)} GB` : (detailUser.isPro ? '5 GB' : '2 GB')}
                        </p>
                      </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="space-y-2.5">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none select-none">Kho tài liệu của user</h4>
                      <div className="grid grid-cols-3 gap-1 bg-slate-100/80 border border-slate-200/40 p-1 rounded-xl select-none">
                        <button
                          onClick={() => { setActiveTab('public'); setSelectedDoc(null); }}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all cursor-pointer ${
                            activeTab === 'public'
                              ? 'bg-white text-indigo-600 shadow-2xs border border-indigo-100/50'
                              : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                          }`}
                        >
                          <span className="text-xs font-black">{detailUser.uploadedFiles?.public?.length || 0}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 flex items-center gap-0.5 leading-none">
                            <Globe className="h-2.5 w-2.5" /> Công khai
                          </span>
                        </button>
                        <button
                          onClick={() => { setActiveTab('private'); setSelectedDoc(null); }}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all cursor-pointer ${
                            activeTab === 'private'
                              ? 'bg-white text-indigo-600 shadow-2xs border border-indigo-100/50'
                              : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                          }`}
                        >
                          <span className="text-xs font-black">{detailUser.uploadedFiles?.private?.length || 0}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 flex items-center gap-0.5 leading-none">
                            <Lock className="h-2.5 w-2.5" /> Riêng tư
                          </span>
                        </button>
                        <button
                          onClick={() => { setActiveTab('reported'); setSelectedDoc(null); }}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all cursor-pointer ${
                            activeTab === 'reported'
                              ? 'bg-white text-indigo-600 shadow-2xs border border-indigo-100/50'
                              : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                          }`}
                        >
                          <span className="text-xs font-black">{detailUser.uploadedFiles?.reported?.length || 0}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 flex items-center gap-0.5 leading-none">
                            <AlertTriangle className="h-2.5 w-2.5" /> Bị báo cáo
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Document List */}
                    <div className="flex-1 min-h-[220px] md:min-h-0 overflow-y-auto pr-1 space-y-2 select-none">
                      {(() => {
                        const activeList =
                          activeTab === 'public'
                            ? detailUser.uploadedFiles?.public || []
                            : activeTab === 'private'
                            ? detailUser.uploadedFiles?.private || []
                            : detailUser.uploadedFiles?.reported || []

                        if (activeList.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
                              <FileQuestion className="h-8 w-8 text-slate-300 animate-pulse mb-1.5" />
                              <p className="text-[11px] text-slate-400 font-bold">Không có tài liệu nào</p>
                            </div>
                          )
                        }

                        return activeList.map((doc: any) => {
                          const docVersion = doc.versions?.[0]
                          const size = docVersion ? formatFileSize(docVersion.fileSize) : '0 B'
                          const isSelected = selectedDoc?._id === doc._id

                          return (
                            <motion.div
                              key={doc._id}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => setSelectedDoc(doc)}
                              className={`p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 items-center ${
                                isSelected
                                  ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900 shadow-2xs'
                                  : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200/80 hover:bg-slate-50/50'
                              }`}
                            >
                              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-xl bg-slate-50 border border-slate-100/50">
                                {getFileIcon(docVersion?.fileName || doc.title)}
                              </div>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <p className="text-xs font-bold leading-snug truncate">{doc.title}</p>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                                  <span>{size}</span>
                                  <span>•</span>
                                  <span>{new Date(doc.createdAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })
                      })()}
                    </div>

                  </div>
                </div>

                {/* Right Panel: Selected Document Details */}
                <div className="flex-1 flex flex-col h-full bg-slate-50/40 min-h-0 overflow-hidden">
                  
                  {!selectedDoc ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
                      <div className="relative h-20 w-20 flex items-center justify-center bg-indigo-50/50 border border-indigo-100 rounded-3xl shadow-sm mb-4">
                        <FileText className="h-8 w-8 text-indigo-500/80 animate-bounce" style={{ animationDuration: '3s' }} />
                      </div>
                      <h4 className="text-xs font-black text-slate-800 mb-1">Chưa có tài liệu nào được chọn</h4>
                      <p className="text-[10px] text-slate-400 font-bold max-w-xs leading-relaxed">
                        Chọn một tài liệu ở danh sách bên trái để xem thông tin chi tiết và danh sách file đính kèm.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
                      
                      {/* Section 1: Header Info */}
                      <div className="bg-white border border-slate-100/80 rounded-2xl p-5 shadow-xs space-y-4">
                        <div className="flex flex-wrap gap-2 items-center justify-between select-none">
                          {/* Subject Category tag */}
                          {(() => {
                            const currentCat = categories.find((cat) => cat._id === selectedDoc.subjectId)
                            return currentCat ? (
                              <span className="inline-flex items-center rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 text-[9px] font-black">
                                MÔN: {currentCat.name.toUpperCase()}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-slate-50 border border-slate-200/60 text-slate-500 px-2 py-0.5 text-[9px] font-black">
                                MÔN HỌC KHÁC
                              </span>
                            )
                          })()}

                          {/* Status badges */}
                          <div className="flex gap-1.5">
                            {selectedDoc.isPublic ? (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-0.5 text-[8px] font-black">
                                <Globe className="h-2 w-2" /> CÔNG KHAI
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 text-[8px] font-black">
                                <Lock className="h-2 w-2" /> RIÊNG TƯ
                              </span>
                            )}
                            {selectedDoc.isReported && (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 text-[8px] font-black animate-pulse">
                                <AlertTriangle className="h-2.5 w-2.5" /> BỊ BÁO CÁO
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-sm font-black text-slate-800 leading-snug">{selectedDoc.title}</h3>
                          <p className="text-[10px] text-slate-400 font-semibold select-none">
                            Ngày tải lên: {new Date(selectedDoc.createdAt).toLocaleDateString('vi-VN')} {new Date(selectedDoc.createdAt).toLocaleTimeString('vi-VN')}
                          </p>
                        </div>

                        {selectedDoc.description ? (
                          <div className="bg-slate-50 border border-slate-100/50 rounded-xl p-3 text-xs text-slate-600 leading-relaxed font-semibold">
                            {selectedDoc.description}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic font-medium select-none">Không có mô tả cho tài liệu này.</p>
                        )}

                        {/* Tags Row */}
                        {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5 select-none">
                            {selectedDoc.tags.map((tag: string, index: number) => (
                              <span key={index} className="inline-flex items-center rounded-md bg-slate-50 border border-slate-100 text-slate-505 px-2 py-0.5 text-[8px] font-black">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section 2: Metric Statistics Grid */}
                      <div className="grid grid-cols-4 gap-3 select-none">
                        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xs flex flex-col justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Lượt xem</span>
                          <div className="flex items-center gap-1.5 mt-2">
                            <Eye className="h-4 w-4 text-indigo-500" />
                            <span className="text-xs font-black text-slate-800">{selectedDoc.viewCount || 0}</span>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xs flex flex-col justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Lượt tải</span>
                          <div className="flex items-center gap-1.5 mt-2">
                            <Download className="h-4 w-4 text-emerald-500" />
                            <span className="text-xs font-black text-slate-800">{selectedDoc.downloadCount || 0}</span>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xs flex flex-col justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Yêu thích</span>
                          <div className="flex items-center gap-1.5 mt-2">
                            <ThumbsUp className="h-4 w-4 text-sky-500" />
                            <span className="text-xs font-black text-slate-800">{selectedDoc.likes?.length || 0}</span>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xs flex flex-col justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Báo xấu</span>
                          <div className="flex items-center gap-1.5 mt-2">
                            <ThumbsDown className="h-4 w-4 text-rose-500" />
                            <span className="text-xs font-black text-slate-800">{selectedDoc.dislikes?.length || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Versions List */}
                      <div className="space-y-2.5">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none select-none">Tệp tin đính kèm ({selectedDoc.versions?.length || 0})</h4>
                        <div className="space-y-3">
                          {selectedDoc.versions && selectedDoc.versions.length > 0 ? (
                            selectedDoc.versions.map((ver: any, index: number) => (
                              <div key={index} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="flex-shrink-0 h-9 w-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center">
                                    <Layers className="h-4.5 w-4.5 text-indigo-500" />
                                  </div>
                                  <div className="min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="inline-flex items-center rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 px-1 py-0.2 text-[8px] font-black shrink-0">
                                        VER {ver.versionNumber}
                                      </span>
                                      <span className="text-xs font-bold text-slate-800 truncate block" title={ver.fileName}>{ver.fileName}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-slate-400 font-bold select-none">
                                      <span>Kích thước: {formatFileSize(ver.fileSize)}</span>
                                      <span>•</span>
                                      <span className="truncate max-w-[120px] sm:max-w-[200px]" title={ver.fileHash}>
                                        Hash: {ver.fileHash.substring(0, 16)}...
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <a
                                  href={ver.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0 inline-flex items-center gap-1 justify-center rounded-xl bg-[#0F172A] hover:bg-slate-900 text-white text-[11px] font-bold h-8 px-4.5 shadow-2xs transition-all select-none cursor-pointer"
                                >
                                  <ExternalLink className="h-3 w-3" /> Xem
                                </a>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic select-none">Không tìm thấy phiên bản file đính kèm nào.</p>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}


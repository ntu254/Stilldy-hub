import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search,
  UserX,
  UserCheck,
  Calendar,
  Mail,
  X,
  AlertTriangle,
  Info,
  Globe,
  Lock,
  ChevronDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import DocPagination from '@/pages/documents/DocPagination'

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export interface UserItem {
  id: string
  name: string
  email: string
  joinDate: string
  status: 'online' | 'offline' | 'banned'
  isPro?: boolean
  storageLimit?: number
  usedStorage?: number
  publicFilesCount?: number
  privateFilesCount?: number
  reportedFilesCount?: number
}

interface UserManagementTableProps {
  users: UserItem[]
  onToggleBan: (userId: string) => void
  onViewDetails?: (userId: string) => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  statusFilter: 'all' | 'active' | 'banned'
  onStatusFilterChange: (status: 'all' | 'active' | 'banned') => void
  totalItems: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void
}

export default function UserManagementTable({
  users,
  onToggleBan,
  onViewDetails,
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
}: UserManagementTableProps) {
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleActionClick = (user: UserItem) => {
    setSelectedUser(user)
    setIsConfirmOpen(true)
  }

  const handleConfirmAction = () => {
    if (selectedUser) {
      onToggleBan(selectedUser.id)
      setIsConfirmOpen(false)
      setSelectedUser(null)
    }
  }

  const renderSortHeader = (title: string, columnKey: string, widthClass?: string, center?: boolean) => {
    return (
      <th className={cn("px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap", widthClass, center && "text-center")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className={cn("flex items-center gap-1 cursor-pointer hover:text-slate-700 transition-colors", center ? "justify-center" : "")}>
              {title}
              <ChevronDown strokeWidth={3} className={cn("h-3 w-3", sortBy === columnKey ? "text-indigo-500" : "text-slate-400")} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={center ? "center" : "start"} className="w-36">
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
            placeholder="Tìm theo tên hoặc email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 bg-slate-50/30 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {(['all', 'active', 'banned'] as const).map((filter) => (
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
              {filter === 'active' && 'Đang hoạt động'}
              {filter === 'banned' && 'Đã khóa'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── DATA TABLE ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Responsive Horizontal Scroll wrapper */}
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {renderSortHeader('Email', 'email')}
                {renderSortHeader('Ngày gia nhập', 'createdAt', 'w-36')}
                {renderSortHeader('DL Đã dùng', 'usedStorage', '', true)}
                {renderSortHeader('DL Tối đa', 'storageLimit', '', true)}
                {renderSortHeader('Tài liệu', 'totalFilesCount', 'w-36', true)}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-36 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <AnimatePresence initial={false}>
                {users.length > 0 ? (
                  users.map((user) => (
                    <motion.tr
                      key={user.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span>{user.email}</span>
                        </div>
                      </td>

                      {/* Join Date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{user.joinDate}</span>
                        </div>
                      </td>

                      {/* Used Storage */}
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-bold text-slate-600">
                          {formatFileSize(user.usedStorage)}
                        </span>
                      </td>

                      {/* Max Storage */}
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-bold text-slate-600">
                          {formatFileSize(user.storageLimit || (user.isPro ? 5 * 1024 * 1024 * 1024 : 2 * 1024 * 1024 * 1024))}
                        </span>
                      </td>

                      {/* File Stats Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <div className="flex flex-col items-center gap-0.5" title="Công khai">
                            <Globe className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="text-[10px] font-bold text-slate-600">{user.publicFilesCount || 0}</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5" title="Riêng tư">
                            <Lock className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-600">{user.privateFilesCount || 0}</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5" title="Bị báo cáo">
                            <AlertTriangle className={cn("h-3.5 w-3.5", user.reportedFilesCount && user.reportedFilesCount > 0 ? "text-rose-500" : "text-slate-400")} />
                            <span className={cn("text-[10px] font-bold", user.reportedFilesCount && user.reportedFilesCount > 0 ? "text-rose-600" : "text-slate-600")}>{user.reportedFilesCount || 0}</span>
                          </div>
                        </div>
                      </td>



                      {/* Actions Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            onClick={() => onViewDetails && onViewDetails(user.id)}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg text-[10px] font-bold h-7 py-0 px-2.5 border border-slate-200/60 shadow-2xs shrink-0 cursor-pointer"
                          >
                            <Info className="h-3 w-3 mr-1 shrink-0" />
                            Chi tiết
                          </Button>

                          {user.status === 'banned' ? (
                            <Button
                              onClick={() => handleActionClick(user)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 rounded-lg text-[10px] font-bold h-7 py-0 px-2.5 border border-emerald-100 shadow-2xs shrink-0"
                            >
                              <UserCheck className="h-3 w-3 mr-1 shrink-0" />
                              Mở khóa
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleActionClick(user)}
                              variant="destructive"
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg text-[10px] font-bold h-7 py-0 px-2.5 border border-rose-100 shadow-2xs shrink-0"
                            >
                              <UserX className="h-3 w-3 mr-1 shrink-0" />
                              Khóa
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                      Không tìm thấy thành viên phù hợp
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-3 flex justify-between items-center text-[10px] text-slate-400 font-bold shrink-0">
          <span>HIỂN THỊ {users.length} TRÊN {totalItems} THÀNH VIÊN</span>
          <span>HỆ THỐNG Nexus</span>
        </div>
      </div>

      {/* ─── PAGINATION CONTROLS ─────────────────────────────────────────── */}
      <div className="flex justify-center mt-6">
        <DocPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>

      {/* ─── FRAMER MOTION CONFIRM MODAL ───────────────────────────────────── */}
      <AnimatePresence>
        {isConfirmOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            {/* Modal Overlay Background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmOpen(false)}
              className="absolute inset-0"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white border border-slate-100 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden z-10"
            >
              
              {/* Header Close */}
              <div className="absolute top-3.5 right-3.5">
                <button
                  onClick={() => setIsConfirmOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content Panel */}
              <div className="p-6 flex flex-col items-center text-center">
                
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl mb-4 border shadow-xs",
                  selectedUser.status === 'banned'
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {selectedUser.status === 'banned' ? (
                    <UserCheck className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                </div>

                <h3 className="text-sm font-extrabold text-slate-900">
                  {selectedUser.status === 'banned' ? 'Mở khóa tài khoản?' : 'Khóa tài khoản thành viên?'}
                </h3>
                
                <p className="text-slate-500 text-xs mt-2 leading-relaxed px-2">
                  {selectedUser.status === 'banned' ? (
                    <>Bạn có chắc chắn muốn mở khóa cho tài khoản <strong>{selectedUser.name}</strong> ({selectedUser.email})? Họ sẽ lấy lại quyền truy cập đầy đủ.</>
                  ) : (
                    <>Hành động này sẽ tạm khóa tài khoản <strong>{selectedUser.name}</strong> ({selectedUser.email}). Người dùng sẽ không thể truy cập Nexus Engine.</>
                  )}
                </p>

                {/* Confirm Action buttons */}
                <div className="flex gap-2.5 w-full mt-6">
                  <Button
                    onClick={() => setIsConfirmOpen(false)}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-600 hover:text-slate-800 rounded-xl h-9 text-xs font-bold shadow-2xs"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    onClick={handleConfirmAction}
                    className={cn(
                      "flex-1 text-white rounded-xl h-9 text-xs font-bold shadow-sm",
                      selectedUser.status === 'banned'
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    )}
                  >
                    Xác nhận
                  </Button>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

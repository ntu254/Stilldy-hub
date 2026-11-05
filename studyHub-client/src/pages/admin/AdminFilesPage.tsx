import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { FolderOpen, HardDrive, ShieldAlert, Loader2, Files, X, User, Flag, MessageSquare } from 'lucide-react'
import FileManagementTable from '@/components/admin/FileManagementTable'
import type { FileItem } from '@/components/admin/FileManagementTable'
import CountingNumber from '@/components/ui/counting-number'
import { adminService, type DocumentReport } from '@/services/adminService'
import { categoryService, type Category } from '@/services/categoryService'
import { toast } from 'sonner'

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function AdminFilesPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)

  // Pagination states
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Stats states
  const [totalFiles, setTotalFiles] = useState(0)
  const [totalStorage, setTotalStorage] = useState(0)
  const [totalReported, setTotalReported] = useState(0)

  // Filter & Sort states
  const [subjectId, setSubjectId] = useState('')
  const [isPublicFilter, setIsPublicFilter] = useState<'all' | 'true' | 'false'>('all')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [categories, setCategories] = useState<Category[]>([])

  // Reports Modal states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [selectedReportFile, setSelectedReportFile] = useState<FileItem | null>(null)
  const [reportList, setReportList] = useState<DocumentReport[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(false)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1) // Reset page to 1 on search changes
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch categories on mount
  useEffect(() => {
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

  const fetchStats = async () => {
    try {
      const stats = await adminService.getDashboardStats()
      setTotalFiles(stats.documents.totalFiles)
      setTotalStorage(stats.documents.totalCloudSizeInMb)
      setTotalReported(stats.documents.totalReported)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    }
  }

  const fetchReportedDocs = async () => {
    try {
      setLoading(true)

      let isPublic: boolean | undefined = undefined
      if (isPublicFilter === 'true') {
        isPublic = true
      } else if (isPublicFilter === 'false') {
        isPublic = false
      }

      const data = await adminService.getReportedDocuments({
        page,
        limit: 10,
        search: debouncedSearch,
        subjectId: subjectId || undefined,
        isPublic,
        sortBy,
        sortOrder,
      })

      const documents = Array.isArray((data as any).items)
        ? (data as any).items
        : Array.isArray((data as any).data)
          ? (data as any).data
          : []

      const mapped = documents.map((doc) => {
        const version = doc.versions[0]
        const ext = (version?.fileName.split('.').pop() || 'pdf').toLowerCase()
        let fileType: FileItem['type'] = 'pdf'
        if (['pdf', 'pptx', 'docx', 'zip'].includes(ext)) {
          fileType = ext as FileItem['type']
        }

        return {
          id: doc._id,
          title: doc.title,
          uploader: doc.uploadedBy?.displayName || doc.uploadedBy?.email || 'N/A',
          uploadDate: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('vi-VN') : 'N/A',
          size: formatFileSize(version?.fileSize || 0),
          type: fileType,
        }
      })

      setFiles(mapped)
      setTotalPages(data.meta.totalPages)
      setTotalItems(data.meta.totalItems ?? data.meta.total ?? 0)
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải danh sách tài liệu bị báo cáo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportedDocs()
  }, [page, debouncedSearch, subjectId, isPublicFilter, sortBy, sortOrder])

  useEffect(() => {
    fetchStats()
  }, [])

  const handleSubjectIdChange = (id: string) => {
    setSubjectId(id)
    setPage(1)
  }

  const handleIsPublicFilterChange = (status: 'all' | 'true' | 'false') => {
    setIsPublicFilter(status)
    setPage(1)
  }

  const handleDeleteFile = async (fileId: string) => {
    const fileToDelete = files.find((f) => f.id === fileId)
    if (!fileToDelete) return

    try {
      const response = await adminService.moderateDocument(fileId, 'DELETE')
      toast.success(response.message || `Đã xóa tài liệu và ghi nhận vi phạm của người đăng.`)

      // Update local state directly so we don't need a full loading spinner refetch
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      setTotalItems((prev) => Math.max(0, prev - 1))

      // Refresh stats
      fetchStats()
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra khi xóa tài liệu.')
    }
  }

  const handleRejectReport = async (fileId: string) => {
    const fileToKeep = files.find((f) => f.id === fileId)
    if (!fileToKeep) return

    try {
      const response = await adminService.moderateDocument(fileId, 'KEEP')
      toast.success(response.message || `Đã giữ lại tài liệu và gỡ cờ vi phạm.`)

      // Update local state
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      setTotalItems((prev) => Math.max(0, prev - 1))

      // Refresh stats
      fetchStats()
      
      // Đóng modal nếu đang mở
      if (selectedReportFile?.id === fileId) {
        setIsReportModalOpen(false)
      }
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra khi duyệt báo cáo.')
    }
  }

  const handleViewReports = async (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (!file) return

    setSelectedReportFile(file)
    setIsReportModalOpen(true)
    setIsLoadingReports(true)
    try {
      const reports = await adminService.getDocumentReports(fileId)
      setReportList(reports)
    } catch (error: any) {
      toast.error(error.message || 'Không thể lấy danh sách báo cáo')
    } finally {
      setIsLoadingReports(false)
    }
  }

  return (
    <div className='min-h-full px-4 py-6 sm:px-6 lg:px-8 space-y-8'>
      {/* ─── TITLE HEADER ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Files className="h-4 w-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Quản trị hệ thống
          </p>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Quản lý File Hệ thống
        </h1>
        <p className="text-sm text-slate-400">
          Xem xét, kiểm tra và dọn dẹp các tệp tin học liệu sinh viên chia sẻ bị báo cáo vi phạm.
        </p>
      </motion.div>

      {/* ─── STATISTICS METRICS GRID ───────────────────────────────────────── */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        {/* Total Files Card */}
        <div className='bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50'>
            <FolderOpen className='h-5 w-5' />
          </div>
          <div>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none'>
              Tổng số file
            </span>
            <h3 className='text-xl font-black text-slate-800 mt-1'>
              <CountingNumber value={totalFiles} />
            </h3>
          </div>
        </div>

        {/* Space Occupied Card */}
        <div className='bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50'>
            <HardDrive className='h-5 w-5' />
          </div>
          <div>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none'>
              Dung lượng đám mây
            </span>
            <h3 className='text-xl font-black text-slate-800 mt-1'>
              <CountingNumber value={totalStorage} decimalPlaces={2} /> MB
            </h3>
          </div>
        </div>

        {/* Violations Cleaned Card */}
        <div className='bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100/50'>
            <ShieldAlert className='h-5 w-5 animate-pulse' />
          </div>
          <div>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none'>
              Tài liệu bị báo cáo
            </span>
            <h3 className='text-xl font-black text-slate-800 mt-1'>
              <CountingNumber value={totalReported} />
            </h3>
          </div>
        </div>
      </div>

      {/* ─── DATA TABLE COMPONENT ─────────────────────────────────────────── */}
      {loading ? (
        <div className='bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center space-y-4'>
          <Loader2 className='h-8 w-8 text-indigo-600 animate-spin' />
          <p className='text-slate-400 text-xs font-semibold'>Đang tải danh sách file...</p>
        </div>
      ) : (
        <FileManagementTable
          files={files}
          onDeleteFile={handleDeleteFile}
          onRejectReport={handleRejectReport}
          onPreviewDoc={(fileId) => navigate(`/preview/${fileId}`)}
          onViewReports={handleViewReports}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          totalItems={totalItems}
          subjectId={subjectId}
          onSubjectIdChange={handleSubjectIdChange}
          isPublicFilter={isPublicFilter}
          onIsPublicFilterChange={handleIsPublicFilterChange}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(col, order) => {
            setSortBy(col)
            setSortOrder(order)
            setPage(1)
          }}
          categories={categories}
        />
      )}

      {/* ─── VIEW REPORTS MODAL ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isReportModalOpen && selectedReportFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReportModalOpen(false)}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white border border-slate-100 shadow-2xl rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shadow-xs">
                    <Flag className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Danh sách báo cáo</h3>
                    <p className="text-xs text-slate-500 font-medium truncate max-w-[250px] sm:max-w-xs" title={selectedReportFile.title}>
                      {selectedReportFile.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white hover:shadow-xs hover:text-slate-700 transition-all border border-transparent hover:border-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
                {isLoadingReports ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                    <p className="text-slate-400 text-xs font-semibold">Đang tải danh sách báo cáo...</p>
                  </div>
                ) : reportList.length > 0 ? (
                  <div className="space-y-3">
                    {reportList.map((report) => (
                      <div key={report._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-4 hover:border-indigo-200 transition-colors">
                        <img 
                          src={report.reportedBy?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${report.reportedBy?.displayName || report.reportedBy?.email}&backgroundColor=c0aede`} 
                          alt="avatar" 
                          className="h-10 w-10 rounded-full border-2 border-indigo-50"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                            <span className="text-sm font-bold text-slate-800 truncate">
                              {report.reportedBy?.displayName || 'Người dùng ẩn danh'}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full w-fit">
                              {new Date(report.createdAt).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-500 mb-2 truncate">
                            {report.reportedBy?.email}
                          </p>
                          <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-100 flex items-start gap-2.5">
                            <MessageSquare className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-700 font-medium leading-relaxed">
                              {report.reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <ShieldAlert className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 text-sm font-semibold">Chưa có báo cáo nào cho tài liệu này</p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-3 justify-end items-center">
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Đóng
                </button>
                <div className="w-full sm:w-auto flex gap-3">
                  <button
                    onClick={() => handleRejectReport(selectedReportFile.id)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    Giữ lại (Bỏ qua)
                  </button>
                  <button
                    onClick={() => {
                      setIsReportModalOpen(false);
                      handleDeleteFile(selectedReportFile.id);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    Xóa file
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  FolderOpen,
  HardDrive,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  Globe,
  Lock,
} from 'lucide-react'
import DocumentManagementTable from '@/components/admin/DocumentManagementTable'
import type { DocumentItem, Category } from '@/components/admin/DocumentManagementTable'
import CountingNumber from '@/components/ui/counting-number'
import { toast } from 'sonner'
import {
  adminService,
  type AdminDocument,
  type QueryAdminDocumentsParams,
} from '@/services/adminService'
import { categoryService } from '@/services/categoryService'

// Helper: định dạng file size từ bytes
const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Helper: trích xuất extension từ fileName trong versions
const getFileType = (doc: AdminDocument): string => {
  const latestVersion = doc.versions?.[doc.versions.length - 1]
  if (!latestVersion?.fileName) return 'file'
  const ext = latestVersion.fileName.split('.').pop()?.toLowerCase() ?? 'file'
  return ext
}

// Helper: tổng size của tất cả versions
const getTotalSize = (doc: AdminDocument): number => {
  return doc.versions?.reduce((sum, v) => sum + (v.fileSize ?? 0), 0) ?? 0
}

// Helper: map AdminDocument → DocumentItem để pass vào table
const mapToDocumentItem = (doc: AdminDocument): DocumentItem => ({
  id: doc._id,
  title: doc.title,
  uploader: doc.uploadedBy?.displayName ?? doc.uploadedBy?.email ?? '(Đã xóa)',
  uploadDate: new Date(doc.createdAt).toLocaleDateString('vi-VN'),
  size: formatFileSize(getTotalSize(doc)),
  type: getFileType(doc) as any,
  isPublic: doc.isPublic,
  isDeleted: doc._destroy,
  isReported: doc.isReported,
})

const ITEMS_PER_PAGE = 10

export default function AdminDocumentsPage() {
  const navigate = useNavigate()

  // ─── Data states ───────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  // ─── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const [totalFiles, setTotalFiles] = useState(0)
  const [publicFiles, setPublicFiles] = useState(0)
  const [privateFiles, setPrivateFiles] = useState(0)
  const [totalReported, setTotalReported] = useState(0)
  const [totalCloudSizeInMb, setTotalCloudSizeInMb] = useState(0)

  // ─── Search & Filter states ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [isPublicFilter, setIsPublicFilter] = useState<'all' | 'true' | 'false'>('all')
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'pdf' | 'docx' | 'pptx' | 'zip'>('all')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // ─── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page khi filter thay đổi
  useEffect(() => {
    setPage(1)
  }, [isPublicFilter, subjectId, fileTypeFilter, sortBy, sortOrder])

  // ─── Fetch categories & Stats ──────────────────────────────────────────────
  useEffect(() => {
    categoryService.getAll()
      .then(setCategories)
      .catch(() => {/* silently ignore */})

    adminService.getDashboardStats()
      .then((stats) => {
        setTotalFiles(stats.documents.totalFiles)
        setPublicFiles(stats.documents.publicFiles)
        setPrivateFiles(stats.documents.privateFiles)
        setTotalReported(stats.documents.totalReported)
        setTotalCloudSizeInMb(stats.documents.totalCloudSizeInMb)
      })
      .catch((err) => console.error('Error fetching dashboard stats:', err))
  }, [])

  // ─── Fetch documents from API ──────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const params: QueryAdminDocumentsParams = {
        page,
        limit: ITEMS_PER_PAGE,
        sortBy,
        sortOrder,
      }

      if (debouncedSearch) params.search = debouncedSearch
      if (subjectId)        params.subjectId = subjectId
      if (isPublicFilter !== 'all') params.isPublic = isPublicFilter

      const res = await adminService.getAllDocuments(params)

      const items = (res.data ?? []).map(mapToDocumentItem)
      setDocuments(items)
      setTotalItems(res.meta?.total ?? 0)
      setTotalPages(res.meta?.totalPages ?? 1)

      // Dữ liệu Stats được lấy từ getDashboardStats ở useEffect
      // const allDocs = res.data ?? []
      // setTotalFiles(res.meta?.total ?? 0)
      // setTotalPublic(allDocs.filter(d => d.isPublic).length)
      // setTotalPrivate(allDocs.filter(d => !d.isPublic).length)
      // setTotalStorageBytes(allDocs.reduce((sum, d) => sum + getTotalSize(d), 0))
    } catch (err: any) {
      toast.error(err?.message ?? 'Không thể tải danh sách tài liệu')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, subjectId, isPublicFilter, sortBy, sortOrder])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // ─── Handlers ─────────────────────────────────────────────────────────────

  /** Xóa mềm: _destroy = true, file vẫn còn trên Cloud */
  const handleSoftDelete = async (docId: string) => {
    const doc = documents.find(d => d.id === docId)
    try {
      const res = await adminService.softDeleteDocument(docId)
      toast.success(res.message ?? `Đã ẩn tài liệu: "${doc?.title}"`)
      fetchDocuments()
    } catch (err: any) {
      toast.error(err?.message ?? 'Không thể ẩn tài liệu')
    }
  }

  /** Xóa vĩnh viễn: xóa DB + Cloud Storage */
  const handleHardDelete = async (docId: string) => {
    const doc = documents.find(d => d.id === docId)
    try {
      const res = await adminService.hardDeleteDocument(docId)
      toast.success(res.message ?? `Đã xóa vĩnh viễn: "${doc?.title}"`)
      fetchDocuments()
    } catch (err: any) {
      toast.error(err?.message ?? 'Không thể xóa vĩnh viễn tài liệu')
    }
  }

  /** Xem chi tiết tài liệu – navigate đến trang preview */
  const handlePreviewDoc = (docId: string) => {
    navigate(`/preview/${docId}`)
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      
      {/* ─── TITLE HEADER ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <FolderOpen className="h-4 w-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Quản trị hệ thống
          </p>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Quản lý Tài liệu Hệ thống
        </h1>
        <p className="text-sm text-slate-400">
          Duyệt danh sách, tìm kiếm học liệu của toàn bộ sinh viên, gỡ bỏ tài liệu lỗi hoặc thay đổi trạng thái chia sẻ.
        </p>
      </motion.div>

      {/* ─── STATISTICS METRICS GRID ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Files Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Tổng tài liệu</span>
            <h3 className="text-xl font-black text-slate-800 mt-1">
              <CountingNumber value={totalFiles} />
            </h3>
          </div>
        </div>

        {/* Public Files Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Công khai</span>
            <h3 className="text-xl font-black text-slate-800 mt-1">
              <CountingNumber value={publicFiles} />
            </h3>
          </div>
        </div>

        {/* Private Files Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-200">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Riêng tư</span>
            <h3 className="text-xl font-black text-slate-800 mt-1">
              <CountingNumber value={privateFiles} />
            </h3>
          </div>
        </div>

        {/* Reported Files Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100/50">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Bị báo cáo</span>
            <h3 className="text-xl font-black text-slate-800 mt-1">
              <CountingNumber value={totalReported} />
            </h3>
          </div>
        </div>

        {/* Space Occupied Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100/50">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Dung lượng</span>
            <h3 className="text-xl font-black text-slate-800 mt-1">
              {totalCloudSizeInMb} MB
            </h3>
          </div>
        </div>

      </div>

      {/* ─── DATA TABLE COMPONENT ─────────────────────────────────────────── */}
      {loading && documents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <p className="text-slate-400 text-xs font-semibold">Đang tải dữ liệu từ máy chủ...</p>
        </div>
      ) : (
        <DocumentManagementTable
          documents={documents}
          onDeleteDoc={handleSoftDelete}
          onHardDeleteDoc={handleHardDelete}
          onPreviewDoc={handlePreviewDoc}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          totalItems={totalItems}
          subjectId={subjectId}
          onSubjectIdChange={setSubjectId}
          isPublicFilter={isPublicFilter}
          onIsPublicFilterChange={setIsPublicFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(col, order) => {
            setSortBy(col)
            setSortOrder(order)
            setPage(1)
          }}
          categories={categories}
          fileTypeFilter={fileTypeFilter}
          onFileTypeFilterChange={setFileTypeFilter}
          isLoading={loading}
        />
      )}

    </div>
  )
}

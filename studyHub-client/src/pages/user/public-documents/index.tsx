import { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import {
  Search,
  SlidersHorizontal,
  FileText,
  Grid3X3,
  LayoutList,
  Globe,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { staggerContainer } from '@/utils/motion'
import { cn } from '@/lib/utils'
import { documentService } from '@/services/documentService'
import { toast } from 'sonner'

// Shared document components
import { TYPE_LABELS, SORT_LABELS } from '../../documents/helpers'
import DocCard from '../../documents/DocCard'
import DocRow from '../../documents/DocRow'
import DocGridSkeleton from '../../documents/DocGridSkeleton'
import FilterDropdown from '../../documents/FilterDropdown'
import DocPagination from '../../documents/DocPagination'
import type { DocType, SortType, DocumentItem } from '@/types/document'

import { mapToDocumentItem } from './helpers'

// ─── Map filter types → server query params ──────────────────

/** Map DocType filter → server fileType param */
function docTypeToServerFileType(type: DocType): string | undefined {
  switch (type) {
    case 'pdf': return 'pdf'
    case 'doc': return 'docx'
    case 'img': return 'image'
    default: return undefined
  }
}

/** Map SortType → server sortBy and sortOrder parameters */
function sortTypeToServerParams(sort: SortType): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  switch (sort) {
    case 'oldest':
      return { sortBy: 'createdAt', sortOrder: 'asc' }
    case 'name_asc':
      return { sortBy: 'title', sortOrder: 'asc' }
    case 'name_desc':
      return { sortBy: 'title', sortOrder: 'desc' }
    case 'size_asc':
      return { sortBy: 'fileSize', sortOrder: 'asc' }
    case 'size_desc':
      return { sortBy: 'fileSize', sortOrder: 'desc' }
    case 'newest':
    default:
      return { sortBy: 'createdAt', sortOrder: 'desc' }
  }
}

const ITEMS_PER_PAGE = 8

export default function PublicDocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocType>('all')
  const [sortBy, setSortBy] = useState<SortType>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentPage, setCurrentPage] = useState(1)

  // API state
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [totalDocs, setTotalDocs] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch public documents from API (server-side pagination)
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const sortParams = sortTypeToServerParams(sortBy)
      const params: Record<string, string> = {
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
        sortBy: sortParams.sortBy,
        sortOrder: sortParams.sortOrder,
      }

      if (debouncedSearch.trim()) {
        params.title = debouncedSearch.trim()
      }

      const serverFileType = docTypeToServerFileType(typeFilter)
      if (serverFileType) {
        params.fileType = serverFileType
      }

      const response = await documentService.getPublic(params)
      const mapped = response.data.map(mapToDocumentItem)
      setDocuments(mapped)
      setTotalDocs(response.meta.total)
      setTotalPages(response.meta.totalPages)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách tài liệu công khai.')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, debouncedSearch, typeFilter, sortBy])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Reset page when filters change
  const resetPage = () => setCurrentPage(1)

  const toggleStar = async (id: string) => {
    const doc = documents.find(d => d.id === id)
    if (!doc) return

    const newStarred = !doc.starred
    // Optimistic UI update
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, starred: newStarred } : d))

    try {
      const response = await documentService.save(id)
      toast.success(response.message)
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, starred: response.isSaved, isSavedByUser: response.isSaved } : d))
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thực hiện lưu tài liệu.')
      // Revert optimistic update
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, starred: doc.starred } : d))
    }
  }

  const handleShareLink = async (doc: DocumentItem) => {
    try {
      const result = await documentService.getShareLink(doc.id)
      await navigator.clipboard.writeText(result.shareLink)
      toast.success(`Đã sao chép link chia sẻ nhanh của "${doc.title}"!`)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lấy link chia sẻ.')
    }
  }

  const handleDownloadDocument = async (doc: DocumentItem) => {
    try {
      toast.info(`Đang tải xuống "${doc.title}"...`)
      const blob = await documentService.download(doc.id)

      // Lấy extension chính xác từ tên file gốc trên server
      let filename: string
      if (doc.originalFileName) {
        const origExt = doc.originalFileName.split('.').pop()?.toLowerCase() || ''
        filename = doc.title.toLowerCase().endsWith(`.${origExt}`)
          ? doc.title
          : `${doc.title}.${origExt}`
      } else {
        let ext: string = doc.type
        if (ext === 'doc') ext = 'docx'
        else if (ext === 'ppt') ext = 'pptx'
        else if (ext === 'xls') ext = 'xlsx'
        filename = doc.title
        if (!filename.toLowerCase().endsWith(`.${ext}`)) {
          filename = `${filename}.${ext}`
        }
      }

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success(`Tải xuống "${doc.title}" thành công.`)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải xuống tài liệu.')
    }
  }

  // No-op handlers for public documents (user doesn't own these)
  const handleToggleVisibility = () => {}
  const handleDelete = () => {}

  const activeFiltersCount = typeFilter !== 'all' ? 1 : 0

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
            <Globe className="h-3 w-3" /> Cộng đồng
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Khám phá tài liệu</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {isLoading ? 'Đang tải...' : `${totalDocs} tài liệu`}
          </p>
        </div>
      </motion.div>

      {/* ── Search + Filter Bar ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap"
      >
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            id="public-documents-search"
            type="search"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); resetPage() }}
            placeholder="Tìm kiếm theo tên tài liệu..."
            className="pl-10 pr-4 h-9 rounded-xl border-slate-200 bg-white text-sm placeholder:text-slate-400 shadow-sm focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-1">
            <SlidersHorizontal className="h-3 w-3" />
            {activeFiltersCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                {activeFiltersCount}
              </span>
            )}
          </div>

          <FilterDropdown
            label="Loại file"
            value={typeFilter}
            options={TYPE_LABELS}
            onSelect={v => { setTypeFilter(v); resetPage() }}
          />

          <FilterDropdown
            label="Sắp xếp"
            value={sortBy}
            options={SORT_LABELS}
            isSort
            onSelect={v => { setSortBy(v); resetPage() }}
          />

          {(activeFiltersCount > 0 || searchQuery) && (
            <button
              onClick={() => { setTypeFilter('all'); setSortBy('newest'); setSearchQuery(''); resetPage() }}
              className="text-[11px] font-semibold text-slate-400 hover:text-rose-500 transition-colors underline underline-offset-2"
            >
              Xóa bộ lọc
            </button>
          )}

          {/* View Toggle */}
          <div className="ml-auto flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                viewMode === 'grid' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
              )}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                viewMode === 'list' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
              )}
              aria-label="List view"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Loading State ─────────────────────────────────────────── */}
      {isLoading && (
        <DocGridSkeleton viewMode={viewMode} count={ITEMS_PER_PAGE} />
      )}

      {/* ── Error State ──────────────────────────────────────────── */}
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <FileText className="h-10 w-10 text-red-400" />
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={fetchDocuments}>
            Thử lại
          </Button>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      {!isLoading && !error && (
        <>
          {/* Results Summary */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="text-xs font-medium text-slate-400"
          >
            {documents.length === 0
              ? 'Không tìm thấy tài liệu nào'
              : `Hiển thị ${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, totalDocs)} / ${totalDocs} tài liệu`
            }
          </motion.p>

          {/* Empty State */}
          {documents.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
                <Globe className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-700 mb-1">Chưa có tài liệu công khai</h3>
              <p className="text-sm text-slate-400 max-w-xs">Các tài liệu được cộng đồng chia sẻ công khai sẽ hiển thị ở đây.</p>
            </motion.div>
          )}

          {/* Grid View */}
          {documents.length > 0 && viewMode === 'grid' && (
            <motion.div
              key={`grid-p${currentPage}-t${typeFilter}-o${sortBy}`}
              variants={staggerContainer(0.07)}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
              {documents.map(doc => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  onToggleStar={toggleStar}
                  onToggleVisibility={handleToggleVisibility}
                  onShare={handleShareLink}
                  onDelete={handleDelete}
                  onDownload={handleDownloadDocument}
                  showContextMenu={false}
                />
              ))}
            </motion.div>
          )}

          {/* List View */}
          {documents.length > 0 && viewMode === 'list' && (
            <motion.div
              key={`list-p${currentPage}-t${typeFilter}-o${sortBy}`}
              variants={staggerContainer(0.04)}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-2.5"
            >
              {documents.map(doc => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  onToggleStar={toggleStar}
                  onToggleVisibility={handleToggleVisibility}
                  onShare={handleShareLink}
                  onDelete={handleDelete}
                  onDownload={handleDownloadDocument}
                  showContextMenu={false}
                />
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {documents.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100"
            >
              <p className="text-xs text-slate-400 font-medium">
                Trang {currentPage} / {totalPages}
              </p>
              <DocPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </motion.div>
          )}
        </>
      )}

    </div>
  )
}

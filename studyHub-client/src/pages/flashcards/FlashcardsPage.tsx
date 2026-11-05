import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { flashcardService } from '@/services/flashcardService'
import type { FlashcardCollection } from '@/types/flashcard'
import { slideInUp, staggerContainer } from '@/utils/motion'
import {
  BookOpen,
  ChevronRight,
  Edit3,
  Eye,
  Globe,
  Layers,
  Loader2,
  Lock,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  SortAsc,
  Star,
  Trash2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import DocPagination from '../documents/DocPagination'
import CreateFlashcardModal from './components/CreateFlashcardModal'
import DeleteConfirmDialog from './components/DeleteConfirmDialog'

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} giờ trước`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay} ngày trước`
  return date.toLocaleDateString('vi-VN')
}

export default function FlashcardsPage() {
  const navigate = useNavigate()
  const [rawCollections, setRawCollections] = useState<FlashcardCollection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'title' | 'viewCount'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FlashcardCollection | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  const fetchCollections = async () => {
    try {
      setIsLoading(true)
      const res = await flashcardService.getMyCollections({ limit: '100' })
      setRawCollections(res.data)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách bộ thẻ.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCollections()
  }, [])


  // Perform local search, filtering, and sorting
  const filteredAndSortedCollections = useMemo(() => {
    let result = [...rawCollections]

    // 1. Search Query Filter
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim()
      result = result.filter(col =>
        col.title.toLowerCase().includes(q) ||
        (col.description && col.description.toLowerCase().includes(q))
      )
    }

    // 2. Sorting
    result.sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title, 'vi') * order
      }
      if (sortBy === 'viewCount') {
        return (a.viewCount - b.viewCount) * order
      }
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order
    })

    return result
  }, [rawCollections, debouncedSearch, sortBy, sortOrder])

  // Pagination calculations
  const totalCols = filteredAndSortedCollections.length
  const totalPages = Math.ceil(totalCols / 8) || 1

  const displayedCollections = useMemo(() => {
    const start = (currentPage - 1) * 8
    return filteredAndSortedCollections.slice(start, start + 8)
  }, [filteredAndSortedCollections, currentPage])

  const handleDelete = async (col: FlashcardCollection) => {
    try {
      await flashcardService.remove(col._id)
      toast.success(`Đã xóa bộ thẻ "${col.title}".`)
      setDeleteTarget(null)
      setRawCollections(prev => prev.filter(c => c._id !== col._id))
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa bộ thẻ.')
    }
  }

  const handleCreateSuccess = () => {
    setCreateOpen(false)
    fetchCollections()
  }

  const SORT_OPTIONS: { label: string; value: 'createdAt' | 'title' | 'viewCount' }[] = [
    { label: 'Mới nhất', value: 'createdAt' },
    { label: 'Tên (A-Z)', value: 'title' },
    { label: 'Lượt xem', value: 'viewCount' },
  ]

  return (
    <>
      <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-1">
              <Layers className="h-3 w-3" /> Flashcards
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Bộ thẻ ghi nhớ của tôi</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {isLoading ? 'Đang tải...' : `${totalCols} bộ thẻ`}
            </p>
          </div>

          <Button
            onClick={() => setCreateOpen(true)}
            id="create-flashcard-btn"
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10 px-5 text-sm font-semibold gap-2 shadow-md shadow-violet-600/20 transition-all shrink-0"
          >
            <Plus className="h-4 w-4" />
            Tạo bộ thẻ mới
          </Button>
        </motion.div>

        {/* ── Summary Stats ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.06 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {[
            { label: 'Tổng bộ thẻ', value: totalCols, icon: Layers, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Đang công khai', value: rawCollections.filter(c => c.isPublic).length, icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Riêng tư', value: rawCollections.filter(c => !c.isPublic).length, icon: Lock, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', bg)}>
                <Icon className={cn('h-4 w-4', color)} />
              </div>
              <div>
                <p className="text-lg font-extrabold text-slate-900 leading-none">{value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Search + Sort Bar ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              id="flashcard-search"
              type="search"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              placeholder="Tìm kiếm theo tiêu đề bộ thẻ..."
              className="pl-10 pr-4 h-9 rounded-xl border-slate-200 bg-white text-sm placeholder:text-slate-400 shadow-sm focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <SlidersHorizontal className="h-3 w-3" /> Sắp xếp
            </div>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  if (sortBy === opt.value) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
                  else { setSortBy(opt.value); setSortOrder('desc') }
                  setCurrentPage(1)
                }}
                className={cn(
                  'h-8 px-3 rounded-xl text-xs font-semibold transition-all border',
                  sortBy === opt.value
                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-violet-200 hover:text-violet-600'
                )}
              >
                {opt.label}
                {sortBy === opt.value && (
                  <SortAsc className={cn('inline h-3 w-3 ml-1 transition-transform', sortOrder === 'desc' && 'rotate-180')} />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Loading State ─────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
            <p className="text-sm text-slate-500">Đang tải bộ thẻ...</p>
          </div>
        )}

        {/* ── Empty State ──────────────────────────────────────────── */}
        {!isLoading && totalCols === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-50 mb-5">
              <BookOpen className="h-9 w-9 text-violet-400" />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-1">Chưa có bộ thẻ nào</h3>
            <p className="text-sm text-slate-400 max-w-xs mb-5">
              {searchQuery ? 'Không tìm thấy bộ thẻ phù hợp. Thử từ khóa khác.' : 'Tạo bộ thẻ đầu tiên để bắt đầu học với phương pháp Flashcard hiệu quả.'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-md shadow-violet-600/20"
              >
                <Plus className="h-4 w-4 mr-2" /> Tạo bộ thẻ đầu tiên
              </Button>
            )}
          </motion.div>
        )}

        {/* ── Collections Grid ──────────────────────────────────────── */}
        {!isLoading && totalCols > 0 && (
          <>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-medium text-slate-400"
            >
              Hiển thị {(currentPage - 1) * 8 + 1}–{Math.min(currentPage * 8, totalCols)} / {totalCols} bộ thẻ
            </motion.p>

            <motion.div
              key={`page-${currentPage}-sort-${sortBy}-${sortOrder}-search-${debouncedSearch}`}
              initial="hidden"
              animate="show"
              variants={staggerContainer(0.07)}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              {displayedCollections.map(col => (
                <CollectionCard
                  key={col._id}
                  col={col}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onOpen={() => navigate(`/flashcards/${col._id}`)}
                  onDelete={() => setDeleteTarget(col)}
                  onEdit={() => navigate(`/dashboard/flashcards/${col._id}/edit`)}
                />
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
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

      {/* Create Modal */}
      <CreateFlashcardModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </>
  )
}

// ─── Collection Card ──────────────────────────────────────────────────────────
interface CollectionCardProps {
  col: FlashcardCollection
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  onOpen: () => void
  onDelete: () => void
  onEdit: () => void
}

function CollectionCard({ col, openMenuId, setOpenMenuId, onOpen, onDelete, onEdit }: CollectionCardProps) {
  const markedCount = Array.isArray(col.cards)
    ? col.cards.filter(c => c.markedBy && c.markedBy.length > 0).length
    : 0
  const totalCards = col.totalCards ?? col.cards?.length ?? 0
  const author = typeof col.createdBy === 'object' ? col.createdBy : null
  const avatarLetter = author?.displayName?.charAt(0).toUpperCase() ?? 'U'
  const isMenuOpen = openMenuId === col._id

  return (
    <motion.div variants={slideInUp} className="h-full">
      <div
        className="group relative h-full bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-violet-100/60 hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer overflow-hidden"
        onClick={e => {
          const target = e.target as HTMLElement
          if (!target.closest('[data-menu]')) onOpen()
        }}
        id={`flashcard-col-${col._id}`}
      >
     

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {col.isPublic ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 px-2.5 py-0.5 text-[10px] font-bold shadow-3xs">
                <Globe className="h-3 w-3 text-emerald-500 animate-pulse" />
                Công khai
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 px-2.5 py-0.5 text-[10px] font-bold">
                <Lock className="h-3 w-3 text-amber-500" />
                Riêng tư
              </span>
            )}
          </div>

          {/* Context menu */}
          <div className="relative" data-menu>
            <button
              onClick={e => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : col._id) }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors opacity-0 group-hover:opacity-100"
              id={`col-menu-${col._id}`}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  data-menu
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-8 z-20 min-w-[140px] rounded-xl bg-white border border-slate-100 shadow-xl py-1"
                >
                  <button
                    onClick={e => { e.stopPropagation(); onEdit(); setOpenMenuId(null) }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-slate-400" /> Chỉnh sửa
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(); setOpenMenuId(null) }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xóa bộ thẻ
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Title */}
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors">
            {col.title}
          </h3>
          {col.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{col.description}</p>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
              <Layers className="h-3 w-3 text-violet-400" /> {totalCards} thẻ
            </span>
            {markedCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-500">
                <Star className="h-3 w-3 fill-rose-400" /> {markedCount}
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
              <Eye className="h-3 w-3" /> {col.viewCount}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Footer: Author + time */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-[9px] font-bold text-white overflow-hidden">
            {author?.avatar ? (
              <img src={author.avatar} alt="" className="h-full w-full object-cover" />
            ) : avatarLetter}
          </div>
          <p className="text-[10px] text-slate-400 font-medium truncate flex-1">
            {author?.displayName ?? 'Bạn'}
          </p>
          <span className="text-[10px] text-slate-300 shrink-0">
            {(() => {
              try { return formatRelativeTime(col.updatedAt) } catch { return '' }
            })()}
          </span>
        </div>
      </div>
    </div>
  </motion.div>
  )
}

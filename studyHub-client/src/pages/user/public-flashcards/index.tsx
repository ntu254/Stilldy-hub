import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { flashcardService } from '@/services/flashcardService'
import type { FlashcardCollection } from '@/types/flashcard'
import { slideInUp, staggerContainer } from '@/utils/motion'
import {
  BookOpen,
  ChevronRight,
  Eye,
  Globe,
  Layers,
  Loader2,
  Search,
  SlidersHorizontal,
  SortAsc
} from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DocPagination from '../../documents/DocPagination'

function formatRelativeTime(dateStr: string): string {
  try {
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
  } catch {
    return ''
  }
}

const ITEMS_PER_PAGE = 8

export default function PublicFlashcardsDashboardPage() {
  const navigate = useNavigate()
  const [collections, setCollections] = useState<FlashcardCollection[]>([])
  const [totalCols, setTotalCols] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'title' | 'viewCount'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch public flashcard collections
  const fetchPublicCollections = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await flashcardService.getPublicCollections({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        search: debouncedSearch.trim(),
        sortBy,
        sortOrder,
      })

      setCollections(res.data || [])
      setTotalCols(res.meta?.total ?? res.data.length)
      setTotalPages(res.meta?.totalPages ?? 1)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách bộ thẻ công khai.')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, debouncedSearch, sortBy, sortOrder])

  useEffect(() => {
    fetchPublicCollections()
  }, [fetchPublicCollections])

  const SORT_OPTIONS: { label: string; value: 'createdAt' | 'title' | 'viewCount' }[] = [
    { label: 'Mới nhất', value: 'createdAt' },
    { label: 'Tên (A-Z)', value: 'title' },
    { label: 'Lượt xem', value: 'viewCount' },
  ]

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
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-1">
            <Globe className="h-3 w-3" /> Cộng đồng
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Thư viện Flashcard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {isLoading ? 'Đang tải...' : `${totalCols} bộ thẻ công khai`}
          </p>
        </div>
      </motion.div>

      {/* ── Search + Sort Bar ─────────────────────────────────────────── */}
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
            id="public-flashcard-search"
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tiêu đề bộ thẻ..."
            className="pl-10 pr-4 h-9 rounded-xl border-slate-200 bg-white text-sm placeholder:text-slate-400 shadow-sm focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all"
          />
        </div>

        {/* Sort Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-1">
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
                'h-8 px-3 rounded-xl text-xs font-semibold transition-all border cursor-pointer',
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
          <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Đang tải danh sách bộ thẻ công khai...</p>
        </div>
      )}

      {/* ── Error State ──────────────────────────────────────────── */}
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-2xl border border-slate-100 p-6 text-center">
          <p className="text-sm text-rose-600 font-medium">{error}</p>
          <Button variant="outline" size="sm" className="rounded-xl font-semibold" onClick={fetchPublicCollections}>
            Thử lại
          </Button>
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────────────── */}
      {!isLoading && !error && collections.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 mb-4">
            <BookOpen className="h-7 w-7 text-violet-400" />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">Chưa có bộ thẻ công khai nào</h3>
          <p className="text-sm text-slate-400 max-w-xs">
            {searchQuery ? 'Không tìm thấy bộ thẻ phù hợp. Thử lại với từ khóa khác.' : 'Các bộ thẻ được cộng đồng chia sẻ sẽ hiển thị ở đây.'}
          </p>
        </motion.div>
      )}

      {/* ── Collections Grid ──────────────────────────────────────── */}
      {!isLoading && !error && collections.length > 0 && (
        <>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs font-medium text-slate-400"
          >
            Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalCols)} / {totalCols} bộ thẻ
          </motion.p>

          <motion.div
            key={`page-${currentPage}-sort-${sortBy}-${sortOrder}-search-${debouncedSearch}`}
            initial="hidden"
            animate="show"
            variants={staggerContainer(0.07)}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch"
          >
            {collections.map(col => {
              const totalCards = col.totalCards ?? col.cards?.length ?? 0
              const author = typeof col.createdBy === 'object' ? col.createdBy : null
              const authorName = author?.displayName || author?.email || 'Thành viên'
              const avatarLetter = authorName.charAt(0).toUpperCase()

              return (
                <motion.div key={col._id} variants={slideInUp} className="h-full flex flex-col">
                  <div
                    onClick={() => navigate(`/flashcards/${col._id}`)}
                    className="group relative h-full flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-violet-100/60 hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer overflow-hidden"
                  >
                    <div className="p-4 flex flex-col gap-3 flex-1">
                      {/* Header row */}
                      <div className="flex items-center justify-between gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 px-2.5 py-0.5 text-[10px] font-bold shadow-3xs">
                          <Globe className="h-3 w-3 text-emerald-500 animate-pulse" />
                          Công khai
                        </span>

                        <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                          <Eye className="h-3 w-3" />
                          <span>{col.viewCount}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 flex flex-col">
                        <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 h-10 group-hover:text-violet-700 transition-colors">
                          {col.title}
                        </h3>
                        {col.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{col.description}</p>
                        )}

                        <div className="mt-auto pt-3 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[11px] font-bold text-violet-700 bg-violet-50/80 border border-violet-100/60 rounded-xl px-2.5 py-1">
                            <Layers className="h-3.5 w-3.5 text-violet-500" /> {totalCards} câu hỏi
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>

                      {/* Footer: Author + time */}
                      <div className="flex items-center gap-2 pt-2.5 border-t border-slate-50 shrink-0 mt-auto">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[9px] font-bold text-white overflow-hidden">
                          {author?.avatar ? (
                            <img src={author.avatar} alt="" className="h-full w-full object-cover" />
                          ) : avatarLetter}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium truncate flex-1">
                          {authorName}
                        </p>
                        <span className="text-[10px] text-slate-300 shrink-0">
                          {formatRelativeTime(col.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
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
  )
}

import { cn } from '@/lib/utils'
import { learningHistoryService } from '@/services/learningHistoryService'
import type { CardItem } from '@/types/flashcard'
import type { LearningHistory, LearningHistorySortBy, SortOrder } from '@/types/learningHistory'
import {
  AlertCircle,
  ArrowUpDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  SortAsc,
  SortDesc,
  TrendingUp,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import HistoryDetailModal from './HistoryDetailModal'

interface HistoryTabProps {
  flashcardId: string
  allCards: CardItem[]
  onStudyWeak?: (incorrectCards: CardItem[]) => void
}

const LIMIT = 8

// ── Format helpers ────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDuration(secs: number) {
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : score >= 50
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-rose-50 text-rose-700 border-rose-200'
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums', color)}>
      {score}%
    </span>
  )
}

// ── Skeleton Row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-50 last:border-0 animate-pulse">
      <div className="h-4 w-28 rounded-lg bg-slate-100" />
      <div className="h-6 w-12 rounded-full bg-slate-100 ml-auto" />
      <div className="h-4 w-14 rounded-lg bg-slate-100" />
      <div className="h-4 w-10 rounded-lg bg-slate-100" />
    </div>
  )
}

// ── Sort config ───────────────────────────────────────────────────────────────
const SORT_OPTIONS: { label: string; value: LearningHistorySortBy }[] = [
  { label: 'Ngày thi', value: 'createdAt' },
  { label: 'Điểm số', value: 'score' },
  { label: 'Thời gian', value: 'durationSeconds' },
]

export default function HistoryTab({ flashcardId, allCards, onStudyWeak }: HistoryTabProps) {
  const [histories, setHistories] = useState<LearningHistory[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<LearningHistorySortBy>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)

  const fetchHistories = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await learningHistoryService.getHistoriesByFlashcard(flashcardId, {
        page,
        limit: LIMIT,
        sortBy,
        sortOrder,
      })
      setHistories(res.list)
      setTotalItems(res.totalItems)
      setTotalPages(res.totalPages)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải lịch sử kiểm tra.')
    } finally {
      setIsLoading(false)
    }
  }, [flashcardId, page, sortBy, sortOrder])

  useEffect(() => {
    fetchHistories()
  }, [fetchHistories])

  const handleSortChange = (newSortBy: LearningHistorySortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
    setPage(1)
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
              <History className="h-4.5 w-4.5 text-violet-500" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Lịch sử kiểm tra</h3>
              {!isLoading && (
                <p className="text-xs text-slate-400">
                  {totalItems === 0 ? 'Chưa có lần thi nào' : `${totalItems} lần thi`}
                </p>
              )}
            </div>
          </div>

          {/* Sort controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSortChange(opt.value)}
                className={cn(
                  'h-7 px-3 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1',
                  sortBy === opt.value
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-violet-200 hover:text-violet-600',
                )}
              >
                {opt.label}
                {sortBy === opt.value && (
                  sortOrder === 'desc'
                    ? <SortDesc className="h-3 w-3" />
                    : <SortAsc className="h-3 w-3" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 px-5 py-3 bg-slate-50/70 border-b border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" /> Ngày thi
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" /> Điểm số
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Thời gian
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Tỉ lệ đúng
            </span>
          </div>

          {/* Loading skeleton */}
          {isLoading && (
            <div>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className="flex flex-col items-center py-12 gap-3 text-center px-4">
              <AlertCircle className="h-8 w-8 text-rose-300" />
              <p className="text-sm text-rose-500 font-medium">{error}</p>
              <button
                onClick={fetchHistories}
                className="text-xs text-violet-600 underline underline-offset-2 font-semibold"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !error && histories.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-4 text-center px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50">
                <History className="h-8 w-8 text-violet-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Chưa có lịch sử nào</p>
                <p className="text-xs text-slate-400 mt-1">
                  Hãy hoàn thành một bài Kiểm tra để ghi lại kết quả tại đây.
                </p>
              </div>
            </div>
          )}

          {/* Rows */}
          {!isLoading && !error && histories.length > 0 && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${page}-${sortBy}-${sortOrder}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {histories.map((h, idx) => (
                  <motion.button
                    key={h._id}
                    type="button"
                    onClick={() => setSelectedHistoryId(h._id)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={cn(
                      'w-full text-left group',
                      'grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr] items-center gap-2 sm:gap-4',
                      'px-5 py-4 border-b border-slate-50 last:border-0',
                      'hover:bg-violet-50/40 transition-colors',
                    )}
                  >
                    {/* Date */}
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 group-hover:text-violet-700 transition-colors">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-300 sm:hidden shrink-0" />
                      {formatDate(h.createdAt)}
                    </span>

                    {/* Score */}
                    <span className="flex sm:block items-center gap-2">
                      <span className="text-xs text-slate-400 sm:hidden">Điểm:</span>
                      <ScoreBadge score={h.score} />
                    </span>

                    {/* Duration */}
                    <span className="flex items-center gap-2 text-sm text-slate-500 tabular-nums">
                      <Clock className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                      <span className="text-xs text-slate-400 sm:hidden">Thời gian:</span>
                      {formatDuration(h.durationSeconds)}
                    </span>

                    {/* Accuracy */}
                    <span className="text-sm text-slate-500 tabular-nums">
                      <span className="text-xs text-slate-400 sm:hidden">Tỉ lệ: </span>
                      <span className="font-semibold text-slate-700">{h.correctAnswers}</span>
                      <span className="text-slate-300"> / </span>
                      {h.totalQuestions}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  'h-8 min-w-8 px-2 rounded-lg text-xs font-bold transition-all',
                  p === page
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/20'
                    : 'border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600',
                )}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <HistoryDetailModal
        historyId={selectedHistoryId}
        allCards={allCards}
        onClose={() => setSelectedHistoryId(null)}
        onStudyWeak={onStudyWeak}
      />
    </>
  )
}

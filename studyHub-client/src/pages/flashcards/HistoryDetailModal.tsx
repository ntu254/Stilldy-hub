import { cn } from '@/lib/utils'
import { learningHistoryService } from '@/services/learningHistoryService'
import type { CardItem } from '@/types/flashcard'
import type { LearningHistory } from '@/types/learningHistory'
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  TrendingUp,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

interface HistoryDetailModalProps {
  historyId: string | null
  allCards: CardItem[]
  onClose: () => void
  onStudyWeak?: (incorrectCards: CardItem[]) => void
}

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

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80
      ? { ring: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', shadow: 'shadow-emerald-100' }
      : score >= 50
        ? { ring: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', shadow: 'shadow-amber-100' }
        : { ring: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', shadow: 'shadow-rose-100' }

  return (
    <div
      className={cn(
        'flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-8 text-2xl font-black tabular-nums shadow-inner',
        color.ring, color.bg, color.text, color.shadow,
      )}
    >
      {score}%
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ModalSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-slate-100 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-40 rounded-lg bg-slate-100" />
          <div className="h-4 w-28 rounded-lg bg-slate-100" />
          <div className="h-4 w-32 rounded-lg bg-slate-100" />
        </div>
      </div>
      <div className="h-px bg-slate-100" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 p-4 space-y-2">
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="h-4 w-48 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HistoryDetailModal({
  historyId,
  allCards,
  onClose,
  onStudyWeak,
}: HistoryDetailModalProps) {
  const [history, setHistory] = useState<LearningHistory | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!historyId) {
      setHistory(null)
      setError(null)
      return
    }
    setIsLoading(true)
    setError(null)
    learningHistoryService
      .getHistoryDetail(historyId)
      .then(data => setHistory(data))
      .catch(err => setError(err?.message || 'Không thể tải chi tiết bài làm.'))
      .finally(() => setIsLoading(false))
  }, [historyId])

  // Prevent body scroll when open
  useEffect(() => {
    if (historyId) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [historyId])

  // Cross-reference incorrectTerms (card IDs) with allCards
  const incorrectCards =
    history?.incorrectTerms && history.incorrectTerms.length > 0
      ? allCards.filter(c => history.incorrectTerms.includes(c._id))
      : []

  const handleStudyWeak = () => {
    onClose()
    onStudyWeak?.(incorrectCards)
  }

  return (
    <AnimatePresence>
      {historyId && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
          >
            <div className="relative w-full max-w-xl max-h-[90vh] bg-white rounded-3xl shadow-2xl shadow-slate-900/15 flex flex-col overflow-hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Modal header */}
              <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
                <h2 className="text-base font-extrabold text-slate-900">
                  Xem lại bài làm
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chi tiết kết quả & các thuật ngữ làm sai
                </p>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {isLoading && <ModalSkeleton />}

                {!isLoading && error && (
                  <div className="flex flex-col items-center py-10 gap-3 text-center">
                    <AlertCircle className="h-8 w-8 text-rose-300" />
                    <p className="text-sm text-rose-500 font-medium">{error}</p>
                  </div>
                )}

                {!isLoading && !error && history && (
                  <>
                    {/* Score summary */}
                    <div className="flex items-center gap-5">
                      <ScoreRing score={history.score} />
                      <div className="space-y-2 flex-1">
                        <h3 className="font-extrabold text-slate-800 text-base leading-tight">
                          {history.score >= 80
                            ? 'Xuất sắc! 🎉'
                            : history.score >= 50
                              ? 'Khá tốt! 👍'
                              : 'Cần cố gắng thêm 💪'}
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          <span className="flex items-center gap-1.5 text-xs text-slate-500">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-300" />
                            {formatDate(history.createdAt)}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="h-3.5 w-3.5 text-slate-300" />
                            {formatDuration(history.durationSeconds)}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-slate-500">
                            <TrendingUp className="h-3.5 w-3.5 text-slate-300" />
                            {history.correctAnswers}/{history.totalQuestions} câu đúng
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-slate-100" />

                    {/* All correct */}
                    {incorrectCards.length === 0 && (
                      <div className="flex flex-col items-center py-8 gap-3 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                          <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                          Tuyệt vời! Bạn trả lời đúng tất cả các câu.
                        </p>
                        <p className="text-xs text-slate-400">Không có thuật ngữ nào cần ôn lại.</p>
                      </div>
                    )}

                    {/* Incorrect terms section */}
                    {incorrectCards.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-50">
                              <XCircle className="h-4 w-4 text-rose-500" />
                            </div>
                            <span className="text-sm font-extrabold text-slate-800">
                              Thuật ngữ làm sai
                            </span>
                            <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                              {incorrectCards.length}
                            </span>
                          </div>

                          {onStudyWeak && (
                            <button
                              onClick={handleStudyWeak}
                              className="flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors"
                            >
                              <Zap className="h-3.5 w-3.5" />
                              Học lại các từ này
                            </button>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          {incorrectCards.map((card, idx) => (
                            <motion.div
                              key={card._id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={cn(
                                'rounded-2xl border-l-4 p-4 space-y-2',
                                'bg-gradient-to-r from-rose-50/80 to-orange-50/40',
                                'border-l-rose-400 border border-rose-100',
                              )}
                            >
                              {/* Term */}
                              <div className="flex items-start gap-2.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-100 text-[10px] font-bold text-rose-600 shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div className="space-y-1.5 min-w-0">
                                  <p className="text-sm font-extrabold text-rose-800 leading-snug">
                                    {card.term}
                                  </p>
                                  <div className="flex items-start gap-1.5 pt-0.5">
                                    <BookOpen className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-slate-600 italic leading-relaxed">
                                      {card.definition}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              {!isLoading && !error && (
                <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center justify-between gap-3 bg-slate-50/50">
                  {onStudyWeak && incorrectCards.length > 0 ? (
                    <button
                      onClick={handleStudyWeak}
                      className="flex items-center gap-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-xl transition-all shadow-md shadow-violet-600/20"
                    >
                      <Zap className="h-4 w-4" />
                      Học lại {incorrectCards.length} từ sai
                    </button>
                  ) : (
                    <div />
                  )}
                  <button
                    onClick={onClose}
                    className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors px-3 py-2 rounded-xl hover:bg-slate-100"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

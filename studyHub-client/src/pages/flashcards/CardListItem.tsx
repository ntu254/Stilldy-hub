import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Star, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CardItem } from '@/types/flashcard'
import { toast } from 'sonner'

interface CardListItemProps {
  card: CardItem
  index: number
  isMarked: boolean
  onToggleMark: () => void
  canEdit?: boolean
  onUpdateCard?: (cardId: string, term: string, definition: string) => Promise<void>
  onDeleteCard?: (cardId: string) => Promise<void>
}

export default function CardListItem({
  card,
  index,
  isMarked,
  onToggleMark,
  canEdit = false,
  onUpdateCard,
  onDeleteCard,
}: CardListItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTerm, setEditTerm] = useState(card.term)
  const [editDef, setEditDef] = useState(card.definition)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const termClean = editTerm.trim()
    const defClean = editDef.trim()

    if (!termClean || !defClean) {
      toast.error('Thuật ngữ và định nghĩa không được để trống.')
      return
    }

    try {
      setIsSubmitting(true)
      if (onUpdateCard) {
        await onUpdateCard(card._id, termClean, defClean)
      }
      setIsEditing(false)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật thẻ.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditTerm(card.term)
    setEditDef(card.definition)
    setIsEditing(false)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(`Bạn có chắc chắn muốn xóa thẻ "${card.term}"?`)) {
      try {
        setIsSubmitting(true)
        if (onDeleteCard) {
          await onDeleteCard(card._id)
        }
      } catch (err: any) {
        toast.error(err?.message || 'Không thể xóa thẻ.')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
    >
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
        {isEditing ? (
          /* ── Inline Edit Mode ── */
          <form onSubmit={handleSave} className="p-4 space-y-3 bg-violet-50/30">
            <div className="flex items-center justify-between border-b border-violet-100/60 pb-2">
              <span className="text-xs font-bold text-violet-700 flex items-center gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa thẻ #{index + 1}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-sm transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Thuật ngữ / Khái niệm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editTerm}
                  onChange={(e) => setEditTerm(e.target.value)}
                  placeholder="Nhập thuật ngữ..."
                  required
                  disabled={isSubmitting}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Định nghĩa / Giải thích <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={editDef}
                  onChange={(e) => setEditDef(e.target.value)}
                  placeholder="Nhập định nghĩa chi tiết..."
                  required
                  rows={2}
                  disabled={isSubmitting}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all resize-none"
                />
              </div>
            </div>
          </form>
        ) : (
          /* ── Standard Display Mode ── */
          <>
            <div
              className="flex items-start gap-4 p-4 cursor-pointer select-none"
              onClick={() => setExpanded(e => !e)}
            >
              {/* Index badge */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xs font-bold text-violet-600 mt-0.5">
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm leading-snug">{card.term}</p>
                <AnimatePresence>
                  {expanded && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm text-slate-500 mt-2 leading-relaxed overflow-hidden"
                    >
                      {card.definition}
                    </motion.p>
                  )}
                </AnimatePresence>
                {!expanded && (
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{card.definition}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditTerm(card.term)
                        setEditDef(card.definition)
                        setIsEditing(true)
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 hover:bg-violet-50 hover:text-violet-600 border border-transparent transition-all"
                      title="Chỉnh sửa thẻ con"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 border border-transparent transition-all"
                      title="Xóa thẻ con"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={onToggleMark}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-xl transition-all border',
                    isMarked ? 'bg-amber-50 border-amber-200 text-amber-500' : 'border-transparent text-slate-300 hover:bg-slate-50 hover:text-slate-500'
                  )}
                  id={`mark-card-${card._id}`}
                  title={isMarked ? 'Hủy đánh dấu' : 'Đánh dấu thẻ'}
                >
                  <Star className={cn('h-4 w-4', isMarked && 'fill-amber-400 text-amber-500')} />
                </button>
              </div>
            </div>

            {expanded && (
              <div className="px-4 pb-4 pt-0">
                <div className="rounded-xl bg-violet-50/60 border border-violet-100 p-3">
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide mb-1">Định nghĩa đầy đủ</p>
                  <p className="text-sm text-violet-900 leading-relaxed">{card.definition}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

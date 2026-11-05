import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {  Globe, Loader2, Lock, Plus, X, Trash2, Edit3, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { flashcardService } from '@/services/flashcardService'
import type { UpdateFlashcardPayload } from '@/types/flashcard'
import { toast } from 'sonner'

interface Props {
  collectionId: string | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface CardForm {
  localId: string
  _id?: string
  term: string
  definition: string
  markedBy?: string[]
}

function genId() {
  return Math.random().toString(36).slice(2)
}

export default function EditFlashcardModal({ collectionId, open, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [cards, setCards] = useState<CardForm[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeCard, setActiveCard] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !collectionId) return

    let isSubscribed = true
    const loadData = async () => {
      try {
        setIsLoading(true)
        const col = await flashcardService.getById(collectionId)
        if (!isSubscribed) return

        setTitle(col.title)
        setDescription(col.description ?? '')
        setIsPublic(col.isPublic)
        setCards(
          col.cards.map((c) => ({
            localId: genId(),
            _id: c._id,
            term: c.term,
            definition: c.definition,
            markedBy: c.markedBy,
          }))
        )
      } catch (err: any) {
        if (isSubscribed) {
          toast.error(err?.message || 'Không thể tải bộ thẻ.')
          onClose()
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isSubscribed = false
    }
  }, [open, collectionId])

  const addCard = () => {
    const newCard = { localId: genId(), term: '', definition: '' }
    setCards((prev) => [...prev, newCard])
    setActiveCard(newCard.localId)
  }

  const removeCard = (localId: string) => {
    if (cards.length <= 1) {
      toast.error('Bộ thẻ phải có ít nhất 1 thẻ.')
      return
    }
    setCards((prev) => prev.filter((c) => c.localId !== localId))
  }

  const updateCard = (localId: string, field: 'term' | 'definition', value: string) => {
    setCards((prev) => prev.map((c) => (c.localId === localId ? { ...c, [field]: value } : c)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!collectionId) return

    const cleanTitle = title.trim()
    if (!cleanTitle) {
      toast.error('Tiêu đề không được để trống.')
      return
    }

    const validCards = cards.filter((c) => c.term.trim() && c.definition.trim())
    if (validCards.length === 0) {
      toast.error('Cần ít nhất 1 thẻ có đầy đủ thuật ngữ và định nghĩa.')
      return
    }

    const payload: UpdateFlashcardPayload = {
      title: cleanTitle,
      description: description.trim() || undefined,
      isPublic,
      cards: validCards.map((c) => ({
        ...(c._id ? { _id: c._id } : {}),
        term: c.term.trim(),
        definition: c.definition.trim(),
        markedBy: c.markedBy ?? [],
      })),
    }

    try {
      setIsSubmitting(true)
      await flashcardService.update(collectionId, payload)
      toast.success(`Đã cập nhật bộ thẻ "${cleanTitle}" thành công!`)
      onSuccess()
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật bộ thẻ.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 border border-violet-200">
                  <Edit3 className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Chỉnh sửa bộ thẻ</h2>
                  <p className="text-[11px] text-slate-400">
                    {cards.length} thẻ · {cards.filter((c) => c.term && c.definition).length} hợp lệ
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                <p className="text-sm font-medium text-slate-500">Đang tải dữ liệu bộ thẻ...</p>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Tiêu đề bộ thẻ <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Nhập tiêu đề bộ thẻ..."
                      disabled={isSubmitting}
                      className="rounded-xl border-slate-200 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Mô tả (tuỳ chọn)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Mô tả ngắn về nội dung bộ thẻ này..."
                      disabled={isSubmitting}
                      rows={2}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-800 bg-white outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all resize-none placeholder:text-slate-400"
                    />
                  </div>

                  {/* Visibility */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Quyền truy cập</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: false, icon: Lock, label: 'Riêng tư', desc: 'Chỉ bạn thấy được', color: 'amber' },
                        { value: true, icon: Globe, label: 'Công khai', desc: 'Mọi người có thể học', color: 'emerald' },
                      ].map((opt) => (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => setIsPublic(opt.value)}
                          className={cn(
                            'flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all',
                            isPublic === opt.value
                              ? opt.color === 'amber'
                                ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300'
                                : 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300'
                              : 'border-slate-200 hover:border-slate-300'
                          )}
                        >
                          <opt.icon
                            className={cn(
                              'h-4 w-4 mt-0.5 shrink-0',
                              isPublic === opt.value
                                ? opt.color === 'amber'
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                                : 'text-slate-400'
                            )}
                          />
                          <div>
                            <p
                              className={cn(
                                'text-xs font-bold',
                                isPublic === opt.value
                                  ? opt.color === 'amber'
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                                  : 'text-slate-700'
                              )}
                            >
                              {opt.label}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cards section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Thẻ ghi nhớ ({cards.length})</label>
                      <span className="text-[10px] text-slate-400">Mỗi thẻ gồm thuật ngữ và định nghĩa</span>
                    </div>

                    <div className="space-y-2.5">
                      {cards.map((card, idx) => (
                        <CardEditor
                          key={card.localId}
                          card={card}
                          index={idx}
                          isActive={activeCard === card.localId}
                          onFocus={() => setActiveCard(card.localId)}
                          onUpdate={updateCard}
                          onRemove={() => removeCard(card.localId)}
                          disabled={isSubmitting}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={addCard}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-200 py-3 text-sm font-semibold text-violet-500 hover:border-violet-400 hover:bg-violet-50/50 transition-all"
                    >
                      <Plus className="h-4 w-4" /> Thêm thẻ mới
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50/50">
                  <p className="text-[11px] text-slate-400 font-medium">
                    {cards.filter((c) => c.term.trim() && c.definition.trim()).length}/{cards.length} thẻ hợp lệ
                  </p>
                  <div className="flex gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="rounded-xl border-slate-200 text-slate-700 font-semibold text-sm h-9 px-4"
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm h-9 px-5 shadow-md shadow-violet-600/20 gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" /> Lưu thay đổi
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Card Editor ──────────────────────────────────────────────────────────────
interface CardEditorProps {
  card: CardForm
  index: number
  isActive: boolean
  onFocus: () => void
  onUpdate: (localId: string, field: 'term' | 'definition', value: string) => void
  onRemove: () => void
  disabled: boolean
}

function CardEditor({ card, index, isActive, onFocus, onUpdate, onRemove, disabled }: CardEditorProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={cn(
        'rounded-xl border transition-all overflow-hidden',
        isActive ? 'border-violet-300 shadow-sm shadow-violet-100' : 'border-slate-200'
      )}
      onClick={onFocus}
    >
      {/* Card header */}
      <div
        className={cn(
          'flex items-center justify-between px-3.5 py-2 border-b',
          isActive ? 'bg-violet-50/70 border-violet-200' : 'bg-slate-50/70 border-slate-100'
        )}
      >
        <span className="text-[11px] font-bold text-slate-500">Thẻ {index + 1}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          disabled={disabled}
          className="flex h-5 w-5 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
        </button>
      </div>

      {/* Card fields */}
      <div className="grid grid-cols-2 divide-x divide-slate-100">
        <div className="p-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Thuật ngữ</label>
          <input
            value={card.term}
            onChange={(e) => onUpdate(card.localId, 'term', e.target.value)}
            placeholder="Nhập thuật ngữ..."
            disabled={disabled}
            className="mt-1 w-full text-sm font-semibold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none border-b border-transparent focus:border-violet-400 transition-colors pb-0.5"
          />
        </div>
        <div className="p-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Định nghĩa</label>
          <input
            value={card.definition}
            onChange={(e) => onUpdate(card.localId, 'definition', e.target.value)}
            placeholder="Nhập định nghĩa..."
            disabled={disabled}
            className="mt-1 w-full text-sm text-slate-700 placeholder:text-slate-300 bg-transparent outline-none border-b border-transparent focus:border-violet-400 transition-colors pb-0.5"
          />
        </div>
      </div>
    </motion.div>
  )
}

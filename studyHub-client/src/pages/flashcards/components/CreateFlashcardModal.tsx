import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { flashcardService } from '@/services/flashcardService'
import type { CreateFlashcardPayload } from '@/types/flashcard'
import { BookOpen, Globe, Loader2, Lock, Plus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface CardForm {
  id: string
  term: string
  definition: string
}

function genId() {
  return Math.random().toString(36).slice(2)
}

export default function CreateFlashcardModal({ open, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [cards, setCards] = useState<CardForm[]>([
    { id: genId(), term: '', definition: '' },
    { id: genId(), term: '', definition: '' },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeCard, setActiveCard] = useState<string | null>(null)

  const addCard = () => {
    const newCard = { id: genId(), term: '', definition: '' }
    setCards(prev => [...prev, newCard])
    setActiveCard(newCard.id)
  }

  const removeCard = (id: string) => {
    if (cards.length <= 1) {
      toast.error('Bộ thẻ phải có ít nhất 1 thẻ.')
      return
    }
    setCards(prev => prev.filter(c => c.id !== id))
  }

  const updateCard = (id: string, field: 'term' | 'definition', value: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Tiêu đề không được để trống.'); return }
    const validCards = cards.filter(c => c.term.trim() && c.definition.trim())
    if (validCards.length === 0) { toast.error('Cần ít nhất 1 thẻ có đầy đủ nội dung.'); return }

    const payload: CreateFlashcardPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      isPublic,
      cards: validCards.map(c => ({ term: c.term.trim(), definition: c.definition.trim() })),
    }

    try {
      setIsSubmitting(true)
      await flashcardService.create(payload)
      toast.success(`Đã tạo bộ thẻ "${payload.title}" thành công!`)
      resetForm()
      onSuccess()
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo bộ thẻ.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setIsPublic(false)
    setCards([
      { id: genId(), term: '', definition: '' },
      { id: genId(), term: '', definition: '' },
    ])
    setActiveCard(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
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
            onClick={handleClose}
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
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                  <BookOpen className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Tạo bộ thẻ mới</h2>
                  <p className="text-[11px] text-slate-400">{cards.length} thẻ · {cards.filter(c => c.term && c.definition).length} hợp lệ</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form id="create-flashcard-form" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Tiêu đề bộ thẻ <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="VD: Sinh học tế bào - Chương 3"
                    disabled={isSubmitting}
                    className="rounded-xl border-slate-200 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                    id="fc-title"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Mô tả (tuỳ chọn)</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Mô tả ngắn về nội dung bộ thẻ này..."
                    disabled={isSubmitting}
                    rows={2}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-800 bg-white outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all resize-none placeholder:text-slate-400"
                    id="fc-description"
                  />
                </div>

                {/* Visibility */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Quyền truy cập</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: false, icon: Lock, label: 'Riêng tư', desc: 'Chỉ bạn thấy được', color: 'amber' },
                      { value: true, icon: Globe, label: 'Công khai', desc: 'Mọi người có thể học', color: 'emerald' },
                    ].map(opt => (
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
                        <opt.icon className={cn(
                          'h-4 w-4 mt-0.5 shrink-0',
                          isPublic === opt.value
                            ? opt.color === 'amber' ? 'text-amber-600' : 'text-emerald-600'
                            : 'text-slate-400'
                        )} />
                        <div>
                          <p className={cn(
                            'text-xs font-bold',
                            isPublic === opt.value
                              ? opt.color === 'amber' ? 'text-amber-700' : 'text-emerald-700'
                              : 'text-slate-700'
                          )}>{opt.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cards section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Thẻ ghi nhớ ({cards.length})
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Mỗi thẻ gồm thuật ngữ và định nghĩa
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {cards.map((card, idx) => (
                      <CardEditor
                        key={card.id}
                        card={card}
                        index={idx}
                        isActive={activeCard === card.id}
                        onFocus={() => setActiveCard(card.id)}
                        onUpdate={updateCard}
                        onRemove={() => removeCard(card.id)}
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
                  {cards.filter(c => c.term.trim() && c.definition.trim()).length}/{cards.length} thẻ hợp lệ
                </p>
                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
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
                      <><Loader2 className="h-4 w-4 animate-spin" /> Đang tạo...</>
                    ) : (
                      <><BookOpen className="h-4 w-4" /> Tạo bộ thẻ</>
                    )}
                  </Button>
                </div>
              </div>
            </form>
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
  onUpdate: (id: string, field: 'term' | 'definition', value: string) => void
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
      <div className={cn(
        'flex items-center justify-between px-3.5 py-2 border-b',
        isActive ? 'bg-violet-50/70 border-violet-200' : 'bg-slate-50/70 border-slate-100'
      )}>
        <span className="text-[11px] font-bold text-slate-500">Thẻ {index + 1}</span>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove() }}
          disabled={disabled}
          className="flex h-5 w-5 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Card fields */}
      <div className="grid grid-cols-2 divide-x divide-slate-100">
        <div className="p-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Thuật ngữ</label>
          <input
            value={card.term}
            onChange={e => onUpdate(card.id, 'term', e.target.value)}
            placeholder="Nhập thuật ngữ..."
            disabled={disabled}
            className="mt-1 w-full text-sm font-semibold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none border-b border-transparent focus:border-violet-400 transition-colors pb-0.5"
          />
        </div>
        <div className="p-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Định nghĩa</label>
          <input
            value={card.definition}
            onChange={e => onUpdate(card.id, 'definition', e.target.value)}
            placeholder="Nhập định nghĩa..."
            disabled={disabled}
            className="mt-1 w-full text-sm text-slate-700 placeholder:text-slate-300 bg-transparent outline-none border-b border-transparent focus:border-violet-400 transition-colors pb-0.5"
          />
        </div>
      </div>
    </motion.div>
  )
}

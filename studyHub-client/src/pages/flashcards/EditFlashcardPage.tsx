import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { flashcardService } from '@/services/flashcardService'
import type { FlashcardCollection } from '@/types/flashcard'
import {
  ArrowLeft,
  BookOpen,
  Globe,
  GripVertical,
  Loader2,
  Lock,
  Plus,
  Save,
  Trash2
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

interface CardForm {
  localId: string
  _id?: string
  term: string
  definition: string
  markedBy?: string[]
}

function genId() { return Math.random().toString(36).slice(2) }

export default function EditFlashcardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [collection, setCollection] = useState<FlashcardCollection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [cards, setCards] = useState<CardForm[]>([])
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [showFAB, setShowFAB] = useState(false)
  const initialCardIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 250) {
        setShowFAB(true)
      } else {
        setShowFAB(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const fetchCollection = useCallback(async () => {
    if (!id) return
    try {
      setIsLoading(true)
      const data = await flashcardService.getById(id)
      setCollection(data)
      setTitle(data.title)
      setDescription(data.description ?? '')
      setIsPublic(data.isPublic)
      const loadedCards = data.cards.map(c => ({
        localId: genId(),
        _id: c._id,
        term: c.term,
        definition: c.definition,
        markedBy: c.markedBy,
      }))
      initialCardIdsRef.current.clear()
      loadedCards.forEach(c => initialCardIdsRef.current.add(c.localId))
      setCards(loadedCards)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải bộ thẻ.')
      navigate('/dashboard/flashcards')
    } finally {
      setIsLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { fetchCollection() }, [fetchCollection])

  const markDirty = () => setIsDirty(true)

  const addCard = () => {
    const newCard: CardForm = { localId: genId(), term: '', definition: '' }
    setCards(prev => [...prev, newCard])
    setActiveCardId(newCard.localId)
    markDirty()
  }

  const removeCard = (localId: string) => {
    if (cards.length <= 1) { toast.error('Bộ thẻ phải có ít nhất 1 thẻ.'); return }
    setCards(prev => prev.filter(c => c.localId !== localId))
    markDirty()
  }

  const updateCard = (localId: string, field: 'term' | 'definition', value: string) => {
    setCards(prev => prev.map(c => c.localId === localId ? { ...c, [field]: value } : c))
    markDirty()
  }

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Tiêu đề không được để trống.'); return }
    const validCards = cards.filter(c => c.term.trim() && c.definition.trim())
    if (validCards.length === 0) { toast.error('Cần ít nhất 1 thẻ hợp lệ.'); return }

    try {
      setIsSaving(true)
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        isPublic,
        cards: validCards.map(c => ({
          ...(c._id ? { _id: c._id } : {}),
          term: c.term.trim(),
          definition: c.definition.trim(),
          markedBy: c.markedBy ?? [],
        })),
      }
      await flashcardService.update(id!, payload)
      toast.success('Đã lưu thay đổi thành công!')
      setIsDirty(false)
      navigate(`/flashcards/${id}`)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu thay đổi.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
        <p className="text-sm text-slate-500">Đang tải...</p>
      </div>
    )
  }

  const validCardCount = cards.filter(c => c.term.trim() && c.definition.trim()).length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="min-h-full px-4 py-6 sm:px-6 lg:px-8 space-y-6"
    >

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/flashcards/${id}`)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-violet-600 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-0.5">
              <BookOpen className="h-3 w-3" /> Chỉnh sửa bộ thẻ
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">{collection?.title ?? 'Chỉnh sửa'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isDirty && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1"
            >
              Có thay đổi chưa lưu
            </motion.span>
          )}
          <Button
            variant="outline"
            onClick={() => navigate(`/flashcards/${id}`)}
            disabled={isSaving}
            className="rounded-xl border-slate-200 text-slate-700 font-semibold text-sm h-9 px-4"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            id="save-flashcard-btn"
            className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm h-9 px-5 gap-2 shadow-md shadow-violet-600/20 disabled:opacity-50"
          >
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</>
            ) : (
              <><Save className="h-4 w-4" /> Lưu thay đổi</>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Metadata ──────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Basic info card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-700">Thông tin cơ bản</h2>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">
                Tiêu đề <span className="text-rose-500">*</span>
              </label>
              <Input
                value={title}
                onChange={e => { setTitle(e.target.value); markDirty() }}
                placeholder="Tiêu đề bộ thẻ"
                disabled={isSaving}
                className="rounded-xl border-slate-200 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 text-sm"
                id="edit-fc-title"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Mô tả</label>
              <textarea
                value={description}
                onChange={e => { setDescription(e.target.value); markDirty() }}
                placeholder="Mô tả ngắn về bộ thẻ này..."
                disabled={isSaving}
                rows={3}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-800 bg-white outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all resize-none placeholder:text-slate-400"
                id="edit-fc-description"
              />
            </div>

            {/* Visibility */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Quyền truy cập</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: false, icon: Lock, label: 'Riêng tư', color: 'amber' },
                  { value: true, icon: Globe, label: 'Công khai', color: 'emerald' },
                ].map(opt => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => { setIsPublic(opt.value); markDirty() }}
                    disabled={isSaving}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all text-xs font-semibold',
                      isPublic === opt.value
                        ? opt.color === 'amber'
                          ? 'border-amber-400 bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                          : 'border-emerald-400 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    <opt.icon className="h-3.5 w-3.5" /> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3">Thống kê</h2>
            <div className="space-y-2.5">
              {[
                { label: 'Tổng số thẻ', value: `${cards.length}` },
                { label: 'Thẻ hợp lệ', value: `${validCardCount}`, color: 'text-emerald-600' },
                { label: 'Thẻ chưa điền', value: `${cards.length - validCardCount}`, color: cards.length - validCardCount > 0 ? 'text-amber-600' : 'text-slate-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                  <span className={cn('text-sm font-bold', color ?? 'text-slate-900')}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Cards Editor ──────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
         

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {cards.map((card, idx) => {
                const isNew = !initialCardIdsRef.current.has(card.localId)
                return (
                  <motion.div
                    key={card.localId}
                    layout
                    initial={isNew ? { opacity: 0, y: 16 } : false}
                    animate={isNew ? { opacity: 1, y: 0 } : false}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  >
                    <div
                      className={cn(
                        'bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300',
                        activeCardId === card.localId ? 'border-violet-300 shadow-violet-100' : 'border-slate-100 hover:border-slate-200'
                      )}
                      onClick={() => setActiveCardId(card.localId)}
                    >
                    {/* Card toolbar */}
                    <div className={cn(
                      'flex items-center justify-between px-4 py-2 border-b',
                      activeCardId === card.localId ? 'bg-violet-50/70 border-violet-100' : 'bg-slate-50/70 border-slate-100'
                    )}>
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-[11px] font-bold text-slate-500">Thẻ {idx + 1}</span>
                        {card.term && card.definition && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold">✓ Hợp lệ</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removeCard(card.localId) }}
                        disabled={isSaving}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Card content */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                      <div className="p-4">
                        <label className="text-[10px] font-bold text-violet-500 uppercase tracking-wide block mb-1.5">Thuật ngữ *</label>
                        <textarea
                          value={card.term}
                          onChange={e => updateCard(card.localId, 'term', e.target.value)}
                          placeholder="Nhập thuật ngữ..."
                          disabled={isSaving}
                          rows={2}
                          className="w-full text-sm font-semibold text-slate-900 placeholder:text-slate-300 bg-transparent outline-none resize-none border-b border-transparent focus:border-violet-300 transition-colors pb-0.5 leading-relaxed"
                        />
                      </div>
                      <div className="p-4">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Định nghĩa *</label>
                        <textarea
                          value={card.definition}
                          onChange={e => updateCard(card.localId, 'definition', e.target.value)}
                          placeholder="Nhập định nghĩa..."
                          disabled={isSaving}
                          rows={2}
                          className="w-full text-sm text-slate-700 placeholder:text-slate-300 bg-transparent outline-none resize-none border-b border-transparent focus:border-violet-300 transition-colors pb-0.5 leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
            </AnimatePresence>
          </div>

          {/* Add card button */}
          <button
            type="button"
            onClick={addCard}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-500 py-4 text-sm font-semibold text-violet-500 hover:border-violet-400 hover:bg-violet-50/50 transition-all"
          >
            <Plus className="h-4 w-4" /> Thêm thẻ mới
          </button>

          {/* Save button (bottom) */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm h-10 px-6 gap-2 shadow-md shadow-violet-600/20 disabled:opacity-50"
            >
              {isSaving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</>
              ) : (
                <><Save className="h-4 w-4" /> Lưu tất cả thay đổi</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) */}
      <AnimatePresence>
        {showFAB && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addCard}
            disabled={isSaving}
            className="fixed bottom-6 left-6 md:left-72 z-40 flex h-12 w-12 md:w-auto md:px-5 items-center justify-center gap-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-xl shadow-violet-600/30 transition-colors border border-violet-500 font-bold text-sm"
          >
            <Plus className="h-5 w-5 shrink-0" />
            <span className="hidden md:inline">Thêm thẻ mới</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/redux/store'
import { flashcardService } from '@/services/flashcardService'
import type { CardItem, FlashcardCollection } from '@/types/flashcard'
import {
  ArrowLeft,
  Award,
  BookOpen,
  Brain,
  Edit3,
  Eye,
  Filter,
  Globe,
  History,
  Layers,
  List,
  Loader2,
  Lock,
  Play,
  Share2,
  Star
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import CardListItem from './CardListItem'
import HistoryTab from './HistoryTab'
import ModeSetupCard from './ModeSetupCard'
import QuizMode from './QuizMode'
import StudyMode from './StudyMode'
import TestMode from './TestMode'


type ViewMode = 'list' | 'study' | 'quiz' | 'test' | 'history'
type CardFilter = 'all' | 'starred' | 'unstarred'

export default function FlashcardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUserId = useAppSelector(s => s.auth.user?.id ?? (s.auth.user as any)?._id ?? '')

  const [collection, setCollection] = useState<FlashcardCollection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [cardFilter, setCardFilter] = useState<CardFilter>('all')

  // Lifted study mode states to keep progress across tabs
  const [studyCards, setStudyCards] = useState<CardItem[]>([])
  const [studyOriginalCards, setStudyOriginalCards] = useState<CardItem[]>([])
  const [studyCurrentIndex, setStudyCurrentIndex] = useState(0)
  const [studyFlippedCardIds, setStudyFlippedCardIds] = useState<Record<string, boolean>>({})
  const [studyIsShuffled, setStudyIsShuffled] = useState(false)
  const [studyIsTracking, setStudyIsTracking] = useState(false)
  const [studyIsEndScreen, setStudyIsEndScreen] = useState(false)
  const [studyHasInitialized, setStudyHasInitialized] = useState(false)

  // Reset study progress states when changing flashcard collections
  useEffect(() => {
    setStudyCards([])
    setStudyOriginalCards([])
    setStudyCurrentIndex(0)
    setStudyFlippedCardIds({})
    setStudyIsShuffled(false)
    setStudyIsTracking(false)
    setStudyIsEndScreen(false)
    setStudyHasInitialized(false)
  }, [id])

  const filteredCards = useMemo(
    () => {
      if (!collection) return []
      return collection.cards.filter(card => {
        if (cardFilter === 'starred') return card.markedBy?.includes(currentUserId)
        if (cardFilter === 'unstarred') return !card.markedBy?.includes(currentUserId)
        return true
      })
    },
    [collection, cardFilter, currentUserId]
  )

  // Setup configuration for Quiz & Test Modes
  const [selectedLimit, setSelectedLimit] = useState<number>(0)
  const [mcCount, setMcCount] = useState<number>(0)
  const [tfCount, setTfCount] = useState<number>(0)
  const [isModeStarted, setIsModeStarted] = useState(false)
  const [modeCards, setModeCards] = useState<CardItem[]>([])
  // IDs được tick sẵn khi user nhấn “Học lại từ sai” từ modal lịch sử
  const [preselectedCardIds, setPreselectedCardIds] = useState<Set<string> | undefined>(undefined)

  useEffect(() => {
    setIsModeStarted(false)
    // Xóa preselect khi user tự chuyển tab (chỉ giữ khi từ modal History)
    if (viewMode !== 'quiz') setPreselectedCardIds(undefined)
    const total = collection?.cards?.length ?? 0
    if (total > 0) {
      setSelectedLimit(Math.min(10, total))
      const mc = total === 1 ? 1 : Math.ceil(total / 2)
      setMcCount(mc)
      setTfCount(total - mc)
    } else {
      setSelectedLimit(0)
      setMcCount(0)
      setTfCount(0)
    }
  }, [viewMode, collection?.cards?.length])

  const handleStartMode = (selectedCards: CardItem[]) => {
    setModeCards(selectedCards)
    setIsModeStarted(true)
  }

  const fetchCollection = useCallback(async () => {
    if (!id) return
    try {
      setIsLoading(true)
      const data = await flashcardService.getById(id)
      setCollection(data)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải bộ thẻ.')
      navigate('/dashboard/flashcards')
    } finally {
      setIsLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { fetchCollection() }, [fetchCollection])

  const handleToggleMark = async (cardId: string) => {
    if (!collection || !id) return
    const card = collection.cards.find(c => c._id === cardId)
    if (!card) return

    const isMarked = card.markedBy?.includes(currentUserId) ?? false
    // Optimistic update
    setCollection(prev => {
      if (!prev) return prev
      return {
        ...prev,
        cards: prev.cards.map(c => {
          if (c._id !== cardId) return c
          const newMarkedBy = isMarked
            ? (c.markedBy ?? []).filter(uid => uid !== currentUserId)
            : [...(c.markedBy ?? []), currentUserId]
          return { ...c, markedBy: newMarkedBy }
        }),
      }
    })

    try {
      const res = await flashcardService.toggleMarkCard(id, cardId)
      toast.success(res.message)
    } catch (err: any) {
      // Revert optimistic update on error
      fetchCollection()
      toast.error(err?.message || 'Không thể cập nhật đánh dấu.')
    }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/flashcards/${id}`
    navigator.clipboard.writeText(url)
    toast.success('Đã sao chép link bộ thẻ!')
  }

  const handleUpdateCard = async (cardId: string, term: string, definition: string) => {
    if (!collection || !id) return
    try {
      await flashcardService.updateCard(id, cardId, { term, definition })
      toast.success('Cập nhật thẻ thành công!')
      setCollection(prev => {
        if (!prev) return prev
        return {
          ...prev,
          cards: prev.cards.map(c => (c._id === cardId ? { ...c, term, definition } : c)),
        }
      })
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật thẻ.')
      throw err
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!collection || !id) return
    try {
      await flashcardService.removeCard(id, cardId)
      toast.success('Đã xóa thẻ thành công!')
      setCollection(prev => {
        if (!prev) return prev
        return {
          ...prev,
          cards: prev.cards.filter(c => c._id !== cardId),
        }
      })
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa thẻ.')
      throw err
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
        <p className="text-sm text-slate-500">Đang tải bộ thẻ...</p>
      </div>
    )
  }

  if (!collection) return null

  const author = typeof collection.createdBy === 'object' ? collection.createdBy : null
  const avatarLetter = author?.displayName?.charAt(0).toUpperCase() ?? 'U'
  const createdById = typeof collection.createdBy === 'object'
    ? (collection.createdBy as any)?._id ?? (collection.createdBy as any)?.id
    : collection.createdBy
  const isOwner = !!(currentUserId && createdById && currentUserId === createdById.toString())

  const starredCount = collection.cards.filter(c => c.markedBy?.includes(currentUserId)).length

  return (
    <div className="min-h-full max-w-7xl mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">

      {/* ── Back + Header ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        className="space-y-4"
      >
        <button
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1)
            } else {
              navigate('/public-flashcards')
            }
          }}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
        </button>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Collection icon */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200">
              <BookOpen className="h-7 w-7 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {collection.isPublic ? (
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
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">{collection.title}</h1>
              {collection.description && (
                <p className="text-sm text-slate-400 mt-1">{collection.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                  <Layers className="h-4 w-4 text-violet-400" />
                  {collection.cards.length} thẻ
                </span>
                {starredCount > 0 && (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-yellow-500">
                    <Star className="h-4 w-4 fill-yellow-400" />
                    {starredCount} đã đánh dấu
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-sm text-slate-400 font-medium">
                  <Eye className="h-4 w-4" />
                  {collection.viewCount} lượt xem
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-[9px] font-bold text-white overflow-hidden">
                    {author?.avatar ? <img src={author.avatar} alt="" className="h-full w-full object-cover" /> : avatarLetter}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{author?.displayName ?? 'Bạn'}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleShare}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-violet-600 transition-all"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {isOwner && (
                <button
                  onClick={() => navigate(`/dashboard/flashcards/${id}/edit`)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-all"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              )}
              <Button
                onClick={() => setViewMode('study')}
                className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm h-9 px-4 gap-2 shadow-md shadow-violet-600/20"
                id="start-study-btn"
              >
                <Play className="h-4 w-4" /> Học ngay
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── View Mode Toggle ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-0.5 shadow-sm w-full sm:w-auto overflow-x-auto scrollbar-none">
          {[
            { mode: 'list' as ViewMode, icon: List, label: 'Danh sách' },
            { mode: 'study' as ViewMode, icon: Layers, label: 'Thẻ ghi nhớ' },
            { mode: 'quiz' as ViewMode, icon: Brain, label: 'Học' },
            { mode: 'test' as ViewMode, icon: Award, label: 'Kiểm tra' },
            { mode: 'history' as ViewMode, icon: History, label: 'Lịch sử' },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'flex items-center justify-center gap-2 h-8 px-3 rounded-lg text-xs font-semibold transition-all flex-1 sm:flex-none whitespace-nowrap shrink-0',
                viewMode === mode ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {viewMode === 'list' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-max">
              {(['all', 'starred', 'unstarred'] as CardFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setCardFilter(f)}
                  className={cn(
                    'h-7 px-3 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap',
                    cardFilter === f
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-500 hover:border-violet-200 hover:text-violet-600'
                  )}
                >
                  {f === 'all' ? 'Tất cả' : f === 'starred' ? '⭐ Đã đánh dấu' : 'Chưa đánh dấu'}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ── List View ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {filteredCards.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3 text-center">
                <Star className="h-8 w-8 text-slate-200" />
                <p className="text-sm text-slate-400 font-medium">Không có thẻ nào phù hợp</p>
              </div>
            ) : (
              filteredCards.map((card, idx) => (
                <CardListItem
                  key={card._id}
                  card={card}
                  index={idx}
                  isMarked={card.markedBy?.includes(currentUserId) ?? false}
                  onToggleMark={() => handleToggleMark(card._id)}
                  canEdit={isOwner}
                  onUpdateCard={handleUpdateCard}
                  onDeleteCard={handleDeleteCard}
                />
              ))
            )}
          </motion.div>
        )}

        {/* ── Study Mode ───────────────────────────────────────────────── */}
        {viewMode === 'study' && (
          <motion.div
            key="study"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <StudyMode
              cards={filteredCards}
              currentUserId={currentUserId}
              onToggleMark={handleToggleMark}
              onExit={() => setViewMode('list')}
              onChangeViewMode={setViewMode}
              setCollection={setCollection}
              studyCards={studyCards}
              setStudyCards={setStudyCards}
              studyOriginalCards={studyOriginalCards}
              setStudyOriginalCards={setStudyOriginalCards}
              studyCurrentIndex={studyCurrentIndex}
              setStudyCurrentIndex={setStudyCurrentIndex}
              studyFlippedCardIds={studyFlippedCardIds}
              setStudyFlippedCardIds={setStudyFlippedCardIds}
              studyIsShuffled={studyIsShuffled}
              setStudyIsShuffled={setStudyIsShuffled}
              studyIsTracking={studyIsTracking}
              setStudyIsTracking={setStudyIsTracking}
              studyIsEndScreen={studyIsEndScreen}
              setStudyIsEndScreen={setStudyIsEndScreen}
              studyHasInitialized={studyHasInitialized}
              setStudyHasInitialized={setStudyHasInitialized}
            />
          </motion.div>
        )}

        {/* ── Quiz Mode ────────────────────────────────────────────────── */}
        {viewMode === 'quiz' && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {!isModeStarted ? (
              <ModeSetupCard
                mode="quiz"
                cards={collection.cards}
                totalCards={collection.cards.length}
                selectedLimit={selectedLimit}
                setSelectedLimit={setSelectedLimit}
                mcCount={mcCount}
                setMcCount={setMcCount}
                tfCount={tfCount}
                setTfCount={setTfCount}
                onStart={handleStartMode}
                preselectedCardIds={preselectedCardIds}
              />
            ) : (
              <QuizMode
                cards={modeCards}
                allCards={collection.cards}
                onExit={() => setViewMode('list')}
              />
            )}
          </motion.div>
        )}

        {/* ── Test Mode ────────────────────────────────────────────────── */}
        {viewMode === 'test' && (
          <motion.div
            key="test"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {!isModeStarted ? (
              <ModeSetupCard
                mode="test"
                cards={collection.cards}
                totalCards={collection.cards.length}
                selectedLimit={selectedLimit}
                setSelectedLimit={setSelectedLimit}
                mcCount={mcCount}
                setMcCount={setMcCount}
                tfCount={tfCount}
                setTfCount={setTfCount}
                onStart={handleStartMode}
              />
            ) : (
              <TestMode
                cards={modeCards}
                allCards={collection.cards}
                flashcardId={id}
                mcCount={mcCount}
                tfCount={tfCount}
                onExit={() => setViewMode('list')}
              />
            )}
          </motion.div>
        )}

        {/* ── History Tab ─────────────────────────────────────────────────── */}
        {viewMode === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <HistoryTab
              flashcardId={id!}
              allCards={collection.cards}
              onStudyWeak={(incorrectCards) => {
                setPreselectedCardIds(new Set(incorrectCards.map(c => c._id)))
                setIsModeStarted(false)
                setViewMode('quiz')
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}



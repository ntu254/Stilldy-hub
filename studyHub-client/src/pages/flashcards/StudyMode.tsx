import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/animate-ui/components/animate/tooltip'
import { FlipCard } from '@/components/animate-ui/components/community/flip-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { flashcardService } from '@/services/flashcardService'
import type { CardItem, FlashcardCollection } from '@/types/flashcard'
import {
  Award,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Shuffle,
  Star,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

type ViewMode = 'list' | 'study' | 'quiz' | 'test'

interface StudyModeProps {
  cards: CardItem[]
  currentUserId: string
  onToggleMark: (id: string) => void
  onExit: () => void
  onChangeViewMode?: (mode: ViewMode) => void
  setCollection?: React.Dispatch<React.SetStateAction<FlashcardCollection | null>>
  
  studyCards: CardItem[]
  setStudyCards: React.Dispatch<React.SetStateAction<CardItem[]>>
  studyOriginalCards: CardItem[]
  setStudyOriginalCards: React.Dispatch<React.SetStateAction<CardItem[]>>
  studyCurrentIndex: number
  setStudyCurrentIndex: React.Dispatch<React.SetStateAction<number>>
  studyFlippedCardIds: Record<string, boolean>
  setStudyFlippedCardIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  studyIsShuffled: boolean
  setStudyIsShuffled: React.Dispatch<React.SetStateAction<boolean>>
  studyIsTracking: boolean
  setStudyIsTracking: React.Dispatch<React.SetStateAction<boolean>>
  studyIsEndScreen: boolean
  setStudyIsEndScreen: React.Dispatch<React.SetStateAction<boolean>>
  studyHasInitialized: boolean
  setStudyHasInitialized: React.Dispatch<React.SetStateAction<boolean>>
}

export default function StudyMode({
  cards: initialCards,
  currentUserId,
  onToggleMark,
  onExit,
  onChangeViewMode,
  studyCards: cards,
  setStudyCards: setCards,
  studyOriginalCards: originalCards,
  setStudyOriginalCards: setOriginalCards,
  studyCurrentIndex: currentIndex,
  setStudyCurrentIndex: setCurrentIndex,
  studyFlippedCardIds: flippedCardIds,
  setStudyFlippedCardIds: setFlippedCardIds,
  studyIsShuffled: isShuffled,
  setStudyIsShuffled: setIsShuffled,
  studyIsTracking: isTracking,
  setStudyIsTracking: setIsTracking,
  studyIsEndScreen: isEndScreen,
  setStudyIsEndScreen: setIsEndScreen,
  studyHasInitialized: hasInitialized,
  setStudyHasInitialized: setHasInitialized,
  setCollection,
}: StudyModeProps) {
  const { id: collectionId } = useParams<{ id: string }>()
  const [direction, setDirection] = useState<1 | -1>(1)

  // Task 3: progressive tracking states
  const [masteredCount, setMasteredCount] = useState(0)
  const [studyingCount, setStudyingCount] = useState(0)

  // Sync cards state with initialCards when parent updates it, preserving filtered subsets
  useEffect(() => {
    if (!hasInitialized) {
      setOriginalCards(initialCards)
      if (initialCards.length > 0) {
        // Find unmastered cards
        const unmastered = initialCards.filter(c => !c.masteredBy?.includes(currentUserId))
        
        if (unmastered.length > 0) {
          // If there are unmastered cards, continue studying only unmastered cards!
          setCards(unmastered)
          setIsTracking(true)
          setHasInitialized(true)
        } else {
          // If all cards are already mastered, automatically reset progress on backend & local
          setHasInitialized(true)
          const autoReset = async () => {
            if (collectionId) {
              try {
                await flashcardService.resetProgress(collectionId)
              } catch (err) {
                console.error('Tự động đặt lại tiến độ thất bại:', err)
              }
            }
            // Clear local masteredBy
            const clearedCards = initialCards.map(c => ({
              ...c,
              masteredBy: (c.masteredBy || []).filter(uid => uid !== currentUserId)
            }))
            setCards(clearedCards)
            setOriginalCards(clearedCards)
            setCollection?.(prev => {
              if (!prev) return prev
              return {
                ...prev,
                cards: prev.cards.map(c => ({
                  ...c,
                  masteredBy: (c.masteredBy || []).filter(uid => uid !== currentUserId)
                }))
              }
            })
          }
          autoReset()
        }
      }
    } else {
      setOriginalCards(initialCards)
      setCards(prev => prev.map(c => {
        const parentCard = initialCards.find(pc => pc._id === c._id)
        if (parentCard) {
          return {
            ...c,
            markedBy: parentCard.markedBy,
            masteredBy: parentCard.masteredBy,
          }
        }
        return c
      }))
    }
  }, [initialCards, hasInitialized, currentUserId, collectionId, setCards, setOriginalCards, setHasInitialized, setIsTracking, setCollection])

  // Recalculate studying and mastered cards based on originalCards (overall progress of the deck)
  useEffect(() => {
    const mastered = originalCards.filter(c => c.masteredBy?.includes(currentUserId)).length
    setMasteredCount(mastered)
    setStudyingCount(originalCards.length - mastered)
  }, [originalCards, currentUserId])

  const currentCard = cards[currentIndex]
  const isMarked = currentCard?.markedBy?.includes(currentUserId) ?? false

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 150 : -150,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 150 : -150,
      opacity: 0,
    }),
  }

  const isCurrentCardFlipped = !!currentCard && !!flippedCardIds[currentCard._id]

  const toggleCurrentCardFlip = useCallback(() => {
    if (!currentCard) return
    setFlippedCardIds(prev => ({
      ...prev,
      [currentCard._id]: !prev[currentCard._id]
    }))
  }, [currentCard])

  const goNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setDirection(1)
      setTimeout(() => setCurrentIndex(i => i + 1), 0)
    }
  }, [currentIndex, cards.length])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1)
      setTimeout(() => setCurrentIndex(i => i - 1), 0)
    }
  }, [currentIndex])

  // Task 3 & 4 helper: auto mark viewed cards as mastered when toggling tracking ON
  const handleToggleTracking = (newTracking: boolean) => {
    setIsTracking(newTracking)
    
    if (newTracking && collectionId) {
      // viewed cards are cards in the active cards array from index 0 to currentIndex - 1
      const viewedCards = cards.slice(0, currentIndex)
      
      let updatedCardsState = [...cards]
      let updatedOriginalState = [...originalCards]
      let hasUpdates = false

      viewedCards.forEach(card => {
        const masteredBy = card.masteredBy || []
        if (!masteredBy.includes(currentUserId)) {
          hasUpdates = true
          // Update in play cards list
          updatedCardsState = updatedCardsState.map(c => {
            if (c._id === card._id) {
              return { ...c, masteredBy: [...masteredBy, currentUserId] }
            }
            return c
          })
          // Update in originalCards list
          updatedOriginalState = updatedOriginalState.map(c => {
            if (c._id === card._id) {
              return { ...c, masteredBy: [...masteredBy, currentUserId] }
            }
            return c
          })
          
          // Trigger background API PATCH
          flashcardService.updateCardStatus(collectionId, card._id, true)
            .catch(err => console.error("Lỗi cập nhật tiến độ tự động:", err))
        }
      })

      if (hasUpdates) {
        setCards(updatedCardsState)
        setOriginalCards(updatedOriginalState)
        setCollection?.(prev => {
          if (!prev) return prev
          const viewedIds = new Set(viewedCards.map(c => c._id))
          return {
            ...prev,
            cards: prev.cards.map(c => {
              if (viewedIds.has(c._id)) {
                const masteredBy = c.masteredBy || []
                if (!masteredBy.includes(currentUserId)) {
                  return { ...c, masteredBy: [...masteredBy, currentUserId] }
                }
              }
              return c
            })
          }
        })
        toast.success(`Đã tự động ghi nhận ${viewedCards.length} thẻ đã xem là "Đã biết"!`)
      }
    }
  }

  const shuffleRemaining = () => {
    const viewed = cards.slice(0, currentIndex)
    const remaining = [...cards.slice(currentIndex)]
    
    // Fisher-Yates shuffle for remaining cards
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]]
    }
    
    const newCards = [...viewed, ...remaining]
    
    setCards(newCards)
    setIsShuffled(true)
    // currentIndex stays the same — same number of viewed cards, same position
    toast.success('Đã xáo trộn các thẻ chưa xem!')
  }

  const unshuffleRemaining = () => {
    const viewed = cards.slice(0, currentIndex)
    // Restore only the remaining (from currentIndex onward) to original order
    const remainingIds = new Set(cards.slice(currentIndex).map(c => c._id))
    const restoredRemaining = originalCards.filter(oc => remainingIds.has(oc._id))

    // Keep the viewed slice exactly as-is (already in the correct order)
    const newCards = [...viewed, ...restoredRemaining]

    setCards(newCards)
    setIsShuffled(false)
    // currentIndex stays the same — viewed count hasn't changed
    toast.success('Đã khôi phục thứ tự thẻ ban đầu!')
  }

  // Task 4: update card mastered status
  const handleMarkProgress = (isMastered: boolean) => {
    if (!currentCard) return

    // 1. Optimistic state update for active play cards
    setCards(prev => prev.map((c, i) => {
      if (i === currentIndex) {
        const masteredBy = c.masteredBy || []
        if (isMastered) {
          if (!masteredBy.includes(currentUserId)) {
            return { ...c, masteredBy: [...masteredBy, currentUserId] }
          }
        } else {
          return { ...c, masteredBy: masteredBy.filter(uid => uid !== currentUserId) }
        }
      }
      return c
    }))

    // Also update originalCards so that if they transition to End Screen, the counts/states are in sync
    setOriginalCards(prev => prev.map(c => {
      if (c._id === currentCard._id) {
        const masteredBy = c.masteredBy || []
        if (isMastered) {
          if (!masteredBy.includes(currentUserId)) {
            return { ...c, masteredBy: [...masteredBy, currentUserId] }
          }
        } else {
          return { ...c, masteredBy: masteredBy.filter(uid => uid !== currentUserId) }
        }
      }
      return c
    }))

    // Update parent collection state so progress persists across view mode tab changes
    setCollection?.(prev => {
      if (!prev) return prev
      return {
        ...prev,
        cards: prev.cards.map(c => {
          if (c._id === currentCard._id) {
            const masteredBy = c.masteredBy || []
            const newMasteredBy = isMastered
              ? (masteredBy.includes(currentUserId) ? masteredBy : [...masteredBy, currentUserId])
              : masteredBy.filter(uid => uid !== currentUserId)
            return { ...c, masteredBy: newMasteredBy }
          }
          return c
        })
      }
    })

    // 2. Call background API
    if (collectionId) {
      flashcardService.updateCardStatus(collectionId, currentCard._id, isMastered)
        .catch(err => {
          console.error("Lỗi khi cập nhật tiến độ thẻ:", err)
        })
    }

    // 3. Move to next card or trigger end screen
    if (currentIndex < cards.length - 1) {
      setDirection(1)
      setTimeout(() => setCurrentIndex(i => i + 1), 0)
    } else {
      setIsEndScreen(true)
    }
  }

  // Task 5: End Screen actions
  const handleFocusUnmasteredCards = () => {
    // Use local originalCards state — do NOT fetch from API since backend was already auto-reset
    const unmastered = originalCards.filter(c => !c.masteredBy?.includes(currentUserId))
    setCards(unmastered.length > 0 ? unmastered : originalCards)
    setCurrentIndex(0)
    setFlippedCardIds({})
    setIsEndScreen(false)
    if (unmastered.length > 0) {
      toast.success(`Đã lọc ra ${unmastered.length} thẻ chưa biết để học tiếp!`)
    } else {
      toast.success('Học lại toàn bộ từ đầu!')
    }
  }

  const handleRestartSession = async () => {
    // Call API to remove user's ID from masteredBy on all cards in the collection
    if (collectionId) {
      try {
        await flashcardService.resetProgress(collectionId)
      } catch (err) {
        console.error('Reset progress failed:', err)
        toast.error('Không thể đặt lại tiến độ. Vui lòng thử lại.')
        return
      }
    }

    // Clear local mastered state
    const clearedCards = originalCards.map(c => ({
      ...c,
      masteredBy: (c.masteredBy || []).filter(uid => uid !== currentUserId)
    }))
    setOriginalCards(clearedCards)
    setCards(clearedCards)
    setCollection?.(prev => {
      if (!prev) return prev
      return {
        ...prev,
        cards: prev.cards.map(c => ({
          ...c,
          masteredBy: (c.masteredBy || []).filter(uid => uid !== currentUserId)
        }))
      }
    })
    setCurrentIndex(0)
    setFlippedCardIds({})
    setIsShuffled(false)
    setIsEndScreen(false)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isEndScreen) return

      if (isTracking) {
        if (e.key === '1' || e.key === 'n' || e.key === 'x') {
          handleMarkProgress(false)
        }
        if (e.key === '2' || e.key === 'y' || e.key === 'v') {
          handleMarkProgress(true)
        }
      } else {
        if (e.key === 'ArrowRight' || e.key === 'd') {
          if (currentIndex === cards.length - 1) {
            setIsEndScreen(true)
          } else {
            goNext()
          }
        }
        if (e.key === 'ArrowLeft' || e.key === 'a') goPrev()
      }
      if (e.key === ' ' || e.key === 'f') { e.preventDefault(); toggleCurrentCardFlip() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev, toggleCurrentCardFlip, isTracking, currentIndex, cards, isEndScreen])

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50">
          <Brain className="h-8 w-8 text-violet-400" />
        </div>
        <p className="text-sm text-slate-500">Không có thẻ nào để học.</p>
        <Button variant="outline" onClick={onExit} className="rounded-xl">Quay lại</Button>
      </div>
    )
  }

  // Progress calculations
  const totalTracking = studyingCount + masteredCount
  const studyingPercent = totalTracking > 0 ? (studyingCount / totalTracking) * 100 : 100
  const masteredPercent = totalTracking > 0 ? (masteredCount / totalTracking) * 100 : 0

  if (isEndScreen) {
    return (
      <div className="max-w-xl mx-auto space-y-6 text-center py-10 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 mx-auto">
          <Award className="h-8 w-8" />
        </div>
        
        {studyingCount === 0 ? (
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">Nắm bài rất chắc</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Tuyệt vời! Bạn đã thuộc và làm chủ toàn bộ {originalCards.length} thẻ trong bộ thẻ này.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {onChangeViewMode && (
                <Button
                  onClick={() => onChangeViewMode('quiz')}
                  className="w-full sm:w-auto rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                >
                  Ôn luyện (Chuyển mode)
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleRestartSession}
                className="w-full sm:w-auto rounded-xl border-slate-200 text-slate-700 font-semibold"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" /> Học lại từ đầu
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">Gần tới đích</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Bạn vẫn còn <span className="font-bold text-orange-600">{studyingCount}</span> thẻ chưa biết. Tiếp tục tập trung luyện tập nhé!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={handleFocusUnmasteredCards}
                className="w-full sm:w-auto rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold"
              >
                Tập trung vào học {studyingCount} thẻ
              </Button>
              <Button
                variant="outline"
                onClick={handleRestartSession}
                className="w-full sm:w-auto rounded-xl border-slate-200 text-slate-700 font-semibold"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" /> Học lại từ đầu
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-5">

        {isTracking && (
          <div className="flex items-center justify-between gap-4 w-full max-w-3xl mx-auto select-none px-1 animate-in fade-in duration-200">
            {/* Left: Đang học */}
            <span className="text-xs font-bold text-orange-600 whitespace-nowrap">
              Đang học: {studyingCount}
            </span>

            {/* Center: Progress Bar */}
            <div className="flex-grow h-2 rounded-full overflow-hidden flex bg-slate-100">
              <div
                className="bg-orange-500 h-full transition-all duration-300"
                style={{ width: `${studyingPercent}%` }}
              />
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${masteredPercent}%` }}
              />
            </div>

            {/* Right: Đã biết */}
            <span className="text-xs font-bold text-emerald-600 whitespace-nowrap">
              Đã biết: {masteredCount}
            </span>
          </div>
        )}



        {/* ── Flashcard ─────────────────────────────────────────────────── */}
        {currentCard && (
          <div className="flex flex-col items-center gap-6 w-full overflow-hidden">
            {/* Card flip container with horizontal slide animation wrapper */}
            <div className="relative w-full max-w-3xl overflow-hidden">
              <AnimatePresence initial={false} mode="wait" custom={direction}>
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 1000, damping: 58 }}
                  className="w-full animate-ui-card-wrapper"
                >
                  <FlipCard
                    id={`study-card-${currentCard._id}`}
                    isFlipped={isCurrentCardFlipped}
                    onClick={toggleCurrentCardFlip}
                    className="w-full"
                    style={{ height: '360px' }}
                    front={
                      <div className=" absolute inset-0 rounded-3xl border-2 border-slate-100 shadow-2xl flex flex-col items-center justify-between p-8 text-center select-none w-full h-full"
                          style={{
                            background: "radial-gradient(125% 125% at 50% 10%, #fff 40%, #7c3aed 100%)",
                          }}>
                        <div className="h-4" /> {/* Spacer */}
                        <div className="overflow-y-auto w-full max-w-2xl max-h-[220px] my-auto px-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                          <h2 className="text-slate-800 text-2xl sm:text-3xl font-extrabold  text-center leading-tight">
                            {currentCard.term}
                          </h2>
                        </div>
                        <p className="text-slate-600 text-xs font-medium shrink-0">Nhấn để xem định nghĩa</p>

                        <div className="absolute top-4 left-4 flex items-center gap-1.5">
                          <span className="bg-gradient-to-r bg-[200%_auto] bg-clip-text leading-tight text-transparent transition-all duration-300 from-neutral-900 via-slate-500 to-neutral-500 dark:from-neutral-100 dark:via-slate-400 dark:to-neutral-400 text-xs font-bold  uppercase tracking-wide block mb-1">Thuật ngữ</span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <button
                            onClick={e => { e.stopPropagation(); onToggleMark(currentCard._id) }}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-xl transition-all border",
                              isMarked 
                                ? "bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100" 
                                : "border-transparent bg-violet-50 text-violet-300 hover:bg-violet-100 hover:text-violet-600"
                            )}
                          >
                            <Star className={cn('h-4 w-4', isMarked && 'fill-amber-400')} />
                          </button>
                        </div>
                        {/* Decorative blobs */}
                        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/5 blur-xl pointer-events-none" />
                        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5 blur-xl pointer-events-none" />
                      </div>
                    }
                    back={
                     <div className=" absolute inset-0 rounded-3xl border-2 border-slate-100 shadow-2xl flex flex-col items-center justify-between p-8 text-center select-none w-full h-full"
                          style={{
                            background: "radial-gradient(125% 125% at 50% 10%, #fff 40%, #7c3aed 100%)",
                          }}>
                        <div className="h-4" /> {/* Spacer */}
                        <div className="overflow-y-auto w-full max-w-2xl max-h-[220px] my-auto px-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                          <p className=" text-xl font-bold text-slate-800 text-center leading-relaxed">
                            {currentCard.definition}
                          </p>
                        </div>
                        <p className="text-slate-600 text-xs font-medium shrink-0">Nhấn để xem thuật ngữ</p>

                        <div className="absolute top-4 left-4">
                          <span className="bg-gradient-to-r bg-[200%_auto] bg-clip-text leading-tight text-transparent transition-all duration-300 from-neutral-900 via-slate-500 to-neutral-500 dark:from-neutral-100 dark:via-slate-400 dark:to-neutral-400 text-xs font-bold  uppercase tracking-wide block mb-1.5">Định nghĩa</span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <button
                            onClick={e => { e.stopPropagation(); onToggleMark(currentCard._id) }}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-xl transition-all border",
                              isMarked 
                                ? "bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100" 
                                : "border-transparent bg-violet-50 text-violet-300 hover:bg-violet-100 hover:text-violet-600"
                            )}
                          >
                            <Star className={cn('h-4 w-4', isMarked && 'fill-amber-400')} />
                          </button>
                        </div>
                      </div>
                    }
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation + Controls */}
            <div className="flex flex-col items-center gap-3 w-full max-w-3xl select-none">
              <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4">
                {/* Controls Row */}
                <div className="flex items-center w-full">
                  {/* Left: Exit and Tracking Switch */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-start">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:inline">Theo dõi</span>
                    <button
                      onClick={() => handleToggleTracking(!isTracking)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        isTracking ? "bg-violet-600" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          isTracking ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Center: Prev - Progress - Next */}
                  <div className="flex items-center gap-1.5 sm:gap-4 flex-shrink-0 justify-center">
                    {isTracking ? (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleMarkProgress(false)}
                              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Đang học</TooltipContent>
                        </Tooltip>

                        <span className="text-xs sm:text-sm font-bold text-slate-900 min-w-[55px] sm:min-w-[70px] text-center whitespace-nowrap">
                          {currentIndex + 1} / {cards.length}
                        </span>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleMarkProgress(true)}
                              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-500 hover:bg-emerald-100 transition-all"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Đã biết</TooltipContent>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={goPrev}
                          disabled={currentIndex === 0}
                          className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        <span className="text-xs sm:text-sm font-bold text-slate-900 min-w-[55px] sm:min-w-[70px] text-center whitespace-nowrap">
                          {currentIndex + 1} / {cards.length}
                        </span>

                        <button
                          onClick={currentIndex === cards.length - 1 ? () => setIsEndScreen(true) : goNext}
                          className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Right: Shuffle Toggle */}
                  <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={isShuffled ? unshuffleRemaining : shuffleRemaining}
                          className={cn(
                            "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition-all",
                            isShuffled
                              ? "bg-violet-600 border-violet-600 text-white hover:bg-violet-700 hover:border-violet-700"
                              : "border-slate-200 text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          <Shuffle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{isShuffled ? "Tắt xáo trộn" : "Bật xáo trộn"}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                {isTracking ? (
                  <span>
                    Nhấn <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[9px]">1</kbd> hoặc <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[9px]">n</kbd> cho <X className="inline h-3 w-3 text-red-500 mb-0.5" /> · Nhấn <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[9px]">2</kbd> hoặc <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[9px]">y</kbd> cho <Check className="inline h-3 w-3 text-emerald-500 mb-0.5" /> · <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[9px]">Space</kbd> để lật
                  </span>
                ) : (
                  <span>
                    Nhấn <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[9px]">Space</kbd> để lật thẻ · <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[9px]">←</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[9px]">→</kbd> để điều hướng
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

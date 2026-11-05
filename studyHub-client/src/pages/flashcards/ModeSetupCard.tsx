import { Brain, Award, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { CardItem } from '@/types/flashcard'
import { useState, useEffect } from 'react'

interface ModeSetupCardProps {
  mode: 'quiz' | 'test'
  totalCards: number
  selectedLimit: number
  setSelectedLimit: (limit: number) => void
  mcCount: number
  setMcCount: (count: number) => void
  tfCount: number
  setTfCount: (count: number) => void
  onStart: (selectedCards: CardItem[]) => void
  cards: CardItem[]
  /** Nếu truyền vào, ModeSetupCard sẽ tự động mở tab “Tự chọn” và tick sẵn các thẻ này */
  preselectedCardIds?: Set<string>
}

export default function ModeSetupCard({
  mode,
  totalCards,
  selectedLimit,
  setSelectedLimit,
  mcCount,
  setMcCount,
  tfCount,
  setTfCount,
  onStart,
  cards,
  preselectedCardIds,
}: ModeSetupCardProps) {
  const isQuiz = mode === 'quiz'
  const Icon = isQuiz ? Brain : Award

  const [quizMethod, setQuizMethod] = useState<'random' | 'manual'>(
    preselectedCardIds && preselectedCardIds.size > 0 ? 'manual' : 'random'
  )
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(
    preselectedCardIds && preselectedCardIds.size > 0
      ? new Set(preselectedCardIds)
      : new Set()
  )

  // Initialize selected card IDs when cards are loaded
  useEffect(() => {
    if (preselectedCardIds && preselectedCardIds.size > 0) {
      // Đến từ “Học lại từ sai”: tick sẵn các thẻ đã chỉ định
      setSelectedCardIds(new Set(preselectedCardIds))
      setQuizMethod('manual')
    } else if (cards && cards.length > 0) {
      setSelectedCardIds(new Set(cards.map(c => c._id)))
    }
  }, [cards, preselectedCardIds])

  const handleToggleCardSelection = (id: string) => {
    setSelectedCardIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAllCards = () => {
    setSelectedCardIds(new Set(cards.map(c => c._id)))
  }

  const handleDeselectAllCards = () => {
    setSelectedCardIds(new Set())
  }

  // Total selected for Test Mode or Quiz Mode
  const totalSelected = isQuiz
    ? (quizMethod === 'random' ? selectedLimit : selectedCardIds.size)
    : (mcCount + tfCount)

  const handleStart = () => {
    if (isQuiz) {
      if (quizMethod === 'random') {
        if (!Number.isInteger(selectedLimit) || selectedLimit < 1 || selectedLimit > totalCards) {
          toast.error(`Số lượng câu trắc nghiệm phải là số từ 1 đến ${totalCards}`)
          return
        }
        // Generate random list
        const shuffled = [...cards].sort(() => Math.random() - 0.5)
        const selected = shuffled.slice(0, selectedLimit)
        onStart(selected)
      } else {
        if (selectedCardIds.size < 1) {
          toast.error('Vui lòng chọn ít nhất 1 câu hỏi để học')
          return
        }
        const selected = cards.filter(c => selectedCardIds.has(c._id))
        onStart(selected)
      }
    } else {
      if (!Number.isInteger(mcCount) || mcCount < 0) {
        toast.error('Số câu trắc nghiệm (MCQ) phải là số nguyên không âm')
        return
      }
      if (!Number.isInteger(tfCount) || tfCount < 0) {
        toast.error('Số câu đúng / sai (T/F) phải là số nguyên không âm')
        return
      }
      const totalSelected = mcCount + tfCount
      if (totalSelected < 1 || totalSelected > totalCards) {
        toast.error(`Tổng số câu hỏi kiểm tra phải từ 1 đến ${totalCards}`)
        return
      }
      // For test mode, generate random test subset
      const shuffled = [...cards].sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, totalSelected)
      onStart(selected)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-6 text-center select-none my-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 mx-auto shadow-sm animate-pulse">
        <Icon className="h-7 w-7" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-extrabold text-slate-800">
          {isQuiz ? 'Cấu hình học tập' : 'Cấu hình kiểm tra'}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed px-4">
          {isQuiz
            ? 'Luyện tập trả lời các câu hỏi trắc nghiệm để ghi nhớ kiến thức vững vàng hơn.'
            : 'Đánh giá năng lực ghi nhớ của bạn thông qua bài kiểm tra trắc nghiệm.'}
        </p>
      </div>

      {totalCards === 0 ? (
        <div className="rounded-2xl bg-amber-50/60 border border-amber-100 p-4 text-left">
          <p className="text-xs font-semibold text-amber-700">Bộ thẻ hiện tại không có thẻ khả dụng.</p>
          <p className="text-[10px] text-amber-500 mt-1">Vui lòng quay lại danh sách hoặc chọn bộ lọc thẻ khác.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {isQuiz ? (
            /* Quiz Mode Setup: Single Question Count Input */
            <div className="space-y-4 text-left">
              {/* Selection mode toggle tabs */}
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setQuizMethod('random')}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                    quizMethod === 'random'
                      ? "bg-white text-slate-800 shadow-3xs"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Ngẫu nhiên
                </button>
                <button
                  type="button"
                  onClick={() => setQuizMethod('manual')}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                    quizMethod === 'manual'
                      ? "bg-white text-slate-800 shadow-3xs"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Tự chọn câu hỏi
                </button>
              </div>

              {quizMethod === 'random' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Số lượng câu trắc nghiệm</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={totalCards}
                      value={selectedLimit || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value)
                        setSelectedLimit(val)
                      }}
                      className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setSelectedLimit(totalCards)}
                      className="h-10 rounded-xl px-3.5 text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-600"
                    >
                      Chọn tất cả ({totalCards})
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Nhập từ 1 đến {totalCards} câu</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Danh sách câu hỏi</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllCards}
                        className="text-[10px] font-bold text-violet-600 hover:text-violet-700 transition-colors"
                      >
                        Chọn tất cả
                      </button>
                      <span className="text-[10px] text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllCards}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-600 transition-colors"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  {/* Scrollable list of cards */}
                  <div className="border border-slate-100 rounded-2xl max-h-48 overflow-y-auto p-2 space-y-1.5 bg-slate-50/50 scrollbar-thin">
                    {cards.map((card, idx) => {
                      const isChecked = selectedCardIds.has(card._id)
                      return (
                        <label
                          key={card._id}
                          className={cn(
                            "flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer select-none transition-all duration-150",
                            isChecked
                              ? "bg-white border-violet-200 text-violet-700 shadow-3xs"
                              : "bg-white/60 border-slate-100 text-slate-600 hover:bg-white hover:border-slate-200"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleCardSelection(card._id)}
                            className="mt-1 h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 transition-all"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold leading-tight">Câu {idx + 1}</p>
                            <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">{card.term}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-1">
                    <span>Đã chọn: {selectedCardIds.size} / {totalCards} câu hỏi</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Test Mode Setup: MCQ Count + TF Count Inputs */
            <div className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Số câu trắc nghiệm (MCQ)</label>
                <input
                  type="number"
                  min={0}
                  max={totalCards}
                  value={mcCount}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Number(e.target.value)
                    setMcCount(val)
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Số câu đúng / sai (T/F)</label>
                <input
                  type="number"
                  min={0}
                  max={totalCards}
                  value={tfCount}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Number(e.target.value)
                    setTfCount(val)
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs font-bold text-slate-600">
                <span>Tổng số câu hỏi đã chọn:</span>
                <span className={cn(totalSelected > totalCards || totalSelected === 0 ? "text-red-500" : "text-violet-600")}>
                  {totalSelected} / {totalCards}
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={handleStart}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold h-11 gap-2 shadow-md shadow-violet-600/10 transition-all mt-2"
          >
            <Play className="h-4 w-4 fill-white" /> Bắt đầu ngay
          </Button>
        </div>
      )}
    </div>
  )
}

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CardItem } from '@/types/flashcard'
import { ArrowRight, Brain, Check, CheckCircle2, RotateCcw, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'

interface QuizModeProps {
  cards: CardItem[]
  allCards?: CardItem[]
  onExit: () => void
}

export default function QuizMode({ cards, allCards, onExit }: QuizModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [showResults, setShowResults] = useState(false)

  const currentCard = cards[currentIndex]

  // Sinh đáp án ngẫu nhiên không trùng lặp cho câu hỏi hiện tại
  const choices = useMemo(() => {
    if (!currentCard) return []
    const correct = currentCard.definition
    // Lấy danh sách định nghĩa từ allCards nếu có, fallback về cards đã chọn
    const sourceCards = allCards && allCards.length > 0 ? allCards : cards
    const others = sourceCards
      .filter(c => c._id !== currentCard._id)
      .map(c => c.definition)
    // Loại bỏ các định nghĩa trùng lặp
    const uniqueOthers = Array.from(new Set(others))
    // Xáo trộn và lấy ra tối đa 3 đáp án sai
    const shuffledOthers = [...uniqueOthers].sort(() => Math.random() - 0.5)
    const incorrect = shuffledOthers.slice(0, 3)
    // Gộp đáp án đúng và đáp án sai, sau đó xáo trộn lại vị trí
    const combined = [correct, ...incorrect]
    return combined.sort(() => Math.random() - 0.5)
  }, [currentCard?._id, cards, allCards])

  const handleSelect = (option: string) => {
    if (isAnswered) return
    setSelectedAnswer(option)
    setIsAnswered(true)
    if (option === currentCard.definition) {
      setScore(s => s + 1)
    }
  }



  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setSelectedAnswer(null)
      setIsAnswered(false)
      setCurrentIndex(i => i + 1)
    } else {
      setShowResults(true)
    }
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setIsAnswered(false)
    setScore(0)
    setShowResults(false)
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50">
          <Brain className="h-8 w-8 text-violet-400" />
        </div>
        <p className="text-sm text-slate-500">Không có thẻ nào để học trắc nghiệm.</p>
        <Button variant="outline" onClick={onExit} className="rounded-xl">Quay lại</Button>
      </div>
    )
  }

  if (showResults) {
    const percentage = Math.round((score / cards.length) * 100)
    const isPassing = percentage >= 80

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl mx-auto bg-white rounded-3xl border border-slate-100 p-8 text-center shadow-xl shadow-slate-100/50"
      >
        <div className={cn(
          "flex h-20 w-20 items-center justify-center rounded-2xl mx-auto mb-6 shadow-lg",
          isPassing 
            ? "bg-emerald-50 text-emerald-600 shadow-emerald-100" 
            : "bg-violet-50 text-violet-600 shadow-violet-100"
        )}>
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Hoàn thành học trắc nghiệm! </h3>
        <p className="text-slate-500 mb-6 text-sm max-w-md mx-auto">
          {isPassing 
            ? "Tuyệt vời! Bạn đã ghi nhớ rất tốt nội dung bộ thẻ này." 
            : "Hãy tiếp tục cố gắng luyện tập thêm để ghi nhớ bài tốt hơn nhé!"}
        </p>

        {/* Score Ring / Bar */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 max-w-sm mx-auto mb-8 space-y-4">
          <div className="flex justify-between items-center text-sm font-medium text-slate-500">
            <span>Độ chính xác</span>
            <span className={cn("font-bold text-lg", isPassing ? "text-emerald-600" : "text-violet-600")}>
              {percentage}%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <motion.div 
              className={cn("h-full rounded-full", isPassing ? "bg-emerald-500" : "bg-violet-600")}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span>Đúng {score} câu</span>
            <span>Tổng số {cards.length} câu</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleReset} 
            className="rounded-xl border-slate-200 font-semibold h-11 px-6 hover:bg-slate-50 transition-all"
          >
            <RotateCcw className="h-4 w-4 mr-2" /> Học lại
          </Button>
          <Button 
            onClick={onExit} 
            className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold h-11 px-6 shadow-md shadow-violet-600/10 transition-all"
          >
            Xem danh sách
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6 w-full max-w-3xl mx-auto">
      {/* Progress header */}
      <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-5 sm:py-4 rounded-2xl border border-slate-100 shadow-sm sticky top-0 z-10 gap-2">
        <span className="text-xs sm:text-sm font-extrabold text-slate-800 shrink-0">
          Câu hỏi {currentIndex + 1} / {cards.length}
        </span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isAnswered && (
            <Button
              onClick={handleNext}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs h-8 px-2.5 sm:px-3.5 gap-1 sm:gap-1.5 shadow-sm shadow-slate-900/10 transition-all shrink-0"
            >
              <span className="hidden sm:inline">
                {currentIndex < cards.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
              </span>
              <span className="sm:hidden">
                {currentIndex < cards.length - 1 ? 'Tiếp theo' : 'Kết quả'}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={onExit}
            className="rounded-xl text-xs font-bold text-slate-500 hover:text-violet-600 hover:bg-violet-50/50 h-8 px-2 sm:px-3 shrink-0"
          >
            Trở lại
          </Button>
        </div>
      </div>

      {/* Unified Quiz Card */}
      <div 
        className="w-full bg-gradient-to-br from-white to-slate-50/30 rounded-3xl border-2 border-slate-100 p-6 sm:p-8 shadow-xl relative min-h-[460px] flex flex-col justify-between"
        style={{
          background: "radial-gradient(125% 125% at 50% 10%, #fff 40%, #7c3aed 100%)",
        }}
      >
        <div>
          {/* Top section: Category indicator */}
          <div className="flex items-center justify-between mb-4">
            <span className="bg-gradient-to-r bg-[200%_auto] bg-clip-text leading-tight text-transparent transition-all duration-300 from-neutral-900 via-slate-500 to-neutral-500 text-xs font-bold uppercase tracking-wide">
              Thuật ngữ
            </span>
          </div>

          {/* Term Display */}
          <div className="min-h-[100px] flex items-center mb-8">
            <h2 className="text-slate-800 text-xl sm:text-2xl font-extrabold leading-snug">
              {currentCard.term}
            </h2>
          </div>

          {/* Choices Title */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-slate-500 text-xs font-bold">Chọn đáp án đúng</span>
            {isAnswered && (
              <span className="text-[10px] bg-violet-50 border border-violet-100 px-2.5 py-0.5 rounded-full text-violet-600 font-semibold">
                Đã trả lời
              </span>
            )}
          </div>

          {/* Grid of Choices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {choices.map((option, idx) => {
              const isSelected = selectedAnswer === option
              const isCorrectOption = option === currentCard.definition
              
              let btnClass = "bg-white/80 border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-700 shadow-sm"
              let icon = null

              if (isAnswered) {
                if (isCorrectOption) {
                  btnClass = "bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold shadow-sm shadow-emerald-100/50"
                  icon = <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                } else if (isSelected) {
                  btnClass = "bg-rose-50 border-rose-500 text-rose-700 font-semibold shadow-sm shadow-rose-100/50"
                  icon = <X className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                } else {
                  btnClass = "bg-white/40 border-slate-100 text-slate-400 opacity-60 cursor-not-allowed"
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "flex items-center justify-between w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left text-sm font-semibold outline-none",
                    btnClass
                  )}
                >
                  <div className="flex items-start gap-3 w-full pr-4">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{option}</span>
                  </div>
                  {icon}
                </button>
              )
            })}
          </div>
        </div>

        
      </div>
    </div>
  )
}

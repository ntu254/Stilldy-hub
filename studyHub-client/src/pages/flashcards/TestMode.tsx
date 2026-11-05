import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { learningHistoryService } from '@/services/learningHistoryService'
import type { CardItem } from '@/types/flashcard'
import { AlertCircle, Check, CheckCircle2, FileText, Loader2, RotateCcw, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface TestModeProps {
  cards: CardItem[]
  /** Tất cả thẻ của bộ (để cross-reference incorrectTerms) */
  allCards?: CardItem[]
  /** ID bộ thẻ – dùng để ghi nhận kết quả lên BE */
  flashcardId?: string
  onExit: () => void
  mcCount?: number
  tfCount?: number
}

interface TestQuestion {
  cardId: string
  term: string
  type: 'multiple-choice' | 'true-false'
  choices?: string[]
  correctAnswer: string // definition cho trắc nghiệm, "true" hoặc "false" cho Đúng/Sai
  displayedDefinition?: string // dùng cho Đúng/Sai
}

export default function TestMode({ cards, allCards, flashcardId, onExit, mcCount, tfCount }: TestModeProps) {
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0, percentage: 0 })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Track khi nào bài thi bắt đầu để tính durationSeconds
  const startTimeRef = useRef<number>(Date.now())
  // Guard: chỉ ghi 1 lần duy nhất mỗi lần nộp bài
  const hasSavedRef = useRef(false)

  // Hàm sinh đề thi ngẫu nhiên
  const generateTest = useCallback(() => {
    if (cards.length === 0) return

    // Xáo trộn thứ tự các thẻ
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5)
    const total = shuffledCards.length
    
    // Chia đôi bộ đề hoặc theo số lượng cấu hình
    const mcLimit = typeof mcCount === 'number' ? Math.min(mcCount, total) : (total === 1 ? 1 : Math.ceil(total / 2))
    const tfLimit = typeof tfCount === 'number' ? Math.min(tfCount, total - mcLimit) : (total - mcLimit)

    const mcCards = shuffledCards.slice(0, mcLimit)
    const tfCards = shuffledCards.slice(mcLimit, mcLimit + tfLimit)

    const generated: TestQuestion[] = []

    // 1. Sinh câu hỏi trắc nghiệm
    mcCards.forEach((card) => {
      const correct = card.definition
      const others = cards
        .filter(c => c._id !== card._id)
        .map(c => c.definition)
      const uniqueOthers = Array.from(new Set(others))
      const shuffledOthers = [...uniqueOthers].sort(() => Math.random() - 0.5)
      const incorrect = shuffledOthers.slice(0, 3)
      const choices = [correct, ...incorrect].sort(() => Math.random() - 0.5)

      generated.push({
        cardId: card._id,
        term: card.term,
        type: 'multiple-choice',
        choices,
        correctAnswer: correct,
      })
    })

    // 2. Sinh câu hỏi Đúng / Sai
    tfCards.forEach((card) => {
      const isCorrectDef = Math.random() > 0.5
      let displayedDefinition = card.definition
      let correctAnswer = 'true'

      // Nếu chọn gán sai định nghĩa (và bộ thẻ có từ 2 thẻ trở lên)
      if (!isCorrectDef && cards.length > 1) {
        const others = cards.filter(c => c._id !== card._id)
        const randomCard = others[Math.floor(Math.random() * others.length)]
        displayedDefinition = randomCard.definition
        correctAnswer = 'false'
      }

      generated.push({
        cardId: card._id,
        term: card.term,
        type: 'true-false',
        displayedDefinition,
        correctAnswer,
      })
    })

    setQuestions(generated)
    setAnswers({})
    setSubmitted(false)
    setScore({ correct: 0, total: 0, percentage: 0 })
    setSaveStatus('idle')
    hasSavedRef.current = false
    startTimeRef.current = Date.now()
  }, [cards])

  // Sinh đề khi mount component
  useEffect(() => {
    generateTest()
  }, [generateTest])

  const handleSelectAnswer = (qIndex: number, val: string) => {
    if (submitted) return
    setAnswers(prev => ({
      ...prev,
      [qIndex]: val
    }))
  }

  const handleSubmit = () => {
    if (submitted) return

    let correctCount = 0
    const incorrectCardIds: string[] = []

    questions.forEach((q, idx) => {
      const userAns = answers[idx]
      if (userAns === q.correctAnswer) {
        correctCount++
      } else {
        incorrectCardIds.push(q.cardId)
      }
    })

    const total = questions.length
    const percentage = Math.round((correctCount / total) * 100)
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)

    setScore({ correct: correctCount, total, percentage })
    setSubmitted(true)

    // ── Fire-and-forget: lưu kết quả ngầm, không block UX ──
    if (flashcardId && !hasSavedRef.current) {
      hasSavedRef.current = true
      setSaveStatus('saving')
      learningHistoryService
        .recordTestResult({
          flashcardId,
          score: percentage,
          totalQuestions: total,
          correctAnswers: correctCount,
          durationSeconds,
          incorrectTerms: incorrectCardIds,
        })
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'))
    }

    // Cuộn lên đầu trang kết quả kiểm tra
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50">
          <FileText className="h-8 w-8 text-violet-400" />
        </div>
        <p className="text-sm text-slate-500">Không có thẻ nào để làm bài kiểm tra.</p>
        <Button variant="outline" onClick={onExit} className="rounded-xl">Quay lại</Button>
      </div>
    )
  }

  const mcQuestions = questions.filter(q => q.type === 'multiple-choice')
  const tfQuestions = questions.filter(q => q.type === 'true-false')

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto px-4">
      {/* Top sticky bar */}
      <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-5 sm:py-4 rounded-2xl border border-slate-100 shadow-sm sticky top-0 z-10 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <FileText className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-violet-500 shrink-0" />
          <span className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
            Kiểm tra bộ thẻ ({cards.length} câu)
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={generateTest}
            className="rounded-xl text-xs font-bold border-slate-200 h-8 px-2.5 sm:px-3 hover:bg-slate-50 shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Làm đề mới</span>
            <span className="sm:hidden">Làm mới</span>
          </Button>
          <Button
            variant="ghost"
            onClick={onExit}
            className="rounded-xl text-xs font-bold text-slate-500 hover:text-violet-600 hover:bg-violet-50/50 h-8 px-2.5 sm:px-3 shrink-0"
          >
            Thoát
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Test Content */}
        <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
          {/* Results Header Card */}
          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-100/50 flex flex-col md:flex-row items-center gap-6"
            >
              {/* Circular Badge */}
              <div className={cn(
                "flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-8 text-2xl font-black tabular-nums shadow-inner",
                score.percentage >= 80 
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-emerald-100" 
                  : score.percentage >= 50
                    ? "bg-amber-50 border-amber-400 text-amber-700 shadow-amber-100"
                    : "bg-rose-50 border-rose-500 text-rose-700 shadow-rose-100"
              )}>
                {score.percentage}%
              </div>

              <div className="flex-1 text-center md:text-left space-y-2">
                <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                  {score.percentage >= 80 
                    ? "Kết quả xuất sắc! 🎉" 
                    : score.percentage >= 50
                      ? "Kết quả khá tốt! 👍"
                      : "Cần cố gắng học thêm nhé! 💪"}
                </h3>
                <p className="text-sm text-slate-500">
                  Bạn trả lời đúng <strong className="text-slate-800 font-bold">{score.correct}</strong> trên tổng số <strong className="text-slate-800 font-bold">{score.total}</strong> câu hỏi.
                </p>
                {score.correct < score.total && (
                  <p className="text-xs text-rose-500 font-medium flex items-center justify-center md:justify-start gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Hãy rà soát danh sách câu trả lời sai ở dưới.
                  </p>
                )}

                {/* Subtle save indicator – không block UX */}
                <AnimatePresence mode="wait">
                  {saveStatus === 'saving' && (
                    <motion.p
                      key="saving"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-slate-400 flex items-center justify-center md:justify-start gap-1.5 mt-1"
                    >
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Đang lưu kết quả...
                    </motion.p>
                  )}
                  {saveStatus === 'saved' && (
                    <motion.p
                      key="saved"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-emerald-500 flex items-center justify-center md:justify-start gap-1.5 mt-1"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Đã lưu vào lịch sử
                    </motion.p>
                  )}
                  {saveStatus === 'error' && (
                    <motion.p
                      key="error"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-rose-400 flex items-center justify-center md:justify-start gap-1.5 mt-1"
                    >
                      <AlertCircle className="h-3 w-3" />
                      Không thể lưu lịch sử
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={generateTest} 
                  className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold h-10 px-5 shadow-md shadow-violet-600/10 transition-all"
                >
                  Làm đề mới
                </Button>
              </div>
            </motion.div>
          )}

          {/* Part 1: Multiple Choice */}
          {mcQuestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-50 text-[10px] font-bold text-violet-600">
                  I
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Phần 1: Trắc nghiệm chọn đáp án đúng
                </h4>
              </div>

              <div className="space-y-4">
                {questions.map((q, idx) => {
                  if (q.type !== 'multiple-choice') return null

                  const userAns = answers[idx]
                  const isCorrect = userAns === q.correctAnswer
                  const showValidation = submitted

                  return (
                    <div 
                      key={idx}
                      id={`question-box-${idx}`}
                      className={cn(
                        "bg-white rounded-2xl border p-5 sm:p-6 transition-all space-y-4 shadow-sm",
                        showValidation
                          ? isCorrect 
                            ? "border-emerald-200 bg-emerald-50/10 shadow-emerald-50/50" 
                            : "border-rose-200 bg-rose-50/10 shadow-rose-50/50"
                          : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Câu hỏi {idx + 1}
                          </span>
                          <p className="font-extrabold text-slate-800 text-base leading-snug">
                            {q.term}
                          </p>
                        </div>

                        {showValidation && (
                          <span className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full shrink-0",
                            isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          )}>
                            {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </span>
                        )}
                      </div>

                      {/* MCQ choices options list */}
                      <div className="grid grid-cols-1 gap-2.5">
                        {q.choices?.map((opt, oIdx) => {
                          const isSelected = userAns === opt
                          const isCorrectOpt = opt === q.correctAnswer

                          let optionStyle = "border-slate-100 bg-slate-50/50 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                          
                          if (isSelected) {
                            optionStyle = "border-slate-800 bg-slate-900 text-white"
                          }

                          if (showValidation) {
                            if (isCorrectOpt) {
                              optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold"
                            } else if (isSelected) {
                              optionStyle = "border-rose-500 bg-rose-50 text-rose-800 font-semibold"
                            } else {
                              optionStyle = "border-slate-100 bg-slate-50/30 text-slate-400 opacity-60 cursor-not-allowed"
                            }
                          }

                          return (
                            <button
                              key={oIdx}
                              type="button"
                              disabled={submitted}
                              onClick={() => handleSelectAnswer(idx, opt)}
                              className={cn(
                                "flex items-center w-full px-4 py-3 text-left rounded-xl border text-sm font-medium transition-all outline-none",
                                optionStyle
                              )}
                            >
                              <span className="mr-3 text-xs font-bold shrink-0 opacity-40">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              <span className="leading-relaxed">{opt}</span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Correction side-by-side message for wrong answers */}
                      {showValidation && !isCorrect && (
                        <div className="rounded-xl bg-rose-50/50 border border-rose-100 p-3.5 text-xs text-rose-900 space-y-1">
                          <p>
                            <strong className="font-bold">Định nghĩa của bạn chọn:</strong> {userAns || <span className="italic opacity-60">(Bỏ trống)</span>}
                          </p>
                          <p>
                            <strong className="font-bold text-emerald-700">Định nghĩa đúng:</strong> {q.correctAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Part 2: True/False */}
          {tfQuestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-50 text-[10px] font-bold text-violet-600">
                  II
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Phần 2: Đánh giá Đúng / Sai
                </h4>
              </div>

              <div className="space-y-4">
                {questions.map((q, idx) => {
                  if (q.type !== 'true-false') return null

                  const userAns = answers[idx]
                  const isCorrect = userAns === q.correctAnswer
                  const showValidation = submitted

                  return (
                    <div 
                      key={idx}
                      id={`question-box-${idx}`}
                      className={cn(
                        "bg-white rounded-2xl border p-5 sm:p-6 transition-all space-y-4 shadow-sm",
                        showValidation
                          ? isCorrect 
                            ? "border-emerald-200 bg-emerald-50/10 shadow-emerald-50/50" 
                            : "border-rose-200 bg-rose-50/10 shadow-rose-50/50"
                          : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Câu hỏi {idx + 1}
                          </span>
                          <p className="font-extrabold text-slate-800 text-base leading-snug">
                             <strong className="text-violet-600 font-extrabold">"{q.term}</strong> 
                          </p>
                          <p className="text-sm text-slate-600 italic leading-relaxed pt-1.5 pl-3 border-l-2 border-slate-200">
                            "{q.displayedDefinition}"
                          </p>
                        </div>

                        {showValidation && (
                          <span className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full shrink-0",
                            isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          )}>
                            {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </span>
                        )}
                      </div>

                      {/* True/False Buttons */}
                      <div className="flex items-center gap-3">
                        {['true', 'false'].map((option) => {
                          const isSelected = userAns === option
                          const isCorrectOpt = option === q.correctAnswer
                          const labelText = option === 'true' ? 'Đúng' : 'Sai'

                          let btnStyle = "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                          
                          if (isSelected) {
                            btnStyle = option === 'true'
                              ? "border-slate-800 bg-slate-900 text-white"
                              : "border-slate-800 bg-slate-900 text-white"
                          }

                          if (showValidation) {
                            if (isCorrectOpt) {
                              btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold"
                            } else if (isSelected) {
                              btnStyle = "border-rose-500 bg-rose-50 text-rose-800 font-semibold"
                            } else {
                              btnStyle = "border-slate-100 bg-slate-50/30 text-slate-400 opacity-60 cursor-not-allowed"
                            }
                          }

                          return (
                            <button
                              key={option}
                              type="button"
                              disabled={submitted}
                              onClick={() => handleSelectAnswer(idx, option)}
                              className={cn(
                                "flex-1 py-3 text-center rounded-xl border text-sm font-bold transition-all outline-none",
                                btnStyle
                              )}
                            >
                              {labelText}
                            </button>
                          )
                        })}
                      </div>

                      {/* Correction side-by-side message for wrong answers */}
                      {showValidation && !isCorrect && (
                        <div className="rounded-xl bg-rose-50/50 border border-rose-100 p-3.5 text-xs text-rose-900 space-y-1">
                          <p>
                            <strong className="font-bold">Đánh giá của bạn:</strong> {userAns === 'true' ? 'Đúng' : userAns === 'false' ? 'Sai' : <span className="italic opacity-60">(Chưa chọn)</span>}
                          </p>
                          <p>
                            <strong className="font-bold text-emerald-700">Đánh giá đúng:</strong> {q.correctAnswer === 'true' ? 'Đúng' : 'Sai'}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Footer submit button */}
          {!submitted && (
            <div className="pt-4 pb-8 flex justify-center">
              <Button
                onClick={handleSubmit}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold h-11 px-8 shadow-lg shadow-slate-900/10 transition-all w-full sm:w-auto"
              >
                Nộp bài thi
              </Button>
            </div>
          )}
        </div>

        {/* Right Side: Sticky Navigation Map */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm sticky top-20 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Danh sách câu hỏi
            </h4>
            
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = answers[idx] !== undefined
                const userAns = answers[idx]
                const isCorrect = userAns === q.correctAnswer

                let btnStyle = "bg-slate-50 border border-slate-200 text-slate-500 hover:border-slate-350 hover:bg-slate-100"

                if (isAnswered) {
                  btnStyle = "bg-slate-800 border-slate-800 text-white hover:bg-slate-700"
                }

                if (submitted) {
                  if (isCorrect) {
                    btnStyle = "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600"
                  } else {
                    btnStyle = "bg-rose-500 border-rose-500 text-white hover:bg-rose-600"
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`question-box-${idx}`)
                      if (el) {
                        const yOffset = -80
                        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset
                        window.scrollTo({ top: y, behavior: 'smooth' })
                      }
                    }}
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all outline-none",
                      btnStyle
                    )}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
            
           
          </div>
        </div>
      </div>
    </div>
  )
}

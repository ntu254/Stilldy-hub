import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { flashcardService } from '@/services/flashcardService'
import type { FlashcardCollection } from '@/types/flashcard'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Globe,
  Layers,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function formatRelativeTime(dateStr: string): string {
  try {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Vừa xong'
    if (diffMin < 60) return `${diffMin} phút trước`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour} giờ trước`
    const diffDay = Math.floor(diffHour / 24)
    if (diffDay < 30) return `${diffDay} ngày trước`
    return date.toLocaleDateString('vi-VN')
  } catch {
    return ''
  }
}

export default function PublicFlashcards() {
  const { isAuthenticated } = useAuth()
  const [collections, setCollections] = useState<FlashcardCollection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sliderRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    const fetchPublicFlashcards = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const res = await flashcardService.getPublicCollections({
          page: '1',
          limit: '8',
          sortOrder: 'desc',
        })
        setCollections(res.data || [])
      } catch (err: any) {
        setError(err?.message || 'Không thể tải danh sách bộ câu hỏi hay.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPublicFlashcards()
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return null
  }

  // Slider scroll handlers
  const handleSliderScroll = () => {
    const el = sliderRef.current
    if (el) {
      setShowLeftArrow(el.scrollLeft > 10)
      setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
    }
  }

  const scrollSlider = (direction: 'left' | 'right') => {
    const el = sliderRef.current
    if (el) {
      const scrollAmount = direction === 'left' ? -350 : 350
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    const el = sliderRef.current
    if (el) {
      el.addEventListener('scroll', handleSliderScroll)
      setTimeout(handleSliderScroll, 300)
    }
    return () => {
      el?.removeEventListener('scroll', handleSliderScroll)
    }
  }, [collections])

  const handleViewAll = () => {
    navigate('/public-flashcards')
  }

  return (
    <div className="relative border-t border-slate-100/80 pt-12 mt-12 mb-8">
      {/* ─── Header Section ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[20px] font-extrabold tracking-tight text-slate-800 uppercase flex items-center gap-2">
          Bộ câu hỏi hay
        </h2>
        <button
          onClick={handleViewAll}
          className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 group cursor-pointer"
        >
          Xem thêm
          <ExternalLink className="h-3.5 w-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* ─── Loading Skeleton State ───────────────────────────────────── */}
      {isLoading && (
        <div className="flex gap-6 overflow-hidden pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-[280px] min-w-[280px] bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm animate-pulse">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
              <Skeleton className="h-5 w-3/4 rounded-md" />
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-2/3 rounded-md" />
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Error State ───────────────────────────────────────────── */}
      {!isLoading && error && (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      )}

      {/* ─── Empty State ───────────────────────────────────────────── */}
      {!isLoading && !error && collections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 rounded-3xl border border-slate-100 text-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <BookOpen className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-slate-600">Chưa có bộ câu hỏi công khai nào.</p>
        </div>
      )}

      {/* ─── Horizontal Scrollable Slider ─────────────────────────────── */}
      {!isLoading && !error && collections.length > 0 && (
        <div className="relative group/slider">
          {/* Left Arrow Overlay */}
          {showLeftArrow && (
            <button
              onClick={() => scrollSlider('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-600 shadow-md hover:bg-slate-50 hover:text-indigo-600 transition-all cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Right Arrow Overlay */}
          {showRightArrow && (
            <button
              onClick={() => scrollSlider('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-600 shadow-md hover:bg-slate-50 hover:text-indigo-600 transition-all cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {/* Scrollable Container */}
          <div
            ref={sliderRef}
            className="flex items-stretch gap-6 overflow-x-auto pb-4 pt-1 px-1 snap-x snap-mandatory scroll-smooth no-scrollbar"
          >
            {collections.map((col) => {
              const author = typeof col.createdBy === 'object' ? col.createdBy : null
              const authorName = author?.displayName || author?.email || 'Thành viên'
              const avatarLetter = authorName.charAt(0).toUpperCase()
              const cardCount = col.totalCards ?? col.cards?.length ?? 0

              return (
                <div
                  key={col._id}
                  className="w-[280px] min-w-[280px] shrink-0 snap-start flex flex-col"
                >
                  <Card
                    onClick={() => navigate(`/flashcards/${col._id}`)}
                    className="h-full flex-1 flex flex-col justify-between border-slate-100 hover:border-violet-200 bg-white hover:shadow-xl hover:shadow-violet-100/50 hover:-translate-y-1.5 transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer group"
                  >
                    <div className="flex-1 flex flex-col">
                      {/* Header: Public Badge + View Count */}
                      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0 shrink-0">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-0.5 text-[10px] font-bold shadow-3xs">
                          <Globe className="h-3 w-3 text-emerald-500 animate-pulse" />
                          Công khai
                        </span>

                        <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                          <Eye className="h-3 w-3" />
                          <span>{col.viewCount}</span>
                        </div>
                      </CardHeader>

                      {/* Content */}
                      <CardContent className="px-4 py-2 flex-1 flex flex-col">
                        <h3 className="text-sm font-bold text-slate-800 mt-1 line-clamp-2 leading-snug h-10 group-hover:text-violet-600 transition-colors">
                          {col.title}
                        </h3>

                        <div className="mt-auto pt-2">
                          {col.description && (
                            <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                              {col.description}
                            </p>
                          )}

                          {/* Card Count Pill */}
                          <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-violet-50/80 border border-violet-100/60 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                            <Layers className="h-3.5 w-3.5 text-violet-500" />
                            <span>{cardCount} câu hỏi</span>
                          </div>
                        </div>
                      </CardContent>
                    </div>

                    {/* Footer: Author & Time */}
                    <CardFooter className="p-4 pt-3 flex items-center justify-between border-t border-slate-50 shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[9px] font-bold text-white overflow-hidden">
                          {author?.avatar ? (
                            <img src={author.avatar} alt="" className="h-full w-full object-cover" />
                          ) : avatarLetter}
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 truncate">
                          {authorName}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-300 shrink-0">
                        {formatRelativeTime(col.createdAt)}
                      </span>
                    </CardFooter>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  Layers,
  Eye,
  Globe,
  Search,
  Sparkles,
  Loader2,
  AlertCircle,
  FolderOpen,
  BookOpen,
  Heart,
  ArrowLeft,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import DocPagination from '@/pages/documents/DocPagination'
import { flashcardService } from '@/services/flashcardService'
import type { FlashcardCollection } from '@/types/flashcard'

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

export default function PublicFlashcardsPage() {
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [collections, setCollections] = useState<FlashcardCollection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const navigate = useNavigate()
  const limit = 12 // 12 bộ thẻ mỗi trang (3 hàng 4 cột)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
      if (searchQuery.trim()) {
        setSearchParams({ q: searchQuery.trim() })
      } else {
        setSearchParams({})
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, setSearchParams])

  // Fetch public flashcard collections
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    const fetchPublicCollections = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await flashcardService.getPublicCollections({
          page: currentPage.toString(),
          limit: limit.toString(),
          search: debouncedSearch.trim(),
          sortOrder: 'desc',
        })

        setCollections(response.data || [])
        setTotal(response.meta?.total ?? response.data.length)
        setTotalPages(response.meta?.totalPages ?? 1)
      } catch (err: any) {
        setError(err?.message || 'Có lỗi xảy ra khi tải danh sách bộ câu hỏi hay.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPublicCollections()
  }, [currentPage, debouncedSearch, isAuthenticated])

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow py-12 bg-slate-50/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">

          {/* ── Header Title & Back Button ─────────────────────────────── */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200/60 pb-8">
            <div>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-3 group cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                Trở về Trang chủ
              </button>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-100 px-3 py-0.5 text-[11px] font-bold text-violet-600 uppercase tracking-widest block w-fit mb-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-500 animate-pulse" /> Bộ câu hỏi hay
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 uppercase">
                Tất cả bộ câu hỏi Flashcard
              </h1>
              <p className="text-slate-500 mt-1.5 text-sm max-w-2xl">
                Tổng hợp toàn bộ các bộ thẻ câu hỏi hay được cộng đồng học tập chia sẻ. Tìm kiếm và ôn tập dễ dàng.
              </p>
            </div>

            {/* Search Input Bar */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm bộ câu hỏi..."
                className="pl-10 pr-4 h-10 rounded-2xl border-slate-200 bg-white text-sm placeholder:text-slate-400 shadow-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
              />
            </div>
          </div>

          {/* ── Status Indicator ────────────────────────────────────────── */}
          {isAuthenticated && !isLoading && !error && (
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>
                Tìm thấy <strong className="text-slate-800 font-bold">{total}</strong> bộ câu hỏi phù hợp
                {debouncedSearch && <> cho từ khóa &ldquo;<strong className="text-violet-600">{debouncedSearch}</strong>&rdquo;</>}
              </span>
              <span>Trang {currentPage} / {totalPages}</span>
            </div>
          )}

          {/* ── Unauthenticated State ───────────────────────────────────── */}
          {!isAuthenticated && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-xl mx-auto px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <BookOpen className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Vui lòng đăng nhập</h3>
              <p className="text-sm text-slate-500 max-w-md">
                Đăng nhập để khám phá tất cả các bộ thẻ câu hỏi hay và bắt đầu ôn tập hiệu quả.
              </p>
              <Button
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl px-6 py-2 shadow-md shadow-violet-600/20"
                onClick={() => navigate('/login')}
              >
                Đăng nhập ngay
              </Button>
            </div>
          )}

          {/* ── Loading State ──────────────────────────────────────────── */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Đang tải danh sách bộ câu hỏi hay...</p>
            </div>
          )}

          {/* ── Error State ────────────────────────────────────────────── */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-xl mx-auto px-6">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm text-slate-700 text-center font-medium leading-relaxed">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl font-bold px-5"
                onClick={() => window.location.reload()}
              >
                Thử lại
              </Button>
            </div>
          )}

          {/* ── Empty State ────────────────────────────────────────────── */}
          {isAuthenticated && !isLoading && !error && collections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
                <FolderOpen className="h-8 w-8" />
              </div>
              <p className="text-sm text-slate-600 font-bold">Không tìm thấy bộ câu hỏi nào.</p>
              <p className="text-xs text-slate-400">Vui lòng thử lại với từ khóa tìm kiếm khác.</p>
            </div>
          )}

          {/* ── Grid of Collections ────────────────────────────────────── */}
          {isAuthenticated && !isLoading && !error && collections.length > 0 && (
            <div className="space-y-12">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {collections.map((col) => {
                  const author = typeof col.createdBy === 'object' ? col.createdBy : null
                  const authorName = author?.displayName || author?.email || 'Thành viên'
                  const avatarLetter = authorName.charAt(0).toUpperCase()
                  const cardCount = col.totalCards ?? col.cards?.length ?? 0

                  return (
                    <motion.div
                      key={col._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="group h-full"
                    >
                      <Card
                        onClick={() => navigate(`/flashcards/${col._id}`)}
                        className="h-full flex flex-col justify-between border-slate-100 hover:border-violet-200 bg-white hover:shadow-xl hover:shadow-violet-100/50 hover:-translate-y-1.5 transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer"
                      >
                        <div>
                          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 px-2.5 py-0.5 text-[10px] font-bold shadow-3xs">
                              <Globe className="h-3 w-3 text-emerald-500 animate-pulse" />
                              Công khai
                            </span>
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                              <Eye className="h-3 w-3" />
                              <span>{col.viewCount}</span>
                            </div>
                          </CardHeader>

                          <CardContent className="px-4 py-2 flex-grow">
                            <h3 className="text-sm font-bold text-slate-800 mt-1 line-clamp-2 leading-snug group-hover:text-violet-600 transition-colors">
                              {col.title}
                            </h3>

                            {col.description && (
                              <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                                {col.description}
                              </p>
                            )}

                            <div className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-50/80 border border-violet-100/60 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                              <Layers className="h-3.5 w-3.5 text-violet-500" />
                              <span>{cardCount} câu hỏi</span>
                            </div>
                          </CardContent>
                        </div>

                        <CardFooter className="p-4 pt-3 flex items-center justify-between border-t border-slate-50">
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
                    </motion.div>
                  )
                })}
              </div>

              {/* ── Pagination ─────────────────────────────────────────── */}
              {totalPages > 1 && (
                <div className="flex justify-center pt-6">
                  <DocPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-900">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="text-lg font-bold text-white tracking-tight flex items-center gap-1">
                  Nexus
                </span>
              </div>
              <p className="text-xs leading-relaxed max-w-xs text-slate-400">
                Hub kết nối, lưu trữ tài liệu học tập toàn năng ứng dụng AI.
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Sản phẩm</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="hover:text-white transition-colors">Kết nối Nexus</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Trợ lý AI Chat</a></li>
              </ul>
            </div>

            <div className="flex flex-col gap-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hỗ trợ</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="hover:text-white transition-colors">Hướng dẫn sử dụng</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bảo mật thông tin</a></li>
              </ul>
            </div>

            <div className="flex flex-col gap-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Đội ngũ</h4>
              <p className="text-xs leading-relaxed">
                Được xây dựng bởi ban phát triển Nexus Dev Team.
              </p>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-800/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <span>© 2026 Nexus Vietnam. Mọi quyền được bảo lưu.</span>
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <Heart className="h-3 w-3 text-red-500 fill-red-500" />
              <span>for better education.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

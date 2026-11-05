import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { documentService } from '@/services/documentService'
import { AlertCircle, ChevronLeft, ChevronRight, Download, ExternalLink, Eye, FileSpreadsheet, FileText, Film, FolderOpen, Image, Loader2, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PublicFlashcards from './PublicFlashcards'

// Interface khớp với Document Schema trả về từ server
interface DocumentVersion {
  versionNumber: number
  fileName: string
  fileUrl: string
  fileSize: number
  createdAt: string
}

interface PublicDocument {
  _id: string
  title: string
  description: string
  subjectId: { _id: string; name: string } | null
  tags: string[]
  uploadedBy: { _id: string; fullName: string; email: string } | null
  isPublic: boolean
  viewCount: number
  downloadCount: number
  versions: DocumentVersion[]
  createdAt: string
  updatedAt: string
  likes?: string[]
  dislikes?: string[]
  totalLikes?: number
  totalDislikes?: number
}

// --- Helpers ---

/** Lấy extension từ fileName của phiên bản mới nhất */
function getFileExtension(doc: PublicDocument): string {
  const latestVersion = doc.versions[doc.versions.length - 1]
  if (!latestVersion) return ''
  const ext = latestVersion.fileName.split('.').pop()?.toLowerCase() ?? ''
  return ext
}

/** Format bytes sang KB / MB */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Format thời gian tương đối */
function formatRelativeTime(dateStr: string): string {
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
}

type FileType = 'pdf' | 'pptx' | 'docx' | 'xls' | 'image' | 'other'

function classifyFileType(ext: string): FileType {
  if (ext === 'pdf') return 'pdf'
  if (ext === 'pptx' || ext === 'ppt') return 'pptx'
  if (ext === 'xlsx' || ext === 'xls') return 'xls'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image'
  if (ext === 'docx' || ext === 'doc') return 'docx'
  return 'other'
}

function getFileIconInfo(type: FileType) {
  switch (type) {
    case 'pdf':
      return {
        icon: <FileText className="h-5 w-5 text-red-500" />,
        bgColor: 'bg-red-50',
      }
    case 'pptx':
      return {
        icon: <Film className="h-5 w-5 text-orange-500" />,
        bgColor: 'bg-orange-50',
      }
    case 'xls':
      return {
        icon: <FileSpreadsheet className="h-5 w-5 text-emerald-500" />,
        bgColor: 'bg-emerald-50',
      }
    case 'image':
      return {
        icon: <Image className="h-5 w-5 text-pink-500" />,
        bgColor: 'bg-pink-50',
      }
    default:
      return {
        icon: <FileText className="h-5 w-5 text-blue-500" />,
        bgColor: 'bg-blue-50',
      }
  }
}

export default function RecentDocuments() {
  const [documents, setDocuments] = useState<PublicDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleNewCount, setVisibleNewCount] = useState(12) // 3 hàng của layout 4 cột
  
  const navigate = useNavigate()

  // Refs và states cho slider
  const sliderRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  // Fetch public documents
  useEffect(() => {
    const fetchPublicDocuments = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Lấy danh sách tài liệu công khai (giới hạn 80 bản ghi để phân loại client-side)
        const response = await documentService.getPublic({
          page: '1',
          limit: '80',
          sortOrder: 'desc',
        })
        
        let docsList: PublicDocument[] = []

        if (Array.isArray(response)) {
          docsList = response
        } else if (response && Array.isArray(response.data)) {
          docsList = response.data
        } else if (response && Array.isArray(response.documents)) {
          docsList = response.documents
        }

        setDocuments(docsList)
      } catch (err: any) {
        setError(err?.message || 'Không thể tải danh sách tài liệu công khai.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPublicDocuments()
  }, [])

  // Lọc & sắp xếp dữ liệu
  // 1. TÀI LIỆU NỔI BẬT: Sắp xếp theo (lượt xem + lượt thích * 3) desc
  const featuredDocs = [...documents]
    .sort((a, b) => {
      const scoreA = (a.viewCount || 0) + (a.likes?.length || a.totalLikes || 0) * 3
      const scoreB = (b.viewCount || 0) + (b.likes?.length || b.totalLikes || 0) * 3
      return scoreB - scoreA
    })
    .slice(0, 8) // Hiển thị tối đa 8 tài liệu nổi bật trong slider

  // 2. TÀI LIỆU MỚI: Sắp xếp theo thời gian tải lên desc
  const newDocs = [...documents].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // Xử lý scroll slider bằng chevrons
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
  }, [featuredDocs])

  // Điều hướng xem tất cả tài liệu nổi bật
  const handleViewAllFeatured = () => {
    navigate('/featured')
  }

  return (
    <section className="py-16 bg-slate-50/20 border-t border-slate-100/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Đang tải danh sách tài liệu...</p>
          </div>
        )}

        {/* Error State */}
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

        {/* Content Section */}
        {!isLoading && !error && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
              <FolderOpen className="h-8 w-8" />
            </div>
            <p className="text-sm text-slate-500 font-semibold">Chưa có tài liệu công khai nào trên hệ thống.</p>
            <p className="text-xs text-slate-400">Hãy là người đầu tiên chia sẻ tài liệu học tập!</p>
          </div>
        )}

        {/* Main Interface when Data Loaded */}
        {!isLoading && !error && documents.length > 0 && (
          <div className="space-y-16">
            
            {/* --- SECTION 1: TÀI LIỆU NỔI BẬT --- */}
            <div className="relative">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[20px] font-extrabold tracking-tight text-slate-800 uppercase flex items-center gap-2">
                  Tài liệu nổi bật
                </h2>
                <button
                  onClick={handleViewAllFeatured}
                  className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 group"
                >
                  Xem thêm
                  <ExternalLink className="h-3.5 w-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Slider Wrapper */}
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

                {/* Horizontal Scrollable Container */}
                <div
                  ref={sliderRef}
                  className="flex items-stretch gap-6 overflow-x-auto pb-4 pt-1 px-1 snap-x snap-mandatory scroll-smooth no-scrollbar"
                >
                  {featuredDocs.map((doc) => {
                    const ext = getFileExtension(doc)
                    const fileType = classifyFileType(ext)
                    const { icon, bgColor } = getFileIconInfo(fileType)
                    const latestVersion = doc.versions[doc.versions.length - 1]
                    const fileSize = latestVersion ? formatFileSize(latestVersion.fileSize) : '—'

                    return (
                      <div
                        key={doc._id}
                        className="w-[280px] min-w-[280px] shrink-0 snap-start flex flex-col"
                      >
                        <Card className="h-full flex-1 flex flex-col justify-between border-slate-100 hover:border-indigo-200 bg-white hover:shadow-xl hover:shadow-slate-100/60 hover:-translate-y-1.5 transition-all duration-300 rounded-2xl overflow-hidden group">
                          
                          <div className="flex-1 flex flex-col">
                            {/* Card Header with Doc Type and View Count */}
                            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0 shrink-0">
                              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', bgColor)}>
                                {icon}
                              </div>

                              <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-100">
                                <Eye className="h-3 w-3 text-slate-400" />
                                <span>{doc.viewCount} lượt xem</span>
                              </div>
                            </CardHeader>

                            {/* Card Content */}
                            <CardContent className="px-4 py-2 flex-1 flex flex-col">
                              
                              {/* Date */}
                              <span className="text-[10px] font-medium text-slate-400">
                                {formatRelativeTime(doc.createdAt)}
                              </span>
                              
                              {/* Title */}
                              <CardTitle
                                onClick={() => navigate(`/preview/${doc._id}`, { state: { fileType: ext } })}
                                className="text-sm font-bold text-slate-800 mt-1 line-clamp-2 leading-snug h-10 group-hover:text-indigo-600 transition-colors cursor-pointer"
                              >
                                {doc.title}
                              </CardTitle>

                              {/* Size + Uploader */}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-semibold text-slate-400">
                                  {fileSize} · {ext.toUpperCase()}
                                </span>
                              </div>

                              {/* Description box & Uploader */}
                              <div className="mt-auto pt-3">
                                {doc.description && (
                                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100/50 relative overflow-hidden group-hover:bg-indigo-50/20 group-hover:border-indigo-100/30 transition-colors">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 mb-1">
                                      <Sparkles className="h-3 w-3 animate-pulse" /> Mô tả
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                                      {doc.description}
                                    </p>
                                  </div>
                                )}

                                {doc.uploadedBy && (
                                  <p className="text-[10px] text-slate-400 mt-2 truncate">
                                    Chia sẻ bởi: <span className="font-semibold text-slate-500">{doc.uploadedBy.fullName || doc.uploadedBy.email || 'Ẩn danh'}</span>
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </div>

                          {/* Card Footer tags and action */}
                          <CardFooter className="p-4 pt-2 flex flex-col gap-3.5 border-t border-slate-50/50 shrink-0">
                            
                            {/* Tags */}
                            {doc.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 w-full">
                                {doc.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded-lg bg-slate-100/70 border border-slate-200/20 px-2 py-0.5 text-[9px] font-bold text-slate-600"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Subject badge */}
                            {doc.subjectId && (
                              <div className="w-full">
                                <span className="rounded-lg bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 text-[9px] font-bold text-indigo-600">
                                  {doc.subjectId.name}
                                </span>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 w-full">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/preview/${doc._id}`, { state: { fileType: ext } })}
                                className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 w-full gap-1 rounded-xl"
                              >
                                Xem chi tiết
                              </Button>
                              <button
                                onClick={() => navigate(`/preview/${doc._id}`, { state: { fileType: ext } })}
                                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-indigo-600 hover:text-white transition-all"
                                aria-label="Download document"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </div>

                          </CardFooter>

                        </Card>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* --- BỘ CÂU HỎI HAY (FLASHCARDS) --- */}
            <PublicFlashcards />

            {/* --- SECTION 2: TÀI LIỆU MỚI --- */}
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-8 border-t border-slate-100/80 pt-12">
                <h2 className="text-[20px] font-extrabold tracking-tight text-slate-800 uppercase">
                  Tài liệu mới
                </h2>
              </div>

              {/* Grid of Cards */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
                {newDocs.slice(0, visibleNewCount).map((doc) => {
                  const ext = getFileExtension(doc)
                  const fileType = classifyFileType(ext)
                  const { icon, bgColor } = getFileIconInfo(fileType)
                  const latestVersion = doc.versions[doc.versions.length - 1]
                  const fileSize = latestVersion ? formatFileSize(latestVersion.fileSize) : '—'

                  return (
                    <motion.div
                      key={doc._id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="group h-full flex flex-col"
                    >
                      <Card className="h-full flex-1 flex flex-col justify-between border-slate-100 hover:border-indigo-200 bg-white hover:shadow-xl hover:shadow-slate-100/60 hover:-translate-y-1.5 transition-all duration-300 rounded-2xl overflow-hidden">
                        
                        <div className="flex-1 flex flex-col">
                          {/* Card Header with Doc Type and View Count */}
                          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0 shrink-0">
                            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', bgColor)}>
                              {icon}
                            </div>

                            <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-100">
                              <Eye className="h-3 w-3 text-slate-400" />
                              <span>{doc.viewCount} lượt xem</span>
                            </div>
                          </CardHeader>

                          {/* Card Content */}
                          <CardContent className="px-4 py-2 flex-1 flex flex-col">
                            
                            {/* Date */}
                            <span className="text-[10px] font-medium text-slate-400">
                              {formatRelativeTime(doc.createdAt)}
                            </span>
                            
                            {/* Title */}
                            <CardTitle
                              onClick={() => navigate(`/preview/${doc._id}`, { state: { fileType: ext } })}
                              className="text-sm font-bold text-slate-800 mt-1 line-clamp-2 leading-snug h-10 group-hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              {doc.title}
                            </CardTitle>

                            {/* Size + Uploader */}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-semibold text-slate-400">
                                {fileSize} · {ext.toUpperCase()}
                              </span>
                            </div>

                            {/* Description box & Uploader */}
                            <div className="mt-auto pt-3">
                              {doc.description && (
                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100/50 relative overflow-hidden group-hover:bg-indigo-50/20 group-hover:border-indigo-100/30 transition-colors">
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 mb-1">
                                    <Sparkles className="h-3 w-3 animate-pulse" /> Mô tả
                                  </div>
                                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                                    {doc.description}
                                  </p>
                                </div>
                              )}

                              {doc.uploadedBy && (
                                <p className="text-[10px] text-slate-400 mt-2 truncate">
                                  Chia sẻ bởi: <span className="font-semibold text-slate-500">{doc.uploadedBy.fullName || doc.uploadedBy.email || 'Ẩn danh'}</span>
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </div>

                        {/* Card Footer tags and action */}
                        <CardFooter className="p-4 pt-2 flex flex-col gap-3.5 border-t border-slate-50/50 shrink-0">
                          
                          {/* Tags */}
                          {doc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 w-full">
                              {doc.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-lg bg-slate-100/70 border border-slate-200/20 px-2 py-0.5 text-[9px] font-bold text-slate-600"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Subject badge */}
                          {doc.subjectId && (
                            <div className="w-full">
                              <span className="rounded-lg bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 text-[9px] font-bold text-indigo-600">
                                {doc.subjectId.name}
                              </span>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 w-full">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/preview/${doc._id}`, { state: { fileType: ext } })}
                              className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 w-full gap-1 rounded-xl"
                            >
                              Xem chi tiết
                            </Button>
                            <button
                              onClick={() => navigate(`/preview/${doc._id}`, { state: { fileType: ext } })}
                              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-indigo-600 hover:text-white transition-all"
                              aria-label="Download document"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>

                        </CardFooter>

                      </Card>
                    </motion.div>
                  )
                })}
              </div>

              {/* In-place Load More button */}
              {visibleNewCount < newDocs.length && (
                <div className="flex items-center justify-center mt-12">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleNewCount((prev) => prev + 12)}
                    className="rounded-full px-8 py-5 border-slate-200 hover:border-indigo-100 hover:bg-indigo-50/20 text-slate-600 hover:text-indigo-600 font-bold transition-all shadow-sm hover:shadow flex items-center gap-1.5"
                  >
                    Xem thêm tài liệu mới
                    <ChevronRight className="h-4 w-4 rotate-90" />
                  </Button>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </section>
  )
}

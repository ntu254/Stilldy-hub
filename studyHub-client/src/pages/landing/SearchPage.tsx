import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { FileText, FileSpreadsheet, Film, Image, AlertCircle, Sparkles, Download, Eye, Loader2, FolderOpen, BookOpen, Heart } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'
import { documentService } from '@/services/documentService'

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

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  
  const [documents, setDocuments] = useState<PublicDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const navigate = useNavigate()
  const limit = 12 // 12 tài liệu mỗi trang (3 hàng 4 cột)

  // Reset về trang 1 khi từ khóa tìm kiếm thay đổi
  useEffect(() => {
    setCurrentPage(1)
  }, [q])

  // Fetch dữ liệu từ API tìm kiếm công khai
  useEffect(() => {
    const fetchSearchResults = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await documentService.getPublic({
          page: currentPage.toString(),
          limit: limit.toString(),
          title: q,
          sortOrder: 'desc',
        })

        let docsList: PublicDocument[] = []
        let totalDocs = 0
        let pagesCount = 1

        if (response && Array.isArray(response.data)) {
          docsList = response.data
          totalDocs = response.meta?.total ?? response.data.length
          pagesCount = response.meta?.totalPages ?? 1
        } else if (response && Array.isArray(response.documents)) {
          docsList = response.documents
          totalDocs = response.total ?? response.documents.length
          pagesCount = Math.ceil(totalDocs / limit)
        } else if (Array.isArray(response)) {
          docsList = response
          totalDocs = response.length
          pagesCount = 1
        }

        setDocuments(docsList)
        setTotal(totalDocs)
        setTotalPages(pagesCount)
      } catch (err: any) {
        setError(err?.message || 'Có lỗi xảy ra khi thực hiện tìm kiếm.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSearchResults()
  }, [q, currentPage])

  // Helper sinh danh sách các trang hiển thị (bao gồm cả dấu chấm lửng)
  const getPageNumbers = () => {
    const pages = []
    const range = 2
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - range && i <= currentPage + range)
      ) {
        pages.push(i)
      } else if (
        i === currentPage - range - 1 ||
        i === currentPage + range + 1
      ) {
        pages.push(-1) // đại diện cho dấu chấm lửng
      }
    }
    return pages
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow py-16 bg-slate-50/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Header title */}
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 uppercase">
              Kết quả tìm kiếm
            </h1>
            {q ? (
              <p className="text-slate-500 mt-2 text-sm">
                Tìm thấy <span className="font-bold text-indigo-600">{total}</span> tài liệu phù hợp với từ khóa &ldquo;<span className="font-semibold text-slate-800">{q}</span>&rdquo;.
              </p>
            ) : (
              <p className="text-slate-500 mt-2 text-sm">
                Hãy nhập từ khóa vào ô tìm kiếm ở trên để bắt đầu khám phá tài liệu.
              </p>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Đang tìm kiếm tài liệu...</p>
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

          {/* Empty State */}
          {!isLoading && !error && documents.length === 0 && q && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FolderOpen className="h-8 w-8" />
              </div>
              <p className="text-sm text-slate-500 font-semibold">Không tìm thấy tài liệu phù hợp.</p>
              <p className="text-xs text-slate-400">Vui lòng thử lại với từ khóa khác hoặc duyệt danh sách công khai.</p>
            </div>
          )}

          {/* Search Results Grid */}
          {!isLoading && !error && documents.length > 0 && (
            <div className="space-y-12">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {documents.map((doc) => {
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
                      className="group h-full"
                    >
                      <Card className="h-full flex flex-col justify-between border-slate-100 hover:border-indigo-200 bg-white hover:shadow-xl hover:shadow-slate-100/60 hover:-translate-y-1.5 transition-all duration-300 rounded-2xl overflow-hidden">
                        
                        <div>
                          {/* Card Header with Doc Type and View Count */}
                          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', bgColor)}>
                              {icon}
                            </div>

                            <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-100">
                              <Eye className="h-3 w-3 text-slate-400" />
                              <span>{doc.viewCount} lượt xem</span>
                            </div>
                          </CardHeader>

                          {/* Card Content */}
                          <CardContent className="px-4 py-2 flex-grow">
                            
                            {/* Date */}
                            <span className="text-[10px] font-medium text-slate-400">
                              {formatRelativeTime(doc.createdAt)}
                            </span>
                            
                            {/* Title */}
                            <CardTitle
                              onClick={() => navigate(`/preview/${doc._id}`, { state: { fileType: ext } })}
                              className="text-sm font-bold text-slate-800 mt-1 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              {doc.title}
                            </CardTitle>

                            {/* Size + Uploader */}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-semibold text-slate-400">
                                {fileSize} · {ext.toUpperCase()}
                              </span>
                            </div>

                            {/* Description box */}
                            {doc.description && (
                              <div className="mt-3.5 rounded-xl bg-slate-50 p-2.5 border border-slate-100/50 relative overflow-hidden group-hover:bg-indigo-50/20 group-hover:border-indigo-100/30 transition-colors">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 mb-1">
                                  <Sparkles className="h-3 w-3 animate-pulse" /> Mô tả
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">
                                  {doc.description}
                                </p>
                              </div>
                            )}

                            {/* Uploader info */}
                            {doc.uploadedBy && (
                              <p className="text-[10px] text-slate-400 mt-2 truncate">
                                Chia sẻ bởi: <span className="font-semibold text-slate-500">{doc.uploadedBy.fullName || doc.uploadedBy.email || 'Ẩn danh'}</span>
                              </p>
                            )}
                          </CardContent>
                        </div>

                        {/* Card Footer tags and action */}
                        <CardFooter className="p-4 pt-2 flex flex-col gap-3.5 border-t border-slate-50/50">
                          
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

              {/* Standard Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      {/* Previous Page */}
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          text="Trước"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage > 1) setCurrentPage(currentPage - 1)
                          }}
                          className={cn(currentPage <= 1 && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>

                      {/* Page Numbers */}
                      {getPageNumbers().map((pageNum, idx) => {
                        if (pageNum === -1) {
                          return (
                            <PaginationItem key={`ellipsis-${idx}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )
                        }
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              isActive={currentPage === pageNum}
                              onClick={(e) => {
                                e.preventDefault()
                                setCurrentPage(pageNum)
                              }}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      })}

                      {/* Next Page */}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          text="Sau"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                          }}
                          className={cn(currentPage >= totalPages && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
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
            
            {/* Column 1: Brand details */}
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
                Hub kết nối, lưu trữ tài liệu học tập toàn năng ứng dụng AI. Nâng tầm hiệu suất và điểm số học tập của sinh viên Việt Nam.
              </p>
            </div>

            {/* Column 2: Products */}
            <div className="flex flex-col gap-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Sản phẩm</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="hover:text-white transition-colors">Kết nối Nexus</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Trợ lý AI Chat</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Sơ đồ tư duy 3D</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tính năng cộng tác</a></li>
              </ul>
            </div>

            {/* Column 3: Resource */}
            <div className="flex flex-col gap-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hỗ trợ & Tài liệu</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="hover:text-white transition-colors">Hướng dẫn sử dụng</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bảo mật thông tin</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Điều khoản dịch vụ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Chính sách E2EE</a></li>
              </ul>
            </div>

            {/* Column 4: Contact & Socials */}
            <div className="flex flex-col gap-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Đội ngũ phát triển</h4>
              <p className="text-xs leading-relaxed">
                Được xây dựng bằng cả nhiệt huyết bởi ban phát triển **Nexus Dev Team**.
              </p>
              <div className="mt-2 flex items-center gap-3">
                <a href="#" className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all" aria-label="Github link">
                  <svg className="h-4 w-4 fill-current text-slate-300" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                </a>
              </div>
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

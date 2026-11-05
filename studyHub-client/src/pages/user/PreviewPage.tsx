import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/animate-ui/components/animate/tooltip'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { getApiUrl } from '@/lib/api'
import { documentService } from '@/services/documentService'
import type { DocumentItem, ServerDocument } from '@/types/document'
import {
  AlertCircle,
  ArrowLeft,
  Download,
  Globe,
  Lock,
  Maximize2,
  Minimize2,
  RotateCw,
  Search,
  Share2,
  Sidebar,
  Sparkles,
  Star,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Document, pdfjs } from 'react-pdf'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import DocumentViewer from '../documents/DocumentViewer'
import ReportModal from '../documents/ReportModal'
import DMCAModal from '@/components/DMCAModal'
import AiChatBox from './preview-components/AiChatBox'
import DescriptionModal from './preview-components/DescriptionModal'
import LeftThumbnailSidebar from './preview-components/LeftThumbnailSidebar'
import PreviewHeader from './preview-components/PreviewHeader'
import RightMetadataSidebar from './preview-components/RightMetadataSidebar'
import PreviewSkeleton from './preview-components/PreviewSkeleton'
import DocViewerSkeleton from '../documents/DocViewerSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

function getFileExt(doc: ServerDocument): string {
  const latest = doc.versions[doc.versions.length - 1]
  if (!latest) return ''
  return latest.fileName.split('.').pop()?.toLowerCase() ?? ''
}

// Type badge colours
const TYPE_BADGE: Record<string, string> = {
  pdf: 'text-red-600 bg-red-50 border-red-100',
  ppt: 'text-orange-600 bg-orange-50 border-orange-100',
  xls: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  doc: 'text-blue-600 bg-blue-50 border-blue-100',
  img: 'text-violet-600 bg-violet-50 border-violet-100',
}

function extToDocType(ext: string): 'pdf' | 'doc' | 'ppt' | 'xls' | 'img' {
  if (ext === 'pdf') return 'pdf'
  if (['pptx', 'ppt'].includes(ext)) return 'ppt'
  if (['xlsx', 'xls'].includes(ext)) return 'xls'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'img'
  return 'doc'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

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

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isStandalone = location.pathname.startsWith('/preview/')
  const { isAuthenticated, user } = useAuth()

  const [doc, setDoc] = useState<DocumentItem | null>(null)
  const [originalExt, setOriginalExt] = useState<string>('')
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starred, setStarred] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [uploaderName, setUploaderName] = useState<string>('Người dùng')
  const [uploaderId, setUploaderId] = useState<string | null>(null)

  const [viewCount, setViewCount] = useState<number>(0)
  const [downloadCount, setDownloadCount] = useState<number>(0)
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)
  const [likes, setLikes] = useState(0)
  const [dislikes, setDislikes] = useState(0)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  const [rotate, setRotate] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [targetPage, setTargetPage] = useState<number | null>(null)
  const [showThumbnails, setShowThumbnails] = useState(true)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [descModalOpen, setDescModalOpen] = useState(false)
  const [showAiChat, setShowAiChat] = useState(false)

  // DMCA states
  const [dmcaOpen, setDmcaOpen] = useState(false)
  const [dmcaSubmitting, setDmcaSubmitting] = useState(false)

  // Image Zoom states
  const [imageScale, setImageScale] = useState(1)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPdfError(null)
  }

  const onDocumentLoadError = (err: Error) => {
    setPdfError(err.message || 'Không thể tải tài liệu.')
  }

  useEffect(() => {
    const fetchDocDetails = async () => {
      if (!id) return
      try {
        setIsLoading(true)
        setError(null)
        const response = await documentService.getById(id)
        
        // Map to DocumentItem
        const ext = getFileExt(response)
        const latest = response.versions[response.versions.length - 1]
        const mappedDoc: DocumentItem = {
          id: response._id,
          title: response.title,
          type: extToDocType(ext),
          originalFileName: latest?.fileName,
          size: latest ? formatSize(latest.fileSize) : '—',
          sizeBytes: latest?.fileSize ?? 0,
          source: 'local',
          date: formatRelativeTime(response.createdAt),
          dateMs: new Date(response.createdAt).getTime(),
          aiTags: response.tags,
          summary: response.description || 'Không có mô tả.',
          starred: response.isSavedByUser ?? false,
          isPrivate: !response.isPublic,
          isLikedByUser: response.isLikedByUser,
          isDislikedByUser: response.isDislikedByUser,
          isSavedByUser: response.isSavedByUser,
          totalLikes: response.totalLikes,
          totalDislikes: response.totalDislikes,
        }
        
        setDoc(mappedDoc)
        setOriginalExt(ext)
        setUploaderName(response.uploadedBy?.fullName || response.uploadedBy?.email || 'Người dùng')
        setUploaderId(response.uploadedBy?._id || null)

        setViewCount(response.viewCount || 0)
        setDownloadCount(response.downloadCount || 0)
        
        setLikes(response.totalLikes || 0)
        setDislikes(response.totalDislikes || 0)
        setLiked(response.isLikedByUser || false)
        setDisliked(response.isDislikedByUser || false)
        setStarred(response.isSavedByUser || false)
        
        if (latest) {
          setPdfUrl(getApiUrl(`/documents/${id}/file`))
        }
        // Reset image zoom states
        setImageScale(1)
        setImagePosition({ x: 0, y: 0 })
      } catch (err: any) {
        setError(err?.message || 'Không thể tải chi tiết tài liệu.')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchDocDetails()
  }, [id])

  const supportsPdf = originalExt ? originalExt.toLowerCase() === 'pdf' : false
  const isImage = originalExt ? ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(originalExt.toLowerCase()) : false
  const isOwner = !!user && !!uploaderId && (user.id === uploaderId || (user as any)._id === uploaderId)

  const handleTogglePrivacy = async () => {
    if (!id || !doc) return
    const newIsPublic = doc.isPrivate // true if currently private (switching to public)
    if (newIsPublic) {
      setDmcaOpen(true)
    } else {
      try {
        await documentService.updatePrivacy(id, false)
        setDoc(prev => prev ? { ...prev, isPrivate: true } : null)
        toast.success('Đã chuyển tài liệu sang trạng thái Riêng tư.')
      } catch (err: any) {
        toast.error(err?.message || 'Không thể thay đổi trạng thái riêng tư.')
      }
    }
  }

  const handleConfirmDMCA = async () => {
    if (!id || !doc) return
    try {
      setDmcaSubmitting(true)
      await documentService.updatePrivacy(id, true, true)
      setDoc(prev => prev ? { ...prev, isPrivate: false } : null)
      toast.success('Đã chuyển tài liệu sang trạng thái Công khai.')
      setDmcaOpen(false)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thay đổi trạng thái riêng tư.')
    } finally {
      setDmcaSubmitting(false)
    }
  }

  const handleDownload = async () => {
    if (!doc) return
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để tải xuống tài liệu.')
      return
    }
    try {
      toast.info(`Đang tải xuống "${doc.title}"...`)
      const blob = await documentService.download(doc.id)

      // Lấy extension chính xác từ tên file gốc trên server, tránh lỗi ảnh bị đổi thành .img
      let filename: string
      if (doc.originalFileName) {
        const origExt = doc.originalFileName.split('.').pop()?.toLowerCase() || ''
        filename = doc.title.toLowerCase().endsWith(`.${origExt}`)
          ? doc.title
          : `${doc.title}.${origExt}`
      } else {
        let ext: string = doc.type
        if (ext === 'doc') ext = 'docx'
        else if (ext === 'ppt') ext = 'pptx'
        else if (ext === 'xls') ext = 'xlsx'
        filename = doc.title
        if (!filename.toLowerCase().endsWith(`.${ext}`)) {
          filename = `${filename}.${ext}`
        }
      }

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)

      setDownloadCount(prev => prev + 1)
      toast.success(`Tải xuống "${doc.title}" thành công.`)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải xuống tài liệu.')
    }
  }


  const handleLike = async () => {
    if (!id) return
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để thích tài liệu.')
      return
    }
    try {
      const response = await documentService.like(id)
      setLikes(response.totalLikes)
      setDislikes(response.totalDislikes)
      setLiked(response.isLikedByUser)
      setDisliked(response.isDislikedByUser)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thực hiện thích tài liệu.')
    }
  }

  const handleDislike = async () => {
    if (!id) return
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để không thích tài liệu.')
      return
    }
    try {
      const response = await documentService.dislike(id)
      setLikes(response.totalLikes)
      setDislikes(response.totalDislikes)
      setLiked(response.isLikedByUser)
      setDisliked(response.isDislikedByUser)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thực hiện không thích tài liệu.')
    }
  }

  const handleSave = async () => {
    if (!id) return
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để lưu tài liệu.')
      return
    }
    try {
      const response = await documentService.save(id)
      setStarred(response.isSaved)
      toast.success(response.message)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thực hiện lưu tài liệu.')
    }
  }

  const handleReport = async (reason: string) => {
    if (!id) return
    try {
      setIsReporting(true)
      const response = await documentService.report(id, reason)
      toast.success(response?.message || 'Gửi báo cáo vi phạm thành công.')
      setReportModalOpen(false)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể gửi báo cáo.')
    } finally {
      setIsReporting(false)
    }
  }

  const handleShare = async () => {
    if (!id || !doc) return
    if (!isAuthenticated) {
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast.success(`Đã sao chép liên kết trang tài liệu "${doc.title}" vào bộ nhớ tạm!`)
      } catch (err: any) {
        alert('Đã sao chép liên kết trang tài liệu vào bộ nhớ tạm!')
      }
      return
    }
    try {
      const result = await documentService.getShareLink(id)
      await navigator.clipboard.writeText(result.shareLink)
      toast.success(`Đã sao chép link chia sẻ nhanh của "${doc.title}"!`)
    } catch (err: any) {
      navigator.clipboard.writeText(window.location.href)
      alert('Đã sao chép liên kết trang tài liệu vào bộ nhớ tạm!')
    }
  }



  const handleAskAI = () => {
    if (!doc) return
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để hỏi AI.')
      return
    }
    setShowAiChat(true)
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(isStandalone ? '/' : '/dashboard/documents')
    }
  }

  const state = location.state as any
  const docTypeFromState = state?.doc?.type || state?.type || state?.fileType || state?.originalFileName || ''

  if (isLoading) {
    return <PreviewSkeleton fileType={docTypeFromState} />
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 mb-2">
          <AlertCircle className="h-7 w-7 text-rose-500" />
        </div>
        <h1 className="text-base font-bold text-slate-800">Không tìm thấy tài liệu</h1>
        <p className="text-xs text-slate-400 max-w-sm">{error || 'Tài liệu không tồn tại hoặc đã bị xóa.'}</p>
        <button
          onClick={handleBack}
          className="mt-2 group inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200/60 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 shadow-sm transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại
        </button>
      </div>
    )
  }

  const renderGridContent = () => {
    const showSidebar = supportsPdf && showThumbnails

    return (
      <div className={cn(
        fullscreen
          ? 'fixed inset-0 w-screen h-screen z-[100] bg-[#F8FAFC] grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch overflow-hidden'
          : 'w-full flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch'
      )}>

        {/* ─── LEFT COLUMN: Thumbnails Sidebar ─────────────────────────────── */}
        <LeftThumbnailSidebar
          numPages={numPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          setTargetPage={setTargetPage}
          showSidebar={showSidebar}
        />

        {/* ─── CENTER COLUMN (PDF / Non-PDF Viewer Card) ────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={cn(
            fullscreen
              ? (showSidebar ? 'lg:col-span-10' : 'lg:col-span-12')
              : (showSidebar ? 'lg:col-span-7' : 'lg:col-span-9'),
            'flex flex-col bg-[#F8FAFC] overflow-hidden',
            fullscreen
              ? 'h-screen'
              : 'h-full border-r border-slate-100'
          )}
        >
          {/* ── Viewer Header Bar ─────────────────────────────────────────── */}
          <div className="hidden lg:flex items-center justify-between border-b border-slate-100 px-5 py-3 bg-white/95 backdrop-blur-sm shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* File type badge */}
              <span className={cn(
                'rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border shrink-0',
                TYPE_BADGE[doc.type] || TYPE_BADGE.doc
              )}>
                {doc.type}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSave}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-xl border transition-all',
                      starred
                        ? 'border-amber-200 bg-amber-50 text-amber-500 shadow-sm'
                        : 'border-slate-200/60 bg-white text-slate-400 hover:text-slate-600 shadow-sm hover:bg-slate-50'
                    )}
                  >
                    <Star className={cn('h-3.5 w-3.5', starred && 'fill-amber-400')} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Đánh dấu tài liệu</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleShare}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/60 bg-white text-slate-400 hover:text-slate-600 shadow-sm hover:bg-slate-50 transition-all"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Chia sẻ liên kết</TooltipContent>
              </Tooltip>
              <button
                onClick={handleDownload}
                className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100/80 rounded-xl h-8 px-3 text-[11px] font-bold gap-1.5 transition-all inline-flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Tải xuống
              </button>
              {!isImage && (
                <button
                  onClick={handleAskAI}
                  className="bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100/80 rounded-xl h-8 px-3 text-[11px] font-bold gap-1.5 transition-all inline-flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  Hỏi AI
                </button>
              )}
              {isOwner && (
                <button
                  onClick={handleTogglePrivacy}
                  className={cn(
                    'rounded-xl h-8 px-3 text-[11px] font-bold gap-1.5 transition-all inline-flex items-center justify-center shrink-0 cursor-pointer border shadow-xs',
                    doc.isPrivate
                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/80'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80'
                  )}
                >
                  {doc.isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                  {doc.isPrivate ? 'Riêng tư' : 'Công khai'}
                </button>
              )}
            </div>

            {/* Toolbar controls (Sidebar, Search, Rotate, Fullscreen) */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Sidebar toggle */}
              {supportsPdf && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowThumbnails((prev) => !prev)}
                      disabled={numPages <= 0}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl border transition-all shadow-sm cursor-pointer",
                        showThumbnails
                          ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                          : "border-slate-200/60 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <Sidebar className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{showThumbnails ? "Ẩn hình thu nhỏ" : "Xem hình thu nhỏ"}</TooltipContent>
                </Tooltip>
              )}

              {/* Search or Zoom Control */}
              {supportsPdf && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 h-8 text-slate-600 transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-28 text-xs bg-transparent border-0 outline-none p-0 focus:ring-0 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      title="Xóa tìm kiếm"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              {isImage && (
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setImageScale((prev) => {
                            const next = Math.max(prev - 0.25, 0.5)
                            if (next <= 1) setImagePosition({ x: 0, y: 0 })
                            return next
                          })
                        }}
                        disabled={imageScale <= 0.5}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ZoomOut className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Thu nhỏ</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setImageScale(1)
                          setImagePosition({ x: 0, y: 0 })
                        }}
                        className="px-2 h-7 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition-all tabular-nums"
                      >
                        {Math.round(imageScale * 100)}%
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Đặt lại zoom</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setImageScale((prev) => Math.min(prev + 0.25, 8))}
                        disabled={imageScale >= 8}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Phóng to</TooltipContent>
                  </Tooltip>
                </div>
              )}

              {/* Rotate Control */}
              {supportsPdf && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setRotate((r) => (r + 90) % 360)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all shadow-sm"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Xoay tài liệu</TooltipContent>
                </Tooltip>
              )}

              {(supportsPdf || isImage) && (
                <div className="h-4 w-px bg-slate-200 mx-1" />
              )}

              {/* Fullscreen toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setFullscreen(!fullscreen)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all shadow-sm"
                  >
                    {fullscreen
                      ? <Minimize2 className="h-3.5 w-3.5" />
                      : <Maximize2 className="h-3.5 w-3.5" />
                    }
                  </button>
                </TooltipTrigger>
                <TooltipContent>{fullscreen ? 'Thu nhỏ cửa sổ' : 'Xem toàn màn hình'}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* ── Viewer Area ────────────────────────────────────────────── */}
          <DocumentViewer
            fileId={doc.id}
            fileName={doc.title}
            fileType={originalExt}
            numPages={numPages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            targetPage={targetPage}
            onClearTargetPage={() => setTargetPage(null)}
            fullscreen={fullscreen}
            rotate={rotate}
            searchQuery={searchQuery}
            imageScale={imageScale}
            setImageScale={setImageScale}
            imagePosition={imagePosition}
            setImagePosition={setImagePosition}
          />
        </motion.div>

        {/* ─── RIGHT COLUMN (30% - Metadata & AI Insights) ─────────────────── */}
        {!fullscreen && (
          <RightMetadataSidebar
            doc={doc}
            uploaderName={uploaderName}
            viewCount={viewCount}
            downloadCount={downloadCount}
            liked={liked}
            disliked={disliked}
            starred={starred}
            likes={likes}
            dislikes={dislikes}
            handleLike={handleLike}
            handleDislike={handleDislike}
            handleSave={handleSave}
            isOwner={isOwner}
            onReportClick={() => {
              if (!isAuthenticated) {
                toast.info('Vui lòng đăng nhập để báo cáo tài liệu.')
                return
              }
              setReportModalOpen(true)
            }}
            onShowMoreDescription={() => setDescModalOpen(true)}
          />
        )}
      </div>
    )
  }

  return (
    <TooltipProvider>
      {/* Mobile fixed back button */}
      <button
        onClick={handleBack}
        className="lg:hidden fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 text-slate-600 shadow-lg hover:bg-white hover:text-slate-900 transition-all active:scale-95 cursor-pointer"
        aria-label="Quay lại"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="min-h-screen bg-[#F8FAFC] flex flex-col h-screen overflow-hidden">

        {/* ─── Breadcrumb & Actions Header ────────────────────────────────────── */}
        <PreviewHeader
          onBack={handleBack}
          isStandalone={isStandalone}
        />

        {/* ─── 3-Column Responsive Layout ─────────────────────────────────────── */}
        {supportsPdf ? (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            error={
              <div className="flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] w-full h-full py-20 text-center px-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 mb-3">
                  <AlertCircle className="h-7 w-7 text-rose-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Không thể tải tài liệu PDF</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">{pdfError || 'Đã xảy ra lỗi khi đọc tập tin PDF.'}</p>
              </div>
            }
            loading={
              <div className={cn(
                fullscreen
                  ? 'fixed inset-0 w-screen h-screen z-[100] bg-[#F8FAFC] grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch overflow-hidden'
                  : 'w-full flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch'
              )}>
                {/* Left Thumbnail Sidebar Skeleton */}
                {showThumbnails && (
                  <div className="hidden lg:flex flex-col gap-4 shrink-0 p-4 lg:col-span-2 h-full bg-white border-r border-slate-100 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <Skeleton className="h-3 w-16 rounded-md" />
                      <Skeleton className="h-3 w-8 rounded-md" />
                    </div>
                    <div className="flex flex-col gap-3 pt-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center space-y-1.5 p-2 rounded-xl border border-slate-100 bg-slate-50/50">
                          <Skeleton className="h-28 w-20 rounded-md" />
                          <Skeleton className="h-3 w-12 rounded-md" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Center Viewer Loading Skeleton */}
                <div className={cn(
                  fullscreen
                    ? (showThumbnails ? 'lg:col-span-10' : 'lg:col-span-12')
                    : (showThumbnails ? 'lg:col-span-7' : 'lg:col-span-9'),
                  'flex flex-col bg-[#F8FAFC] overflow-hidden h-full border-r border-slate-100'
                )}>
                  <DocViewerSkeleton />
                </div>

                {/* Right Metadata Sidebar */}
                {!fullscreen && (
                  <RightMetadataSidebar
                    doc={doc}
                    uploaderName={uploaderName}
                    viewCount={viewCount}
                    downloadCount={downloadCount}
                    liked={liked}
                    disliked={disliked}
                    starred={starred}
                    likes={likes}
                    dislikes={dislikes}
                    handleLike={handleLike}
                    handleDislike={handleDislike}
                    handleSave={handleSave}
                    isOwner={isOwner}
                    onReportClick={() => {
                      if (!isAuthenticated) {
                        toast.info('Vui lòng đăng nhập để báo cáo tài liệu.')
                        return
                      }
                      setReportModalOpen(true)
                    }}
                    onShowMoreDescription={() => setDescModalOpen(true)}
                  />
                )}
              </div>
            }
            className="flex-1 flex flex-col min-h-0 w-full overflow-hidden"
          >
            {renderGridContent()}
          </Document>
        ) : (
          renderGridContent()
        )}

      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleReport}
        isSubmitting={isReporting}
      />

      {/* Description Modal */}
      <DescriptionModal
        isOpen={descModalOpen}
        onClose={() => setDescModalOpen(false)}
        summary={doc.summary}
      />

      {/* AI ChatBox */}
      <AiChatBox
        docId={doc.id}
        docTitle={doc.title}
        isOpen={showAiChat}
        onClose={() => setShowAiChat(false)}
      />

      <DMCAModal
        isOpen={dmcaOpen}
        onClose={() => setDmcaOpen(false)}
        onConfirm={handleConfirmDMCA}
        isSubmitting={dmcaSubmitting}
      />
    </TooltipProvider>
  )
}

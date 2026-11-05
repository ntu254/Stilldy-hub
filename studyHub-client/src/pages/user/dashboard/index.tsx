import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import {
  AlertCircle,
  BookOpen,
  FileUp,
  Files,
} from 'lucide-react'

import RecentDocCard, { type DocumentItem } from '@/components/dashboard/RecentDocCard'
import StatWidget from '@/components/dashboard/StatWidget'
import { Button } from '@/components/ui/button'
import UploadModal from '@/components/UploadModal'
import StorageUpgradeModal from '@/components/StorageUpgradeModal'
import { useAuth } from '@/contexts/AuthContext'
import { documentService } from '@/services/documentService'
import type { UserStats } from '@/types/dashboard'
import { staggerContainer } from '@/utils/motion'

// Modular subcomponents & helpers
import RecentDocSkeleton from './components/RecentDocSkeleton'
import StorageWidget from './components/StorageWidget'
import { mapToDocumentItem } from './helpers'

export default function DashboardPage() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Recent documents states
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [recentError, setRecentError] = useState<string | null>(null)

  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12
      ? 'Chào buổi sáng'
      : currentHour < 18
      ? 'Chào buổi chiều'
      : 'Chào buổi tối'

  const fetchRecentDocs = async () => {
    try {
      setRecentLoading(true)
      setRecentError(null)
      const data = await documentService.getRecentUploaded()
      setRecentDocs(data.map(mapToDocumentItem))
    } catch (err: any) {
      setRecentError(err?.message || 'Không thể tải danh sách tài liệu gần đây.')
    } finally {
      setRecentLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      const data = await documentService.getUserStats()
      setStats(data)
    } catch {
      // Silently fail, show default values
    } finally {
      setStatsLoading(false)
    }
  }

  // Fetch user stats & recent documents
  useEffect(() => {
    fetchStats()
    fetchRecentDocs()
  }, [])

  const handleDownloadDocument = async (doc: DocumentItem) => {
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
      toast.success(`Tải xuống "${doc.title}" thành công.`)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải xuống tài liệu.')
    }
  }

  // Format ngày hiện tại
  const today = new Date()
  const dateStr = today.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8 space-y-8">

        {/* ── Top Header ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          {/* Greeting */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100">
                <BookOpen className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {greeting} 
              </p>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
              {greeting}, {user?.displayName || 'bạn'}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {dateStr}
            </p>
          </div>
        </motion.div>

        {/* ── Stats + Upload CTA ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {/* Stat: Total docs */}
          <StatWidget
            icon={Files}
            label="Tổng tài liệu"
            value={statsLoading ? '...' : String(stats?.totalDocuments ?? 0)}
            subtext="Tổng số tài liệu bạn đã tải lên hệ thống"
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
          />

          {/* Custom Storage Widget */}
          <StorageWidget
            stats={stats}
            statsLoading={statsLoading}
            onUpgradeClick={() => setUpgradeOpen(true)}
          />

          {/* Upload CTA Card */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-5 shadow-lg cursor-pointer group"
            onClick={() => setUploadOpen(true)}
            id="upload-cta-card"
          >
            {/* Glow blobs */}
            <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-indigo-50/20 blur-2xl group-hover:bg-indigo-400/30 transition-colors" />
            <div className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-purple-50/20 blur-2xl" />

            <div className="relative flex flex-col h-full gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm group-hover:bg-white/15 transition-colors">
                <FileUp className="h-5 w-5" />
              </div>

              <div>
                <p className="text-base font-extrabold text-white">Upload mới</p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Thêm tài liệu học tập để AI phân tích ngay
                </p>
              </div>

              <Button
                size="sm"
                className="mt-auto rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs w-full shadow-sm pointer-events-none"
              >
                Upload tài liệu mới
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Recent Documents Grid ──────────────────────────── */}
        <section>
          {/* Section Header */}
          <div className="flex items-end justify-between mb-5 gap-4">
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                 Kho lưu trữ
              </div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900 mt-0.5">
                Tài liệu tương tác gần đây
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tự động đồng bộ và lập chỉ mục nội dung bởi AI.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="rounded-xl shrink-0 font-medium text-slate-700 shadow-sm border-slate-200 text-xs hover:bg-slate-50 transition-colors"
              onClick={() => navigate('/dashboard/documents')}
            >
              Xem tất cả
            </Button>
          </div>

          {/* Loading state */}
          {recentLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, idx) => (
                <RecentDocSkeleton key={idx} />
              ))}
            </div>
          )}

          {/* Error state */}
          {!recentLoading && recentError && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 bg-rose-50/20 rounded-2xl border border-rose-100/50 p-6 max-w-xl mx-auto">
              <AlertCircle className="h-8 w-8 text-rose-500" />
              <p className="text-xs text-rose-600 font-semibold text-center">{recentError}</p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={fetchRecentDocs}
              >
                Thử lại
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!recentLoading && !recentError && recentDocs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/60 rounded-2xl border border-slate-100 p-8 max-w-xl mx-auto">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3 shadow-sm">
                <FileUp className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 mb-1">Chưa có tài liệu tương tác nào</h3>
              <p className="text-xs text-slate-400 max-w-xs mb-4">Tải lên tài liệu học tập đầu tiên của bạn để AI tiến hành phân tích và tóm tắt tự động.</p>
              <Button
                size="sm"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
                onClick={() => setUploadOpen(true)}
              >
                Tải lên ngay
              </Button>
            </div>
          )}

          {/* Cards Grid */}
          {!recentLoading && !recentError && recentDocs.length > 0 && (
            <motion.div
              variants={staggerContainer(0.1)}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              {recentDocs.map((doc) => (
                <RecentDocCard key={doc.id} doc={doc} onDownload={handleDownloadDocument} />
              ))}
            </motion.div>
          )}
        </section>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadSuccess={() => {
          fetchRecentDocs()
          fetchStats()
        }}
      />
      
      {/* Storage Upgrade Modal */}
      <StorageUpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  )
}

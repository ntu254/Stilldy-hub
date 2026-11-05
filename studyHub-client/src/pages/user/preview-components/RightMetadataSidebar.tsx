import { motion } from 'motion/react'
import {
  Calendar,
  Clock,
  Download,
  Eye,
  FileText,
  Flag,
  Layers,
  Star,
  ThumbsDown,
  ThumbsUp,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentItem } from '@/types/document'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/animate-ui/components/animate/tooltip'

interface RightMetadataSidebarProps {
  doc: DocumentItem
  uploaderName: string
  viewCount: number
  downloadCount: number
  liked: boolean
  disliked: boolean
  starred: boolean
  likes: number
  dislikes: number
  handleLike: () => Promise<void>
  handleDislike: () => Promise<void>
  handleSave: () => Promise<void>
  onReportClick: () => void
  onShowMoreDescription: () => void
  isOwner?: boolean
}

const getSubjectColor = (tags: string[]) => {
  if (tags.includes('Database') || tags.includes('SQL')) return 'text-indigo-600 bg-indigo-50 border-indigo-100'
  if (tags.includes('ML') || tags.includes('Regression')) return 'text-amber-600 bg-amber-50 border-amber-100'
  if (tags.includes('Philosophy')) return 'text-emerald-600 bg-emerald-50 border-emerald-100'
  return 'text-rose-600 bg-rose-50 border-rose-100'
}

export default function RightMetadataSidebar({
  doc,
  uploaderName,
  viewCount,
  downloadCount,
  liked,
  disliked,
  starred,
  likes,
  dislikes,
  handleLike,
  handleDislike,
  handleSave,
  onReportClick,
  onShowMoreDescription,
  isOwner = false,
}: RightMetadataSidebarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="hidden lg:flex lg:col-span-3 flex-col gap-6 overflow-y-auto bg-white p-6 h-full shrink-0 border-l border-slate-100"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
    >
      {/* Main Info Card */}
      <div className="bg-white pb-6 border-b border-slate-100 shrink-0">
        <h2 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1.5">Thông tin tài liệu</h2>
        <h1 className="text-base font-extrabold text-slate-900 mb-4 leading-snug">
          {doc.title}
        </h1>

        <div className="flex flex-wrap gap-1 mb-6">
          {doc.aiTags.map((tag, i) => (
            <span
              key={i}
              className={cn(
                'rounded-lg border px-2 py-0.5 text-[9px] font-bold',
                i === 0 ? getSubjectColor(doc.aiTags) : 'text-slate-500 bg-slate-50 border-slate-200/40'
              )}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Document Metadata Grid */}
        <div className="space-y-4 pt-4 border-t border-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Thời gian tải lên</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">{doc.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Người tải lên</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                {uploaderName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kích thước tệp</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">{doc.size}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nguồn lưu trữ</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5 uppercase">Firebase</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Số lượt xem</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">{viewCount} lượt</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Số lượt tải</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">{downloadCount} lượt</p>
            </div>
          </div>
        </div>

        {/* Interactive Action Bar */}
        <div className="flex items-center justify-between gap-1.5 border-t border-slate-100 pt-4 mt-6">
          {/* Like Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLike}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer",
                  liked
                    ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm"
                    : "bg-white border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>{likes}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Thích tài liệu này</TooltipContent>
          </Tooltip>

          {/* Dislike Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleDislike}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer",
                  disliked
                    ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm"
                    : "bg-white border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                <span>{dislikes}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Không thích tài liệu này</TooltipContent>
          </Tooltip>

          {/* Save/Star Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSave}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer",
                  starred
                    ? "bg-amber-50 border-amber-200 text-amber-600 shadow-sm"
                    : "bg-white border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                <Star className={cn("h-3.5 w-3.5", starred && "fill-amber-400")} />
                <span>{starred ? 'Đã lưu' : 'Lưu'}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Đánh dấu tài liệu</TooltipContent>
          </Tooltip>

          {/* Report Button */}
          {!isOwner && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onReportClick}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/60 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all cursor-pointer shrink-0"
                >
                  <Flag className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Báo cáo vi phạm</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Document Description */}
      <div className="shrink-0 space-y-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 p-4 transition-all hover:bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <FileText className="h-3.5 w-3.5 text-indigo-600" />
            <span>Mô tả</span>
          </div>
          {doc.summary && doc.summary.length > 50 && (
            <button
              onClick={onShowMoreDescription}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer transition-colors"
            >
              Xem thêm
            </button>
          )}
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-normal line-clamp-3">
          {doc.summary || 'Không có mô tả cho tài liệu này.'}
        </p>
      </div>
    </motion.div>
  )
}

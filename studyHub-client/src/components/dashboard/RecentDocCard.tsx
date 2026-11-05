import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  FileText,
  FileSpreadsheet,
  Film,
  Database,
  Mail,
  MessageSquare,
  Sparkles,
  Download,
  Image,
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { slideInUp } from '@/utils/motion'
import { cn } from '@/lib/utils'

export interface DocumentItem {
  id: string
  title: string
  type: 'pdf' | 'doc' | 'ppt' | 'xls' | 'img'
  originalFileName?: string
  size: string
  source: 'drive' | 'email' | 'chat' | 'local'
  date: string
  aiTags: string[]
  summary: string
}

interface RecentDocCardProps {
  doc: DocumentItem
  onDownload?: (doc: DocumentItem) => void
}

const getSourceIcon = (source: DocumentItem['source']) => {
  switch (source) {
    case 'drive':
      return <Database className="h-3 w-3 text-blue-500" />
    case 'email':
      return <Mail className="h-3 w-3 text-red-400" />
    case 'chat':
      return <MessageSquare className="h-3 w-3 text-purple-500" />
    default:
      return <FileText className="h-3 w-3 text-slate-500" />
  }
}

const getSourceLabel = (source: DocumentItem['source']) => {
  switch (source) {
    case 'drive': return 'Drive'
    case 'email': return 'Email'
    case 'chat': return 'Chat'
    default: return 'Thiết bị'
  }
}

const getFileIconInfo = (type: DocumentItem['type']) => {
  switch (type) {
    case 'pdf':
      return {
        icon: <FileText className="h-5 w-5 text-red-500" />,
        bgColor: 'bg-red-50',
      }
    case 'ppt':
      return {
        icon: <Film className="h-5 w-5 text-orange-500" />,
        bgColor: 'bg-orange-50',
      }
    case 'xls':
      return {
        icon: <FileSpreadsheet className="h-5 w-5 text-emerald-500" />,
        bgColor: 'bg-emerald-50',
      }
    case 'img':
      return {
        icon: <Image className="h-5 w-5 text-purple-500" />,
        bgColor: 'bg-purple-50',
      }
    default:
      return {
        icon: <FileText className="h-5 w-5 text-blue-500" />,
        bgColor: 'bg-blue-50',
      }
  }
}

export default function RecentDocCard({ doc, onDownload }: RecentDocCardProps) {
  const { icon, bgColor } = getFileIconInfo(doc.type)
  const navigate = useNavigate()

  return (
    <motion.div variants={slideInUp} className="group h-full">
      <Card className="h-full flex flex-col justify-between border-slate-100 hover:border-indigo-100 bg-white hover:shadow-xl hover:shadow-slate-100/60 hover:-translate-y-1.5 transition-all duration-300 rounded-2xl overflow-hidden">
        <div>
          {/* Card Header */}
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', bgColor)}>
              {icon}
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-100">
              {getSourceIcon(doc.source)}
              <span>{getSourceLabel(doc.source)}</span>
            </div>
          </CardHeader>

          {/* Card Content */}
          <CardContent className="px-4 py-2 flex-grow">
            <span className="text-[10px] font-medium text-slate-400">{doc.date}</span>

            <CardTitle className="text-sm font-bold text-slate-800 mt-1 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
              {doc.title}
            </CardTitle>

            <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
              Dung lượng: {doc.size}
            </span>

            {/* AI Summary */}
            <div className="mt-3.5 rounded-xl bg-slate-50 p-2.5 border border-slate-100/50 group-hover:bg-indigo-50/20 group-hover:border-indigo-100/30 transition-colors">
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 mb-1">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Mô tả
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">
                {doc.summary}
              </p>
            </div>
          </CardContent>
        </div>

        {/* Card Footer */}
        <CardFooter className="p-4 pt-2 flex flex-col gap-3.5 border-t border-slate-50/50">
          {/* Tags */}
          <div className="flex flex-wrap gap-1 w-full">
            {doc.aiTags.map((tag, idx) => (
              <span
                key={idx}
                className="rounded-lg bg-slate-100/70 border border-slate-200/20 px-2 py-0.5 text-[9px] font-bold text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 w-full">
            <Button
              onClick={() => navigate(`/preview/${doc.id}`, { state: { doc } })}
              size="sm"
              variant="ghost"
              className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 w-full gap-1 rounded-xl"
            >
              Xem chi tiết
            </Button>
            <button
              onClick={() => onDownload?.(doc)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-indigo-600 hover:text-white transition-all shrink-0"
              aria-label="Download document"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

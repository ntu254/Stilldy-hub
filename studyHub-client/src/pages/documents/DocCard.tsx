import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Sparkles, Eye, Download, Lock, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { slideInUp } from '@/utils/motion'
import type { DocumentItem } from './types'
import { getFileIcon, getFileBg, getSourceIcon, getSourceLabel } from './helpers'
import StarButton from './StarButton'
import DocContextMenu from './DocContextMenu'

interface DocCardProps {
  doc: DocumentItem
  onToggleStar: (id: string) => void
  onToggleVisibility?: (id: string) => void
  onShare?: (doc: DocumentItem) => void
  onDelete?: (id: string) => void
  onEdit?: (doc: DocumentItem) => void
  onDownload?: (doc: DocumentItem) => void
  showContextMenu?: boolean
}

export default function DocCard({
  doc,
  onToggleStar,
  onToggleVisibility,
  onShare,
  onDelete,
  onEdit,
  onDownload,
  showContextMenu = true,
}: DocCardProps) {
  const navigate = useNavigate()

  return (
    <motion.div variants={slideInUp} className="group h-full flex flex-col">
      <div className="h-full flex-1 flex flex-col bg-white rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-slate-100/60 hover:-translate-y-1 transition-all duration-300 overflow-hidden">

        {/* Card Header */}
        <div className="p-4 pb-3 flex items-start justify-between gap-2 shrink-0">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', getFileBg(doc.type))}>
            {getFileIcon(doc.type)}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <StarButton starred={doc.starred} onClick={() => onToggleStar(doc.id)} />
            {showContextMenu ? (
              <DocContextMenu
                docId={doc.id}
                isPrivate={doc.isPrivate}
                onToggleVisibility={() => onToggleVisibility?.(doc.id)}
                onShare={() => onShare?.(doc)}
                onDelete={() => onDelete?.(doc.id)}
                onEdit={() => onEdit?.(doc)}
                onDownload={() => onDownload?.(doc)}
              />
            ) : (
              <button
                onClick={() => onDownload?.(doc)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-all cursor-pointer"
                aria-label="Tải xuống"
                title="Tải xuống"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="px-4 pb-3 flex-1 flex flex-col">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-medium">{doc.date}</span>
            <span className="text-slate-200">·</span>
            <div className="flex items-center gap-1">
              {getSourceIcon(doc.source)}
              <span className="text-[10px] text-slate-400">{getSourceLabel(doc.source)}</span>
            </div>
            <span className="text-slate-200">·</span>
            <span className={cn(
              "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold shadow-sm",
              doc.isPrivate
                ? "bg-amber-50 text-amber-700 border border-amber-100"
                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
            )}>
              {doc.isPrivate ? (
                <>
                  <Lock className="h-2.5 w-2.5 shrink-0" /> Riêng tư
                </>
              ) : (
                <>
                  <Globe className="h-2.5 w-2.5 shrink-0" /> Công khai
                </>
              )}
            </span>
          </div>

          <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug h-10 group-hover:text-indigo-600 transition-colors mb-1">
            {doc.title}
          </h3>
          <span className="text-[10px] font-medium text-slate-400 mb-3">{doc.size}</span>

          {/* AI Summary */}
          <div className="mt-auto rounded-xl bg-slate-50 p-2.5 border border-slate-100/50 group-hover:bg-indigo-50/30 group-hover:border-indigo-100/30 transition-colors">
            <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 mb-1">
              <Sparkles className="h-3 w-3 animate-pulse" /> Mô tả
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{doc.summary}</p>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-50/80 mt-3 pt-3 shrink-0">
          <div className="flex flex-wrap gap-1">
            {doc.aiTags.map((tag, i) => (
              <span key={i} className="rounded-lg bg-slate-100/70 border border-slate-200/30 px-2 py-0.5 text-[9px] font-bold text-slate-600">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => navigate(`/preview/${doc.id}`, { state: { doc } })}
              size="sm" 
              variant="ghost" 
              className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/60 flex-1 rounded-xl gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" /> Xem
            </Button>
            <button
              onClick={() => onDownload?.(doc)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-indigo-600 hover:text-white transition-all shrink-0"
              aria-label="Download document"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

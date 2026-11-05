import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Download, Lock, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentItem } from './types'
import { getFileIcon, getFileBg, getSourceIcon, getSourceLabel } from './helpers'
import StarButton from './StarButton'
import DocContextMenu from './DocContextMenu'

const listRowVariant = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const },
  },
}

interface DocRowProps {
  doc: DocumentItem
  onToggleStar: (id: string) => void
  onToggleVisibility?: (id: string) => void
  onShare?: (doc: DocumentItem) => void
  onDelete?: (id: string) => void
  onEdit?: (doc: DocumentItem) => void
  onDownload?: (doc: DocumentItem) => void
  showContextMenu?: boolean
}

export default function DocRow({
  doc,
  onToggleStar,
  onToggleVisibility,
  onShare,
  onDelete,
  onEdit,
  onDownload,
  showContextMenu = true,
}: DocRowProps) {
  const navigate = useNavigate()

  return (
    <motion.div
      variants={listRowVariant}
      className="group flex items-center gap-4 bg-white rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-lg hover:shadow-slate-100/40 px-5 py-3.5 transition-[border-color,box-shadow] duration-200"
    >
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', getFileBg(doc.type))}>
        {getFileIcon(doc.type, 'h-4 w-4')}
      </div>

      <div className="flex-1 min-w-0">
        <p 
          onClick={() => navigate(`/preview/${doc.id}`, { state: { doc } })}
          className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 truncate transition-colors cursor-pointer"
        >
          {doc.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <div className="flex items-center gap-1">
            {getSourceIcon(doc.source)}
            <span className="text-[10px] text-slate-400">{getSourceLabel(doc.source)}</span>
          </div>
          <span className="text-slate-200">·</span>
          <span className="text-[10px] text-slate-400">{doc.size}</span>
          <span className="text-slate-200">·</span>
          <span className="text-[10px] text-slate-400">{doc.date}</span>
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
      </div>

      <div className="hidden md:flex flex-wrap gap-1 max-w-[140px] justify-end shrink-0">
        {doc.aiTags.slice(0, 2).map((tag, i) => (
          <span key={i} className="rounded-lg bg-slate-100/70 border border-slate-200/30 px-2 py-0.5 text-[9px] font-bold text-slate-600">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <StarButton starred={doc.starred} onClick={() => onToggleStar(doc.id)} />
        {showContextMenu ? (
          <>
            <button
              onClick={() => onDownload?.(doc)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
              aria-label="Download"
              title="Tải xuống"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <DocContextMenu
              docId={doc.id}
              variant="row"
              isPrivate={doc.isPrivate}
              onToggleVisibility={() => onToggleVisibility?.(doc.id)}
              onShare={() => onShare?.(doc)}
              onDelete={() => onDelete?.(doc.id)}
              onEdit={() => onEdit?.(doc)}
              onDownload={() => onDownload?.(doc)}
            />
          </>
        ) : (
          <button
            onClick={() => onDownload?.(doc)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
            aria-label="Tải xuống"
            title="Tải xuống"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

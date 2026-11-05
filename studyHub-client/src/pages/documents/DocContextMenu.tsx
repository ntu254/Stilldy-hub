import { useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Download, Share2, Trash2, Lock, Globe, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocContextMenuProps {
  docId: string
  variant?: 'card' | 'row'
  isPrivate?: boolean
  onToggleVisibility?: () => void
  onShare?: () => void
  onDelete?: () => void
  onEdit?: () => void
  onDownload?: () => void
}

export default function DocContextMenu({
  docId,
  variant = 'card',
  isPrivate,
  onToggleVisibility,
  onShare,
  onDelete,
  onEdit,
  onDownload,
}: DocContextMenuProps) {
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center justify-center rounded-lg transition-all cursor-pointer outline-none select-none',
            variant === 'card'
              ? 'h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              : 'h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          )}
          aria-label="More options"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-48"
      >
        <DropdownMenuItem
          id={`view-${docId}`}
          onClick={() => navigate(`/preview/${docId}`)}
          className="text-slate-700 gap-2.5"
        >
          <Eye className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>Xem chi tiết</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          id={`edit-${docId}`}
          onClick={onEdit}
          className="text-slate-700 gap-2.5"
        >
          <Edit2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>Chỉnh sửa</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          id={`download-${docId}`}
          onClick={onDownload}
          className="text-slate-700 gap-2.5"
        >
          <Download className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>Tải xuống</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          id={`visibility-${docId}`}
          onClick={onToggleVisibility}
          className="text-slate-700 gap-2.5"
        >
          {isPrivate ? (
            <>
              <Globe className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Chuyển Công khai</span>
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Chuyển Riêng tư</span>
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem
          id={`share-${docId}`}
          onClick={onShare}
          className="text-slate-700 gap-2.5"
        >
          <Share2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>Tạo link chia sẻ</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          id={`delete-${docId}`}
          onClick={onDelete}
          className="text-rose-600 focus:bg-rose-50 focus:text-rose-700 gap-2.5"
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          <span>Xóa tài liệu</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

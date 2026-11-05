import React from 'react'
import {
  MessageSquare,
  Pin,
  MoreHorizontal,
  Edit2,
  Archive,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/animate-ui/primitives/radix/dropdown-menu'
import type { Conversation } from '../types'

interface ConversationItemProps {
  conv: Conversation
  isActive: boolean
  editingConvId: string | null
  editTitleVal: string
  showArchived: boolean
  isMobile?: boolean
  onSwitch: (id: string) => void
  onSaveRename: (id: string) => void
  onTogglePin: (id: string, currentPinStatus: boolean, e: React.MouseEvent) => void
  onArchive: (id: string, e: React.MouseEvent) => void
  onDeleteClick: (id: string) => void
  setEditingConvId: (id: string | null) => void
  setEditTitleVal: (val: string) => void
  onMobileClose?: () => void
}

export default function ConversationItem({
  conv,
  isActive,
  editingConvId,
  editTitleVal,
  showArchived,
  isMobile = false,
  onSwitch,
  onSaveRename,
  onTogglePin,
  onArchive,
  onDeleteClick,
  setEditingConvId,
  setEditTitleVal,
  onMobileClose,
}: ConversationItemProps) {
  return (
    <div
      onClick={() => {
        onSwitch(conv.id)
        if (isMobile && onMobileClose) {
          onMobileClose()
        }
      }}
      className={cn(
        "group flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition-all border",
        isActive
          ? "bg-slate-50 border-slate-200/40 text-slate-900"
          : "border-transparent hover:bg-slate-50/50 text-slate-600 hover:text-slate-900"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <MessageSquare className={cn("h-4 w-4 shrink-0", isActive ? "text-indigo-600" : "text-slate-400")} />
        <div className="min-w-0 flex-1 mr-1">
          {editingConvId === conv.id ? (
            <input
              type="text"
              value={editTitleVal}
              onChange={(e) => setEditTitleVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveRename(conv.id)
                else if (e.key === 'Escape') setEditingConvId(null)
              }}
              onBlur={() => onSaveRename(conv.id)}
              autoFocus
              className="w-full text-xs px-1.5 py-0.5 rounded border border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 font-semibold bg-white text-slate-800"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <p className={cn("text-xs truncate", isActive ? "font-bold" : "font-medium")}>
                {conv.title}
              </p>
              <p className="text-[9px] text-slate-400 truncate mt-0.5">{conv.lastMessage}</p>
            </>
          )}
        </div>
      </div>

      {editingConvId !== conv.id && (
        <div className={cn(
          "flex items-center gap-0.5 transition-all shrink-0",
          conv.isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <button
            onClick={(e) => onTogglePin(conv.id, conv.isPinned, e)}
            className={cn(
              "p-1 rounded-md transition-all",
              conv.isPinned
                ? "text-indigo-600 hover:bg-indigo-50"
                : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
            )}
            title={conv.isPinned ? "Bỏ ghim" : "Ghim hội thoại"}
          >
            <Pin className={cn("h-3 w-3", conv.isPinned && "fill-indigo-600")} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-all shrink-0"
                title="Thêm thao tác"
              >
                <MoreHorizontal className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-50 min-w-[8rem] overflow-hidden rounded-xl border border-slate-100 bg-white p-1 shadow-xl outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onSelect={() => {
                  setEditingConvId(conv.id)
                  setEditTitleVal(conv.title)
                }}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 outline-none hover:bg-slate-50 hover:text-slate-900 transition-colors focus:bg-slate-50 focus:text-slate-900"
              >
                <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Đổi tên</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => onArchive(conv.id, e as any)}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 outline-none hover:bg-slate-50 hover:text-slate-900 transition-colors focus:bg-slate-50 focus:text-slate-900"
              >
                <Archive className="h-3.5 w-3.5 text-slate-400" />
                <span>{showArchived ? 'Hủy lưu trữ' : 'Lưu trữ'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDeleteClick(conv.id)}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 outline-none hover:bg-rose-50 hover:text-rose-700 transition-colors focus:bg-rose-50 focus:text-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                <span>Xóa đoạn chat</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}

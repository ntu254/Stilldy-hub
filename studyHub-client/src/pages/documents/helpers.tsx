import { cn } from '@/lib/utils'
import { FileText, Film, FileSpreadsheet, Database, Mail, MessageSquare, Inbox, Image } from 'lucide-react'
import type { DocumentItem, DocType, SourceType, SortType } from './types'

export const getFileIcon = (type: DocumentItem['type'], cls = 'h-5 w-5') => {
  switch (type) {
    case 'pdf': return <FileText className={cn(cls, 'text-red-500')} />
    case 'ppt': return <Film className={cn(cls, 'text-orange-500')} />
    case 'xls': return <FileSpreadsheet className={cn(cls, 'text-emerald-500')} />
    case 'img': return <Image className={cn(cls, 'text-violet-500')} />
    default:    return <FileText className={cn(cls, 'text-blue-500')} />
  }
}

export const getFileBg = (type: DocumentItem['type']) => {
  switch (type) {
    case 'pdf': return 'bg-red-50'
    case 'ppt': return 'bg-orange-50'
    case 'xls': return 'bg-emerald-50'
    case 'img': return 'bg-violet-50'
    default:    return 'bg-blue-50'
  }
}

export const getSourceIcon = (source: DocumentItem['source']) => {
  switch (source) {
    case 'drive': return <Database className="h-3 w-3 text-blue-500" />
    case 'email': return <Mail className="h-3 w-3 text-red-400" />
    case 'chat':  return <MessageSquare className="h-3 w-3 text-purple-500" />
    default:      return <Inbox className="h-3 w-3 text-slate-400" />
  }
}

export const getSourceLabel = (source: DocumentItem['source']) => {
  const map = { drive: 'Drive', email: 'Email', chat: 'Chat', local: 'Thiết bị' }
  return map[source]
}

export const TYPE_LABELS: Record<DocType, string> = {
  all: 'Tất cả loại', pdf: 'PDF', doc: 'Word (.docx)', img: 'Hình ảnh',
}

export const SOURCE_LABELS: Record<SourceType, string> = {
  all: 'Tất cả nguồn', drive: 'Google Drive', email: 'Email', chat: 'Chat / Zalo', local: 'Thiết bị cục bộ',
}

export const SORT_LABELS: Record<SortType, string> = {
  newest: 'Mới nhất', oldest: 'Cũ nhất',
  name_asc: 'Tên A → Z', name_desc: 'Tên Z → A',
  size_desc: 'Dung lượng lớn nhất', size_asc: 'Dung lượng nhỏ nhất',
}

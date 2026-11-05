import type { DocumentItem } from '@/components/dashboard/RecentDocCard'
import type { ServerDocument } from '@/types/document'

/** Lấy extension từ fileName */
export function getFileExt(doc: ServerDocument): string {
  const latest = doc.versions[doc.versions.length - 1]
  if (!latest) return ''
  return latest.fileName.split('.').pop()?.toLowerCase() ?? ''
}

/** Map extension → DocType cho UI */
export function extToDocType(ext: string): DocumentItem['type'] {
  if (ext === 'pdf') return 'pdf'
  if (['pptx', 'ppt'].includes(ext)) return 'ppt'
  if (['xlsx', 'xls'].includes(ext)) return 'xls'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'img'
  return 'doc' // default doc icon
}

/** Format bytes → human-readable */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Format relative time */
export function formatRelativeTime(dateStr: string): string {
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

/** Map server doc → DocumentItem */
export function mapToDocumentItem(doc: ServerDocument): DocumentItem {
  const ext = getFileExt(doc)
  const latest = doc.versions[doc.versions.length - 1]
  return {
    id: doc._id,
    title: doc.title,
    type: extToDocType(ext),
    originalFileName: latest?.fileName,
    size: latest ? formatSize(latest.fileSize) : '—',
    source: 'local',
    date: formatRelativeTime(doc.createdAt),
    aiTags: doc.tags,
    summary: doc.description || 'Không có mô tả.',
  }
}

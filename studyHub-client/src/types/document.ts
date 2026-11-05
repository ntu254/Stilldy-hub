export type DocType = 'all' | 'pdf' | 'doc' | 'img'
export type SourceType = 'all' | 'drive' | 'email' | 'chat' | 'local'
export type SortType = 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc'

export interface DocumentItem {
  id: string
  title: string
  type: 'pdf' | 'doc' | 'ppt' | 'xls' | 'img'
  originalFileName?: string
  size: string
  sizeBytes: number
  source: 'drive' | 'email' | 'chat' | 'local'
  date: string
  dateMs: number
  aiTags: string[]
  summary: string
  starred: boolean
  isPrivate?: boolean
  isLikedByUser?: boolean
  isDislikedByUser?: boolean
  isSavedByUser?: boolean
  totalLikes?: number
  totalDislikes?: number
}

export interface ServerDocVersion {
  versionNumber: number
  fileName: string
  fileUrl: string
  fileSize: number
  createdAt: string
}

export interface ServerDocument {
  _id: string
  title: string
  description: string
  subjectId: { _id: string; name: string } | null
  tags: string[]
  uploadedBy: { _id: string; fullName: string; email: string } | null
  isPublic: boolean
  viewCount: number
  downloadCount: number
  versions: ServerDocVersion[]
  createdAt: string
  updatedAt: string
  _destroy: boolean
  isLikedByUser?: boolean
  isDislikedByUser?: boolean
  isSavedByUser?: boolean
  totalLikes?: number
  totalDislikes?: number
}

export interface PaginatedResponse {
  data: ServerDocument[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ToggleLikeResponse {
  totalLikes: number
  totalDislikes: number
  isLikedByUser: boolean
  isDislikedByUser: boolean
}

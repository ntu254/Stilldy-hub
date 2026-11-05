import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function DocPagination({
  currentPage,
  totalPages,
  onPageChange,
}: DocPaginationProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  const visible = totalPages > 5
    ? pages.filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    : pages

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {visible.map((page, i) => {
        const prev = visible[i - 1]
        const gap = prev && page - prev > 1
        return (
          <span key={page} className="flex items-center gap-1.5">
            {gap && (
              <span className="flex h-8 w-8 items-center justify-center text-slate-400">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </span>
            )}
            <button
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition-all shadow-sm',
                page === currentPage
                  ? 'bg-slate-900 text-white border border-slate-900 shadow-md'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              {page}
            </button>
          </span>
        )
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </nav>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

export default function DocRowSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 px-5 py-3.5 shadow-xs animate-pulse">
      {/* Icon */}
      <Skeleton className="h-9 w-9 rounded-xl shrink-0" />

      {/* Main Info */}
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-1/3 min-w-[140px] rounded-md" />
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-3 w-14 rounded-md" />
          <Skeleton className="h-3 w-10 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
      </div>

      {/* Tags */}
      <div className="hidden md:flex items-center gap-1.5 shrink-0">
        <Skeleton className="h-4 w-12 rounded-lg" />
        <Skeleton className="h-4 w-14 rounded-lg" />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
    </div>
  )
}

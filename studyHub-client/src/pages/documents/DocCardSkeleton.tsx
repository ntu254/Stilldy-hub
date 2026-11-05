import { Skeleton } from '@/components/ui/skeleton'

export default function DocCardSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden p-4 space-y-3 shadow-xs animate-pulse">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <div className="flex items-center gap-1.5 ml-auto">
          <Skeleton className="h-7 w-7 rounded-xl" />
          <Skeleton className="h-7 w-7 rounded-xl" />
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 flex flex-col space-y-2.5 pt-1">
        {/* Date / Source / Privacy */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-14 rounded-md" />
          <Skeleton className="h-3 w-12 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>

        {/* Title */}
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>

        {/* File size */}
        <Skeleton className="h-3 w-12 rounded-md" />

        {/* AI Summary Box */}
        <div className="mt-auto rounded-xl bg-slate-50/80 p-2.5 border border-slate-100 space-y-2">
          <div className="flex items-center gap-1">
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
          <Skeleton className="h-3 w-full rounded-md" />
          <Skeleton className="h-3 w-4/5 rounded-md" />
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-12 rounded-lg" />
          <Skeleton className="h-4 w-14 rounded-lg" />
          <Skeleton className="h-4 w-10 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 flex-1 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
        </div>
      </div>
    </div>
  )
}

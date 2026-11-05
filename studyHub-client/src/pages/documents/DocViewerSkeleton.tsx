import { Skeleton } from '@/components/ui/skeleton'

export default function DocViewerSkeleton() {
  return (
    <div className="flex-1 min-h-[500px] w-full h-full bg-slate-100/70 p-6 md:p-10 flex flex-col items-center justify-start overflow-hidden relative">
      {/* Mock Document Page (A4 Paper Style - Straight Sharp Edges) */}
      <div className="w-full max-w-3xl bg-white border border-slate-200/80 p-8 sm:p-12 shadow-md space-y-6 animate-pulse my-auto min-h-[600px] flex flex-col rounded-none">
        {/* Document Header Skeleton */}
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <Skeleton className="h-7 w-3/4 rounded-none" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-24 rounded-none" />
            <Skeleton className="h-4 w-32 rounded-none" />
          </div>
        </div>

        {/* Paragraph Block 1 */}
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-full rounded-none" />
          <Skeleton className="h-4 w-11/12 rounded-none" />
          <Skeleton className="h-4 w-4/5 rounded-none" />
          <Skeleton className="h-4 w-full rounded-none" />
        </div>

        {/* Mock Image Box */}
        <Skeleton className="h-48 w-full rounded-none my-4" />

        {/* Paragraph Block 2 */}
        <div className="space-y-2.5 pt-2">
          <Skeleton className="h-4 w-full rounded-none" />
          <Skeleton className="h-4 w-5/6 rounded-none" />
          <Skeleton className="h-4 w-full rounded-none" />
          <Skeleton className="h-4 w-3/4 rounded-none" />
        </div>

        {/* Page Footer line */}
        <div className="mt-auto pt-8 flex items-center justify-between border-t border-slate-100">
          <Skeleton className="h-3 w-20 rounded-none" />
          <Skeleton className="h-3 w-12 rounded-none" />
        </div>
      </div>
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

export default function ImagePreviewSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col h-screen overflow-hidden">
      {/* ─── Top Header Bar Skeleton ────────────────────────────────────── */}
      <div className="h-14 border-b border-slate-100 bg-white/95 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
          <Skeleton className="h-4 w-32 rounded-md hidden sm:block" />
          <Skeleton className="h-4 w-4 rounded-full hidden sm:block" />
          <Skeleton className="h-5 w-48 rounded-md" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </div>

      {/* ─── 2-Column Body Layout (No Left Thumbnail Sidebar) ─────────────── */}
      <div className="w-full flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch overflow-hidden">
        {/* Center Viewer Area Skeleton (col-span-9) */}
        <div className="lg:col-span-9 flex flex-col bg-[#F8FAFC] overflow-hidden border-r border-slate-100">
          {/* Toolbar Header Skeleton */}
          <div className="hidden lg:flex items-center justify-between border-b border-slate-100 px-5 py-3 bg-white/95 shrink-0 gap-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-6 w-12 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-7 w-12 rounded-lg" />
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-xl ml-2" />
            </div>
          </div>

          {/* Image Canvas Frame Skeleton */}
          <div className="flex-1 bg-slate-100/70 p-6 flex flex-col items-center justify-center relative overflow-hidden select-none">
            <div className="w-full max-w-2xl h-[480px] bg-slate-200/60 rounded-2xl border border-slate-300/50 shadow-sm animate-pulse flex flex-col items-center justify-center gap-3 p-8">
              <Skeleton className="h-16 w-16 rounded-2xl bg-slate-300/80" />
              <Skeleton className="h-4 w-40 rounded-md bg-slate-300/80" />
            </div>
          </div>
        </div>

        {/* Right Metadata Sidebar Skeleton (col-span-3) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col bg-white p-5 space-y-5 overflow-y-auto shrink-0">
          {/* Uploader Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-full rounded-md" />
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-3.5 w-full rounded-md mt-2" />
            <Skeleton className="h-3.5 w-4/5 rounded-md" />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>

          {/* AI Insights Card */}
          <div className="rounded-2xl bg-indigo-50/40 p-4 border border-indigo-100/50 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
            <Skeleton className="h-3.5 w-full rounded-md" />
            <Skeleton className="h-3.5 w-11/12 rounded-md" />
            <Skeleton className="h-3.5 w-4/5 rounded-md" />
          </div>

          {/* Tags */}
          <div className="space-y-2 pt-1">
            <Skeleton className="h-3.5 w-16 rounded-md" />
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-5 w-14 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-lg" />
              <Skeleton className="h-5 w-12 rounded-lg" />
            </div>
          </div>

          {/* Stats */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}

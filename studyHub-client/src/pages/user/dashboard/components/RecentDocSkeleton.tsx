import { Skeleton } from '@/components/ui/skeleton'

export default function RecentDocSkeleton() {
  return (
    <div className="h-[280px] flex flex-col justify-between border border-slate-100 bg-white rounded-2xl p-4 space-y-4 shadow-sm animate-pulse">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-xl" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
    </div>
  )
}

import DocCardSkeleton from './DocCardSkeleton'
import DocRowSkeleton from './DocRowSkeleton'

interface DocGridSkeletonProps {
  viewMode?: 'grid' | 'list'
  count?: number
}

export default function DocGridSkeleton({ viewMode = 'grid', count = 8 }: DocGridSkeletonProps) {
  const items = Array.from({ length: count })

  if (viewMode === 'list') {
    return (
      <div className="flex flex-col gap-2.5 w-full">
        {items.map((_, i) => (
          <DocRowSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
      {items.map((_, i) => (
        <DocCardSkeleton key={i} />
      ))}
    </div>
  )
}

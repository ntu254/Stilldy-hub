import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarButtonProps {
  starred: boolean
  onClick: () => void
}

export default function StarButton({ starred, onClick }: StarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
        starred
          ? 'text-amber-400 bg-amber-50 hover:bg-amber-100'
          : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50',
      )}
      aria-label="Toggle star"
    >
      <Star className={cn('h-3.5 w-3.5', starred && 'fill-amber-400')} />
    </button>
  )
}

import { Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface FilterDropdownProps<T extends string> {
  label: string
  value: T
  options: Record<T, string>
  onSelect: (v: T) => void
  isSort?: boolean
}

export default function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onSelect,
  isSort = false,
}: FilterDropdownProps<T>) {
  const isActive = !isSort ? value !== 'all' : value !== 'newest'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 h-9 cursor-pointer outline-none select-none',
            isActive
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 shadow-sm',
          )}
          id={`filter-${label.replace(/\s/g, '-')}`}
        >
          {isActive && <Check className="h-3 w-3 text-indigo-500 shrink-0" />}
          <span>{isActive ? options[value] : label}</span>
          <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="min-w-[170px]"
      >
        <DropdownMenuLabel>
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {(Object.entries(options) as [T, string][]).map(([key, display]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              'flex items-center gap-2.5 w-full cursor-pointer',
              key === value ? 'text-indigo-600 font-bold bg-slate-50' : 'text-slate-700'
            )}
            id={`opt-${label}-${key}`}
          >
            {key === value ? (
              <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            ) : (
              <span className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{display}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

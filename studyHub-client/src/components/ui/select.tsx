import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectContextType {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

export function useSelect() {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within a Select provider')
  }
  return context
}

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, triggerRef }}>
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  )
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen, triggerRef } = useSelect()

    const handleRef = (node: HTMLButtonElement | null) => {
      // Assign to context ref
      ;(triggerRef as any).current = node
      // Assign to forwarded ref if present
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ;(ref as any).current = node
      }
    }

    return (
      <button
        ref={handleRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all hover:bg-slate-50/80 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100/50 cursor-pointer text-left',
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className={cn('h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0', open && 'rotate-180')} />
      </button>
    )
  }
)
SelectTrigger.displayName = 'SelectTrigger'

export interface SelectValueProps {
  placeholder?: string
  className?: string
  children?: React.ReactNode
}

export function SelectValue({ placeholder, className, children }: SelectValueProps) {
  const { value } = useSelect()
  return (
    <span className={cn('block truncate font-semibold text-slate-700', className)}>
      {value ? (children || value) : placeholder}
    </span>
  )
}

export interface SelectContentProps {
  children?: React.ReactNode
  className?: string
}

export function SelectContent({ children, className }: SelectContentProps) {
  const { open } = useSelect()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={cn(
            'absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl',
            className
          )}
        >
          <div className="space-y-0.5">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  children: React.ReactNode
}

export function SelectItem({ value: itemValue, children, className, ...props }: SelectItemProps) {
  const { value: selectedValue, onValueChange, setOpen } = useSelect()
  const isSelected = selectedValue === itemValue

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => {
        if (onValueChange) onValueChange(itemValue)
        setOpen(false)
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900',
        isSelected && 'bg-slate-50 text-indigo-700 hover:text-indigo-800',
        className
      )}
      {...props}
    >
      {isSelected && (
        <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
        </span>
      )}
      <span className="block truncate">{children}</span>
    </div>
  )
}

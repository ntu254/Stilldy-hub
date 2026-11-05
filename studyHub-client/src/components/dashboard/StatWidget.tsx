import { motion } from 'motion/react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatWidgetProps {
  icon: LucideIcon
  label: string
  value: string
  subtext: string
  iconBg?: string
  iconColor?: string
  trend?: {
    value: string
    positive: boolean
  }
}

export default function StatWidget({
  icon: Icon,
  label,
  value,
  subtext,
  iconBg = 'bg-indigo-50',
  iconColor = 'text-indigo-600',
  trend,
}: StatWidgetProps) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(15,23,42,0.08)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-5 shadow-sm"
    >
      {/* Subtle gradient shimmer on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white via-transparent to-slate-50/40" />

      <div className="flex items-start justify-between gap-3">
        {/* Icon */}
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110 duration-300', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>

        {/* Trend badge */}
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tight',
              trend.positive
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-rose-50 text-rose-600'
            )}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      {/* Value */}
      <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>

      {/* Label */}
      <p className="mt-0.5 text-xs font-semibold text-slate-500 uppercase tracking-widest">
        {label}
      </p>

      {/* Subtext */}
      <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
        {subtext}
      </p>
    </motion.div>
  )
}

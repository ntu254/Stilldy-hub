import { motion } from 'motion/react'
import { HardDrive, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserStats } from '@/types/dashboard'
import { useAppSelector } from '@/redux/store'

interface StorageWidgetProps {
  stats: UserStats | null
  statsLoading: boolean
  onUpgradeClick: () => void
}

export default function StorageWidget({
  stats,
  statsLoading,
  onUpgradeClick,
}: StorageWidgetProps) {
  const currentSubscription = useAppSelector((state) => state.auth.currentSubscription)
  const currentPlanName =
    typeof currentSubscription?.planId === 'object'
      ? currentSubscription.planId.name
      : undefined

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(15,23,42,0.08)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-5 shadow-sm flex flex-col justify-between"
    >
      {/* Subtle gradient shimmer on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white via-transparent to-slate-50/40" />

      <div className="flex items-start justify-between gap-3">
        {/* Icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110 duration-300">
          <HardDrive className="h-5 w-5" />
        </div>

        {/* Badge FREE / PRO */}
        <div className="flex items-center gap-1.5">
          {stats?.isPro ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[9px] font-bold text-amber-600 uppercase tracking-wider">
              {currentPlanName || 'PRO'} ⭐
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              FREE
            </span>
          )}
          
          {/* Dù chưa mua hay ĐÃ MUA gói, vẫn hiện nút Nâng cấp để họ có thể mua gói cao hơn */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onUpgradeClick()
            }}
            className="h-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2 py-0 shadow-xs transition-colors cursor-pointer"
          >
            Nâng cấp ↑
          </button>
        </div>
      </div>

      {/* Value */}
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
          {statsLoading
            ? '...'
            : stats
            ? stats.totalStorageUsed.gigaBytes >= 0.1
              ? `${stats.totalStorageUsed.gigaBytes.toFixed(2)} GB`
              : `${stats.totalStorageUsed.megaBytes.toFixed(1)} MB`
            : '0.0 MB'}
        </span>
        <span className="text-xs text-slate-400 font-bold">
          / {statsLoading ? '...' : stats ? `${stats.storageLimit.gigaBytes} GB` : '2 GB'}
        </span>
      </div>

      {/* Label */}
      <p className="mt-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Dung lượng đã dùng
      </p>

      {/* Progress Bar with Color Logic */}
      {stats && (
        <div className="mt-3 space-y-1">
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, stats.storageUsedPercent)}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 15 }}
              className={cn(
                "h-full rounded-full transition-all duration-500",
                stats.storageUsedPercent < 70
                  ? 'bg-emerald-500'
                  : stats.storageUsedPercent < 90
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              )}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span className={cn(
              stats.storageUsedPercent < 70
                ? 'text-emerald-600'
                : stats.storageUsedPercent < 90
                ? 'text-amber-600'
                : 'text-rose-600 flex items-center gap-0.5'
            )}>
              {stats.storageUsedPercent >= 90 && <AlertCircle className="h-3 w-3 inline shrink-0 text-rose-500" />}
              {stats.storageUsedPercent.toFixed(1)}% đã dùng
            </span>
            <span className="text-slate-400">
              Còn trống: {((stats.storageLimit.bytes - stats.totalStorageUsed.bytes) / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

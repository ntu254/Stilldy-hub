import type { SubscriptionPlan } from '@/types/subscription'
import { Check, Info } from 'lucide-react'

interface PlanCardProps {
  plan: SubscriptionPlan
  currentPlanId?: string | null
  currentStorageLimit?: number
  onUpgrade: (plan: SubscriptionPlan) => void
  isProcessing?: boolean
}

export default function PlanCard({
  plan,
  currentPlanId,
  currentStorageLimit = 0,
  onUpgrade,
  isProcessing = false,
}: PlanCardProps) {
  // Determine the relationship between this plan and the current plan
  const isCurrentPlan = currentPlanId === plan._id
  const isDowngrade = !isCurrentPlan && currentStorageLimit > plan.storageLimit

  // Bytes to GB format
  const storageGB = (plan.storageLimit / (1024 * 1024 * 1024)).toFixed(0)

  let buttonText = 'Nâng cấp ngay'
  if (isCurrentPlan) buttonText = 'Gia hạn'
  if (isDowngrade) buttonText = 'Hạ cấp'

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        isCurrentPlan ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200'
      }`}
    >
      {isCurrentPlan && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Gói hiện tại
          </span>
        </div>
      )}

      <div className="mb-6 mt-2">
        <h3 className="text-xl font-black text-slate-900 mb-2">{plan.name}</h3>
        <p className="text-sm text-slate-500 line-clamp-2 h-10">
          {plan.description || 'Gói dịch vụ cao cấp dành cho bạn.'}
        </p>
      </div>

      <div className="mb-6 flex items-baseline text-slate-900">
        <span className="text-4xl font-extrabold tracking-tight">
          {plan.price.toLocaleString('vi-VN')}đ
        </span>
        <span className="ml-1 text-sm font-semibold text-slate-500">/{plan.durationDays} ngày</span>
      </div>

      <ul className="mb-8 flex-1 space-y-4">
        <li className="flex items-start">
          <Check className="h-5 w-5 text-indigo-600 shrink-0 mr-3" />
          <span className="text-sm text-slate-700">Dung lượng lưu trữ <strong>{storageGB} GB</strong></span>
        </li>
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-indigo-600 shrink-0 mr-3" />
            <span className="text-sm text-slate-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onUpgrade(plan)}
        disabled={isDowngrade || isProcessing}
        className={`mt-auto block w-full rounded-xl py-3 px-4 text-center text-sm font-bold shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          isCurrentPlan
            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            : isDowngrade
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-md'
        }`}
      >
        {isProcessing ? 'Đang xử lý...' : buttonText}
      </button>

      {isDowngrade && (
        <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-600">
          <Info className="h-4 w-4 shrink-0" />
          <span>Không thể hạ cấp khi gói hiện tại còn thời hạn.</span>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Cloud, ShieldCheck, Check, Sparkles, AlertCircle, Mail, MessageSquare, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { paymentService } from '@/services/paymentService'
import type { SubscriptionPlan } from '@/types/subscription'
import { useAppSelector } from '@/redux/store'
import { toast } from 'sonner'

interface StorageUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function StorageUpgradeModal({ isOpen, onClose }: StorageUpgradeModalProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const currentSubscription = useAppSelector((state) => state.auth.currentSubscription)
  const [loading, setLoading] = useState(false)
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      paymentService.getPlans()
        .then((plansData) => {
          setPlans(plansData.filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder))
        })
        .catch(() => toast.error('Lỗi khi tải dữ liệu gói dịch vụ'))
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  const formatBytesToGB = (bytes: number) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(0) + ' GB'
  }

  const currentPlan = currentSubscription?.planId as SubscriptionPlan | undefined
  const currentPlanId = currentPlan?._id
  const currentStorageLimit = currentPlan?.storageLimit || 0

  const handleUpgrade = async (planId: string) => {
    setProcessingPlanId(planId)
    try {
      const res = await paymentService.purchasePlan({ planId })
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tạo giao dịch.')
      setProcessingPlanId(null)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 cursor-pointer"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`relative bg-white/90 border border-slate-200/50 shadow-2xl rounded-3xl w-full ${plans.length > 2 ? 'max-w-4xl' : 'max-w-2xl'} overflow-hidden z-10 p-6 sm:p-8`}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {/* Header: Icon + Gradient Title */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100/50 text-indigo-600 mb-4 shadow-sm">
                <Cloud className="h-7 w-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-600 bg-clip-text text-transparent">
                Nâng cấp Dung lượng Lưu trữ
              </h2>
              <p className="text-xs text-slate-400 font-semibold mt-1 max-w-sm">
                Mở rộng không gian học tập của bạn, kích hoạt tính năng lưu trữ đám mây không giới hạn và các đặc quyền Pro.
              </p>
            </div>

            {/* Plans Comparison Grid */}
            <div className={`grid grid-cols-1 ${plans.length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-6 max-h-[60vh] overflow-y-auto pr-1`}>
              {loading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
                  <p className="text-sm font-medium text-slate-500">Đang tải danh sách gói...</p>
                </div>
              ) : plans.length === 0 ? (
                <div className="col-span-full text-center text-slate-500 py-12">
                  Chưa có gói dịch vụ nào được cung cấp.
                </div>
              ) : (
                plans.map((plan) => {
                  const isPro = plan.price > 0
                  
                  if (isPro) {
                    return (
                      <div key={plan._id} className="rounded-2xl border-2 border-indigo-500 bg-gradient-to-b from-indigo-50/40 via-white to-white p-5 flex flex-col justify-between relative overflow-hidden shadow-md shadow-indigo-500/5">
                        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-xl" />

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[9px] font-bold text-white tracking-wider uppercase">
                              Chuyên Nghiệp ⭐
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600">
                              <Sparkles className="h-3 w-3 animate-pulse" /> Đề xuất
                            </span>
                          </div>
                          
                          <h3 className="text-base font-bold text-indigo-955">{plan.name}</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5 min-h-[32px] line-clamp-2" title={plan.description || ''}>
                            {plan.description || 'Dành cho học tập chuyên sâu & nghiên cứu'}
                          </p>

                          <div className="mt-4 space-y-2.5 text-xs text-slate-700 font-medium">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                              <span>Dung lượng: <strong className="text-indigo-900">{formatBytesToGB(plan.storageLimit)}</strong></span>
                            </div>
                            {plan.features.map((feature, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-2">
                          <div className="text-center text-base font-black text-indigo-700">
                            {plan.price.toLocaleString('vi-VN')}đ <span className="text-[10px] text-slate-500 font-medium">/ {plan.durationDays} ngày</span>
                          </div>
                          {(() => {
                            const isCurrentPlan = currentPlanId === plan._id
                            const isDowngrade = !isCurrentPlan && currentStorageLimit > plan.storageLimit

                            let buttonText = 'Nâng cấp ngay'
                            if (isCurrentPlan) buttonText = 'Gia hạn'
                            if (isDowngrade) buttonText = 'Hạ cấp'
                            
                            return (
                              <Button
                                onClick={() => handleUpgrade(plan._id)}
                                disabled={processingPlanId === plan._id || isDowngrade}
                                className={`w-full rounded-xl py-1.5 h-8 text-[11px] font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all mt-1 ${
                                  isDowngrade 
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                    : isCurrentPlan
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                              >
                                {processingPlanId === plan._id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                                )}
                                {processingPlanId === plan._id ? 'Đang xử lý...' : buttonText}
                              </Button>
                            )
                          })()}
                        </div>
                      </div>
                    )
                  }

                  // Free Plan
                  return (
                    <div key={plan._id} className="rounded-2xl border border-slate-150 bg-slate-50/50 p-5 flex flex-col justify-between relative overflow-hidden">
                      <div>
                        <div className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[9px] font-bold text-slate-600 tracking-wider uppercase mb-3">
                          Bản Miễn Phí
                        </div>
                        <h3 className="text-base font-bold text-slate-800">{plan.name}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 min-h-[32px] line-clamp-2" title={plan.description || ''}>
                          {plan.description || 'Phù hợp cho nhu cầu lưu trữ cơ bản'}
                        </p>

                        <div className="mt-4 space-y-2.5 text-xs text-slate-600 font-medium">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Dung lượng: <strong className="text-slate-800">{formatBytesToGB(plan.storageLimit)}</strong></span>
                          </div>
                          {plan.features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </div>
                          ))}
                          
                          {/* If Free plan has fewer features, we can just omit the 'X' ones to be purely dynamic */}
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="text-center py-2 text-sm font-black text-slate-500">
                          Miễn phí trọn đời
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

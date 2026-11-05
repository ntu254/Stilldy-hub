import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Sparkles, CreditCard, ShieldCheck } from 'lucide-react'
import { paymentService } from '@/services/paymentService'
import type { SubscriptionPlan, Subscription } from '@/types/subscription'
import PlanCard from '@/components/subscription/PlanCard'
import UpgradeConfirmationModal from '@/components/subscription/UpgradeConfirmationModal'
import { toast } from 'sonner'

export default function UpgradePage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [plansData, subData] = await Promise.all([
        paymentService.getPlans(),
        paymentService.getMySubscription(),
      ])
      setPlans(plansData)
      
      if (subData && 'activePlan' in subData === false && (subData as Subscription).status === 'active') {
        setCurrentSubscription(subData as Subscription)
      }
    } catch (error) {
      toast.error('Lỗi khi tải thông tin gói dịch vụ.')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgradeClick = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
  }

  const handleConfirmPurchase = async (planId: string) => {
    setProcessingPlanId(planId)
    try {
      const res = await paymentService.purchasePlan({ planId })
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tạo giao dịch.')
      setProcessingPlanId(null)
      setSelectedPlan(null)
    }
  }

  const currentPlan = currentSubscription?.planId as SubscriptionPlan | undefined
  const currentPlanId = currentPlan?._id
  const currentStorageLimit = currentPlan?.storageLimit || 0

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Nâng cấp tài khoản
          </p>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Mở khóa toàn bộ sức mạnh
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Chọn gói dịch vụ phù hợp để mở rộng dung lượng lưu trữ, sử dụng các tính năng nâng cao và tối ưu hóa quy trình làm việc của bạn.
        </p>
      </motion.div>

      {/* Current Plan Alert */}
      {currentPlan && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6"
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-inner">
            <CreditCard className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left space-y-1">
            <h3 className="text-lg font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-2">
              Gói hiện tại của bạn: 
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-black tracking-wider text-indigo-600 uppercase">
                {currentPlan.name}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Hạn sử dụng: <strong className="text-slate-700">{new Date(currentSubscription!.endDate).toLocaleDateString('vi-VN')}</strong>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Đang kích hoạt</span>
          </div>
        </motion.div>
      )}

      {/* Plans Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center p-12 rounded-2xl border border-dashed border-slate-300 bg-slate-50">
          <p className="text-slate-500">Chưa có gói dịch vụ nào được cấu hình.</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto"
        >
          {plans.map((plan) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              currentPlanId={currentPlanId}
              currentStorageLimit={currentStorageLimit}
              onUpgrade={handleUpgradeClick}
              isProcessing={processingPlanId === plan._id}
            />
          ))}
        </motion.div>
      )}

      <UpgradeConfirmationModal
        isOpen={!!selectedPlan}
        onClose={() => !processingPlanId && setSelectedPlan(null)}
        plan={selectedPlan}
        onConfirm={handleConfirmPurchase}
        isProcessing={!!processingPlanId}
      />
    </div>
  )
}

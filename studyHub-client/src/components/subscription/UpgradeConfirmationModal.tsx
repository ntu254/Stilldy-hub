import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, CheckCircle, Loader2, CreditCard, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { paymentService } from '@/services/paymentService'
import type { SubscriptionPlan, UpgradePreviewResponse } from '@/types/subscription'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
  plan: SubscriptionPlan | null
  onConfirm: (planId: string) => void
  isProcessing: boolean
}

export default function UpgradeConfirmationModal({ isOpen, onClose, plan, onConfirm, isProcessing }: Props) {
  const [previewData, setPreviewData] = useState<UpgradePreviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && plan) {
      fetchPreview()
    } else {
      setPreviewData(null)
    }
  }, [isOpen, plan])

  const fetchPreview = async () => {
    if (!plan) return
    setIsLoading(true)
    try {
      const data = await paymentService.getUpgradePreview(plan._id)
      setPreviewData(data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể lấy thông tin thanh toán.')
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  if (!isOpen || !plan) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isProcessing ? onClose : undefined}
          className="absolute inset-0"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-white border border-slate-100 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden z-10"
        >
          {/* Header */}
          <div className="bg-indigo-50/50 px-6 py-4 flex items-center justify-between border-b border-indigo-100/50">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Xác nhận nâng cấp
            </h3>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <h4 className="text-lg font-black text-slate-900 mb-1">{plan.name}</h4>
              <p className="text-xs text-slate-500">Mở rộng không gian lưu trữ và tính năng cao cấp</p>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Đang tính toán chi phí...</p>
              </div>
            ) : previewData ? (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Giá gốc gói nâng cấp</span>
                    <span className="font-bold text-slate-700">{formatCurrency(previewData.originalPrice)}</span>
                  </div>
                  
                  {previewData.isUpgrade && previewData.remainingValueOffset > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-emerald-600 font-medium">Khấu trừ gói hiện tại</span>
                      <span className="font-bold text-emerald-600">- {formatCurrency(previewData.remainingValueOffset)}</span>
                    </div>
                  )}

                  <div className="pt-3 mt-3 border-t border-slate-200 border-dashed flex justify-between items-center">
                    <span className="text-slate-900 font-black">Tổng chi phí thực trả</span>
                    <span className="text-lg font-black text-indigo-600">
                      {formatCurrency(previewData.finalAmountToPay)}
                    </span>
                  </div>
                </div>

                {previewData.finalAmountToPay === 0 && previewData.isUpgrade && (
                  <div className="flex items-start gap-2 bg-emerald-50 text-emerald-700 p-3 rounded-lg border border-emerald-100">
                    <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium leading-relaxed">
                      Giá trị gói cũ của bạn đủ để chi trả cho lần nâng cấp này. Bạn có thể kích hoạt ngay mà không mất thêm phí.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex gap-2.5 w-full mt-8">
              <Button
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 bg-white hover:bg-slate-50 border border-slate-200/60 text-slate-600 hover:text-slate-800 rounded-xl h-10 text-xs font-bold shadow-2xs"
              >
                Hủy bỏ
              </Button>
              <Button
                onClick={() => onConfirm(plan._id)}
                disabled={isProcessing || isLoading || !previewData}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 text-xs font-bold shadow-sm"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : previewData?.finalAmountToPay === 0 ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Kích hoạt miễn phí
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Thanh toán ngay
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { XCircle, ArrowLeft } from 'lucide-react'
import { motion } from 'motion/react'
import { paymentService } from '@/services/paymentService'

export default function PaymentCancelPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderCode = searchParams.get('orderCode')

  useEffect(() => {
    if (orderCode) {
      paymentService.getPaymentStatus(orderCode).catch(console.error)
    }
  }, [orderCode])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center"
      >
        <div className="flex flex-col items-center py-4">
          <div className="h-24 w-24 rounded-full bg-rose-100 flex items-center justify-center mb-6 text-rose-500 shadow-inner">
            <XCircle className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3">Giao dịch đã bị hủy</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Bạn đã hủy quá trình thanh toán. Không có khoản phí nào được tính. Bạn có thể thử nâng cấp lại bất cứ lúc nào.
          </p>
          <button
            onClick={() => navigate('/dashboard/upgrade')}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md w-full justify-center"
          >
            <ArrowLeft className="h-5 w-5" />
            Quay lại trang nâng cấp
          </button>
        </div>
      </motion.div>
    </div>
  )
}

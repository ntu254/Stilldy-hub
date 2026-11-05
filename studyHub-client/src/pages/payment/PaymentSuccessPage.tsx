import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import confetti from 'canvas-confetti'
import { paymentService } from '@/services/paymentService'
import { useAppDispatch } from '@/redux/store'
import { fetchProfileThunk } from '@/redux/slices/authSlice'
import { motion } from 'motion/react'

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  
  const orderCode = searchParams.get('orderCode')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const hasFiredConfetti = useRef(false)

  useEffect(() => {
    if (!orderCode) {
      setStatus('error')
      setErrorMessage('Không tìm thấy mã đơn hàng hợp lệ.')
      return
    }

    const verifyPayment = async () => {
      try {
        const payment = await paymentService.getPaymentStatus(orderCode)
        
        if (payment.status?.toUpperCase() === 'PAID') {
          setStatus('success')
          
          // Fire confetti only once
          if (!hasFiredConfetti.current) {
            hasFiredConfetti.current = true
            triggerConfetti()
          }

          // Update Redux Profile state to reflect the new subscription
          dispatch(fetchProfileThunk())
          
        } else {
          setStatus('error')
          setErrorMessage('Thanh toán chưa hoàn tất hoặc đã bị lỗi.')
        }
      } catch (error) {
        setStatus('error')
        setErrorMessage('Không thể kiểm tra trạng thái thanh toán.')
      }
    }

    verifyPayment()
  }, [orderCode, dispatch])

  const triggerConfetti = () => {
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }))
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }))
    }, 250)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center"
      >
        {status === 'loading' && (
          <div className="flex flex-col items-center py-8">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 mb-6" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Đang xác thực thanh toán</h2>
            <p className="text-slate-500">Vui lòng đợi trong giây lát...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center py-4">
            <div className="h-24 w-24 rounded-full bg-emerald-100 flex items-center justify-center mb-6 text-emerald-500 shadow-inner">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3">Thanh toán thành công!</h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Cảm ơn bạn đã nâng cấp dịch vụ. Tài khoản và dung lượng lưu trữ của bạn đã được cập nhật.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md hover:shadow-lg w-full justify-center"
            >
              Về trang quản trị
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center py-4">
            <div className="h-24 w-24 rounded-full bg-red-100 flex items-center justify-center mb-6 text-red-500 shadow-inner">
              <AlertCircle className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3">Thanh toán không thành công</h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={() => navigate('/dashboard/upgrade')}
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-xl transition-all w-full justify-center"
            >
              Thử lại
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

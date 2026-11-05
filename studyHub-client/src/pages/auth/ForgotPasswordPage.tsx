import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Mail, ArrowLeft, Send, Loader2, CheckCircle2, KeyRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      toast.error('Vui lòng nhập địa chỉ email của bạn.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await forgotPassword(cleanEmail)
      setIsSubmitted(true)
      setCountdown(60)
      toast.success(res?.message || 'Đã gửi liên kết đặt lại mật khẩu đến email của bạn!')
    } catch (err: any) {
      const errMsg = err.message || 'Không tìm thấy người dùng với email này hoặc có lỗi xảy ra.'
      toast.error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await forgotPassword(email.trim())
      setCountdown(60)
      toast.success(res?.message || 'Đã gửi lại liên kết thành công!')
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi gửi lại email.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="border-border/60 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/95">
        {!isSubmitted ? (
          <>
            <CardHeader className="space-y-3 text-center pb-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
                <KeyRound className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Quên mật khẩu?
                </CardTitle>
                <CardDescription className="text-sm">
                  Đừng lo lắng! Nhập email tài khoản của bạn, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.
                </CardDescription>
              </div>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-sm font-medium">
                    Địa chỉ Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isSubmitting}
                      autoComplete="email"
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-11 gap-2 font-semibold shadow-md transition-all active:scale-[0.99]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      Gửi link đặt lại
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại trang đăng nhập
                </Link>
              </CardFooter>
            </form>
          </>
        ) : (
          /* Success State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <CardHeader className="space-y-3 pb-2 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 shadow-inner">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Kiểm tra hộp thư email
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Chúng tôi đã gửi hướng dẫn và link khôi phục mật khẩu đến{' '}
                  <span className="font-semibold text-foreground">{email}</span>.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="pt-2 text-center text-xs text-muted-foreground">
              Vui lòng kiểm tra kỹ cả thư mục <strong>Spam / Thư rác</strong> nếu bạn không thấy email trong hộp thư đến.
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full h-11 gap-2 font-medium"
                onClick={handleResend}
                disabled={countdown > 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang gửi lại...
                  </>
                ) : countdown > 0 ? (
                  `Gửi lại sau (${countdown}s)`
                ) : (
                  'Gửi lại email'
                )}
              </Button>

              <div className="flex items-center justify-between w-full text-xs text-muted-foreground pt-1">
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="hover:underline hover:text-foreground"
                >
                  Nhập email khác
                </button>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Đăng nhập
                </Link>
              </div>
            </CardFooter>
          </motion.div>
        )}
      </Card>
    </motion.div>
  )
}

import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft, KeyRound, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

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

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error('Mã xác thực không hợp lệ hoặc bị thiếu.')
      return
    }

    if (password.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không trùng khớp.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await resetPassword(token, password)
      setIsSuccess(true)
      toast.success(res?.message || 'Đặt lại mật khẩu thành công!')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2000)
    } catch (err: any) {
      const errMsg = err.message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn.'
      toast.error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Missing or Invalid Token State
  if (!token) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="border-border/60 shadow-xl shadow-rose-500/5 backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-3 text-center pb-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 shadow-inner">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Liên kết không hợp lệ
              </CardTitle>
              <CardDescription className="text-sm">
                Mã xác thực khôi phục mật khẩu bị thiếu hoặc không đúng định dạng. Vui lòng yêu cầu liên kết mới.
              </CardDescription>
            </div>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4 pt-4">
            <Button asChild size="lg" className="w-full h-11 gap-2 font-semibold">
              <Link to="/forgot-password">
                <ArrowLeft className="h-4 w-4" />
                Yêu cầu gửi lại link mới
              </Link>
            </Button>
            <Link
              to="/login"
              className="text-center text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              Quay lại đăng nhập
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    )
  }

  // Success state before navigation
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-border/60 shadow-xl shadow-emerald-500/5 backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-3 text-center pb-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 shadow-inner">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Đặt lại mật khẩu thành công!
              </CardTitle>
              <CardDescription className="text-sm">
                Mật khẩu của bạn đã được cập nhật thành công. Đang chuyển hướng về trang đăng nhập...
              </CardDescription>
            </div>
          </CardHeader>
          <CardFooter className="pt-4">
            <Button asChild size="lg" className="w-full h-11 font-semibold">
              <Link to="/login" replace>
                Đăng nhập ngay
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="border-border/60 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-3 text-center pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
            <KeyRound className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Đặt lại mật khẩu
            </CardTitle>
            <CardDescription className="text-sm">
              Nhập mật khẩu mới của bạn bên dưới (tối thiểu 6 ký tự).
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="reset-password" className="text-sm font-medium">
                Mật khẩu mới
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password" className="text-sm font-medium">
                Xác nhận mật khẩu mới
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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
                  Đang cập nhật...
                </>
              ) : (
                <>
                  Cập nhật mật khẩu
                  <ArrowRight className="h-4 w-4" />
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
      </Card>
    </motion.div>
  )
}

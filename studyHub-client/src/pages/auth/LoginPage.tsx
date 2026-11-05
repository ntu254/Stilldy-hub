import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { differenceInDays } from 'date-fns'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'

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

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const loggedInUser = await login(email, password)
      toast.success('Đăng nhập thành công!')

      if (loggedInUser.bannedDataDeletionAt) {
        const days = differenceInDays(new Date(loggedInUser.bannedDataDeletionAt), new Date())
        toast.error(`Tài khoản của bạn đã bị khóa. Dữ liệu của bạn sẽ bị xóa sau ${Math.max(0, days)} ngày.`, { duration: 10000 })
      } else if (loggedInUser.willDeleteDataAt) {
        const days = differenceInDays(new Date(loggedInUser.willDeleteDataAt), new Date())
        toast.warning(`Bạn còn ${Math.max(0, days)} ngày để gia hạn gói hoặc nâng cấp dung lượng. Nếu không, lượng dung lượng vượt quá gói nâng cấp hiện tại sẽ bị mất.`, { duration: 10000 })
      }

      const defaultPath = loggedInUser.role === 'admin' ? '/admin' : '/dashboard'
      const from = (location.state as any)?.from?.pathname || defaultPath
      navigate(from, { replace: true })
    } catch (err: any) {
      const errMsg = typeof err === 'string'
        ? (err === 'Unauthorized' ? 'Email hoặc mật khẩu không hợp lệ.' : err)
        : (err?.message === 'Unauthorized' ? 'Email hoặc mật khẩu không hợp lệ.' : err?.message || 'Email hoặc mật khẩu không hợp lệ.')
      toast.error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error('Không nhận được ID Token từ Google.')
      return
    }
    setIsSubmitting(true)
    try {
      const loggedInUser = await loginWithGoogle(credentialResponse.credential)
      toast.success('Đăng nhập bằng Google thành công!')
      const defaultPath = loggedInUser.role === 'admin' ? '/admin' : '/dashboard'
      const from = (location.state as any)?.from?.pathname || defaultPath
      navigate(from, { replace: true })
    } catch (err: any) {
      const errMsg = typeof err === 'string'
        ? (err === 'Unauthorized' ? 'Đăng nhập Google thất bại.' : err)
        : (err?.message === 'Unauthorized' ? 'Đăng nhập Google thất bại.' : err?.message || 'Đăng nhập Google thất bại.')
      toast.error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleError = () => {
    toast.error('Đăng nhập bằng Google thất bại hoặc đã bị hủy.')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="border-border/60 shadow-lg shadow-black/[0.04]">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-center text-2xl font-bold tracking-tight">
            Đăng nhập
          </CardTitle>
          <CardDescription className="text-center">
            Chào mừng bạn quay trở lại! Vui lòng đăng nhập để tiếp tục.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4">

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Mật khẩu</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary/70 transition-colors hover:text-primary"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button type="submit" size="lg" className="w-full gap-2" disabled={isSubmitting}>
              {isSubmitting ? 'Đang xác thực...' : 'Đăng nhập'}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </Button>

            {/* Divider */}
            <div className="relative w-full flex items-center justify-center my-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-medium">Hoặc</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <div className="w-full flex justify-center items-center min-h-[44px] [&>div]:flex [&>div]:justify-center [&>div]:items-center [&>div]:w-full [&_iframe]:!mx-auto">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                theme="outline"
                shape="rectangular"
                size="large"
                text="signin_with"
                width="380"
              />
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Chưa có tài khoản?{' '}
              <Link
                to="/register"
                className="font-semibold text-primary underline-offset-4 transition-colors hover:underline"
              >
                Đăng ký ngay
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  )
}


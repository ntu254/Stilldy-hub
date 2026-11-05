import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Mail, Lock, Eye, EyeOff, User, ArrowRight } from 'lucide-react'
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

export default function RegisterPage() {
  const { register, loginWithGoogle, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const dest = user.role === 'admin' ? '/admin' : '/dashboard'
      navigate(dest, { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      const errMsg = 'Mật khẩu xác nhận không khớp.'
      toast.error(errMsg)
      return
    }

    setIsSubmitting(true)
    try {
      await register(fullName, email, password)
      toast.success('Đăng ký tài khoản thành công!')
      navigate('/login', { replace: true })
    } catch (err: any) {
      const errMsg = typeof err === 'string'
        ? (err === 'Unauthorized' ? 'Có lỗi xảy ra khi tạo tài khoản.' : err)
        : (err?.message === 'Unauthorized' ? 'Có lỗi xảy ra khi tạo tài khoản.' : err?.message || 'Có lỗi xảy ra khi tạo tài khoản.')
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
      toast.success('Đăng ký / Đăng nhập bằng Google thành công!')
      const dest = loggedInUser.role === 'admin' ? '/admin' : '/dashboard'
      navigate(dest, { replace: true })
    } catch (err: any) {
      const errMsg = typeof err === 'string'
        ? (err === 'Unauthorized' ? 'Đăng ký bằng Google thất bại.' : err)
        : (err?.message === 'Unauthorized' ? 'Đăng ký bằng Google thất bại.' : err?.message || 'Đăng ký bằng Google thất bại.')
      toast.error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleError = () => {
    toast.error('Đăng ký bằng Google thất bại hoặc đã bị hủy.')
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
            Tạo tài khoản
          </CardTitle>
          <CardDescription className="text-center">
            Đăng ký để bắt đầu hành trình học tập cùng Nexus.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4">

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="register-fullname">Họ và tên</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-fullname"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  className="pl-10"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-email"
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
              <Label htmlFor="register-password">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="register-confirm-password">Xác nhận mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
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
                  {showConfirmPassword ? (
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
              {isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
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

            {/* Google Sign Up Button */}
            <div className="w-full flex justify-center items-center min-h-[44px] [&>div]:flex [&>div]:justify-center [&>div]:items-center [&>div]:w-full [&_iframe]:!mx-auto">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                theme="outline"
                shape="rectangular"
                size="large"
                text="signup_with"
                width="380"
              />
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Đã có tài khoản?{' '}
              <Link
                to="/login"
                className="font-semibold text-primary underline-offset-4 transition-colors hover:underline"
              >
                Đăng nhập
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  )
}


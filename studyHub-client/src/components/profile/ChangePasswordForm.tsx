import { useState } from 'react'
import { motion } from 'motion/react'
import { Lock, Eye, EyeOff, KeyRound, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function ChangePasswordForm() {
  const { changePassword } = useAuth()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{
    oldPassword?: string
    newPassword?: string
    confirmPassword?: string
  }>({})

  const validate = () => {
    const tempErrors: typeof errors = {}
    let isValid = true

    if (!oldPassword) {
      tempErrors.oldPassword = 'Mật khẩu hiện tại không được để trống.'
      isValid = false
    }

    if (!newPassword) {
      tempErrors.newPassword = 'Mật khẩu mới không được để trống.'
      isValid = false
    } else if (newPassword.length < 6) {
      tempErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự.'
      isValid = false
    } else if (newPassword === oldPassword) {
      tempErrors.newPassword = 'Mật khẩu mới không được trùng với mật khẩu hiện tại.'
      isValid = false
    }

    if (!confirmPassword) {
      tempErrors.confirmPassword = 'Xác nhận mật khẩu mới không được để trống.'
      isValid = false
    } else if (confirmPassword !== newPassword) {
      tempErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
      isValid = false
    }

    setErrors(tempErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      await changePassword(oldPassword, newPassword)
      toast.success('Đổi mật khẩu thành công!')
      // Clear fields
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setErrors({})
    } catch (err: any) {
      const errMsg = err.message || 'Có lỗi xảy ra khi đổi mật khẩu.'
      toast.error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      <Card className="rounded-2xl border border-slate-100 bg-white shadow-lg shadow-black/[0.03] overflow-hidden">
        <CardHeader className="space-y-1.5 pb-4">
          <CardTitle className="text-xl font-bold tracking-tight text-[#0F172A]">
            Đổi mật khẩu
          </CardTitle>
          <CardDescription className="text-sm text-slate-400">
            Cập nhật mật khẩu mới của bạn để bảo mật tài khoản.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-2">
            
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="oldPassword" className="text-xs font-bold text-slate-700">Mật khẩu hiện tại</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="oldPassword"
                  type={showOldPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 border-slate-200 rounded-xl focus-visible:ring-indigo-100 focus-visible:border-indigo-400 focus-visible:ring-2 transition-all"
                  value={oldPassword}
                  onChange={(e) => {
                    setOldPassword(e.target.value)
                    if (errors.oldPassword) setErrors((prev) => ({ ...prev, oldPassword: undefined }))
                  }}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showOldPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  disabled={isSubmitting}
                >
                  {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.oldPassword && (
                <p className="text-xs font-semibold text-rose-500 mt-1">{errors.oldPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-xs font-bold text-slate-700">Mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 border-slate-200 rounded-xl focus-visible:ring-indigo-100 focus-visible:border-indigo-400 focus-visible:ring-2 transition-all"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }))
                  }}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  disabled={isSubmitting}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs font-semibold text-rose-500 mt-1">{errors.newPassword}</p>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700">Xác nhận mật khẩu mới</Label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 border-slate-200 rounded-xl focus-visible:ring-indigo-100 focus-visible:border-indigo-400 focus-visible:ring-2 transition-all"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                  }}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs font-semibold text-rose-500 mt-1">{errors.confirmPassword}</p>
              )}
            </div>

          </CardContent>

          <CardFooter className="pt-4 pb-6 flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 font-semibold text-sm shadow-sm gap-2 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-white" />
                  Đang cập nhật...
                </>
              ) : (
                <>
                  Cập nhật mật khẩu
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  )
}

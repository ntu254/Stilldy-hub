import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import {
  Settings,
  Loader2,
  Save,
  Clock,
  ShieldAlert,
  AlertCircle
} from 'lucide-react'
import { adminService, type SystemSetting } from '@/services/adminService'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    paymentExpiryMins: 15,
    subscriptionGracePeriodDays: 30,
    bannedUserGracePeriodDays: 30,
  })

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await adminService.getSettings()
      
      const newFormData = { ...formData }
      res.data.forEach((setting: SystemSetting) => {
        if (setting.key === 'payment_expiry_mins') {
          newFormData.paymentExpiryMins = setting.value
        } else if (setting.key === 'subscription_grace_period_days') {
          newFormData.subscriptionGracePeriodDays = setting.value
        } else if (setting.key === 'banned_user_grace_period_days') {
          newFormData.bannedUserGracePeriodDays = setting.value
        }
      })
      
      setFormData(newFormData)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải cấu hình hệ thống')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? '' : Number(value),
    }))
  }

  const handleSave = async () => {
    // Validate
    if (formData.paymentExpiryMins < 1 || formData.paymentExpiryMins > 1440) {
      toast.error('Thời gian hết hạn mã QR thanh toán phải từ 1 đến 1440 phút.')
      return
    }
    if (formData.subscriptionGracePeriodDays < 0 || formData.subscriptionGracePeriodDays > 365) {
      toast.error('Thời gian gia hạn gói Pro phải từ 0 đến 365 ngày.')
      return
    }
    if (formData.bannedUserGracePeriodDays < 0 || formData.bannedUserGracePeriodDays > 365) {
      toast.error('Thời gian gia hạn tài khoản khóa phải từ 0 đến 365 ngày.')
      return
    }

    try {
      setSaving(true)
      await adminService.updateSettings({
        paymentExpiryMins: formData.paymentExpiryMins,
        subscriptionGracePeriodDays: formData.subscriptionGracePeriodDays,
        bannedUserGracePeriodDays: formData.bannedUserGracePeriodDays,
      })
      toast.success('Cập nhật cấu hình thành công!')
      await fetchSettings()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể cập nhật cấu hình')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      
      {/* ─── PAGE TITLE HEADER ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Settings className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Quản trị hệ thống
            </p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Cấu hình hệ thống
          </h1>
          <p className="text-sm text-slate-400">
            Quản lý các tham số cấu hình chung của hệ thống.
          </p>
        </div>
        
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 hover:shadow-md transition-all shrink-0"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lưu thay đổi
        </Button>
      </motion.div>

      {/* ─── SETTINGS FORM ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <p className="text-slate-400 text-xs font-semibold">Đang tải cấu hình...</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-5xl">
          
          {/* Payment Settings */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-lg shadow-black/[0.03] overflow-hidden">
              <CardHeader className="border-b border-slate-50 pb-5 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100/50">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Cấu hình thanh toán</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">Thiết lập thời gian liên quan đến giao dịch và thanh toán.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3 max-w-md">
                  <Label htmlFor="paymentExpiryMins" className="text-sm font-bold text-slate-700">Thời gian hết hạn mã QR (phút)</Label>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Xác định thời gian hiệu lực của một đơn hàng trước khi bị hệ thống tự động hủy bỏ. (Từ 1 - 1440 phút).
                  </p>
                  <div className="relative mt-2">
                    <Input
                      type="number"
                      id="paymentExpiryMins"
                      name="paymentExpiryMins"
                      min={1}
                      max={1440}
                      value={formData.paymentExpiryMins}
                      onChange={handleChange}
                      className="pr-14 border-slate-200 rounded-xl focus-visible:ring-indigo-100 focus-visible:border-indigo-400 focus-visible:ring-2 transition-all text-slate-800 font-semibold"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 text-xs font-semibold">phút</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Grace Period Settings */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-lg shadow-black/[0.03] overflow-hidden">
              <CardHeader className="border-b border-slate-50 pb-5 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100/50">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Chính sách gia hạn tài liệu</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">Thời gian hệ thống lưu giữ tài liệu của người dùng khi tài khoản gặp vấn đề.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="subscriptionGracePeriodDays" className="text-sm font-bold text-slate-700">
                      Thời gian gia hạn gói nâng cao (ngày)
                    </Label>
                    <p className="text-xs text-slate-500 leading-relaxed h-10">
                      Số ngày giữ lại tài liệu vượt quá dung lượng miễn phí sau khi người dùng hết hạn gói nâng cao. (Từ 0 - 365 ngày).
                    </p>
                    <div className="relative">
                      <Input
                        type="number"
                        id="subscriptionGracePeriodDays"
                        name="subscriptionGracePeriodDays"
                        min={0}
                        max={365}
                        value={formData.subscriptionGracePeriodDays}
                        onChange={handleChange}
                        className="pr-14 border-slate-200 rounded-xl focus-visible:ring-indigo-100 focus-visible:border-indigo-400 focus-visible:ring-2 transition-all text-slate-800 font-semibold"
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 text-xs font-semibold">ngày</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="bannedUserGracePeriodDays" className="text-sm font-bold text-slate-700">
                      Thời gian gia hạn tài khoản khóa (ngày)
                    </Label>
                    <p className="text-xs text-slate-500 leading-relaxed h-10">
                      Số ngày giữ lại tài liệu sau khi người dùng bị hệ thống khóa tài khoản. Sau đó tài liệu sẽ bị xóa. (Từ 0 - 365 ngày).
                    </p>
                    <div className="relative">
                      <Input
                        type="number"
                        id="bannedUserGracePeriodDays"
                        name="bannedUserGracePeriodDays"
                        min={0}
                        max={365}
                        value={formData.bannedUserGracePeriodDays}
                        onChange={handleChange}
                        className="pr-14 border-slate-200 rounded-xl focus-visible:ring-indigo-100 focus-visible:border-indigo-400 focus-visible:ring-2 transition-all text-slate-800 font-semibold"
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 text-xs font-semibold">ngày</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 rounded-xl p-4 flex gap-3 items-start border border-amber-100 mt-6">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[13px] leading-relaxed text-amber-800">
                    <span className="font-bold">Lưu ý:</span> Việc thay đổi cấu hình gia hạn sẽ áp dụng cho tất cả tài liệu vi phạm quy định sau thời điểm cấu hình được lưu. Các tài liệu đã ở trong trạng thái gia hạn trước đó không bị ảnh hưởng.
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
        </div>
      )}
    </div>
  )
}

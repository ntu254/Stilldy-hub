import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { User, Mail, Phone, Calendar as CalendarIcon, MapPin, Shield, CheckCircle, Clock, Save, UserCheck, Camera, Loader2, ImagePlus, UploadCloud, X, CreditCard, Sparkles, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSelector } from '@/redux/store'
import { toast } from 'sonner'
import ChangePasswordForm from '@/components/profile/ChangePasswordForm'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogBackdrop, DialogPanel } from '@/components/animate-ui/primitives/headless/dialog'
import StorageUpgradeModal from '@/components/StorageUpgradeModal'

export default function ProfilePage() {
  const { user, updateProfile, updateAvatar } = useAuth()
  const currentSubscription = useAppSelector((state) => state.auth.currentSubscription)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Quản trị viên'
      case 'user': return 'Người dùng'
      case 'guest': return 'Khách'
      default: return role
    }
  }

  const [displayName, setDisplayName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined)
  const [address, setAddress] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize form fields with user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '')
      setPhoneNumber(user.phoneNumber || '')
      setGender(user.gender || '')
      
      // Parse ISO dateOfBirth to Date object
      if (user.dateOfBirth) {
        try {
          const d = new Date(user.dateOfBirth)
          if (!isNaN(d.getTime())) {
            setDateOfBirth(d)
          }
        } catch {
          setDateOfBirth(undefined)
        }
      } else {
        setDateOfBirth(undefined)
      }

      setAddress(user.address || '')
    }
  }, [user])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!displayName.trim()) {
      toast.error('Họ và tên không được để trống.')
      return
    }

    setIsSubmitting(true)
    try {
      await updateProfile({
        displayName,
        phoneNumber: phoneNumber || undefined,
        gender: gender || null,
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : null,
        address: address || null,
      })
      toast.success('Cập nhật thông tin cá nhân thành công!')
    } catch (err: any) {
      const errMsg = err.message || 'Có lỗi xảy ra khi cập nhật hồ sơ.'
      toast.error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      toast.error('Hệ thống chỉ hỗ trợ định dạng ảnh .jpg, .jpeg, .png!')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 2MB!')
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleSaveAvatar = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn một ảnh để tải lên.')
      return
    }

    setIsUploadingAvatar(true)
    try {
      await updateAvatar(selectedFile)
      toast.success('Cập nhật ảnh đại diện thành công!')
      closeAvatarModal()
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra khi tải ảnh lên.')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const closeAvatarModal = () => {
    setIsAvatarModalOpen(false)
    setTimeout(() => {
      setSelectedFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }, 200)
  }

  const creationDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : ''

  const initialAvatar = user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'

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
            <User className="h-4 w-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Cài đặt tài khoản
          </p>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Hồ sơ cá nhân
        </h1>
        <p className="text-sm text-slate-400">
          Quản lý thông tin định danh và cài đặt bảo mật của bạn.
        </p>
      </motion.div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Personal Information Form (Takes 2 cols on wide screen) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-2 space-y-6"
        >
          <Card className="rounded-2xl border border-slate-100 bg-white shadow-lg shadow-black/[0.03] overflow-hidden">
            <CardHeader className="border-b border-slate-50 pb-5">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Large Premium Avatar Circle */}
                <div className="relative shrink-0 group">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-extrabold text-white shadow-md shadow-indigo-200 overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      initialAvatar
                    )}
                    
                    {/* Hover Overlay */}
                    <div 
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => setIsAvatarModalOpen(true)}
                    >
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  {user?.isVerified && (
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-sm z-10">
                      <CheckCircle className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                <div className="text-center sm:text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <CardTitle className="text-lg font-bold text-[#0F172A]">
                      {user?.displayName || 'Người dùng'}
                    </CardTitle>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-slate-600 uppercase">
                      {getRoleLabel(user?.role || 'guest')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1">
                    <Clock className="h-3 w-3" />
                    Thành viên từ {creationDate}
                  </p>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleSaveProfile}>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-6">
                
                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-xs font-bold text-slate-700">Họ và tên</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="displayName"
                      type="text"
                      className="pl-10 border-slate-200 rounded-xl focus-visible:ring-indigo-100 focus-visible:border-indigo-400 focus-visible:ring-2 transition-all text-slate-800"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>

                {/* Email Address (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="profile-email" className="text-xs font-bold text-slate-400">Địa chỉ Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                    <Input
                      id="profile-email"
                      type="email"
                      className="pl-10 border-slate-100 rounded-xl bg-slate-50/50 text-slate-400 cursor-not-allowed select-none"
                      value={user?.email || ''}
                      disabled
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-xs font-bold text-slate-700">Số điện thoại</Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="Nhập số điện thoại"
                      className="pl-10 border-slate-200 rounded-xl focus-visible:ring-indigo-100 focus-visible:border-indigo-400 focus-visible:ring-2 transition-all text-slate-800"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Gender (Select Dropdown) */}
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-xs font-bold text-slate-700">Giới tính</Label>
                  <div className="relative">
                    <UserCheck className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                    <Select value={gender} onValueChange={(val) => setGender(val)}>
                      <SelectTrigger className="pl-10 text-xs font-semibold text-slate-800 rounded-xl border border-slate-200 bg-white">
                        <SelectValue placeholder="Chưa thiết lập">
                          {gender === 'male' ? 'Nam' : gender === 'female' ? 'Nữ' : gender === 'other' ? 'Khác' : ''}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Chưa thiết lập</SelectItem>
                        <SelectItem value="male">Nam</SelectItem>
                        <SelectItem value="female">Nữ</SelectItem>
                        <SelectItem value="other">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-xs font-bold text-slate-700">Ngày sinh</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                    <Popover>
                      <PopoverTrigger className="pl-10 h-10 w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none transition-all hover:bg-slate-50/50 cursor-pointer text-left">
                        <span>
                          {dateOfBirth ? format(dateOfBirth, 'dd/MM/yyyy') : 'Chọn ngày sinh'}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50">
                        <Calendar
                          mode="single"
                          selected={dateOfBirth}
                          captionLayout="dropdown"
                          onSelect={setDateOfBirth}
                          locale={vi}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="text-xs font-bold text-slate-700">Địa chỉ cư trú</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="address"
                      type="text"
                      placeholder="Nhập địa chỉ của bạn"
                      className="pl-10 border-slate-200 rounded-xl focus-visible:ring-indigo-100 focus-visible:border-indigo-400 focus-visible:ring-2 transition-all text-slate-800"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

              </CardContent>

              <CardFooter className="border-t border-slate-50 pt-5 pb-6 flex justify-end gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-sm shadow-sm gap-2 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-200 border-t-white" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      Lưu thay đổi
                      <Save className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </motion.div>

        {/* Right Column: Subscription & Security Form (Takes 1 col on wide screen) */}
        <div className="space-y-6">
          
          {/* Subscription Card */}
          {user?.role !== 'admin' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card className="rounded-2xl border border-slate-100 bg-gradient-to-b from-indigo-50/50 to-white shadow-md shadow-indigo-100/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10" />
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                    Gói dịch vụ của bạn
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentSubscription ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Gói hiện tại</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-indigo-700 uppercase">
                          {currentSubscription.planId.name} <Sparkles className="h-3 w-3" />
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Trạng thái</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Đang kích hoạt
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Ngày hết hạn</span>
                        <span className="text-[11px] font-bold text-slate-700">
                          {currentSubscription.endDate ? format(new Date(currentSubscription.endDate), 'dd/MM/yyyy') : 'Vĩnh viễn'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center space-y-2">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Đang dùng bản Miễn Phí</p>
                      <p className="text-[10px] text-slate-400">Nâng cấp để mở khóa 5GB lưu trữ</p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => setUpgradeOpen(true)}
                    className="w-full mt-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-xs shadow-sm"
                  >
                    {currentSubscription ? 'Gia hạn / Nâng cấp gói' : 'Nâng cấp ngay'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <ChangePasswordForm />
          
          {/* Account Security Widget Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="rounded-2xl border border-slate-100 bg-slate-50/40 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <Shield className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Trạng thái bảo mật</h4>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Tài khoản được bảo vệ</p>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Lịch sử hoạt động của bạn được mã hóa an toàn. Vui lòng không chia sẻ mật khẩu hoặc các khóa cookie xác thực phiên hoạt động của mình với bất kỳ ai để đảm bảo an toàn.
              </p>
            </Card>
          </motion.div>
        </div>

      </div>
      {/* Avatar Crop/Upload Modal */}
      <StorageUpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      <Dialog open={isAvatarModalOpen} onClose={closeAvatarModal} className="relative z-[100]">
        <DialogBackdrop className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel>
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col items-center animate-in zoom-in-95 duration-200 relative">
              <button 
                onClick={closeAvatarModal}
                className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="text-lg font-black text-slate-900 mb-6">Cập nhật ảnh đại diện</h3>
              
              {/* Preview Area */}
              <div className="relative group mb-6">
                <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-4xl font-extrabold text-white shadow-xl shadow-indigo-200 overflow-hidden border-4 border-white">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : user?.avatar ? (
                    <img src={user.avatar} alt="Current" className="h-full w-full object-cover" />
                  ) : (
                    initialAvatar
                  )}
                  
                  {/* Loading overlay during upload */}
                  <AnimatePresence>
                    {isUploadingAvatar && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-10"
                      >
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Edit Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-white text-indigo-600 shadow-lg border border-indigo-50 flex items-center justify-center hover:scale-105 hover:text-indigo-700 hover:shadow-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
              </div>

              {/* Hidden input inside modal */}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".jpg,.jpeg,.png"
                onChange={handleFileSelect}
              />

              <div className="w-full space-y-3">
                <Button
                  onClick={handleSaveAvatar}
                  disabled={!selectedFile || isUploadingAvatar}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  {isUploadingAvatar ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
                <Button
                  onClick={closeAvatarModal}
                  disabled={isUploadingAvatar}
                  variant="ghost"
                  className="w-full h-11 rounded-xl text-slate-500 font-semibold hover:bg-slate-50"
                >
                  Hủy bỏ
                </Button>
              </div>

            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  )
}

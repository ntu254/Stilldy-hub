import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from '@/components/animate-ui/primitives/headless/dialog'
import type { SubscriptionPlan } from '@/types/subscription'
import FeaturesEditor from './FeaturesEditor'
import { X, Save, AlertCircle, Package } from 'lucide-react'

interface PlanDialogProps {
  isOpen: boolean
  onClose: () => void
  plan?: SubscriptionPlan | null
  onSave: (data: Partial<SubscriptionPlan>) => Promise<void>
}

// 1 GB = 1073741824 Bytes
const GB_TO_BYTES = 1024 * 1024 * 1024
const MB_TO_BYTES = 1024 * 1024

export default function PlanDialog({ isOpen, onClose, plan, onSave }: PlanDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    storageUnit: 'GB', // 'MB' or 'GB'
    storageValue: 0,
    durationDays: 30,
    description: '',
    sortOrder: 0,
    isActive: true,
  })
  
  const [features, setFeatures] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (plan) {
      // Determine unit for display
      let unit = 'MB'
      let value = plan.storageLimit / MB_TO_BYTES
      
      if (plan.storageLimit >= GB_TO_BYTES && plan.storageLimit % GB_TO_BYTES === 0) {
        unit = 'GB'
        value = plan.storageLimit / GB_TO_BYTES
      }

      setFormData({
        name: plan.name,
        price: plan.price,
        storageUnit: unit,
        storageValue: value,
        durationDays: plan.durationDays,
        description: plan.description || '',
        sortOrder: plan.sortOrder,
        isActive: plan.isActive,
      })
      setFeatures(plan.features || [])
    } else {
      // Reset form for new plan
      setFormData({
        name: '',
        price: 0,
        storageUnit: 'GB',
        storageValue: 10,
        durationDays: 30,
        description: '',
        sortOrder: 0,
        isActive: true,
      })
      setFeatures([])
    }
    setError(null)
  }, [plan, isOpen])

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Convert storage to bytes
      const multiplier = formData.storageUnit === 'GB' ? GB_TO_BYTES : MB_TO_BYTES
      const storageLimit = formData.storageValue * multiplier

      const payload: Partial<SubscriptionPlan> = {
        name: formData.name,
        price: formData.price,
        storageLimit,
        durationDays: formData.durationDays,
        description: formData.description,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
        features,
      }

      await onSave(payload)
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu gói dịch vụ.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <DialogBackdrop className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />

      {/* Centering wrapper */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        {/* Panel */}
        <DialogPanel>
          {/* Inner styled container */}
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-100/50">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Package className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {plan ? 'Chỉnh sửa gói dịch vụ' : 'Thêm gói dịch vụ mới'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="mt-5 max-h-[75vh] overflow-y-auto pr-1 text-slate-700">
              {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50/50 p-3.5 border border-red-100 text-xs text-red-700 font-semibold leading-normal">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <form id="plan-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tên gói */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      Tên gói <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="VD: Starter, PRO..."
                      className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100/50 transition-all outline-none"
                    />
                  </div>

                  {/* Giá */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      Giá (VNĐ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      required
                      min="0"
                      step="1000"
                      value={formData.price}
                      onChange={handleChange}
                      className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100/50 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dung lượng */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      Dung lượng <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        name="storageValue"
                        required
                        min="1"
                        value={formData.storageValue}
                        onChange={handleChange}
                        className="h-9 w-full px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100/50 transition-all outline-none"
                      />
                      <select
                        name="storageUnit"
                        value={formData.storageUnit}
                        onChange={handleChange}
                        className="h-9 w-24 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100/50 transition-all outline-none"
                      >
                        <option value="MB">MB</option>
                        <option value="GB">GB</option>
                      </select>
                    </div>
                  </div>

                  {/* Thời hạn */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      Thời hạn (Ngày) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="durationDays"
                      required
                      min="1"
                      value={formData.durationDays}
                      onChange={handleChange}
                      className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100/50 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Mô tả */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    Mô tả ngắn
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Mô tả về gói dịch vụ..."
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100/50 transition-all outline-none resize-none"
                  />
                </div>

                {/* Tính năng */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    Danh sách tính năng
                  </label>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40">
                    <FeaturesEditor features={features} onChange={setFeatures} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sắp xếp */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      Thứ tự hiển thị
                    </label>
                    <input
                      type="number"
                      name="sortOrder"
                      value={formData.sortOrder}
                      onChange={handleChange}
                      className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100/50 transition-all outline-none"
                    />
                  </div>

                  {/* Kích hoạt */}
                  <div className="flex flex-col gap-1.5 justify-end">
                    <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors h-9">
                      <div className="relative flex items-center ml-2">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">Đang hoạt động</span>
                    </label>
                  </div>
                </div>
              </form>
            </div>

            {/* Form Action buttons */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl px-4 h-9 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="plan-form"
                disabled={isSubmitting}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-5 text-xs shadow-md shadow-indigo-600/10 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {isSubmitting ? 'Đang lưu...' : 'Lưu gói'}
              </button>
            </div>

          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Settings2, Plus, Edit2, Trash2, Power, PowerOff } from 'lucide-react'
import { adminPlansService } from '@/services/adminPlansService'
import type { SubscriptionPlan } from '@/types/subscription'
import PlanDialog from '@/components/subscription/PlanDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  
  // State for confirm dialog
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    setIsLoading(true)
    try {
      const data = await adminPlansService.getPlansForAdmin()
      setPlans(data)
    } catch (error) {
      toast.error('Lỗi khi tải danh sách gói dịch vụ.')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (plan?: SubscriptionPlan) => {
    setEditingPlan(plan || null)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingPlan(null)
  }

  const handleSavePlan = async (data: Partial<SubscriptionPlan>) => {
    try {
      if (editingPlan) {
        await adminPlansService.updatePlan(editingPlan._id, data)
        toast.success('Cập nhật gói dịch vụ thành công!')
      } else {
        await adminPlansService.createPlan(data)
        toast.success('Tạo gói dịch vụ mới thành công!')
      }
      fetchPlans() // Refresh list
    } catch (error: any) {
      throw error // Let the dialog handle the error display
    }
  }
  const handleDeleteClick = (id: string) => {
    setPlanToDelete(id)
    setIsConfirmOpen(true)
  }

  const confirmDeletePlan = async () => {
    if (!planToDelete) return

    try {
      await adminPlansService.deletePlan(planToDelete)
      toast.success('Đã vô hiệu hóa gói dịch vụ.')
      fetchPlans()
    } catch (error) {
      toast.error('Lỗi khi xóa gói dịch vụ.')
    } finally {
      setPlanToDelete(null)
      setIsConfirmOpen(false)
    }
  }

  const formatBytesToGB = (bytes: number) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(0) + ' GB'
  }

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Settings2 className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Quản trị hệ thống
            </p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Gói dịch vụ & Thanh toán
          </h1>
          <p className="text-sm text-slate-400">
            Quản lý các gói đăng ký, tính năng và giá cả hiển thị cho người dùng.
          </p>
        </div>
        
        <button
          onClick={() => handleOpenDialog()}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 hover:shadow-md transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          Thêm gói mới
        </button>
      </motion.div>

      {/* Main Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-2xl border border-slate-100 bg-white shadow-lg shadow-slate-200/40 overflow-hidden flex flex-col"
      >
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm text-slate-500">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-600 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4">Tên gói</th>
                <th className="px-6 py-4">Giá (VNĐ)</th>
                <th className="px-6 py-4">Dung lượng</th>
                <th className="px-6 py-4">Thời hạn</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-center">Sort Order</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                    Chưa có gói dịch vụ nào được cấu hình.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{plan.name}</div>
                      {plan.description && (
                        <div className="text-xs text-slate-400 mt-1 line-clamp-1 max-w-[200px]" title={plan.description}>
                          {plan.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {plan.price.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {formatBytesToGB(plan.storageLimit)}
                    </td>
                    <td className="px-6 py-4">
                      {plan.durationDays} ngày
                    </td>
                    <td className="px-6 py-4 text-center">
                      {plan.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 border border-emerald-100">
                          <Power className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 border border-slate-200">
                          <PowerOff className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
                        {plan.sortOrder}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <button
                          onClick={() => handleOpenDialog(plan)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(plan._id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Vô hiệu hóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Plan Dialog Editor */}
      <PlanDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        plan={editingPlan}
        onSave={handleSavePlan}
      />

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDeletePlan}
        title="Xác nhận vô hiệu hóa"
        description="Bạn có chắc chắn muốn vô hiệu hóa gói dịch vụ này? Người dùng hiện tại vẫn có thể sử dụng cho đến khi hết hạn."
        confirmText="Vô hiệu hóa"
        cancelText="Hủy"
        isDestructive={true}
      />
    </div>
  )
}

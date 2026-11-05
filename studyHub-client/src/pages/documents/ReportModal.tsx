import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from '@/components/animate-ui/primitives/headless/dialog'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
  isSubmitting: boolean
}

export default function ReportModal({ isOpen, onClose, onSubmit, isSubmitting }: ReportModalProps) {
  const [reason, setReason] = useState('')

  const handleClose = () => {
    onClose()
    setReason('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    onSubmit(reason.trim())
    setReason('')
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-[110]">
      {/* Backdrop */}
      <DialogBackdrop className="fixed inset-0 bg-black/40 backdrop-blur-xs" />

      {/* Centering wrapper */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        {/* Panel */}
        <DialogPanel>
          {/* Inner styled container */}
          <div className="w-full max-w-lg w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Flag className="h-4.5 w-4.5 text-rose-500 animate-pulse" /> Báo cáo tài liệu vi phạm
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Lý do báo cáo <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập lý do chi tiết..."
                  disabled={isSubmitting}
                  rows={4}
                  required
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition-all leading-relaxed"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm px-4 py-2 text-sm cursor-pointer"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                </Button>
              </div>
            </form>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

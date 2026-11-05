import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogPanel,
} from '@/components/animate-ui/components/headless/dialog'
import { Scale, AlertTriangle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DMCAModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isSubmitting?: boolean
}

export default function DMCAModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}: DMCAModalProps) {
  const [agreed, setAgreed] = useState(false)

  // Reset agreement state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAgreed(false)
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel showCloseButton={true} className="p-0 border-0 overflow-hidden bg-transparent max-w-lg w-full">
          <div className="relative w-full overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-100/50">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 shrink-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 border border-amber-100/50">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                   Xác nhận điều khoản bản quyền
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Yêu cầu bắt buộc trước khi chia sẻ công khai tài liệu
                </p>
              </div>
            </div>

            {/* Warning Message Banner */}
            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-50/50 p-3 border border-amber-100/50 text-[11px] text-amber-850 leading-relaxed">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-800">Cảnh báo bản quyền:</span> Bằng việc công khai tài liệu này, bạn xác nhận rằng bạn hoàn toàn chịu trách nhiệm trước pháp luật về nội dung đăng tải.
              </div>
            </div>

            {/* DMCA Core Terms Content */}
            <div className="mt-4 max-h-[40vh] overflow-y-auto pr-1 border border-slate-150/70 rounded-xl bg-slate-50/50 p-4 space-y-3 text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800">
                Bằng việc công khai tài liệu này trên hệ thống StudyHub, bạn cam kết và xác nhận rằng:
              </p>
              <ul className="list-disc pl-4 space-y-2">
                <li>
                  <strong className="text-slate-700">Quyền sở hữu tác giả:</strong> Bạn là tác giả hợp pháp hoặc được ủy quyền, có toàn quyền chia sẻ và phát hành tài liệu này tới cộng đồng.
                </li>
                <li>
                  <strong className="text-slate-700">Không vi phạm bản quyền:</strong> Tài liệu không chứa nội dung sao chép trái phép, vi phạm quyền sở hữu trí tuệ hoặc bản quyền của bất kỳ cá nhân hay tổ chức bên thứ ba nào.
                </li>
                <li>
                  <strong className="text-slate-700">Trách nhiệm pháp lý (DMCA):</strong> Bạn chịu hoàn toàn trách nhiệm pháp lý theo Đạo luật Bản quyền Thiên niên kỷ Kỹ thuật số (DMCA) và các quy định pháp luật sở hữu trí tuệ hiện hành của Việt Nam và quốc tế nếu có khiếu nại phát sinh.
                </li>
              </ul>
              <p className="text-[11px] text-slate-400">
                StudyHub có quyền gỡ bỏ tài liệu ngay lập tức mà không cần báo trước nếu nhận được bất kỳ thông báo khiếu nại vi phạm bản quyền hợp lệ từ bên thứ ba.
              </p>
            </div>

            {/* Learn More link */}
            <div className="mt-3 text-right">
              <a
                href="https://en.wikipedia.org/wiki/Digital_Millennium_Copyright_Act"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Tìm hiểu thêm về DMCA <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Agreement Checkbox */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="flex items-start gap-3 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 disabled:opacity-50 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                  Tôi đã đọc và đồng ý với các điều khoản bản quyền trên và chịu hoàn toàn trách nhiệm pháp lý.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 text-slate-600 font-semibold px-4 h-10 text-xs hover:bg-slate-50 hover:text-slate-800 transition-all"
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                onClick={onConfirm}
                disabled={!agreed || isSubmitting}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-5 text-xs shadow-md shadow-indigo-600/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Đang xác nhận...' : '✓ Xác nhận'}
              </Button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

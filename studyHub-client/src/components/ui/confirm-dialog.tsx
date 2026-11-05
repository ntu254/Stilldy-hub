import React from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from '@/components/animate-ui/primitives/headless/dialog'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  isDestructive = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-100/50">
          <div className="flex items-start gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{description}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0 -mt-1 -mr-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="rounded-xl px-4 h-10 text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200 transition-colors w-full sm:w-auto"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={`rounded-xl px-4 h-10 text-xs font-bold text-white shadow-sm transition-all w-full sm:w-auto ${
                isDestructive 
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/10' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

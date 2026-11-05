import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { FlashcardCollection } from '@/types/flashcard'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/animate-ui/components/radix/alert-dialog'

interface Props {
  target: FlashcardCollection | null
  onClose: () => void
  onConfirm: () => Promise<void> | void
}

export default function DeleteConfirmDialog({ target, onClose, onConfirm }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault() // Ngăn đóng tự động trước khi xử lý async xong
    try {
      setIsDeleting(true)
      await onConfirm()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => { if (!open && !isDeleting) onClose() }}>
      <AlertDialogContent className="w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-100 bg-white">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 shrink-0">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-extrabold text-slate-900 leading-none">
                Xóa bộ thẻ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[11px] text-slate-400 mt-1">
                Thao tác này sẽ xóa mềm bộ thẻ
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {target && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 my-2 text-left">
            <p className="text-sm font-bold text-rose-800 line-clamp-2">"{target.title}"</p>
            <p className="text-xs text-rose-600 mt-0.5 font-semibold">
              {target.totalCards ?? target.cards?.length ?? 0} thẻ ghi nhớ
            </p>
          </div>
        )}

        <p className="text-sm text-slate-500 my-2 text-left">
          Bộ thẻ sẽ bị ẩn khỏi danh sách. Bạn có thể khôi phục lại sau nếu cần.
        </p>

        <AlertDialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-4">
          <AlertDialogCancel
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border-slate-200 text-slate-700 font-semibold text-sm h-9 px-4 cursor-pointer hover:bg-slate-50"
          >
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm h-9 px-4 gap-2 cursor-pointer border-none shadow-md shadow-rose-600/20"
          >
            {isDeleting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Đang xóa...</>
            ) : (
              'Xóa bộ thẻ'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

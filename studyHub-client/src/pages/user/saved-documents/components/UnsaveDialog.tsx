import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/animate-ui/components/radix/alert-dialog'

interface UnsaveDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isUnsaving: boolean
}

export default function UnsaveDialog({
  isOpen,
  onClose,
  onConfirm,
  isUnsaving,
}: UnsaveDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bỏ lưu tài liệu?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn bỏ lưu tài liệu này khỏi thư viện cá nhân?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
          <AlertDialogAction
            disabled={isUnsaving}
            onClick={onConfirm}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isUnsaving ? 'Đang xử lý...' : 'Bỏ lưu'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

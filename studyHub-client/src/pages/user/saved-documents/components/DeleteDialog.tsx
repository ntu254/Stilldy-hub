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

interface DeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}

export default function DeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa tài liệu học tập?</AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này sẽ xóa tài liệu khỏi hệ thống và không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={onConfirm}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa tài liệu'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

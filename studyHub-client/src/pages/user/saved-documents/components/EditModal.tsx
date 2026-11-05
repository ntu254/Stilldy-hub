import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (title: string, description: string) => void
  isSaving: boolean
  initialTitle: string
  initialDescription: string
}

export default function EditModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
  initialTitle,
  initialDescription,
}: EditModalProps) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle)
      setDescription(initialDescription)
    }
  }, [isOpen, initialTitle, initialDescription])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      onSave(title.trim(), description.trim())
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100"
      >
        <h3 className="text-base font-bold text-slate-900 mb-4">Chỉnh sửa thông tin tài liệu</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Tiêu đề tài liệu <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề tài liệu mới"
              disabled={isSaving}
              required
              className="rounded-xl border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Mô tả tài liệu</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả chi tiết của tài liệu"
              disabled={isSaving}
              rows={4}
              className="w-full border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition-all leading-relaxed"
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              onClick={onClose}
              disabled={isSaving}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

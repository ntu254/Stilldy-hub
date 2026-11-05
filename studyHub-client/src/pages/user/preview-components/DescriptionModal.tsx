import { motion } from 'motion/react'
import { Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DescriptionModalProps {
  isOpen: boolean
  onClose: () => void
  summary: string
}

export default function DescriptionModal({ isOpen, onClose, summary }: DescriptionModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-900 text-white relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-60 pointer-events-none" />
          <div className="flex items-center gap-2 relative z-10">
            <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-wider">Mô tả tài liệu</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors relative z-10 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-semibold">
            {summary}
          </p>
        </div>
        <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl px-4 py-2"
          >
            Đóng
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

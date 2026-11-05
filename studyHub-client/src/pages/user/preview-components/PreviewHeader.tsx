import { ArrowLeft } from 'lucide-react'

interface PreviewHeaderProps {
  onBack: () => void
  isStandalone: boolean
}

export default function PreviewHeader({ onBack, isStandalone }: PreviewHeaderProps) {
  return (
    <div className="hidden lg:flex w-full items-center justify-between gap-4 px-6 py-3 bg-white border-b border-slate-100 shrink-0">
      <button
        onClick={onBack}
        className="group inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200/60 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 shadow-sm hover:border-slate-300 transition-all"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        {isStandalone ? 'Quay lại' : 'Quay lại kho lưu trữ'}
      </button>
    </div>
  )
}

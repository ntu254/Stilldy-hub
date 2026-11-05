import { AlertCircle, Download } from 'lucide-react'
import { getFileIcon, getFileBg } from './helpers'
import { cn } from '@/lib/utils'

interface NonPdfPlaceholderProps {
  type: 'pdf' | 'doc' | 'ppt' | 'xls'
  title: string
}

export default function NonPdfPlaceholder({ type, title }: NonPdfPlaceholderProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/60 min-h-[520px] px-8">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white border border-slate-200/60 shadow-lg mb-6">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', getFileBg(type))}>
            {getFileIcon(type, 'h-8 w-8')}
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">
            Xem trước không khả dụng
          </p>
        </div>
        <h3 className="text-sm font-extrabold text-slate-800 mb-2 leading-snug">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Định dạng <span className="font-bold text-slate-700 uppercase">.{type}</span> hiện không hỗ trợ xem trực tiếp trên trình duyệt. Vui lòng tải xuống để xem nội dung đầy đủ.
        </p>
        <div className="mt-6 flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-500 shadow-sm">
          <Download className="h-3.5 w-3.5 text-slate-400" />
          Nhấn Tải xuống ở trên để xem tài liệu
        </div>
      </div>
    </div>
  )
}

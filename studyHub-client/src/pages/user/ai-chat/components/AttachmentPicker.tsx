import { AnimatePresence, motion } from 'motion/react'
import { X, Loader2, FileText, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ServerDocument } from '@/types/document'

interface AttachmentPickerProps {
  isOpen: boolean
  onClose: () => void
  isLoadingDocs: boolean
  userDocuments: ServerDocument[]
  attachedDoc: ServerDocument | null
  onSelectDoc: (doc: ServerDocument | null) => void
}

export default function AttachmentPicker({
  isOpen,
  onClose,
  isLoadingDocs,
  userDocuments,
  attachedDoc,
  onSelectDoc,
}: AttachmentPickerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="absolute bottom-24 left-4 right-4 md:left-6 md:right-6 bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 z-40 max-w-sm"
        >
          <div className="flex justify-between items-center pb-2 border-b border-slate-50 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Đính kèm ngữ cảnh tài liệu
            </span>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {isLoadingDocs ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : userDocuments.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-4">
                Chưa có tài liệu nào. Hãy tải lên tài liệu trước.
              </p>
            ) : (
              userDocuments.map((doc) => {
                const isSelected = attachedDoc?._id === doc._id
                return (
                  <div
                    key={doc._id}
                    onClick={() => {
                      onSelectDoc(isSelected ? null : doc)
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs cursor-pointer border transition-all",
                      isSelected
                        ? "bg-indigo-50/50 border-indigo-200 text-indigo-700"
                        : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate font-semibold">{doc.title}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

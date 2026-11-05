import { api } from '@/lib/api'
import { renderAsync } from 'docx-preview'
import jszip from 'jszip'
import { AlertCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import DocViewerSkeleton from './DocViewerSkeleton'

// Đảm bảo window.JSZip mặc định là JSZip v3.x cho docx-preview
if (typeof window !== 'undefined') {
  (window as any).JSZip = jszip
}

interface DocxViewerContainerProps {
  fileId: string
}

export default function DocxViewerContainer({ fileId }: DocxViewerContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fileId) return

    const loadRawFile = async () => {
      try {
        setLoading(true)
        setError(null)
        const blob = await api.get<Blob>(`/documents/${fileId}/file`, { responseType: 'blob' })
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
          await renderAsync(blob, containerRef.current, undefined, {
           className: 'docx',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false, 
          breakPages: true,
          ignoreLastRenderedPageBreak: false, 
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          experimental: true,
          })
        }
      } catch (err: any) {
        console.error('Lỗi trình chiếu file Word:', err)
        setError(err?.message || 'Không thể hiển thị tài liệu Word.')
      } finally {
        setLoading(false)
      }
    }

    loadRawFile()
  }, [fileId])

  return (
    <div className="flex-1 bg-slate-100 overflow-y-auto relative w-full h-full min-h-[500px]">
      <style dangerouslySetInnerHTML={{ __html: `
        .docx-wrapper {
          background-color: #f1f5f9 !important;
          padding: 40px 20px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          width: 100% !important;
          min-height: 100% !important;
          box-sizing: border-box !important;
        }
        .docx-wrapper > section.docx {
          background: white !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          margin-bottom: 40px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          border: 1px solid #e2e8f0 !important;
          box-sizing: border-box !important;
        }
      `}} />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 bg-slate-50 flex flex-col items-center justify-center">
          <DocViewerSkeleton />
        </div>
      )}

      {/* Error overlay */}
      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 py-20 text-center px-8 min-h-[500px] z-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 mb-4">
            <AlertCircle className="h-6 w-6 text-rose-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 mb-1">Không thể hiển thị tài liệu</h3>
          <p className="text-xs text-slate-400 max-w-xs">{error}</p>
        </div>
      )}

      {/* Main container is always mounted so containerRef.current is never null */}
      <div 
        ref={containerRef}
        className={`raw-file-render-container w-full h-full ${(loading || error) ? 'invisible' : ''}`}
      />
    </div>
  )
}

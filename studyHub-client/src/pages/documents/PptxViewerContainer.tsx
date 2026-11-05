import { api } from '@/lib/api'
import { AlertCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import DocViewerSkeleton from './DocViewerSkeleton'

interface PptxViewerContainerProps {
  fileId: string
}

export default function PptxViewerContainer({ fileId }: PptxViewerContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fileId) return

    let active = true

    const loadRawFile = async () => {
      try {
        setLoading(true)
        setError(null)

        // Đợi DOM ổn định để đo kích thước chính xác
        await new Promise((resolve) => setTimeout(resolve, 200))
        if (!active) return

        const containerWidth = containerRef.current?.clientWidth || 0
        
        // Tăng giới hạn chiều rộng slide tối đa lên 1200px để hiển thị lớn hơn trên desktop
        const baseWidth = containerWidth > 0 ? containerWidth : 800
        const slideWidth = Math.max(Math.min(baseWidth - 48, 1200), 320)

        // Import động pptx-preview để tránh lỗi hoisting trong ES modules
        // @ts-ignore
        const pptxPreviewModule = await import('pptx-preview')
        const { init } = pptxPreviewModule

        if (!init) {
          throw new Error('Hàm init không được export từ thư viện pptx-preview')
        }

        const blob = await api.get<Blob>(`/documents/${fileId}/file`, { responseType: 'blob' })
        if (!active) return

        const arrayBuffer = await blob.arrayBuffer()
        
        if (containerRef.current && active) {
          containerRef.current.innerHTML = ''
          
          // Không truyền height cố định để thư viện tự động tính height theo tỷ lệ gốc của slide (4:3 hoặc 16:9)
          const viewer = init(containerRef.current, {
            mode: 'list',
            width: slideWidth
          })
          
          await viewer.preview(arrayBuffer)
        }
      } catch (err: any) {
        console.error('Lỗi trình chiếu file PowerPoint:', err)
        if (active) {
          setError(err?.message || 'Không thể hiển thị tài liệu PowerPoint.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadRawFile()

    return () => {
      active = false
    }
  }, [fileId])

  return (
    <div className="flex-1 bg-slate-100 overflow-y-auto relative w-full h-full min-h-[500px]">
      <style dangerouslySetInnerHTML={{ __html: `
        .pptx-preview-wrapper {
          background-color: #f1f5f9 !important;
          padding: 40px 20px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          width: 100% !important;
          min-height: 100% !important;
          box-sizing: border-box !important;
          gap: 40px !important;
        }
        .pptx-preview-wrapper * {
          box-sizing: border-box !important;
          /* Sử dụng font Arial/Calibri để giống với PowerPoint gốc, thay vì font Inter của Web App */
          font-family: Calibri, Arial, -apple-system, sans-serif !important;
        }
        .pptx-preview-wrapper p {
          /* PowerPoint render trên Web hay bị lỗi đè chữ do line-height quá hẹp (vd: 0.9), ghi đè tối thiểu 1.15 */
          line-height: 1.15 !important;
        }
        .pptx-preview-slide-wrapper {
          background: white !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          box-sizing: border-box !important;
          position: relative !important;
          margin: 0 auto !important;
        }
        /* Đảm bảo SVG vẽ các hình vẽ/đường kẻ không bị clip cạnh */
        .pptx-preview-slide-wrapper svg {
          overflow: visible !important;
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

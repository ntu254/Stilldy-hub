import { api } from '@/lib/api'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ImageViewerContainerProps {
  fileId: string
  fileName: string
  scale: number
  setScale: React.Dispatch<React.SetStateAction<number>>
  position: { x: number; y: number }
  setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
}

export default function ImageViewerContainer({
  fileId,
  fileName,
  scale,
  setScale,
  position,
  setPosition,
}: ImageViewerContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!fileId) return

    let active = true
    setLoading(true)
    setError(null)

    const fetchImage = async () => {
      try {
        const blob = await api.get<Blob>(`/documents/${fileId}/file`, { responseType: 'blob' })
        if (!active) return

        const objectUrl = URL.createObjectURL(blob)
        setImgUrl(objectUrl)
      } catch (err: any) {
        console.error('Lỗi tải hình ảnh:', err)
        if (active) {
          setError(err?.message || 'Không thể tải hình ảnh.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchImage()

    return () => {
      active = false
      if (imgUrl) {
        URL.revokeObjectURL(imgUrl)
      }
    }
  }, [fileId])

  // Mouse wheel zoom effect
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomSpeed = 0.1
      const direction = e.deltaY < 0 ? 1 : -1
      
      setScale((prevScale) => {
        const newScale = Math.min(Math.max(prevScale + direction * zoomSpeed, 0.5), 8)
        
        // Reset translation if fully zoomed out/fitted
        if (newScale <= 1) {
          setPosition({ x: 0, y: 0 })
        }
        return newScale
      })
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [imgUrl, setScale, setPosition])

  // Drag and Pan Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (scale <= 1) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    e.preventDefault()
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
  }

  // Double click toggles zoom between 1x and 2.5x
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (scale > 1) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    } else {
      setScale(2.5)
      setPosition({ x: 0, y: 0 })
    }
  }

  return (
    <div 
      ref={containerRef}
      className={`flex-1 flex items-center justify-center bg-slate-100 p-6 overflow-hidden min-h-[500px] relative select-none ${
        scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onDoubleClick={handleDoubleClick}
    >
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-4 z-10">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Đang tải hình ảnh...</p>
        </div>
      )}

      {/* Error overlay */}
      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-center px-8 z-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 mb-4">
            <AlertCircle className="h-6 w-6 text-rose-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 mb-1">Không thể hiển thị hình ảnh</h3>
          <p className="text-xs text-slate-400 max-w-xs">{error}</p>
        </div>
      )}

      {imgUrl && !loading && !error && (
        <div 
          className="relative w-full h-full flex items-center justify-center pointer-events-none"
        >
          <img
            src={imgUrl}
            alt={fileName}
            className="max-w-full max-h-[75vh] object-contain transition-transform"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transitionDuration: isDragging ? '0ms' : '150ms',
              transitionTimingFunction: 'ease-out'
            }}
          />
        </div>
      )}
    </div>
  )
}

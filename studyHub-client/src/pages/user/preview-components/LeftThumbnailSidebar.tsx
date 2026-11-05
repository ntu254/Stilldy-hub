import { useState, useRef, useEffect } from 'react'
import { Page } from 'react-pdf'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface LeftThumbnailSidebarProps {
  numPages: number
  currentPage: number
  setCurrentPage: (page: number) => void
  setTargetPage: (page: number) => void
  showSidebar: boolean
}

function ThumbnailItem({
  pageNum,
  isActive,
  onClick,
}: {
  pageNum: number
  isActive: boolean
  onClick: () => void
}) {
  const [isVisible, setIsVisible] = useState(false)
  const itemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = itemRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        })
      },
      {
        rootMargin: '250px', // Pre-load thumbnails 250px before they scroll into viewport
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <button
      ref={itemRef}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-200 w-full bg-white text-left cursor-pointer',
        isActive
          ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-md'
          : 'border-slate-200/60 hover:border-slate-300 hover:shadow-sm'
      )}
    >
      <div className="w-full pointer-events-none flex justify-center bg-slate-50 overflow-hidden rounded border border-slate-100 min-h-[140px] items-center">
        {isVisible ? (
          <Page
            pageNumber={pageNum}
            scale={0.15}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={
              <div className="w-[100px] h-[140px] bg-slate-100 animate-pulse flex flex-col items-center justify-center gap-1">
                <Skeleton className="h-2 w-12 rounded-sm" />
                <Skeleton className="h-2 w-8 rounded-sm" />
              </div>
            }
          />
        ) : (
          <div className="w-[100px] h-[140px] bg-slate-100/80 animate-pulse flex flex-col items-center justify-center gap-1 text-[10px] text-slate-400 font-medium">
            <span className="text-[10px] text-slate-400 font-semibold">Trang {pageNum}</span>
          </div>
        )}
      </div>
      <span
        className={cn(
          'text-[10px] font-bold text-center w-full',
          isActive ? 'text-indigo-600' : 'text-slate-500'
        )}
      >
        Trang {pageNum}
      </span>
    </button>
  )
}

export default function LeftThumbnailSidebar({
  numPages,
  currentPage,
  setCurrentPage,
  setTargetPage,
  showSidebar,
}: LeftThumbnailSidebarProps) {
  if (!showSidebar) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="hidden lg:flex flex-col gap-4 overflow-y-auto shrink-0 p-4 lg:col-span-2 h-full bg-white border-r border-slate-100"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">
          Trang ({numPages})
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: numPages }, (_, index) => {
          const pageNum = index + 1
          return (
            <ThumbnailItem
              key={pageNum}
              pageNum={pageNum}
              isActive={pageNum === currentPage}
              onClick={() => {
                setTargetPage(pageNum)
                setCurrentPage(pageNum)
              }}
            />
          )
        })}
      </div>
    </motion.div>
  )
}

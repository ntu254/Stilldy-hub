import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/animate-ui/components/animate/tooltip'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set up pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PdfViewerContainerProps {
  url: string
  numPages: number
  currentPage: number
  setCurrentPage: (page: number) => void
  targetPage: number | null
  onClearTargetPage: () => void
  fullscreen: boolean
  rotate: number
  searchQuery: string
}

// Escape special regex characters in user input
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function PdfSinglePageItem({
  pageNum,
  scale,
  rotate,
  containerWidth,
  searchQuery,
  customTextRenderer,
  estimatedWidth,
  estimatedHeight,
  onPageRenderedSuccess,
}: {
  pageNum: number
  scale: number
  rotate: number
  containerWidth?: number
  searchQuery: string
  customTextRenderer?: (textItem: { str: string }) => string
  estimatedWidth: number
  estimatedHeight: number
  onPageRenderedSuccess: (page: any) => void
}) {
  const [isCanvasReady, setIsCanvasReady] = useState(false)

  useEffect(() => {
    setIsCanvasReady(false)
  }, [scale, rotate, pageNum])

  return (
    <div className="relative w-fit mx-auto overflow-hidden shadow-xl bg-white">
      {/* Skeleton overlay until canvas rendering completes 100% */}
      {!isCanvasReady && (
        <div
          style={{ height: estimatedHeight, width: estimatedWidth || 600 }}
          className="absolute inset-0 z-10 bg-white p-8 animate-pulse flex flex-col space-y-4 min-h-[500px] pointer-events-none"
        >
          <div className="h-6 bg-slate-200/80 w-3/4" />
          <div className="h-4 bg-slate-100 w-full" />
          <div className="h-4 bg-slate-100 w-11/12" />
          <div className="h-4 bg-slate-100 w-4/5" />
          <div className="h-44 bg-slate-100 my-4" />
          <div className="h-4 bg-slate-100 w-full" />
          <div className="h-4 bg-slate-100 w-2/3" />
        </div>
      )}

      <Page
        pageNumber={pageNum}
        scale={scale}
        rotate={rotate}
        width={containerWidth}
        renderTextLayer
        renderAnnotationLayer
        customTextRenderer={searchQuery ? customTextRenderer : undefined}
        onRenderSuccess={(page) => {
          setIsCanvasReady(true)
          onPageRenderedSuccess(page)
        }}
      />
    </div>
  )
}

export default function PdfViewerContainer({
  url,
  numPages,
  currentPage,
  setCurrentPage,
  targetPage,
  onClearTargetPage,
  fullscreen,
  rotate,
  searchQuery,
}: PdfViewerContainerProps) {
  const [pageInputVal, setPageInputVal] = useState('1')
  const [scale, setScale] = useState(1.2)
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  // Lazy / Virtual Rendering States & Cache
  const [renderedPages, setRenderedPages] = useState<Set<number>>(
    () => new Set([1, 2, 3])
  )
  const pageSizeCache = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    const BUFFER = 3
    const next = new Set<number>()
    for (let p = Math.max(1, currentPage - BUFFER); p <= Math.min(numPages, currentPage + BUFFER); p++) {
      next.add(p)
    }
    setRenderedPages(next)
  }, [currentPage, numPages])

  useEffect(() => {
    pageSizeCache.current.clear()
  }, [scale, rotate, containerWidth])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setContainerWidth(window.innerWidth)
      } else {
        setContainerWidth(undefined)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const isJumpingRef = useRef(false)
  const jumpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep track of current page in a ref to avoid observer teardown on every page change
  const currentPageRef = useRef(currentPage)
  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  // Reset to page 1 when URL changes
  useEffect(() => {
    setCurrentPage(1)
    setPageInputVal('1')
  }, [url, setCurrentPage])

  // Sync page input value with scroll page changes
  useEffect(() => {
    setPageInputVal(currentPage.toString())
  }, [currentPage])

  const jumpToPage = useCallback((pageNum: number) => {
    if (pageNum < 1 || pageNum > numPages) return
    const targetEl = containerRef.current?.querySelector(`[data-page-number="${pageNum}"]`)
    if (targetEl) {
      isJumpingRef.current = true
      setCurrentPage(pageNum)
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      
      if (jumpTimeoutRef.current) {
        clearTimeout(jumpTimeoutRef.current)
      }
      jumpTimeoutRef.current = setTimeout(() => {
        isJumpingRef.current = false
      }, 1000)
    }
  }, [numPages, setCurrentPage])

  // Scroll event handler to reset/release jumping lock after scrolling settles
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let scrollTimeout: ReturnType<typeof setTimeout>
    const handleScroll = () => {
      if (isJumpingRef.current) {
        clearTimeout(scrollTimeout)
        if (jumpTimeoutRef.current) {
          clearTimeout(jumpTimeoutRef.current)
        }
        scrollTimeout = setTimeout(() => {
          isJumpingRef.current = false
        }, 150)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
      if (jumpTimeoutRef.current) {
        clearTimeout(jumpTimeoutRef.current)
      }
    }
  }, [])

  // Scroll to target page when updated by parent
  useEffect(() => {
    if (targetPage !== null) {
      jumpToPage(targetPage)
      onClearTargetPage()
    }
  }, [targetPage, jumpToPage, onClearTargetPage])

  const goToPrev = () => {
    const target = Math.max(1, currentPage - 1)
    jumpToPage(target)
  }

  const goToNext = () => {
    const target = Math.min(numPages, currentPage + 1)
    jumpToPage(target)
  }

  const handlePageInputSubmit = () => {
    const parsed = parseInt(pageInputVal, 10)
    if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
      jumpToPage(parsed)
    } else {
      setPageInputVal(currentPage.toString())
    }
  }

  // Scroll spy to update the current page view indicator
  useEffect(() => {
    if (numPages === 0 || !containerRef.current) return

    const observerOptions = {
      root: containerRef.current,
      rootMargin: '0px',
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
    }

    const pageElements = containerRef.current.querySelectorAll('[data-page-number]')
    const visiblePages = new Map<number, IntersectionObserverEntry>()

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const pageNum = parseInt(entry.target.getAttribute('data-page-number') || '0', 10)
        if (pageNum > 0) {
          if (entry.isIntersecting) {
            visiblePages.set(pageNum, entry)
          } else {
            visiblePages.delete(pageNum)
          }
        }
      })

      if (visiblePages.size > 0 && !isJumpingRef.current) {
        let bestPage = currentPageRef.current
        let minDistance = Infinity

        visiblePages.forEach((entry, pageNum) => {
          const rootTop = entry.rootBounds ? entry.rootBounds.top : (containerRef.current?.getBoundingClientRect().top || 0)
          const relativeTop = entry.boundingClientRect.top - rootTop
          const distance = Math.abs(relativeTop - 100)
          if (distance < minDistance) {
            minDistance = distance
            bestPage = pageNum
          }
        })

        if (bestPage !== currentPageRef.current) {
          setCurrentPage(bestPage)
        }
      }
    }, observerOptions)

    pageElements.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
    }
  }, [numPages, scale, setCurrentPage, fullscreen])

  const zoomIn  = () => setScale(s => Math.min(3, parseFloat((s + 0.25).toFixed(2))))
  const zoomOut = () => setScale(s => Math.max(0.5, parseFloat((s - 0.25).toFixed(2))))
  const zoomReset = () => setScale(1.2)

  const progressPercent = numPages > 0 ? (currentPage / numPages) * 100 : 0

  // Search highlight renderer for the text layer
  const customTextRenderer = useCallback(
    (textItem: { str: string }) => {
      if (!searchQuery) return textItem.str
      const escaped = escapeRegex(searchQuery)
      return textItem.str.replace(
        new RegExp(`(${escaped})`, 'gi'),
        '<mark style="background-color:#fde68a;color:#1e293b;border-radius:2px;padding:0 1px">$1</mark>'
      )
    },
    [searchQuery]
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0 bg-slate-200">
      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="hidden lg:flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100 shrink-0">
        {/* Zoom */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={zoomOut} disabled={scale <= 0.5}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Thu nhỏ</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={zoomReset}
                className="px-2 h-7 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition-all tabular-nums">
                {Math.round(scale * 100)}%
              </button>
            </TooltipTrigger>
            <TooltipContent>Đặt lại zoom</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={zoomIn} disabled={scale >= 3}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Phóng to</TooltipContent>
          </Tooltip>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={goToPrev} disabled={currentPage <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-all">
                <ChevronLeft className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Trang trước</TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <input
              type="text"
              value={pageInputVal}
              onChange={(e) => {
                const cleanVal = e.target.value.replace(/[^0-9]/g, '')
                setPageInputVal(cleanVal)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePageInputSubmit()
                }
              }}
              onBlur={handlePageInputSubmit}
              className="w-10 text-center text-xs font-bold text-indigo-600 bg-transparent border-0 outline-none p-0.5 focus:ring-0 focus:outline-none"
              disabled={numPages <= 0}
            />
            <span className="text-[10px] text-slate-300 font-medium">/</span>
            <span className="text-xs font-semibold text-slate-400">{numPages || '--'}</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={goToNext} disabled={currentPage >= numPages}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-all">
                <ChevronRight className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Trang tiếp</TooltipContent>
          </Tooltip>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 min-w-[80px]">
          <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-400 tabular-nums shrink-0">
            {Math.round(progressPercent)}%
          </span>
        </div>
      </div>

      {/* ── PDF Canvas Area ──────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-200 flex items-start py-6"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
      >
        <div className="flex flex-col items-center gap-6 min-w-full w-fit">
          {Array.from({ length: numPages }, (_, index) => {
            const pageNum = index + 1
            const isRendered = renderedPages.has(pageNum)
            const isRotated = rotate === 90 || rotate === 270
            const cachedHeight = pageSizeCache.current.get(pageNum)
            
            const estimatedWidth = containerWidth ?? scale * 595
            const estimatedHeight = cachedHeight ?? (containerWidth 
              ? containerWidth * (isRotated ? 595 / 842 : 842 / 595)
              : scale * (isRotated ? 595 : 842))

            return (
              <div
                key={pageNum}
                data-page-number={pageNum}
                className="w-fit mx-auto"
                style={!isRendered ? { height: estimatedHeight, width: estimatedWidth } : undefined}
              >
                {isRendered ? (
                  <PdfSinglePageItem
                    pageNum={pageNum}
                    scale={scale}
                    rotate={rotate}
                    containerWidth={containerWidth}
                    searchQuery={searchQuery}
                    customTextRenderer={searchQuery ? customTextRenderer : undefined}
                    estimatedWidth={estimatedWidth}
                    estimatedHeight={estimatedHeight}
                    onPageRenderedSuccess={(page) => {
                      pageSizeCache.current.set(pageNum, page.height)
                    }}
                  />
                ) : (
                  <div
                    style={{ height: estimatedHeight, width: estimatedWidth }}
                    className="bg-white p-8 animate-pulse flex flex-col space-y-4 shadow-xs min-h-[500px]"
                  >
                    <div className="h-6 bg-slate-200/80 w-3/4" />
                    <div className="h-4 bg-slate-100 w-full" />
                    <div className="h-4 bg-slate-100 w-11/12" />
                    <div className="h-4 bg-slate-100 w-4/5" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

     
    </div>
  )
}

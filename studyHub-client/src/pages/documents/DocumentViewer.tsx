import { getApiUrl } from '@/lib/api'
import DocxViewerContainer from './DocxViewerContainer'
import ImageViewerContainer from './ImageViewerContainer'
import PdfViewerContainer from './PdfViewerContainer'
import PptxViewerContainer from './PptxViewerContainer'

interface DocumentViewerProps {
  fileId: string
  fileName: string
  fileType: string // original extension, e.g., 'pdf', 'docx', 'pptx', 'png', 'jpg', 'jpeg'
  // PDF Viewer container props
  numPages: number
  currentPage: number
  setCurrentPage: (page: number) => void
  targetPage: number | null
  onClearTargetPage: () => void
  fullscreen: boolean
  rotate: number
  searchQuery: string
  // Image Viewer zoom props
  imageScale?: number
  setImageScale?: (scale: number | ((s: number) => number)) => void
  imagePosition?: { x: number; y: number }
  setImagePosition?: (
    pos: { x: number; y: number } | ((p: { x: number; y: number }) => { x: number; y: number }),
  ) => void
}

export default function DocumentViewer({
  fileId,
  fileName,
  fileType,
  numPages,
  currentPage,
  setCurrentPage,
  targetPage,
  onClearTargetPage,
  fullscreen,
  rotate,
  searchQuery,
  imageScale,
  setImageScale,
  imagePosition,
  setImagePosition,
}: DocumentViewerProps) {
  const ext = fileType.toLowerCase()
  const apiUrl = getApiUrl(`/documents/${fileId}/file`)

  // 1. PDF
  if (ext === 'pdf') {
    return (
      <PdfViewerContainer
        url={apiUrl}
        numPages={numPages}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        targetPage={targetPage}
        onClearTargetPage={onClearTargetPage}
        fullscreen={fullscreen}
        rotate={rotate}
        searchQuery={searchQuery}
      />
    )
  }

  // 2. Images
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    return (
      <ImageViewerContainer
        fileId={fileId}
        fileName={fileName}
        scale={imageScale || 1}
        setScale={setImageScale as any}
        position={imagePosition || { x: 0, y: 0 }}
        setPosition={setImagePosition as any}
      />
    )
  }

  // 3. DOCX
  if (ext === 'docx') {
    return <DocxViewerContainer fileId={fileId} />
  }

  // 4. PPTX
  if (ext === 'pptx') {
    return <PptxViewerContainer fileId={fileId} />
  }

  // Fallback - Default iframe or other formats
  return (
    <div className='flex-1 min-h-[500px] w-full h-full bg-slate-100'>
      <iframe
        src={apiUrl}
        width='100%'
        height='100%'
        className='border-none w-full h-full min-h-[600px]'
        title='Document Preview'
      />
    </div>
  )
}

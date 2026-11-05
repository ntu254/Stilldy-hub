import DocxPreviewSkeleton from './DocxPreviewSkeleton'
import ImagePreviewSkeleton from './ImagePreviewSkeleton'
import PdfPreviewSkeleton from './PdfPreviewSkeleton'

interface PreviewSkeletonProps {
  fileType?: string
}

export default function PreviewSkeleton({ fileType }: PreviewSkeletonProps) {
  const ext = fileType ? fileType.toLowerCase() : ''

  // 1. PDF gets 3-column layout (with left thumbnail skeleton)
  if (ext === 'pdf') {
    return <PdfPreviewSkeleton />
  }

  // 2. Images get 2-column layout (no left thumbnail skeleton)
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'img'].includes(ext)) {
    return <ImagePreviewSkeleton />
  }

  // 3. DOCX and default fallback get 2-column layout (no left thumbnail skeleton)
  return <DocxPreviewSkeleton />
}

export { PdfPreviewSkeleton, DocxPreviewSkeleton, ImagePreviewSkeleton }

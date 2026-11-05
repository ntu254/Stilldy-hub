import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useDropzone } from 'react-dropzone'
import { Dialog, DialogBackdrop, DialogPanel } from '@/components/animate-ui/primitives/headless/dialog'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Plus,
  BookOpen,
  Tag,
  Eye,
  Loader2,
  HardDrive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { documentService } from '@/services/documentService'
import { categoryService } from '@/services/categoryService'
import StorageUpgradeModal from './StorageUpgradeModal'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess?: () => void
}

type UploadState = 'idle' | 'meta-form' | 'uploading' | 'completed' | 'error'

interface Category {
  _id: string
  name: string
}

export default function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const navigate = useNavigate()

  // State Management
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [createdDocId, setCreatedDocId] = useState<string | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  // Categories from API
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)

  // Form Fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // Fetch categories khi modal mở
  useEffect(() => {
    if (isOpen && categories.length === 0) {
      const fetchCategories = async () => {
        try {
          setCategoriesLoading(true)
          const data = await categoryService.getAll()
          setCategories(data)
          if (data.length > 0) setSubject(data[0]._id)
        } catch {
          // Silently fail
        } finally {
          setCategoriesLoading(false)
        }
      }
      fetchCategories()
    }
  }, [isOpen])

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setSelectedFile(file)
      // Pre-fill Title input (removing extension)
      const cleanName = file.name.replace(/\.[^/.]+$/, '')
      setTitle(cleanName)
      // Auto tag based on file extension
      const ext = file.name.split('.').pop()?.toUpperCase()
      setTags(ext ? [ext] : [])
      setUploadState('meta-form')
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'text/plain': ['.txt'],
    },
    multiple: false,
  })

  const resetModal = () => {
    setUploadState('idle')
    setSelectedFile(null)
    setProgress(0)
    setUploadError('')
    setCreatedDocId(null)
    setTitle('')
    setDescription('')
    setSubject(categories.length > 0 ? categories[0]._id : '')
    setTagInput('')
    setTags([])
    onClose()
  }

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim() === '' || !selectedFile || !subject) return

    try {
      setUploadState('uploading')
      setProgress(0)
      setUploadError('')

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', title.trim())
      formData.append('subjectId', subject)
      if (description.trim()) {
        formData.append('description', description.trim())
      }
      if (tags.length > 0) {
        tags.forEach((tag) => formData.append('tags', tag))
      }

      // Gọi API upload thực tế với Axios theo dõi tiến trình % thực sự
      const result = await documentService.upload(formData, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          // Giới hạn tối đa 99% cho đến khi response trả về hoàn tất
          setProgress(Math.min(percent, 99))
        }
      })

      setProgress(100)
      const docId = result?.data?._id || result?._id || null
      setCreatedDocId(docId)

      setUploadState('completed')

      // Notify parent to refresh
      onUploadSuccess?.()
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi upload tài liệu.'
      setUploadError(errMsg)
      setUploadState('error')
    }
  }

  const handleViewPreview = () => {
    const docId = createdDocId || 'doc-1'
    resetModal()
    navigate(`/preview/${docId}`)
  }

  return (
    <>
      <Dialog open={isOpen} onClose={resetModal} className='relative z-50'>
        {/* Backdrop */}
        <DialogBackdrop className='fixed inset-0 bg-slate-900/40 backdrop-blur-sm' />

        {/* Centering wrapper */}
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          {/* Panel — no extra styles to avoid animation conflicts */}
          <DialogPanel>
            {/* Inner styled container */}
            <div className='relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-100/50'>
              {/* Header */}
              <div className='flex items-center justify-between pb-4 border-b border-slate-100 shrink-0'>
                <div className='flex items-center gap-2'>
                  <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600'>
                    <Sparkles className='h-4 w-4' />
                  </div>
                  <h3 className='text-sm font-extrabold text-slate-900'>Upload tài liệu học tập</h3>
                </div>
                <button
                  onClick={resetModal}
                  className='rounded-xl p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors'
                  aria-label='Close modal'
                >
                  <X className='h-4 w-4' />
                </button>
              </div>

              {/* Content Area */}
              <div className='mt-5 max-h-[75vh] overflow-y-auto pr-1'>
                {/* State 1: Dropzone Upload */}
                {uploadState === 'idle' && (
                  <UploadDropzone
                    getRootProps={getRootProps}
                    getInputProps={getInputProps}
                    isDragActive={isDragActive}
                  />
                )}

                {/* State 2: Document Info Form */}
                {uploadState === 'meta-form' && selectedFile && (
                  <DocumentMetaForm
                    fileName={selectedFile.name}
                    fileSize={(selectedFile.size / 1024).toFixed(1) + ' KB'}
                    title={title}
                    setTitle={setTitle}
                    description={description}
                    setDescription={setDescription}
                    subject={subject}
                    setSubject={setSubject}
                    categories={categories}
                    categoriesLoading={categoriesLoading}
                    tagInput={tagInput}
                    setTagInput={setTagInput}
                    tags={tags}
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                    onSubmit={handleStartUpload}
                    onCancel={() => setUploadState('idle')}
                  />
                )}

                {/* State 3: Upload Progress */}
                {uploadState === 'uploading' && selectedFile && (
                  <UploadProgress title={title} fileSize={(selectedFile.size / 1024).toFixed(1) + ' KB'} />
                )}

                {/* State: Error */}
                {uploadState === 'error' && (
                  <div className='flex flex-col items-center justify-center py-6 text-center'>
                    {uploadError.includes('Vượt giới hạn dung lượng') ? (
                      <>
                        <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 border border-amber-100/50 shadow-xs'>
                          <HardDrive className='h-7 w-7' />
                        </div>
                        <h4 className='mt-4 text-base font-extrabold text-slate-900'>Vượt giới hạn dung lượng!</h4>
                        <p className='mt-2 text-xs text-amber-700 max-w-sm leading-normal font-semibold bg-amber-50/50 border border-amber-100/50 rounded-xl p-3.5 text-left'>
                          {uploadError}
                        </p>
                        <div className='mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full'>
                          <Button
                            onClick={() => setUpgradeOpen(true)}
                            className='rounded-xl w-full bg-slate-900 text-white font-bold h-10 text-xs shadow-md shadow-slate-900/10 transition-all'
                          >
                            Xem gói nâng cấp
                          </Button>
                          <Button
                            onClick={resetModal}
                            variant='outline'
                            className='rounded-xl w-full border-slate-200 text-slate-700 font-semibold h-10 text-xs shadow-sm transition-all'
                          >
                            Đóng
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className='flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500'>
                          <AlertCircle className='h-8 w-8' />
                        </div>
                        <h4 className='mt-4 text-base font-extrabold text-slate-900'>Upload thất bại!</h4>
                        <p className='mt-1.5 text-xs text-red-500 max-w-sm leading-normal'>{uploadError}</p>
                        <div className='mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full'>
                          <Button
                            onClick={() => setUploadState('meta-form')}
                            className='rounded-xl w-full bg-slate-900 text-white font-bold h-10 text-xs shadow-md shadow-slate-900/10 transition-all'
                          >
                            Thử lại
                          </Button>
                          <Button
                            onClick={resetModal}
                            variant='outline'
                            className='rounded-xl w-full border-slate-200 text-slate-700 font-semibold h-10 text-xs shadow-sm transition-all'
                          >
                            Đóng
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* State: Completion */}
                {uploadState === 'completed' && (
                  <div className='flex flex-col items-center justify-center py-6 text-center'>
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                      className='flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500'
                    >
                      <CheckCircle2 className='h-8 w-8' />
                    </motion.div>

                    <h4 className='mt-4 text-base font-extrabold text-slate-900'>Upload thành công!</h4>
                    <p className='mt-1.5 text-xs text-slate-500 max-w-sm leading-normal'>
                      Tài liệu <strong className='text-slate-800 font-semibold'>{title}</strong> đã được tải lên hệ
                      thống thành công.
                    </p>

                    <div className='mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full'>
                      <Button
                        onClick={handleViewPreview}
                        className='rounded-xl w-full bg-slate-900 text-white font-bold h-10 text-xs shadow-md shadow-slate-900/10 transition-all'
                      >
                        <Eye className='h-3.5 w-3.5 mr-1' /> Xem tài liệu
                      </Button>
                      <Button
                        onClick={resetModal}
                        variant='outline'
                        className='rounded-xl w-full border-slate-200 text-slate-700 font-semibold h-10 text-xs shadow-sm transition-all'
                      >
                        Đóng
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Note info (Only visible at idle/form state) */}
              {(uploadState === 'idle' || uploadState === 'meta-form') && (
                <div className='mt-5 flex items-start gap-2.5 rounded-xl bg-indigo-50/40 p-3.5 border border-indigo-100/50 text-[10px] text-indigo-900 leading-normal'>
                  <AlertCircle className='h-4 w-4 text-indigo-600 shrink-0 mt-0.5' />
                  <span>
                    <strong>Lưu ý:</strong> Hệ thống chấp nhận file .pdf, .docx, .pptx, .png, .jpg với dung lượng tối đa
                    25MB.
                  </span>
                </div>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
      <StorageUpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  )
}

// ─── Sub-component 1: Dropzone ──────────────────────────────────────────────
interface UploadDropzoneProps {
  getRootProps: any
  getInputProps: any
  isDragActive: boolean
}
function UploadDropzone({ getRootProps, getInputProps, isDragActive }: UploadDropzoneProps) {
  return (
    <div
      {...getRootProps()}
      className={cn(
        'group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300',
        isDragActive
          ? 'border-indigo-500 bg-indigo-50/40 scale-[0.99]'
          : 'border-slate-200 hover:border-indigo-300 bg-slate-50/40 hover:bg-slate-50',
      )}
    >
      <input {...getInputProps()} />

      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300',
          isDragActive
            ? 'bg-indigo-600 text-white animate-bounce'
            : 'bg-white shadow-sm text-slate-500 group-hover:scale-105 group-hover:text-indigo-600',
        )}
      >
        <Upload className='h-5 w-5' />
      </div>

      <h4 className='mt-4 text-xs font-bold text-slate-800'>
        {isDragActive ? 'Thả tệp tin của bạn tại đây' : 'Kéo thả file tài liệu học tập vào đây'}
      </h4>
      <p className='mt-1.5 text-[10px] text-slate-400 font-medium'>
        PDF, Word, Excel, PowerPoint, Text hoặc hình ảnh bài tập
      </p>

      <div className='mt-5 flex items-center justify-center gap-1.5 w-full'>
        <div className='h-px w-8 bg-slate-200' />
        <span className='text-[9px] font-bold text-slate-400 uppercase tracking-wider'>Hoặc</span>
        <div className='h-px w-8 bg-slate-200' />
      </div>

      <Button
        size='sm'
        variant='outline'
        className='mt-4 rounded-xl text-xs font-semibold border-slate-200 shadow-sm pointer-events-none group-hover:border-indigo-200 group-hover:bg-indigo-50/20 group-hover:text-indigo-600 transition-all'
      >
        Chọn tệp từ thiết bị
      </Button>
    </div>
  )
}

// ─── Sub-component 2: Document Info Form ────────────────────────────────────
interface DocumentMetaFormProps {
  fileName: string
  fileSize: string
  title: string
  setTitle: (t: string) => void
  description: string
  setDescription: (d: string) => void
  subject: string
  setSubject: (s: string) => void
  categories: Category[]
  categoriesLoading: boolean
  tagInput: string
  setTagInput: (t: string) => void
  tags: string[]
  onAddTag: () => void
  onRemoveTag: (tag: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}
function DocumentMetaForm({
  fileName,
  fileSize,
  title,
  setTitle,
  description,
  setDescription,
  subject,
  setSubject,
  categories,
  categoriesLoading,
  tagInput,
  setTagInput,
  tags,
  onAddTag,
  onRemoveTag,
  onSubmit,
  onCancel,
}: DocumentMetaFormProps) {
  return (
    <form onSubmit={onSubmit} className='flex flex-col gap-4 text-slate-700'>
      {/* File badge details */}
      <div className='flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3'>
        <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0'>
          <FileText className='h-4.5 w-4.5' />
        </div>
        <div className='min-w-0 flex-1'>
          <p className='text-xs font-bold text-slate-800 truncate'>{fileName}</p>
          <p className='text-[10px] text-slate-400 mt-0.5'>{fileSize}</p>
        </div>
      </div>

      {/* Title Field */}
      <div className='flex flex-col gap-1.5'>
        <label
          htmlFor='doc-title'
          className='text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1'
        >
          Tên tài liệu <span className='text-rose-500'>*</span>
        </label>
        <input
          id='doc-title'
          type='text'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Nhập tên tài liệu học tập...'
          required
          className='h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100/50 transition-all outline-none'
        />
      </div>

      {/* Description Field */}
      <div className='flex flex-col gap-1.5'>
        <label
          htmlFor='doc-description'
          className='text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1'
        >
          Mô tả
        </label>
        <textarea
          id='doc-description'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder='Mô tả ngắn gọn về tài liệu...'
          rows={2}
          className='px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100/50 transition-all outline-none resize-none'
        />
      </div>

      {/* Subject Selector Field */}
      <div className='flex flex-col gap-1.5'>
        <label
          htmlFor='doc-subject'
          className='text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1'
        >
          <BookOpen className='h-3 w-3' /> Môn học liên quan <span className='text-rose-500'>*</span>
        </label>
        {categoriesLoading ? (
          <div className='flex items-center gap-2 h-9 px-3.5 text-xs text-slate-400'>
            <Loader2 className='h-3 w-3 animate-spin' /> Đang tải danh mục...
          </div>
        ) : (
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger
              id='doc-subject'
              className='h-9 px-3.5 bg-white text-xs font-normal border-slate-200 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100/50 transition-all outline-none'
            >
              <SelectValue placeholder='Chọn môn học...'>
                {categories.find((cat) => cat._id === subject)?.name || 'Chọn môn học...'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat._id} value={cat._id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Dynamic Tags Input Field */}
      <div className='flex flex-col gap-1.5'>
        <label
          htmlFor='doc-tags'
          className='text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1'
        >
          <Tag className='h-3 w-3' /> Từ khóa / Tags
        </label>
        <div className='flex gap-2'>
          <input
            id='doc-tags'
            type='text'
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onAddTag()
              }
            }}
            placeholder='Nhập tag ôn tập (ví dụ: SQL) rồi ấn Enter...'
            className='h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100/50 transition-all flex-1 outline-none'
          />
          <button
            type='button'
            onClick={onAddTag}
            className='flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:scale-102 transition-all shrink-0'
          >
            <Plus className='h-4 w-4' />
          </button>
        </div>

        {/* Tags list (Chips) */}
        {tags.length > 0 && (
          <div className='flex flex-wrap gap-1 mt-2'>
            {tags.map((tag) => (
              <span
                key={tag}
                className='inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-100/60 px-2 py-0.5 text-[9px] font-bold text-indigo-600'
              >
                {tag}
                <button
                  type='button'
                  onClick={() => onRemoveTag(tag)}
                  className='rounded-full p-0.5 hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700 transition-colors'
                >
                  <X className='h-2.5 w-2.5' />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Form Action buttons */}
      <div className='mt-4 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5'>
        <button
          type='button'
          onClick={onCancel}
          className='rounded-xl px-4 h-9 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors'
        >
          Hủy bỏ
        </button>
        <Button
          type='submit'
          disabled={title.trim() === '' || !subject}
          className='rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-5 text-xs shadow-md shadow-indigo-600/10 transition-all'
        >
          Bắt đầu tải lên
        </Button>
      </div>
    </form>
  )
}

// ─── Sub-component 3: Upload Progress ───────────────────────────────────────
interface UploadProgressProps {
  title: string
  fileSize: string
}
function UploadProgress({ title, fileSize }: UploadProgressProps) {
  return (
    <div className='flex flex-col items-center justify-center py-8 text-center text-slate-700 space-y-4'>
      <div className='relative flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50/80 text-indigo-600 ring-8 ring-indigo-50/40'>
        <Loader2 className='h-8 w-8 animate-spin text-indigo-600 shrink-0' />
      </div>

      <div className='space-y-1'>
        <h4 className='text-sm font-bold text-slate-800 max-w-[280px] truncate mx-auto' title={title}>
          {title}
        </h4>
        <p className='text-xs text-slate-400 font-semibold'>{fileSize}</p>
      </div>

      <div className='flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100/60 px-4 py-2 rounded-xl'>
        <Loader2 className='h-4 w-4 animate-spin text-indigo-600 shrink-0' />
        <span>Đang truyền tải tài nguyên lên máy chủ...</span>
      </div>
    </div>
  )
}

// ─── Sub-component 4: AI Analysis Steps ──────────────────────────────────────
/*
interface AiAnalysisStepsProps {
  steps: string[]
  currentStep: number
}
function AiAnalysisSteps({ steps, currentStep }: AiAnalysisStepsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-slate-700">
      <div className="relative">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <FolderSync className="h-6 w-6 animate-spin" />
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white shadow-sm shadow-purple-500/30">
          <Sparkles className="h-3 w-3" />
        </div>
      </div>

      <h4 className="mt-5 text-xs font-bold text-slate-800">
        AI Nexus Engine đang phân tích học tập
      </h4>

      <div className="mt-5 w-full max-w-sm rounded-2xl bg-slate-50 p-4 border border-slate-100">
        <ul className="space-y-3">
          {steps.map((step, idx) => {
            const isDone = currentStep > idx
            const isCurrent = currentStep === idx
            return (
              <motion.li
                key={idx}
                initial={{ opacity: 0.3 }}
                animate={{
                  opacity: isDone ? 0.6 : isCurrent ? 1 : 0.3,
                  scale: isCurrent ? 1.01 : 1,
                }}
                className={cn(
                  'flex items-center gap-3 text-[11px]',
                  isCurrent ? 'font-bold text-slate-900' : 'text-slate-500'
                )}
              >
                <div className="flex shrink-0 items-center justify-center">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : isCurrent ? (
                    <div className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  )}
                </div>
                <span className="truncate">{step}</span>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
*/

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileJson,
  FileArchive,
  User,
  Calendar,
  HardDrive,
  X,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  AlertTriangle,
  Flag,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import DocPagination from '@/pages/documents/DocPagination'

export interface FileItem {
  id: string
  title: string
  uploader: string
  uploadDate: string
  size: string
  type: 'pdf' | 'pptx' | 'docx' | 'zip'
}

export interface Category {
  _id: string
  name: string
}

interface FileManagementTableProps {
  files: FileItem[]
  onDeleteFile: (fileId: string) => void
  onRejectReport: (fileId: string) => void
  onPreviewDoc: (fileId: string) => void
  onViewReports?: (fileId: string) => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  totalItems: number
  subjectId: string
  onSubjectIdChange: (id: string) => void
  isPublicFilter: 'all' | 'true' | 'false'
  onIsPublicFilterChange: (status: 'all' | 'true' | 'false') => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  categories: Category[]
}

export default function FileManagementTable({
  files,
  onDeleteFile,
  onRejectReport,
  onPreviewDoc,
  onViewReports,
  currentPage,
  totalPages,
  onPageChange,
  searchQuery,
  onSearchQueryChange,
  totalItems,
  subjectId,
  onSubjectIdChange,
  isPublicFilter,
  onIsPublicFilterChange,
  sortBy,
  sortOrder,
  onSortChange,
  categories,
}: FileManagementTableProps) {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const renderSortHeader = (title: string, columnKey: string, widthClass?: string, center?: boolean, right?: boolean) => {
    return (
      <th className={cn("px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap", widthClass, center && "text-center", right && "text-right")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className={cn("flex items-center gap-1 cursor-pointer hover:text-slate-700 transition-colors", center ? "justify-center" : "", right ? "justify-end" : "")}>
              {title}
              <ChevronDown strokeWidth={3} className={cn("h-3 w-3", sortBy === columnKey ? "text-indigo-500" : "text-slate-400")} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={center ? "center" : right ? "end" : "start"} className="w-36">
            <DropdownMenuLabel>SẮP XẾP</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={sortBy === columnKey && sortOrder === 'asc'}
              onCheckedChange={() => onSortChange?.(columnKey, 'asc')}
            >
              Tăng dần
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortBy === columnKey && sortOrder === 'desc'}
              onCheckedChange={() => onSortChange?.(columnKey, 'desc')}
            >
              Giảm dần
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </th>
    )
  }

  const getFileIcon = (type: FileItem['type']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-rose-500 shrink-0" />
      case 'pptx':
        return <FileSpreadsheet className="h-4 w-4 text-orange-500 shrink-0" />
      case 'docx':
        return <FileSpreadsheet className="h-4 w-4 text-blue-500 shrink-0" />
      case 'zip':
        return <FileArchive className="h-4 w-4 text-indigo-500 shrink-0" />
      default:
        return <FileJson className="h-4 w-4 text-slate-500 shrink-0" />
    }
  }

  const handleDeleteClick = (file: FileItem) => {
    setSelectedFile(file)
    setIsConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (selectedFile) {
      onDeleteFile(selectedFile.id)
      setIsConfirmOpen(false)
      setSelectedFile(null)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* ─── SEARCH & FILTER CONTAINER ─────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Tìm theo tên file hoặc người tải lên..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-800 bg-slate-50/30 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 outline-none transition-all"
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 shrink-0">
            {/* Filter Subject */}
            <select
              value={subjectId}
              onChange={(e) => onSubjectIdChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 bg-slate-50/30 outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="">Tất cả môn học</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Filter Public Status */}
            <select
              value={isPublicFilter}
              onChange={(e) => onIsPublicFilterChange(e.target.value as 'all' | 'true' | 'false')}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 bg-slate-50/30 outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">Tất cả chế độ</option>
              <option value="true">Công khai (Public)</option>
              <option value="false">Riêng tư (Private)</option>
            </select>
          </div>

        </div>
      </div>

      {/* ─── FILE LIST DATA TABLE ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Responsive Horizontal Scroll wrapper */}
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên file học liệu</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-48">Người tải lên</th>
                {renderSortHeader('Ngày đăng', 'updatedAt', 'w-36')}
                {renderSortHeader('Kích thước', 'size', 'w-28')}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-56 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <AnimatePresence initial={false}>
                {files.length > 0 ? (
                  files.map((file) => (
                    <motion.tr
                      key={file.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* File Icon & Name */}
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 shrink-0 shadow-2xs">
                            {getFileIcon(file.type)}
                          </div>
                          <div className="min-w-0 max-w-[300px] md:max-w-[400px]">
                            <p className="truncate text-slate-800 font-semibold">{file.title}</p>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{file.type}</span>
                          </div>
                        </div>
                      </td>

                      {/* Uploader Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">{file.uploader}</span>
                        </div>
                      </td>

                      {/* Upload Date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{file.uploadDate}</span>
                        </div>
                      </td>

                      {/* File Size */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono font-medium">{file.size}</span>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            onClick={() => onPreviewDoc(file.id)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 rounded-lg text-[10px] font-bold h-7 py-0 px-2.5 border border-indigo-100 shadow-2xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1 shrink-0" />
                            Xem
                          </Button>
                          {onViewReports && (
                            <Button
                              onClick={() => onViewReports(file.id)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 rounded-lg text-[10px] font-bold h-7 py-0 px-2.5 border border-amber-100 shadow-2xs"
                            >
                              <Flag className="h-3 w-3 mr-1 shrink-0" />
                              Lý do
                            </Button>
                          )}
                          <Button
                            onClick={() => onRejectReport(file.id)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 rounded-lg text-[10px] font-bold h-7 py-0 px-2.5 border border-emerald-100 shadow-2xs"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />
                            Giữ lại
                          </Button>
                          <Button
                            onClick={() => handleDeleteClick(file)}
                            variant="destructive"
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg text-[10px] font-bold h-7 py-0 px-2.5 border border-rose-100 shadow-2xs"
                          >
                            <Trash2 className="h-3 w-3 mr-1 shrink-0" />
                            Xóa file
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                      Không tìm thấy file tài liệu nào
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-3 flex justify-between items-center text-[10px] text-slate-400 font-bold shrink-0">
          <span>TỔNG SỐ HỌC LIỆU: {files.length} TRÊN {totalItems} TỆP</span>
          <span>NEXUS CLOUD SYSTEM</span>
        </div>
      </div>

      {/* ─── PAGINATION CONTROLS ─────────────────────────────────────────── */}
      <div className="flex justify-center mt-6">
        <DocPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>

      {/* ─── CONFIRM DELETE WARNING DIALOG ──────────────────────────────────── */}
      <AnimatePresence>
        {isConfirmOpen && selectedFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            {/* Modal Overlay Background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmOpen(false)}
              className="absolute inset-0"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white border border-slate-100 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden z-10"
            >
              
              {/* Header Close */}
              <div className="absolute top-3.5 right-3.5">
                <button
                  onClick={() => setIsConfirmOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content Panel */}
              <div className="p-6 flex flex-col items-center text-center">
                
                <div className="flex h-12 w-12 items-center justify-center rounded-xl mb-4 bg-rose-50 text-rose-600 border border-rose-100 shadow-xs">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <h3 className="text-sm font-extrabold text-slate-900">
                  Xóa file học liệu này?
                </h3>
                
                <p className="text-slate-500 text-xs mt-2 leading-relaxed px-2">
                  Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu <strong>{selectedFile.title}</strong> này? Sinh viên đăng tải sẽ bị ghi nhận 1 lần vi phạm.
                </p>

                {/* Confirm Action buttons */}
                <div className="flex gap-2.5 w-full mt-6">
                  <Button
                    onClick={() => setIsConfirmOpen(false)}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-600 hover:text-slate-800 rounded-xl h-9 text-xs font-bold shadow-2xs"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    onClick={handleConfirmDelete}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-9 text-xs font-bold shadow-sm"
                  >
                    Xác nhận xóa
                  </Button>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

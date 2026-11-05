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
  HardDrive,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldAlert,
  EyeOff as SoftDeleteIcon,
  ChevronDown,
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

export interface DocumentItem {
  id: string
  title: string
  uploader: string
  uploadDate: string
  size: string
  type: 'pdf' | 'pptx' | 'docx' | 'zip' | string
  isPublic: boolean
  isDeleted?: boolean
  isReported?: boolean
}

export interface Category {
  _id: string
  name: string
}

interface DocumentManagementTableProps {
  documents: DocumentItem[]
  onDeleteDoc: (docId: string) => void        // Soft delete: _destroy = true
  onHardDeleteDoc: (docId: string) => void    // Hard delete: xóa sạch DB + Cloud
  onPreviewDoc: (docId: string) => void
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
  fileTypeFilter: 'all' | 'pdf' | 'docx' | 'pptx' | 'zip'
  onFileTypeFilterChange: (type: 'all' | 'pdf' | 'docx' | 'pptx' | 'zip') => void
  isLoading?: boolean
}

export default function DocumentManagementTable({
  documents,
  onDeleteDoc,
  onHardDeleteDoc,
  onPreviewDoc,
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
  fileTypeFilter,
  onFileTypeFilterChange,
  isLoading = false,
}: DocumentManagementTableProps) {
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  // Step 1: picker dialog (choose delete type)
  const [isDeletePickerOpen, setIsDeletePickerOpen] = useState(false)
  // Step 2a: soft delete confirm dialog
  const [isSoftConfirmOpen, setIsSoftConfirmOpen] = useState(false)
  // Step 2b: hard delete confirm dialog
  const [isHardConfirmOpen, setIsHardConfirmOpen] = useState(false)

  const renderSortHeader = (title: string, columnKey: string, widthClass?: string, center?: boolean) => {
    return (
      <th className={cn("px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap select-none", widthClass, center && "text-center")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className={cn("flex items-center gap-1 cursor-pointer hover:text-slate-700 transition-colors", center ? "justify-center" : "")}>
              {title}
              <ChevronDown strokeWidth={3} className={cn("h-3 w-3", sortBy === columnKey ? "text-indigo-500" : "text-slate-400")} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={center ? "center" : "start"} className="w-36">
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

  const getFileIcon = (type: DocumentItem['type']) => {
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

  // Open the picker popup
  const handleDeleteClick = (doc: DocumentItem) => {
    setSelectedDoc(doc)
    setIsDeletePickerOpen(true)
  }

  // From picker → choose soft delete
  const chooseSoftDelete = () => {
    setIsDeletePickerOpen(false)
    setIsSoftConfirmOpen(true)
  }

  // From picker → choose hard delete
  const chooseHardDelete = () => {
    setIsDeletePickerOpen(false)
    setIsHardConfirmOpen(true)
  }

  const closeAll = () => {
    setIsDeletePickerOpen(false)
    setIsSoftConfirmOpen(false)
    setIsHardConfirmOpen(false)
    setSelectedDoc(null)
  }

  const handleConfirmSoftDelete = () => {
    if (selectedDoc) {
      onDeleteDoc(selectedDoc.id)
      closeAll()
    }
  }

  const handleConfirmHardDelete = () => {
    if (selectedDoc) {
      onHardDeleteDoc(selectedDoc.id)
      closeAll()
    }
  }

  return (
    <div className="space-y-6">

      {/* ─── SEARCH & FILTER CONTAINER ──────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Tìm tên tài liệu, người tải, email..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-800 bg-slate-50/30 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 outline-none transition-all"
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 shrink-0">
            <select
              value={subjectId}
              onChange={(e) => onSubjectIdChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 bg-slate-50/30 outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="">Tất cả môn học</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>

            <select
              value={isPublicFilter}
              onChange={(e) => onIsPublicFilterChange(e.target.value as 'all' | 'true' | 'false')}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 bg-slate-50/30 outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">Tất cả chế độ</option>
              <option value="true">Công khai (Public)</option>
              <option value="false">Riêng tư (Private)</option>
            </select>

            <select
              value={fileTypeFilter}
              onChange={(e) => onFileTypeFilterChange(e.target.value as any)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 bg-slate-50/30 outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">Tất cả định dạng</option>
              <option value="pdf">PDF</option>
              <option value="docx">Word (DOCX)</option>
              <option value="pptx">PowerPoint (PPTX)</option>
              <option value="zip">ZIP/RAR</option>
            </select>

            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('_')
                if (newSortBy && newSortOrder) {
                  onSortChange?.(newSortBy, newSortOrder as 'asc' | 'desc')
                }
              }}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 bg-slate-50/30 outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="updatedAt_desc">Mới cập nhật</option>
              <option value="updatedAt_asc">Cũ nhất</option>
              <option value="createdAt_desc">Mới tải lên</option>
              <option value="viewCount_desc">Xem nhiều nhất</option>
              <option value="downloadCount_desc">Tải nhiều nhất</option>
              <option value="size_desc">Dung lượng lớn nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── DATA TABLE ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">Tên tài liệu</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-40 select-none">Người tải lên</th>
                {renderSortHeader('Kích thước', 'size', 'w-28')}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-28 select-none">Trạng thái</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-64 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <AnimatePresence initial={false}>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-slate-100" />
                          <div className="space-y-1.5">
                            <div className="h-2.5 w-48 rounded bg-slate-100" />
                            <div className="h-2 w-10 rounded bg-slate-100" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><div className="h-2.5 w-24 rounded bg-slate-100" /></td>
                      <td className="px-6 py-4"><div className="h-2.5 w-16 rounded bg-slate-100" /></td>
                      <td className="px-6 py-4"><div className="h-5 w-20 rounded-full bg-slate-100" /></td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <div className="h-7 w-14 rounded-lg bg-slate-100" />
                          <div className="h-7 w-20 rounded-lg bg-slate-100" />
                          <div className="h-7 w-14 rounded-lg bg-slate-100" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : documents.length > 0 ? (
                  documents.map((doc) => (
                    <motion.tr
                      key={doc.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* File Icon & Title */}
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 shrink-0 shadow-2xs">
                            {getFileIcon(doc.type)}
                          </div>
                          <div className="min-w-0 max-w-[240px] sm:max-w-[320px]">
                            <p className={`truncate font-semibold ${doc.isDeleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{doc.title}</p>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{doc.type}</span>
                          </div>
                        </div>
                      </td>

                      {/* Uploader */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">{doc.uploader}</span>
                        </div>
                      </td>

                      {/* Size */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono font-medium">{doc.size}</span>
                        </div>
                      </td>

                      {/* Privacy Badge */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          {doc.isDeleted && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 px-2.5 py-0.5 text-[10px] font-bold">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Deleted
                            </span>
                          )}
                          {!doc.isDeleted && (doc.isPublic ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 px-2.5 py-0.5 text-[10px] font-bold shadow-3xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Public
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 px-2.5 py-0.5 text-[10px] font-bold">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Private
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Xem chi tiết */}
                          <Button
                            onClick={() => {
                              if (doc.isPublic || doc.isReported) {
                                onPreviewDoc(doc.id)
                              }
                            }}
                            disabled={!doc.isPublic && !doc.isReported}
                            className={`rounded-lg text-[10px] font-bold h-7 py-0 px-2 shadow-2xs ${
                              doc.isPublic || doc.isReported
                                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 cursor-pointer'
                                : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                            }`}
                          >
                            <ExternalLink className="h-3 w-3 mr-1 shrink-0" />
                            Xem
                          </Button>



                          {/* Xóa (opens picker) */}
                          <Button
                            onClick={() => handleDeleteClick(doc)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg text-[10px] font-bold h-7 py-0 px-2 border border-rose-100 shadow-2xs cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3 mr-1 shrink-0" />
                            Xóa
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                      Không tìm thấy tài liệu nào phù hợp
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-3 flex justify-between items-center text-[10px] text-slate-400 font-bold">
          <span>HIỂN THỊ {documents.length} TRÊN {totalItems} TÀI LIỆU</span>
          <span>NEXUS HỆ THỐNG</span>
        </div>
      </div>

      {/* ─── PAGINATION ──────────────────────────────────────────────────────── */}
      <div className="flex justify-center mt-6">
        <DocPagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          POPUP 1 – DELETE PICKER: chọn loại xóa
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isDeletePickerOpen && selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAll}
              className="absolute inset-0"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white border border-slate-100 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden z-10"
            >
              {/* Close btn */}
              <div className="absolute top-3.5 right-3.5">
                <button
                  onClick={closeAll}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                    <Trash2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Chọn hình thức xóa</h3>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 max-w-[280px] truncate">
                      "{selectedDoc.title}"
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-3 mb-4 leading-relaxed">
                  Chọn một trong hai hình thức bên dưới. Hành động xóa <strong>không thể hoàn tác</strong>.
                </p>

                {/* Option cards */}
                <div className="space-y-3">

                  {/* Option 1: Soft delete */}
                  {!selectedDoc.isDeleted && (
                    <button
                      onClick={chooseSoftDelete}
                      className="w-full text-left group rounded-xl border border-slate-200 bg-slate-50 hover:border-amber-300 hover:bg-amber-50 transition-all p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 group-hover:bg-amber-200 transition-colors">
                          <SoftDeleteIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700">Xóa mềm (Ẩn tài liệu)</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                            Tài liệu sẽ bị ẩn khỏi hệ thống nhưng <strong>vẫn được lưu trữ an toàn</strong>. Bạn có thể khôi phục lại bất kỳ lúc nào.
                          </p>
                        </div>
                        <div className="shrink-0 mt-1">
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full group-hover:bg-amber-200">
                            An toàn hơn
                          </span>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Option 2: Hard delete */}
                  <button
                    onClick={chooseHardDelete}
                    className="w-full text-left group rounded-xl border border-slate-200 bg-slate-50 hover:border-rose-300 hover:bg-rose-50 transition-all p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 group-hover:bg-rose-200 transition-colors">
                        <ShieldAlert className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-rose-700">Xóa vĩnh viễn (Không thể khôi phục)</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                          Tài liệu và file đính kèm sẽ bị <strong>xóa hoàn toàn</strong> khỏi máy chủ. <span className="text-rose-500 font-semibold">Hành động này không thể hoàn tác.</span>
                        </p>
                      </div>
                      <div className="shrink-0 mt-1">
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full group-hover:bg-rose-200">
                          Nguy hiểm
                        </span>
                      </div>
                    </div>
                  </button>

                </div>

                {/* Cancel */}
                <Button
                  onClick={closeAll}
                  className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl h-9 text-xs font-bold border-0"
                >
                  Hủy bỏ
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          POPUP 2a – XÁC NHẬN Xóa mềm
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isSoftConfirmOpen && selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAll}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white border border-slate-100 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden z-10"
            >
              <div className="absolute top-3.5 right-3.5">
                <button onClick={closeAll} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl mb-4 bg-amber-50 text-amber-600 border border-amber-100 shadow-xs">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Xác nhận xóa mềm?</h3>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed px-2">
                  Tài liệu <strong>"{selectedDoc.title}"</strong> sẽ bị ẩn khỏi hệ thống nhưng vẫn được lưu trữ an toàn. Bạn có thể khôi phục lại tài liệu này bất kỳ lúc nào.
                </p>
                <div className="flex gap-2.5 w-full mt-5">
                  <Button
                    onClick={closeAll}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-600 rounded-xl h-9 text-xs font-bold"
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleConfirmSoftDelete}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-9 text-xs font-bold shadow-sm"
                  >
                    Xác nhận ẩn
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          POPUP 2b – XÁC NHẬN Xóa vĩnh viễn
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isHardConfirmOpen && selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAll}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white border border-rose-100 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden z-10"
            >
              {/* Red accent strip */}
              <div className="h-1 w-full bg-gradient-to-r from-rose-500 to-rose-600" />

              <div className="absolute top-4 right-3.5">
                <button onClick={closeAll} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 flex flex-col items-center text-center">
                <div className="flex h-13 w-13 items-center justify-center rounded-2xl mb-4 bg-rose-50 text-rose-600 border border-rose-200 shadow-sm">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Xóa vĩnh viễn tài liệu?</h3>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed px-1">
                  Tài liệu <strong>"{selectedDoc.title}"</strong> sẽ bị{' '}
                  <strong className="text-rose-600">xóa hoàn toàn</strong> khỏi hệ thống và không thể khôi phục lại.
                </p>

                {/* Warning list */}
                <div className="mt-3 w-full bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 text-left space-y-1">
                  <p className="text-[10px] font-extrabold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" /> Không thể hoàn tác
                  </p>
                  <ul className="text-[10px] text-rose-600 font-semibold list-disc list-inside space-y-0.5">
                    <li>Xóa toàn bộ dữ liệu của tài liệu</li>
                    <li>Xóa file đính kèm khỏi máy chủ</li>
                  </ul>
                </div>

                <div className="flex gap-2.5 w-full mt-5">
                  <Button
                    onClick={closeAll}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-600 rounded-xl h-9 text-xs font-bold"
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleConfirmHardDelete}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-9 text-xs font-bold shadow-sm"
                  >
                    Xóa vĩnh viễn
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

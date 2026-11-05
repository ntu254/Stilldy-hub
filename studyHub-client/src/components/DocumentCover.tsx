import React from 'react'

interface DocumentCoverProps {
  id: string
  title: string
  fileType: 'pdf' | 'pptx' | 'docx' | 'xls' | 'image' | 'other'
  subjectName?: string
}

function getDeterministicHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

const UNIVERSITIES = [
  'TRƯỜNG ĐẠI HỌC BÁCH KHOA TP. HCM',
  'TRƯỜNG ĐẠI HỌC VĂN LANG',
  'TRƯỜNG ĐẠI HỌC KINH TẾ QUỐC DÂN',
  'TRƯỜNG ĐẠI HỌC NGOẠI THƯƠNG',
  'TRƯỜNG ĐẠI HỌC QUỐC GIA HÀ NỘI',
  'TRƯỜNG ĐẠI HỌC SƯ PHẠM KỸ THUẬT'
]

export default function DocumentCover({ id, title, fileType, subjectName }: DocumentCoverProps) {
  const hash = getDeterministicHash(id || title)
  const uniName = UNIVERSITIES[hash % UNIVERSITIES.length]
  const cleanTitle = title.trim()
  const lowerTitle = cleanTitle.toLowerCase()

  // 1. Phân loại badge góc trên bên trái của bìa tài liệu
  const renderFileTypeBadge = () => {
    switch (fileType) {
      case 'pdf':
        return (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center justify-center bg-red-600 text-white rounded-[4px] px-1 py-0.5 shadow-sm text-[8px] font-extrabold tracking-wide scale-90 origin-top-left">
            PDF
          </div>
        )
      case 'pptx':
        return (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center justify-center bg-orange-600 text-white rounded-[4px] px-1 py-0.5 shadow-sm text-[8px] font-extrabold tracking-wide scale-90 origin-top-left">
            P
          </div>
        )
      case 'docx':
        return (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center justify-center bg-blue-600 text-white rounded-[4px] px-1 py-0.5 shadow-sm text-[8px] font-extrabold tracking-wide scale-90 origin-top-left">
            W
          </div>
        )
      case 'xls':
        return (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center justify-center bg-emerald-600 text-white rounded-[4px] px-1 py-0.5 shadow-sm text-[8px] font-extrabold tracking-wide scale-90 origin-top-left">
            X
          </div>
        )
      default:
        return null
    }
  }

  // 2. Định nghĩa các Template Covers

  // --- TEMPLATE 1: MÔI TRƯỜNG SỐ (Màu xanh đậm, lưới mạng lưới) ---
  const renderNetworkBlueCover = () => {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-sky-900 via-slate-900 to-indigo-950 flex flex-col justify-between p-4 overflow-hidden select-none">
        {/* SVG Network Grid Background */}
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Connected nodes */}
            <circle cx="40" cy="50" r="3" fill="#38bdf8" />
            <circle cx="120" cy="80" r="4" fill="#38bdf8" />
            <circle cx="80" cy="130" r="3" fill="#6366f1" />
            <circle cx="150" cy="150" r="5" fill="#6366f1" />
            
            <line x1="40" y1="50" x2="120" y2="80" stroke="#38bdf8" strokeWidth="0.5" />
            <line x1="120" y1="80" x2="80" y2="130" stroke="#38bdf8" strokeWidth="0.5" />
            <line x1="80" y1="130" x2="150" y2="150" stroke="#6366f1" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Top Text */}
        <div className="text-center pt-2">
          <span className="text-[7px] text-sky-400 font-extrabold uppercase tracking-widest leading-none block">
            TÀI LIỆU CHIA SẺ
          </span>
          <div className="w-6 h-[1px] bg-sky-400 mx-auto mt-1" />
        </div>

        {/* Center Illustration */}
        <div className="flex flex-col items-center justify-center my-auto px-1 z-10">
          <div className="w-14 h-14 rounded-full bg-sky-500/10 border border-sky-400/30 flex items-center justify-center mb-3">
            <svg className="w-7 h-7 text-sky-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
            </svg>
          </div>

          <h3 className="text-[10px] leading-tight font-extrabold text-white text-center uppercase tracking-wide px-1 line-clamp-3">
            {cleanTitle}
          </h3>
        </div>

        {/* Bottom stats/design */}
        <div className="flex justify-between items-center text-[6px] text-slate-400 border-t border-slate-800 pt-1.5 z-10">
          <span>{subjectName || 'CHUNG'}</span>
          <span className="font-bold text-sky-400">STUDYHUB</span>
        </div>
      </div>
    )
  }

  // --- TEMPLATE 2: BÀI GIẢNG / TƯ DUY (Trắng/Cam/Tím, Minh họa trừu tượng) ---
  const renderSlideOrangeCover = () => {
    return (
      <div className="relative w-full h-full bg-slate-50 flex flex-col justify-between p-4 overflow-hidden select-none border border-slate-100">
        {/* Background blobs */}
        <div className="absolute top-10 -right-4 w-20 h-20 bg-orange-200/40 rounded-full blur-xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-violet-200/40 rounded-full blur-xl" />

        {/* Top brand */}
        <div className="flex justify-between items-center text-[7px] text-slate-400 font-bold">
          <span>BÀI GIẢNG HỌC PHẦN</span>
          <span className="text-orange-500">• SLIDE DECK</span>
        </div>

        {/* Center content */}
        <div className="my-auto flex flex-col items-center z-10">
          {/* Abstract SVG Illustration representing mind map/analysis */}
          <div className="w-16 h-12 flex items-center justify-center gap-1.5 mb-2.5">
            <div className="w-2.5 h-6 bg-gradient-to-t from-orange-500 to-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2.5 h-10 bg-gradient-to-t from-indigo-500 to-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2.5 h-8 bg-gradient-to-t from-pink-500 to-rose-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <div className="w-2.5 h-5 bg-gradient-to-t from-emerald-500 to-teal-400 rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
          </div>

          <h3 className="text-[10px] leading-tight font-extrabold text-slate-800 text-center uppercase px-1 line-clamp-3">
            {cleanTitle}
          </h3>

          <div className="mt-2 px-2 py-0.5 rounded-full bg-orange-100/60 border border-orange-200 text-[6px] text-orange-700 font-extrabold tracking-wide uppercase">
            TƯ DUY PHÂN TÍCH
          </div>
        </div>

        {/* Bottom */}
        <div className="text-[6px] text-slate-400 text-center border-t border-slate-100 pt-1.5 font-semibold">
          {subjectName || 'Tài Liệu Chuyên Ngành'}
        </div>
      </div>
    )
  }

  // --- TEMPLATE 3: CHỦ NGHĨA MÁC - LÊNIN (Trắng, Viền xanh kép, Chân dung Lenin/Marx vector) ---
  const renderMarxLeninCover = () => {
    return (
      <div className="relative w-full h-full bg-white flex flex-col justify-between p-3.5 select-none border-[3px] border-double border-indigo-700">
        {/* Double Border Frame Inner */}
        <div className="absolute inset-0.5 border border-indigo-200 pointer-events-none" />

        {/* Top Header */}
        <div className="text-center pt-1 z-10">
          <p className="text-[5.5px] font-bold text-slate-700 leading-tight tracking-tight uppercase">
            {uniName}
          </p>
          <div className="w-12 h-[0.5px] bg-slate-300 mx-auto mt-1" />
        </div>

        {/* Portraits Vector Representation */}
        <div className="flex flex-col items-center justify-center my-auto z-10">
          {/* SVG portraits representation */}
          <div className="w-16 h-10 flex items-center justify-center gap-1.5 mb-2.5 opacity-90">
            {/* Lenin Silhouette vector */}
            <svg className="w-7 h-7 text-indigo-700" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm-1.5-3.5c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1z" />
            </svg>
            <div className="w-[1px] h-6 bg-slate-200" />
            {/* Marx Silhouette vector */}
            <svg className="w-7 h-7 text-indigo-900" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a5 5 0 0 0-5 5c0 2.89 2.5 5 5 5s5-2.11 5-5a5 5 0 0 0-5-5zm0 18c-4.42 0-8-1.79-8-4 0-1.5 1.63-2.8 4.2-3.46l.8.8c.8.8 2 .8 2.8 0l.8-.8c2.57.66 4.2 1.96 4.2 3.46 0 2.21-3.58 4-8 4z" />
            </svg>
          </div>

          <p className="text-[6px] font-extrabold text-indigo-700 tracking-wider mb-1">ĐỀ THI GIỮA KỲ</p>
          <h3 className="text-[8px] leading-tight font-extrabold text-slate-800 text-center uppercase tracking-normal px-0.5 line-clamp-3">
            {cleanTitle}
          </h3>
        </div>

        {/* Bottom */}
        <div className="text-center pb-0.5 z-10">
          <p className="text-[5.5px] font-bold text-slate-500 uppercase">Học Phần Cơ Bản</p>
          <p className="text-[4.5px] text-slate-400 mt-0.5">Lưu Hành Nội Bộ</p>
        </div>
      </div>
    )
  }

  // --- TEMPLATE 4: ĐỀ THI VĂN LANG / MARKETING SỰ KIỆN (Trắng, Banner Xanh/Hồng) ---
  const renderUniversityExamCover = (bannerColor: string, textColor: string) => {
    return (
      <div className="relative w-full h-full bg-white flex flex-col justify-between select-none border border-slate-100">
        
        {/* Top Banner Box */}
        <div className={`w-full py-2 px-3 text-center border-b border-slate-100 ${bannerColor}`}>
          <p className={`text-[6px] font-extrabold tracking-wider leading-tight uppercase ${textColor}`}>
            {uniName}
          </p>
          <p className={`text-[4.5px] font-medium opacity-85 uppercase mt-0.5 ${textColor}`}>
            KHOA QUẢN TRỊ KINH DOANH
          </p>
        </div>

        {/* Center Content */}
        <div className="my-auto flex flex-col items-center px-3 text-center z-10">
          <div className="w-7 h-[1px] bg-slate-300 mb-2" />
          <p className="text-[5px] font-extrabold text-slate-400 tracking-wider uppercase mb-1">
            ĐỀ THI KẾT THÚC HỌC PHẦN
          </p>
          <h3 className="text-[9px] leading-tight font-extrabold text-slate-800 uppercase px-1 line-clamp-3">
            {cleanTitle}
          </h3>
          <div className="w-5 h-[1px] bg-slate-300 mt-2" />
        </div>

        {/* Bottom */}
        <div className="p-3 flex justify-between items-center text-[5.5px] text-slate-400 border-t border-slate-50/50 bg-slate-50/50">
          <span className="font-semibold uppercase">{subjectName || 'CHUYÊN NGÀNH'}</span>
          <span className="font-bold text-slate-500">2024-2025</span>
        </div>
      </div>
    )
  }

  // --- TEMPLATE 5: EXCEL SPREADSHEET CARD (Màu xanh lá, Mock Grid) ---
  const renderExcelCover = () => {
    return (
      <div className="relative w-full h-full bg-slate-50 flex flex-col justify-between select-none border border-emerald-200">
        
        {/* Top Banner Box */}
        <div className="w-full py-2 px-3 text-center border-b border-emerald-100 bg-emerald-600 text-white">
          <p className="text-[6.5px] font-extrabold tracking-wider leading-tight uppercase">
            BẢNG TÍNH THỐNG KÊ
          </p>
        </div>

        {/* Spreadsheet Mock Grid Background */}
        <div className="absolute inset-x-0 top-10 bottom-6 opacity-35 px-2 py-1">
          <table className="w-full h-full border-collapse">
            <tbody>
              {Array.from({ length: 4 }).map((_, rIdx) => (
                <tr key={rIdx}>
                  {Array.from({ length: 4 }).map((_, cIdx) => (
                    <td key={cIdx} className="border border-slate-300 text-[4px] px-0.5 py-0.5 text-center">
                      {(rIdx === 0 || cIdx === 0) ? '' : Math.floor(Math.random() * 100)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Center Title Card */}
        <div className="my-auto mx-auto w-[85%] bg-white/95 border border-emerald-100 p-2 rounded shadow-sm text-center z-10">
          <h3 className="text-[8px] leading-tight font-extrabold text-slate-800 uppercase line-clamp-3">
            {cleanTitle}
          </h3>
        </div>

        {/* Bottom */}
        <div className="p-1 px-3 flex justify-between items-center text-[5.5px] bg-emerald-50 text-emerald-800 border-t border-emerald-100">
          <span className="font-bold">EXCEL SHEET</span>
          <span className="font-semibold">{subjectName || 'Thống Kê'}</span>
        </div>
      </div>
    )
  }

  // --- TEMPLATE 6: DỰ PHÒNG CHUNG (Màu sắc theo ID hash) ---
  const renderFallbackCover = () => {
    const COLORS = [
      { bg: 'from-purple-900 to-indigo-950', text: 'text-purple-400', accent: 'bg-purple-500/10 border-purple-400/30' },
      { bg: 'from-pink-900 to-rose-950', text: 'text-pink-400', accent: 'bg-pink-500/10 border-pink-400/30' },
      { bg: 'from-emerald-900 to-teal-950', text: 'text-emerald-400', accent: 'bg-emerald-500/10 border-emerald-400/30' },
      { bg: 'from-slate-900 to-zinc-950', text: 'text-slate-400', accent: 'bg-slate-500/10 border-slate-400/30' }
    ]
    const activeColor = COLORS[hash % COLORS.length]

    return (
      <div className={`relative w-full h-full bg-gradient-to-br ${activeColor.bg} flex flex-col justify-between p-4 overflow-hidden select-none`}>
        {/* Abstract circles */}
        <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full border border-white/5" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full border border-white/5" />

        {/* Top title */}
        <div className="text-center pt-2">
          <span className={`text-[6.5px] ${activeColor.text} font-extrabold uppercase tracking-widest leading-none block`}>
            {fileType.toUpperCase()} DOCUMENT
          </span>
        </div>

        {/* Center content */}
        <div className="my-auto flex flex-col items-center z-10">
          <div className={`w-12 h-12 rounded-2xl ${activeColor.accent} border flex items-center justify-center mb-3`}>
            <svg className={`w-6 h-6 ${activeColor.text}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-[9px] leading-tight font-extrabold text-white text-center uppercase tracking-normal px-1 line-clamp-3">
            {cleanTitle}
          </h3>
        </div>

        {/* Bottom */}
        <div className="flex justify-between items-center text-[5.5px] text-slate-400 border-t border-slate-800 pt-1.5">
          <span>{subjectName || 'STUDY HUB'}</span>
          <span className="font-extrabold text-white">NEXUS</span>
        </div>
      </div>
    )
  }

  // 3. Quyết định render template nào dựa trên từ khóa trong Title hoặc File Type
  const renderCoverContent = () => {
    if (lowerTitle.includes('quy tắc') || lowerTitle.includes('ứng xử') || lowerTitle.includes('văn hóa') || lowerTitle.includes('môi trường số')) {
      return renderNetworkBlueCover()
    }
    if (lowerTitle.includes('tư duy') || lowerTitle.includes('phân tích') || lowerTitle.includes('bài giảng') || lowerTitle.includes('slide')) {
      return renderSlideOrangeCover()
    }
    if (lowerTitle.includes('mác') || lowerTitle.includes('lênin') || lowerTitle.includes('triết học') || lowerTitle.includes('chủ nghĩa')) {
      return renderMarxLeninCover()
    }
    if (lowerTitle.includes('marketing') || lowerTitle.includes('sự kiện') || lowerTitle.includes('kinh tế') || lowerTitle.includes('đề thi')) {
      // Chọn ngẫu nhiên banner xanh lá đậm, xanh dương nhạt hoặc hồng phấn
      const variant = hash % 3
      if (variant === 0) return renderUniversityExamCover('bg-sky-50 text-sky-900 border-sky-100', 'text-sky-950')
      if (variant === 1) return renderUniversityExamCover('bg-rose-50 text-rose-900 border-rose-100', 'text-rose-950')
      return renderUniversityExamCover('bg-indigo-50 text-indigo-900 border-indigo-100', 'text-indigo-950')
    }
    if (fileType === 'xls') {
      return renderExcelCover()
    }
    
    // Nếu không khớp từ khóa cụ thể nào, chọn template ngẫu nhiên theo hash
    const templateChoice = hash % 4
    switch (templateChoice) {
      case 0:
        return renderNetworkBlueCover()
      case 1:
        return renderSlideOrangeCover()
      case 2:
        return renderMarxLeninCover()
      case 3:
      default:
        return renderFallbackCover()
    }
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {renderFileTypeBadge()}
      {renderCoverContent()}
    </div>
  )
}

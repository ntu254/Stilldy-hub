import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import Navbar from '@/components/Navbar'
import HeroSection from '@/components/HeroSection'
import RecentDocuments from '@/components/RecentDocuments'
import UploadModal from '@/components/UploadModal'
import { BookOpen, Heart } from 'lucide-react'

export default function LandingPage() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleOpenUpload = () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để tải lên tài liệu mới.')
      navigate('/login')
      return
    }
    setUploadOpen(true)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-indigo-500 selection:text-white">
      
      {/* Navigation */}
      <Navbar />

      {/* Main Sections */}
      <main className="flex-grow">
        
        {/* Hero Section */}
        <HeroSection onOpenUpload={handleOpenUpload} />

        {/* Recent Documents Section (Contains Section 1: Tài liệu nổi bật, PublicFlashcards: Bộ câu hỏi hay, Section 2: Tài liệu mới) */}
        <RecentDocuments />

      </main>

      {/* Beautiful High-End Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            
            {/* Column 1: Brand details */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-900">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="text-lg font-bold text-white tracking-tight flex items-center gap-1">
                  Nexus
                </span>
              </div>
              <p className="text-xs leading-relaxed max-w-xs text-slate-400">
                Hub kết nối, lưu trữ tài liệu học tập toàn năng ứng dụng AI. Nâng tầm hiệu suất và điểm số học tập của sinh viên Việt Nam.
              </p>
            </div>

            {/* Column 2: Products */}
            <div className="flex flex-col gap-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Sản phẩm</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="hover:text-white transition-colors">Kết nối Nexus</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Trợ lý AI Chat</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Sơ đồ tư duy 3D</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tính năng cộng tác</a></li>
              </ul>
            </div>

            {/* Column 3: Resource */}
            <div className="flex flex-col gap-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hỗ trợ & Tài liệu</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="hover:text-white transition-colors">Hướng dẫn sử dụng</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bảo mật thông tin</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Điều khoản dịch vụ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Chính sách E2EE</a></li>
              </ul>
            </div>

            {/* Column 4: Contact & Socials */}
            <div className="flex flex-col gap-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Đội ngũ phát triển</h4>
              <p className="text-xs leading-relaxed">
                Được xây dựng bằng cả nhiệt huyết bởi ban phát triển **Nexus Dev Team**.
              </p>
              <div className="mt-2 flex items-center gap-3">
                <a href="#" className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all" aria-label="Github link">
                  <svg className="h-4 w-4 fill-current text-slate-300" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                </a>
              </div>
            </div>

          </div>

          <div className="mt-12 border-t border-slate-800/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <span>© 2026  Nexus Vietnam. Mọi quyền được bảo lưu.</span>
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <Heart className="h-3 w-3 text-red-500 fill-red-500" />
              <span>for better education.</span>
            </div>
          </div>

        </div>
      </footer>

      {/* Upload Dialog Modal */}
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />

    </div>
  )
}

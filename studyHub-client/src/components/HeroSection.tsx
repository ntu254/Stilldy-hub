import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Upload, Sparkles, Database, Mail, MessageSquare, ArrowRight, RefreshCw, FileCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars'
import { TypingText, TypingTextCursor } from '@/components/animate-ui/primitives/texts/typing'
import {
  staggerContainer,
  fadeInUp,
  getFloatAnimation,
  pulseAnimation,
} from '@/utils/motion'

interface HeroSectionProps {
  onOpenUpload: () => void
}

export default function HeroSection({ onOpenUpload }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32 bg-[#F8FAFC]">
      
      {/* Dynamic Interactive Stars Background from Animate UI */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <StarsBackground
          className="bg-transparent!"
          starColor="#6366f1"
          factor={0.015}
          speed={100}
        />
      </div>

      {/* Decorative Radial Gradients / Background Blobs */}
      <div className="absolute top-1/4 left-1/3 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-200/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-purple-200/15 blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-10 -z-10 h-72 w-72 rounded-full bg-sky-200/20 blur-3xl animate-pulse pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          variants={staggerContainer(0.12, 0.1)}
          initial="hidden"
          animate="show"
          className="text-center max-w-3xl mx-auto"
        >
          
          {/* Badge */}
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100/50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-spin-slow" />
            <span>Mạng lưới học tập đa kênh hợp nhất bằng AI</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={fadeInUp}
            className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl leading-[1.1] min-h-[140px] sm:min-h-[180px]"
          >
            Nền tảng{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 bg-clip-text text-transparent">
              AI Nexus
            </span>{' '}
            <br className="sm:hidden" />
            <span className="inline-block text-indigo-600">
              <TypingText
                text={[
                  'Học Tập Thông Minh',
                  'Tóm Tắt Bài Giảng',
                  'Vẽ Sơ Đồ Tư Duy',
                  'Kết Nối Đa Kênh',
                ]}
                loop
                holdDelay={2000}
                duration={80}
              >
                <TypingTextCursor
                  style={{ height: '0.85em', width: '3px' }}
                  className="bg-indigo-600 ml-1"
                />
              </TypingText>
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={fadeInUp}
            className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto"
          >
            Kết nối và đồng bộ hóa tức thì mọi tài liệu học tập từ <strong className="text-slate-900 font-semibold">Google Drive, Messenger, Email</strong> về một hub duy nhất. AI tự động tóm tắt bài giảng, giải bài tập và vẽ sơ đồ tư duy cho riêng bạn.
          </motion.p>

          {/* Action Call to Actions */}
          <motion.div
            variants={fadeInUp}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div
              variants={pulseAnimation}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
            >
              <Button
                onClick={onOpenUpload}
                size="lg"
                className="h-12 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-indigo-500/20 border-none transition-all duration-300 gap-2 text-sm shrink-0"
              >
                <Upload className="h-4.5 w-4.5" />
                Upload tài liệu mới
              </Button>
            </motion.div>

            <Link to="/register">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-6 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shrink-0 shadow-sm transition-all gap-1.5"
              >
                Kết nối tài liệu của bạn
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          {/* Network Integration logos under text */}
          <motion.div
            variants={fadeInUp}
            className="mt-12 flex items-center justify-center gap-6 text-xs text-slate-400"
          >
            <span className="font-medium uppercase tracking-wider">Hợp nhất kết nối với:</span>
            <div className="flex items-center gap-4 text-slate-500 font-medium">
              <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
                <Database className="h-3.5 w-3.5 text-blue-500" /> Drive
              </div>
              <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
                <Mail className="h-3.5 w-3.5 text-red-400" /> Gmail
              </div>
              <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
                <MessageSquare className="h-3.5 w-3.5 text-purple-500" /> Chats
              </div>
            </div>
          </motion.div>

        </motion.div>

        {/* ========================================================
            INTERACTIVE FLOATING MOCKUPS (Creating visual depth)
           ======================================================== */}
        
        {/* Mockup 1: Google Drive File Connection (Top Left) */}
        <motion.div
          variants={getFloatAnimation(16, 4.5, 0)}
          animate="animate"
          className="hidden xl:flex absolute top-12 left-0 z-10 w-64 flex-col gap-2 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-xl shadow-slate-200/40 backdrop-blur-sm hover:border-indigo-200 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                <Database className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Google Drive</span>
            </div>
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="mt-1 text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
            Bài giảng Giải tích 2.pdf
          </p>
          <div className="mt-1 flex items-center justify-between border-t border-slate-50 pt-2 text-[10px] text-slate-400">
            <span>Đồng bộ 2 phút trước</span>
            <span className="font-semibold text-emerald-600">Đã quét AI</span>
          </div>
        </motion.div>

        {/* Mockup 2: Email Resource Extraction (Top Right) */}
        <motion.div
          variants={getFloatAnimation(18, 5, 0.8)}
          animate="animate"
          className="hidden xl:flex absolute top-16 right-0 z-10 w-72 flex-col gap-2 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-xl shadow-slate-200/40 backdrop-blur-sm hover:border-purple-200 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500">
                <Mail className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email kết nối</span>
            </div>
            <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[8px] font-bold text-purple-600">Tự động</span>
          </div>
          <p className="mt-1 text-xs font-bold text-slate-800">
            Tài liệu ôn thi cuối kì.docx
          </p>
          <div className="rounded-lg bg-slate-50 p-2 text-[10px] text-slate-500 leading-normal border border-slate-100/50">
            <span className="font-bold text-purple-600">AI Summary:</span> Tóm tắt 3 công thức tích phân cốt lõi...
          </div>
        </motion.div>

        {/* Mockup 3: Chat/Messenger Capture (Bottom Left) */}
        <motion.div
          variants={getFloatAnimation(14, 4, 1.5)}
          animate="animate"
          className="hidden xl:flex absolute bottom-8 left-4 z-10 w-64 flex-col gap-2 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-xl shadow-slate-200/40 backdrop-blur-sm hover:border-sky-200 transition-all duration-300"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-500">
              <MessageSquare className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nhóm Zalo / Chat</span>
          </div>
          <div className="rounded-xl bg-sky-50/50 p-2 border border-sky-100/50">
            <p className="text-[10px] font-medium text-sky-800 italic">"Gửi tớ file slide thuyết trình..."</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-100 p-1.5">
            <FileCode className="h-4.5 w-4.5 text-slate-500" />
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] font-bold text-slate-700 truncate">Slide_Presentation.pptx</span>
              <span className="text-[8px] text-slate-400">1.8 MB • Tự động trích xuất</span>
            </div>
          </div>
        </motion.div>

        {/* Mockup 4: Active Mindmap Node (Bottom Right) */}
        <motion.div
          variants={getFloatAnimation(16, 5.5, 0.4)}
          animate="animate"
          className="hidden xl:flex absolute bottom-12 right-6 z-10 w-64 flex-col gap-3 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-xl shadow-slate-200/40 backdrop-blur-sm hover:border-indigo-200 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-indigo-500 animate-spin-slow" />
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">AI Nexus Engine</span>
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 w-3/4 rounded-full bg-slate-100 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 w-11/12 animate-pulse" />
            </div>
            <div className="text-[9px] font-semibold text-slate-400">Đang lập chỉ mục Sơ đồ tư duy</div>
          </div>

          <div className="flex flex-wrap gap-1">
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-[8px] font-bold text-indigo-600">Đại số</span>
            <span className="rounded bg-purple-50 px-2 py-0.5 text-[8px] font-bold text-purple-600">ML/AI</span>
            <span className="rounded bg-slate-50 px-2 py-0.5 text-[8px] font-bold text-slate-500">+4 Tags</span>
          </div>
        </motion.div>

      </div>
    </section>
  )
}

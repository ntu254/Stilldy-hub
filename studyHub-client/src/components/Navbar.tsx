import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Sparkles, BookOpen, Menu, X, ArrowRight, CornerDownLeft, LayoutDashboard } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

import NotificationBell from '@/components/NotificationBell'

export default function Navbar() {
  const { isAuthenticated, user } = useAuth()
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  // Listen to scroll to adjust background intensity
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'bg-white/75 backdrop-blur-md border-b border-slate-200/50 shadow-sm shadow-black/[0.01]'
          : 'bg-white/50 backdrop-blur-sm border-b border-slate-100/30'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Branding / Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white transition-all duration-300 group-hover:scale-105 group-hover:bg-indigo-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              Nexus
              <span className="hidden sm:inline-flex items-center gap-0.5 rounded-full bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-500/10">
                <Sparkles className="h-2.5 w-2.5" />
                Beta
              </span>
            </span>
          </Link>

          {/* Quick Search - Desktop */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (searchQuery.trim()) {
                navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
              }
            }}
            className="hidden md:block relative flex-1 max-w-md mx-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-200" />
              <Input
                type="text"
                placeholder="Tìm nhanh tài liệu, môn học..."
                className={cn(
                  'pl-9 pr-12 h-9 w-full bg-slate-100/60 border-slate-200/60 rounded-xl transition-all duration-300 text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10',
                  searchFocused && 'bg-white shadow-sm ring-1 ring-slate-200'
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              />
              {searchFocused && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                  <CornerDownLeft className="h-3 w-3" /> Enter
                </div>
              )}
            </div>
          </form>

          {/* Navigation Actions - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'}>
                  <Button size="sm" className="rounded-xl font-medium shadow-sm hover:shadow-md transition-all gap-1.5">
                    <LayoutDashboard className="h-4 w-4" />
                    Bảng điều khiển
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors px-2 py-1">
                  Đăng nhập
                </Link>
                <Link to="/register">
                  <Button size="sm" className="rounded-xl font-medium shadow-sm hover:shadow-md transition-all gap-1.5">
                    Bắt đầu ngay
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu & Search Actions */}
          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated && <NotificationBell />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden border-t border-slate-100 bg-white overflow-hidden"
          >
            <div className="space-y-4 px-4 py-6 shadow-inner">
              {/* Mobile Search */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (searchQuery.trim()) {
                    setMobileMenuOpen(false)
                    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
                  }
                }}
                className="relative"
              >
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm tài liệu học tập..."
                  className="pl-9 w-full bg-slate-50 border-slate-100 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>

              <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                {isAuthenticated ? (
                  <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full rounded-xl bg-slate-900 text-white gap-1.5">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-xl text-slate-700">
                        Đăng nhập
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full rounded-xl bg-slate-900 text-white">
                        Đăng ký tài khoản
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

import { Outlet, Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-8">
      {/* Subtle background pattern */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/[0.03] blur-3xl" />
      </div>

      {/* Logo / Branding */}
      <Link
        to="/"
        className="group relative z-10 mb-8 flex items-center gap-2.5 transition-opacity hover:opacity-80"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
          <BookOpen className="h-5 w-5" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-foreground">
          Nexus
        </span>
      </Link>

      {/* Page Content (Outlet) */}
      <div className="relative z-10 w-full max-w-md">
        <Outlet />
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Nexus. All rights reserved.
      </p>
    </div>
  )
}

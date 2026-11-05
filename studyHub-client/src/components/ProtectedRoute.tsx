import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  allowedRoles?: ('guest' | 'user' | 'admin')[]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <span className="text-xs font-semibold text-slate-400">Đang tải tài nguyên...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect to login but keep current location so they can return after signing in
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If role is guest, redirect to /dashboard. Otherwise (e.g. admin), redirect to /admin
    const fallbackDest = user.role === 'admin' ? '/admin' : '/dashboard'
    return <Navigate to={fallbackDest} replace />
  }

  return <Outlet />
}

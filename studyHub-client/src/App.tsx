import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import AdminLayout from '@/layouts/AdminLayout'

import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import LandingPage from '@/pages/landing/LandingPage'
import FeaturedDocumentsPage from '@/pages/landing/FeaturedDocumentsPage'
import SearchPage from '@/pages/landing/SearchPage'
import DashboardPage from '@/pages/user/dashboard'
import DocumentsPage from '@/pages/user/DocumentsPage'
import PreviewPage from '@/pages/user/PreviewPage'
import AiChatPage from '@/pages/user/ai-chat'
import ProfilePage from '@/pages/user/ProfilePage'
import SavedDocumentsPage from '@/pages/user/saved-documents'
import PublicDocumentsPage from '@/pages/user/public-documents'
import PublicFlashcardsDashboardPage from '@/pages/user/public-flashcards'
import FlashcardsPage from '@/pages/flashcards/FlashcardsPage'
import FlashcardDetailPage from '@/pages/flashcards/FlashcardDetailPage'
import EditFlashcardPage from '@/pages/flashcards/EditFlashcardPage'

import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminFilesPage from '@/pages/admin/AdminFilesPage'
import AdminDocumentsPage from '@/pages/admin/AdminDocumentsPage'
import AdminPlansPage from '@/pages/admin/AdminPlansPage'
import AdminPaymentsPage from '@/pages/admin/AdminPaymentsPage'
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage'

import UpgradePage from '@/pages/user/UpgradePage'
import PaymentHistoryPage from '@/pages/user/PaymentHistoryPage'
import PaymentSuccessPage from '@/pages/payment/PaymentSuccessPage'
import PaymentCancelPage from '@/pages/payment/PaymentCancelPage'

import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'

import PublicFlashcardsPage from '@/pages/landing/PublicFlashcardsPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Home / Landing Page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/featured" element={<FeaturedDocumentsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/public-flashcards" element={<PublicFlashcardsPage />} />

          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Public Route */}
          <Route path="/preview/:id" element={<PreviewPage />} />
          <Route path="/flashcards/:id" element={<FlashcardDetailPage />} />

          {/* Dashboard Routes (Protected for guest and user roles) */}
          <Route element={<ProtectedRoute allowedRoles={['guest', 'user']} />}>
            <Route path="/dashboard/preview/:id" element={<PreviewPage />} />

            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/documents" element={<DocumentsPage />} />
              <Route path="/dashboard/saved" element={<SavedDocumentsPage />} />
              <Route path="/dashboard/public-docs" element={<PublicDocumentsPage />} />
              <Route path="/dashboard/public-flashcards" element={<PublicFlashcardsDashboardPage />} />
              <Route path="/dashboard/ai-chat" element={<AiChatPage />} />
              <Route path="/dashboard/profile" element={<ProfilePage />} />
              <Route path="/dashboard/upgrade" element={<UpgradePage />} />
              <Route path="/dashboard/payment-history" element={<PaymentHistoryPage />} />
              <Route path="/dashboard/flashcards" element={<FlashcardsPage />} />
              <Route path="/dashboard/flashcards/:id/edit" element={<EditFlashcardPage />} />
            </Route>

            {/* Payment Flow Routes */}
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/payment/cancel" element={<PaymentCancelPage />} />
          </Route>

          {/* Admin Routes (Protected for admins only) */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/documents" element={<AdminDocumentsPage />} />
              <Route path="/admin/files" element={<AdminFilesPage />} />
              <Route path="/admin/plans" element={<AdminPlansPage />} />
              <Route path="/admin/payments" element={<AdminPaymentsPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/admin/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Default redirect to home page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'
import { Toaster } from 'sonner';
import { Provider } from 'react-redux'
import { store } from '@/redux/store'
import $ from 'jquery'
import JSZip from 'jszip'

if (typeof window !== 'undefined') {
  (window as any).$ = $
  (window as any).jQuery = $
  (window as any).JSZip = JSZip
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1065647598287-qd954atocefp9b166g3l4li75r83c8sk.apps.googleusercontent.com'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId} locale="vi">
      <Provider store={store}>
        <App />
      </Provider>
    </GoogleOAuthProvider>
    <Toaster position="top-right" richColors />
  </StrictMode>,
)


import { useRef, useCallback, useEffect } from 'react'
import { ToastType } from '../components/common/Toast'

interface ToastState {
  id: string
  message: string
  type: ToastType
}

type ToastCallback = (toast: ToastState) => void

const toastListeners = new Set<ToastCallback>()

export function useToast() {
  const toastIdRef = useRef(0)

  const show = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = `toast-${++toastIdRef.current}`
    const toast = { id, message, type }

    toastListeners.forEach((listener) => listener(toast))

    if (duration > 0) {
      setTimeout(() => {
        toastListeners.forEach((listener) => listener({ ...toast, type: 'info' as ToastType }))
      }, duration)
    }

    return id
  }, [])

  const success = useCallback((message: string, duration?: number) => show(message, 'success', duration), [show])
  const error = useCallback((message: string, duration?: number) => show(message, 'error', duration), [show])
  const info = useCallback((message: string, duration?: number) => show(message, 'info', duration), [show])
  const warning = useCallback((message: string, duration?: number) => show(message, 'warning', duration), [show])

  return { show, success, error, info, warning }
}

export function useToastListener(callback: ToastCallback) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const listener = (toast: ToastState) => callbackRef.current(toast)
    toastListeners.add(listener)
    return () => {
      toastListeners.delete(listener)
    }
  }, [])
}

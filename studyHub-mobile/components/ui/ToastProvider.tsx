import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, Animated, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native'
import { SafeAreaInsetsContext } from 'react-native-safe-area-context'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react-native'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
  duration: number
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void
  show: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  currentToast: ToastItem | null
  hideToast: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentToast, setCurrentToast] = useState<ToastItem | null>(null)

const hideToast = useCallback(() => {
  setCurrentToast(null)
}, [])

 const showToast = useCallback((msg: string, toastType: ToastType = 'info', duration = 2500) => {
  if (!msg) return

  setCurrentToast({
    id: Date.now() + Math.random(),
    message: msg,
    type: toastType,
    duration: duration || 3500,
  })
}, [])

  const show = useCallback((msg: string, t: ToastType = 'info', d = 3500) => showToast(msg, t, d), [showToast])
  const success = useCallback((msg: string, d = 3500) => showToast(msg, 'success', d), [showToast])
  const error = useCallback((msg: string, d = 3500) => showToast(msg, 'error', d), [showToast])
  const info = useCallback((msg: string, d = 3500) => showToast(msg, 'info', d), [showToast])
  const warning = useCallback((msg: string, d = 3500) => showToast(msg, 'warning', d), [showToast])

  return (
    <ToastContext.Provider value={{ showToast, show, success, error, info, warning, currentToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export const GlobalToast: React.FC = () => {
  const context = useContext(ToastContext)
  if (!context) return null

  const { currentToast, hideToast } = context

  // Keep last toast content rendered during exit animation
  const [displayedToast, setDisplayedToast] = useState<ToastItem | null>(null)
  const translateY = useRef(new Animated.Value(-100)).current
  const opacity = useRef(new Animated.Value(0)).current
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {

    if (currentToast) {
      setDisplayedToast(currentToast)
      translateY.setValue(-100)
      opacity.setValue(0)

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start(({ finished }) => {
  if (!finished) return

  timerRef.current = setTimeout(() => {
    hideToast()
  }, currentToast.duration)
})
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setDisplayedToast(null)
      })
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [currentToast])

  if (!displayedToast) return null

  const getTheme = () => {
    switch (displayedToast.type) {
      case 'success':
        return {
          borderColor: 'rgba(34, 197, 94, 0.6)',
          iconBg: 'rgba(34, 197, 94, 0.2)',
          iconColor: '#22C55E',
          Icon: CheckCircle,
        }
      case 'error':
        return {
          borderColor: 'rgba(239, 68, 68, 0.6)',
          iconBg: 'rgba(239, 68, 68, 0.2)',
          iconColor: '#EF4444',
          Icon: AlertCircle,
        }
      case 'warning':
        return {
          borderColor: 'rgba(245, 158, 11, 0.6)',
          iconBg: 'rgba(245, 158, 11, 0.2)',
          iconColor: '#F59E0B',
          Icon: AlertCircle,
        }
      case 'info':
      default:
        return {
          borderColor: 'rgba(14, 165, 233, 0.6)',
          iconBg: 'rgba(14, 165, 233, 0.2)',
          iconColor: '#0EA5E9',
          Icon: Info,
        }
    }
  }

  const { borderColor, iconBg, iconColor, Icon } = getTheme()

  return (
    <SafeAreaInsetsContext.Consumer>
      {(insets) => {
        const topInset = insets?.top ?? (Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24))
        const topPosition = topInset + 8

        return (
          <View 
            style={[styles.overlay, { top: topPosition }]} 
            pointerEvents="box-none"
          >
            <View
              style={[
                styles.toastCard,
                {
                  borderColor,
                },
              ]}
            >
              <TouchableOpacity 
                style={styles.content} 
                onPress={hideToast}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBg, { backgroundColor: iconBg }]}>
                  <Icon color={iconColor} size={20} />
                </View>
                <Text style={styles.toastText} numberOfLines={3}>
                  {displayedToast.message}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={hideToast}
                style={styles.closeBtn}
                activeOpacity={0.6}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <X color="#94A3B8" size={18} />
              </TouchableOpacity>
            </View>
          </View>
        )
      }}
    </SafeAreaInsetsContext.Consumer>
  )
}

const styles = StyleSheet.create({
overlay: {
  position: 'absolute',
  left: 0,
  right: 0,
  alignItems: 'center',
  zIndex: 999999,
  elevation: 999999,
},
toastCard: {
  width: '90%',
  backgroundColor: '#0F172A',
  borderRadius: 18,
  borderWidth: 1.5,
  paddingVertical: 12,
  paddingHorizontal: 14,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.3,
  shadowRadius: 16,
  elevation: 12,
},
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    lineHeight: 20,
  },
  closeBtn: {
    padding: 6,
  },
})

export default ToastProvider

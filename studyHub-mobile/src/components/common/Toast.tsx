import React, { useEffect, useRef } from 'react'
import { View, Text, Animated, Pressable, Dimensions } from 'react-native'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react-native'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  message: string
  type: ToastType
  duration?: number
  onClose?: () => void
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()

    if (duration > 0) {
      const timer = setTimeout(() => {
        closeToast()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [])

  const closeToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.()
    })
  }

  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: '#10B981', text: '#FFFFFF', border: '#059669' }
      case 'error':
        return { bg: '#EF4444', text: '#FFFFFF', border: '#DC2626' }
      case 'warning':
        return { bg: '#F59E0B', text: '#FFFFFF', border: '#D97706' }
      case 'info':
      default:
        return { bg: '#3B82F6', text: '#FFFFFF', border: '#2563EB' }
    }
  }

  const getIcon = () => {
    const color = getColors().text
    switch (type) {
      case 'success':
        return <CheckCircle size={20} color={color} strokeWidth={2.5} />
      case 'error':
        return <AlertCircle size={20} color={color} strokeWidth={2.5} />
      case 'warning':
        return <AlertCircle size={20} color={color} strokeWidth={2.5} />
      case 'info':
      default:
        return <Info size={20} color={color} strokeWidth={2.5} />
    }
  }

  const colors = getColors()
  const screenWidth = Dimensions.get('window').width

  return (
    <Animated.View
      style={[
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
          position: 'absolute',
          top: 60,
          left: 16,
          right: 16,
          zIndex: 9999,
        },
      ]}
    >
      <View
        style={{
          backgroundColor: colors.bg,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderLeftWidth: 4,
          borderLeftColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
          width: screenWidth - 32,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
          {getIcon()}
          <Text
            style={{
              color: colors.text,
              fontSize: 14,
              fontWeight: '500',
              flex: 1,
              paddingRight: 8,
            }}
            numberOfLines={3}
          >
            {message}
          </Text>
        </View>

        <Pressable onPress={closeToast} style={{ padding: 4, marginLeft: 8 }}>
          <X size={18} color={colors.text} strokeWidth={2.5} />
        </Pressable>
      </View>
    </Animated.View>
  )
}

export default Toast

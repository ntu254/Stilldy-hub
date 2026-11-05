import React, { useState, useEffect } from 'react'
import { Pressable, View, Keyboard, Platform } from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { BookOpen, Home, MessageCircleMore, Search, User, BookOpenIcon, LayoutDashboard, ShieldAlert, Users, Layers, Settings, CreditCard } from 'lucide-react-native'

const tabConfig = {
  Home: { label: 'Home', icon: Home },
  Documents: { label: 'Kho tài liệu', icon: BookOpenIcon },
  Chat: { label: 'AI Chat', icon: MessageCircleMore },
  Flashcards: { label: 'Thẻ học', icon: Layers },
  Profile: { label: 'Cá nhân', icon: User },
  AdminDashboard: { label: 'Thống kê', icon: LayoutDashboard },
  AdminReportedDocs: { label: 'Báo cáo', icon: ShieldAlert },
  AdminUsers: { label: 'Thành viên', icon: Users },
  AdminPlans: { label: 'Gói dịch vụ', icon: Settings },
  AdminPayments: { label: 'Giao dịch', icon: CreditCard },
} as const

export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(false)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true))
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  if (keyboardVisible) {
    return null
  }

  return (
    <View
      pointerEvents='box-none'
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 18,
        zIndex: 999,
        elevation: 999,
      }}
    >
      <View
        style={{
          marginHorizontal: 16,
          borderRadius: 32,
          marginBottom: 22,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.18,
          shadowRadius: 22,
          elevation: 16,
        }}
      >
        <View
          style={{
            borderRadius: 32,
            backgroundColor: '#111827',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
            paddingVertical: 8,
            overflow: 'hidden',
          }}
        >
          {state.routes.map((route, index) => {
            const isFocused = state.index === index
            const config = tabConfig[route.name as keyof typeof tabConfig]
            const Icon = config?.icon ?? BookOpen

            return (
              <Pressable
                key={route.key}
                accessibilityRole='button'
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={() => {
                  navigation.navigate({
                    name: route.name,
                    params: route.name === 'Flashcards' ? { showBack: false } : undefined,
                    merge: true,
                  } as any)
                }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 }}
              >
                <View
                  style={{
                    width: 60,
                    height: 50,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isFocused ? '#8678EA' : '#1B2030',
                    borderWidth: 1,
                    borderColor: isFocused ? '#A99BFF' : '#2B3242',
                    overflow: 'hidden',
                  }}
                >
                  <Icon color={isFocused ? '#FFFFFF' : '#CBD5E1'} size={22} />
                </View>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

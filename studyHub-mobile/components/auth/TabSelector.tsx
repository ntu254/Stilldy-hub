import React from 'react'
import { Pressable, View, Text } from 'react-native'

type AuthTab = 'login' | 'register' | 'forgot'

interface TabSelectorProps {
  activeTab: AuthTab
  onTabChange: (tab: AuthTab) => void
}

export default function TabSelector({ activeTab, onTabChange }: TabSelectorProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#121314', // Premium light grey (slate-100)
        padding: 10,
        borderRadius: 9999, // Perfect pill shape
        marginBottom: 16,
        width: '100%',
        alignSelf: 'stretch',
      }}
    >
      <Pressable
        onPress={() => onTabChange('login')}
        style={{
          flex: 1,
          paddingVertical: 12,
          borderRadius: 9999, // Perfect pill shape
          backgroundColor: activeTab === 'login' ? '#FFFFFF' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontWeight: '700',
            color: activeTab === 'login' ? '#121314' : '#64748B', // Modern inactive slate-500
            fontSize: 14.5,
          }}
        >
          {' '}
          Đăng nhập
        </Text>
      </Pressable>

      {/* Tab Đăng Ký */}
      <Pressable
        onPress={() => onTabChange('register')}
        style={{
          flex: 1,
          paddingVertical: 12,
          borderRadius: 9999, // Perfect pill shape
          backgroundColor: activeTab === 'register' ? '#FFFFFF' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontWeight: '700',
            color: activeTab === 'register' ? '#121314' : '#64748B', // Modern inactive slate-500
            fontSize: 14.5,
          }}
        >
          {' '}
          Đăng ký{' '}
        </Text>
      </Pressable>
    </View>
  )
}

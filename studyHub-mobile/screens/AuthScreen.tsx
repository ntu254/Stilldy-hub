import React, { useState } from 'react'
import { ScrollView, Keyboard, TouchableWithoutFeedback, View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm'
import { BookOpen } from 'lucide-react-native'

type AuthTab = 'login' | 'register' | 'forgot'

export default function AuthScreen() {
  const [activeTab, setActiveTab] = useState<AuthTab>('login')

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 100 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32, marginTop: 16 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#0F172A',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <BookOpen color='#FFFFFF' size={20} />
              </View>
              <Text
                style={{ fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 }}
              >
                Nexus
              </Text>
            </View>

            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 32,
                padding: 24,
                borderWidth: 1,
                borderColor: '#F1F5F9', // border mềm mại
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.04,
                shadowRadius: 16,
                elevation: 3,
                marginBottom: 24,
                width: '100%', // 🟢 Khóa chặt chiều ngang của Card lớn
              }}
            >
              <View style={{ marginBottom: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A', textAlign: 'center' }}>
                  {activeTab === 'login' && 'Đăng nhập'}
                  {activeTab === 'register' && 'Tạo tài khoản'}
                  {activeTab === 'forgot' && 'Quên mật khẩu'}
                </Text>
                <Text style={{ fontSize: 14, color: '#64748B', marginTop: 8, fontWeight: '500', textAlign: 'center', lineHeight: 20 }}>
                  {activeTab === 'login' && 'Chào mừng bạn quay trở lại! Vui lòng đăng nhập để tiếp tục.'}
                  {activeTab === 'register' && 'Đăng ký để bắt đầu hành trình học tập cùng Nexus.'}
                  {activeTab === 'forgot' && 'Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.'}
                </Text>
              </View>

              <View style={{ width: '100%' }}>
                {activeTab === 'login' && (
                  <LoginForm
                    onNavigateToForgot={() => setActiveTab('forgot')}
                    onNavigateToRegister={() => setActiveTab('register')}
                  />
                )}
                {activeTab === 'register' && (
                  <RegisterForm
                    onNavigateToLogin={() => setActiveTab('login')}
                  />
                )}
                {activeTab === 'forgot' && (
                  <ForgotPasswordForm
                    onBackToLogin={() => setActiveTab('login')}
                  />
                )}
              </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: 'auto', paddingTop: 16 }}>
              <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '500' }}>
                © 2026 Nexus. All rights reserved.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  )
}


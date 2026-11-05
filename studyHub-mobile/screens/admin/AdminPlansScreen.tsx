import React, { useEffect, useState, useRef } from 'react'
import { Animated, ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, ScrollView, Switch, Text, TextInput, View, TouchableOpacity, Keyboard } from 'react-native'
import { ArrowLeft, Plus, Pencil, Trash2, Layers, Check, X, TriangleAlert, Coins, Database, Clock, Tag, FileText, Save, ShieldAlert, Settings } from 'lucide-react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSelector } from 'react-redux'
import type { RootState } from '../../redux/store'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import { subscriptionApi, SubscriptionPlan } from '../../api/subscriptionApi'
import { adminApi } from '../../api/adminApi'
import { useToast } from '../../components/ui/ToastProvider'
import Svg, { Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg'

export default function AdminPlansScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute<any>()
  const currentUser = useSelector((state: RootState) => state.auth.user)
  const fromDashboard = route.params?.fromDashboard === true
  const toast = useToast()

  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshEnabled, setRefreshEnabled] = useState(true)
  const isMomentumRef = useRef(false)

  // Tabs & Settings Config state
  const [activeTab, setActiveTab] = useState<'plans' | 'config'>('plans')
  const [paymentExpiryMins, setPaymentExpiryMins] = useState('15')
  const [subscriptionGracePeriodDays, setSubscriptionGracePeriodDays] = useState('30')
  const [bannedUserGracePeriodDays, setBannedUserGracePeriodDays] = useState('30')
  const [savingSettings, setSavingSettings] = useState(false)

  const handleSaveConfig = async () => {
    const expMins = Number(paymentExpiryMins)
    const subGrace = Number(subscriptionGracePeriodDays)
    const banGrace = Number(bannedUserGracePeriodDays)

    if (isNaN(expMins) || expMins < 1 || expMins > 1440) {
      toast.error('Thời gian hết hạn QR thanh toán phải từ 1 đến 1440 phút.')
      return
    }
    if (isNaN(subGrace) || subGrace < 0 || subGrace > 365) {
      toast.error('Thời gian bảo lưu dung lượng Pro phải từ 0 đến 365 ngày.')
      return
    }
    if (isNaN(banGrace) || banGrace < 0 || banGrace > 365) {
      toast.error('Thời gian chờ xóa tài khoản phải từ 0 đến 365 ngày.')
      return
    }

    try {
      setSavingSettings(true)
      Keyboard.dismiss()
      await adminApi.updateSettings({
        paymentExpiryMins: expMins,
        subscriptionGracePeriodDays: subGrace,
        bannedUserGracePeriodDays: banGrace,
      })
      toast.success('Cập nhật cấu hình hệ thống thành công!')
    } catch (error: any) {
      toast.error(error?.toString() || 'Không thể cập nhật cấu hình')
    } finally {
      setSavingSettings(false)
    }
  }

  // Dialog state
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)

  // Deactivation confirmation modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form field states
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [storageLimitGb, setStorageLimitGb] = useState('')
  const [storageUnit, setStorageUnit] = useState<'GB' | 'MB' | 'TB'>('GB')
  const [durationDays, setDurationDays] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [description, setDescription] = useState('')
  const [featuresList, setFeaturesList] = useState<string[]>([])
  const [featureInput, setFeatureInput] = useState('')
  const [featuresText, setFeaturesText] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [submitting, setSubmitting] = useState(false)

  // Pulsing animation for Pro & Ultra cards
  const pulseAnim = React.useRef(new Animated.Value(0)).current
  // Flashing indicator animation
  const flashAnim = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    // Pulse loop (scale/glow)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start()

    // Flashing badge loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [])

  const cardScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.025],
  })

  const fetchPlans = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [plansData, settingsData] = await Promise.all([
        subscriptionApi.getPlansForAdmin(),
        adminApi.getSettings()
      ])
      setPlans(plansData || [])

      const settingsList = Array.isArray(settingsData)
        ? settingsData
        : (settingsData && Array.isArray((settingsData as any).data) ? (settingsData as any).data : [])

      settingsList.forEach((setting: any) => {
        if (setting.key === 'payment_expiry_mins') {
          setPaymentExpiryMins(String(setting.value))
        } else if (setting.key === 'subscription_grace_period_days') {
          setSubscriptionGracePeriodDays(String(setting.value))
        } else if (setting.key === 'banned_user_grace_period_days') {
          setBannedUserGracePeriodDays(String(setting.value))
        }
      })
    } catch (err: any) {
      toast.error(err.toString() || 'Lỗi khi tải danh sách cấu hình/gói dịch vụ.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleOpenDialog = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan)
      setName(plan.name)
      setPrice(plan.price.toString())
      
      // Detect storage unit automatically
      const limit = plan.storageLimit
      const TB = 1024 * 1024 * 1024 * 1024
      const GB = 1024 * 1024 * 1024
      const MB = 1024 * 1024
      
      if (limit >= TB && limit % TB === 0) {
        setStorageLimitGb((limit / TB).toString())
        setStorageUnit('TB')
      } else if (limit >= GB && limit % GB === 0) {
        setStorageLimitGb((limit / GB).toString())
        setStorageUnit('GB')
      } else {
        setStorageLimitGb((limit / MB).toString())
        setStorageUnit('MB')
      }
      
      setDurationDays(plan.durationDays.toString())
      setIsActive(plan.isActive)
      setDescription(plan.description || '')
      setFeaturesList(plan.features || [])
      setFeatureInput('')
      setFeaturesText((plan.features || []).join('\n'))
      setSortOrder((plan.sortOrder || 0).toString())
    } else {
      setEditingPlan(null)
      setName('')
      setPrice('')
      setStorageLimitGb('')
      setStorageUnit('GB')
      setDurationDays('30')
      setIsActive(true)
      setDescription('')
      setFeaturesList([])
      setFeatureInput('')
      setFeaturesText('')
      setSortOrder('0')
    }
    setModalVisible(true)
  }

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFeaturesList((prev) => [...prev, featureInput.trim()])
      setFeatureInput('')
    }
  }

  const handleRemoveFeature = (index: number) => {
    setFeaturesList((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSavePlan = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên gói dịch vụ.')
      return
    }

    const cleanPriceStr = price.replace(/[^0-9]/g, '')
    if (!price.trim() || cleanPriceStr === '') {
      Alert.alert('Lỗi', 'Vui lòng nhập giá gói dịch vụ.')
      return
    }
    const parsedPrice = parseInt(cleanPriceStr, 10)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Lỗi', 'Giá gói dịch vụ không hợp lệ (phải >= 0).')
      return
    }

    const trimmedStorage = storageLimitGb.trim()
    if (!trimmedStorage) {
      Alert.alert('Lỗi', 'Vui lòng nhập dung lượng.')
      return
    }
    const parsedStorage = parseFloat(trimmedStorage)
    if (isNaN(parsedStorage) || parsedStorage <= 0) {
      Alert.alert('Lỗi', 'Dung lượng phải là số lớn hơn 0.')
      return
    }

    const trimmedDuration = durationDays.trim()
    if (!trimmedDuration) {
      Alert.alert('Lỗi', 'Vui lòng nhập thời hạn gói.')
      return
    }
    const parsedDuration = parseInt(trimmedDuration, 10)
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      Alert.alert('Lỗi', 'Thời hạn gói phải là số ngày lớn hơn 0.')
      return
    }

    setSubmitting(true)
    try {
      let multiplier = 1024 * 1024 * 1024 // default GB
      if (storageUnit === 'MB') {
        multiplier = 1024 * 1024
      } else if (storageUnit === 'TB') {
        multiplier = 1024 * 1024 * 1024 * 1024
      }
      const bytesLimit = Math.round(parsedStorage * multiplier)

      const payload: Partial<SubscriptionPlan> = {
        name: trimmedName,
        price: parsedPrice,
        storageLimit: bytesLimit,
        durationDays: parsedDuration,
        isActive,
        description: description.trim() || null,
        features: featuresList.map(f => f.trim()).filter(Boolean),
        sortOrder: parseInt(sortOrder || '0', 10),
      }

      if (editingPlan) {
        await subscriptionApi.updatePlan(editingPlan._id, payload)
        toast.success('Đã cập nhật gói dịch vụ thành công!')
      } else {
        await subscriptionApi.createPlan(payload)
        toast.success('Đã tạo gói dịch vụ mới thành công!')
      }
      setModalVisible(false)
      fetchPlans()
    } catch (err: any) {
      const errMsg = err.toString()
      if (errMsg.includes('E11000') || errMsg.includes('duplicate') || errMsg.includes('Duplicate')) {
        toast.error('Tên gói dịch vụ đã tồn tại. Vui lòng chọn tên khác!')
      } else {
        toast.error(errMsg || 'Đã xảy ra lỗi trong quá trình lưu gói dịch vụ.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePlan = (plan: SubscriptionPlan) => {
    setPlanToDelete(plan)
    setDeleteModalVisible(true)
  }

  const confirmDeletePlan = async () => {
    if (!planToDelete) return
    setDeleting(true)
    try {
      await subscriptionApi.deletePlan(planToDelete._id)
      toast.success('Đã vô hiệu hóa gói dịch vụ thành công.')
      fetchPlans()
      setDeleteModalVisible(false)
      setPlanToDelete(null)
    } catch (err: any) {
      toast.error(err.toString() || 'Lỗi khi vô hiệu hóa gói.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
      {/* Conditional Header Section */}
      {fromDashboard ? (
        <View
          style={{
            paddingTop: 54,
            paddingHorizontal: 20,
            paddingBottom: 16,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <Pressable
            onPress={() => navigation.navigate('AdminDashboard' as any)}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <ArrowLeft size={20} color='#0F172A' />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Gói dịch vụ</Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>Quản lý gói nâng cấp tài khoản</Text>
          </View>
          <Pressable
            onPress={() => handleOpenDialog()}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#8678EA',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Plus size={20} color='#FFFFFF' />
          </Pressable>
        </View>
      ) : (
        <View
          style={{
            paddingTop: 54,
            paddingHorizontal: 20,
            paddingBottom: 14,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#0F172A',
            shadowOpacity: 0.02,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 1,
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: '900', fontStyle: 'italic', color: '#0F172A', letterSpacing: -0.5 }}>
            NEXUS<Text style={{ color: '#8678EA', fontStyle: 'normal' }}>.</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              onPress={() => handleOpenDialog()}
              style={({ pressed }) => ({
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: '#8678EA',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Plus size={18} color='#FFFFFF' />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
              style={{
                shadowColor: '#8678EA',
                shadowOpacity: 0.12,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 3 },
                elevation: 1,
              }}
            >
              <Image
                source={{ uri: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80' }}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  borderWidth: 1.5,
                  borderColor: '#8678EA',
                }}
              />
            </Pressable>
          </View>
        </View>
      )}

      {loading && plans.length === 0 ? (
        <ActivityIndicator size='large' color='#8678EA' style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 170 }}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y
            setRefreshEnabled(y <= 2)
          }}
          onMomentumScrollBegin={() => {
            isMomentumRef.current = true
          }}
          onMomentumScrollEnd={() => {
            isMomentumRef.current = false
          }}
          onScrollBeginDrag={() => {
            isMomentumRef.current = false
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              enabled={refreshEnabled}
              onRefresh={() => {
                if (isMomentumRef.current) return
                fetchPlans(true)
              }}
              colors={['#8678EA']}
            />
          }
        >
          {/* Banner Card styled exactly like the other dashboard options */}
          <View style={{ marginBottom: 24, borderRadius: 24, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              <Svg height="100%" width="100%">
                <Defs>
                  <LinearGradient id="planBannerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#F5F3FF" />
                    <Stop offset="100%" stopColor="#EEF2FF" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#planBannerGrad)" />
                <Circle cx="90%" cy="10%" r="50" fill="#E9D5FF" opacity="0.6" />
                <Circle cx="80%" cy="90%" r="30" fill="#C7D2FE" opacity="0.4" />
              </Svg>
            </View>
            <View
              style={{
                padding: 20,
                borderWidth: 1.5,
                borderColor: '#E9D5FF',
                borderRadius: 24,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: '#8B5CF6', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Ban điều hành
                </Text>
                <Text style={{ color: '#5B21B6', fontSize: 26, fontWeight: '900', marginTop: 4, lineHeight: 32 }}>
                  {activeTab === 'plans' ? 'Gói Dịch Vụ' : 'Cấu Hình Hệ Thống'}
                </Text>
                <Text style={{ color: '#6D28D9', marginTop: 8, lineHeight: 18, fontSize: 13, opacity: 0.8 }}>
                  {activeTab === 'plans'
                    ? 'Thiết lập các gói cước nâng cấp tài khoản, dung lượng lưu trữ đám mây và giới hạn thời gian cho sinh viên.'
                    : 'Cấu hình các tham số vận hành: hạn mức thanh toán QR, thời gian bảo lưu Pro, và chính sách xóa tài khoản.'}
                </Text>
              </View>
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  backgroundColor: '#8678EA',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#8678EA',
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 3,
                }}
              >
                {activeTab === 'plans' ? (
                  <Layers color='#FFFFFF' size={24} />
                ) : (
                  <Settings color='#FFFFFF' size={24} />
                )}
              </View>
            </View>
          </View>

          {/* Segmented Control Tabs */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 4,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 20,
            }}
          >
            <Pressable
              onPress={() => setActiveTab('plans')}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderRadius: 10,
                backgroundColor: activeTab === 'plans' ? '#8678EA' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: activeTab === 'plans' ? '#FFFFFF' : '#64748B',
                }}
              >
                Gói dịch vụ
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('config')}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderRadius: 10,
                backgroundColor: activeTab === 'config' ? '#8678EA' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: activeTab === 'config' ? '#FFFFFF' : '#64748B',
                }}
              >
                Cấu hình chung
              </Text>
            </Pressable>
          </View>

          {activeTab === 'plans' ? (
            <>
              <TouchableOpacity
                onPress={() => handleOpenDialog()}
                style={{
                  backgroundColor: '#8678EA',
                  borderRadius: 16,
                  height: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 24,
                  shadowColor: '#8678EA',
                  shadowOpacity: 0.2,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 4,
                }}
                activeOpacity={0.8}
              >
                <Plus size={20} color='#FFFFFF' />
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                  Thêm gói dịch vụ mới
                </Text>
              </TouchableOpacity>

              {plans.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 50, padding: 30 }}>
                  <Layers size={48} color='#94A3B8' />
                  <Text style={{ marginTop: 16, fontSize: 15, fontWeight: '700', color: '#64748B' }}>
                    Chưa có gói dịch vụ nào
                  </Text>
                  <Text style={{ marginTop: 6, fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
                    Bấm nút "Thêm gói dịch vụ mới" ở trên để tạo gói dịch vụ đầu tiên.
                  </Text>
                </View>
              ) : (
                (() => {
                  const sortedPlans = [...plans].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                  return sortedPlans.map((plan) => {
                    const nameLower = plan.name.toLowerCase()
                    const isPro = nameLower.includes('pro')
                    const isUltra = nameLower.includes('ultra')

                    // Styling configurations
                    let cardBg = '#FFFFFF'
                    let cardBorder: any = '#E2E8F0'
                    let titleColor = '#0F172A'
                    let descColor = '#64748B'
                    let priceColor = '#8678EA'
                    let durationColor = '#64748B'
                    let featureColor = '#475569'
                    let btnEditBg = '#F1F5F9'
                    let btnDelBg = '#FEF2F2'
                    let badgeLabel = ''
                    let badgeBg = '#8678EA'
                    let badgeText = '#FFFFFF'

                    if (isPro) {
                      cardBg = '#0F0E26' // Deep dark indigo
                      cardBorder = '#818CF8'
                      titleColor = '#FFFFFF'
                      descColor = '#A5B4FC'
                      priceColor = '#C084FC'
                      durationColor = '#94A3B8'
                      featureColor = '#E2E8F0'
                      btnEditBg = 'rgba(255,255,255,0.1)'
                      btnDelBg = 'rgba(239,68,68,0.2)'
                      badgeLabel = 'BÁN CHẠY NHẤT'
                      badgeBg = '#6366F1'
                    } else if (isUltra) {
                      cardBg = '#0B0F19' // Obsidian Gold
                      cardBorder = '#EAB308'
                      titleColor = '#F59E0B' // Gold title
                      descColor = '#94A3B8'
                      priceColor = '#F59E0B'
                      durationColor = '#94A3B8'
                      featureColor = '#F8FAFC'
                      btnEditBg = 'rgba(255,255,255,0.15)'
                      btnDelBg = 'rgba(239,68,68,0.2)'
                      badgeLabel = 'SIÊU CẤP / PREMIUM'
                      badgeBg = '#EAB308'
                      badgeText = '#0B0F19'
                    }

                    return (
                      <Animated.View
                        key={plan._id}
                        style={{
                          backgroundColor: cardBg,
                          borderRadius: 28,
                          borderWidth: (isPro || isUltra) ? 2 : 1,
                          borderColor: cardBorder,
                          padding: 20,
                          marginBottom: 20,
                          shadowColor: isUltra ? '#EAB308' : isPro ? '#818CF8' : '#8678EA',
                          shadowOpacity: 0.1,
                          shadowRadius: 18,
                          shadowOffset: { width: 0, height: 8 },
                          elevation: 2,
                          transform: (isPro || isUltra) ? [{ scale: cardScale }] : undefined
                        }}
                      >
                        {/* Top Status & Badge Line */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          {badgeLabel ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              {/* Pulsing indicator light */}
                              <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isUltra ? '#EAB308' : '#10B981', opacity: flashAnim }} />
                              <View
                                style={{
                                  backgroundColor: badgeBg,
                                  paddingHorizontal: 12,
                                  paddingVertical: 4,
                                  borderRadius: 12,
                                }}
                              >
                                <Text style={{ color: badgeText, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                  {badgeLabel}
                                </Text>
                              </View>
                            </View>
                          ) : <View />}

                          <View
                            style={{
                              backgroundColor: plan.isActive ? '#DCFCE7' : '#F1F5F9',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 8,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '800',
                                color: plan.isActive ? '#15803D' : '#64748B',
                              }}
                            >
                              {plan.isActive ? 'Đang hoạt động' : 'Tạm ẩn'}
                            </Text>
                          </View>
                        </View>

                        {/* Card Title & Actions Section */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={{ fontSize: 24, fontWeight: '900', color: titleColor }}>{plan.name}</Text>
                            
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8, marginBottom: 12 }}>
                              <Text style={{ fontSize: 30, fontWeight: '900', color: priceColor }}>
                                {new Intl.NumberFormat('vi-VN').format(plan.price)} <Text style={{ textDecorationLine: 'underline' }}>đ</Text>
                              </Text>
                              <Text style={{ fontSize: 13, color: durationColor, marginLeft: 4 }}>
                                / {plan.durationDays} ngày
                              </Text>
                            </View>
                          </View>

                          {/* Edit / Delete Buttons */}
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Pressable
                              onPress={() => handleOpenDialog(plan)}
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                backgroundColor: btnEditBg,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Pencil size={15} color={isPro || isUltra ? '#FFFFFF' : '#64748B'} />
                            </Pressable>
                            {plan.isActive && (
                              <Pressable
                                onPress={() => handleDeletePlan(plan)}
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 8,
                                  backgroundColor: btnDelBg,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Trash2 size={15} color='#EF4444' />
                              </Pressable>
                            )}
                          </View>
                        </View>

                        {plan.description && (
                          <Text style={{ fontSize: 13, color: descColor, lineHeight: 18, marginBottom: 16 }}>
                            {plan.description}
                          </Text>
                        )}

                        {/* Features list exactly like user side */}
                        <View
                          style={{
                            borderTopWidth: 1,
                            borderTopColor: isPro || isUltra ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                            paddingTop: 14,
                            gap: 10,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <View>
                              <Text style={{ fontSize: 11, color: durationColor }}>Dung lượng</Text>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: titleColor, marginTop: 2 }}>
                                {(plan.storageLimit / (1024 * 1024 * 1024)).toFixed(0)} GB
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ fontSize: 11, color: durationColor }}>Thời hạn</Text>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: titleColor, marginTop: 2 }}>
                                {plan.durationDays} ngày
                              </Text>
                            </View>
                          </View>

                          {plan.features.map((feat, idx) => (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: isPro || isUltra ? 'rgba(16,185,129,0.15)' : '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                                <Check color='#10B981' size={12} />
                              </View>
                              <Text style={{ fontSize: 12, color: featureColor, flex: 1 }}>{feat}</Text>
                            </View>
                          ))}
                        </View>
                      </Animated.View>
                    )
                  })
                })()
              )}
            </>
          ) : (
            <View style={{ gap: 16 }}>
              {/* Card 1: Cấu hình thanh toán */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  gap: 16,
                  shadowColor: '#8678EA',
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#FFF7ED',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Clock color='#EA580C' size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                      Cấu hình thanh toán
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      Thiết lập thời gian liên quan đến giao dịch và thanh toán.
                    </Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />

                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                    Thời gian hết hạn mã QR (phút)
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4, marginBottom: 10, lineHeight: 16 }}>
                    Xác định thời gian hiệu lực của một đơn hàng trước khi bị hệ thống tự động hủy bỏ. (Từ 1 - 1440 phút).
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      backgroundColor: '#F8FAFC',
                      paddingHorizontal: 14,
                      height: 48,
                    }}
                  >
                    <TextInput
                      keyboardType='numeric'
                      value={paymentExpiryMins}
                      onChangeText={setPaymentExpiryMins}
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: '#0F172A',
                        padding: 0,
                      }}
                    />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginLeft: 8 }}>
                      phút
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card 2: Chính sách ân hạn tài liệu */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  gap: 16,
                  shadowColor: '#8678EA',
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#FEF2F2',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShieldAlert color='#EF4444' size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                      Chính sách ân hạn tài liệu
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      Thời gian hệ thống lưu giữ tài liệu của người dùng khi tài khoản gặp vấn đề.
                    </Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />

                {/* Input 2.1 */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                    Hạn giữ bộ nhớ nâng cao (ngày)
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4, marginBottom: 10, lineHeight: 16 }}>
                    Số ngày giữ lại tài liệu vượt quá dung lượng miễn phí sau khi người dùng hết hạn gói nâng cao. (Từ 0 - 365 ngày).
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      backgroundColor: '#F8FAFC',
                      paddingHorizontal: 14,
                      height: 48,
                    }}
                  >
                    <TextInput
                      keyboardType='numeric'
                      value={subscriptionGracePeriodDays}
                      onChangeText={setSubscriptionGracePeriodDays}
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: '#0F172A',
                        padding: 0,
                      }}
                    />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginLeft: 8 }}>
                      ngày
                    </Text>
                  </View>
                </View>

                {/* Input 2.2 */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                    Hạn chờ xóa dữ liệu khóa (ngày)
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4, marginBottom: 10, lineHeight: 16 }}>
                    Số ngày giữ lại tài liệu sau khi người dùng bị hệ thống khóa tài khoản. Sau đó tài liệu sẽ bị xóa. (Từ 0 - 365 ngày).
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      backgroundColor: '#F8FAFC',
                      paddingHorizontal: 14,
                      height: 48,
                    }}
                  >
                    <TextInput
                      keyboardType='numeric'
                      value={bannedUserGracePeriodDays}
                      onChangeText={setBannedUserGracePeriodDays}
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: '#0F172A',
                        padding: 0,
                      }}
                    />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginLeft: 8 }}>
                      ngày
                    </Text>
                  </View>
                </View>

                {/* Orange Warning Note Box */}
                <View
                  style={{
                    backgroundColor: '#FFFBEB',
                    borderWidth: 1,
                    borderColor: '#FDE68A',
                    borderRadius: 16,
                    padding: 14,
                    flexDirection: 'row',
                    gap: 10,
                    marginTop: 4,
                  }}
                >
                  <TriangleAlert color='#D97706' size={18} style={{ marginTop: 2 }} />
                  <Text style={{ fontSize: 11, color: '#B45309', lineHeight: 16, flex: 1 }}>
                    <Text style={{ fontWeight: '800' }}>Lưu ý: </Text>
                    Việc thay đổi cấu hình bảo lưu và chờ xóa sẽ áp dụng cho tất cả tài liệu vi phạm sau thời điểm cấu hình được lưu. Các tài liệu đã ở trong trạng thái chờ xử lý trước đó không bị ảnh hưởng.
                  </Text>
                </View>
              </View>

              {/* Save button */}
              <TouchableOpacity
                onPress={handleSaveConfig}
                disabled={savingSettings}
                style={{
                  backgroundColor: '#8678EA',
                  borderRadius: 16,
                  height: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 8,
                  shadowColor: '#8678EA',
                  shadowOpacity: 0.2,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 4,
                  opacity: savingSettings ? 0.7 : 1,
                }}
                activeOpacity={0.8}
              >
                {savingSettings ? (
                  <ActivityIndicator size='small' color='#FFFFFF' />
                ) : (
                  <>
                    <Save size={18} color='#FFFFFF' />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                      Lưu cấu hình
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}



      {/* Plan edit/create modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType='fade'
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24 }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              width: '100%',
              height: '90%',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={20} color='#8678EA' />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A' }}>
                  {editingPlan ? 'Chỉnh sửa gói dịch vụ' : 'Thêm gói dịch vụ mới'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color='#64748B' />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}
            >
              {/* Row 1: Plan Name & Price */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Tên gói <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder='VD: Starter, PRO...'
                    placeholderTextColor='#94A3B8'
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      height: 48,
                      fontSize: 14,
                      fontWeight: '500',
                      color: '#0F172A',
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Giá (VNĐ) <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType='numeric'
                    placeholder='0'
                    placeholderTextColor='#94A3B8'
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      height: 48,
                      fontSize: 14,
                      fontWeight: '500',
                      color: '#0F172A',
                    }}
                  />
                </View>
              </View>

              {/* Row 2: Storage & Duration */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1.2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Dung lượng <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={storageLimitGb}
                      onChangeText={setStorageLimitGb}
                      keyboardType='numeric'
                      placeholder='10'
                      placeholderTextColor='#94A3B8'
                      style={{
                        flex: 1,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: '#E2E8F0',
                        borderRadius: 14,
                        paddingHorizontal: 14,
                        height: 48,
                        fontSize: 14,
                        fontWeight: '500',
                        color: '#0F172A',
                      }}
                    />
                    {/* Unit Selector pills */}
                    <View style={{ flexDirection: 'row', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, overflow: 'hidden', height: 48, backgroundColor: '#F8FAFC' }}>
                      {(['MB', 'GB', 'TB'] as const).map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          onPress={() => setStorageUnit(unit)}
                          style={{
                            paddingHorizontal: 12,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: storageUnit === unit ? '#8678EA' : 'transparent',
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '800', color: storageUnit === unit ? '#FFFFFF' : '#64748B' }}>
                            {unit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={{ flex: 0.9 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Thời hạn (ngày) <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TextInput
                    value={durationDays}
                    onChangeText={setDurationDays}
                    keyboardType='numeric'
                    placeholder='30'
                    placeholderTextColor='#94A3B8'
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      height: 48,
                      fontSize: 14,
                      fontWeight: '500',
                      color: '#0F172A',
                    }}
                  />
                </View>
              </View>

              {/* Row 3: Short Description */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Mô tả ngắn
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder='Mô tả ngắn gọn về tính năng nổi bật của gói cước...'
                  placeholderTextColor='#94A3B8'
                  multiline
                  numberOfLines={2}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1.5,
                    borderColor: '#E2E8F0',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    minHeight: 74,
                    fontSize: 14,
                    color: '#0F172A',
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              {/* Row 4: Feature Builder */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Danh sách tính năng
                </Text>

                {/* Feature Input Row */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TextInput
                    value={featureInput}
                    onChangeText={setFeatureInput}
                    placeholder='Nhập tính năng (VD: Tải file lên tới 50MB)'
                    placeholderTextColor='#94A3B8'
                    style={{
                      flex: 1,
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      height: 48,
                      fontSize: 14,
                      color: '#0F172A',
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleAddFeature}
                    style={{
                      backgroundColor: '#0F172A',
                      borderRadius: 14,
                      paddingHorizontal: 18,
                      height: 48,
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'row',
                      gap: 6,
                    }}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color='#FFFFFF' />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Thêm</Text>
                  </TouchableOpacity>
                </View>

                {/* Features List Container */}
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1.5,
                    borderColor: '#E2E8F0',
                    borderRadius: 16,
                    padding: 12,
                    minHeight: 80,
                    justifyContent: 'center',
                  }}
                >
                  {featuresList.length === 0 ? (
                    <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', fontStyle: 'italic' }}>Chưa có tính năng nào được thêm.</Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {featuresList.map((feat, idx) => (
                        <View
                          key={idx}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                              <Check color='#10B981' size={12} />
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', flex: 1 }}>{feat}</Text>
                          </View>
                          <TouchableOpacity onPress={() => handleRemoveFeature(idx)} style={{ padding: 4 }}>
                            <X size={14} color='#EF4444' />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Row 5: Sort Order & Switch */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Thứ tự hiển thị
                  </Text>
                  <TextInput
                    value={sortOrder}
                    onChangeText={setSortOrder}
                    keyboardType='numeric'
                    placeholder='0'
                    placeholderTextColor='#94A3B8'
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      height: 48,
                      fontSize: 14,
                      color: '#0F172A',
                    }}
                  />
                </View>

                <View
                  style={{
                    flex: 1.2,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1.5,
                    borderColor: '#E2E8F0',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    height: 48,
                    marginTop: 18
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Đang hoạt động</Text>
                  <Switch
                    value={isActive}
                    onValueChange={setIsActive}
                    trackColor={{ false: '#CBD5E1', true: '#8678EA' }}
                    thumbColor='#FFFFFF'
                  />
                </View>
              </View>

              {/* Footer Action Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{
                    backgroundColor: '#F1F5F9',
                    borderRadius: 14,
                    paddingHorizontal: 20,
                    height: 48,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#475569', fontWeight: '800', fontSize: 14 }}>Hủy bỏ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSavePlan}
                  disabled={submitting}
                  style={{
                    backgroundColor: '#8678EA',
                    borderRadius: 14,
                    paddingHorizontal: 24,
                    height: 48,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    shadowColor: '#8678EA',
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 3,
                  }}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color='#FFFFFF' size='small' />
                  ) : (
                    <>
                      <Save size={16} color='#FFFFFF' />
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Lưu gói</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Deactivate Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType='fade'
        onRequestClose={() => {
          if (!deleting) {
            setDeleteModalVisible(false)
            setPlanToDelete(null)
          }
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => {
              if (!deleting) {
                setDeleteModalVisible(false)
                setPlanToDelete(null)
              }
            }}
          />

          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              width: '85%',
              padding: 24,
              shadowColor: '#0F172A',
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 10,
              alignItems: 'center',
            }}
          >
            {/* Warning Icon Container */}
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#FEE2E2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <TriangleAlert size={26} color='#EF4444' />
            </View>

            {/* Title */}
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
              Xác nhận vô hiệu hóa
            </Text>

            {/* Content description */}
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
              Bạn có chắc chắn muốn vô hiệu hóa gói{' '}
              <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                "{planToDelete?.name}"
              </Text>{' '}
              không? Người dùng sẽ không thể đăng ký gói này nữa.
            </Text>

            {/* Buttons Row */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' }}>
              <Pressable
                onPress={() => {
                  setDeleteModalVisible(false)
                  setPlanToDelete(null)
                }}
                disabled={deleting}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700' }}>Hủy bỏ</Text>
              </Pressable>

              <Pressable
                onPress={confirmDeletePlan}
                disabled={deleting}
                style={{
                  flex: 1.2,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: '#EF4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#EF4444',
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 2,
                }}
              >
                {deleting ? (
                  <ActivityIndicator size='small' color='#FFFFFF' />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Vô hiệu hóa</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  )
}

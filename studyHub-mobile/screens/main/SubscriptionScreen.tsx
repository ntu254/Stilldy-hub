import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Switch,
  Alert,
  Animated
} from 'react-native'
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  Check,
  Package,
  HardDrive,
  Clock,
  ArrowLeft,
  Settings,
  Crown,
  Calendar,
  Zap,
  ShieldCheck,
  RefreshCw,
  TriangleAlert,
  Coins,
  Database,
  Tag,
  FileText,
  Layers
} from 'lucide-react-native'
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg'
import { useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { WebView } from 'react-native-webview'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import type { RootState } from '../../redux/store'
import ScreenShell from '../../components/layout/ScreenShell'
import { subscriptionApi, SubscriptionPlan, Subscription } from '../../api/subscriptionApi'
import { useToast } from '../../components/ui/ToastProvider'

function formatBytesToGB(bytes: number): string {
  if (!bytes) return '0 GB'
  const gb = bytes / (1024 * 1024 * 1024)
  return `${gb.toFixed(0)} GB`
}

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' đ'
}

export default function SubscriptionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const user = useSelector((state: RootState) => state.auth.user)
  const isAdmin = user?.role === 'admin'
  const toast = useToast()

  // Pulsing animation for Pro & Ultra cards
  const pulseAnim = React.useRef(new Animated.Value(0)).current
  // Border color cycling animation (rainbow flow)
  const colorAnim = React.useRef(new Animated.Value(0)).current
  // Flashing indicator animation
  const flashAnim = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    // Pulse loop (scale/glow)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: false,
        }),
      ])
    ).start()

    // Color sweep loop (rainbow border flow)
    Animated.loop(
      Animated.timing(colorAnim, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: false,
      })
    ).start()

    // Flashing badge loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ])
    ).start()
  }, [])

  const cardScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.025],
  })

  // Border colors interpolations
  const proBorderColor = colorAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['#818CF8', '#EC4899', '#3B82F6', '#F59E0B', '#818CF8'],
  })

  const ultraBorderColor = colorAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['#EAB308', '#F97316', '#EF4444', '#10B981', '#EAB308'],
  })

  const [activeTab, setActiveTab] = useState<'buy' | 'admin'>(isAdmin ? 'admin' : 'buy')
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [mySubscription, setMySubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // WebView payment states
  const [showWebView, setShowWebView] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState('')

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState
    // Fallback detection in state change
    if (url.includes('payment/success') && showWebView) {
      setShowWebView(false)
      toast.success('Thanh toán thành công!')
      loadUserData()
    } else if (url.includes('payment/cancel') && showWebView) {
      setShowWebView(false)
      toast.error('Giao dịch thanh toán đã bị hủy.')
    }
  }

  const handleShouldStartLoad = (request: any) => {
    const { url } = request
    
    // Intercept payment success/cancel immediately to avoid ERR_CONNECTION_REFUSED on localhost
    if (url.includes('payment/success')) {
      setShowWebView(false)
      toast.success('Thanh toán thành công!')
      loadUserData()
      return false
    }
    if (url.includes('payment/cancel')) {
      setShowWebView(false)
      toast.error('Giao dịch thanh toán đã bị hủy.')
      return false
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Linking.openURL(url).catch((err) => {
        console.warn('[WebView] Không thể mở liên kết ngân hàng:', err)
      })
      return false
    }
    return true
  }

  // Admin states
  const [adminPlans, setAdminPlans] = useState<SubscriptionPlan[]>([])
  const [formVisible, setFormVisible] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  
  // Admin form fields
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [storageGB, setStorageGB] = useState('')
  const [durationDays, setDurationDays] = useState('30')
  const [isActive, setIsActive] = useState(true)
  const [description, setDescription] = useState('')
  const [featuresText, setFeaturesText] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [savingPlan, setSavingPlan] = useState(false)

  // Custom delete modal states
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [planToDeleteId, setPlanToDeleteId] = useState<string | null>(null)
  const [planToDeleteName, setPlanToDeleteName] = useState<string>('')
  const [deleting, setDeleting] = useState(false)

  // Load User view data
  const loadUserData = async () => {
    setLoading(true)
    try {
      const plansList = await subscriptionApi.getPlans()
      // Sort by sortOrder
      plansList.sort((a, b) => a.sortOrder - b.sortOrder)
      setPlans(plansList)

      const sub = await subscriptionApi.getMySubscription()
      if (sub && 'status' in sub && (sub.status === 'ACTIVE' || sub.status === 'active')) {
        setMySubscription(sub as Subscription)
      } else {
        setMySubscription(null)
      }
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể tải gói dịch vụ.')
    } finally {
      setLoading(false)
    }
  }

  // Load Admin view data
  const loadAdminData = async () => {
    setLoading(true)
    try {
      const list = await subscriptionApi.getPlansForAdmin()
      list.sort((a, b) => a.sortOrder - b.sortOrder)
      setAdminPlans(list)
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể tải danh sách quản lý gói.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'buy') {
      loadUserData()
    } else {
      loadAdminData()
    }
  }, [activeTab])

  // Handle user upgrade purchase
  const handleUpgrade = async (planId: string) => {
    setActionLoadingId(planId)
    try {
      const res = await subscriptionApi.purchasePlan(planId)
      if (res.checkoutUrl) {
        setPaymentUrl(res.checkoutUrl)
        setShowWebView(true)
      } else {
        toast.error('Không tìm thấy link thanh toán.')
      }
    } catch (err: any) {
      toast.error(err.toString() || 'Khởi tạo giao dịch thất bại.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeletePlan = (id: string, planName: string) => {
    setPlanToDeleteId(id)
    setPlanToDeleteName(planName)
    setDeleteModalVisible(true)
  }

  const confirmDeletePlan = async () => {
    if (!planToDeleteId) return
    setDeleting(true)
    try {
      await subscriptionApi.deletePlan(planToDeleteId)
      toast.success('Đã xóa/vô hiệu hóa gói thành công.')
      loadAdminData()
      setDeleteModalVisible(false)
      setPlanToDeleteId(null)
      setPlanToDeleteName('')
    } catch (err: any) {
      toast.error(err.toString())
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenForm = (plan: SubscriptionPlan | null) => {
    if (plan) {
      setEditingPlan(plan)
      setName(plan.name)
      setPrice(plan.price.toString())
      setStorageGB((plan.storageLimit / 1024 / 1024 / 1024).toFixed(0))
      setDurationDays(plan.durationDays.toString())
      setIsActive(plan.isActive)
      setDescription(plan.description || '')
      setFeaturesText(plan.features.join('\n'))
      setSortOrder(plan.sortOrder.toString())
    } else {
      setEditingPlan(null)
      setName('')
      setPrice('')
      setStorageGB('')
      setDurationDays('30')
      setIsActive(true)
      setDescription('')
      setFeaturesText('Tự do sử dụng các tính năng của Nexus')
      setSortOrder('0')
    }
    setFormVisible(true)
  }

  const handleSavePlan = async () => {
    if (!name.trim()) {
      toast.warning('Vui lòng nhập tên gói.')
      return
    }
    const parsedPrice = parseInt(price)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.warning('Giá tiền không hợp lệ.')
      return
    }
    const parsedGB = parseFloat(storageGB)
    if (isNaN(parsedGB) || parsedGB <= 0) {
      toast.warning('Dung lượng bộ nhớ (GB) phải lớn hơn 0.')
      return
    }
    const parsedDays = parseInt(durationDays)
    if (isNaN(parsedDays) || parsedDays <= 0) {
      toast.warning('Thời hạn (ngày) phải lớn hơn 0.')
      return
    }

    setSavingPlan(true)
    try {
      const limitBytes = Math.round(parsedGB * 1024 * 1024 * 1024)
      const features = featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0)

      const payload = {
        name: name.trim(),
        price: parsedPrice,
        storageLimit: limitBytes,
        durationDays: parsedDays,
        isActive,
        description: description.trim() || null,
        features,
        sortOrder: parseInt(sortOrder) || 0
      }

      if (editingPlan) {
        await subscriptionApi.updatePlan(editingPlan._id, payload)
        toast.success('Cập nhật gói thành công!')
      } else {
        await subscriptionApi.createPlan(payload)
        toast.success('Tạo gói mới thành công!')
      }
      setFormVisible(false)
      loadAdminData()
    } catch (err: any) {
      toast.error(err.toString() || 'Lưu gói dịch vụ thất bại.')
    } finally {
      setSavingPlan(false)
    }
  }

  const currentActivePlanId = typeof mySubscription?.planId === 'object' 
    ? mySubscription.planId?._id 
    : mySubscription?.planId

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
      {/* Header */}
      <View
        style={{
          paddingTop: Platform.OS === 'ios' ? 54 : 44,
          paddingHorizontal: 20,
          paddingBottom: 14,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#F8FAFC',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X color='#475569' size={16} />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A' }}>
          {isAdmin ? 'Quản lý gói dịch vụ' : 'Nâng cấp tài khoản'}
        </Text>
        <Pressable
          onPress={() => {
            if (activeTab === 'buy') {
              loadUserData()
            } else {
              loadAdminData()
            }
            toast.success('Đã làm mới dữ liệu!')
          }}
          disabled={loading}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#F8FAFC',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed || loading ? 0.6 : 1,
          })}
        >
          <RefreshCw color='#475569' size={16} />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#8678EA" />
          <Text style={{ marginTop: 12, color: '#64748B' }}>Đang tải dữ liệu...</Text>
        </View>
      ) : activeTab === 'buy' ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {/* Active subscription details */}
          {mySubscription ? (
            (() => {
              const planName = typeof mySubscription.planId === 'object' ? mySubscription.planId.name : 'Đang hoạt động'
              const nameLower = planName.toLowerCase()
              const isPro = nameLower.includes('pro')
              const isUltra = nameLower.includes('ultra')
              const isPlus = nameLower.includes('plus')

              // Config details for active plan
              let gradientColors = ['#1E293B', '#0F172A'] // fallback dark grey gradient
              let themeColor = '#10B981' // green
              let iconBg = 'rgba(16, 185, 129, 0.15)'
              let badgeText = 'ĐANG HOẠT ĐỘNG'
              let PlanIcon = ShieldCheck
              let glowColor = 'rgba(16, 185, 129, 0.3)'
              let cardBorderColor: any = '#10B981'

              if (isUltra) {
                // Golden obsidian premium
                gradientColors = ['#1A1405', '#0F0E03', '#1B1405']
                themeColor = '#F59E0B' // gold
                iconBg = 'rgba(245, 158, 11, 0.15)'
                badgeText = 'SIÊU CẤP / PREMIUM'
                PlanIcon = Crown
                glowColor = 'rgba(245, 158, 11, 0.4)'
                cardBorderColor = ultraBorderColor // Reuse the cycling rainbow/gold border color
              } else if (isPro) {
                // Purple-magenta premium
                gradientColors = ['#1E112F', '#0D0C1D']
                themeColor = '#C084FC' // purple/violet
                iconBg = 'rgba(192, 132, 252, 0.15)'
                badgeText = 'CHUYÊN NGHIỆP / PRO'
                PlanIcon = Zap
                glowColor = 'rgba(192, 132, 252, 0.4)'
                cardBorderColor = proBorderColor // Reuse cycling pro border
              } else if (isPlus) {
                // Royal blue-indigo premium
                gradientColors = ['#0F172A', '#1E1B4B']
                themeColor = '#6366F1' // indigo
                iconBg = 'rgba(99, 102, 241, 0.15)'
                badgeText = 'MỞ RỘNG / PLUS'
                PlanIcon = Sparkles
                glowColor = 'rgba(99, 102, 241, 0.3)'
                cardBorderColor = '#6366F1'
              }

              // Calculate remaining days
              const now = new Date()
              const end = new Date(mySubscription.endDate)
              const diffTime = end.getTime() - now.getTime()
              const remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

              return (
                <Animated.View
                  style={{
                    backgroundColor: '#0F172A',
                    borderRadius: 24,
                    borderWidth: 1.5,
                    borderColor: cardBorderColor,
                    padding: 0,
                    marginBottom: 24,
                    shadowColor: themeColor,
                    shadowOpacity: 0.25,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 5,
                    overflow: 'hidden',
                  }}
                >
                  {/* SVG Background Gradient for card */}
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                    <Svg height="100%" width="100%">
                      <Defs>
                        <LinearGradient id="activePlanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          {gradientColors.map((color, index) => (
                            <Stop 
                              key={index} 
                              offset={`${(index / (gradientColors.length - 1)) * 100}%`} 
                              stopColor={color} 
                            />
                          ))}
                        </LinearGradient>
                      </Defs>
                      <Rect width="100%" height="100%" fill="url(#activePlanGrad)" />
                      {/* Decorative glowing circles */}
                      <Circle cx="90%" cy="20%" r="50" fill={themeColor} opacity="0.08" />
                      <Circle cx="10%" cy="80%" r="40" fill={themeColor} opacity="0.05" />
                    </Svg>
                  </View>

                  {/* Card Content wrapper */}
                  <View style={{ padding: 20 }}>
                    {/* Header line */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {/* Pulse dot */}
                        <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: themeColor, opacity: flashAnim }} />
                        <View style={{ backgroundColor: iconBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                          <Text style={{ color: themeColor, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                            {badgeText}
                          </Text>
                        </View>
                      </View>
                      
                      {remainingDays > 0 ? (
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                          <Text style={{ color: '#F1F5F9', fontSize: 10, fontWeight: '700' }}>
                            Còn {remainingDays} ngày
                          </Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                            Hết hạn hôm nay
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Mid Section: Icon and Plan Name */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                      <View
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 23,
                          backgroundColor: iconBg,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.08)',
                          shadowColor: themeColor,
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 2
                        }}
                      >
                        <PlanIcon color={themeColor} size={22} />
                      </View>
                      
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Gói dịch vụ hiện tại
                        </Text>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: isUltra ? '#F59E0B' : '#FFFFFF', marginTop: 2, textShadowColor: glowColor, textShadowRadius: 8 }}>
                          {planName}
                        </Text>
                      </View>
                    </View>

                    {/* Divider line */}
                    <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />

                    {/* Footer Section: Expiry Date and features */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Calendar size={13} color={themeColor} />
                        <Text style={{ fontSize: 12, color: '#94A3B8' }}>
                          Hạn dùng đến hết:{' '}
                          <Text style={{ color: '#F1F5F9', fontWeight: '800' }}>
                            {new Date(mySubscription.endDate).toLocaleDateString('vi-VN')}
                          </Text>
                        </Text>
                      </View>
                      
                      {typeof mySubscription.planId === 'object' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <HardDrive size={12} color="#94A3B8" />
                          <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                            {formatBytesToGB(mySubscription.planId.storageLimit)} bộ nhớ
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Animated.View>
              )
            })()
          ) : (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 28,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 20,
                marginBottom: 24,
                shadowColor: '#0F172A',
                shadowOpacity: 0.04,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <Package color='#64748B' size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Gói dịch vụ hiện tại
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 2 }}>
                    Nexus Free (Miễn phí)
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 18 }}>
                    Dung lượng bộ nhớ: <Text style={{ fontWeight: '800', color: '#334155' }}>512 MB</Text>. Nâng cấp ngay để nhận thêm không gian lưu trữ tài liệu!
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Pricing cards */}
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 }}>Chọn gói nâng cấp tài khoản</Text>
          
          {plans.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Package color='#CBD5E1' size={48} />
              <Text style={{ color: '#64748B', marginTop: 12, fontWeight: '600' }}>Hiện chưa có gói nâng cấp nào hoạt động.</Text>
            </View>
          ) : (
            plans.map((plan) => {
              const isCurrent = currentActivePlanId === plan._id
              const nameLower = plan.name.toLowerCase()
              const isPro = nameLower.includes('pro')
              const isUltra = nameLower.includes('ultra')

              // Styling configurations
              let cardBg = '#FFFFFF'
              let cardBorder: any = isCurrent ? '#8678EA' : '#E2E8F0'
              let titleColor = '#0F172A'
              let descColor = '#475569'
              let priceColor = '#8678EA'
              let durationColor = '#64748B'
              let featureColor = '#475569'
              let iconColor = '#8678EA'
              let btnBg = isCurrent ? '#F1F5F9' : '#8678EA'
              let btnText = isCurrent ? '#94A3B8' : '#FFFFFF'
              let badgeBg = '#8678EA'
              let badgeText = '#FFFFFF'
              let badgeLabel = ''

              if (isPro) {
                cardBg = '#0F0E26' // Deep dark indigo
                cardBorder = proBorderColor // RGB cycling
                titleColor = '#FFFFFF'
                descColor = '#A5B4FC'
                priceColor = '#C084FC'
                durationColor = '#94A3B8'
                featureColor = '#E2E8F0'
                iconColor = '#C084FC'
                btnBg = '#6366F1'
                badgeBg = '#6366F1'
                badgeLabel = 'BÁN CHẠY NHẤT'
              } else if (isUltra) {
                cardBg = '#0B0F19' // Obsidian Gold
                cardBorder = ultraBorderColor // RGB cycling
                titleColor = '#F59E0B' // Gold title
                descColor = '#94A3B8'
                priceColor = '#F59E0B'
                durationColor = '#94A3B8'
                featureColor = '#F8FAFC'
                iconColor = '#F59E0B'
                btnBg = '#EAB308'
                btnText = '#0B0F19'
                badgeBg = '#EAB308'
                badgeText = '#0B0F19'
                badgeLabel = 'SIÊU CẤP / PREMIUM'
              }

              if (isCurrent) {
                btnBg = '#F1F5F9'
                btnText = '#94A3B8'
              }

              const CardContainer = (isPro || isUltra) ? Animated.View : View
              const containerStyle = {
                backgroundColor: cardBg,
                borderRadius: 28,
                borderWidth: (isCurrent || isUltra || isPro) ? 2 : 1,
                borderColor: cardBorder,
                padding: 0, // Edge-to-edge layout
                overflow: 'hidden' as const,
                marginBottom: 20,
                shadowColor: isUltra ? '#EAB308' : isPro ? '#818CF8' : '#8678EA',
                shadowOpacity: isCurrent ? 0.15 : 0.05,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: isCurrent ? 5 : 2,
                transform: (isPro || isUltra) ? [{ scale: cardScale }] : undefined
              }

              return (
                <CardContainer key={plan._id} style={containerStyle}>
                  {/* Top Header Section of Card */}
                  <View style={{ padding: 24, borderBottomWidth: (isPro || isUltra) ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
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

                      {isCurrent && (
                        <View
                          style={{
                            backgroundColor: '#10B981',
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                            Gói hiện tại
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={{ fontSize: 24, fontWeight: '900', color: titleColor }}>{plan.name}</Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8, marginBottom: 12 }}>
                      <Text style={{ fontSize: 32, fontWeight: '900', color: priceColor }}>
                        {formatVND(plan.price)}
                      </Text>
                      <Text style={{ fontSize: 13, color: durationColor, marginLeft: 4 }}>
                        / {plan.durationDays} ngày
                      </Text>
                    </View>

                    <Text style={{ fontSize: 13, color: descColor, lineHeight: 18 }}>
                      {plan.description || 'Không có mô tả chi tiết.'}
                    </Text>
                  </View>

                  {/* Bottom Features Section of Card */}
                  <View style={{ padding: 24, backgroundColor: isPro ? '#121036' : isUltra ? '#080C14' : 'transparent', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
                    <View style={{ gap: 10, marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isPro || isUltra ? 'rgba(255,255,255,0.06)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                          <HardDrive color={iconColor} size={14} />
                        </View>
                        <Text style={{ fontSize: 13, color: titleColor, fontWeight: '700' }}>
                          Dung lượng bộ nhớ: {formatBytesToGB(plan.storageLimit)}
                        </Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isPro || isUltra ? 'rgba(255,255,255,0.06)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                          <Clock color={iconColor} size={14} />
                        </View>
                        <Text style={{ fontSize: 13, color: titleColor, fontWeight: '700' }}>
                          Thời gian sử dụng: {plan.durationDays} ngày
                        </Text>
                      </View>

                      {plan.features.map((feat, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isPro || isUltra ? 'rgba(16,185,129,0.1)' : '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                            <Check color='#10B981' size={14} />
                          </View>
                          <Text style={{ fontSize: 13, color: featureColor, flex: 1 }}>{feat}</Text>
                        </View>
                      ))}
                    </View>

                    <Pressable
                      onPress={() => handleUpgrade(plan._id)}
                      disabled={isCurrent || actionLoadingId !== null}
                      style={{
                        backgroundColor: btnBg,
                        paddingVertical: 14,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: btnBg,
                        shadowOpacity: isCurrent ? 0 : 0.2,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: isCurrent ? 0 : 2,
                      }}
                    >
                      {actionLoadingId === plan._id ? (
                        <ActivityIndicator size="small" color={isUltra ? '#0B0F19' : '#FFFFFF'} />
                      ) : (
                        <Text
                          style={{
                            color: btnText,
                            fontSize: 14,
                            fontWeight: '900',
                            letterSpacing: 0.5,
                          }}
                        >
                          {isCurrent ? 'GÓI HIỆN TẠI' : 'NÂNG CẤP NGAY'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </CardContainer>
              )
            })
          )}
        </ScrollView>
      ) : (
        /* Admin View */
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>Danh sách gói</Text>
            <Pressable
              onPress={() => handleOpenForm(null)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#8678EA',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                gap: 4,
              }}
            >
              <Plus color='#FFFFFF' size={14} />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Tạo mới</Text>
            </Pressable>
          </View>

          <FlatList
            data={adminPlans}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            renderItem={({ item }) => {
              const nameLower = item.name.toLowerCase()
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
                cardBorder = proBorderColor // RGB cycling
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
                cardBorder = ultraBorderColor // RGB cycling
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
                        backgroundColor: item.isActive ? '#DCFCE7' : '#F1F5F9',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: item.isActive ? '#15803D' : '#64748B',
                        }}
                      >
                        {item.isActive ? 'Đang hoạt động' : 'Tạm ẩn'}
                      </Text>
                    </View>
                  </View>

                  {/* Card Title & Actions Section */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ fontSize: 24, fontWeight: '900', color: titleColor }}>{item.name}</Text>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8, marginBottom: 12 }}>
                        <Text style={{ fontSize: 30, fontWeight: '900', color: priceColor }}>
                          {new Intl.NumberFormat('vi-VN').format(item.price)} <Text style={{ textDecorationLine: 'underline' }}>đ</Text>
                        </Text>
                        <Text style={{ fontSize: 13, color: durationColor, marginLeft: 4 }}>
                          / {item.durationDays} ngày
                        </Text>
                      </View>
                    </View>

                    {/* Edit / Delete Buttons */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() => handleOpenForm(item)}
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
                      {item.isActive && (
                        <Pressable
                          onPress={() => handleDeletePlan(item._id, item.name)}
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

                  {item.description && (
                    <Text style={{ fontSize: 13, color: descColor, lineHeight: 18, marginBottom: 16 }}>
                      {item.description}
                    </Text>
                  )}

                  {/* Features list */}
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
                          {formatBytesToGB(item.storageLimit)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 11, color: durationColor }}>Thời hạn</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: titleColor, marginTop: 2 }}>
                          {item.durationDays} ngày
                        </Text>
                      </View>
                    </View>

                    {item.features.map((feat, idx) => (
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
            }}
          />
        </View>
      )}

      {/* ADMIN CREATE/EDIT PLAN MODAL */}
      <Modal visible={formVisible} animationType='fade' transparent={true} onRequestClose={() => setFormVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 28,
              width: '90%',
              height: '80%',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(134,120,234,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={18} color='#8678EA' />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
                  {editingPlan ? 'Chỉnh sửa gói' : 'Tạo gói mới'}
                </Text>
              </View>
              <Pressable
                onPress={() => setFormVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} color='#64748B' />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 14 }}
              keyboardShouldPersistTaps='handled'
            >
              {/* Plan Name */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tên gói *</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    height: 50,
                  }}
                >
                  <Tag size={16} color='#8678EA' style={{ marginRight: 10 }} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="VD: Nexus Plus"
                    placeholderTextColor="#94A3B8"
                    style={{
                      flex: 1,
                      height: '100%',
                      fontSize: 14,
                      color: '#0F172A',
                      fontWeight: '500',
                    }}
                  />
                </View>
              </View>

              {/* Price & Storage limit row */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Giá (VNĐ) *</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      height: 50,
                    }}
                  >
                    <Coins size={16} color='#8678EA' style={{ marginRight: 8 }} />
                    <TextInput
                      value={price}
                      onChangeText={setPrice}
                      keyboardType='numeric'
                      placeholder="VD: 10000"
                      placeholderTextColor="#94A3B8"
                      style={{
                        flex: 1,
                        height: '100%',
                        fontSize: 14,
                        color: '#0F172A',
                        fontWeight: '500',
                      }}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Bộ nhớ (GB) *</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      height: 50,
                    }}
                  >
                    <Database size={16} color='#8678EA' style={{ marginRight: 8 }} />
                    <TextInput
                      value={storageGB}
                      onChangeText={setStorageGB}
                      keyboardType='numeric'
                      placeholder="VD: 5"
                      placeholderTextColor="#94A3B8"
                      style={{
                        flex: 1,
                        height: '100%',
                        fontSize: 14,
                        color: '#0F172A',
                        fontWeight: '500',
                      }}
                    />
                  </View>
                </View>
              </View>

              {/* Duration & Sort Order row */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Thời hạn (ngày) *</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      height: 50,
                    }}
                  >
                    <Clock size={16} color='#8678EA' style={{ marginRight: 8 }} />
                    <TextInput
                      value={durationDays}
                      onChangeText={setDurationDays}
                      keyboardType='numeric'
                      placeholder="VD: 30"
                      placeholderTextColor="#94A3B8"
                      style={{
                        flex: 1,
                        height: '100%',
                        fontSize: 14,
                        color: '#0F172A',
                        fontWeight: '500',
                      }}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Thứ tự</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      height: 50,
                    }}
                  >
                    <Layers size={16} color='#8678EA' style={{ marginRight: 8 }} />
                    <TextInput
                      value={sortOrder}
                      onChangeText={setSortOrder}
                      keyboardType='numeric'
                      placeholder="VD: 0"
                      placeholderTextColor="#94A3B8"
                      style={{
                        flex: 1,
                        height: '100%',
                        fontSize: 14,
                        color: '#0F172A',
                        fontWeight: '500',
                      }}
                    />
                  </View>
                </View>
              </View>

              {/* Switch Active state */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 16,
                  padding: 16,
                  marginVertical: 4,
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Kích hoạt gói dịch vụ</Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                    Cho phép hiển thị gói cho sinh viên nâng cấp
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#CBD5E1', true: '#8678EA' }}
                  thumbColor='#FFFFFF'
                />
              </View>

              {/* Description */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mô tả ngắn</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    minHeight: 80,
                  }}
                >
                  <FileText size={16} color='#8678EA' style={{ marginRight: 10, marginTop: 2 }} />
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="VD: Tổng dung lượng lưu trữ 5GB"
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: '#0F172A',
                      fontWeight: '500',
                      textAlignVertical: 'top',
                      paddingTop: 0,
                      paddingBottom: 0,
                    }}
                  />
                </View>
              </View>

              {/* Highlight Features */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Các tính năng nổi bật (Mỗi dòng một tính năng)
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    minHeight: 100,
                  }}
                >
                  <Check size={16} color='#8678EA' style={{ marginRight: 10, marginTop: 2 }} />
                  <TextInput
                    value={featuresText}
                    onChangeText={setFeaturesText}
                    placeholder="VD: Tự do sử dụng các tính năng của Nexus"
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: '#0F172A',
                      fontWeight: '500',
                      textAlignVertical: 'top',
                      paddingTop: 0,
                      paddingBottom: 0,
                    }}
                  />
                </View>
              </View>

              {/* Submit & Cancel Buttons Row */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, width: '100%' }}>
                <Pressable
                  onPress={() => {
                    setFormVisible(false)
                  }}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 18,
                    backgroundColor: '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#475569', fontWeight: '800', fontSize: 15 }}>HỦY BỎ</Text>
                </Pressable>

                <Pressable
                  onPress={handleSavePlan}
                  disabled={savingPlan}
                  style={{
                    flex: 1.5,
                    backgroundColor: '#8678EA',
                    borderRadius: 18,
                    height: 52,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#8678EA',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  {savingPlan ? (
                    <ActivityIndicator size='small' color='#FFFFFF' />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 }}>
                      {editingPlan ? 'LƯU THAY ĐỔI' : 'TẠO GÓI MỚI'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
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
            setPlanToDeleteId(null)
            setPlanToDeleteName('')
          }
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => {
              if (!deleting) {
                setDeleteModalVisible(false)
                setPlanToDeleteId(null)
                setPlanToDeleteName('')
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
                "{planToDeleteName}"
              </Text>{' '}
              không? Người dùng sẽ không thể đăng ký gói này nữa.
            </Text>

            {/* Buttons Row */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' }}>
              <Pressable
                onPress={() => {
                  setDeleteModalVisible(false)
                  setPlanToDeleteId(null)
                  setPlanToDeleteName('')
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

      {/* PayOS Checkout WebView Modal */}
      <Modal visible={showWebView} animationType="slide" onRequestClose={() => setShowWebView(false)}>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {/* Header */}
          <View
            style={{
              paddingTop: Platform.OS === 'ios' ? 54 : 44,
              paddingHorizontal: 20,
              paddingBottom: 14,
              backgroundColor: '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ width: 40 }} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Thanh toán</Text>
            <Pressable
              onPress={() => {
                Alert.alert(
                  'Hủy thanh toán',
                  'Bạn có chắc muốn đóng trang thanh toán? Hóa đơn của bạn vẫn sẽ ở trạng thái Chờ thanh toán.',
                  [
                    { text: 'Tiếp tục thanh toán', style: 'cancel' },
                    { text: 'Đóng', onPress: () => setShowWebView(false) }
                  ]
                )
              }}
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
              <X size={18} color='#64748B' />
            </Pressable>
          </View>

          {/* WebView */}
          {paymentUrl ? (
            <WebView
              source={{ uri: paymentUrl }}
              onNavigationStateChange={handleNavigationStateChange}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              style={{ flex: 1 }}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
                  <ActivityIndicator size="large" color="#8678EA" />
                  <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Đang tải trang thanh toán...</Text>
                </View>
              )}
            />
          ) : null}
        </View>
      </Modal>
    </ScreenShell>
  )
}

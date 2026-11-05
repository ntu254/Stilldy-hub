import React, { useState, useRef, useEffect } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native'
import {
  ArrowLeft,
  FileText,
  Trash2,
  Eye,
  Download,
  HardDrive,
  User,
  Calendar,
  Search,
  TriangleAlert,
  Globe,
  Lock,
} from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import { adminApi, ReportedDocInfo } from '../../api/adminApi'
import { useToast } from '../../components/ui/ToastProvider'
import Svg, { Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg'

function formatBytes(bytes?: number) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminDocsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const toast = useToast()

  const [docs, setDocs] = useState<ReportedDocInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const isLoadingRef = useRef(false)
  const isMomentumRef = useRef(false)
  const [refreshEnabled, setRefreshEnabled] = useState(true)

  const loadDocs = async (resetPage = false, isRefresh = false) => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true

    const nextPage = resetPage ? 1 : page
    if (resetPage) {
      setHasMore(true)
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const data = await adminApi.getAllDocs(nextPage, 10, searchQuery.trim())
      if (resetPage) {
        setDocs(data.items)
      } else {
        setDocs((prev) => {
          const existingIds = new Set(prev.map((d) => d._id.toString()))
          const newItems = data.items.filter((d) => !existingIds.has(d._id.toString()))
          return [...prev, ...newItems]
        })
      }

      setPage(nextPage + 1)
      setHasMore(nextPage < data.meta.totalPages)
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể tải danh sách tài liệu hệ thống.')
    } finally {
      isLoadingRef.current = false
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadDocs(true)
  }, [])

  const handleSearchSubmit = () => {
    loadDocs(true)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadDocs(true, true)
  }

  const handleLoadMore = () => {
    if (hasMore && !loadingMore && !loading && !refreshing) {
      loadDocs(false)
    }
  }

  const handleDeleteDoc = async (id: string, title: string) => {
    Alert.alert(
      'XÁC NHẬN XÓA TỐI CAO',
      `Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu "${title}" khỏi hệ thống? Hành động này dọn sạch cả CSDL và Cloud, không thể hoàn tác!`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await adminApi.deleteViolatedDoc(id)
              toast.success(res.message || 'Đã xóa tài liệu khỏi hệ thống thành công.')
              // Cập nhật giao diện locally
              setDocs((prev) => prev.filter((d) => d._id !== id))
            } catch (err: any) {
              toast.error(err.toString() || 'Lỗi khi xóa tài liệu.')
            }
          },
        },
      ]
    )
  }

  const renderDocItem = ({ item }: { item: ReportedDocInfo }) => {
    const latestVersion = item.versions?.[item.versions.length - 1]
    const sizeLabel = latestVersion ? formatBytes(latestVersion.fileSize) : 'N/A'
    const authorLabel = item.uploadedBy?.displayName || item.uploadedBy?.email || 'Ẩn danh'
    const dateLabel = new Date(item.updatedAt).toLocaleDateString('vi-VN')

    return (
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          padding: 16,
          marginBottom: 12,
          shadowColor: '#0F172A',
          shadowOpacity: 0.02,
          shadowRadius: 10,
          elevation: 1,
        }}
      >
        {/* Title and Badges */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
              {item.title}
            </Text>
            {item.description ? (
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>

          <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {item.isReported ? (
              <View style={{ backgroundColor: '#FFE4E6', borderWidth: 1, borderColor: '#FECDD3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <TriangleAlert color='#E11D48' size={11} />
                <Text style={{ color: '#E11D48', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>Bị báo cáo</Text>
              </View>
            ) : null}

            <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {item.isPublic ? <Globe color='#64748B' size={11} /> : <Lock color='#64748B' size={11} />}
              <Text style={{ color: '#64748B', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>
                {item.isPublic ? 'Công khai' : 'Riêng tư'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats metrics */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
            <Eye size={12} color='#64748B' />
            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>{item.viewCount || 0} xem</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
            <Download size={12} color='#64748B' />
            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>{item.downloadCount || 0} tải</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
            <HardDrive size={12} color='#64748B' />
            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>{sizeLabel}</Text>
          </View>
        </View>

        {/* Dash Metadata box */}
        <View
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            borderStyle: 'dashed',
            padding: 12,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <User size={13} color='#64748B' />
            <Text style={{ color: '#475569', fontSize: 12 }}>
              Người đăng: <Text style={{ fontWeight: '800', color: '#334155' }}>{authorLabel}</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Calendar size={13} color='#94A3B8' />
            <Text style={{ color: '#64748B', fontSize: 11 }}>
              Cập nhật: {dateLabel} (V{item.versions?.length || 1})
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          {!item.isPublic ? (
            <Pressable
              onPress={() => toast.warning('Tài liệu này ở chế độ riêng tư, không thể xem.')}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 12,
                backgroundColor: '#F1F5F9',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: 0.45,
              }}
            >
              <Lock color='#94A3B8' size={14} />
              <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '800' }}>Xem (Khóa)</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() =>
                navigation.navigate('DocumentViewer', {
                  documentId: item._id,
                  documentTitle: item.title,
                  sourceSubject: 'Tài liệu',
                })
              }
              style={{
                flex: 1,
                height: 40,
                borderRadius: 12,
                backgroundColor: '#EFF6FF',
                borderWidth: 1,
                borderColor: '#BFDBFE',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
              }}
            >
              <Eye color='#2563EB' size={14} />
              <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '800' }}>Xem</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => handleDeleteDoc(item._id, item.title)}
            style={({ pressed }) => ({
              flex: 1.2,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#FEF2F2',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              borderWidth: 1,
              borderColor: '#FEE2E2',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Trash2 color='#EF4444' size={14} />
            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '800' }}>Xóa vĩnh viễn</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
      {/* Header Navigation */}
      <View
        style={{
          paddingTop: 54, // Safe area space
          paddingHorizontal: 20,
          paddingBottom: 14,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#0F172A',
          shadowOpacity: 0.02,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#F8FAFC',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <ArrowLeft size={18} color='#0F172A' />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginRight: 40 }}>
          Tài liệu hệ thống
        </Text>
      </View>

      <FlatList
        data={docs}
        renderItem={renderDocItem}
        keyExtractor={(item, index) => `${item._id}-${index}`}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
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
              handleRefresh()
            }}
            colors={['#8678EA']}
            tintColor='#8678EA'
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            {/* Violet banner */}
            <View style={{ marginBottom: 20, borderRadius: 24, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <Svg height="100%" width="100%">
                  <Defs>
                    <LinearGradient id="gradDocs" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#EEF2FF" />
                      <Stop offset="100%" stopColor="#E0E7FF" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#gradDocs)" />
                  <Circle cx="90%" cy="10%" r="50" fill="#C7D2FE" opacity="0.4" />
                  <Circle cx="80%" cy="90%" r="30" fill="#DDD6FE" opacity="0.4" />
                </Svg>
              </View>
              <View
                style={{
                  padding: 20,
                  borderWidth: 1.5,
                  borderColor: '#C7D2FE',
                  borderRadius: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: '#4F46E5', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Tổng quan hệ thống
                  </Text>
                  <Text style={{ color: '#312E81', fontSize: 26, fontWeight: '900', marginTop: 4, lineHeight: 32 }}>
                    Tài Liệu
                  </Text>
                  <Text style={{ color: '#3730A3', marginTop: 8, lineHeight: 18, fontSize: 13, opacity: 0.8 }}>
                    Duyệt danh sách, tìm kiếm và xóa vĩnh viễn mọi tài liệu học tập đang được lưu trữ trên nền tảng.
                  </Text>
                </View>
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 18,
                    backgroundColor: '#4F46E5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#4F46E5',
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 3,
                  }}
                >
                  <FileText color='#FFFFFF' size={24} />
                </View>
              </View>
            </View>

            {/* Search Bar */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOpacity: 0.02,
                shadowRadius: 10,
                elevation: 1,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  height: 48,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Search color='#94A3B8' size={18} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchSubmit}
                  returnKeyType='search'
                  placeholder='Tìm theo tiêu đề, tác giả...'
                  placeholderTextColor='#94A3B8'
                  style={{ flex: 1, marginLeft: 10, color: '#0F172A', fontSize: 14 }}
                />
                {searchQuery ? (
                  <Pressable onPress={() => { setSearchQuery(''); setTimeout(() => loadDocs(true), 0); }} style={{ padding: 4 }}>
                    <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700' }}>Xóa</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 20 }}>
              <FileText size={44} color='#94A3B8' />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 14 }}>
                Không tìm thấy tài liệu
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                Thử tìm kiếm với từ khóa khác hoặc kéo xuống để làm mới.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size='small' color='#8678EA' style={{ marginVertical: 12 }} />
          ) : null
        }
      />
    </ScreenShell>
  )
}

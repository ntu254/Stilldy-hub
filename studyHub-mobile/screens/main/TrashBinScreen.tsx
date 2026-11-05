import React, { useEffect, useState, useCallback } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View
} from 'react-native'
import { ArrowLeft, Trash2, RotateCcw, Calendar, Layers } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import flashcardApi, { FlashcardCollection } from '../../api/flashcardApi'
import { useToast } from '../../components/ui/ToastProvider'

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${time} - ${date}`
  } catch {
    return dateStr
  }
}

export default function TrashBinScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const toast = useToast()
  const [collections, setCollections] = useState<FlashcardCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTrash = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const res = await flashcardApi.getTrashCollections()
      setCollections(res.data || [])
    } catch (err: any) {
      console.error('[Trash Bin] Fetch error:', err)
      setError(err?.toString() || 'Không thể tải danh sách bộ thẻ trong thùng rác.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchTrash()
  }, [fetchTrash])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchTrash(false)
  }

  const handleRestore = (id: string, title: string) => {
    Alert.alert(
      'Khôi phục bộ thẻ',
      `Bạn có chắc chắn muốn khôi phục bộ thẻ "${title}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Khôi phục',
          onPress: async () => {
            try {
              const res = await flashcardApi.restore(id)
              toast.success(res.message || 'Đã khôi phục bộ thẻ ghi nhớ thành công.')
              // Tải lại danh sách
              fetchTrash(true)
            } catch (err: any) {
              toast.error(err?.toString() || 'Khôi phục thất bại.')
            }
          },
        },
      ]
    )
  }

  const renderTrashItem = ({ item }: { item: FlashcardCollection }) => {
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
          shadowOpacity: 0.03,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
              {item.title}
            </Text>
            {item.description ? (
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Layers size={13} color='#94A3B8' />
                <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 4, fontWeight: '600' }}>
                  {item.totalCards || 0} thẻ
                </Text>
              </View>
              {item.deletedAt ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={13} color='#94A3B8' />
                  <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 4 }}>
                    Đã xóa: {formatDate(item.deletedAt)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <Pressable
            onPress={() => handleRestore(item._id, item.title)}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#EEF2FF',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#E0E7FF',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <RotateCcw size={16} color='#4F46E5' />
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
      {/* Header */}
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
          Thùng rác bộ thẻ
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size='large' color='#8678EA' />
          <Text style={{ marginTop: 12, color: '#64748B', fontSize: 14, fontWeight: '600' }}>
            Đang quét thùng rác...
          </Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ color: '#DC2626', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
            {error}
          </Text>
          <Pressable
            onPress={() => fetchTrash(true)}
            style={{
              backgroundColor: '#0F172A',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={collections}
          renderItem={renderTrashItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#8678EA']}
              tintColor='#8678EA'
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 20 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Trash2 size={36} color='#64748B' />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                Thùng rác trống
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 18 }}>
                Các bộ thẻ bị xóa mềm sẽ xuất hiện tại đây để khôi phục khi cần.
              </Text>
            </View>
          }
        />
      )}
    </ScreenShell>
  )
}

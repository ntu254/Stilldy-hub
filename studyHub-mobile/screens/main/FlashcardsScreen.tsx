import React, { useEffect, useState, useCallback } from 'react'
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View, KeyboardAvoidingView, Platform, Image } from 'react-native'
import { ArrowLeft, BookOpen, ChevronRight, Eye, Globe, Layers, Lock, Plus, Search, Trash2, X, AlertCircle, ShieldCheck, Check } from 'lucide-react-native'
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSelector } from 'react-redux'

import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import type { RootState } from '../../redux/store'
import flashcardApi, { FlashcardCollection, CreateFlashcardPayload } from '../../api/flashcardApi'
import { useToast } from '../../components/ui/ToastProvider'

interface CardFormItem {
  id: string
  term: string
  definition: string
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

export default function FlashcardsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute()
  const toast = useToast()
  const currentUser = useSelector((state: RootState) => state.auth.user)

  const showBack = (route.params as any)?.showBack || false

  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my')
  const [collections, setCollections] = useState<FlashcardCollection[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Create Collection Modal state
  const [createVisible, setCreateVisible] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newIsPublic, setNewIsPublic] = useState(false)
  const [newCards, setNewCards] = useState<CardFormItem[]>([
    { id: generateId(), term: '', definition: '' },
    { id: generateId(), term: '', definition: '' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [cardErrors, setCardErrors] = useState<{ [id: string]: { term?: string; definition?: string } }>({})
  const [dmcaModalVisible, setDmcaModalVisible] = useState(false)

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Fetch collections from server
  const loadCollections = useCallback(async (isRefresh = false, queryStr = debouncedQuery) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const params: Record<string, string> = { limit: '100' }
      if (queryStr.trim()) {
        params.search = queryStr.trim()
      }

      let data;
      if (activeTab === 'my') {
        const res = await flashcardApi.getMyCollections(params)
        data = res.data
      } else {
        const res = await flashcardApi.getPublicCollections(params)
        data = res.data
      }
      setCollections(data || [])
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể tải danh sách bộ thẻ.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeTab, debouncedQuery])

  // Load collections on focus or debounced query change
  useFocusEffect(
    React.useCallback(() => {
      loadCollections(false, debouncedQuery)
    }, [activeTab, debouncedQuery])
  )

  // Delete confirm modal states
  const [deleteVisible, setDeleteVisible] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const [deleteTitle, setDeleteTitle] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Handle deletion of collection
  const handleDeleteCollection = (id: string, title: string) => {
    setDeleteId(id)
    setDeleteTitle(title)
    setDeleteVisible(true)
  }

  const handleConfirmDelete = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await flashcardApi.remove(deleteId)
      toast.success('Đã xóa bộ thẻ thành công!')
      setCollections((prev) => prev.filter((col) => col._id !== deleteId))
      setDeleteVisible(false)
    } catch (err: any) {
      toast.error(err.toString())
    } finally {
      setDeleting(false)
    }
  }

  // Handle new cards dynamic form
  const handleAddCardRow = () => {
    setNewCards((prev) => [...prev, { id: generateId(), term: '', definition: '' }])
  }

  const handleRemoveCardRow = (id: string) => {
    if (newCards.length <= 1) {
      toast.warning('Bộ thẻ phải có ít nhất 1 thẻ.')
      return
    }
    setNewCards((prev) => prev.filter((c) => c.id !== id))
  }

  const handleTitleChange = (text: string) => {
    setNewTitle(text)
    if (titleError) setTitleError(null)
  }

  const handleUpdateCardField = (id: string, field: 'term' | 'definition', value: string) => {
    setNewCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    )
    if (cardErrors[id]) {
      setCardErrors((prev) => {
        const copy = { ...prev }
        if (copy[id]) {
          delete copy[id][field]
          if (!copy[id].term && !copy[id].definition) {
            delete copy[id]
          }
        }
        return copy
      })
    }
  }

  // Reset Create Form
  const resetCreateForm = () => {
    setNewTitle('')
    setNewDescription('')
    setNewIsPublic(false)
    setTitleError(null)
    setCardErrors({})
    setNewCards([
      { id: generateId(), term: '', definition: '' },
      { id: generateId(), term: '', definition: '' },
    ])
    setCreateVisible(false)
  }

  // Handle Form Submission with Inline Field Validation
  const handleCreateCollection = async () => {
    let hasError = false
    let tErr: string | null = null
    const cErrs: { [id: string]: { term?: string; definition?: string } } = {}

    if (!newTitle.trim()) {
      tErr = 'Vui lòng nhập tiêu đề bộ thẻ'
      hasError = true
    }

    const validCards = newCards.filter((c) => c.term.trim() && c.definition.trim())
    if (validCards.length === 0) {
      if (newCards.length > 0) {
        const firstId = newCards[0].id
        cErrs[firstId] = {
          term: !newCards[0].term.trim() ? 'Nhập thuật ngữ' : undefined,
          definition: !newCards[0].definition.trim() ? 'Nhập định nghĩa' : undefined,
        }
      }
      hasError = true
    }

    newCards.forEach((c) => {
      if (c.term.trim() && !c.definition.trim()) {
        cErrs[c.id] = { ...cErrs[c.id], definition: 'Nhập định nghĩa' }
        hasError = true
      } else if (!c.term.trim() && c.definition.trim()) {
        cErrs[c.id] = { ...cErrs[c.id], term: 'Nhập thuật ngữ' }
        hasError = true
      }
    })

    setTitleError(tErr)
    setCardErrors(cErrs)

    if (hasError) return

    setSubmitting(true)
    try {
      const payload: CreateFlashcardPayload = {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        isPublic: newIsPublic,
        cards: validCards.map((c) => ({ term: c.term.trim(), definition: c.definition.trim() })),
      }
      await flashcardApi.create(payload)
      toast.success('Tạo bộ thẻ ghi nhớ mới thành công!')
      resetCreateForm()
      loadCollections()
    } catch (err: any) {
      toast.error(err.toString() || 'Tạo bộ thẻ thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  // Form validation for creation lock
  const isFormValid =
    newTitle.trim().length > 0 &&
    newCards.length >= 2 &&
    newCards.every((c) => c.term.trim().length > 0 && c.definition.trim().length > 0)

  const filteredCollections = collections

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
      <FlatList
        data={filteredCollections}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadCollections(true)} colors={['#8678EA']} />
        }
        ListHeaderComponent={() => (
          <View style={{ backgroundColor: '#F8FAFC' }}>
            {/* Brand Header */}
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
                shadowColor: '#0F172A',
                shadowOpacity: 0.02,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 1,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {showBack ? (
                  <Pressable
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: '#F1F5F9',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowLeft color='#334155' size={18} />
                  </Pressable>
                ) : null}
                <Text style={{ fontSize: 28, fontWeight: '900', fontStyle: 'italic', color: '#0F172A', letterSpacing: -0.5 }}>
                  NEXUS<Text style={{ color: '#8678EA', fontStyle: 'normal' }}>.</Text>
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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

            {/* Thẻ ghi nhớ introductory card */}
            <View
              style={{
                marginHorizontal: 20,
                marginBottom: 14,
                borderRadius: 28,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 16,
                shadowColor: '#0F172A',
                shadowOpacity: 0.06,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 }}>
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      backgroundColor: '#0F172A',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Layers color='#FFFFFF' size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#0F172A', fontSize: 24, fontWeight: '900' }}>Thẻ ghi nhớ</Text>
                    <Text style={{ color: '#64748B', marginTop: 3, fontSize: 13, lineHeight: 18 }} numberOfLines={1}>
                      Học tập chủ động bằng thẻ thông minh.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => setCreateVisible(true)}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: '#8678EA',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus color='#FFFFFF' size={20} />
                </Pressable>
              </View>
            </View>

            {/* Tabs segment */}
            <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginBottom: 16 }}>
              {[
                { key: 'my', label: 'Của tôi' },
                { key: 'public', label: 'Cộng đồng' },
              ].map((tab) => {
                const active = activeTab === tab.key
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key as any)}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: 14,
                      borderBottomWidth: 3,
                      borderBottomColor: active ? '#8678EA' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: active ? '800' : '600', color: active ? '#8678EA' : '#64748B' }}>
                      {tab.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Search Bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                paddingHorizontal: 14,
                height: 48,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginHorizontal: 20,
                marginBottom: 16,
              }}
            >
              <Search color='#94A3B8' size={18} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Tìm kiếm bộ thẻ ghi nhớ..."
                placeholderTextColor="#94A3B8"
                style={{ flex: 1, marginLeft: 10, color: '#0F172A', fontSize: 14, paddingVertical: 0 }}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <X color='#94A3B8' size={16} />
                </Pressable>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={() => {
          if (loading) {
            return <ActivityIndicator size="small" color="#8678EA" style={{ marginTop: 40 }} />
          }
          return (
            <View style={{ marginHorizontal: 20, marginTop: 10 }}>
              <View
                style={{
                  padding: 40,
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Layers color='#94A3B8' size={48} />
                <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800', marginTop: 16 }}>
                  Không tìm thấy bộ thẻ nào
                </Text>
                <Text style={{ color: '#64748B', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
                  {activeTab === 'my'
                    ? 'Hãy tự tạo bộ thẻ ghi nhớ đầu tiên của riêng bạn để bắt đầu học tập ôn luyện.'
                    : 'Chưa có bộ thẻ công khai nào được chia sẻ ở đây.'}
                </Text>
                {activeTab === 'my' && (
                  <Pressable
                    onPress={() => setCreateVisible(true)}
                    style={{
                      marginTop: 18,
                      backgroundColor: '#8678EA',
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Tạo bộ thẻ ngay</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )
        }}
        renderItem={({ item }) => {
          const isOwner = typeof item.createdBy === 'object' 
            ? item.createdBy?._id === currentUser?.id 
            : item.createdBy === currentUser?.id
          const creatorName = typeof item.createdBy === 'object'
            ? item.createdBy?.displayName || 'Thành viên'
            : 'Tôi'

          return (
            <Pressable
              onPress={() => navigation.navigate('FlashcardDetail', { collectionId: item._id })}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginHorizontal: 20,
                marginBottom: 14,
                shadowColor: '#0F172A',
                shadowOpacity: 0.02,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.description ? (
                    <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                {/* Privacy Badge */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: item.isPublic ? '#DCFCE7' : '#F1F5F9',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    gap: 4,
                  }}
                >
                  {item.isPublic ? (
                    <>
                      <Globe color='#16A34A' size={11} />
                      <Text style={{ color: '#16A34A', fontSize: 10, fontWeight: '700' }}>Công khai</Text>
                    </>
                  ) : (
                    <>
                      <Lock color='#64748B' size={11} />
                      <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700' }}>Riêng tư</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Collection stats footer */}
              <View
                style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#F1F5F9',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Layers color='#94A3B8' size={14} />
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>{item.cards?.length || 0} thẻ</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Eye color='#94A3B8' size={14} />
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>{item.viewCount || 0} lượt xem</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>
                    Tạo bởi: {isOwner ? 'Tôi' : creatorName}
                  </Text>
                  {isOwner && (
                    <Pressable
                      onPress={() => handleDeleteCollection(item._id, item.title)}
                      style={{ padding: 4 }}
                    >
                      <Trash2 color='#EF4444' size={16} />
                    </Pressable>
                  )}
                  <ChevronRight color='#CBD5E1' size={16} />
                </View>
              </View>
            </Pressable>
          )
        }}
      />

      {/* CREATE FLASHCARD MODAL */}
      <Modal visible={createVisible} animationType="fade" transparent={true} onRequestClose={resetCreateForm}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', maxHeight: '82%', backgroundColor: '#FFFFFF', borderRadius: 28, overflow: 'hidden', shadowColor: '#0F172A', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
            {/* Modal Header */}
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 18,
                backgroundColor: '#FFFFFF',
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Pressable
                onPress={resetCreateForm}
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
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A' }}>Tạo bộ thẻ mới</Text>
              <Pressable
                onPress={handleCreateCollection}
                disabled={submitting}
                style={{
                  backgroundColor: (newTitle.trim() && newCards.some(c => c.term.trim() && c.definition.trim())) ? '#7C3AED' : '#A78BFA',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 12,
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Tạo</Text>
                )}
              </Pressable>
            </View>

            {/* Modal Content Form */}
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>Tiêu đề bộ thẻ *</Text>
              <TextInput
                value={newTitle}
                onChangeText={handleTitleChange}
                placeholder="VD: Tiếng Anh giao tiếp - Bài 1"
                placeholderTextColor="#94A3B8"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  height: 48,
                  borderWidth: 1.5,
                  borderColor: titleError ? '#EF4444' : '#E2E8F0',
                  color: '#0F172A',
                  fontSize: 14,
                  marginBottom: titleError ? 4 : 16,
                }}
              />
              {titleError ? (
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700', marginBottom: 14, marginLeft: 4 }}>
                  ⚠️ {titleError}
                </Text>
              ) : null}

              <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>Mô tả bộ thẻ</Text>
              <TextInput
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Mô tả nội dung bộ thẻ ôn tập này..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingTop: 12,
                  height: 70,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  color: '#0F172A',
                  fontSize: 14,
                  marginBottom: 16,
                  textAlignVertical: 'top',
                }}
              />

              {/* Privacy Setting Toggle */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>Chế độ công khai</Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Mọi người đều có thể tìm và học bộ thẻ này</Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (!newIsPublic) {
                      setDmcaModalVisible(true)
                    } else {
                      setNewIsPublic(false)
                    }
                  }}
                  style={{
                    width: 52,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: newIsPublic ? '#10B981' : '#CBD5E1',
                    padding: 3,
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: '#FFFFFF',
                      alignSelf: newIsPublic ? 'flex-end' : 'flex-start',
                      shadowColor: '#000',
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  />
                </Pressable>
              </View>

              {/* Cards Section */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 18 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>Thẻ ghi nhớ ({newCards.length})</Text>
                <Text style={{ fontSize: 11, color: '#94A3B8' }}>Cần điền đầy đủ cả 2 mặt</Text>
              </View>

              {newCards.map((card, index) => {
                const termErr = cardErrors[card.id]?.term
                const defErr = cardErrors[card.id]?.definition

                return (
                  <View
                    key={card.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: 10,
                      gap: 8,
                      borderWidth: 1,
                      borderColor: (termErr || defErr) ? '#FECACA' : '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#8678EA', width: 18, textAlign: 'center', marginTop: 8 }}>
                      {index + 1}
                    </Text>
                    
                    {/* Term input */}
                    <View style={{ flex: 1 }}>
                      <TextInput
                        value={card.term}
                        onChangeText={(val) => handleUpdateCardField(card.id, 'term', val)}
                        placeholder="Thuật ngữ"
                        placeholderTextColor="#CBD5E1"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 8,
                          borderWidth: 1.5,
                          borderColor: termErr ? '#EF4444' : '#E2E8F0',
                          paddingHorizontal: 8,
                          height: 38,
                          fontSize: 13,
                          color: '#0F172A',
                        }}
                      />
                      {termErr ? (
                        <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700', marginTop: 3 }}>
                          ⚠️ {termErr}
                        </Text>
                      ) : null}
                    </View>

                    {/* Definition input */}
                    <View style={{ flex: 1 }}>
                      <TextInput
                        value={card.definition}
                        onChangeText={(val) => handleUpdateCardField(card.id, 'definition', val)}
                        placeholder="Định nghĩa"
                        placeholderTextColor="#CBD5E1"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 8,
                          borderWidth: 1.5,
                          borderColor: defErr ? '#EF4444' : '#E2E8F0',
                          paddingHorizontal: 8,
                          height: 38,
                          fontSize: 13,
                          color: '#334155',
                        }}
                      />
                      {defErr ? (
                        <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700', marginTop: 3 }}>
                          ⚠️ {defErr}
                        </Text>
                      ) : null}
                    </View>

                    {/* Delete row */}
                    <Pressable onPress={() => handleRemoveCardRow(card.id)} style={{ padding: 4, marginTop: 6 }}>
                      <X color='#EF4444' size={16} />
                    </Pressable>
                  </View>
                )
              })}

              <Pressable
                onPress={handleAddCardRow}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: '#A99BFF',
                  paddingVertical: 12,
                  borderRadius: 16,
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <Plus color='#8678EA' size={18} />
                <Text style={{ color: '#8678EA', fontSize: 14, fontWeight: '700' }}>Thêm thẻ mới</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal visible={deleteVisible} animationType="fade" transparent={true} onRequestClose={() => setDeleteVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 28, padding: 24, shadowColor: '#0F172A', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 12 }}>Xóa bộ thẻ</Text>
            <Text style={{ fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 24 }}>
              Bạn có chắc chắn muốn xóa bộ thẻ "{deleteTitle}" không? Hành động này không thể hoàn tác.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Pressable
                onPress={() => setDeleteVisible(false)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: '#F1F5F9',
                }}
              >
                <Text style={{ color: '#475569', fontSize: 13, fontWeight: '800' }}>Hủy</Text>
              </Pressable>
              
              <Pressable
                onPress={handleConfirmDelete}
                disabled={deleting}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: '#EF4444',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Xóa</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Xác Nhận DMCA & Bản Quyền khi mở Công khai */}
      <Modal
        visible={dmcaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDmcaModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View
            style={{
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 22,
              shadowColor: '#0F172A',
              shadowOpacity: 0.2,
              shadowRadius: 24,
              elevation: 10,
            }}
          >
            {/* Header Icon */}
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#ECFDF5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#A7F3D0',
                  marginBottom: 10,
                }}
              >
                <ShieldCheck size={28} color="#059669" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                Xác nhận Điều khoản DMCA
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669', marginTop: 2 }}>
                Xác nhận bản quyền trước khi mở công khai
              </Text>
            </View>

            {/* Content Box */}
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 13, color: '#334155', lineHeight: 20 }}>
                Bằng việc mở công khai bộ thẻ ghi nhớ này, bạn xác nhận rằng:
              </Text>
              <View style={{ marginTop: 8, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Check size={14} color="#059669" style={{ marginTop: 3 }} />
                  <Text style={{ fontSize: 12, color: '#475569', flex: 1, lineHeight: 18 }}>
                    Nội dung thẻ do bạn tự biên soạn hoặc thuộc quyền sở hữu/chia sẻ hợp pháp của bạn.
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Check size={14} color="#059669" style={{ marginTop: 3 }} />
                  <Text style={{ fontSize: 12, color: '#475569', flex: 1, lineHeight: 18 }}>
                    Tuân thủ chính sách bảo vệ bản quyền tác giả DMCA (Digital Millennium Copyright Act) của StudyHub.
                  </Text>
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setDmcaModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 14,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>Hủy</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setNewIsPublic(true)
                  setDmcaModalVisible(false)
                }}
                style={{
                  flex: 1.5,
                  paddingVertical: 13,
                  borderRadius: 14,
                  backgroundColor: '#059669',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#059669',
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                  Đồng ý & Bật công khai
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  )
}

import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View, KeyboardAvoidingView, Platform, Modal } from 'react-native'
import { ArrowLeft, BookOpen, Layers, Plus, Save, X, ShieldCheck, Check } from 'lucide-react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack'

import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import flashcardApi, { FlashcardCollection, UpdateFlashcardPayload } from '../../api/flashcardApi'
import { useToast } from '../../components/ui/ToastProvider'

interface EditCardItem {
  id: string // Client-side unique key
  _id?: string // MongoDB ID if it already exists
  term: string
  definition: string
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

export default function EditFlashcardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute<NativeStackScreenProps<RootStackParamList, 'EditFlashcard'>['route']>()
  const { collectionId } = route.params
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [cards, setCards] = useState<EditCardItem[]>([])
  const [titleError, setTitleError] = useState<string | null>(null)
  const [cardErrors, setCardErrors] = useState<{ [id: string]: { term?: string; definition?: string } }>({})
  const [dmcaModalVisible, setDmcaModalVisible] = useState(false)

  // Load collection details
  const loadCollectionDetails = async () => {
    setLoading(true)
    try {
      const data = await flashcardApi.getById(collectionId)
      setTitle(data.title)
      setDescription(data.description || '')
      setIsPublic(data.isPublic)
      
      const mappedCards = (data.cards || []).map((c) => ({
        id: c._id || generateId(),
        _id: c._id,
        term: c.term,
        definition: c.definition,
      }))
      setCards(mappedCards)
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể tải chi tiết bộ thẻ.')
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCollectionDetails()
  }, [collectionId])

  // Card list operations
  const handleAddCard = () => {
    setCards((prev) => [...prev, { id: generateId(), term: '', definition: '' }])
  }

  const handleRemoveCard = (id: string, cardDbId?: string) => {
    if (cards.length <= 1) {
      toast.warning('Bộ thẻ phải chứa ít nhất 1 thẻ.')
      return
    }

    Alert.alert(
      'Xóa thẻ',
      'Bạn có chắc chắn muốn xóa thẻ này khỏi bộ thẻ không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            // Remove locally first
            setCards((prev) => prev.filter((c) => c.id !== id))
            // If the card already exists in the backend, delete it
            if (cardDbId) {
              try {
                await flashcardApi.removeCard(collectionId, cardDbId)
                toast.success('Đã xóa thẻ khỏi bộ lưu trữ.')
              } catch (err: any) {
                toast.error(err.toString())
              }
            }
          },
        },
      ]
    )
  }

  const handleTitleChange = (text: string) => {
    setTitle(text)
    if (titleError) setTitleError(null)
  }

  const handleUpdateCardField = (id: string, field: 'term' | 'definition', value: string) => {
    setCards((prev) =>
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

  // Handle Save with Inline Field Validation
  const handleSave = async () => {
    let hasError = false
    let tErr: string | null = null
    const cErrs: { [id: string]: { term?: string; definition?: string } } = {}

    if (!title.trim()) {
      tErr = 'Vui lòng nhập tiêu đề bộ thẻ'
      hasError = true
    }

    const validCards = cards.filter((c) => c.term.trim() && c.definition.trim())
    if (validCards.length === 0) {
      if (cards.length > 0) {
        const firstId = cards[0].id
        cErrs[firstId] = {
          term: !cards[0].term.trim() ? 'Nhập thuật ngữ' : undefined,
          definition: !cards[0].definition.trim() ? 'Nhập định nghĩa' : undefined,
        }
      }
      hasError = true
    }

    cards.forEach((c) => {
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

    setSaving(true)
    try {
      const payload: UpdateFlashcardPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        isPublic,
        cards: validCards.map((c) => ({
          _id: c._id,
          term: c.term.trim(),
          definition: c.definition.trim(),
        })),
      }
      await flashcardApi.update(collectionId, payload)
      toast.success('Cập nhật bộ thẻ thành công!')
      navigation.goBack()
    } catch (err: any) {
      toast.error(err.toString() || 'Cập nhật bộ thẻ thất bại.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#8678EA" />
        </View>
      </ScreenShell>
    )
  }

  const isFormValid =
    title.trim().length > 0 &&
    cards.length >= 1 &&
    cards.every((c) => c.term.trim().length > 0 && c.definition.trim().length > 0)

  return (
    <ScreenShell style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }} topPadding={0}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            width: '100%',
            maxHeight: '82%',
            backgroundColor: '#FFFFFF',
            borderRadius: 28,
            overflow: 'hidden',
            shadowColor: '#0F172A',
            shadowOpacity: 0.15,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
          }}
        >
          {/* Header */}
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

            <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A' }}>Chỉnh sửa bộ thẻ</Text>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: (title.trim() && cards.some(c => c.term.trim() && c.definition.trim())) ? '#7C3AED' : '#A78BFA',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 12,
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Lưu</Text>
              )}
            </Pressable>
          </View>

          {/* Scrollable Form */}
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>Tiêu đề bộ thẻ *</Text>
            <TextInput
              value={title}
              onChangeText={handleTitleChange}
              placeholder="Nhập tiêu đề bộ thẻ..."
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
              value={description}
              onChangeText={setDescription}
              placeholder="Nhập mô tả bộ thẻ..."
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
                  if (!isPublic) {
                    setDmcaModalVisible(true)
                  } else {
                    setIsPublic(false)
                  }
                }}
                style={{
                  width: 52,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: isPublic ? '#10B981' : '#CBD5E1',
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
                    alignSelf: isPublic ? 'flex-end' : 'flex-start',
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
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>Thẻ ghi nhớ ({cards.length})</Text>
              <Text style={{ fontSize: 11, color: '#94A3B8' }}>Cần điền đầy đủ cả 2 mặt</Text>
            </View>

            {cards.map((card, index) => {
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
                  <Pressable onPress={() => handleRemoveCard(card.id, card._id)} style={{ padding: 4, marginTop: 6 }}>
                    <X color='#EF4444' size={16} />
                  </Pressable>
                </View>
              )
            })}

            <Pressable
              onPress={handleAddCard}
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
                  setIsPublic(true)
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

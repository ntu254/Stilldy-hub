import React, { useRef, useState, useEffect, useCallback } from 'react'
import { ActivityIndicator, Alert, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, Image } from 'react-native'
import { ArrowLeft, Plus, Send, FileText, X, Sparkles, Menu, Pencil, Trash2, CirclePlus, MessageSquare, Pin, Archive, EllipsisVertical } from 'lucide-react-native'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'
import { useToast } from '../../components/ui/ToastProvider'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList, MainTabParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'

import { chatApi, ChatMessage, ChatSession } from '../../api/chatApi'
import { documentsApi, DocumentInfo } from '../../api/documentsApi'

function FormattedMarkdownText({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <Text style={{ color: '#FFFFFF', fontSize: 14.5, lineHeight: 22 }}>{content}</Text>
  }

  const lines = content.split('\n')

  return (
    <View style={{ gap: 4 }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <View key={idx} style={{ height: 4 }} />
        }

        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')
        const cleanLine = isBullet ? trimmed.substring(2).trim() : trimmed

        const parts = cleanLine.split(/(\*\*.*?\*\*)/g)

        const renderInlineText = (textParts: string[]) =>
          textParts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <Text key={pIdx} style={{ fontWeight: '800', color: '#0F172A' }}>
                  {part.slice(2, -2)}
                </Text>
              )
            }
            return <Text key={pIdx}>{part}</Text>
          })

        if (isBullet) {
          return (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginLeft: 2, marginVertical: 1 }}>
              <Text style={{ color: '#8678EA', fontWeight: '900', fontSize: 14, marginRight: 6, marginTop: 1 }}>•</Text>
              <Text style={{ color: '#1E293B', fontSize: 14, lineHeight: 21, flex: 1 }}>
                {renderInlineText(parts)}
              </Text>
            </View>
          )
        }

        const isHeader = trimmed.startsWith('### ') || trimmed.startsWith('## ')
        if (isHeader) {
          const headerText = trimmed.replace(/^#+\s*/, '')
          return (
            <Text key={idx} style={{ color: '#0F172A', fontSize: 15, fontWeight: '900', marginTop: 8, marginBottom: 2 }}>
              {headerText}
            </Text>
          )
        }

        return (
          <Text key={idx} style={{ color: '#1E293B', fontSize: 14, lineHeight: 21 }}>
            {renderInlineText(parts)}
          </Text>
        )
      })}
    </View>
  )
}

export default function ChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>()
  const listRef = useRef<FlatList<ChatMessage>>(null)
  const toast = useToast()
  const currentUser = useSelector((state: RootState) => state.auth.user)

  const showBackButton = Boolean(route.params?.source === 'viewer' && route.params?.documentId)
  const routeDocId = route.params?.documentId
  const routeDocTitle = route.params?.documentTitle

  // Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  // Document context states
  const [availableDocs, setAvailableDocs] = useState<DocumentInfo[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string | undefined>(routeDocId)
  const [selectedDocTitle, setSelectedDocTitle] = useState<string>(routeDocTitle || 'Chọn một tài liệu trong kho')
  const [selectorVisible, setSelectorVisible] = useState(false)
  const [loadingDocs, setLoadingDocs] = useState(false)

  // History & Session Management States
  const [historyVisible, setHistoryVisible] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [renameVisible, setRenameVisible] = useState(false)
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null)
  const [renameInput, setRenameInput] = useState('')
  const [deleteVisible, setDeleteVisible] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [optionsVisible, setOptionsVisible] = useState(false)
  const [optionsSession, setOptionsSession] = useState<ChatSession | null>(null)

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

  // 1. Tải danh sách tài liệu cá nhân để làm danh sách ngữ cảnh chọn lựa
  const loadAvailableDocuments = async () => {
    setLoadingDocs(true)
    try {
      const result = await documentsApi.getMyDocuments({ limit: 50 })
      setAvailableDocs(result.data || [])
    } catch (err) {
      console.warn('Cannot load personal documents for chatbot:', err)
    } finally {
      setLoadingDocs(false)
    }
  }

  // 2. Khởi tạo/Tìm phiên chat dựa trên ngữ cảnh truyền vào
  const initChatSession = async () => {
    setLoadingHistory(true)
    try {
      const sessions = await chatApi.getChatSessions()

      let targetSession: ChatSession | null = null

      if (routeDocId) {
        // Tìm phiên chat đã tồn tại có chứa tài liệu này
        targetSession = sessions.find((s) => s.documentIds?.includes(routeDocId)) || null

        if (!targetSession) {
          // Nếu chưa có, tạo phiên chat mới dành riêng cho tài liệu này
          targetSession = await chatApi.createChatSession(
            `Hỏi về: ${routeDocTitle}`,
            [routeDocId]
          )
        }
      } else {
        // Mở chat chung: lấy phiên chat gần đây nhất
        if (sessions.length > 0) {
          targetSession = sessions[0]
        } else {
          // Chưa có phiên nào: tạo một phiên chat mặc định mới
          targetSession = await chatApi.createChatSession('AI Chat', [])
        }
      }

      if (targetSession) {
        // Lấy chi tiết phiên chat kèm lịch sử tin nhắn đầy đủ
        const detail = await chatApi.getChatSessionDetail(targetSession._id)
        setActiveSession(detail)
        setMessages(detail.messages || [])

        // Nhận diện tài liệu gắn kèm nếu có
        if (detail.documentIds && detail.documentIds.length > 0) {
          const docId = detail.documentIds[0]
          setSelectedDocId(docId)

          // Thử tìm tên tài liệu trong danh sách tài liệu đã load
          const match = availableDocs.find((d) => d._id === docId)
          if (match) {
            setSelectedDocTitle(match.title)
          } else {
            try {
              const info = await documentsApi.getDocumentDetail(docId)
              setSelectedDocTitle(info.title)
            } catch {
              setSelectedDocTitle('Tài liệu liên kết')
            }
          }
        } else {
          setSelectedDocId(undefined)
          setSelectedDocTitle('Chọn một tài liệu trong kho')
        }
      }
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể đồng bộ phiên AI Chat.')
    } finally {
      setLoadingHistory(false)
      // Tự động cuộn xuống cuối
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true })
      }, 300)
    }
  }

  // Tải danh sách cuộc hội thoại cũ
  const loadSessions = async (archivedStatus = showArchived) => {
    setLoadingSessions(true)
    try {
      const list = await chatApi.getChatSessions(archivedStatus)
      setSessions(list)
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể tải lịch sử chat.')
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleTogglePin = async (session: ChatSession) => {
    try {
      const nextPin = !session.isPinned
      await chatApi.pinChatSession(session._id, nextPin)
      toast.success(nextPin ? 'Đã ghim cuộc hội thoại!' : 'Đã bỏ ghim cuộc hội thoại.')
      loadSessions(showArchived)
    } catch (err: any) {
      toast.error(err.toString() || 'Lỗi khi ghim cuộc hội thoại.')
    }
  }

  const handleToggleArchive = async (session: ChatSession) => {
    try {
      const nextArchive = !session.isArchived
      await chatApi.archiveChatSession(session._id, nextArchive)
      toast.success(nextArchive ? 'Đã lưu trữ cuộc hội thoại!' : 'Đã hủy lưu trữ cuộc hội thoại.')
      if (activeSession?._id === session._id) {
        setActiveSession(null)
        setMessages([])
      }
      loadSessions(showArchived)
    } catch (err: any) {
      toast.error(err.toString() || 'Lỗi khi thay đổi trạng thái lưu trữ.')
    }
  }

  // Reload sessions when tab toggle or visibility changes
  useEffect(() => {
    if (historyVisible) {
      loadSessions(showArchived)
    }
  }, [showArchived, historyVisible])

  // Tạo cuộc hội thoại mới trống
  const handleCreateNewSession = async () => {
    try {
      const newSession = await chatApi.createChatSession('AI Chat mới', [])
      toast.success('Đã tạo cuộc hội thoại mới!')
      setActiveSession(newSession)
      setMessages([])
      setSelectedDocId(undefined)
      setSelectedDocTitle('Chọn một tài liệu trong kho')
      setHistoryVisible(false)
    } catch (err: any) {
      toast.error(err.toString() || 'Tạo cuộc hội thoại mới thất bại.')
    }
  }

  // Chuyển sang cuộc hội thoại khác
  const handleSwitchSession = async (session: ChatSession) => {
    setLoadingHistory(true)
    setHistoryVisible(false)
    try {
      const detail = await chatApi.getChatSessionDetail(session._id)
      setActiveSession(detail)
      setMessages(detail.messages || [])

      if (detail.documentIds && detail.documentIds.length > 0) {
        const docId = detail.documentIds[0]
        setSelectedDocId(docId)
        const match = availableDocs.find((d) => d._id === docId)
        if (match) {
          setSelectedDocTitle(match.title)
        } else {
          try {
            const info = await documentsApi.getDocumentDetail(docId)
            setSelectedDocTitle(info.title)
          } catch {
            setSelectedDocTitle('Tài liệu liên kết')
          }
        }
      } else {
        setSelectedDocId(undefined)
        setSelectedDocTitle('Chọn một tài liệu trong kho')
      }
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể tải chi tiết cuộc trò chuyện.')
    } finally {
      setLoadingHistory(false)
    }
  }

  // Xóa cuộc hội thoại
  const handleDeleteSession = async () => {
    if (!deletingSessionId) return
    setDeleting(true)
    try {
      await chatApi.deleteChatSession(deletingSessionId)
      toast.success('Đã xóa cuộc trò chuyện.')
      setDeleteVisible(false)
      loadSessions()
      if (activeSession?._id === deletingSessionId) {
        initChatSession()
      }
      setTimeout(() => {
        setHistoryVisible(true)
      }, 300)
    } catch (err: any) {
      toast.error(err.toString() || 'Xóa cuộc trò chuyện thất bại.')
    } finally {
      setDeleting(false)
      setDeletingSessionId(null)
    }
  }

  const closeDeleteAndReopenHistory = () => {
    setDeleteVisible(false)
    setDeletingSessionId(null)
    setTimeout(() => {
      setHistoryVisible(true)
    }, 300)
  }

  // Đổi tên cuộc hội thoại
  const handleRenameSession = async () => {
    if (!renameInput.trim() || !renamingSessionId) return
    try {
      await chatApi.renameChatSession(renamingSessionId, renameInput.trim())
      toast.success('Đã đổi tên cuộc trò chuyện thành công!')
      setRenameVisible(false)
      loadSessions()
      if (activeSession?._id === renamingSessionId) {
        setActiveSession((prev) => prev ? { ...prev, sessionTitle: renameInput.trim() } : null)
      }
      setTimeout(() => {
        setHistoryVisible(true)
      }, 300)
    } catch (err: any) {
      toast.error(err.toString() || 'Đổi tên cuộc trò chuyện thất bại.')
    }
  }

  const closeRenameAndReopenHistory = () => {
    setRenameVisible(false)
    setTimeout(() => {
      setHistoryVisible(true)
    }, 300)
  }

  // Tải danh sách tài liệu và khởi tạo phiên chat khi màn hình được Focus
  useFocusEffect(
    useCallback(() => {
      loadAvailableDocuments()
      initChatSession()
    }, [routeDocId, routeDocTitle])
  )

  const handleBackPress = () => {
    // Reset navigation params
    navigation.setParams({ source: undefined, documentId: undefined, documentTitle: undefined, sourceSubject: undefined } as any)

    const parentNav = (navigation as any).getParent?.()
    if (parentNav?.canGoBack?.()) {
      parentNav.goBack()
    } else if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      if (currentUser?.role === 'admin') {
        (navigation as any).navigate('MainTabs', { screen: 'AdminDashboard' })
      } else {
        (navigation as any).navigate('MainTabs', { screen: 'Documents' })
      }
    }
  }

  // Chọn tài liệu ngữ cảnh mới trong Modal
  const handleSelectDocument = async (docId: string, docTitle: string) => {
    setSelectorVisible(false)
    setSelectedDocId(docId)
    setSelectedDocTitle(docTitle)

    setLoadingHistory(true)
    try {
      // Tìm phiên chat đã liên kết với file này trước đó
      const sessions = await chatApi.getChatSessions()
      let session = sessions.find((s) => s.documentIds?.includes(docId))

      if (!session) {
        session = await chatApi.createChatSession(`Hỏi về: ${docTitle}`, [docId])
      }

      const detail = await chatApi.getChatSessionDetail(session._id)
      setActiveSession(detail)
      setMessages(detail.messages || [])
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể đổi ngữ cảnh tệp tin.')
    } finally {
      setLoadingHistory(false)
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true })
      }, 200)
    }
  }

  // Gửi tin nhắn
  const handleSendMessage = async () => {
    if (!draft.trim() || !activeSession || sendingMessage) return

    const userText = draft.trim()
    setDraft('')
    setSendingMessage(true)

    // Tạo tin nhắn user ảo tạm thời trên UI trước
    const tempUserMsg: ChatMessage = {
      _id: `temp-${Date.now()}`,
      role: 'user',
      textContent: userText,
      documentId: selectedDocId,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)

    try {
      const result = await chatApi.sendMessage(
        activeSession._id,
        userText,
        selectedDocId
      )

      // Cập nhật lại danh sách tin nhắn thật từ server
      setMessages((prev) => {
        // Lọc bỏ tin nhắn ảo và nối tin nhắn thật
        const filtered = prev.filter((m) => !m._id?.startsWith('temp-'))
        const sessionData = result as any
        if (sessionData && Array.isArray(sessionData.messages)) {
          return sessionData.messages
        }
        if (result.userMessage && result.assistantMessage) {
          return [...filtered, result.userMessage, result.assistantMessage]
        }
        return filtered
      })
    } catch (err: any) {
      toast.error(err.toString() || 'AI đang bận, vui lòng thử lại sau.')
      // Xóa tin nhắn ảo nếu lỗi
      setMessages((prev) => prev.filter((m) => !m._id?.startsWith('temp-')))
    } finally {
      setSendingMessage(false)
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150)
    }
  }

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
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
          {showBackButton ? (
            <Pressable
              onPress={handleBackPress}
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <View
          style={{
            marginHorizontal: 18,
            marginBottom: 12,
            borderRadius: 24,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            padding: 14,
            shadowColor: '#0F172A',
            shadowOpacity: 0.04,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 2,
          }}
        >
          {/* AI Status Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#8678EA',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#8678EA',
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <Sparkles color='#FFFFFF' size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#0F172A', fontSize: 15, fontWeight: '800' }} numberOfLines={1}>
                  Trợ lý AI • {activeSession?.sessionTitle || 'Chat mới'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981' }} />
                  <Text style={{ color: '#059669', fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                    Sẵn sàng phân tích Nexus
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Action Buttons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                onPress={handleCreateNewSession}
                style={{
                  backgroundColor: '#0F172A',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Plus color='#FFFFFF' size={14} />
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Chat mới</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  loadSessions()
                  setHistoryVisible(true)
                }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Menu color='#0F172A' size={17} />
              </Pressable>
            </View>
          </View>

          {/* Document Context Selector Box */}
          <View
            style={{
              backgroundColor: '#F8FAFC',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#EEF2FF',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <FileText color='#8678EA' size={16} />
            </View>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 12.5 }} numberOfLines={1}>{selectedDocTitle}</Text>
              <Text style={{ color: '#64748B', fontSize: 10.5, marginTop: 1 }} numberOfLines={1}>
                {selectedDocId ? 'Hỏi đáp thông minh RAG theo file' : 'Gắn tài liệu để RAG thông minh hơn'}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                loadAvailableDocuments()
                setSelectorVisible(true)
              }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 10,
                backgroundColor: '#E0F2FE',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284C7' }}>Đổi file</Text>
            </Pressable>
          </View>
        </View>

        {loadingHistory ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size='large' color='#8678EA' />
            <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>Đang nạp lịch sử chat...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item, index) => item._id || `msg-${index}-${item.createdAt || ''}`}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 12 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isUser = item.role === 'user' || (item as any).sender === 'user'
              return (
                <View style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: isUser ? '85%' : '92%', flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  {!isUser ? (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#8678EA',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2,
                      }}
                    >
                      <Sparkles color='#FFFFFF' size={16} />
                    </View>
                  ) : null}

                  <View
                    style={{
                      flex: 1,
                      backgroundColor: isUser ? '#0F172A' : '#FFFFFF',
                      borderWidth: isUser ? 0 : 1,
                      borderColor: '#E2E8F0',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 22,
                      shadowColor: '#0F172A',
                      shadowOpacity: isUser ? 0.12 : 0.03,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 3 },
                      elevation: isUser ? 2 : 1,
                    }}
                  >
                    <FormattedMarkdownText content={item.textContent} isUser={isUser} />
                  </View>

                  {isUser ? (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#0F172A',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2,
                      }}
                    >
                      <Image
                        source={{ uri: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80' }}
                        style={{ width: 28, height: 28, borderRadius: 14 }}
                      />
                    </View>
                  ) : null}
                </View>
              )
            }}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: 'center' }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3F0FF', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Sparkles color='#8678EA' size={32} />
                </View>
                <Text style={{ color: '#0F172A', textAlign: 'center', fontWeight: '800', fontSize: 16 }}>
                  Bắt đầu trò chuyện với AI!
                </Text>
                <Text style={{ marginTop: 6, color: '#64748B', textAlign: 'center', fontSize: 13, lineHeight: 19 }}>
                  Đặt bất kỳ câu hỏi nào về lộ trình học tập, tóm tắt tài liệu hoặc hướng dẫn học.
                </Text>
              </View>
            }
          />
        )}

        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: keyboardVisible
              ? (Platform.OS === 'ios' ? 16 : 24)
              : (currentUser?.role === 'admin' ? (Platform.OS === 'ios' ? 34 : 20) : 116),
            paddingTop: 10,
            backgroundColor: 'rgba(248,250,252,0.98)',
            shadowColor: '#0F172A',
            shadowOpacity: 0.07,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: -6 },
            elevation: 5,
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 30,
              paddingHorizontal: 12,
              paddingVertical: 8,
              shadowColor: '#0F172A',
              shadowOpacity: 0.04,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 2,
            }}
          >
            <Pressable
              onPress={() => {
                loadAvailableDocuments()
                setSelectorVisible(true)
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#E0F2FE',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
              }}
            >
              <Plus color='#06B6D4' size={18} />
            </Pressable>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder='Nhập câu hỏi cho AI...'
              placeholderTextColor='#94A3B8'
              multiline
              style={{
                flex: 1,
                minHeight: 42,
                maxHeight: 120,
                color: '#0F172A',
                fontSize: 15,
                paddingTop: 8,
                paddingBottom: 8,
              }}
            />
            <Pressable
              onPress={handleSendMessage}
              disabled={!draft.trim() || sendingMessage}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: draft.trim() && !sendingMessage ? '#0F172A' : '#CBD5E1',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 8,
              }}
            >
              {sendingMessage ? (
                <ActivityIndicator size='small' color='#FFFFFF' />
              ) : (
                <Send color='#FFFFFF' size={18} />
              )}
            </Pressable>
          </View>
        </View>

        <Modal visible={selectorVisible} transparent animationType='fade' onRequestClose={() => setSelectorVisible(false)}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', paddingHorizontal: 20 }}
            onPress={() => setSelectorVisible(false)}
          >
            <Pressable
              onPress={() => null}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 20,
                paddingBottom: 24,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 5,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '800' }}>Chọn tài liệu làm ngữ cảnh AI</Text>
                <Pressable onPress={() => setSelectorVisible(false)}>
                  <X color='#64748B' size={20} />
                </Pressable>
              </View>

              {loadingDocs ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <ActivityIndicator size='small' color='#06B6D4' />
                  <Text style={{ marginTop: 8, color: '#64748B' }}>Đang tải danh sách tài liệu...</Text>
                </View>
              ) : availableDocs.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Text style={{ color: '#64748B', fontWeight: '600' }}>Không tìm thấy tài liệu cá nhân.</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>Hãy đăng tải file ở tab Kho tài liệu trước!</Text>
                </View>
              ) : (
                <FlatList
                  data={availableDocs}
                  keyExtractor={(item) => item._id}
                  style={{ maxHeight: 300 }}
                  contentContainerStyle={{ gap: 10, paddingBottom: 10 }}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleSelectDocument(item._id, item.title)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderRadius: 20,
                        padding: 14,
                      }}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: '#EEF2F6',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 10,
                        }}
                      >
                        <FileText size={18} color='#6366F1' />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                          {item.subjectId?.name || 'Môn học'}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={historyVisible} transparent animationType='fade' onRequestClose={() => setHistoryVisible(false)}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', paddingHorizontal: 20 }}
            onPress={() => setHistoryVisible(false)}
          >
            <Pressable
              onPress={() => null}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 20,
                paddingBottom: 20,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 5,
                height: 500,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '800' }}>Lịch sử đoạn chat</Text>
                <Pressable onPress={() => setHistoryVisible(false)}>
                  <X color='#64748B' size={20} />
                </Pressable>
              </View>

              {/* Top Action Button "+ Đoạn chat mới" */}
              <Pressable
                onPress={handleCreateNewSession}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#0F172A',
                  borderRadius: 999,
                  height: 48,
                  paddingHorizontal: 20,
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 14,
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Plus size={18} color='#FFFFFF' />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Đoạn chat mới</Text>
              </Pressable>

              {/* Active / Archive Toggle Tabs */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: '#F1F5F9',
                  borderRadius: 999,
                  padding: 4,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Pressable
                  onPress={() => setShowArchived(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    borderRadius: 999,
                    backgroundColor: !showArchived ? '#FFFFFF' : 'transparent',
                    shadowColor: !showArchived ? '#0F172A' : 'transparent',
                    shadowOpacity: !showArchived ? 0.05 : 0,
                    shadowRadius: 4,
                    elevation: !showArchived ? 1 : 0,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: !showArchived ? '#0F172A' : '#64748B' }}>
                    Hội thoại
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowArchived(true)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    borderRadius: 999,
                    backgroundColor: showArchived ? '#FFFFFF' : 'transparent',
                    shadowColor: showArchived ? '#0F172A' : 'transparent',
                    shadowOpacity: showArchived ? 0.05 : 0,
                    shadowRadius: 4,
                    elevation: showArchived ? 1 : 0,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: showArchived ? '#0F172A' : '#64748B' }}>
                    Đã lưu trữ
                  </Text>
                </Pressable>
              </View>

              <View style={{ flex: 1 }}>
                {loadingSessions ? (
                  <View style={{ flex: 1, minHeight: 280, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size='small' color='#8678EA' />
                    <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Đang tải...</Text>
                  </View>
                ) : sessions.length === 0 ? (
                  <View style={{ flex: 1, minHeight: 280, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <Archive size={24} color='#94A3B8' />
                    </View>
                    <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 14 }}>
                      {showArchived ? 'Chưa có đoạn chat lưu trữ' : 'Chưa có lịch sử hội thoại'}
                    </Text>
                    <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                      {showArchived ? 'Các đoạn chat được lưu trữ sẽ xuất hiện tại đây.' : 'Bắt đầu cuộc trò chuyện mới với AI!'}
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                    {/* Pinned Section */}
                    {!showArchived && sessions.some((s) => s.isPinned) ? (
                      <View style={{ marginBottom: 14 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 }}>
                          ĐƯỢC GHIM
                        </Text>
                        <View style={{ gap: 8 }}>
                          {sessions
                            .filter((s) => s.isPinned)
                            .map((item) => {
                              const isActive = activeSession?._id === item._id
                              return (
                                <Pressable
                                  key={item._id}
                                  onPress={() => handleSwitchSession(item)}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: isActive ? '#EEF2FF' : '#F5F3FF',
                                    borderWidth: 1,
                                    borderColor: isActive ? '#8678EA' : '#DDD6FE',
                                    borderRadius: 16,
                                    padding: 12,
                                  }}
                                >
                                  <View
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 18,
                                      backgroundColor: '#8678EA',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginRight: 10,
                                    }}
                                  >
                                    <MessageSquare size={16} color='#FFFFFF' />
                                  </View>
                                  <View style={{ flex: 1, marginRight: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Text style={{ color: '#0F172A', fontWeight: '800', fontSize: 13, flex: 1 }} numberOfLines={1}>
                                        {item.sessionTitle || 'AI Chat'}
                                      </Text>
                                      <Pin size={12} color='#8678EA' fill='#8678EA' />
                                    </View>
                                    <Text style={{ color: '#64748B', fontSize: 10, marginTop: 2 }}>
                                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                                    </Text>
                                  </View>
                                  
                                  <Pressable
                                    onPress={() => {
                                      setOptionsSession(item)
                                      setOptionsVisible(true)
                                    }}
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                      backgroundColor: '#FFFFFF',
                                      borderWidth: 1,
                                      borderColor: '#E2E8F0',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <EllipsisVertical size={15} color='#64748B' />
                                  </Pressable>
                                </Pressable>
                              )
                            })}
                        </View>
                      </View>
                    ) : null}

                    {/* Main Section */}
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 }}>
                        {showArchived ? 'ĐÃ LƯU TRỮ' : 'HỘI THOẠI GẦN ĐÂY'}
                      </Text>
                      <View style={{ gap: 8 }}>
                        {sessions
                          .filter((s) => showArchived || !s.isPinned)
                          .map((item) => {
                            const isActive = activeSession?._id === item._id
                            return (
                              <Pressable
                                key={item._id}
                                onPress={() => handleSwitchSession(item)}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  backgroundColor: isActive ? '#F1F5F9' : '#FFFFFF',
                                  borderWidth: 1,
                                  borderColor: isActive ? '#CBD5E1' : '#E2E8F0',
                                  borderRadius: 16,
                                  padding: 12,
                                }}
                              >
                                <View
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: isActive ? '#0F172A' : '#F1F5F9',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 10,
                                  }}
                                >
                                  <MessageSquare size={16} color={isActive ? '#FFFFFF' : '#64748B'} />
                                </View>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                  <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                                    {item.sessionTitle || 'AI Chat'}
                                  </Text>
                                  <Text style={{ color: '#64748B', fontSize: 10, marginTop: 2 }}>
                                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                                  </Text>
                                </View>
                                
                                <Pressable
                                  onPress={() => {
                                    setOptionsSession(item)
                                    setOptionsVisible(true)
                                  }}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: '#F8FAFC',
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <EllipsisVertical size={15} color='#64748B' />
                                </Pressable>
                              </Pressable>
                            )
                          })}
                      </View>
                    </View>
                  </ScrollView>
                )}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={optionsVisible}
          transparent
          animationType='fade'
          onRequestClose={() => setOptionsVisible(false)}
        >
          <Pressable
            style={{ 
              flex: 1, 
              backgroundColor: 'rgba(15,23,42,0.45)', 
              justifyContent: 'center', 
              alignItems: 'center',
              paddingHorizontal: 28 
            }}
            onPress={() => setOptionsVisible(false)}
          >
            <Pressable
              onPress={() => null}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                width: '100%',
                maxWidth: 320,
                padding: 20,
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 10,
              }}
            >
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', textAlign: 'center' }} numberOfLines={1}>
                  {optionsSession?.sessionTitle || 'Tùy chọn'}
                </Text>
                <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                  Tạo lúc: {optionsSession ? new Date(optionsSession.createdAt).toLocaleDateString('vi-VN') : ''}
                </Text>
              </View>

              <View style={{ gap: 10, marginBottom: 16 }}>
                {/* Pin Option */}
                <Pressable
                  onPress={() => {
                    if (optionsSession) {
                      setOptionsVisible(false)
                      handleTogglePin(optionsSession)
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: optionsSession?.isPinned ? '#EEF2FF' : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: optionsSession?.isPinned ? '#C7D2FE' : '#F1F5F9',
                    borderRadius: 12,
                    padding: 12,
                    gap: 10,
                  }}
                >
                  <Pin size={16} color='#6366F1' fill={optionsSession?.isPinned ? '#6366F1' : 'none'} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                    {optionsSession?.isPinned ? 'Bỏ ghim hội thoại' : 'Ghim hội thoại'}
                  </Text>
                </Pressable>

                {/* Archive Option */}
                <Pressable
                  onPress={() => {
                    if (optionsSession) {
                      setOptionsVisible(false)
                      handleToggleArchive(optionsSession)
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: optionsSession?.isArchived ? '#ECFDF5' : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: optionsSession?.isArchived ? '#A7F3D0' : '#F1F5F9',
                    borderRadius: 12,
                    padding: 12,
                    gap: 10,
                  }}
                >
                  <Archive size={16} color='#10B981' fill={optionsSession?.isArchived ? '#10B981' : 'none'} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                    {optionsSession?.isArchived ? 'Hủy lưu trữ' : 'Lưu trữ hội thoại'}
                  </Text>
                </Pressable>

                {/* Rename Option */}
                <Pressable
                  onPress={() => {
                    if (optionsSession) {
                      setOptionsVisible(false)
                      setRenamingSessionId(optionsSession._id)
                      setRenameInput(optionsSession.sessionTitle || '')
                      setTimeout(() => {
                        setRenameVisible(true)
                      }, 300)
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#F1F5F9',
                    borderRadius: 12,
                    padding: 12,
                    gap: 10,
                  }}
                >
                  <Pencil size={16} color='#64748B' />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                    Đổi tên hội thoại
                  </Text>
                </Pressable>

                {/* Delete Option */}
                <Pressable
                  onPress={() => {
                    if (optionsSession) {
                      setOptionsVisible(false)
                      setDeletingSessionId(optionsSession._id)
                      setTimeout(() => {
                        setDeleteVisible(true)
                      }, 300)
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FEF2F2',
                    borderWidth: 1,
                    borderColor: '#FEE2E2',
                    borderRadius: 12,
                    padding: 12,
                    gap: 10,
                  }}
                >
                  <Trash2 size={16} color='#EF4444' />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>
                    Xóa cuộc hội thoại
                  </Text>
                </Pressable>
              </View>

              {/* Cancel Button */}
              <Pressable
                onPress={() => setOptionsVisible(false)}
                style={{
                  backgroundColor: '#F1F5F9',
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#475569' }}>Hủy bỏ</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={renameVisible} transparent animationType='fade' onRequestClose={closeRenameAndReopenHistory}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', paddingHorizontal: 20 }}
            onPress={closeRenameAndReopenHistory}
          >
            <Pressable
              onPress={() => null}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 20,
                paddingBottom: 24,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 5,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '800' }}>Đổi tên đoạn chat</Text>
                <Pressable onPress={closeRenameAndReopenHistory}>
                  <X color='#64748B' size={20} />
                </Pressable>
              </View>

              <View style={{ gap: 14 }}>
                <View style={{ gap: 6 }}>
                  <Text style={{ color: '#64748B', fontSize: 13 }}>Tên đoạn chat mới</Text>
                  <TextInput
                    value={renameInput}
                    onChangeText={setRenameInput}
                    placeholder='Nhập tên cuộc hội thoại mới...'
                    placeholderTextColor='#94A3B8'
                    style={{
                      height: 52,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      backgroundColor: '#F8FAFC',
                      paddingHorizontal: 14,
                      color: '#0F172A',
                      fontSize: 14,
                    }}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <Pressable
                    onPress={closeRenameAndReopenHistory}
                    style={{
                      flex: 1,
                      height: 54,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#64748B', fontWeight: '800' }}>Hủy bỏ</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleRenameSession}
                    style={{
                      flex: 1.5,
                      height: 54,
                      borderRadius: 18,
                      backgroundColor: '#0F172A',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Lưu thay đổi</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Custom Delete Confirmation Modal */}
        <Modal visible={deleteVisible} transparent animationType='fade' onRequestClose={closeDeleteAndReopenHistory}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', paddingHorizontal: 20 }}
            onPress={closeDeleteAndReopenHistory}
          >
            <Pressable
              onPress={() => null}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 20,
                paddingBottom: 24,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 5,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '800' }}>Xóa cuộc trò chuyện</Text>
                <Pressable onPress={closeDeleteAndReopenHistory}>
                  <X color='#64748B' size={20} />
                </Pressable>
              </View>

              <View style={{ gap: 14 }}>
                <Text style={{ color: '#64748B', fontSize: 14, lineHeight: 20 }}>
                  Bạn có chắc chắn muốn xóa cuộc trò chuyện này không? Hành động này không thể hoàn tác và toàn bộ lịch sử tin nhắn sẽ bị xóa vĩnh viễn.
                </Text>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <Pressable
                    onPress={closeDeleteAndReopenHistory}
                    disabled={deleting}
                    style={{
                      flex: 1,
                      height: 54,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#64748B', fontWeight: '800' }}>Hủy bỏ</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDeleteSession}
                    disabled={deleting}
                    style={{
                      flex: 1.5,
                      height: 54,
                      borderRadius: 18,
                      backgroundColor: '#EF4444',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                    }}
                  >
                    {deleting ? (
                      <ActivityIndicator size='small' color='#FFFFFF' />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Xác nhận xóa</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}

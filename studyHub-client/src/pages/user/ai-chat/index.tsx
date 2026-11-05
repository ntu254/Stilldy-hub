import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Send,
  Paperclip,
  Plus,
  Menu,
  X,
  FileText,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/animate-ui/components/radix/sheet'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/animate-ui/components/radix/alert-dialog'
import { cn } from '@/lib/utils'
import { chatSessionService, type ChatSessionFromServer, type ChatMessageFromServer } from '@/services/chatSessionService'
import { documentService } from '@/services/documentService'
import type { ServerDocument } from '@/types/document'

// Local sub-components & types
import MessageItem from './components/MessageItem'
import ConversationItem from './components/ConversationItem'
import AttachmentPicker from './components/AttachmentPicker'
import type { Message, Conversation } from './types'

// ─── Helper: map server messages to local UI format ─────────────────────────
function mapServerMessages(serverMessages: ChatMessageFromServer[], sessionId: string): Message[] {
  return serverMessages.map((msg, idx) => {
    let attachedFile = undefined
    if (msg.sender === 'user') {
      const savedTitle = localStorage.getItem(`chat_attach_${sessionId}_${idx}`)
      if (savedTitle) {
        attachedFile = savedTitle
      }
    }
    return {
      id: `msg-${idx}-${new Date(msg.createdAt).getTime()}`,
      sender: msg.sender as 'user' | 'ai',
      content: msg.textContent,
      timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      citations: msg.citations,
      attachedFile,
    }
  })
}

// ─── Helper: map server session to conversation list item ───────────────────
function mapServerSession(session: ChatSessionFromServer): Conversation {
  const lastMsg = session.messages.length > 0
    ? session.messages[session.messages.length - 1].textContent
    : 'Chưa có tin nhắn...'
  const date = new Date(session.updatedAt || session.createdAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  let timestamp: string
  if (diffMin < 1) timestamp = 'Vừa xong'
  else if (diffMin < 60) timestamp = `${diffMin} phút trước`
  else if (diffMin < 1440) timestamp = `${Math.floor(diffMin / 60)} giờ trước`
  else timestamp = `${Math.floor(diffMin / 1440)} ngày trước`

  return {
    id: session._id,
    title: session.sessionTitle,
    lastMessage: lastMsg.length > 80 ? lastMsg.substring(0, 80) + '...' : lastMsg,
    timestamp,
    isPinned: session.isPinned || false,
    isArchived: session.isArchived || false,
  }
}

export default function AiChatPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, Message[]>>({})

  const [inputVal, setInputVal] = useState('')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [attachedDoc, setAttachedDoc] = useState<ServerDocument | null>(null)
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false)

  // User's documents list for attachment picker
  const [userDocuments, setUserDocuments] = useState<ServerDocument[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)

  // Loading states
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  // Edit session states
  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editTitleVal, setEditTitleVal] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const processedStateRef = useRef(false)

  // ─── Auto scroll to bottom ──────────────────────────────────────────────
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, activeConvId])

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputVal])

  // ─── Load full session detail when switching conversations ──────────────
  const loadSessionDetail = useCallback(async (sessionId: string) => {
    try {
      const session = await chatSessionService.getById(sessionId)
      setMessages(prev => ({
        ...prev,
        [sessionId]: mapServerMessages(session.messages, sessionId),
      }))
    } catch (err) {
      console.error('Lỗi khi tải chi tiết phiên chat:', err)
    }
  }, [])

  // ─── Fetch chat sessions on mount / showArchived change ───────────────────
  const fetchSessions = useCallback(async (selectFirst = false) => {
    try {
      setIsLoadingSessions(true)
      const sessions = await chatSessionService.getAll(showArchived)
      const mapped = sessions.map(mapServerSession)
      setConversations(mapped)

      // Build messages map from server data
      const messagesMap: Record<string, Message[]> = {}
      for (const s of sessions) {
        messagesMap[s._id] = mapServerMessages(s.messages, s._id)
      }
      setMessages(prev => ({ ...prev, ...messagesMap }))

      // Set active conversation to the first one if we want to or if current activeConvId is not in the list
      if (mapped.length > 0) {
        setActiveConvId(currentId => {
          if (selectFirst || !currentId || !mapped.some(c => c.id === currentId)) {
            const firstId = mapped[0].id
            setTimeout(() => loadSessionDetail(firstId), 0)
            return firstId
          }
          return currentId
        })
      } else {
        setActiveConvId(null)
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách phiên chat:', err)
    } finally {
      setIsLoadingSessions(false)
    }
  }, [showArchived, loadSessionDetail])

  useEffect(() => {
    const state = location.state as { attachDocId?: string; attachDocTitle?: string } | null
    if (!state?.attachDocId && !processedStateRef.current) {
      fetchSessions()
    }
  }, [fetchSessions, location.state])

  // ─── Auto-create chat session if redirected with attachDocId ───────────
  useEffect(() => {
    const state = location.state as { attachDocId?: string; attachDocTitle?: string } | null
    if (state?.attachDocId && !processedStateRef.current) {
      processedStateRef.current = true
      const docId = state.attachDocId

      // Clear state immediately in history so back/refresh doesn't re-run this
      navigate(location.pathname, { replace: true, state: {} })

      const autoCreateSession = async () => {
        try {
          setIsLoadingSessions(true)
          setIsCreating(true)

          // Create chat session with the document
          const newSession = await chatSessionService.create({
            sessionTitle: 'Đoạn chat mới',
            documentIds: [docId],
          })

          // Fetch updated session list
          const sessions = await chatSessionService.getAll(showArchived)
          const mapped = sessions.map(mapServerSession)
          setConversations(mapped)

          // Build messages map
          const messagesMap: Record<string, Message[]> = {}
          for (const s of sessions) {
            messagesMap[s._id] = mapServerMessages(s.messages, s._id)
          }
          setMessages(prev => ({ ...prev, ...messagesMap }))

          // Set active session
          setActiveConvId(newSession._id)
          await loadSessionDetail(newSession._id)

          // Fetch and attach the document in UI
          try {
            const docDetails = await documentService.getById(docId)
            setAttachedDoc(docDetails)
          } catch (docErr) {
            console.error('Lỗi khi tải chi tiết tài liệu đính kèm:', docErr)
          }
        } catch (err) {
          console.error('Lỗi khi tự động tạo đoạn chat kèm tài liệu:', err)
          fetchSessions()
        } finally {
          setIsCreating(false)
          setIsLoadingSessions(false)
        }
      }

      autoCreateSession()
    }
  }, [location.state, location.pathname, navigate, showArchived, loadSessionDetail, fetchSessions])

  // ─── Fetch user documents for attachment picker ─────────────────────────
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoadingDocs(true)
      const res = await documentService.getMine()
      setUserDocuments(res.data || [])
    } catch (err) {
      console.error('Lỗi khi tải danh sách tài liệu:', err)
    } finally {
      setIsLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleSwitchConversation = useCallback((convId: string) => {
    setActiveConvId(convId)
    loadSessionDetail(convId)
  }, [loadSessionDetail])

  // ─── Send message to backend AI ────────────────────────────────────────
  const handleSendMessage = async () => {
    if ((inputVal.trim() === '' && !attachedDoc) || !activeConvId || isSending) return

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsgId = `msg-${Date.now()}`
    const newUserMessage: Message = {
      id: userMsgId,
      sender: 'user',
      content: inputVal,
      timestamp: time,
      attachedFile: attachedDoc ? attachedDoc.title : undefined,
    }

    // Optimistically add user message to UI
    const currentConvMessages = messages[activeConvId] || []
    const userMessageIndex = currentConvMessages.length
    if (attachedDoc) {
      localStorage.setItem(`chat_attach_${activeConvId}_${userMessageIndex}`, attachedDoc.title)
    }

    setMessages(prev => ({
      ...prev,
      [activeConvId]: [...currentConvMessages, newUserMessage],
    }))

    const messageText = inputVal
    const attachedDocId = attachedDoc?._id
    setInputVal('')
    setAttachedDoc(null)
    setIsSending(true)

    try {
      // Call backend API
      const updatedSession = await chatSessionService.sendMessage(activeConvId, {
        textContent: messageText,
        documentId: attachedDocId,
      })

      // Replace messages with the full updated session from server
      setMessages(prev => ({
        ...prev,
        [activeConvId]: mapServerMessages(updatedSession.messages, activeConvId),
      }))

      // Update conversation list item
      setConversations(prev =>
        prev.map(c =>
          c.id === activeConvId
            ? {
                ...c,
                lastMessage: updatedSession.messages[updatedSession.messages.length - 1]?.textContent?.substring(0, 80) || '',
                timestamp: 'Vừa xong',
              }
            : c
        )
      )
    } catch (err: any) {
      console.error('Lỗi khi gửi tin nhắn:', err)
      // Show error as AI message
      const errorMsg: Message = {
        id: `msg-err-${Date.now()}`,
        sender: 'ai',
        content: `⚠️ Không thể gửi tin nhắn: ${err.message || 'Lỗi kết nối'}. Vui lòng thử lại.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => ({
        ...prev,
        [activeConvId]: [...(prev[activeConvId] || []), errorMsg],
      }))
    } finally {
      setIsSending(false)
    }
  }

  // ─── Create new conversation ───────────────────────────────────────────
  const handleNewConversation = async () => {
    if (isCreating) return
    setIsCreating(true)

    try {
      const newSession = await chatSessionService.create({
        sessionTitle: 'Đoạn chat mới',
        documentIds: [],
      })

      const newConv = mapServerSession(newSession)
      setConversations(prev => [newConv, ...prev])
      setActiveConvId(newSession._id)
      setMessages(prev => ({
        ...prev,
        [newSession._id]: mapServerMessages(newSession.messages, newSession._id),
      }))
      setIsMobileSidebarOpen(false)
    } catch (err) {
      console.error('Lỗi khi tạo đoạn chat mới:', err)
    } finally {
      setIsCreating(false)
    }
  }

  // ─── Save Rename ───────────────────────────────────────────────────────
  const handleSaveRename = async (convId: string) => {
    if (editTitleVal.trim() === '') {
      setEditingConvId(null)
      return
    }

    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, title: editTitleVal } : c)
    )
    setEditingConvId(null)

    try {
      await chatSessionService.rename(convId, editTitleVal)
    } catch (err) {
      console.error('Lỗi khi đổi tên đoạn chat:', err)
      fetchSessions()
    }
  }

  // ─── Toggle Pin ────────────────────────────────────────────────────────
  const handleTogglePin = async (convId: string, currentPinStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    const nextPinStatus = !currentPinStatus

    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, isPinned: nextPinStatus } : c)
    )

    try {
      await chatSessionService.pin(convId, nextPinStatus)
    } catch (err) {
      console.error('Lỗi khi ghim đoạn chat:', err)
      fetchSessions()
    }
  }

  // ─── Archive/Unarchive Conversation ──────────────────────────────────────────────
  const handleArchiveConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    setConversations(prev => prev.filter(c => c.id !== convId))

    try {
      const nextArchiveStatus = !showArchived
      await chatSessionService.archive(convId, nextArchiveStatus)
      
      if (activeConvId === convId) {
        const remaining = conversations.filter(c => c.id !== convId)
        if (remaining.length > 0) {
          setActiveConvId(remaining[0].id)
          loadSessionDetail(remaining[0].id)
        } else {
          setActiveConvId(null)
        }
      }
    } catch (err) {
      console.error('Lỗi khi lưu trữ/hủy lưu trữ đoạn chat:', err)
      fetchSessions()
    }
  }

  // ─── Delete conversation ───────────────────────────────────────────────
  const handleDeleteConversation = async (convId: string) => {
    try {
      await chatSessionService.delete(convId)
      const updated = conversations.filter(c => c.id !== convId)
      setConversations(updated)

      // Remove messages for this conversation
      setMessages(prev => {
        const next = { ...prev }
        delete next[convId]
        return next
      })

      if (activeConvId === convId && updated.length > 0) {
        setActiveConvId(updated[0].id)
        loadSessionDetail(updated[0].id)
      } else if (updated.length === 0) {
        setActiveConvId(null)
      }
    } catch (err) {
      console.error('Lỗi khi xóa đoạn chat:', err)
    }
  }

  const activeMessages = activeConvId ? (messages[activeConvId] || []) : []
  const activeConversation = conversations.find(c => c.id === activeConvId)

  const pinnedConversations = conversations.filter(c => c.isPinned && (showArchived ? c.isArchived : !c.isArchived))
  const recentConversations = conversations.filter(c => !c.isPinned && (showArchived ? c.isArchived : !c.isArchived))

  // Helper component to render lists
  const renderConversationItem = (conv: Conversation, isMobile: boolean = false) => {
    const isActive = conv.id === activeConvId
    return (
      <ConversationItem
        key={conv.id}
        conv={conv}
        isActive={isActive}
        editingConvId={editingConvId}
        editTitleVal={editTitleVal}
        showArchived={showArchived}
        isMobile={isMobile}
        onSwitch={handleSwitchConversation}
        onSaveRename={handleSaveRename}
        onTogglePin={handleTogglePin}
        onArchive={handleArchiveConversation}
        onDeleteClick={setDeleteConfirmId}
        setEditingConvId={setEditingConvId}
        setEditTitleVal={setEditTitleVal}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
    )
  }

  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 mb-4">
        <Sparkles className="h-8 w-8" />
      </div>
      <h3 className="text-sm font-bold text-slate-700 mb-1">Chào mừng bạn đến Trợ lý AI Nexus</h3>
      <p className="text-xs text-slate-400 max-w-xs">
        Bắt đầu cuộc hội thoại mới để được hỗ trợ ôn tập, phân tích tài liệu học tập hoặc trả lời câu hỏi bằng AI.
      </p>
      <Button
        onClick={handleNewConversation}
        disabled={isCreating}
        className="mt-4 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl h-10 text-xs font-bold gap-2 shadow-sm"
      >
        {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Bắt đầu chat mới
      </Button>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#F8FAFC] overflow-hidden">
      
      {/* ─── DESKTOP SIDEBAR (Lịch sử chat) ─────────────────────────────────── */}
      <div className="hidden md:flex flex-col w-72 shrink-0 border-r border-slate-100 bg-white h-full p-4 justify-between">
        <div className="flex flex-col gap-4 overflow-hidden">
          
          <Button
            onClick={handleNewConversation}
            disabled={isCreating}
            className="w-full bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl h-10 text-xs font-bold gap-2 shadow-sm shrink-0"
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Đoạn chat mới
          </Button>

          <div className="flex rounded-xl bg-slate-100 p-1 shrink-0">
            <button
              onClick={() => setShowArchived(false)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-all text-center",
                !showArchived
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Hội thoại
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-all text-center",
                showArchived
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Đã lưu trữ
            </button>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto pr-1">
            {isLoadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-[10px] text-slate-400 px-2 py-4 text-center">Chưa có cuộc hội thoại nào</p>
            ) : (
              <div className="flex flex-col gap-4">
                {/* ─── Pinned Conversations ─── */}
                {pinnedConversations.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">Được ghim</span>
                    {pinnedConversations.map(conv => renderConversationItem(conv, false))}
                  </div>
                )}

                {/* ─── Recent Conversations ─── */}
                {recentConversations.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">Hội thoại gần đây</span>
                    {recentConversations.map(conv => renderConversationItem(conv, false))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── MOBILE DRAWER SIDEBAR ────────────────────────────────────────── */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="w-72 p-4 flex flex-col justify-between bg-white border-r border-slate-100 [&>button]:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Lịch sử trò chuyện</SheetTitle>
            <SheetDescription>Hiển thị các cuộc trò chuyện trước đó.</SheetDescription>
          </SheetHeader>
          
          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Hội thoại AI</span>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <Button
              onClick={handleNewConversation}
              disabled={isCreating}
              className="w-full bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl h-10 text-xs font-bold gap-2 shadow-sm shrink-0"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Đoạn chat mới
            </Button>

            <div className="flex rounded-xl bg-slate-100 p-1 shrink-0">
              <button
                onClick={() => setShowArchived(false)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-all text-center",
                  !showArchived
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Hội thoại
              </button>
              <button
                onClick={() => setShowArchived(true)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-all text-center",
                  showArchived
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Đã lưu trữ
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-1">
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-[10px] text-slate-400 px-2 py-4 text-center">Chưa có cuộc hội thoại nào</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* ─── Pinned Conversations ─── */}
                  {pinnedConversations.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">Được ghim</span>
                      {pinnedConversations.map(conv => renderConversationItem(conv, true))}
                    </div>
                  )}

                  {/* ─── Recent Conversations ─── */}
                  {recentConversations.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">Hội thoại gần đây</span>
                      {recentConversations.map(conv => renderConversationItem(conv, true))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-50 pt-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nexus AI Premium</span>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── MAIN CHAT AREA (Khung chat chính) ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] h-full relative">
        
        {/* Chat Header */}
        <div className="flex h-14 border-b border-slate-100/80 bg-white items-center px-4 md:px-6 justify-between shrink-0 shadow-sm shadow-slate-100/20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-200/60 text-slate-500 hover:bg-slate-50 shrink-0"
              aria-label="Mở lịch sử chat"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-black text-slate-800 truncate leading-none">
                Trợ lý AI · {activeConversation?.title || 'Đoạn chat'}
              </h2>
              <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sẵn sàng phân tích Nexus
              </span>
            </div>
          </div>

          {/* Active document attachment badge */}
          {attachedDoc && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-100/60 px-2.5 py-1 text-[9px] font-bold text-indigo-600 max-w-[200px] truncate shadow-xs">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">{attachedDoc.title}</span>
            </div>
          )}
        </div>

        {/* Chat Feed Messages Area */}
        {!activeConvId ? (
          renderEmptyState()
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 flex flex-col">
            <AnimatePresence initial={false}>
              {activeMessages.map((msg) => (
                <MessageItem key={msg.id} msg={msg} />
              ))}

              {/* AI typing indicator */}
              {isSending && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-3 max-w-[85%] md:max-w-[75%] self-start"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl shrink-0 shadow-sm border bg-white text-indigo-600 border-indigo-50">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 shadow-md shadow-slate-100/40 text-xs bg-white text-slate-800 border border-slate-100 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                    <span className="text-slate-400 font-medium">AI đang phân tích và trả lời...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* ─── BOTTOM INPUT BAR AREA ─────────────────────────────────────────── */}
        {activeConvId && (
          <div className="p-4 md:p-6 bg-white border-t border-slate-100 shrink-0 flex flex-col gap-3 shadow-2xl shadow-slate-100/50">
            
            {/* Attachment Picker Overlay */}
            <AttachmentPicker
              isOpen={isAttachmentOpen}
              onClose={() => setIsAttachmentOpen(false)}
              isLoadingDocs={isLoadingDocs}
              userDocuments={userDocuments}
              attachedDoc={attachedDoc}
              onSelectDoc={setAttachedDoc}
            />

            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-2 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100/50 transition-all">
              
              {/* Attached file chip display above text input */}
              {attachedDoc && (
                <div className="flex flex-wrap gap-1 px-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-100/60 px-2.5 py-0.5 text-[9px] font-bold text-indigo-600 shadow-xs">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span>Áp dụng học liệu: {attachedDoc.title}</span>
                    <button
                      onClick={() => setAttachedDoc(null)}
                      className="rounded-full p-0.5 hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                </div>
              )}

              <div className="flex items-end gap-2">
                <button
                  onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border shrink-0 transition-all",
                    attachedDoc
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                      : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  )}
                  title="Đính kèm tài liệu học tập"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                <textarea
                  ref={textareaRef}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  rows={1}
                  disabled={isSending}
                  placeholder={attachedDoc ? `Hỏi AI dựa trên tài liệu: "${attachedDoc.title}"...` : "Hỏi trợ lý AI Nexus..."}
                  className="flex-1 max-h-36 min-h-[36px] bg-transparent border-0 px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none resize-none leading-relaxed disabled:opacity-50"
                />

                <button
                  onClick={handleSendMessage}
                  disabled={(inputVal.trim() === '' && !attachedDoc) || isSending}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 shadow-sm transition-all shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa cuộc hội thoại?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn cuộc hội thoại và toàn bộ lịch sử tin nhắn. Bạn có chắc chắn muốn tiếp tục?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  handleDeleteConversation(deleteConfirmId)
                  setDeleteConfirmId(null)
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Xóa cuộc hội thoại
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Sparkles,
  Send,
  X,
  Loader2,
  User,
  FileText,
  CheckCircle2,
  Copy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { documentService } from '@/services/documentService'
import type { ChatMessageFromServer } from '@/services/chatSessionService'

// ─── Local UI types ─────────────────────────────────────────────────────────
interface Message {
  id: string
  sender: 'user' | 'ai'
  content: string
  timestamp: string
  citations?: string[]
}

interface AiChatBoxProps {
  docId: string
  docTitle: string
  isOpen: boolean
  onClose: () => void
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function mapServerMessages(serverMessages: ChatMessageFromServer[]): Message[] {
  return serverMessages.map((msg, idx) => ({
    id: `msg-${idx}-${new Date(msg.createdAt).getTime()}`,
    sender: msg.sender as 'user' | 'ai',
    content: msg.textContent,
    timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    citations: msg.citations,
  }))
}

// ─── CodeBlock (reused from AiChatPage) ─────────────────────────────────────
function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="my-2 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50 font-mono text-[10px] leading-relaxed">
      <div className="flex justify-between items-center bg-slate-100 border-b border-slate-200 px-3 py-1.5 text-slate-500 font-bold uppercase tracking-widest text-[8px]">
        <span>{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-slate-700 bg-slate-50/50">
        <code>{value}</code>
      </pre>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AiChatBox({ docId, docTitle, isOpen, onClose }: AiChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [isSending, setIsSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputVal])

  // ─── Fetch conversation when opened ────────────────────────────────────────
  const fetchConversation = useCallback(async () => {
    if (!docId) return
    setIsLoading(true)
    try {
      const conversation = await documentService.getConversation(docId)
      if (conversation && conversation.messages) {
        setMessages(mapServerMessages(conversation.messages))
      } else {
        setMessages([])
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử chat:', err)
    } finally {
      setIsLoading(false)
    }
  }, [docId])

  useEffect(() => {
    if (isOpen) {
      setMessages([])
      fetchConversation()
    }
  }, [isOpen, fetchConversation])

  // ─── Send message ─────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (inputVal.trim() === '' || isSending) return

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: inputVal,
      timestamp: time,
    }

    setMessages((prev) => [...prev, userMsg])
    const messageText = inputVal
    setInputVal('')
    setIsSending(true)

    try {
      const updatedConversation = await documentService.sendMessageConversation(docId, messageText)
      if (updatedConversation && updatedConversation.messages) {
        setMessages(mapServerMessages(updatedConversation.messages))
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `msg-err-${Date.now()}`,
        sender: 'ai',
        content: `⚠️ Không thể gửi tin nhắn: ${err.message || 'Lỗi kết nối'}. Vui lòng thử lại.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 right-0 bottom-0 z-[110] w-full sm:w-[400px] flex flex-col bg-white border-l border-slate-200 shadow-2xl shadow-slate-900/10"
        >
          {/* ─── Header ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black truncate leading-none">
                  Trợ lý AI tài liệu
                </h3>
                <p className="text-[9px] text-white/70 truncate mt-0.5 font-medium">
                  {docTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* ─── Content Area ─────────────────────────────────────────── */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 bg-white">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <p className="text-[11px] text-slate-400 font-medium">Đang tải cuộc trò chuyện...</p>
            </div>
          ) : (
            /* ─── CHAT VIEW ────────────────────────────────────────── */
            <>
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 flex flex-col">
                {messages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Bắt đầu hỏi AI</p>
                    <p className="text-[10px] text-slate-400 max-w-[220px]">
                      Hỏi bất kì điều gì về tài liệu "{docTitle}" và AI sẽ phân tích trả lời.
                    </p>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {messages.map((msg) => {
                    const isAi = msg.sender === 'ai'
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className={cn(
                          'flex gap-2.5 max-w-[90%]',
                          isAi ? 'self-start' : 'self-end flex-row-reverse'
                        )}
                      >
                        {/* Avatar */}
                        <div
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-lg shrink-0 shadow-sm border',
                            isAi
                              ? 'bg-white text-indigo-600 border-indigo-50'
                              : 'bg-slate-900 text-white border-slate-950'
                          )}
                        >
                          {isAi ? (
                            <Sparkles className="h-3.5 w-3.5" />
                          ) : (
                            <User className="h-3.5 w-3.5" />
                          )}
                        </div>

                        {/* Bubble */}
                        <div className="flex flex-col gap-1">
                          <div
                            className={cn(
                              'rounded-2xl px-3.5 py-2.5 shadow-sm text-xs leading-relaxed overflow-hidden',
                              isAi
                                ? 'bg-white text-slate-800 border border-slate-100'
                                : 'bg-slate-900 text-white'
                            )}
                          >
                            {isAi ? (
                              <div className="prose prose-slate prose-xs max-w-none text-slate-700">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    code({
                                      inline,
                                      className,
                                      children,
                                      ...props
                                    }: any) {
                                      const match = /language-(\w+)/.exec(className || '')
                                      return !inline && match ? (
                                        <CodeBlock
                                          language={match[1]}
                                          value={String(children).replace(/\n$/, '')}
                                        />
                                      ) : (
                                        <code
                                          className={cn(
                                            'bg-slate-100 text-indigo-600 px-1 py-0.5 rounded font-mono text-[10px]',
                                            className
                                          )}
                                          {...props}
                                        >
                                          {children}
                                        </code>
                                      )
                                    },
                                    li({ children }) {
                                      return (
                                        <li className="list-disc list-inside ml-2 my-0.5">
                                          {children}
                                        </li>
                                      )
                                    },
                                  }}
                                >
                                  {msg.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            )}
                          </div>

                          {/* Citations */}
                          {isAi && msg.citations && msg.citations.length > 0 && (
                            <div className="flex flex-wrap gap-1 px-1">
                              {msg.citations.map((cite, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 text-[8px] font-bold text-indigo-500"
                                >
                                  <FileText className="h-2.5 w-2.5" />
                                  {cite}
                                </span>
                              ))}
                            </div>
                          )}

                          <span
                            className={cn(
                              'text-[9px] text-slate-400 font-medium px-1',
                              isAi ? 'text-left' : 'text-right'
                            )}
                          >
                            {msg.timestamp}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}

                  {/* Typing indicator */}
                  {isSending && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex gap-2.5 max-w-[90%] self-start"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0 shadow-sm border bg-white text-indigo-600 border-indigo-50">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div className="rounded-2xl px-3.5 py-2.5 shadow-sm text-xs bg-white border border-slate-100 flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                        <span className="text-slate-400 font-medium">AI đang phân tích...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* ─── Input Bar ─────────────────────────────────────── */}
              <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/50 p-2 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100/50 transition-all">
                  <div className="flex items-end gap-2">
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
                      placeholder={`Hỏi AI về "${docTitle.length > 20 ? docTitle.substring(0, 20) + '...' : docTitle}"...`}
                      className="flex-1 max-h-28 min-h-[36px] bg-transparent border-0 px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none resize-none leading-relaxed disabled:opacity-50"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={inputVal.trim() === '' || isSending}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 shadow-sm transition-all shrink-0"
                    >
                      {isSending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 text-center mt-1.5 font-medium">
                  AI có thể mắc sai sót. Hãy kiểm tra thông tin quan trọng.
                </p>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

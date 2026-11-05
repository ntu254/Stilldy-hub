import { motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, User, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import CodeBlock from './CodeBlock'
import type { Message } from '../types'

interface MessageItemProps {
  msg: Message
}

export default function MessageItem({ msg }: MessageItemProps) {
  const isAi = msg.sender === 'ai'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex gap-3 max-w-[85%] md:max-w-[75%]",
        isAi ? "self-start" : "self-end flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "flex h-8 w-8 items-center justify-center rounded-xl shrink-0 shadow-sm border",
        isAi 
          ? "bg-white text-indigo-600 border-indigo-50" 
          : "bg-slate-900 text-white border-slate-950"
      )}>
        {isAi ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      {/* Message bubble */}
      <div className="flex flex-col gap-1">
        <div className={cn(
          "rounded-2xl px-4 py-3 shadow-md shadow-slate-100/40 text-xs leading-relaxed overflow-hidden",
          isAi
            ? "bg-white text-slate-800 border border-slate-100"
            : "bg-[#0F172A] text-white"
        )}>
          
          {/* Attached file indicator in bubble */}
          {msg.attachedFile && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-bold text-indigo-200">
              <FileText className="h-3 w-3 shrink-0" />
              <span>Học liệu: {msg.attachedFile}</span>
            </div>
          )}

          {/* Content rendering */}
          {isAi ? (
            <div className="prose prose-slate prose-xs max-w-none text-slate-700">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Code block customization
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                    ) : (
                      <code className={cn("bg-slate-100 text-indigo-600 px-1 py-0.5 rounded font-mono text-[10px]", className)} {...props}>
                        {children}
                      </code>
                    )
                  },
                  table({ children }) {
                    return (
                      <div className="border border-slate-100 rounded-xl overflow-hidden my-3 shadow-xs">
                        <table className="min-w-full divide-y divide-slate-150 text-[10px]">
                          {children}
                        </table>
                      </div>
                    )
                  },
                  th({ children }) {
                    return <th className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider px-3 py-2 text-left border-r border-slate-150">{children}</th>
                  },
                  td({ children }) {
                    return <td className="px-3 py-2 border-r border-slate-150 font-semibold">{children}</td>
                  },
                  li({ children }) {
                    return <li className="list-disc list-inside ml-2 my-0.5">{children}</li>
                  }
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
              <span key={i} className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 text-[8px] font-bold text-indigo-500">
                <FileText className="h-2.5 w-2.5" />
                {cite}
              </span>
            ))}
          </div>
        )}
        
        {/* Timestamp */}
        <span className={cn(
          "text-[9px] text-slate-400 font-bold px-1",
          isAi ? "text-left" : "text-right"
        )}>
          {msg.timestamp}
        </span>
      </div>
    </motion.div>
  )
}

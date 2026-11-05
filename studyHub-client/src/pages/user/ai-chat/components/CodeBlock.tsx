import { useState } from 'react'
import { CheckCircle2, Copy } from 'lucide-react'

interface CodeBlockProps {
  language: string
  value: string
}

export default function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50 font-mono text-[10px] leading-relaxed">
      <div className="flex justify-between items-center bg-slate-100 border-b border-slate-200 px-4 py-2 text-slate-500 font-bold shrink-0 uppercase tracking-widest text-[8px]">
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
      <pre className="p-4 overflow-x-auto text-slate-700 bg-slate-50/50">
        <code>{value}</code>
      </pre>
    </div>
  )
}

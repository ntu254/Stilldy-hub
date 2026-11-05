import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface FeaturesEditorProps {
  features: string[]
  onChange: (features: string[]) => void
}

export default function FeaturesEditor({ features, onChange }: FeaturesEditorProps) {
  const [inputValue, setInputValue] = useState('')

  const handleAddFeature = (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) => {
    if ('key' in e && e.key !== 'Enter') return
    
    e.preventDefault()
    const val = inputValue.trim()
    if (val && !features.includes(val)) {
      onChange([...features, val])
      setInputValue('')
    }
  }

  const handleRemoveFeature = (indexToRemove: number) => {
    onChange(features.filter((_, index) => index !== indexToRemove))
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleAddFeature}
          placeholder="Nhập tính năng (VD: Upload 2GB)"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={handleAddFeature}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Thêm
        </button>
      </div>

      <div className="space-y-2">
        {features.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Chưa có tính năng nào được thêm.</p>
        ) : (
          features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 group"
            >
              <span className="text-sm text-slate-700">{feature}</span>
              <button
                type="button"
                onClick={() => handleRemoveFeature(index)}
                className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Xóa tính năng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

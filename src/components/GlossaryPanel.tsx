import { useState, useEffect } from 'react'

interface GlossaryItem {
  term: string       // 中文名詞
  termEn: string     // 英文名詞
  description: string
  formula?: string   // 選填：計算公式
}

interface GlossaryPanelProps {
  pageKey: string        // 用來區分不同頁面的 localStorage key
  items: GlossaryItem[]
}

export default function GlossaryPanel({ pageKey, items }: GlossaryPanelProps) {
  const storageKey = `glossary-open-${pageKey}`

  // 從 localStorage 讀取上次的展開狀態，預設展開
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    return saved !== null ? saved === 'true' : true
  })

  // 每次切換時寫入 localStorage，下次進頁面會記住
  useEffect(() => {
    localStorage.setItem(storageKey, String(isOpen))
  }, [isOpen, storageKey])

  return (
    <div className="border border-gray-200 rounded-lg bg-white mt-6">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
      >
        <span>📖 名詞說明</span>
        <span className="text-gray-400">{isOpen ? '收合 ▲' : '展開 ▼'}</span>
      </button>
      {isOpen && (
        <div className="border-t border-gray-200 divide-y divide-gray-100">
          {items.map(item => (
            <div key={item.term} className="px-4 py-3">
              <div className="font-medium text-gray-800 text-sm">
                {item.term} <span className="text-gray-400 font-normal">{item.termEn}</span>
              </div>
              <div className="text-gray-600 text-sm mt-1">{item.description}</div>
              {item.formula && (
                <div className="text-gray-500 text-xs mt-1 font-mono bg-gray-50 px-2 py-1 rounded">
                  {item.formula}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

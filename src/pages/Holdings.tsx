import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions } from '../hooks/useTransactions'
import { calculateHoldings } from '../lib/calculations'
import { formatCurrency, formatDate } from '../lib/format'
import GlossaryPanel from '../components/GlossaryPanel'

const glossaryItems = [
  { term: '平均成本', termEn: 'Average Cost', description: '持有期間所有買入成本的加權平均（含手續費）', formula: '總買入成本 ÷ 持有股數' },
  { term: '持股總成本', termEn: 'Total Cost', description: '持有股數 × 平均成本', formula: '持有股數 × 平均成本' },
  { term: '最近買入價', termEn: 'Last Buy Price', description: '最後一次買入的實際成交價，不含手續費' },
  { term: '目標價', termEn: 'Target Price', description: '你手動設定的觀察低點或理想買入價，不影響任何計算' },
]

export default function Holdings() {
  const { transactions, targetPrices, loading, upsertTargetPrice } = useTransactions()
  const navigate = useNavigate()
  const [editTarget, setEditTarget] = useState<{ symbol: string; value: string } | null>(null)
  const holdings = calculateHoldings(transactions, targetPrices)

  if (loading) return <div className="p-4">載入中...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Holdings</h1>

      {editTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold mb-4">編輯目標價 - {editTarget.symbol}</h2>
            <input type="number" min="0" step="any" value={editTarget.value}
              onChange={e => setEditTarget(prev => prev ? { ...prev, value: e.target.value } : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="留空表示清除" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditTarget(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">取消</button>
              <button
                onClick={async () => {
                  await upsertTargetPrice(editTarget.symbol, editTarget.value ? parseFloat(editTarget.value) : null)
                  setEditTarget(null)
                }}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm">儲存</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {holdings.map(h => (
          <div key={h.symbol}
            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300"
            onClick={() => navigate(`/holdings/${h.symbol}`)}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="font-bold">{h.symbol}</span>
                <span className="text-xs text-gray-400 ml-2">{h.asset_type}</span>
              </div>
              <span className="text-sm text-gray-500">{h.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mb-3">
              <div><div className="text-xs text-gray-400">持有</div><div className="font-medium">{h.quantity} 股</div></div>
              <div><div className="text-xs text-gray-400">均價</div><div className="font-medium">{formatCurrency(h.average_cost)}</div></div>
              <div><div className="text-xs text-gray-400">成本</div><div className="font-medium">{formatCurrency(h.total_cost)}</div></div>
            </div>
            <div className="border-t border-gray-100 pt-2 space-y-1 text-xs text-gray-500">
              <div>最近買入：{formatCurrency(h.last_buy_price ?? 0)} · {h.last_buy_date ? formatDate(h.last_buy_date) : '--'}</div>
              <div className="flex items-center gap-2">
                目標價：{h.target_price ? formatCurrency(h.target_price) : '--'}
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setEditTarget({ symbol: h.symbol, value: h.target_price?.toString() ?? '' })
                  }}
                  className="text-blue-400 hover:text-blue-600">✏️</button>
              </div>
            </div>
          </div>
        ))}
        {holdings.length === 0 && (
          <p className="text-center text-gray-400 py-8">尚無持股，請先在 Transactions 新增買入紀錄</p>
        )}
      </div>

      <GlossaryPanel pageKey="holdings" items={glossaryItems} />
    </div>
  )
}

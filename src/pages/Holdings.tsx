import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions } from '../hooks/useTransactions'
import { useStockPrices } from '../hooks/useStockPrices'
import { calculateHoldings } from '../lib/calculations'
import { formatCurrency, formatDate, formatPercent, plColorClass } from '../lib/format'
import GlossaryPanel from '../components/GlossaryPanel'

const glossaryItems = [
  { term: '平均成本', termEn: 'Average Cost', description: '持有期間所有買入成本的加權平均（含手續費）', formula: '總買入成本 ÷ 持有股數' },
  { term: '持股總成本', termEn: 'Total Cost', description: '持有股數 × 平均成本', formula: '持有股數 × 平均成本' },
  { term: '最近買入價', termEn: 'Last Buy Price', description: '最後一次買入的實際成交價，不含手續費' },
  { term: '目標價', termEn: 'Target Price', description: '你手動設定的觀察低點或理想買入價，不影響任何計算' },
  { term: '未實現損益', termEn: 'Unrealized P/L', description: '以現價計算的浮動損益', formula: '(現價 − 均價) × 持有股數' },
  { term: '未實現報酬率', termEn: 'Unrealized Return', description: '未實現損益 ÷ 持股總成本', formula: '未實現損益 ÷ 持股總成本 × 100%' },
]

export default function Holdings() {
  const { transactions, targetPrices, loading, upsertTargetPrice } = useTransactions()
  const navigate = useNavigate()
  const [editTarget, setEditTarget] = useState<{ symbol: string; value: string } | null>(null)
  const holdings = calculateHoldings(transactions, targetPrices)
  const symbols = holdings.map(h => h.symbol)
  const { prices, loading: pricesLoading, refresh } = useStockPrices(symbols)

  // Summary calculations
  let totalMarketValue = 0
  let totalUnrealizedPL = 0
  let hasAnyPrice = false
  for (const h of holdings) {
    const q = prices.get(h.symbol)
    if (q) {
      hasAnyPrice = true
      totalMarketValue += q.currentPrice * h.quantity
      totalUnrealizedPL += (q.currentPrice - h.average_cost) * h.quantity
    }
  }

  if (loading) return <div className="p-4">載入中...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Holdings</h1>
        <button
          onClick={refresh}
          disabled={pricesLoading}
          className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded-lg disabled:opacity-50">
          {pricesLoading ? '更新中...' : '更新現價'}
        </button>
      </div>

      {hasAnyPrice && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-xs text-gray-400">總市值</div>
            <div className="font-bold">{formatCurrency(totalMarketValue)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-xs text-gray-400">未實現損益</div>
            <div className={`font-bold ${plColorClass(totalUnrealizedPL)}`}>{formatCurrency(totalUnrealizedPL)}</div>
          </div>
        </div>
      )}

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
        {holdings.map(h => {
          const q = prices.get(h.symbol)
          const unrealizedPL = q ? (q.currentPrice - h.average_cost) * h.quantity : null
          const unrealizedReturn = unrealizedPL !== null && h.total_cost > 0
            ? unrealizedPL / h.total_cost * 100
            : null

          return (
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
              <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                <div><div className="text-xs text-gray-400">持有</div><div className="font-medium">{h.quantity} 股</div></div>
                <div><div className="text-xs text-gray-400">均價</div><div className="font-medium">{formatCurrency(h.average_cost)}</div></div>
                <div><div className="text-xs text-gray-400">成本</div><div className="font-medium">{formatCurrency(h.total_cost)}</div></div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                <div>
                  <div className="text-xs text-gray-400">現價</div>
                  <div className="font-medium">{q ? formatCurrency(q.currentPrice) : '--'}</div>
                  {q && <div className={`text-xs ${plColorClass(q.changePercent)}`}>{q.changePercent >= 0 ? '+' : ''}{q.changePercent.toFixed(2)}%</div>}
                </div>
                <div>
                  <div className="text-xs text-gray-400">未實現損益</div>
                  <div className={`font-medium ${unrealizedPL !== null ? plColorClass(unrealizedPL) : ''}`}>
                    {unrealizedPL !== null ? formatCurrency(unrealizedPL) : '--'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">未實現報酬</div>
                  <div className={`font-medium ${unrealizedReturn !== null ? plColorClass(unrealizedReturn) : ''}`}>
                    {unrealizedReturn !== null ? formatPercent(unrealizedReturn) : '--'}
                  </div>
                </div>
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
          )
        })}
        {holdings.length === 0 && (
          <p className="text-center text-gray-400 py-8">尚無持股，請先在 Transactions 新增買入紀錄</p>
        )}
      </div>

      <GlossaryPanel pageKey="holdings" items={glossaryItems} />
    </div>
  )
}

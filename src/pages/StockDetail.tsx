import { useParams, useNavigate } from 'react-router-dom'
import { useTransactions } from '../hooks/useTransactions'
import { calculateHoldings, calculateRealizedPL } from '../lib/calculations'
import { formatCurrency, formatPercent, formatDate, plColorClass } from '../lib/format'
import GlossaryPanel from '../components/GlossaryPanel'

const glossaryItems = [
  { term: '平均成本', termEn: 'Average Cost', description: '此標的目前持有的加權平均買入成本' },
  { term: '已實現損益', termEn: 'Realized P/L', description: '此標的所有賣出紀錄的損益加總' },
]

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>()
  const navigate = useNavigate()
  const { transactions, targetPrices, loading } = useTransactions()

  if (loading) return <div className="p-4">載入中...</div>
  if (!symbol) return null

  const symbolTxs = transactions.filter(tx => tx.symbol === symbol)
  const holding = calculateHoldings(symbolTxs, targetPrices)[0] ?? null
  const realizedPLs = calculateRealizedPL(symbolTxs)
  const totalRealizedPL = realizedPLs.reduce((s, r) => s + r.realized_pl, 0)
  const totalCostBasis = realizedPLs.reduce((s, r) => s + r.cost_basis, 0)

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <button onClick={() => navigate('/holdings')} className="text-blue-500 text-sm mb-4 flex items-center gap-1">
        ← 返回 Holdings
      </button>
      <h1 className="text-xl font-bold mb-4">{symbol}</h1>

      {holding ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="text-sm text-gray-500 mb-3">{holding.name} · {holding.asset_type}</div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><div className="text-xs text-gray-400">持有</div><div className="font-medium">{holding.quantity} 股</div></div>
            <div><div className="text-xs text-gray-400">均價</div><div className="font-medium">{formatCurrency(holding.average_cost)}</div></div>
            <div><div className="text-xs text-gray-400">成本</div><div className="font-medium">{formatCurrency(holding.total_cost)}</div></div>
          </div>
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <div>最近買入：{formatCurrency(holding.last_buy_price ?? 0)} · {holding.last_buy_date ? formatDate(holding.last_buy_date) : '--'}</div>
            <div>目標價：{holding.target_price ? formatCurrency(holding.target_price) : '--'}</div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-sm text-gray-500">目前無持股</div>
      )}

      {realizedPLs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">已實現損益摘要</div>
          <div className={`text-lg font-bold ${plColorClass(totalRealizedPL)}`}>{formatCurrency(totalRealizedPL)}</div>
          {totalCostBasis > 0 && (
            <div className={`text-sm ${plColorClass(totalRealizedPL / totalCostBasis * 100)}`}>
              {formatPercent(totalRealizedPL / totalCostBasis * 100)}
            </div>
          )}
        </div>
      )}

      <h2 className="font-medium text-gray-700 mb-3">交易明細</h2>
      <div className="space-y-2">
        {[...symbolTxs]
          .sort((a, b) => b.trade_date.localeCompare(a.trade_date))
          .map(tx => (
            <div key={tx.id} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded ${tx.transaction_type === 'Buy' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {tx.transaction_type === 'Buy' ? '買入' : '賣出'}
                  </span>
                  <div className="text-sm mt-1">{tx.quantity} 股 × {formatCurrency(tx.price)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">{formatDate(tx.trade_date)}</div>
                  <div className="text-sm font-medium">{formatCurrency(tx.quantity * tx.price)}</div>
                </div>
              </div>
            </div>
          ))}
      </div>

      <GlossaryPanel pageKey={`stock-detail-${symbol}`} items={glossaryItems} />
    </div>
  )
}

import { useTransactions } from '../hooks/useTransactions'
import { calculateDashboard, calculateHoldings } from '../lib/calculations'
import { formatCurrency, formatPercent, plColorClass } from '../lib/format'
import GlossaryPanel from '../components/GlossaryPanel'

const glossaryItems = [
  { term: '總投入成本', termEn: 'Total Invested', description: '所有買入交易的金額加總（含手續費）', formula: 'Σ (買入股數 × 買入價 + 手續費)' },
  { term: '持股成本', termEn: 'Current Holding Cost', description: '目前持有部位的總成本，已賣出部分不計' },
  { term: '已實現損益', termEn: 'Realized P/L', description: '所有賣出交易的損益加總' },
  { term: '已實現報酬率', termEn: 'Realized Return Rate', description: '已實現損益 ÷ 所有已賣出部位的成本基準', formula: '已實現損益 ÷ 已賣出總成本基準 × 100%' },
  { term: '持股占比', termEn: 'Portfolio %', description: '各標的持股成本 ÷ 全部持股總成本', formula: '單一標的成本 ÷ 全部持股總成本 × 100%' },
]

export default function Dashboard() {
  const { transactions, targetPrices, loading } = useTransactions()
  const summary = calculateDashboard(transactions, targetPrices)
  const holdings = calculateHoldings(transactions, targetPrices)

  // 計算各標的持股占比
  const portfolioItems = holdings
    .map(h => ({
      symbol: h.symbol,
      name: h.name,
      percentage: summary.current_holding_cost > 0
        ? (h.total_cost / summary.current_holding_cost) * 100
        : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage)

  if (loading) return <div className="p-4">載入中...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">總投入成本</div>
          <div className="font-bold">{formatCurrency(summary.total_invested)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">持股成本</div>
          <div className="font-bold">{formatCurrency(summary.current_holding_cost)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">已實現損益</div>
          <div className={`font-bold ${plColorClass(summary.realized_pl)}`}>{formatCurrency(summary.realized_pl)}</div>
          <div className={`text-xs ${plColorClass(summary.realized_return_rate)}`}>{formatPercent(summary.realized_return_rate)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">持股檔數</div>
          <div className="font-bold text-xl">{summary.holding_count}</div>
        </div>
      </div>

      {portfolioItems.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-medium text-sm text-gray-700 mb-3">持股占比</h2>
          <div className="space-y-2">
            {portfolioItems.map(item => (
              <div key={item.symbol}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{item.symbol}</span>
                  <span className="text-gray-500">{item.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 rounded-full h-2" style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <GlossaryPanel pageKey="dashboard" items={glossaryItems} />
    </div>
  )
}

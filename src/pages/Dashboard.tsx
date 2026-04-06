import { useMemo } from 'react'
import { PieChart, Pie, Tooltip } from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import { useStockPrices } from '../hooks/useStockPrices'
import { calculateDashboard, calculateHoldings } from '../lib/calculations'
import { formatCurrency, formatPercent, plColorClass } from '../lib/format'
import GlossaryPanel from '../components/GlossaryPanel'

const glossaryItems = [
  { term: '總投入成本', termEn: 'Total Invested', description: '所有買入交易的金額加總（含手續費）', formula: 'Σ (買入股數 × 買入價 + 手續費)' },
  { term: '持股成本', termEn: 'Current Holding Cost', description: '目前持有部位的總成本，已賣出部分不計' },
  { term: '已實現損益', termEn: 'Realized P/L', description: '所有賣出交易的損益加總' },
  { term: '已實現報酬率', termEn: 'Realized Return Rate', description: '已實現損益 ÷ 所有已賣出部位的成本基準', formula: '已實現損益 ÷ 已賣出總成本基準 × 100%' },
  { term: '持股占比（市值）', termEn: 'Portfolio % by Market Value', description: '各標的市值 ÷ 全部持股總市值', formula: '單一標的市值 ÷ 全部持股總市值 × 100%' },
]

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function Dashboard() {
  const { transactions, targetPrices, loading } = useTransactions()
  const summary = calculateDashboard(transactions, targetPrices)
  const holdings = calculateHoldings(transactions, targetPrices)
  const symbols = useMemo(() => holdings.map(h => h.symbol), [holdings])
  const { prices } = useStockPrices(symbols)

  // Market value calculations
  const marketValues = holdings.map(h => {
    const q = prices.get(h.symbol)
    return { symbol: h.symbol, total_cost: h.total_cost, marketValue: q ? q.currentPrice * h.quantity : null }
  })
  const totalMarketValue = marketValues.reduce((s, m) => s + (m.marketValue ?? 0), 0)
  const totalUnrealizedPL = marketValues.reduce((s, m) => {
    if (m.marketValue === null) return s
    return s + (m.marketValue - m.total_cost)
  }, 0)
  const hasMarketData = marketValues.some(m => m.marketValue !== null)

  // Pie chart data (only symbols with price data)
  const pieData = marketValues
    .filter(m => m.marketValue !== null && m.marketValue > 0)
    .map(m => ({ name: m.symbol, value: m.marketValue as number }))
    .sort((a, b) => b.value - a.value)
    .map((item, i) => ({ ...item, fill: PIE_COLORS[i % PIE_COLORS.length] }))

  // Bar chart data (cost-based, same as before)
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
        {hasMarketData && (
          <>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-400">總市值</div>
              <div className="font-bold">{formatCurrency(totalMarketValue)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-400">未實現損益</div>
              <div className={`font-bold ${plColorClass(totalUnrealizedPL)}`}>{formatCurrency(totalUnrealizedPL)}</div>
            </div>
          </>
        )}
      </div>

      {portfolioItems.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
          <h2 className="font-medium text-sm text-gray-700 mb-3">持股占比（成本）</h2>
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

      {pieData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-medium text-sm text-gray-700 mb-3">持股占比（市值）</h2>
          <div className="flex flex-col items-center">
            <PieChart width={280} height={200}>
              <Pie data={pieData} cx={140} cy={100} innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2} />
              <Tooltip formatter={(v) => [formatCurrency(Number(v)), '市值']} />
            </PieChart>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1 text-xs text-gray-600">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.fill }} />
                  {entry.name} {((entry.value / totalMarketValue) * 100).toFixed(1)}%
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <GlossaryPanel pageKey="dashboard" items={glossaryItems} />
    </div>
  )
}

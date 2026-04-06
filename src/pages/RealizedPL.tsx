import { useTransactions } from '../hooks/useTransactions'
import { calculateRealizedPL } from '../lib/calculations'
import { formatCurrency, formatPercent, formatDate, plColorClass } from '../lib/format'
import GlossaryPanel from '../components/GlossaryPanel'

const glossaryItems = [
  { term: '平均成本', termEn: 'Average Cost', description: '賣出當下的加權平均買入成本' },
  { term: '成本基準', termEn: 'Cost Basis', description: '賣出股數 × 賣出當下的平均成本', formula: '賣出股數 × 平均成本' },
  { term: '已實現損益', termEn: 'Realized P/L', description: '賣出淨收入 − 成本基準', formula: '(賣出股數 × 賣出價 − 手續費) − 成本基準' },
  { term: '已實現報酬率', termEn: 'Realized Return', description: '已實現損益 ÷ 成本基準', formula: '已實現損益 ÷ 成本基準 × 100%' },
]

export default function RealizedPL() {
  const { transactions, loading } = useTransactions()
  const records = calculateRealizedPL(transactions)

  const totalProfit = records.filter(r => r.realized_pl > 0).reduce((s, r) => s + r.realized_pl, 0)
  const totalLoss = records.filter(r => r.realized_pl < 0).reduce((s, r) => s + r.realized_pl, 0)
  const netPL = records.reduce((s, r) => s + r.realized_pl, 0)
  const totalCostBasis = records.reduce((s, r) => s + r.cost_basis, 0)
  const avgReturn = totalCostBasis > 0 ? (netPL / totalCostBasis) * 100 : 0

  if (loading) return <div className="p-4">載入中...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Realized P/L</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">總獲利</div>
          <div className="font-bold text-green-600">{formatCurrency(totalProfit)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">總虧損</div>
          <div className="font-bold text-red-500">{formatCurrency(totalLoss)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">淨損益</div>
          <div className={`font-bold ${plColorClass(netPL)}`}>{formatCurrency(netPL)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">平均報酬率</div>
          <div className={`font-bold ${plColorClass(avgReturn)}`}>{formatPercent(avgReturn)}</div>
        </div>
      </div>

      <div className="space-y-3">
        {records.map(r => (
          <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold">{r.symbol}</span>
                <span className="text-xs text-gray-400">{r.asset_type}</span>
              </div>
              <span className="text-xs text-gray-400">{formatDate(r.sell_date)}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>賣出 {r.quantity_sold} 股 × {formatCurrency(r.sell_price)}</div>
              <div>成本基準：{formatCurrency(r.cost_basis)}（均價 {formatCurrency(r.average_cost)}）</div>
              {r.fee > 0 && <div>手續費：{formatCurrency(r.fee)}</div>}
            </div>
            <div className={`mt-2 font-bold ${plColorClass(r.realized_pl)}`}>
              {formatCurrency(r.realized_pl)} ({formatPercent(r.realized_return_rate)})
            </div>
          </div>
        ))}
        {records.length === 0 && <p className="text-center text-gray-400 py-8">尚無已實現損益紀錄</p>}
      </div>

      <GlossaryPanel pageKey="realized-pl" items={glossaryItems} />
    </div>
  )
}

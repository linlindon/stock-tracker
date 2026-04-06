import { useTransactions } from '../hooks/useTransactions'
import { useTradePairs } from '../hooks/useTradePairs'
import { calculateRealizedPL } from '../lib/calculations'
import { calculateTradePairRecords } from '../lib/tradePairCalculations'
import { formatCurrency, formatPercent, formatDate, plColorClass } from '../lib/format'
import GlossaryPanel from '../components/GlossaryPanel'

const glossaryItems = [
  { term: '自選成本基準', termEn: 'Custom Cost Basis', description: '你選擇的買入批次的加權總成本', formula: 'Σ (配對股數 × 買入價)' },
  { term: '自選損益', termEn: 'Custom P/L', description: '賣出淨收入 − 自選成本基準', formula: '賣出淨收入 − 自選成本基準' },
  { term: '自選報酬率', termEn: 'Custom Return', description: '自選損益 ÷ 自選成本基準', formula: '自選損益 ÷ 自選成本基準 × 100%' },
  { term: '均成本損益', termEn: 'Avg Cost P/L', description: '與 Realized P/L 頁面相同的計算，此處供對照用' },
]

export default function TradePairs() {
  const { transactions, loading: txLoading } = useTransactions()
  const { tradePairs, loading: pairsLoading } = useTradePairs()

  const realizedPLs = calculateRealizedPL(transactions)
  const records = calculateTradePairRecords(tradePairs, transactions, realizedPLs)

  const totalCustomPL = records.reduce((s, r) => s + r.custom_pl, 0)
  const totalCustomCostBasis = records.reduce((s, r) => s + r.custom_cost_basis, 0)
  const avgCustomReturn = totalCustomCostBasis > 0 ? (totalCustomPL / totalCustomCostBasis) * 100 : 0

  if (txLoading || pairsLoading) return <div className="p-4">載入中...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">短線配對</h1>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">配對筆數</div>
          <div className="font-bold text-xl">{records.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">自選總損益</div>
          <div className={`font-bold ${plColorClass(totalCustomPL)}`}>{formatCurrency(totalCustomPL)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">平均自選報酬率</div>
          <div className={`font-bold ${plColorClass(avgCustomReturn)}`}>{formatPercent(avgCustomReturn)}</div>
        </div>
      </div>

      <div className="space-y-3">
        {records.map(r => (
          <div key={r.sell_transaction_id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold">{r.symbol}</span>
              <span className="text-xs text-gray-400">{formatDate(r.sell_date)}</span>
            </div>
            <div className="text-sm text-gray-600 mb-3">
              賣出 {r.quantity_sold} 股 × {formatCurrency(r.sell_price)}
            </div>
            <div className="text-xs text-gray-400 mb-1">配對買入</div>
            <div className="space-y-1 mb-3">
              {r.custom_buy_lots.map(lot => (
                <div key={lot.buy_transaction_id} className="text-sm text-gray-600">
                  {formatDate(lot.buy_date)}　{formatCurrency(lot.buy_price)} × {lot.quantity_used} 股
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
              <div>
                <div className="text-xs text-blue-500 font-medium mb-1">自選報酬率</div>
                <div className={`font-bold ${plColorClass(r.custom_pl)}`}>{formatCurrency(r.custom_pl)}</div>
                <div className={`text-sm ${plColorClass(r.custom_return_rate)}`}>{formatPercent(r.custom_return_rate)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium mb-1">均成本對照</div>
                <div className={`font-bold ${plColorClass(r.avg_cost_pl)}`}>{formatCurrency(r.avg_cost_pl)}</div>
                <div className={`text-sm ${plColorClass(r.avg_cost_return_rate)}`}>{formatPercent(r.avg_cost_return_rate)}</div>
              </div>
            </div>
          </div>
        ))}
        {records.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            尚無配對紀錄。在新增賣出交易時，選擇「比較買入」即可建立配對。
          </p>
        )}
      </div>

      <GlossaryPanel pageKey="trade-pairs" items={glossaryItems} />
    </div>
  )
}

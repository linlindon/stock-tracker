import type { DbTransaction, DbTradePair, TradePairSelection } from '../types'
import { getAvailableBuyQuantity } from '../lib/tradePairCalculations'
import { formatCurrency, formatDate } from '../lib/format'

interface Props {
  symbol: string
  sellQuantity: number
  sellPrice: number
  sellFee: number
  buyTransactions: DbTransaction[]
  allTradePairs: DbTradePair[]
  excludeSellId?: string
  selections: TradePairSelection[]
  onChange: (selections: TradePairSelection[]) => void
}

export default function BuyLotSelector({
  symbol, sellQuantity, sellPrice, sellFee,
  buyTransactions, allTradePairs, excludeSellId,
  selections, onChange,
}: Props) {
  const symbolBuys = buyTransactions
    .filter(tx => tx.symbol === symbol && tx.transaction_type === 'Buy')
    .sort((a, b) => b.trade_date.localeCompare(a.trade_date))

  // 目前已選的 buy_transaction_id set
  const selectedIds = new Set(selections.map(s => s.buy_transaction_id))
  // 輸入框的字串值（不一定是有效數字）
  const qtyStringMap = new Map(selections.map(s => [s.buy_transaction_id, s.quantity_used.toString()]))

  const toggleSelect = (buy: DbTransaction) => {
    if (selectedIds.has(buy.id)) {
      onChange(selections.filter(s => s.buy_transaction_id !== buy.id))
    } else {
      // 新增選擇，quantity_used 初始為 0（待使用者填入）
      onChange([...selections, { buy_transaction_id: buy.id, quantity_used: 0 }])
    }
  }

  const setQuantity = (buyId: string, qtyStr: string) => {
    const qty = parseFloat(qtyStr)
    onChange(selections.map(s =>
      s.buy_transaction_id === buyId
        ? { ...s, quantity_used: isNaN(qty) ? 0 : qty }
        : s
    ))
  }

  // 即時預覽計算
  const customCostBasis = selections.reduce((sum, s) => {
    const buy = buyTransactions.find(tx => tx.id === s.buy_transaction_id)
    if (!buy || s.quantity_used <= 0) return sum
    return sum + s.quantity_used * buy.price
  }, 0)

  const sellNet = sellQuantity * sellPrice - sellFee
  const customPL = customCostBasis > 0 ? sellNet - customCostBasis : null

  return (
    <div className="border-t border-gray-200 pt-4 mt-2">
      <p className="text-sm font-medium text-gray-700 mb-1">比較買入（選填）</p>
      <p className="text-xs text-gray-400 mb-3">{symbol} 的歷史買入紀錄</p>

      {symbolBuys.length === 0 && (
        <p className="text-sm text-gray-400">尚無此標的的買入紀錄</p>
      )}

      <div className="space-y-2">
        {symbolBuys.map(buy => {
          const available = getAvailableBuyQuantity(buy.id, buy, allTradePairs, excludeSellId)
          const selected = selectedIds.has(buy.id)
          const qtyValue = qtyStringMap.get(buy.id) ?? ''

          return (
            <div key={buy.id}
              className={`border rounded-lg p-3 ${selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selected}
                  onChange={() => toggleSelect(buy)}
                  disabled={available <= 0 && !selected}
                  className="w-4 h-4" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {formatDate(buy.trade_date)}　{formatCurrency(buy.price)} × {buy.quantity} 股
                  </div>
                  <div className="text-xs text-gray-400">可用：{available} 股</div>
                </div>
                {selected && (
                  <div className="flex items-center gap-1">
                    <input type="number" min="0.001" max={available} step="any"
                      value={qtyValue}
                      onChange={e => setQuantity(buy.id, e.target.value)}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-blue-500"
                      placeholder="0" />
                    <span className="text-xs text-gray-400">股</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {customCostBasis > 0 && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm space-y-1">
          <div className="text-gray-600">自選成本基準：<span className="font-medium">{formatCurrency(customCostBasis)}</span></div>
          {customPL !== null && (
            <div className={customPL >= 0 ? 'text-green-600' : 'text-red-500'}>
              自選損益：<span className="font-medium">{customPL >= 0 ? '+' : ''}{formatCurrency(customPL)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

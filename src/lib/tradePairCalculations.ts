import type { DbTransaction, DbTradePair, RealizedPL, TradePairRecord } from '../types'

/**
 * 計算所有短線配對損益紀錄
 *
 * 每筆賣出交易對應一筆 TradePairRecord，包含：
 * - 自選成本損益：由使用者手動選擇的買入批次計算
 * - 均成本對照：來自 calculateRealizedPL 的結果，用來比較
 */
export function calculateTradePairRecords(
  tradePairs: DbTradePair[],
  transactions: DbTransaction[],
  realizedPLs: RealizedPL[]
): TradePairRecord[] {
  const txMap = new Map(transactions.map(tx => [tx.id, tx]))
  // realizedPL 用 id（= sell transaction id）作為 key
  const realizedPLMap = new Map(realizedPLs.map(r => [r.id, r]))

  // 將 trade_pairs 依 sell_transaction_id 分組
  const pairsBySell = new Map<string, DbTradePair[]>()
  for (const pair of tradePairs) {
    const existing = pairsBySell.get(pair.sell_transaction_id) ?? []
    existing.push(pair)
    pairsBySell.set(pair.sell_transaction_id, existing)
  }

  const records: TradePairRecord[] = []

  for (const [sellId, pairs] of pairsBySell) {
    const sellTx = txMap.get(sellId)
    if (!sellTx) continue

    // 整理每筆配對的買入批次，依買入日期排序
    const custom_buy_lots = pairs
      .map(pair => {
        const buyTx = txMap.get(pair.buy_transaction_id)!
        return {
          buy_transaction_id: pair.buy_transaction_id,
          buy_date: buyTx.trade_date,
          buy_price: buyTx.price,
          quantity_used: pair.quantity_used,
        }
      })
      .sort((a, b) => a.buy_date.localeCompare(b.buy_date))

    // 自選成本基準 = Σ (配對股數 × 買入價格)
    const custom_cost_basis = custom_buy_lots.reduce(
      (sum, lot) => sum + lot.quantity_used * lot.buy_price, 0
    )
    // 賣出淨收入 = 賣出金額 - 手續費
    const sell_net = sellTx.quantity * sellTx.price - sellTx.fee
    // 自選損益 = 賣出淨收入 - 自選成本基準
    const custom_pl = sell_net - custom_cost_basis
    // 自選報酬率 = 自選損益 / 自選成本基準 × 100%
    const custom_return_rate = custom_cost_basis > 0 ? (custom_pl / custom_cost_basis) * 100 : 0

    // 均成本對照：直接取 calculateRealizedPL 算好的結果
    const rpl = realizedPLMap.get(sellId)

    records.push({
      sell_transaction_id: sellId,
      symbol: sellTx.symbol,
      name: sellTx.name,
      sell_date: sellTx.trade_date,
      sell_price: sellTx.price,
      quantity_sold: sellTx.quantity,
      fee: sellTx.fee,
      custom_cost_basis,
      custom_pl,
      custom_return_rate,
      custom_buy_lots,
      avg_cost_basis: rpl?.cost_basis ?? 0,
      avg_cost_pl: rpl?.realized_pl ?? 0,
      avg_cost_return_rate: rpl?.realized_return_rate ?? 0,
    })
  }

  return records.sort((a, b) => b.sell_date.localeCompare(a.sell_date))
}

/**
 * 計算某筆買入交易還可配對的股數
 *
 * 可用股數 = 原始買入股數 - 已被其他配對使用的股數
 * excludeSellTransactionId：編輯現有配對時，排除自身，避免重複扣減
 */
export function getAvailableBuyQuantity(
  buyTransactionId: string,
  buyTransaction: DbTransaction,
  allTradePairs: DbTradePair[],
  excludeSellTransactionId?: string
): number {
  const usedQuantity = allTradePairs
    .filter(pair =>
      pair.buy_transaction_id === buyTransactionId &&
      pair.sell_transaction_id !== excludeSellTransactionId
    )
    .reduce((sum, pair) => sum + pair.quantity_used, 0)

  return buyTransaction.quantity - usedQuantity
}

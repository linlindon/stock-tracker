import type { DbTransaction, DbTargetPrice, Holding, RealizedPL, DashboardSummary } from '../types'

// 將陣列依 key 函數分組，回傳 Map<key, items[]>
function groupBy<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of arr) {
    const k = key(item)
    const existing = map.get(k) ?? []
    existing.push(item)
    map.set(k, existing)
  }
  return map
}

// 某支股票目前的持倉狀態（隨每筆交易更新）
interface RunningState {
  quantity: number       // 目前持有股數
  holding_cost: number   // 目前持倉總成本
  average_cost: number   // 目前平均成本
  last_buy_price: number // 最近一次買入價格
  last_buy_date: string  // 最近一次買入日期
}

/**
 * 依時間順序處理單一股票的所有交易，回傳：
 * - finalState：最終持倉狀態
 * - realizedPLs：每筆賣出產生的已實現損益
 *
 * 平均成本法（AVCO）規則：
 * - 買入：新平均成本 = (舊持倉總成本 + 本次買入成本) / 新總股數
 * - 賣出：平均成本不變，只減少持有數量
 */
function processTransactions(transactions: DbTransaction[]): {
  finalState: RunningState
  realizedPLs: RealizedPL[]
  symbol: string
  name: string
  asset_type: 'Stock' | 'ETF'
} {
  // 先按交易日期排序，同一天則按建立時間排序
  const sorted = [...transactions].sort((a, b) => {
    if (a.trade_date !== b.trade_date) return a.trade_date.localeCompare(b.trade_date)
    return a.created_at.localeCompare(b.created_at)
  })

  const symbol = sorted[0].symbol
  const name = sorted[sorted.length - 1].name
  const asset_type = sorted[0].asset_type
  const realizedPLs: RealizedPL[] = []

  let state: RunningState = {
    quantity: 0, holding_cost: 0, average_cost: 0,
    last_buy_price: 0, last_buy_date: '',
  }

  for (const tx of sorted) {
    if (tx.transaction_type === 'Buy') {
      // 買入成本 = 股數 × 單價 + 手續費
      const buy_total_cost = tx.quantity * tx.price + tx.fee
      const new_holding_cost = state.holding_cost + buy_total_cost
      const new_quantity = state.quantity + tx.quantity

      // 新平均成本 = 新持倉總成本 / 新總股數
      state = {
        quantity: new_quantity,
        holding_cost: new_holding_cost,
        average_cost: new_holding_cost / new_quantity,
        last_buy_price: tx.price,
        last_buy_date: tx.trade_date,
      }
    } else {
      // 成本基準 = 賣出股數 × 賣出當時的平均成本
      const cost_basis = tx.quantity * state.average_cost
      const sell_amount = tx.quantity * tx.price
      // 賣出淨收入 = 賣出金額 - 手續費
      const sell_net = sell_amount - tx.fee
      // 已實現損益 = 賣出淨收入 - 成本基準
      const realized_pl = sell_net - cost_basis
      const new_quantity = state.quantity - tx.quantity
      const new_holding_cost = state.holding_cost - cost_basis

      realizedPLs.push({
        id: tx.id,
        symbol, name, asset_type,
        sell_date: tx.trade_date,
        quantity_sold: tx.quantity,
        average_cost: state.average_cost,
        sell_price: tx.price,
        sell_amount,
        cost_basis,
        fee: tx.fee,
        realized_pl,
        // 已實現報酬率 = 已實現損益 / 成本基準 × 100%
        realized_return_rate: cost_basis > 0 ? (realized_pl / cost_basis) * 100 : 0,
      })

      // 賣出後更新持倉（平均成本不變，只減少數量和持倉成本）
      state = {
        ...state,
        quantity: new_quantity,
        holding_cost: new_quantity > 0 ? new_holding_cost : 0,
        average_cost: new_quantity > 0 ? new_holding_cost / new_quantity : 0,
      }
    }
  }

  return { finalState: state, realizedPLs, symbol, name, asset_type }
}

/**
 * 計算所有持股清單
 * - 過濾掉已完全賣出的股票（quantity <= 0）
 * - 合併目標價資料
 */
export function calculateHoldings(
  transactions: DbTransaction[],
  targetPrices: DbTargetPrice[]
): Holding[] {
  if (transactions.length === 0) return []

  const bySymbol = groupBy(transactions, tx => tx.symbol)
  const targetPriceMap = new Map(targetPrices.map(tp => [tp.symbol, tp.target_price]))
  const holdings: Holding[] = []

  for (const [symbol, txs] of bySymbol) {
    const { finalState, name, asset_type } = processTransactions(txs)
    if (finalState.quantity <= 0) continue

    holdings.push({
      symbol,
      name,
      asset_type,
      quantity: finalState.quantity,
      average_cost: finalState.average_cost,
      // 持股總成本 = 持有股數 × 平均成本
      total_cost: finalState.quantity * finalState.average_cost,
      last_buy_price: finalState.last_buy_price,
      last_buy_date: finalState.last_buy_date,
      target_price: targetPriceMap.get(symbol) ?? null,
    })
  }

  return holdings
}

/**
 * 計算所有已實現損益紀錄
 * - 每筆 Sell 交易產生一筆紀錄
 * - 依賣出日期由新到舊排序
 */
export function calculateRealizedPL(transactions: DbTransaction[]): RealizedPL[] {
  if (transactions.length === 0) return []

  const bySymbol = groupBy(transactions, tx => tx.symbol)
  const allRealizedPLs: RealizedPL[] = []

  for (const txs of bySymbol.values()) {
    const { realizedPLs } = processTransactions(txs)
    allRealizedPLs.push(...realizedPLs)
  }

  return allRealizedPLs.sort((a, b) => b.sell_date.localeCompare(a.sell_date))
}

/**
 * 計算 Dashboard 摘要數字
 *
 * - total_invested：所有買入交易的總支出（含手續費）
 * - current_holding_cost：目前持倉的總成本
 * - realized_pl：所有已實現損益加總
 * - realized_return_rate：已實現損益 / 已賣出成本基準 × 100%
 * - holding_count：目前持股檔數
 */
export function calculateDashboard(
  transactions: DbTransaction[],
  targetPrices: DbTargetPrice[]
): DashboardSummary {
  const holdings = calculateHoldings(transactions, targetPrices)
  const realizedPLs = calculateRealizedPL(transactions)

  // 總投入成本 = 所有買入（股數 × 單價 + 手續費）加總
  const total_invested = transactions
    .filter(tx => tx.transaction_type === 'Buy')
    .reduce((sum, tx) => sum + tx.quantity * tx.price + tx.fee, 0)

  const current_holding_cost = holdings.reduce((sum, h) => sum + h.total_cost, 0)
  const realized_pl = realizedPLs.reduce((sum, r) => sum + r.realized_pl, 0)
  // 已賣出的成本基準加總，用來計算整體報酬率
  const total_sold_cost = realizedPLs.reduce((sum, r) => sum + r.cost_basis, 0)

  return {
    total_invested,
    current_holding_cost,
    realized_pl,
    realized_return_rate: total_sold_cost > 0 ? (realized_pl / total_sold_cost) * 100 : 0,
    holding_count: holdings.length,
  }
}

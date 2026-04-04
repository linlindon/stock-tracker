import { describe, it, expect } from 'vitest'
import { calculateTradePairRecords, getAvailableBuyQuantity } from './tradePairCalculations'
import type { DbTransaction, DbTradePair, RealizedPL } from '../types'

const buyTx: DbTransaction = {
  id: 'buy-1', user_id: 'u1', symbol: 'AAPL', name: 'Apple Inc.',
  asset_type: 'Stock', transaction_type: 'Buy',
  trade_date: '2024-01-01', quantity: 10, price: 150, fee: 0,
  note: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
}

const sellTx: DbTransaction = {
  id: 'sell-1', user_id: 'u1', symbol: 'AAPL', name: 'Apple Inc.',
  asset_type: 'Stock', transaction_type: 'Sell',
  trade_date: '2024-06-01', quantity: 5, price: 200, fee: 0,
  note: null, created_at: '2024-06-01T00:00:00Z', updated_at: '2024-06-01T00:00:00Z',
}

const pair: DbTradePair = {
  id: 'pair-1', user_id: 'u1',
  sell_transaction_id: 'sell-1',
  buy_transaction_id: 'buy-1',
  quantity_used: 5,
  created_at: '2024-06-01T00:00:00Z',
}

// avg_cost=150, cost_basis=5×150=750, sell_net=5×200=1000, realized_pl=250
const realizedPL: RealizedPL = {
  id: 'sell-1',
  symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'Stock',
  sell_date: '2024-06-01', quantity_sold: 5,
  average_cost: 150, sell_price: 200, sell_amount: 1000,
  cost_basis: 750, fee: 0, realized_pl: 250, realized_return_rate: 33.33,
}

describe('calculateTradePairRecords', () => {
  it('計算自選損益', () => {
    const result = calculateTradePairRecords([pair], [buyTx, sellTx], [realizedPL])
    expect(result).toHaveLength(1)
    // custom_cost_basis = 5 × 150 = 750
    expect(result[0].custom_cost_basis).toBe(750)
    // custom_pl = 賣出淨收入(1000) - 自選成本基準(750) = 250
    expect(result[0].custom_pl).toBe(250)
    // custom_return_rate = 250 / 750 × 100 = 33.33%
    expect(result[0].custom_return_rate).toBeCloseTo(33.33, 1)
  })

  it('均成本對照來自 realizedPL', () => {
    const result = calculateTradePairRecords([pair], [buyTx, sellTx], [realizedPL])
    expect(result[0].avg_cost_basis).toBe(750)
    expect(result[0].avg_cost_pl).toBe(250)
  })

  it('一筆賣出對應多筆買入，成本基準加總', () => {
    const buyTx2: DbTransaction = {
      ...buyTx, id: 'buy-2', price: 100, trade_date: '2023-01-01',
      created_at: '2023-01-01T00:00:00Z',
    }
    const pair2: DbTradePair = { ...pair, id: 'pair-2', buy_transaction_id: 'buy-2', quantity_used: 3 }
    const result = calculateTradePairRecords([pair, pair2], [buyTx, buyTx2, sellTx], [realizedPL])
    // custom_cost_basis = 5×150 + 3×100 = 750 + 300 = 1050
    expect(result[0].custom_cost_basis).toBe(1050)
    expect(result[0].custom_buy_lots).toHaveLength(2)
  })
})

describe('getAvailableBuyQuantity', () => {
  it('未配對時可用量 = 原始買入量', () => {
    const qty = getAvailableBuyQuantity('buy-1', buyTx, [])
    expect(qty).toBe(10)
  })

  it('已配對部分，可用量減少', () => {
    const qty = getAvailableBuyQuantity('buy-1', buyTx, [pair])
    // 10 - 5 = 5
    expect(qty).toBe(5)
  })

  it('編輯時排除自身配對，可用量不減少', () => {
    const qty = getAvailableBuyQuantity('buy-1', buyTx, [pair], 'sell-1')
    expect(qty).toBe(10)
  })
})

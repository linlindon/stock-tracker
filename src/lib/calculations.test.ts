import { describe, it, expect } from 'vitest'
import { calculateHoldings, calculateRealizedPL, calculateDashboard } from './calculations'
import type { DbTransaction, DbTargetPrice } from '../types'

const buyAAPL1: DbTransaction = {
  id: 'tx-1', user_id: 'u1', symbol: 'AAPL', name: 'Apple Inc.',
  asset_type: 'Stock', transaction_type: 'Buy',
  trade_date: '2020-01-01', quantity: 10, price: 100, fee: 0,
  note: null, created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z',
}

const buyAAPL2: DbTransaction = {
  id: 'tx-2', user_id: 'u1', symbol: 'AAPL', name: 'Apple Inc.',
  asset_type: 'Stock', transaction_type: 'Buy',
  trade_date: '2021-01-01', quantity: 10, price: 200, fee: 10,
  note: null, created_at: '2021-01-01T00:00:00Z', updated_at: '2021-01-01T00:00:00Z',
}

const sellAAPL: DbTransaction = {
  id: 'tx-3', user_id: 'u1', symbol: 'AAPL', name: 'Apple Inc.',
  asset_type: 'Stock', transaction_type: 'Sell',
  trade_date: '2022-01-01', quantity: 5, price: 300, fee: 5,
  note: null, created_at: '2022-01-01T00:00:00Z', updated_at: '2022-01-01T00:00:00Z',
}

const targetAAPL: DbTargetPrice = {
  id: 'tp-1', user_id: 'u1', symbol: 'AAPL', target_price: 140, note: null,
  created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z',
}

describe('calculateHoldings', () => {
  it('單筆買入，持股正確', () => {
    const result = calculateHoldings([buyAAPL1], [])
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(10)
    expect(result[0].average_cost).toBe(100)
    expect(result[0].total_cost).toBe(1000)
    expect(result[0].last_buy_price).toBe(100)
    expect(result[0].last_buy_date).toBe('2020-01-01')
  })

  it('兩筆買入，平均成本正確（含手續費）', () => {
    // buyAAPL1: 10×100+0=1000, buyAAPL2: 10×200+10=2010, total=3010, qty=20, avg=150.5
    const result = calculateHoldings([buyAAPL1, buyAAPL2], [])
    expect(result[0].quantity).toBe(20)
    expect(result[0].average_cost).toBeCloseTo(150.5)
    expect(result[0].last_buy_price).toBe(200)
    expect(result[0].last_buy_date).toBe('2021-01-01')
  })

  it('賣出後持股數量減少，平均成本不變', () => {
    const result = calculateHoldings([buyAAPL1, buyAAPL2, sellAAPL], [])
    expect(result[0].quantity).toBe(15)
    expect(result[0].average_cost).toBeCloseTo(150.5)
  })

  it('完全賣出後不出現在 holdings', () => {
    const sellAll: DbTransaction = {
      ...sellAAPL, id: 'tx-4', quantity: 20, trade_date: '2022-06-01',
      created_at: '2022-06-01T00:00:00Z',
    }
    const result = calculateHoldings([buyAAPL1, buyAAPL2, sellAll], [])
    expect(result).toHaveLength(0)
  })

  it('帶入目標價', () => {
    const result = calculateHoldings([buyAAPL1], [targetAAPL])
    expect(result[0].target_price).toBe(140)
  })

  it('無目標價時為 null', () => {
    const result = calculateHoldings([buyAAPL1], [])
    expect(result[0].target_price).toBeNull()
  })

  it('同一天多筆交易依 created_at 排序', () => {
    const buy1: DbTransaction = {
      ...buyAAPL1, id: 'tx-a', trade_date: '2023-01-01', price: 100, quantity: 10, fee: 0,
      created_at: '2023-01-01T08:00:00Z',
    }
    const buy2: DbTransaction = {
      ...buyAAPL1, id: 'tx-b', trade_date: '2023-01-01', price: 150, quantity: 5, fee: 0,
      created_at: '2023-01-01T10:00:00Z',
    }
    const result = calculateHoldings([buy1, buy2], [])
    // avg = (10×100 + 5×150) / 15 = 116.67
    expect(result[0].last_buy_price).toBe(150)
    expect(result[0].average_cost).toBeCloseTo(116.67, 1)
  })
})

describe('calculateRealizedPL', () => {
  it('賣出損益計算正確', () => {
    // avg_cost = 150.5, cost_basis = 5×150.5=752.5
    // sell_net = 5×300-5=1495, realized_pl = 1495-752.5=742.5
    // return_rate = 742.5/752.5 = 98.67%
    const result = calculateRealizedPL([buyAAPL1, buyAAPL2, sellAAPL])
    expect(result).toHaveLength(1)
    expect(result[0].cost_basis).toBeCloseTo(752.5)
    expect(result[0].realized_pl).toBeCloseTo(742.5)
    expect(result[0].realized_return_rate).toBeCloseTo(98.67, 1)
    expect(result[0].average_cost).toBeCloseTo(150.5)
  })

  it('買入交易不產生 realized records', () => {
    const result = calculateRealizedPL([buyAAPL1])
    expect(result).toHaveLength(0)
  })
})

describe('calculateDashboard', () => {
  it('計算 total_invested', () => {
    // 10×100+0=1000, 10×200+10=2010
    const result = calculateDashboard([buyAAPL1, buyAAPL2], [])
    expect(result.total_invested).toBe(3010)
  })

  it('計算 holding_count', () => {
    const result = calculateDashboard([buyAAPL1, buyAAPL2], [])
    expect(result.holding_count).toBe(1)
  })

  it('賣出後 current_holding_cost 減少', () => {
    const result = calculateDashboard([buyAAPL1, buyAAPL2, sellAAPL], [])
    // 15 股 × 150.5 = 2257.5
    expect(result.current_holding_cost).toBeCloseTo(2257.5)
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { getQuote, searchSymbol } from './finnhub'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getQuote', () => {
  it('returns StockQuote when Finnhub returns a valid price', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ c: 150.0, d: 1.5, dp: 1.01 }),
    }))

    const result = await getQuote('AAPL')

    expect(result).toEqual({ symbol: 'AAPL', currentPrice: 150.0, change: 1.5, changePercent: 1.01 })
  })

  it('returns null when Finnhub returns c=0 (symbol not found)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ c: 0, d: 0, dp: 0 }),
    }))

    const result = await getQuote('INVALID')

    expect(result).toBeNull()
  })

  it('returns null when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    const result = await getQuote('AAPL')

    expect(result).toBeNull()
  })
})

describe('searchSymbol', () => {
  it('returns filtered results (Common Stock and ETP only)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        count: 3,
        result: [
          { symbol: 'AAPL', description: 'APPLE INC', type: 'Common Stock' },
          { symbol: 'SPY', description: 'SPDR S&P 500 ETF', type: 'ETP' },
          { symbol: 'AAPL.SW', description: 'APPLE INC (SW)', type: 'Foreign' },
        ],
      }),
    }))

    const result = await searchSymbol('apple')

    expect(result).toEqual([
      { symbol: 'AAPL', name: 'APPLE INC', type: 'Common Stock' },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'ETP' },
    ])
  })

  it('returns empty array when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    const result = await searchSymbol('apple')

    expect(result).toEqual([])
  })
})

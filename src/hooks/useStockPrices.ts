import { useState, useEffect, useCallback } from 'react'
import type { StockQuote } from '../types'
import { getQuote } from '../lib/finnhub'

export function useStockPrices(symbols: string[]) {
  const [prices, setPrices] = useState<Map<string, StockQuote>>(new Map())
  const [loading, setLoading] = useState(false)

  const symbolKey = symbols.join(',')

  const refresh = useCallback(async () => {
    const syms = symbolKey ? symbolKey.split(',') : []
    if (syms.length === 0) {
      setPrices(new Map())
      setLoading(false)
      return
    }
    setLoading(true)
    const entries = await Promise.all(
      syms.map(async s => {
        const q = await getQuote(s)
        return q ? ([s, q] as [string, StockQuote]) : null
      })
    )
    const map = new Map<string, StockQuote>()
    for (const entry of entries) {
      if (entry) map.set(entry[0], entry[1])
    }
    setPrices(map)
    setLoading(false)
  }, [symbolKey])

  useEffect(() => {
    refresh() // eslint-disable-line react-hooks/set-state-in-effect
  }, [refresh])

  return { prices, loading, refresh }
}

import type { StockQuote, SymbolSearchResult } from '../types'

const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string | undefined
const BASE = 'https://finnhub.io/api/v1'

if (!API_KEY) {
  console.warn('[finnhub] VITE_FINNHUB_API_KEY is not set — stock price features will be disabled')
}

export async function getQuote(symbol: string): Promise<StockQuote | null> {
  if (!API_KEY) return null
  try {
    const res = await fetch(`${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.c || data.c === 0) return null
    return { symbol, currentPrice: data.c, change: data.d, changePercent: data.dp }
  } catch {
    return null
  }
}

export async function searchSymbol(query: string): Promise<SymbolSearchResult[]> {
  if (!API_KEY) return []
  try {
    const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&token=${API_KEY}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.result as Array<{ symbol: string; description: string; type: string }>)
      .filter(r => r.type === 'Common Stock' || r.type === 'ETP')
      .map(r => ({ symbol: r.symbol, name: r.description, type: r.type }))
  } catch {
    return []
  }
}

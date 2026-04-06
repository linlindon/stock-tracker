import { useState, useEffect, useRef } from 'react'
import type { DbTransaction, DbTradePair, TransactionForm as TForm, TradePairSelection, SymbolSearchResult } from '../types'
import { searchSymbol } from '../lib/finnhub'
import BuyLotSelector from './BuyLotSelector'

interface FormState {
  symbol: string
  name: string
  asset_type: 'Stock' | 'ETF'
  transaction_type: 'Buy' | 'Sell'
  trade_date: string
  quantity: string
  price: string
  fee: string
  note: string
}

const EMPTY_FORM: FormState = {
  symbol: '', name: '', asset_type: 'Stock', transaction_type: 'Buy',
  trade_date: new Date().toISOString().split('T')[0],
  quantity: '', price: '', fee: '', note: '',
}

interface Props {
  onSubmit: (form: TForm, pairSelections: TradePairSelection[]) => Promise<void>
  onClose: () => void
  buyTransactions: DbTransaction[]
  allTradePairs: DbTradePair[]
}

export default function TransactionForm({ onSubmit, onClose, buyTransactions, allTradePairs }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [pairSelections, setPairSelections] = useState<TradePairSelection[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const skipNextSearch = useRef(false)

  const set = (field: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  // Debounced symbol search
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false
      return
    }
    if (form.symbol.length < 1) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      const results = await searchSymbol(form.symbol)
      setSearchResults(results)
      setShowDropdown(results.length > 0)
      setSearching(false)
    }, 500)
    return () => {
      clearTimeout(timer)
    }
  }, [form.symbol])

  const handleSelectSymbol = (result: SymbolSearchResult) => {
    skipNextSearch.current = true
    set('symbol', result.symbol)
    set('name', result.name)
    set('asset_type', result.type === 'ETP' ? 'ETF' : 'Stock')
    setShowDropdown(false)
    setSearchResults([])
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const parsed: TForm = {
        ...form,
        quantity: parseFloat(form.quantity),
        price: parseFloat(form.price),
        fee: form.fee ? parseFloat(form.fee) : 0,
      }
      await onSubmit(parsed, form.transaction_type === 'Sell' ? pairSelections : [])
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增失敗')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex rounded-lg overflow-hidden border border-gray-200">
        {(['Buy', 'Sell'] as const).map(type => (
          <button key={type} type="button" onClick={() => set('transaction_type', type)}
            className={`flex-1 py-2 text-sm font-medium ${form.transaction_type === type ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'}`}>
            {type === 'Buy' ? '買入' : '賣出'}
          </button>
        ))}
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          代號 * {searching && <span className="text-xs text-gray-400 font-normal">搜尋中...</span>}
        </label>
        <input
          required
          value={form.symbol}
          onChange={e => {
            set('symbol', e.target.value.toUpperCase())
            set('name', '')
          }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          placeholder="例如 AAPL" />
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map(r => (
              <button
                key={r.symbol}
                type="button"
                onMouseDown={() => handleSelectSymbol(r)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                <span className="font-medium">{r.symbol}</span>
                <span className="text-gray-400 ml-2 text-xs">{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">名稱 *</label>
        <input required value={form.name} onChange={e => set('name', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          placeholder="例如 Apple Inc." />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">類型 *</label>
        <select value={form.asset_type} onChange={e => set('asset_type', e.target.value as 'Stock' | 'ETF')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="Stock">Stock</option>
          <option value="ETF">ETF</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">交易日期 *</label>
        <input type="date" required value={form.trade_date} onChange={e => set('trade_date', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">股數 *</label>
          <input type="number" required min="0.001" step="any" value={form.quantity}
            onChange={e => set('quantity', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">成交價 *</label>
          <input type="number" required min="0.001" step="any" value={form.price}
            onChange={e => set('price', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">手續費（選填）</label>
        <input type="number" min="0" step="any" value={form.fee}
          onChange={e => set('fee', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          placeholder="0" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">備註（選填）</label>
        <textarea value={form.note} onChange={e => set('note', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" rows={2} />
      </div>

      {form.transaction_type === 'Sell' && form.symbol && (
        <BuyLotSelector
          symbol={form.symbol}
          sellQuantity={parseFloat(form.quantity) || 0}
          sellPrice={parseFloat(form.price) || 0}
          sellFee={parseFloat(form.fee) || 0}
          buyTransactions={buyTransactions}
          allTradePairs={allTradePairs}
          selections={pairSelections}
          onChange={setPairSelections}
        />
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">取消</button>
        <button type="submit" disabled={submitting} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50">
          {submitting ? '儲存中...' : '儲存'}
        </button>
      </div>
    </form>
  )
}

import { useState } from 'react'
import type { TransactionForm as TForm, TradePairSelection } from '../types'

// 表單內部狀態：數字欄位用 string 存（HTML input 回傳字串）
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
  // 賣出配對區塊（Task 12 插入）
  buyLotSelectorSlot?: React.ReactNode
}

export default function TransactionForm({ onSubmit, onClose, buyLotSelectorSlot }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      // 送出前將字串轉換為數字
      const parsed: TForm = {
        ...form,
        quantity: parseFloat(form.quantity),
        price: parseFloat(form.price),
        fee: form.fee ? parseFloat(form.fee) : 0,
      }
      await onSubmit(parsed, [])
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">代號 *</label>
        <input required value={form.symbol} onChange={e => set('symbol', e.target.value.toUpperCase())}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          placeholder="例如 AAPL" />
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

      {/* 賣出配對區塊（Task 12 插入） */}
      {buyLotSelectorSlot}

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

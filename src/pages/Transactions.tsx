import { useState, useMemo } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useTradePairs } from '../hooks/useTradePairs'
import { formatCurrency, formatDate } from '../lib/format'
import TransactionForm from '../components/TransactionForm'
import GlossaryPanel from '../components/GlossaryPanel'
import type { TransactionForm as TForm, TradePairSelection } from '../types'

const glossaryItems = [
  { term: '總金額', termEn: 'Total Amount', description: '股數 × 成交價，不含手續費', formula: '股數 × 成交價' },
  { term: '手續費', termEn: 'Fee', description: '券商收取的交易成本，如無則填 0' },
  { term: '淨金額', termEn: 'Net Amount', description: '買入：總金額 + 手續費；賣出：總金額 − 手續費', formula: '買入：總金額 + 手續費｜賣出：總金額 − 手續費' },
]

const PAGE_SIZE = 20

export default function Transactions() {
  const { transactions, loading, addTransaction, deleteTransaction } = useTransactions()
  const { tradePairs, savePairs } = useTradePairs()
  const [showForm, setShowForm] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [page, setPage] = useState(1)

  const handleSubmit = async (form: TForm, pairSelections: TradePairSelection[]) => {
    const newId = await addTransaction(form)
    if (form.transaction_type === 'Sell' && pairSelections.some(s => s.quantity_used > 0)) {
      await savePairs(newId, pairSelections)
    }
  }

  // 取得所有不重複的 symbol（含 name）
  const symbolOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const tx of transactions) {
      if (!map.has(tx.symbol)) map.set(tx.symbol, tx.name)
    }
    return Array.from(map.entries()).map(([symbol, name]) => ({ symbol, name }))
  }, [transactions])

  // 搜尋下拉建議
  const suggestions = useMemo(() => {
    if (!searchInput) return []
    const q = searchInput.toUpperCase()
    return symbolOptions.filter(
      o => o.symbol.startsWith(q) || o.name.toUpperCase().startsWith(q)
    )
  }, [searchInput, symbolOptions])

  // 篩選後的交易列表
  const filtered = useMemo(() => {
    if (!selectedSymbol) return transactions
    return transactions.filter(tx => tx.symbol === selectedSymbol)
  }, [transactions, selectedSymbol])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol)
    setSearchInput(symbol)
    setShowDropdown(false)
    setPage(1)
  }

  const handleClearSearch = () => {
    setSelectedSymbol('')
    setSearchInput('')
    setPage(1)
  }

  if (loading) return <div className="p-4">載入中...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Transactions</h1>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
          + 新增
        </button>
      </div>

      {/* 搜尋欄 */}
      <div className="relative mb-4">
        <input
          value={searchInput}
          onChange={e => {
            setSearchInput(e.target.value)
            setSelectedSymbol('')
            setShowDropdown(true)
            setPage(1)
          }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          onFocus={() => { if (searchInput) setShowDropdown(true) }}
          placeholder="搜尋股票代號或名稱..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 pr-8"
        />
        {searchInput && (
          <button onClick={handleClearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">
            ×
          </button>
        )}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map(o => (
              <button key={o.symbol} type="button"
                onMouseDown={() => handleSelectSymbol(o.symbol)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                <span className="font-medium">{o.symbol}</span>
                <span className="text-gray-400 ml-2 text-xs">{o.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">新增交易</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400">✕</button>
            </div>
            <TransactionForm
              onSubmit={handleSubmit}
              onClose={() => setShowForm(false)}
              buyTransactions={transactions}
              allTradePairs={tradePairs}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {paginated.map(tx => (
          <div key={tx.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{tx.symbol}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${tx.transaction_type === 'Buy' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {tx.transaction_type === 'Buy' ? '買入' : '賣出'}
                  </span>
                  <span className="text-xs text-gray-400">{tx.asset_type}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">{tx.quantity} 股 × {formatCurrency(tx.price)}</div>
                <div className="text-xs text-gray-400">{formatDate(tx.trade_date)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{formatCurrency(tx.quantity * tx.price)}</div>
                <button onClick={() => { if (confirm('確定刪除？')) deleteTransaction(tx.id) }}
                  className="text-xs text-red-400 mt-1 hover:text-red-600">刪除</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            {selectedSymbol ? `找不到 ${selectedSymbol} 的交易紀錄` : '尚無交易紀錄，點擊「+ 新增」開始記錄'}
          </p>
        )}
      </div>

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
            ‹
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
            ›
          </button>
        </div>
      )}

      <GlossaryPanel pageKey="transactions" items={glossaryItems} />
    </div>
  )
}

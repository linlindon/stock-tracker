import { useState } from 'react'
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

export default function Transactions() {
  const { transactions, loading, addTransaction, deleteTransaction } = useTransactions()
  const { savePairs } = useTradePairs()
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = async (form: TForm, pairSelections: TradePairSelection[]) => {
    const newId = await addTransaction(form)
    if (form.transaction_type === 'Sell' && pairSelections.some(s => s.quantity_used > 0)) {
      await savePairs(newId, pairSelections)
    }
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

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">新增交易</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400">✕</button>
            </div>
            <TransactionForm onSubmit={handleSubmit} onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {transactions.map(tx => (
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
        {transactions.length === 0 && (
          <p className="text-center text-gray-400 py-8">尚無交易紀錄，點擊「+ 新增」開始記錄</p>
        )}
      </div>

      <GlossaryPanel pageKey="transactions" items={glossaryItems} />
    </div>
  )
}

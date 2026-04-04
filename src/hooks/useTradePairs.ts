import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { DbTradePair, TradePairSelection } from '../types'

export function useTradePairs() {
  const [tradePairs, setTradePairs] = useState<DbTradePair[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('trade_pairs').select('*')
    if (!error) setTradePairs(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const savePairs = async (sellTransactionId: string, selections: TradePairSelection[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登入')

    // 先刪除此賣出交易的所有舊配對，再重新寫入
    await supabase.from('trade_pairs').delete().eq('sell_transaction_id', sellTransactionId)

    const valid = selections.filter(s => s.quantity_used > 0)
    if (valid.length === 0) return

    const { error } = await supabase.from('trade_pairs').insert(
      valid.map(s => ({
        user_id: user.id,
        sell_transaction_id: sellTransactionId,
        buy_transaction_id: s.buy_transaction_id,
        quantity_used: s.quantity_used,
      }))
    )
    if (error) throw error
    await fetchAll()
  }

  return { tradePairs, loading, savePairs, refetch: fetchAll }
}

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { DbTransaction, DbTargetPrice, TransactionForm } from '../types'

export function useTransactions() {
  const [transactions, setTransactions] = useState<DbTransaction[]>([])
  const [targetPrices, setTargetPrices] = useState<DbTargetPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [txResult, tpResult] = await Promise.all([
        supabase.from('transactions').select('*').order('trade_date', { ascending: false }),
        supabase.from('target_prices').select('*'),
      ])
      if (txResult.error) throw txResult.error
      if (tpResult.error) throw tpResult.error
      setTransactions(txResult.data ?? [])
      setTargetPrices(tpResult.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addTransaction = async (form: TransactionForm): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登入')

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        symbol: form.symbol.toUpperCase().trim(),
        name: form.name.trim(),
        asset_type: form.asset_type,
        transaction_type: form.transaction_type,
        trade_date: form.trade_date,
        quantity: form.quantity,
        price: form.price,
        fee: form.fee ?? 0,
        note: form.note || null,
      })
      .select('id')
      .single()

    if (error) throw error
    await fetchAll()
    return data.id
  }

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  const upsertTargetPrice = async (symbol: string, targetPrice: number | null) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登入')

    const { error } = await supabase
      .from('target_prices')
      .upsert(
        { user_id: user.id, symbol: symbol.toUpperCase(), target_price: targetPrice },
        { onConflict: 'user_id,symbol' }
      )
    if (error) throw error
    await fetchAll()
  }

  return {
    transactions, targetPrices, loading, error,
    addTransaction, deleteTransaction, upsertTargetPrice, refetch: fetchAll,
  }
}

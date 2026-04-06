// ─── Database types (raw from Supabase) ──────────────────────────────────────

export interface DbTransaction {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_type: 'Stock' | 'ETF';
  transaction_type: 'Buy' | 'Sell';
  trade_date: string; // ISO date string YYYY-MM-DD
  quantity: number;
  price: number;
  fee: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTargetPrice {
  id: string;
  user_id: string;
  symbol: string;
  target_price: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTradePair {
  id: string;
  user_id: string;
  sell_transaction_id: string;
  buy_transaction_id: string;
  quantity_used: number;
  created_at: string;
}

export interface DbWatchlistItem {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_type: 'Stock' | 'ETF';
  target_price: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Computed / frontend types ────────────────────────────────────────────────

export interface Holding {
  symbol: string;
  name: string;
  asset_type: 'Stock' | 'ETF';
  quantity: number;
  average_cost: number;
  total_cost: number;
  last_buy_price: number | null;
  last_buy_date: string | null;
  target_price: number | null;
}

export interface RealizedPL {
  id: string; // sell transaction id
  symbol: string;
  name: string;
  asset_type: 'Stock' | 'ETF';
  sell_date: string;
  quantity_sold: number;
  average_cost: number;
  sell_price: number;
  sell_amount: number;
  cost_basis: number;
  fee: number;
  realized_pl: number;
  realized_return_rate: number; // e.g. 12.5 means 12.5%
}

export interface TradePairRecord {
  sell_transaction_id: string;
  symbol: string;
  name: string;
  sell_date: string;
  sell_price: number;
  quantity_sold: number;
  fee: number;
  // custom lot pairing
  custom_cost_basis: number;
  custom_pl: number;
  custom_return_rate: number;
  custom_buy_lots: Array<{
    buy_transaction_id: string;
    buy_date: string;
    buy_price: number;
    quantity_used: number;
  }>;
  // average cost comparison
  avg_cost_basis: number;
  avg_cost_pl: number;
  avg_cost_return_rate: number;
}

export interface DashboardSummary {
  total_invested: number;
  current_holding_cost: number;
  realized_pl: number;
  realized_return_rate: number;
  holding_count: number;
}

export interface StockQuote {
  symbol: string;
  currentPrice: number;
  change: number;        // today's price change in dollars
  changePercent: number; // today's change as a percentage
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  type: string; // 'Common Stock' | 'ETP' etc
}

export interface StockDetailSummary {
  symbol: string;
  name: string;
  asset_type: 'Stock' | 'ETF';
  quantity: number;
  average_cost: number;
  total_cost: number;
  last_buy_price: number | null;
  last_buy_date: string | null;
  target_price: number | null;
  total_realized_pl: number;
  average_realized_return_rate: number | null;
}

// ─── Form types ───────────────────────────────────────────────────────────────

export interface TransactionForm {
  symbol: string;
  name: string;
  asset_type: 'Stock' | 'ETF';
  transaction_type: 'Buy' | 'Sell';
  trade_date: string;
  quantity: number;
  price: number;
  fee: number;
  note: string;
}

export interface TargetPriceForm {
  symbol: string;
  target_price: number | null;
  note: string;
}

// Used in the sell form's pairing step
export interface TradePairSelection {
  buy_transaction_id: string;
  quantity_used: number;
}

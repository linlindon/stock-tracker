# 技術規格文件

---

## 一、技術架構

```
┌─────────────────────────┐         ┌─────────────────────────┐
│      Frontend           │         │       Supabase          │
│  ─────────────────────  │         │  ─────────────────────  │
│  React + Vite           │ ──────► │  PostgreSQL Database    │
│  TypeScript             │         │  Auth (Google OAuth)    │
│  Tailwind CSS           │         │  Row Level Security     │
│  React Router           │         │                         │
└─────────────────────────┘         └─────────────────────────┘
```

### 前端技術
- **框架**: React 18+ with Vite
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **路由**: React Router v6
- **狀態管理**: React Context（簡單狀態）或 Zustand（如需要）

### 後端服務
- **資料庫**: Supabase (PostgreSQL)
- **認證**: Supabase Auth with Google OAuth
- **API**: Supabase JavaScript SDK

---

## 二、Supabase 資料表設計

### 2.1 transactions 表

主要的交易紀錄表，是所有計算的資料來源。

```sql
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  symbol text not null,
  name text not null,
  asset_type text not null check (asset_type in ('Stock', 'ETF')),
  transaction_type text not null check (transaction_type in ('Buy', 'Sell')),
  trade_date date not null,
  quantity decimal not null check (quantity > 0),
  price decimal not null check (price > 0),
  fee decimal default 0 check (fee >= 0),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 索引
create index idx_transactions_user_id on transactions(user_id);
create index idx_transactions_symbol on transactions(symbol);
create index idx_transactions_trade_date on transactions(trade_date);
```

補充規則：
- `symbol` 存入前一律轉成大寫
- 前端與資料庫驗證都禁止 `quantity <= 0`、`price <= 0`
- 第一版允許手動輸入 `name`，後續可改為股票 API 自動帶入

### 2.2 target_prices 表

使用者手動輸入的目標價/觀察低點。

```sql
create table target_prices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  symbol text not null,
  target_price decimal check (target_price > 0),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, symbol)
);

create index idx_target_prices_user_id on target_prices(user_id);
```

### 2.3 trade_pairs 表（短線配對）

記錄使用者自選的買入配對關係，每一列代表「某筆賣出」對應「某筆買入的幾股」。

```sql
create table trade_pairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  sell_transaction_id uuid references transactions(id) on delete cascade not null,
  buy_transaction_id uuid references transactions(id) on delete cascade not null,
  quantity_used decimal not null check (quantity_used > 0),
  created_at timestamptz default now()
);

create index idx_trade_pairs_user_id on trade_pairs(user_id);
create index idx_trade_pairs_sell_transaction_id on trade_pairs(sell_transaction_id);
create index idx_trade_pairs_buy_transaction_id on trade_pairs(buy_transaction_id);
```

補充規則：
- 一筆賣出可對應多筆買入（多列 `trade_pairs`）
- `quantity_used` 不可超過該買入批次的「可用股數」（原始買入股數 - 已被其他配對使用的股數）— **需在應用層驗證，資料庫層無法自動擋**
- `sell_transaction_id` 必須對應 `transaction_type = 'Sell'` 的交易，`buy_transaction_id` 必須對應 `transaction_type = 'Buy'` — **需在應用層驗證**
- 買入或賣出交易被刪除時，對應的 `trade_pairs` 透過 `ON DELETE CASCADE` 自動刪除
- 配對的新增與刪除不影響 `transactions` 表，也不影響平均成本計算

### 2.4 watchlist 表（後續擴充）

```sql
create table watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  symbol text not null,
  name text not null,
  asset_type text not null check (asset_type in ('Stock', 'ETF')),
  target_price decimal check (target_price > 0),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, symbol)
);

create index idx_watchlist_user_id on watchlist(user_id);
```

---

## 三、Row Level Security (RLS)

確保每個使用者只能存取自己的資料。

```sql
-- transactions 表
alter table transactions enable row level security;

create policy "Users can view own transactions"
  on transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on transactions for delete
  using (auth.uid() = user_id);

-- target_prices 表
alter table target_prices enable row level security;

create policy "Users can manage own target_prices"
  on target_prices for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- trade_pairs 表
alter table trade_pairs enable row level security;

create policy "Users can manage own trade_pairs"
  on trade_pairs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- watchlist 表
alter table watchlist enable row level security;

create policy "Users can manage own watchlist"
  on watchlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 四、TypeScript 介面定義

### 4.1 資料庫型別

```typescript
// 資料庫原始型別
export interface DbTransaction {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_type: 'Stock' | 'ETF';
  transaction_type: 'Buy' | 'Sell';
  trade_date: string; // ISO date string
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
```

### 4.2 前端計算型別

```typescript
// 持股（由 transactions 計算得出）
export interface Holding {
  symbol: string;
  name: string;
  asset_type: 'Stock' | 'ETF';
  quantity: number;           // 持有股數
  average_cost: number;       // 平均成本
  total_cost: number;         // 持股總成本
  last_buy_price: number;     // 最近買入價
  last_buy_date: string;      // 最近買入日
  target_price: number | null; // 目標價（手動輸入）
}

// 已實現損益（由 sell transactions 計算）
export interface RealizedPL {
  symbol: string;
  name: string;
  asset_type: 'Stock' | 'ETF';
  sell_date: string;
  quantity_sold: number;
  average_cost: number;       // 賣出當時的平均成本
  sell_price: number;
  sell_amount: number;
  cost_basis: number;
  fee: number;
  realized_pl: number;        // 已實現損益
  realized_return_rate: number; // 已實現報酬率 (%)
}

// 短線配對紀錄（由 trade_pairs + transactions 計算得出）
export interface TradePairRecord {
  sell_transaction_id: string;
  symbol: string;
  name: string;
  sell_date: string;
  sell_price: number;
  quantity_sold: number;
  // 自選配對
  custom_cost_basis: number;       // Σ (quantity_used × buy_price)
  custom_pl: number;               // 賣出淨收入 - custom_cost_basis
  custom_return_rate: number;      // custom_pl / custom_cost_basis × 100%
  custom_buy_lots: Array<{
    buy_transaction_id: string;
    buy_date: string;
    buy_price: number;
    quantity_used: number;
  }>;
  // 均成本對照（與 RealizedPL 相同）
  avg_cost_basis: number;
  avg_cost_pl: number;
  avg_cost_return_rate: number;
}

// Dashboard 摘要
export interface DashboardSummary {
  total_invested: number;      // 總投入成本
  current_holding_cost: number; // 持股總成本
  realized_pl: number;         // 已實現損益
  realized_return_rate: number; // 已實現報酬率 (%)
  holding_count: number;       // 持股檔數
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
```

### 4.3 表單型別

```typescript
// 新增/編輯交易表單
export interface TransactionForm {
  symbol: string;
  name: string;
  asset_type: 'Stock' | 'ETF';
  transaction_type: 'Buy' | 'Sell';
  trade_date: string;
  quantity: number;
  price: number;
  fee?: number;
  note?: string;
}

// 目標價編輯
export interface TargetPriceForm {
  symbol: string;
  target_price: number | null;
  note?: string;
}
```

---

## 五、計算函數

### 5.1 計算持股

```typescript
function calculateHoldings(
  transactions: DbTransaction[],
  targetPrices: DbTargetPrice[]
): Holding[] {
  // 1. 按 symbol 分組
  // 2. 計算每個 symbol 的持有股數、平均成本
  // 3. 找出最近一次買入的價格和日期
  // 4. 合併目標價
  // 5. 過濾掉 quantity <= 0 的
}
```

### 5.2 計算平均成本

```typescript
function calculateAverageCost(
  transactions: DbTransaction[]
): number {
  // 使用平均成本法
  // 買入：加權平均
  // 賣出：不影響平均成本，只減少持有數量
}
```

### 5.3 計算已實現損益

```typescript
function calculateRealizedPL(
  transactions: DbTransaction[]
): RealizedPL[] {
  // 每筆賣出交易對應一筆 RealizedPL
  // 需要知道賣出當時的平均成本
}
```

### 5.4 計算短線配對損益

```typescript
function calculateTradePairRecords(
  transactions: DbTransaction[],
  tradePairs: DbTradePair[]
): TradePairRecord[] {
  // 1. 將 trade_pairs 依 sell_transaction_id 分組
  // 2. 對每組：找出賣出交易 + 所有配對的買入交易
  // 3. 計算 custom_cost_basis = Σ (quantity_used × buy_price)
  // 4. 計算 custom_pl = 賣出淨收入 - custom_cost_basis
  // 5. 計算 avg_cost_pl（需先跑平均成本計算得到賣出當時的 average_cost）
}
```

### 5.5 計算買入批次可用股數

```typescript
function getAvailableBuyQuantity(
  buyTransactionId: string,
  tradePairs: DbTradePair[],
  excludeSellTransactionId?: string  // 編輯時排除自身
): number {
  // 原始買入股數 - 已被其他配對使用的 quantity_used 加總
}
```

### 5.6 計算個股明細摘要

```typescript
function calculateStockDetailSummary(
  transactions: DbTransaction[],
  targetPrice: DbTargetPrice | null
): StockDetailSummary {
  // 根據單一 symbol 的交易，計算目前持股、最近買入資訊與累積已實現損益
}
```

---

## 六、專案結構

```
stock-tracker/
├── src/
│   ├── components/        # 共用元件
│   │   ├── Layout.tsx
│   │   ├── Navbar.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── pages/             # 頁面元件
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Holdings.tsx
│   │   ├── StockDetail.tsx
│   │   ├── Transactions.tsx
│   │   ├── RealizedPL.tsx
│   │   └── TradePairs.tsx
│   ├── hooks/             # 自定義 hooks
│   │   ├── useAuth.ts
│   │   ├── useTransactions.ts
│   │   └── useHoldings.ts
│   ├── lib/               # 工具函數
│   │   ├── supabase.ts    # Supabase client
│   │   ├── calculations.ts # 計算函數
│   │   └── format.ts      # 格式化函數
│   ├── types/             # TypeScript 型別
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── .env.local             # Supabase 環境變數
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 七、環境變數

```env
# .env.local
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx...
```

---

## 八、Supabase 設定步驟

1. 前往 https://supabase.com 註冊/登入
2. 建立新專案
3. 在 SQL Editor 執行上述建表語句
4. 在 Authentication > Providers 啟用 Google
5. 設定 Google OAuth（需要 Google Cloud Console）
6. 取得專案 URL 和 anon key

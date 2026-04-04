# Stock Tracker 完整實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 從零建立個人美股追蹤網站，包含交易記錄、持股計算、已實現損益、短線配對功能，以 React + TypeScript + Supabase 實作。

**Architecture:** 前端 React SPA，所有 P&L 從 `transactions` 原始資料在前端計算，Supabase 負責 PostgreSQL 儲存與 Google OAuth 認證，不另建後端。

**Tech Stack:** React 18, Vite 6, TypeScript, Tailwind CSS v4, React Router v6, @supabase/supabase-js v2, Vitest, React Testing Library

---

## 檔案結構

```
src/
├── types/
│   └── index.ts                    # 所有 TypeScript 型別定義
├── lib/
│   ├── supabase.ts                 # Supabase client
│   ├── calculations.ts             # 持股 / 損益計算函數
│   ├── calculations.test.ts        # 計算函數單元測試
│   ├── tradePairCalculations.ts    # 短線配對計算函數
│   ├── tradePairCalculations.test.ts
│   └── format.ts                   # 數字 / 日期格式化
├── hooks/
│   ├── useAuth.ts                  # 登入狀態管理
│   ├── useTransactions.ts          # 交易資料 CRUD
│   └── useTradePairs.ts            # 配對資料 CRUD
├── components/
│   ├── Layout.tsx                  # 整體版面（含導航）
│   ├── BottomNav.tsx               # 手機底部導航
│   ├── Sidebar.tsx                 # 桌面側邊導航
│   ├── GlossaryPanel.tsx           # 名詞說明區（可收合）
│   ├── TransactionForm.tsx         # 新增交易表單
│   └── BuyLotSelector.tsx          # 賣出配對買入選擇器
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Holdings.tsx
│   ├── Transactions.tsx
│   ├── RealizedPL.tsx
│   ├── TradePairs.tsx
│   └── StockDetail.tsx
├── test-setup.ts
├── App.tsx
└── main.tsx
```

---

### Task 1: 專案初始化

**Files:**
- Create: `package.json`, `vite.config.ts`, `src/index.css`, `src/test-setup.ts`, `.env.local`

- [ ] **Step 1: 建立 Vite 專案**

```bash
npm create vite@latest stock-tracker -- --template react-ts
cd stock-tracker
```

- [ ] **Step 2: 安裝相依套件**

```bash
npm install react-router-dom @supabase/supabase-js
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: 設定 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 4: 建立 src/test-setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: 設定 src/index.css**

```css
@import "tailwindcss";
```

- [ ] **Step 6: 建立 .env.local**

```
VITE_SUPABASE_URL=（稍後填入）
VITE_SUPABASE_ANON_KEY=（稍後填入）
```

- [ ] **Step 7: 確認 dev server 可啟動**

```bash
npm run dev
```

Expected: 瀏覽器看到 Vite + React 預設畫面

- [ ] **Step 8: 確認測試可執行**

```bash
npx vitest run
```

Expected: 0 tests, no errors

- [ ] **Step 9: Commit**

```bash
git init
git add .
git commit -m "feat: initialize React + Vite + TypeScript + Tailwind + Vitest"
```

---

### Task 2: TypeScript 型別定義

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: 建立 src/types/index.ts**

```typescript
// ─── 資料庫原始型別 ───────────────────────────────────────────

export interface DbTransaction {
  id: string
  user_id: string
  symbol: string
  name: string
  asset_type: 'Stock' | 'ETF'
  transaction_type: 'Buy' | 'Sell'
  trade_date: string // ISO date string YYYY-MM-DD
  quantity: number
  price: number
  fee: number
  note: string | null
  created_at: string
  updated_at: string
}

export interface DbTargetPrice {
  id: string
  user_id: string
  symbol: string
  target_price: number | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface DbTradePair {
  id: string
  user_id: string
  sell_transaction_id: string
  buy_transaction_id: string
  quantity_used: number
  created_at: string
}

// ─── 計算結果型別 ──────────────────────────────────────────────

export interface Holding {
  symbol: string
  name: string
  asset_type: 'Stock' | 'ETF'
  quantity: number
  average_cost: number
  total_cost: number
  last_buy_price: number
  last_buy_date: string
  target_price: number | null
}

export interface RealizedPL {
  sell_transaction_id: string
  symbol: string
  name: string
  asset_type: 'Stock' | 'ETF'
  sell_date: string
  quantity_sold: number
  average_cost: number
  sell_price: number
  sell_amount: number
  cost_basis: number
  fee: number
  realized_pl: number
  realized_return_rate: number
}

export interface TradePairRecord {
  sell_transaction_id: string
  symbol: string
  name: string
  sell_date: string
  sell_price: number
  quantity_sold: number
  sell_fee: number
  // 自選配對
  custom_cost_basis: number
  custom_pl: number
  custom_return_rate: number
  custom_buy_lots: Array<{
    buy_transaction_id: string
    buy_date: string
    buy_price: number
    quantity_used: number
  }>
  // 均成本對照
  avg_cost_basis: number
  avg_cost_pl: number
  avg_cost_return_rate: number
}

export interface DashboardSummary {
  total_invested: number
  current_holding_cost: number
  realized_pl: number
  realized_return_rate: number
  holding_count: number
  portfolio_percentages: Array<{
    symbol: string
    name: string
    asset_type: 'Stock' | 'ETF'
    percentage: number
  }>
}

// ─── 表單型別 ──────────────────────────────────────────────────

export interface TransactionForm {
  symbol: string
  name: string
  asset_type: 'Stock' | 'ETF'
  transaction_type: 'Buy' | 'Sell'
  trade_date: string
  quantity: string // string for form input
  price: string
  fee: string
  note: string
}

export interface TradePairSelection {
  buy_transaction_id: string
  quantity_used: string // string for form input
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions"
```

---

### Task 3: Supabase 設定 + 資料表建立

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: 建立 Supabase 專案**

到 https://supabase.com 建立新專案，記下 Project URL 和 anon key，填入 `.env.local`。

- [ ] **Step 2: 在 Supabase SQL Editor 建立資料表**

```sql
-- transactions 表
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
create index idx_transactions_user_id on transactions(user_id);
create index idx_transactions_symbol on transactions(symbol);
create index idx_transactions_trade_date on transactions(trade_date);

-- target_prices 表
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

-- trade_pairs 表
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

-- watchlist 表
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

- [ ] **Step 3: 啟用 RLS**

```sql
alter table transactions enable row level security;
create policy "Users can manage own transactions" on transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table target_prices enable row level security;
create policy "Users can manage own target_prices" on target_prices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table trade_pairs enable row level security;
create policy "Users can manage own trade_pairs" on trade_pairs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table watchlist enable row level security;
create policy "Users can manage own watchlist" on watchlist for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 4: 建立 src/lib/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: add Supabase client and database schema"
```

---

### Task 4: Google OAuth + 登入頁面 + 路由保護

**Files:**
- Create: `src/hooks/useAuth.ts`, `src/pages/Login.tsx`, `src/App.tsx`
- Create (placeholder): `src/pages/Dashboard.tsx`, `src/pages/Holdings.tsx`, `src/pages/Transactions.tsx`, `src/pages/RealizedPL.tsx`, `src/pages/TradePairs.tsx`, `src/pages/StockDetail.tsx`
- Create (temporary): `src/components/Layout.tsx`

- [ ] **Step 1: 在 Supabase 啟用 Google OAuth**

1. Supabase Dashboard → Authentication → Providers → Google → 啟用
2. 到 Google Cloud Console 建立 OAuth 2.0 憑證
3. 將 Client ID 和 Secret 填入 Supabase
4. Authorized redirect URI 設為：`https://<your-project>.supabase.co/auth/v1/callback`

- [ ] **Step 2: 建立 src/hooks/useAuth.ts**

```typescript
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  const signOut = () => supabase.auth.signOut()

  return { user, loading, signInWithGoogle, signOut }
}
```

- [ ] **Step 3: 建立 src/pages/Login.tsx**

```tsx
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">📈 Stock Tracker</h1>
        <p className="text-gray-500">個人美股投資記錄</p>
        <button
          onClick={() => signInWithGoogle()}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          使用 Google 登入
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 建立 6 個 placeholder 頁面**

在 `src/pages/` 建立以下 6 個檔案，內容分別為：

`Dashboard.tsx`:
```tsx
export default function Dashboard() { return <div className="p-4">Dashboard（開發中）</div> }
```

`Holdings.tsx`:
```tsx
export default function Holdings() { return <div className="p-4">Holdings（開發中）</div> }
```

`Transactions.tsx`:
```tsx
export default function Transactions() { return <div className="p-4">Transactions（開發中）</div> }
```

`RealizedPL.tsx`:
```tsx
export default function RealizedPL() { return <div className="p-4">Realized P/L（開發中）</div> }
```

`TradePairs.tsx`:
```tsx
export default function TradePairs() { return <div className="p-4">短線配對（開發中）</div> }
```

`StockDetail.tsx`:
```tsx
export default function StockDetail() { return <div className="p-4">Stock Detail（開發中）</div> }
```

- [ ] **Step 5: 建立暫時版 src/components/Layout.tsx**

```tsx
import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div>
      <main className="p-4"><Outlet /></main>
    </div>
  )
}
```

- [ ] **Step 6: 建立 src/App.tsx**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Holdings from './pages/Holdings'
import Transactions from './pages/Transactions'
import RealizedPL from './pages/RealizedPL'
import TradePairs from './pages/TradePairs'
import StockDetail from './pages/StockDetail'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen">載入中...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen">載入中...</div>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="holdings" element={<Holdings />} />
          <Route path="holdings/:symbol" element={<StockDetail />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="realized-pl" element={<RealizedPL />} />
          <Route path="trade-pairs" element={<TradePairs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 7: 更新 src/main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 8: 測試登入流程**

```bash
npm run dev
```

1. 瀏覽 http://localhost:5173，應被導向 /login
2. 點擊 Google 登入，完成 OAuth 流程
3. 應被導向 /dashboard 並看到「Dashboard（開發中）」

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: add Google OAuth auth and protected routing"
```

---

### Task 5: 核心計算函數（TDD）

**Files:**
- Create: `src/lib/calculations.ts`, `src/lib/calculations.test.ts`

- [ ] **Step 1: 建立 src/lib/calculations.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import { calculateHoldings, calculateRealizedPL, calculateDashboard } from './calculations'
import { DbTransaction, DbTargetPrice } from '../types'

const buyAAPL1: DbTransaction = {
  id: 'tx-1', user_id: 'u1', symbol: 'AAPL', name: 'Apple Inc.',
  asset_type: 'Stock', transaction_type: 'Buy',
  trade_date: '2020-01-01', quantity: 10, price: 100, fee: 0,
  note: null, created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z',
}

const buyAAPL2: DbTransaction = {
  id: 'tx-2', user_id: 'u1', symbol: 'AAPL', name: 'Apple Inc.',
  asset_type: 'Stock', transaction_type: 'Buy',
  trade_date: '2021-01-01', quantity: 10, price: 200, fee: 10,
  note: null, created_at: '2021-01-01T00:00:00Z', updated_at: '2021-01-01T00:00:00Z',
}

const sellAAPL: DbTransaction = {
  id: 'tx-3', user_id: 'u1', symbol: 'AAPL', name: 'Apple Inc.',
  asset_type: 'Stock', transaction_type: 'Sell',
  trade_date: '2022-01-01', quantity: 5, price: 300, fee: 5,
  note: null, created_at: '2022-01-01T00:00:00Z', updated_at: '2022-01-01T00:00:00Z',
}

const targetAAPL: DbTargetPrice = {
  id: 'tp-1', user_id: 'u1', symbol: 'AAPL', target_price: 140, note: null,
  created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z',
}

describe('calculateHoldings', () => {
  it('單筆買入，持股正確', () => {
    const result = calculateHoldings([buyAAPL1], [])
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(10)
    expect(result[0].average_cost).toBe(100)
    expect(result[0].total_cost).toBe(1000)
    expect(result[0].last_buy_price).toBe(100)
    expect(result[0].last_buy_date).toBe('2020-01-01')
  })

  it('兩筆買入，平均成本正確（含手續費）', () => {
    // buyAAPL1: 10×100+0=1000, buyAAPL2: 10×200+10=2010, total=3010, qty=20, avg=150.5
    const result = calculateHoldings([buyAAPL1, buyAAPL2], [])
    expect(result[0].quantity).toBe(20)
    expect(result[0].average_cost).toBeCloseTo(150.5)
    expect(result[0].last_buy_price).toBe(200)
    expect(result[0].last_buy_date).toBe('2021-01-01')
  })

  it('賣出後持股數量減少，平均成本不變', () => {
    const result = calculateHoldings([buyAAPL1, buyAAPL2, sellAAPL], [])
    expect(result[0].quantity).toBe(15)
    expect(result[0].average_cost).toBeCloseTo(150.5)
  })

  it('完全賣出後不出現在 holdings', () => {
    const sellAll: DbTransaction = {
      ...sellAAPL, id: 'tx-4', quantity: 20, trade_date: '2022-06-01',
      created_at: '2022-06-01T00:00:00Z',
    }
    const result = calculateHoldings([buyAAPL1, buyAAPL2, sellAll], [])
    expect(result).toHaveLength(0)
  })

  it('帶入目標價', () => {
    const result = calculateHoldings([buyAAPL1], [targetAAPL])
    expect(result[0].target_price).toBe(140)
  })

  it('無目標價時為 null', () => {
    const result = calculateHoldings([buyAAPL1], [])
    expect(result[0].target_price).toBeNull()
  })

  it('同一天多筆交易依 created_at 排序', () => {
    const buy1: DbTransaction = {
      ...buyAAPL1, id: 'tx-a', trade_date: '2023-01-01', price: 100, quantity: 10, fee: 0,
      created_at: '2023-01-01T08:00:00Z',
    }
    const buy2: DbTransaction = {
      ...buyAAPL1, id: 'tx-b', trade_date: '2023-01-01', price: 150, quantity: 5, fee: 0,
      created_at: '2023-01-01T10:00:00Z',
    }
    const result = calculateHoldings([buy1, buy2], [])
    // avg = (10×100 + 5×150) / 15 = 116.67
    expect(result[0].last_buy_price).toBe(150)
    expect(result[0].average_cost).toBeCloseTo(116.67, 1)
  })
})

describe('calculateRealizedPL', () => {
  it('賣出損益計算正確', () => {
    // avg_cost = 150.5, cost_basis = 5×150.5=752.5
    // sell_net = 5×300-5=1495, realized_pl = 1495-752.5=742.5
    // return_rate = 742.5/752.5 = 98.67%
    const result = calculateRealizedPL([buyAAPL1, buyAAPL2, sellAAPL])
    expect(result).toHaveLength(1)
    expect(result[0].cost_basis).toBeCloseTo(752.5)
    expect(result[0].realized_pl).toBeCloseTo(742.5)
    expect(result[0].realized_return_rate).toBeCloseTo(98.67, 1)
    expect(result[0].average_cost).toBeCloseTo(150.5)
  })

  it('買入交易不產生 realized records', () => {
    const result = calculateRealizedPL([buyAAPL1])
    expect(result).toHaveLength(0)
  })
})

describe('calculateDashboard', () => {
  it('計算 total_invested', () => {
    // 10×100+0=1000, 10×200+10=2010
    const result = calculateDashboard([buyAAPL1, buyAAPL2], [])
    expect(result.total_invested).toBe(3010)
  })

  it('計算 holding_count', () => {
    const result = calculateDashboard([buyAAPL1, buyAAPL2], [])
    expect(result.holding_count).toBe(1)
  })

  it('賣出後 current_holding_cost 減少', () => {
    const result = calculateDashboard([buyAAPL1, buyAAPL2, sellAAPL], [])
    // 15 股 × 150.5 = 2257.5
    expect(result.current_holding_cost).toBeCloseTo(2257.5)
  })
})
```

- [ ] **Step 2: 執行測試，確認全部失敗**

```bash
npx vitest run src/lib/calculations.test.ts
```

Expected: FAIL（函數未定義）

- [ ] **Step 3: 建立 src/lib/calculations.ts**

```typescript
import { DbTransaction, DbTargetPrice, Holding, RealizedPL, DashboardSummary } from '../types'

function groupBy<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of arr) {
    const k = key(item)
    const existing = map.get(k) ?? []
    existing.push(item)
    map.set(k, existing)
  }
  return map
}

interface RunningState {
  quantity: number
  holding_cost: number
  average_cost: number
  last_buy_price: number
  last_buy_date: string
}

function processTransactions(transactions: DbTransaction[]): {
  finalState: RunningState
  realizedPLs: RealizedPL[]
  symbol: string
  name: string
  asset_type: 'Stock' | 'ETF'
} {
  const sorted = [...transactions].sort((a, b) => {
    if (a.trade_date !== b.trade_date) return a.trade_date.localeCompare(b.trade_date)
    return a.created_at.localeCompare(b.created_at)
  })

  const symbol = sorted[0].symbol
  const name = sorted[sorted.length - 1].name
  const asset_type = sorted[0].asset_type
  const realizedPLs: RealizedPL[] = []

  let state: RunningState = {
    quantity: 0, holding_cost: 0, average_cost: 0,
    last_buy_price: 0, last_buy_date: '',
  }

  for (const tx of sorted) {
    if (tx.transaction_type === 'Buy') {
      const buy_total_cost = tx.quantity * tx.price + tx.fee
      const new_holding_cost = state.holding_cost + buy_total_cost
      const new_quantity = state.quantity + tx.quantity
      state = {
        quantity: new_quantity,
        holding_cost: new_holding_cost,
        average_cost: new_holding_cost / new_quantity,
        last_buy_price: tx.price,
        last_buy_date: tx.trade_date,
      }
    } else {
      const cost_basis = tx.quantity * state.average_cost
      const sell_amount = tx.quantity * tx.price
      const sell_net = sell_amount - tx.fee
      const realized_pl = sell_net - cost_basis
      const new_quantity = state.quantity - tx.quantity
      const new_holding_cost = state.holding_cost - cost_basis

      realizedPLs.push({
        sell_transaction_id: tx.id,
        symbol, name, asset_type,
        sell_date: tx.trade_date,
        quantity_sold: tx.quantity,
        average_cost: state.average_cost,
        sell_price: tx.price,
        sell_amount,
        cost_basis,
        fee: tx.fee,
        realized_pl,
        realized_return_rate: cost_basis > 0 ? (realized_pl / cost_basis) * 100 : 0,
      })

      state = {
        ...state,
        quantity: new_quantity,
        holding_cost: new_quantity > 0 ? new_holding_cost : 0,
        average_cost: new_quantity > 0 ? new_holding_cost / new_quantity : 0,
      }
    }
  }

  return { finalState: state, realizedPLs, symbol, name, asset_type }
}

export function calculateHoldings(
  transactions: DbTransaction[],
  targetPrices: DbTargetPrice[]
): Holding[] {
  if (transactions.length === 0) return []

  const bySymbol = groupBy(transactions, tx => tx.symbol)
  const targetPriceMap = new Map(targetPrices.map(tp => [tp.symbol, tp.target_price]))
  const holdings: Holding[] = []

  for (const [symbol, txs] of bySymbol) {
    const { finalState, name, asset_type } = processTransactions(txs)
    if (finalState.quantity <= 0) continue

    holdings.push({
      symbol,
      name,
      asset_type,
      quantity: finalState.quantity,
      average_cost: finalState.average_cost,
      total_cost: finalState.quantity * finalState.average_cost,
      last_buy_price: finalState.last_buy_price,
      last_buy_date: finalState.last_buy_date,
      target_price: targetPriceMap.get(symbol) ?? null,
    })
  }

  return holdings
}

export function calculateRealizedPL(transactions: DbTransaction[]): RealizedPL[] {
  if (transactions.length === 0) return []

  const bySymbol = groupBy(transactions, tx => tx.symbol)
  const allRealizedPLs: RealizedPL[] = []

  for (const txs of bySymbol.values()) {
    const { realizedPLs } = processTransactions(txs)
    allRealizedPLs.push(...realizedPLs)
  }

  return allRealizedPLs.sort((a, b) => b.sell_date.localeCompare(a.sell_date))
}

export function calculateDashboard(
  transactions: DbTransaction[],
  targetPrices: DbTargetPrice[]
): DashboardSummary {
  const holdings = calculateHoldings(transactions, targetPrices)
  const realizedPLs = calculateRealizedPL(transactions)

  const total_invested = transactions
    .filter(tx => tx.transaction_type === 'Buy')
    .reduce((sum, tx) => sum + tx.quantity * tx.price + tx.fee, 0)

  const current_holding_cost = holdings.reduce((sum, h) => sum + h.total_cost, 0)
  const realized_pl = realizedPLs.reduce((sum, r) => sum + r.realized_pl, 0)
  const total_sold_cost = realizedPLs.reduce((sum, r) => sum + r.cost_basis, 0)

  return {
    total_invested,
    current_holding_cost,
    realized_pl,
    realized_return_rate: total_sold_cost > 0 ? (realized_pl / total_sold_cost) * 100 : 0,
    holding_count: holdings.length,
    portfolio_percentages: holdings.map(h => ({
      symbol: h.symbol,
      name: h.name,
      asset_type: h.asset_type,
      percentage: current_holding_cost > 0 ? (h.total_cost / current_holding_cost) * 100 : 0,
    })),
  }
}
```

- [ ] **Step 4: 執行測試，確認全部通過**

```bash
npx vitest run src/lib/calculations.test.ts
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculations.ts src/lib/calculations.test.ts
git commit -m "feat: add core calculation functions with tests"
```

---

### Task 6: 短線配對計算函數（TDD）

**Files:**
- Create: `src/lib/tradePairCalculations.ts`, `src/lib/tradePairCalculations.test.ts`

- [ ] **Step 1: 建立 src/lib/tradePairCalculations.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import { calculateTradePairRecords, getAvailableBuyQuantity } from './tradePairCalculations'
import { DbTransaction, DbTradePair, RealizedPL } from '../types'

const buyTx: DbTransaction = {
  id: 'buy-1', user_id: 'u1', symbol: 'AAPL', name: 'Apple Inc.',
  asset_type: 'Stock', transaction_type: 'Buy',
  trade_date: '2024-01-01', quantity: 10, price: 150, fee: 0,
  note: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
}

const sellTx: DbTransaction = {
  id: 'sell-1', user_id: 'u1', symbol: 'AAPL', name: 'Apple Inc.',
  asset_type: 'Stock', transaction_type: 'Sell',
  trade_date: '2024-06-01', quantity: 5, price: 200, fee: 0,
  note: null, created_at: '2024-06-01T00:00:00Z', updated_at: '2024-06-01T00:00:00Z',
}

const pair: DbTradePair = {
  id: 'pair-1', user_id: 'u1',
  sell_transaction_id: 'sell-1',
  buy_transaction_id: 'buy-1',
  quantity_used: 5,
  created_at: '2024-06-01T00:00:00Z',
}

// avg_cost=150, cost_basis=5×150=750, sell_net=5×200=1000, realized_pl=250
const realizedPL: RealizedPL = {
  sell_transaction_id: 'sell-1',
  symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'Stock',
  sell_date: '2024-06-01', quantity_sold: 5,
  average_cost: 150, sell_price: 200, sell_amount: 1000,
  cost_basis: 750, fee: 0, realized_pl: 250, realized_return_rate: 33.33,
}

describe('calculateTradePairRecords', () => {
  it('計算自選損益', () => {
    const result = calculateTradePairRecords([pair], [buyTx, sellTx], [realizedPL])
    expect(result).toHaveLength(1)
    expect(result[0].custom_cost_basis).toBe(750)
    expect(result[0].custom_pl).toBe(250)
    expect(result[0].custom_return_rate).toBeCloseTo(33.33, 1)
  })

  it('均成本對照來自 realizedPL', () => {
    const result = calculateTradePairRecords([pair], [buyTx, sellTx], [realizedPL])
    expect(result[0].avg_cost_basis).toBe(750)
    expect(result[0].avg_cost_pl).toBe(250)
  })

  it('一筆賣出對應多筆買入，成本基準加總', () => {
    const buyTx2: DbTransaction = {
      ...buyTx, id: 'buy-2', price: 100, trade_date: '2023-01-01',
      created_at: '2023-01-01T00:00:00Z',
    }
    const pair2: DbTradePair = { ...pair, id: 'pair-2', buy_transaction_id: 'buy-2', quantity_used: 3 }
    const result = calculateTradePairRecords([pair, pair2], [buyTx, buyTx2, sellTx], [realizedPL])
    // custom_cost_basis = 5×150 + 3×100 = 750 + 300 = 1050
    expect(result[0].custom_cost_basis).toBe(1050)
    expect(result[0].custom_buy_lots).toHaveLength(2)
  })
})

describe('getAvailableBuyQuantity', () => {
  it('未配對時可用量 = 原始買入量', () => {
    const qty = getAvailableBuyQuantity('buy-1', buyTx, [])
    expect(qty).toBe(10)
  })

  it('已配對部分，可用量減少', () => {
    const qty = getAvailableBuyQuantity('buy-1', buyTx, [pair])
    expect(qty).toBe(5)
  })

  it('編輯時排除自身配對，可用量不減少', () => {
    const qty = getAvailableBuyQuantity('buy-1', buyTx, [pair], 'sell-1')
    expect(qty).toBe(10)
  })
})
```

- [ ] **Step 2: 執行測試，確認全部失敗**

```bash
npx vitest run src/lib/tradePairCalculations.test.ts
```

Expected: FAIL（函數未定義）

- [ ] **Step 3: 建立 src/lib/tradePairCalculations.ts**

```typescript
import { DbTransaction, DbTradePair, RealizedPL, TradePairRecord } from '../types'

export function calculateTradePairRecords(
  tradePairs: DbTradePair[],
  transactions: DbTransaction[],
  realizedPLs: RealizedPL[]
): TradePairRecord[] {
  const txMap = new Map(transactions.map(tx => [tx.id, tx]))
  const realizedPLMap = new Map(realizedPLs.map(r => [r.sell_transaction_id, r]))

  const pairsBySell = new Map<string, DbTradePair[]>()
  for (const pair of tradePairs) {
    const existing = pairsBySell.get(pair.sell_transaction_id) ?? []
    existing.push(pair)
    pairsBySell.set(pair.sell_transaction_id, existing)
  }

  const records: TradePairRecord[] = []

  for (const [sellId, pairs] of pairsBySell) {
    const sellTx = txMap.get(sellId)
    if (!sellTx) continue

    const custom_buy_lots = pairs
      .map(pair => {
        const buyTx = txMap.get(pair.buy_transaction_id)!
        return {
          buy_transaction_id: pair.buy_transaction_id,
          buy_date: buyTx.trade_date,
          buy_price: buyTx.price,
          quantity_used: pair.quantity_used,
        }
      })
      .sort((a, b) => a.buy_date.localeCompare(b.buy_date))

    const custom_cost_basis = custom_buy_lots.reduce(
      (sum, lot) => sum + lot.quantity_used * lot.buy_price, 0
    )
    const sell_net = sellTx.quantity * sellTx.price - sellTx.fee
    const custom_pl = sell_net - custom_cost_basis
    const custom_return_rate = custom_cost_basis > 0 ? (custom_pl / custom_cost_basis) * 100 : 0

    const rpl = realizedPLMap.get(sellId)

    records.push({
      sell_transaction_id: sellId,
      symbol: sellTx.symbol,
      name: sellTx.name,
      sell_date: sellTx.trade_date,
      sell_price: sellTx.price,
      quantity_sold: sellTx.quantity,
      sell_fee: sellTx.fee,
      custom_cost_basis,
      custom_pl,
      custom_return_rate,
      custom_buy_lots,
      avg_cost_basis: rpl?.cost_basis ?? 0,
      avg_cost_pl: rpl?.realized_pl ?? 0,
      avg_cost_return_rate: rpl?.realized_return_rate ?? 0,
    })
  }

  return records.sort((a, b) => b.sell_date.localeCompare(a.sell_date))
}

export function getAvailableBuyQuantity(
  buyTransactionId: string,
  buyTransaction: DbTransaction,
  allTradePairs: DbTradePair[],
  excludeSellTransactionId?: string
): number {
  const usedQuantity = allTradePairs
    .filter(pair =>
      pair.buy_transaction_id === buyTransactionId &&
      pair.sell_transaction_id !== excludeSellTransactionId
    )
    .reduce((sum, pair) => sum + pair.quantity_used, 0)

  return buyTransaction.quantity - usedQuantity
}
```

- [ ] **Step 4: 執行測試，確認全部通過**

```bash
npx vitest run src/lib/tradePairCalculations.test.ts
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/tradePairCalculations.ts src/lib/tradePairCalculations.test.ts
git commit -m "feat: add trade pair calculation functions with tests"
```

---

### Task 7: 格式化工具函數

**Files:**
- Create: `src/lib/format.ts`

- [ ] **Step 1: 建立 src/lib/format.ts**

```typescript
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatDate(isoDate: string): string {
  return isoDate.replace(/-/g, '/')
}

export function plColorClass(value: number): string {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-500'
  return 'text-gray-600'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/format.ts
git commit -m "feat: add formatting utilities"
```

---

### Task 8: 資料 Hooks

**Files:**
- Create: `src/hooks/useTransactions.ts`, `src/hooks/useTradePairs.ts`

- [ ] **Step 1: 建立 src/hooks/useTransactions.ts**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { DbTransaction, DbTargetPrice, TransactionForm } from '../types'

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
        quantity: parseFloat(form.quantity),
        price: parseFloat(form.price),
        fee: form.fee ? parseFloat(form.fee) : 0,
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
```

- [ ] **Step 2: 建立 src/hooks/useTradePairs.ts**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { DbTradePair, TradePairSelection } from '../types'

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

    await supabase.from('trade_pairs').delete().eq('sell_transaction_id', sellTransactionId)

    const valid = selections.filter(s => parseFloat(s.quantity_used) > 0)
    if (valid.length === 0) return

    const { error } = await supabase.from('trade_pairs').insert(
      valid.map(s => ({
        user_id: user.id,
        sell_transaction_id: sellTransactionId,
        buy_transaction_id: s.buy_transaction_id,
        quantity_used: parseFloat(s.quantity_used),
      }))
    )
    if (error) throw error
    await fetchAll()
  }

  return { tradePairs, loading, savePairs, refetch: fetchAll }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/
git commit -m "feat: add data hooks for transactions and trade pairs"
```

---

### Task 9: Layout + 導航元件

**Files:**
- Modify: `src/components/Layout.tsx`
- Create: `src/components/Sidebar.tsx`, `src/components/BottomNav.tsx`

- [ ] **Step 1: 建立 src/components/BottomNav.tsx**

```tsx
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dash', icon: '📊' },
  { to: '/holdings', label: 'Hold', icon: '📈' },
  { to: '/transactions', label: 'Trans', icon: '💰' },
  { to: '/realized-pl', label: 'P/L', icon: '📋' },
  { to: '/trade-pairs', label: '配對', icon: '🔗' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex md:hidden">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs ${isActive ? 'text-blue-500' : 'text-gray-500'}`
          }
        >
          <span className="text-lg">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: 建立 src/components/Sidebar.tsx**

```tsx
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/holdings', label: 'Holdings', icon: '📈' },
  { to: '/transactions', label: 'Transactions', icon: '💰' },
  { to: '/realized-pl', label: 'Realized P/L', icon: '📋' },
  { to: '/trade-pairs', label: '短線配對', icon: '🔗' },
]

export default function Sidebar() {
  const { signOut } = useAuth()

  return (
    <aside className="w-48 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-200">
        <h1 className="font-bold text-gray-800">Stock Tracker</h1>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1 ${
                isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-700">登出</button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: 更新 src/components/Layout.tsx**

```tsx
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 4: 確認導航正確**

```bash
npm run dev
```

在不同頁面點擊導航，確認高亮正確，手機和桌面版型正常

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout.tsx src/components/Sidebar.tsx src/components/BottomNav.tsx
git commit -m "feat: add responsive layout and navigation"
```

---

### Task 10: GlossaryPanel 元件

**Files:**
- Create: `src/components/GlossaryPanel.tsx`

- [ ] **Step 1: 建立 src/components/GlossaryPanel.tsx**

```tsx
import { useState, useEffect } from 'react'

interface GlossaryItem {
  term: string
  termEn: string
  description: string
  formula?: string
}

interface GlossaryPanelProps {
  pageKey: string
  items: GlossaryItem[]
}

export default function GlossaryPanel({ pageKey, items }: GlossaryPanelProps) {
  const storageKey = `glossary-open-${pageKey}`
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    return saved !== null ? saved === 'true' : true
  })

  useEffect(() => {
    localStorage.setItem(storageKey, String(isOpen))
  }, [isOpen, storageKey])

  return (
    <div className="border border-gray-200 rounded-lg bg-white mt-6">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
      >
        <span>📖 名詞說明</span>
        <span className="text-gray-400">{isOpen ? '收合 ▲' : '展開 ▼'}</span>
      </button>
      {isOpen && (
        <div className="border-t border-gray-200 divide-y divide-gray-100">
          {items.map(item => (
            <div key={item.term} className="px-4 py-3">
              <div className="font-medium text-gray-800 text-sm">
                {item.term} <span className="text-gray-400 font-normal">{item.termEn}</span>
              </div>
              <div className="text-gray-600 text-sm mt-1">{item.description}</div>
              {item.formula && (
                <div className="text-gray-500 text-xs mt-1 font-mono bg-gray-50 px-2 py-1 rounded">
                  {item.formula}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GlossaryPanel.tsx
git commit -m "feat: add collapsible GlossaryPanel component"
```

---

### Task 11: Transactions 頁面（買入）

**Files:**
- Create: `src/components/TransactionForm.tsx`
- Modify: `src/pages/Transactions.tsx`

- [ ] **Step 1: 建立 src/components/TransactionForm.tsx**

```tsx
import { useState } from 'react'
import { TransactionForm as TForm, TradePairSelection } from '../types'

const EMPTY_FORM: TForm = {
  symbol: '', name: '', asset_type: 'Stock', transaction_type: 'Buy',
  trade_date: new Date().toISOString().split('T')[0],
  quantity: '', price: '', fee: '', note: '',
}

interface Props {
  onSubmit: (form: TForm, pairSelections: TradePairSelection[]) => Promise<void>
  onClose: () => void
  // 賣出配對需要的資料（Task 12 加入）
  buyLotSelectorSlot?: React.ReactNode
}

export default function TransactionForm({ onSubmit, onClose, buyLotSelectorSlot }: Props) {
  const [form, setForm] = useState<TForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof TForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(form, [])
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
```

- [ ] **Step 2: 更新 src/pages/Transactions.tsx**

```tsx
import { useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useTradePairs } from '../hooks/useTradePairs'
import { formatCurrency, formatDate } from '../lib/format'
import TransactionForm from '../components/TransactionForm'
import GlossaryPanel from '../components/GlossaryPanel'
import { TransactionForm as TForm, TradePairSelection } from '../types'

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
    if (form.transaction_type === 'Sell' && pairSelections.some(s => parseFloat(s.quantity_used) > 0)) {
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
```

- [ ] **Step 3: 測試買入流程**

```bash
npm run dev
```

新增一筆買入交易，確認列表出現且資料正確

- [ ] **Step 4: Commit**

```bash
git add src/components/TransactionForm.tsx src/pages/Transactions.tsx
git commit -m "feat: add transactions page and buy transaction form"
```

---

### Task 12: 賣出表單配對步驟

**Files:**
- Create: `src/components/BuyLotSelector.tsx`
- Modify: `src/components/TransactionForm.tsx`, `src/pages/Transactions.tsx`

- [ ] **Step 1: 建立 src/components/BuyLotSelector.tsx**

```tsx
import { DbTransaction, DbTradePair, TradePairSelection } from '../types'
import { getAvailableBuyQuantity } from '../lib/tradePairCalculations'
import { formatCurrency, formatDate } from '../lib/format'

interface Props {
  symbol: string
  sellQuantity: number
  sellPrice: number
  sellFee: number
  buyTransactions: DbTransaction[]
  allTradePairs: DbTradePair[]
  excludeSellId?: string
  selections: TradePairSelection[]
  onChange: (selections: TradePairSelection[]) => void
}

export default function BuyLotSelector({
  symbol, sellQuantity, sellPrice, sellFee,
  buyTransactions, allTradePairs, excludeSellId,
  selections, onChange,
}: Props) {
  const symbolBuys = buyTransactions
    .filter(tx => tx.symbol === symbol && tx.transaction_type === 'Buy')
    .sort((a, b) => b.trade_date.localeCompare(a.trade_date))

  const selectionMap = new Map(selections.map(s => [s.buy_transaction_id, s.quantity_used]))

  const toggleSelect = (buy: DbTransaction) => {
    if (selectionMap.has(buy.id)) {
      onChange(selections.filter(s => s.buy_transaction_id !== buy.id))
    } else {
      onChange([...selections, { buy_transaction_id: buy.id, quantity_used: '' }])
    }
  }

  const setQuantity = (buyId: string, qty: string) =>
    onChange(selections.map(s => s.buy_transaction_id === buyId ? { ...s, quantity_used: qty } : s))

  const customCostBasis = selections.reduce((sum, s) => {
    const buy = buyTransactions.find(tx => tx.id === s.buy_transaction_id)
    const qty = parseFloat(s.quantity_used)
    if (!buy || isNaN(qty)) return sum
    return sum + qty * buy.price
  }, 0)

  const sellNet = sellQuantity * sellPrice - sellFee
  const customPL = customCostBasis > 0 ? sellNet - customCostBasis : null

  return (
    <div className="border-t border-gray-200 pt-4 mt-2">
      <p className="text-sm font-medium text-gray-700 mb-1">比較買入（選填）</p>
      <p className="text-xs text-gray-400 mb-3">{symbol} 的歷史買入紀錄</p>

      {symbolBuys.length === 0 && (
        <p className="text-sm text-gray-400">尚無此標的的買入紀錄</p>
      )}

      <div className="space-y-2">
        {symbolBuys.map(buy => {
          const available = getAvailableBuyQuantity(buy.id, buy, allTradePairs, excludeSellId)
          const selected = selectionMap.has(buy.id)
          const qtyValue = selectionMap.get(buy.id) ?? ''

          return (
            <div key={buy.id}
              className={`border rounded-lg p-3 ${selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selected}
                  onChange={() => toggleSelect(buy)}
                  disabled={available <= 0 && !selected}
                  className="w-4 h-4" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {formatDate(buy.trade_date)}　{formatCurrency(buy.price)} × {buy.quantity} 股
                  </div>
                  <div className="text-xs text-gray-400">可用：{available} 股</div>
                </div>
                {selected && (
                  <div className="flex items-center gap-1">
                    <input type="number" min="0.001" max={available} step="any"
                      value={qtyValue} onChange={e => setQuantity(buy.id, e.target.value)}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-blue-500"
                      placeholder="0" />
                    <span className="text-xs text-gray-400">股</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {customCostBasis > 0 && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm space-y-1">
          <div className="text-gray-600">自選成本基準：<span className="font-medium">{formatCurrency(customCostBasis)}</span></div>
          {customPL !== null && (
            <div className={customPL >= 0 ? 'text-green-600' : 'text-red-500'}>
              自選損益：<span className="font-medium">{customPL >= 0 ? '+' : ''}{formatCurrency(customPL)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 更新 TransactionForm.tsx，連接 BuyLotSelector**

將 `TransactionForm` 改為接受外部傳入的 slot，並在賣出時顯示。修改 `onSubmit` 型別讓它傳出 pairSelections：

在 `Transactions.tsx` 裡，改成在 `showForm` 時，用 `useState` 管理 `pairSelections` 和 `currentForm`，並傳入 `BuyLotSelector` 作為 slot：

```tsx
// 在 Transactions.tsx 加入
import BuyLotSelector from '../components/BuyLotSelector'

// showForm modal 裡改成：
const [pairSelections, setPairSelections] = useState<TradePairSelection[]>([])
const [currentFormType, setCurrentFormType] = useState<'Buy' | 'Sell'>('Buy')
const [currentSymbol, setCurrentSymbol] = useState('')
const [currentQty, setCurrentQty] = useState(0)
const [currentPrice, setCurrentPrice] = useState(0)
const [currentFee, setCurrentFee] = useState(0)
```

**更簡單的做法：** 直接在 `TransactionForm` 的 `onSubmit` 呼叫前，由 `TransactionForm` 內部維護 `pairSelections`，並透過修改過的 `handleSubmit` 傳出。

修改 `TransactionForm.tsx`：

```tsx
// 在 Props 加入
interface Props {
  onSubmit: (form: TForm, pairSelections: TradePairSelection[]) => Promise<void>
  onClose: () => void
  buyTransactions: DbTransaction[]
  allTradePairs: DbTradePair[]
}

// 在 component 內加入 state
const [pairSelections, setPairSelections] = useState<TradePairSelection[]>([])

// handleSubmit 改為傳出 pairSelections
await onSubmit(form, form.transaction_type === 'Sell' ? pairSelections : [])

// buyLotSelectorSlot 改為由內部渲染，條件為 Sell 且 symbol 已填：
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
```

在 `Transactions.tsx` 傳入需要的 props：

```tsx
<TransactionForm
  onSubmit={handleSubmit}
  onClose={() => setShowForm(false)}
  buyTransactions={transactions}
  allTradePairs={tradePairs}
/>
```

- [ ] **Step 3: 測試完整賣出配對流程**

1. 先新增至少一筆買入（例如 AAPL 10 股 @ $150）
2. 新增賣出交易（AAPL 5 股 @ $200），選擇「賣出」
3. 確認出現配對區塊，且 AAPL 買入批次可見、可用量正確
4. 打勾選擇、輸入配對股數 5
5. 確認即時預覽損益：自選成本 $750，損益 +$250
6. 儲存，無報錯
7. 到 /trade-pairs 確認配對紀錄出現

- [ ] **Step 4: Commit**

```bash
git add src/components/BuyLotSelector.tsx src/components/TransactionForm.tsx src/pages/Transactions.tsx
git commit -m "feat: add sell transaction with buy lot pairing"
```

---

### Task 13: Holdings 頁面

**Files:**
- Modify: `src/pages/Holdings.tsx`

- [ ] **Step 1: 更新 src/pages/Holdings.tsx**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions } from '../hooks/useTransactions'
import { calculateHoldings } from '../lib/calculations'
import { formatCurrency, formatDate } from '../lib/format'
import GlossaryPanel from '../components/GlossaryPanel'

const glossaryItems = [
  { term: '平均成本', termEn: 'Average Cost', description: '持有期間所有買入成本的加權平均（含手續費）', formula: '總買入成本 ÷ 持有股數' },
  { term: '持股總成本', termEn: 'Total Cost', description: '持有股數 × 平均成本', formula: '持有股數 × 平均成本' },
  { term: '最近買入價', termEn: 'Last Buy Price', description: '最後一次買入的實際成交價，不含手續費' },
  { term: '目標價', termEn: 'Target Price', description: '你手動設定的觀察低點或理想買入價，不影響任何計算' },
]

export default function Holdings() {
  const { transactions, targetPrices, loading, upsertTargetPrice } = useTransactions()
  const navigate = useNavigate()
  const [editTarget, setEditTarget] = useState<{ symbol: string; value: string } | null>(null)
  const holdings = calculateHoldings(transactions, targetPrices)

  if (loading) return <div className="p-4">載入中...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Holdings</h1>

      {editTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold mb-4">編輯目標價 - {editTarget.symbol}</h2>
            <input type="number" min="0" step="any" value={editTarget.value}
              onChange={e => setEditTarget(prev => prev ? { ...prev, value: e.target.value } : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="留空表示清除" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditTarget(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">取消</button>
              <button
                onClick={async () => {
                  await upsertTargetPrice(editTarget.symbol, editTarget.value ? parseFloat(editTarget.value) : null)
                  setEditTarget(null)
                }}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm">儲存</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {holdings.map(h => (
          <div key={h.symbol}
            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300"
            onClick={() => navigate(`/holdings/${h.symbol}`)}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="font-bold">{h.symbol}</span>
                <span className="text-xs text-gray-400 ml-2">{h.asset_type}</span>
              </div>
              <span className="text-sm text-gray-500">{h.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mb-3">
              <div><div className="text-xs text-gray-400">持有</div><div className="font-medium">{h.quantity} 股</div></div>
              <div><div className="text-xs text-gray-400">均價</div><div className="font-medium">{formatCurrency(h.average_cost)}</div></div>
              <div><div className="text-xs text-gray-400">成本</div><div className="font-medium">{formatCurrency(h.total_cost)}</div></div>
            </div>
            <div className="border-t border-gray-100 pt-2 space-y-1 text-xs text-gray-500">
              <div>最近買入：{formatCurrency(h.last_buy_price)} · {formatDate(h.last_buy_date)}</div>
              <div className="flex items-center gap-2">
                目標價：{h.target_price ? formatCurrency(h.target_price) : '--'}
                <button
                  onClick={e => { e.stopPropagation(); setEditTarget({ symbol: h.symbol, value: h.target_price?.toString() ?? '' }) }}
                  className="text-blue-400 hover:text-blue-600">✏️</button>
              </div>
            </div>
          </div>
        ))}
        {holdings.length === 0 && <p className="text-center text-gray-400 py-8">尚無持股</p>}
      </div>

      <GlossaryPanel pageKey="holdings" items={glossaryItems} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Holdings.tsx
git commit -m "feat: add holdings page with target price editing"
```

---

### Task 14: Realized P/L 頁面

**Files:**
- Modify: `src/pages/RealizedPL.tsx`

- [ ] **Step 1: 更新 src/pages/RealizedPL.tsx**

```tsx
import { useTransactions } from '../hooks/useTransactions'
import { calculateRealizedPL } from '../lib/calculations'
import { formatCurrency, formatPercent, formatDate, plColorClass } from '../lib/format'
import GlossaryPanel from '../components/GlossaryPanel'

const glossaryItems = [
  { term: '平均成本', termEn: 'Average Cost', description: '賣出當下的加權平均買入成本' },
  { term: '成本基準', termEn: 'Cost Basis', description: '賣出股數 × 賣出當下的平均成本', formula: '賣出股數 × 平均成本' },
  { term: '已實現損益', termEn: 'Realized P/L', description: '賣出淨收入 − 成本基準', formula: '(賣出股數 × 賣出價 − 手續費) − 成本基準' },
  { term: '已實現報酬率', termEn: 'Realized Return', description: '已實現損益 ÷ 成本基準', formula: '已實現損益 ÷ 成本基準 × 100%' },
]

export default function RealizedPL() {
  const { transactions, loading } = useTransactions()
  const records = calculateRealizedPL(transactions)

  const totalProfit = records.filter(r => r.realized_pl > 0).reduce((s, r) => s + r.realized_pl, 0)
  const totalLoss = records.filter(r => r.realized_pl < 0).reduce((s, r) => s + r.realized_pl, 0)
  const netPL = records.reduce((s, r) => s + r.realized_pl, 0)
  const totalCostBasis = records.reduce((s, r) => s + r.cost_basis, 0)
  const avgReturn = totalCostBasis > 0 ? (netPL / totalCostBasis) * 100 : 0

  if (loading) return <div className="p-4">載入中...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Realized P/L</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">總獲利</div>
          <div className="font-bold text-green-600">{formatCurrency(totalProfit)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">總虧損</div>
          <div className="font-bold text-red-500">{formatCurrency(totalLoss)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">淨損益</div>
          <div className={`font-bold ${plColorClass(netPL)}`}>{formatCurrency(netPL)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">平均報酬率</div>
          <div className={`font-bold ${plColorClass(avgReturn)}`}>{formatPercent(avgReturn)}</div>
        </div>
      </div>

      <div className="space-y-3">
        {records.map(r => (
          <div key={r.sell_transaction_id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold">{r.symbol}</span>
                <span className="text-xs text-gray-400">{r.asset_type}</span>
              </div>
              <span className="text-xs text-gray-400">{formatDate(r.sell_date)}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>賣出 {r.quantity_sold} 股 × {formatCurrency(r.sell_price)}</div>
              <div>成本基準：{formatCurrency(r.cost_basis)}（均價 {formatCurrency(r.average_cost)}）</div>
              {r.fee > 0 && <div>手續費：{formatCurrency(r.fee)}</div>}
            </div>
            <div className={`mt-2 font-bold ${plColorClass(r.realized_pl)}`}>
              {formatCurrency(r.realized_pl)} ({formatPercent(r.realized_return_rate)})
            </div>
          </div>
        ))}
        {records.length === 0 && <p className="text-center text-gray-400 py-8">尚無已實現損益紀錄</p>}
      </div>

      <GlossaryPanel pageKey="realized-pl" items={glossaryItems} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/RealizedPL.tsx
git commit -m "feat: add realized P/L page"
```

---

### Task 15: Short-term Pairs 頁面

**Files:**
- Modify: `src/pages/TradePairs.tsx`

- [ ] **Step 1: 更新 src/pages/TradePairs.tsx**

```tsx
import { useTransactions } from '../hooks/useTransactions'
import { useTradePairs } from '../hooks/useTradePairs'
import { calculateRealizedPL } from '../lib/calculations'
import { calculateTradePairRecords } from '../lib/tradePairCalculations'
import { formatCurrency, formatPercent, formatDate, plColorClass } from '../lib/format'
import GlossaryPanel from '../components/GlossaryPanel'

const glossaryItems = [
  { term: '自選成本基準', termEn: 'Custom Cost Basis', description: '你選擇的買入批次的加權總成本', formula: 'Σ (配對股數 × 買入價)' },
  { term: '自選損益', termEn: 'Custom P/L', description: '賣出淨收入 − 自選成本基準', formula: '賣出淨收入 − 自選成本基準' },
  { term: '自選報酬率', termEn: 'Custom Return', description: '自選損益 ÷ 自選成本基準', formula: '自選損益 ÷ 自選成本基準 × 100%' },
  { term: '均成本損益', termEn: 'Avg Cost P/L', description: '與 Realized P/L 頁面相同的計算，此處供對照用' },
]

export default function TradePairs() {
  const { transactions, loading: txLoading } = useTransactions()
  const { tradePairs, loading: pairsLoading } = useTradePairs()

  const realizedPLs = calculateRealizedPL(transactions)
  const records = calculateTradePairRecords(tradePairs, transactions, realizedPLs)

  const totalCustomPL = records.reduce((s, r) => s + r.custom_pl, 0)
  const totalCustomCostBasis = records.reduce((s, r) => s + r.custom_cost_basis, 0)
  const avgCustomReturn = totalCustomCostBasis > 0 ? (totalCustomPL / totalCustomCostBasis) * 100 : 0

  if (txLoading || pairsLoading) return <div className="p-4">載入中...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">短線配對</h1>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">配對筆數</div>
          <div className="font-bold text-xl">{records.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">自選總損益</div>
          <div className={`font-bold ${plColorClass(totalCustomPL)}`}>{formatCurrency(totalCustomPL)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">平均自選報酬率</div>
          <div className={`font-bold ${plColorClass(avgCustomReturn)}`}>{formatPercent(avgCustomReturn)}</div>
        </div>
      </div>

      <div className="space-y-3">
        {records.map(r => (
          <div key={r.sell_transaction_id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold">{r.symbol}</span>
              <span className="text-xs text-gray-400">{formatDate(r.sell_date)}</span>
            </div>
            <div className="text-sm text-gray-600 mb-3">
              賣出 {r.quantity_sold} 股 × {formatCurrency(r.sell_price)}
            </div>
            <div className="text-xs text-gray-400 mb-1">配對買入</div>
            <div className="space-y-1 mb-3">
              {r.custom_buy_lots.map(lot => (
                <div key={lot.buy_transaction_id} className="text-sm text-gray-600">
                  {formatDate(lot.buy_date)}　{formatCurrency(lot.buy_price)} × {lot.quantity_used} 股
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
              <div>
                <div className="text-xs text-blue-500 font-medium mb-1">自選報酬率</div>
                <div className={`font-bold ${plColorClass(r.custom_pl)}`}>{formatCurrency(r.custom_pl)}</div>
                <div className={`text-sm ${plColorClass(r.custom_return_rate)}`}>{formatPercent(r.custom_return_rate)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium mb-1">均成本對照</div>
                <div className={`font-bold ${plColorClass(r.avg_cost_pl)}`}>{formatCurrency(r.avg_cost_pl)}</div>
                <div className={`text-sm ${plColorClass(r.avg_cost_return_rate)}`}>{formatPercent(r.avg_cost_return_rate)}</div>
              </div>
            </div>
          </div>
        ))}
        {records.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            尚無配對紀錄。在新增賣出交易時，選擇「比較買入」即可建立配對。
          </p>
        )}
      </div>

      <GlossaryPanel pageKey="trade-pairs" items={glossaryItems} />
    </div>
  )
}
```

- [ ] **Step 2: 測試短線配對頁面**

確認有配對資料後到 /trade-pairs，驗證：
1. 摘要數字正確
2. 每筆配對顯示自選損益和均成本對照
3. 兩欄數字與手動計算一致

- [ ] **Step 3: Commit**

```bash
git add src/pages/TradePairs.tsx
git commit -m "feat: add short-term trade pairs page"
```

---

### Task 16: Dashboard 頁面

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: 更新 src/pages/Dashboard.tsx**

```tsx
import { useTransactions } from '../hooks/useTransactions'
import { calculateDashboard } from '../lib/calculations'
import { formatCurrency, formatPercent, plColorClass } from '../lib/format'
import GlossaryPanel from '../components/GlossaryPanel'

const glossaryItems = [
  { term: '總投入成本', termEn: 'Total Invested', description: '所有買入交易的金額加總（含手續費）', formula: 'Σ (買入股數 × 買入價 + 手續費)' },
  { term: '持股成本', termEn: 'Current Holding Cost', description: '目前持有部位的總成本，已賣出部分不計' },
  { term: '已實現損益', termEn: 'Realized P/L', description: '所有賣出交易的損益加總' },
  { term: '已實現報酬率', termEn: 'Realized Return Rate', description: '已實現損益 ÷ 所有已賣出部位的成本基準', formula: '已實現損益 ÷ 已賣出總成本基準 × 100%' },
  { term: '持股占比', termEn: 'Portfolio %', description: '各標的持股成本 ÷ 全部持股總成本', formula: '單一標的成本 ÷ 全部持股總成本 × 100%' },
]

export default function Dashboard() {
  const { transactions, targetPrices, loading } = useTransactions()
  const summary = calculateDashboard(transactions, targetPrices)

  if (loading) return <div className="p-4">載入中...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">總投入成本</div>
          <div className="font-bold">{formatCurrency(summary.total_invested)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">持股成本</div>
          <div className="font-bold">{formatCurrency(summary.current_holding_cost)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">已實現損益</div>
          <div className={`font-bold ${plColorClass(summary.realized_pl)}`}>{formatCurrency(summary.realized_pl)}</div>
          <div className={`text-xs ${plColorClass(summary.realized_return_rate)}`}>{formatPercent(summary.realized_return_rate)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-400">持股檔數</div>
          <div className="font-bold text-xl">{summary.holding_count}</div>
        </div>
      </div>

      {summary.portfolio_percentages.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-medium text-sm text-gray-700 mb-3">持股占比</h2>
          <div className="space-y-2">
            {summary.portfolio_percentages
              .sort((a, b) => b.percentage - a.percentage)
              .map(item => (
                <div key={item.symbol}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{item.symbol}</span>
                    <span className="text-gray-500">{item.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 rounded-full h-2" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <GlossaryPanel pageKey="dashboard" items={glossaryItems} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add dashboard page"
```

---

### Task 17: Stock Detail 頁面

**Files:**
- Modify: `src/pages/StockDetail.tsx`

- [ ] **Step 1: 更新 src/pages/StockDetail.tsx**

```tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useTransactions } from '../hooks/useTransactions'
import { calculateHoldings, calculateRealizedPL } from '../lib/calculations'
import { formatCurrency, formatPercent, formatDate, plColorClass } from '../lib/format'
import GlossaryPanel from '../components/GlossaryPanel'

const glossaryItems = [
  { term: '平均成本', termEn: 'Average Cost', description: '此標的目前持有的加權平均買入成本' },
  { term: '已實現損益', termEn: 'Realized P/L', description: '此標的所有賣出紀錄的損益加總' },
]

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>()
  const navigate = useNavigate()
  const { transactions, targetPrices, loading } = useTransactions()

  if (loading) return <div className="p-4">載入中...</div>
  if (!symbol) return null

  const symbolTxs = transactions.filter(tx => tx.symbol === symbol)
  const holding = calculateHoldings(symbolTxs, targetPrices)[0] ?? null
  const realizedPLs = calculateRealizedPL(symbolTxs)
  const totalRealizedPL = realizedPLs.reduce((s, r) => s + r.realized_pl, 0)
  const totalCostBasis = realizedPLs.reduce((s, r) => s + r.cost_basis, 0)

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <button onClick={() => navigate('/holdings')} className="text-blue-500 text-sm mb-4 flex items-center gap-1">
        ← 返回 Holdings
      </button>
      <h1 className="text-xl font-bold mb-4">{symbol}</h1>

      {holding ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="text-sm text-gray-500 mb-3">{holding.name} · {holding.asset_type}</div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><div className="text-xs text-gray-400">持有</div><div className="font-medium">{holding.quantity} 股</div></div>
            <div><div className="text-xs text-gray-400">均價</div><div className="font-medium">{formatCurrency(holding.average_cost)}</div></div>
            <div><div className="text-xs text-gray-400">成本</div><div className="font-medium">{formatCurrency(holding.total_cost)}</div></div>
          </div>
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <div>最近買入：{formatCurrency(holding.last_buy_price)} · {formatDate(holding.last_buy_date)}</div>
            <div>目標價：{holding.target_price ? formatCurrency(holding.target_price) : '--'}</div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-sm text-gray-500">目前無持股</div>
      )}

      {realizedPLs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">已實現損益摘要</div>
          <div className={`text-lg font-bold ${plColorClass(totalRealizedPL)}`}>{formatCurrency(totalRealizedPL)}</div>
          {totalCostBasis > 0 && (
            <div className={`text-sm ${plColorClass(totalRealizedPL / totalCostBasis * 100)}`}>
              {formatPercent(totalRealizedPL / totalCostBasis * 100)}
            </div>
          )}
        </div>
      )}

      <h2 className="font-medium text-gray-700 mb-3">交易明細</h2>
      <div className="space-y-2">
        {[...symbolTxs]
          .sort((a, b) => b.trade_date.localeCompare(a.trade_date))
          .map(tx => (
            <div key={tx.id} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded ${tx.transaction_type === 'Buy' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {tx.transaction_type === 'Buy' ? '買入' : '賣出'}
                  </span>
                  <div className="text-sm mt-1">{tx.quantity} 股 × {formatCurrency(tx.price)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">{formatDate(tx.trade_date)}</div>
                  <div className="text-sm font-medium">{formatCurrency(tx.quantity * tx.price)}</div>
                </div>
              </div>
            </div>
          ))}
      </div>

      <GlossaryPanel pageKey={`stock-detail-${symbol}`} items={glossaryItems} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/StockDetail.tsx
git commit -m "feat: add stock detail page"
```

---

## 規格覆蓋率自我審查

| 規格需求 | 對應 Task |
|---------|-----------|
| 買入 / 賣出交易 CRUD | Task 11, 12 |
| 持股計算（平均成本法）| Task 5 |
| 最近買入價、買入日 | Task 5 |
| 目標價（Holdings 手動編輯）| Task 13 |
| 已實現損益計算 | Task 5 |
| Dashboard 摘要 + 持股占比 | Task 5, 16 |
| Stock Detail 頁面 | Task 17 |
| trade_pairs 資料表建立 | Task 3 |
| 短線配對計算函數（TDD）| Task 6 |
| 可用股數限制（應用層驗證）| Task 6, 12 |
| 賣出表單配對步驟 | Task 12 |
| 短線配對頁面（自選 + 均成本對照）| Task 15 |
| 名詞說明區（每頁）| Task 10, 各頁 |
| Google OAuth + 路由保護 | Task 4 |
| 響應式導航（手機 + 桌面）| Task 9 |
| Cascade 刪除（買入 / 賣出刪除帶走配對）| Task 3（SQL ON DELETE CASCADE）|

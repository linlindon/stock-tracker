# Stock API 串接設計文件（第二階段）

## 目標

串接 Finnhub API，為 app 加入即時股價功能：
1. 新增交易時輸入代號可搜尋公司名稱
2. Holdings 頁面顯示現價與未實現損益
3. Dashboard 顯示總市值、未實現損益、圓餅圖（市值占比）

## 技術選擇

- **API 提供商**：Finnhub（免費方案 60 次/分鐘）
- **呼叫方式**：直接從前端呼叫（API key 存於 `.env.local`）
- **圖表套件**：Recharts

## 新增型別

```typescript
interface StockQuote {
  symbol: string
  current_price: number
  change: number         // 今日漲跌金額
  change_percent: number // 今日漲跌幅 %
}

interface SymbolSearchResult {
  symbol: string
  name: string
  type: string // 'Common Stock' | 'ETP' 等
}
```

## 檔案結構

### 新增

**`src/lib/finnhub.ts`**
- `getQuote(symbol: string): Promise<StockQuote | null>`
  - 呼叫 `GET /quote`
  - 失敗或找不到時回傳 `null`
- `searchSymbol(query: string): Promise<SymbolSearchResult[]>`
  - 呼叫 `GET /search`
  - 只回傳美股（過濾 type 非 'Common Stock' 和 'ETP'）

**`src/hooks/useStockPrices.ts`**
- 接受 `symbols: string[]`
- 進頁面時自動抓一次（useEffect）
- 提供 `prices: Map<string, StockQuote>`、`loading: boolean`、`refresh(): void`
- 抓取失敗不 throw，靜默處理（顯示 `--`）

### 修改

**`src/pages/Holdings.tsx`**
- 使用 `useStockPrices`，傳入目前持有的 symbols
- 每張卡片新增：現價、未實現損益、未實現報酬率
- 頁面頂部新增摘要列：總市值、未實現損益合計、刷新按鈕
- 現價抓不到時相關欄位顯示 `--`

**`src/pages/Dashboard.tsx`**
- 新增摘要卡片：總市值、未實現損益
- 持股占比圓餅圖（Recharts `PieChart`），數據改用市值計算
- 原有的長條占比保留

**`src/components/TransactionForm.tsx`**
- 代號輸入框加 debounce（500ms）搜尋
- 搜尋結果以下拉選單顯示（代號 + 名稱）
- 點選後自動填入 symbol 和 name 欄位
- 搜尋中顯示 loading 狀態；無結果顯示提示文字

## 計算定義

```
未實現損益 = (現價 - 平均成本) × 持有股數
未實現報酬率 = 未實現損益 / 持股總成本 × 100%
總市值 = Σ (現價 × 持有股數)
```

## 錯誤處理

- Finnhub API 失敗 → 現價相關欄位顯示 `--`，不影響成本/損益計算
- 搜尋 API 失敗 → 不顯示下拉選單，使用者可手動輸入
- API key 未設定 → console.warn，功能靜默降級

## 環境變數

```env
VITE_FINNHUB_API_KEY=your_api_key
```

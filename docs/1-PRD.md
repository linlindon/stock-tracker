# 美股 / ETF 投資記錄網站
## 產品需求文件 (PRD) v2

> 基於 stock-project.md v1 升級，整合新需求與技術決策

---

## 一、專案定位

本專案是一個提供給個人使用的美股 / ETF 投資記錄工具，目標是用最簡單的方式記錄交易、查看目前持股、了解已實現與未實現損益，以及追蹤有興趣的觀察標的。

### 核心痛點（本專案要解決的問題）
1. **快速查看某股票「最近一次買入價格」** - 不用翻交易紀錄
2. **記錄「觀察的低點/目標價」** - 手動輸入想買進的價格
3. **跨裝置使用** - 電腦和手機都能存取相同資料

### 設計原則
- 自己使用，不需過度商業化 UI
- 手機也可操作（響應式設計）
- 欄位清楚、資訊直接
- 一開始就完整串接，不做分階段資料遷移

---

## 二、技術決策

| 項目 | 決策 | 原因 |
|------|------|------|
| 資料儲存 | Supabase | 跨裝置同步、免費額度足夠個人使用 |
| 認證方式 | Google OAuth | 最簡單的登入方式 |
| 前端框架 | React + Vite + TypeScript | 快速開發、型別安全 |
| 樣式 | Tailwind CSS | 快速開發響應式設計 |

### 注意事項
- Supabase 免費方案：7 天無活動會暫停（資料不會刪除）
- 建議每週至少使用一次，或設定自動 ping

### 資料輸入規則
- `symbol` 一律轉成大寫後儲存（例如：`aapl` -> `AAPL`）
- `symbol`、`name`、`assetType` 後續可串股票 API 自動帶入，但仍需以前端與資料庫規則保證格式一致
- 在尚未串接股票 API 前，允許手動輸入 `name`

---

## 三、頁面順序

依照使用頻率與重要性：

1. **Dashboard** - 整體摘要
2. **Holdings** - 目前持股（高頻使用）
3. **Transactions** - 交易紀錄
4. **Realized P/L** - 已實現損益

後續擴充：
5. **Stock Detail** - 個股明細頁
6. **Short-term Pairs（短線配對）** - 自選買入配對追蹤
7. **Watchlist** - 觀察清單
8. **Dividends** - 股息紀錄
9. **Analytics** - 圖表分析

---

## 四、頁面規格

### 1. Dashboard

#### 頁面目的
顯示整體投資摘要，讓使用者快速了解目前美股 / ETF 投資狀況。

#### A. 摘要卡片區

| 欄位 | Key | 說明 |
|------|-----|------|
| 總投入成本 | `totalInvested` | 所有買入交易累積投入的總金額 |
| 持股總成本 | `currentHoldingCost` | 目前仍持有部位的總成本 |
| 已實現損益 | `realizedProfitLoss` | 已賣出部分的總損益 |
| 已實現報酬率 | `realizedReturnRate` | 已賣出部分整體報酬率 |
| 持股檔數 | `holdingCount` | 目前仍持有的標的數量 |

#### B. 持股占比區

| 欄位 | Key | 說明 |
|------|-----|------|
| 代號 | `symbol` | |
| 名稱 | `name` | |
| 類型 | `assetType` | Stock / ETF |
| 占總資產比例 | `portfolioPercentage` | 某標的成本 / 全部持股總成本 |

#### C. 說明
- Dashboard 第一版以**成本視角**為主，不顯示即時市值
- `portfolioPercentage` 在第一版代表**持股成本占比**，不是即時市值占比
- 即時市值、未實現損益、報價更新屬於後續擴充

---

### 2. Holdings

#### 頁面目的
顯示目前仍持有的所有股票 / ETF，是本工具**高頻使用頁面**。

#### A. 持股列表欄位

| 欄位 | Key | 說明 | 備註 |
|------|-----|------|------|
| 代號 | `symbol` | | |
| 名稱 | `name` | | |
| 類型 | `assetType` | Stock / ETF | |
| 持有股數 | `quantity` | | |
| 平均成本 | `averageCost` | 使用平均成本法計算 | |
| 持股總成本 | `totalCost` | quantity × averageCost | |
| **最近買入價** | `lastBuyPrice` | 最近一次買入的成交價 | **v2 新增** |
| **最近買入日** | `lastBuyDate` | 最近一次買入的日期 | **v2 新增** |
| **目標價/低點** | `targetPrice` | 手動輸入的觀察價格 | **v2 新增** |

#### B. 互動功能
- 點擊目標價可編輯
- 點擊股票可查看該股票的交易明細（導向 Stock Detail 頁）

#### C. 說明
此頁只顯示 `quantity > 0` 的持股，不顯示已完全賣出的標的。

---

### 3. Transactions

#### 頁面目的
記錄所有買入 / 賣出交易，是所有計算的**原始資料來源**。

#### A. 交易列表欄位

| 欄位 | Key | 說明 |
|------|-----|------|
| 交易日期 | `tradeDate` | |
| 代號 | `symbol` | |
| 名稱 | `name` | |
| 類型 | `assetType` | Stock / ETF |
| 交易類型 | `transactionType` | Buy / Sell |
| 股數 | `quantity` | |
| 成交價 | `price` | |
| 總金額 | `totalAmount` | quantity × price |
| 手續費 | `fee` | 選填 |
| 淨金額 | `netAmount` | 買入：總金額+手續費 / 賣出：總金額-手續費 |
| 備註 | `note` | 選填 |

#### B. 新增 / 編輯交易表單

**必填欄位：**
1. 交易日期
2. 代號
3. 名稱
4. 類型（Stock / ETF）
5. 買入 / 賣出
6. 股數
7. 成交價

**選填欄位：**
8. 手續費
9. 備註

---

### 4. Realized P/L

#### 頁面目的
查看已賣出交易的成果，重點是每筆賣出報酬率。

#### A. 列表欄位

| 欄位 | Key | 說明 |
|------|-----|------|
| 代號 | `symbol` | |
| 名稱 | `name` | |
| 類型 | `assetType` | |
| 賣出日期 | `sellDate` | |
| 賣出股數 | `quantitySold` | |
| 平均成本 | `averageCost` | 賣出當時的平均成本 |
| 賣出價格 | `sellPrice` | |
| 賣出收入 | `sellAmount` | |
| 對應成本 | `costBasis` | |
| 手續費 | `fee` | |
| 已實現損益 | `realizedProfitLoss` | |
| 已實現報酬率 | `realizedReturnRate` | |

#### B. 頁面摘要

| 欄位 | Key |
|------|-----|
| 已賣出總獲利 | `totalRealizedProfit` |
| 已賣出總虧損 | `totalRealizedLoss` |
| 淨已實現損益 | `netRealizedProfitLoss` |
| 平均已實現報酬率 | `averageRealizedReturnRate` |

---

### 5. Stock Detail

#### 頁面目的
查看單一股票 / ETF 的完整交易歷史、目前持股狀態與已實現損益，是從 Holdings 點擊標的後進入的明細頁。

#### A. 頁面內容

| 區塊 | 說明 |
|------|------|
| 標的摘要 | 顯示 `symbol`、`name`、`assetType`、目前持有股數、平均成本、最近買入價、最近買入日、目標價 |
| 交易明細 | 顯示該標的全部買入 / 賣出紀錄，依時間排序 |
| 已實現損益摘要 | 顯示該標的累積已實現損益與平均報酬率 |

#### B. 互動功能
- 可從此頁新增交易
- 可從此頁編輯目標價
- 可快速返回 Holdings

---

### 6. Short-term Pairs（短線配對）（後續擴充）

#### 頁面目的
追蹤使用者自選買入配對的賣出，提供「自選報酬率」視角，與 Realized P/L 的平均成本報酬率並存對照，方便評估短線操作績效。

#### A. 頁面摘要卡片

| 欄位 | Key | 說明 |
|------|-----|------|
| 配對筆數 | `pairCount` | 已設定配對的賣出交易數量 |
| 自選配對總損益 | `totalCustomPL` | 所有配對的自選損益加總 |
| 平均自選報酬率 | `averageCustomReturnRate` | 所有配對的平均自選報酬率 |

#### B. 配對列表欄位

| 欄位 | Key | 說明 |
|------|-----|------|
| 代號 | `symbol` | |
| 賣出日期 | `sellDate` | |
| 賣出價 | `sellPrice` | |
| 賣出股數 | `quantitySold` | |
| 自選買入日 | `customBuyDate` | 配對的買入交易日期（多筆時顯示最早一筆） |
| 自選買入價 | `customBuyPrice` | 配對的加權平均買入價 |
| 自選損益 | `customPL` | 自選成本基準計算出的損益 |
| 自選報酬率 | `customReturnRate` | |
| 均成本損益 | `avgCostPL` | 與 Realized P/L 相同的計算，放此供對照 |
| 均成本報酬率 | `avgCostReturnRate` | |

#### C. 說明
- 只顯示有設定配對的賣出交易，未配對的賣出不出現在此頁
- 一筆賣出可對應多筆買入，列表合計後顯示為一列
- 均成本欄位與 Realized P/L 頁面數字一致，僅供對照，不重複計算

---

### 7. Watchlist（後續擴充）

#### 頁面目的
記錄有興趣但尚未買入的股票 / ETF。

#### 列表欄位

| 欄位 | Key | 說明 |
|------|-----|------|
| 代號 | `symbol` | |
| 名稱 | `name` | |
| 類型 | `assetType` | |
| 目標價 | `targetPrice` | 選填，手動輸入想買進的價格 |
| 備註 | `note` | |

---

## 五、計算邏輯

詳見 [5-calculation-spec.md](5-calculation-spec.md)，該文件為計算邏輯的唯一標準。

---

## 六、共用欄位命名整理

### 基本欄位

- `id`
- `symbol`
- `name`
- `assetType`
- `note`

### 交易相關

- `tradeDate`
- `transactionType`
- `quantity`
- `price`
- `fee`
- `totalAmount`
- `netAmount`

### 持股相關

- `averageCost`
- `totalCost`
- `lastBuyPrice`
- `lastBuyDate`
- `targetPrice`
- `currentPrice`
- `marketValue`
- `unrealizedProfitLoss`
- `unrealizedReturnRate`
- `portfolioPercentage`
- `priceUpdatedAt`

### 短線配對相關

- `customBuyDate`
- `customBuyPrice`
- `customCostBasis`
- `customPL`
- `customReturnRate`
- `quantityUsed`

### 已實現損益相關

- `sellDate`
- `quantitySold`
- `sellPrice`
- `sellAmount`
- `costBasis`
- `realizedProfitLoss`
- `realizedReturnRate`

### 股息相關

- `dividendPerShare`
- `exDividendDate`
- `paymentDate`
- `dividendYield`

---

## 七、重要設計決策

1. **Dashboard 不放最近交易與持股摘要** — 避免重複資訊，維持簡潔
2. **Holdings 排在 Transactions 前面** — 使用頻率更高
3. **Watchlist 不放加入日期** — 保持頁面單純
4. **股價更新採手動觸發** — 避免過早做複雜即時更新機制
5. **股息與年化報酬率延後** — 先聚焦核心功能
6. **一開始就完整串接，不做分階段資料遷移** — 避免日後重工
7. **短線配對與平均成本損益並存，互不影響** — 配對是使用者自選的參考視角，不取代也不影響原有的平均成本計算邏輯
8. **配對股數有限制，不允許超過買入批次的可用股數**
9. **每頁底部放置名詞說明區** — 面向新手，列出該頁專有名詞的中英文與計算公式，預設展開、可收合 — 同一批買入的股數被不同賣出配對使用後，剩餘可用量遞減，避免無意義的重複比較

---

## 八、開發優先順序

1. React 專案初始化與基礎切版
2. Transactions、Holdings、Stock Detail 頁面切版
3. 建立 Supabase 專案與資料表（transactions、target_prices）
4. 串接資料庫，完成 Transactions CRUD
5. 計算邏輯與欄位公式實作
6. Holdings 頁面（含目標價編輯）
7. Stock Detail 頁面資料串接
8. Dashboard 頁面（成本視角）
9. Realized P/L 頁面
10. 登入功能（Google OAuth）
11. 短線配對功能（trade_pairs 資料表、賣出表單配對步驟、短線配對頁面）
12. 股票搜尋 API / 自動帶入 symbol、name、assetType
13. Watchlist（後續）

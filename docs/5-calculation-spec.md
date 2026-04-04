# 欄位來源與計算規格

> 本文件定義每個核心欄位的資料來源、計算方式與重算規則，作為實作與驗證的唯一標準。

---

## 一、基本原則

- `transactions` 是唯一原始資料來源
- `holdings`、`realized P/L`、`dashboard` 都是計算結果，不額外永久存表
- 所有金額欄位都以同一貨幣顯示；第一版預設為美元
- `symbol` 一律使用大寫格式
- 若券商沒有顯示手續費或其他交易成本，`fee = 0`

---

## 二、交易欄位

### 2.1 使用者輸入欄位

| 欄位 | 說明 |
|------|------|
| `tradeDate` | 交易日期 |
| `symbol` | 股票代號，存入前轉大寫 |
| `name` | 股票名稱 |
| `assetType` | `Stock` 或 `ETF` |
| `transactionType` | `Buy` 或 `Sell` |
| `quantity` | 股數，必須大於 0 |
| `price` | 成交價，必須大於 0 |
| `fee` | 交易成本，未填時視為 0 |
| `note` | 備註，選填 |

### 2.2 衍生欄位

| 欄位 | 公式 |
|------|------|
| `totalAmount` | `quantity × price` |
| `netAmount` (Buy) | `totalAmount + fee` |
| `netAmount` (Sell) | `totalAmount - fee` |

---

## 三、持股欄位

### 3.1 單一標的重算流程

對同一個 `symbol` 的交易，依下列順序逐筆處理：

1. 依 `tradeDate` 由舊到新排序
2. 若同一天有多筆交易，再依 `created_at` 由舊到新排序
3. 從 `quantity = 0`、`averageCost = 0` 開始往後推算

### 3.2 買入時計算

```text
buyTotalCost = quantity × price + fee
newHoldingCost = oldQuantity × oldAverageCost + buyTotalCost
newQuantity = oldQuantity + buyQuantity
newAverageCost = newHoldingCost / newQuantity
```

### 3.3 賣出時計算

```text
costBasis = sellQuantity × oldAverageCost
sellNetAmount = sellQuantity × sellPrice - fee
realizedPL = sellNetAmount - costBasis
newQuantity = oldQuantity - sellQuantity
newHoldingCost = oldQuantity × oldAverageCost - costBasis
```

補充：
- 賣出不會改變當下那一筆使用的 `averageCost`
- 賣出後若 `newQuantity = 0`，則 `averageCost = 0`
- 不允許 `sellQuantity > oldQuantity`

### 3.4 Holdings 顯示欄位

| 欄位 | 來源 |
|------|------|
| `symbol` | 該標的代號 |
| `name` | 該標的最新有效名稱 |
| `assetType` | 該標的類型 |
| `quantity` | 逐筆交易後的最終持有股數 |
| `averageCost` | 逐筆交易後的最終平均成本 |
| `totalCost` | `quantity × averageCost` |
| `lastBuyPrice` | 最後一筆買入交易的 `price` |
| `lastBuyDate` | 最後一筆買入交易的 `tradeDate` |
| `targetPrice` | 來自 `target_prices` |

---

## 四、已實現損益欄位

每一筆賣出交易都會產生一筆 realized record。

| 欄位 | 來源 / 公式 |
|------|-------------|
| `sellDate` | 該筆賣出交易的 `tradeDate` |
| `quantitySold` | 該筆賣出交易的 `quantity` |
| `averageCost` | 賣出當下的平均成本 |
| `sellPrice` | 該筆賣出交易的 `price` |
| `sellAmount` | `quantitySold × sellPrice` |
| `costBasis` | `quantitySold × averageCost` |
| `fee` | 該筆賣出交易的 `fee` |
| `realizedProfitLoss` | `sellAmount - fee - costBasis` |
| `realizedReturnRate` | `realizedProfitLoss / costBasis × 100%` |

---

## 五、Dashboard 欄位

第一版 Dashboard 為成本視角，不包含即時市值。

| 欄位 | 來源 / 公式 |
|------|-------------|
| `totalInvested` | 所有買入交易的 `quantity × price + fee` 加總 |
| `currentHoldingCost` | 所有目前持股的 `totalCost` 加總 |
| `realizedProfitLoss` | 所有 realized records 的 `realizedProfitLoss` 加總 |
| `realizedReturnRate` | `總已實現損益 / 總已賣出成本 × 100%` |
| `holdingCount` | `quantity > 0` 的標的數量 |
| `portfolioPercentage` | 單一標的 `totalCost / currentHoldingCost × 100%` |

---

## 六、短線配對計算

### 6.1 基本原則

- `trade_pairs` 是自選配對的唯一資料來源
- 配對計算完全獨立於平均成本計算，兩者互不影響
- 自選報酬率僅為參考視角，不作為「官方」損益數字

### 6.2 買入批次可用股數

```text
某買入交易的可用股數 = 原始買入股數 - Σ(所有以此買入為配對的 quantity_used)
```

驗證規則：新增或編輯配對時，`quantity_used` 不可超過可用股數。

### 6.3 自選配對損益計算

一筆賣出可對應多筆買入，計算步驟：

```text
自選成本基準 = Σ (quantity_used × buy_price)  ← 對所有配對的買入加總
賣出淨收入   = quantity_sold × sell_price - sell_fee
自選損益     = 賣出淨收入 - 自選成本基準
自選報酬率   = 自選損益 / 自選成本基準 × 100%
```

### 6.4 短線配對頁面摘要計算

| 欄位 | 公式 |
|------|------|
| `totalCustomPL` | 所有配對紀錄的 `自選損益` 加總 |
| `averageCustomReturnRate` | `totalCustomPL / Σ(自選成本基準) × 100%` |
| `pairCount` | 有配對的賣出交易數量 |

### 6.5 刪除交易時的連鎖規則

- 刪除一筆**買入**交易：對應的 `trade_pairs` 自動刪除（cascade），相關賣出在短線配對頁消失
- 刪除一筆**賣出**交易：對應的 `trade_pairs` 自動刪除（cascade），被釋放的 `quantity_used` 回歸可用

---

## 七、編輯與刪除交易時的規則

- 新增交易後，重新計算該 `symbol` 的 holdings 與 realized records
- 編輯交易後，從該 `symbol` 最早一筆交易開始整段重算
- 刪除交易後，從該 `symbol` 最早一筆交易開始整段重算
- 若交易被改成更早日期，排序位置會改變，因此後面結果也可能全部改變

例子：

```text
2024-01-01 買入 10 股，均價 100
2024-02-01 買入 10 股，均價變 110
2024-03-01 賣出 5 股，這筆賣出的成本基準是 110
```

如果你後來把 2024-01-01 的買入價格改掉，2 月與 3 月的均價和已實現損益都會一起改變。

---

## 八、後續擴充

- 市值視角 Dashboard：串接報價 API 後，加入 `marketValue`、`unrealizedProfitLoss`、`unrealizedReturnRate`
- `symbol`、`name`、`assetType` 自動帶入：串接股票搜尋 API，降低手動輸入錯誤
- CSV 匯出 / 備份

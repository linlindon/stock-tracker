# 開發日誌

> 記錄開發進度、決策和問題

---

## 待開始

- [ ] React 專案初始化 (Vite + TypeScript)
- [ ] Tailwind CSS 設定
- [ ] React Router 設定
- [ ] Layout / 導航切版
- [ ] Transactions 頁面切版
- [ ] Holdings 頁面切版
- [ ] Stock Detail 頁面切版
- [ ] Dashboard 頁面切版
- [ ] Realized P/L 頁面切版
- [ ] 建立 Supabase 專案
- [ ] 建立資料表 (transactions, target_prices)
- [ ] 設定 RLS
- [ ] Supabase SDK 整合
- [ ] Transactions 頁面 (CRUD)
- [ ] 計算邏輯與欄位公式實作
- [ ] 目標價編輯功能
- [ ] Holdings 頁面資料串接
- [ ] Stock Detail 頁面資料串接
- [ ] Dashboard 頁面資料串接
- [ ] Realized P/L 頁面資料串接
- [ ] 設定 Google OAuth
- [ ] 登入頁面
- [ ] 股票搜尋 API 串接
- [ ] 欄位來源與公式文件

---

## 進行中

（無）

---

## 已完成

- [x] 建立 PRD 文件 (1-PRD.md)
- [x] 建立技術規格文件 (2-technical-spec.md)
- [x] 建立 UI 規格文件 (3-ui-spec.md)
- [x] 建立開發日誌 (4-dev-log.md)

---

## 決策紀錄

| 日期 | 決策 | 原因 |
|------|------|------|
| 2024/03/19 | 使用 Supabase 而非 localStorage | 需要跨裝置同步 |
| 2024/03/19 | 使用 Google OAuth 登入 | 最簡單的認證方式，不需要處理密碼 |
| 2024/03/19 | Holdings 加入 lastBuyPrice, lastBuyDate | 解決核心痛點：快速查看最近買入價 |
| 2024/03/19 | Holdings 加入 targetPrice | 手動記錄觀察低點/目標價 |
| 2024/03/19 | 不做分階段資料遷移 | 一開始就完整串接，避免複雜度 |
| 2024/03/19 | 開發順序: Transactions → Holdings | Transactions 是資料來源，Holdings 是高頻使用頁面 |
| 2026/03/19 | `symbol` 一律大寫 | 避免同標的因格式不同造成彙總錯誤 |
| 2026/03/19 | 新增 Stock Detail 頁面 | 從 Holdings 進入個股明細，查看完整交易與累積損益 |
| 2026/03/19 | 新增欄位來源與公式文件 | 作為實作與驗證數值的唯一標準 |
| 2026/03/19 | 開發順序改為切版 → 資料庫 → 計算邏輯 → 股票 API | 先打通資料流，再優化輸入體驗，風險較低 |

---

## 問題與解決

### 問題 1: Supabase 免費方案 7 天暫停
**狀態**: 已確認
**解決方案**:
1. 每週至少使用一次
2. 或使用 UptimeRobot 設定自動 ping

---

## 給其他 AI 的上下文

當你接手這個專案時：

1. **先讀這些文件**:
   - `1-PRD.md`: 了解產品需求
   - `2-technical-spec.md`: 了解技術架構和資料結構
   - `3-ui-spec.md`: 了解介面設計

2. **核心痛點**:
   - 用戶想快速看到某股票「最近一次買入價格」
   - 用戶想記錄「觀察的低點/目標價」
   - 用戶需要跨裝置使用

3. **技術棧**:
   - React + Vite + TypeScript
   - Tailwind CSS
   - Supabase (PostgreSQL + Auth)

4. **目前進度**:
   - 文件已完成
   - 程式碼尚未開始

5. **下一步**:
   - 初始化 React 專案與基礎切版
   - 建立 Supabase 專案並打通交易資料流

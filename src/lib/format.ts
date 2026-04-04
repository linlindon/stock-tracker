// 格式化金額為美元，例如：1234.5 → "$1,234.50"
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

// 格式化百分比，正數加上 + 號，例如：12.5 → "+12.50%"、-3 → "-3.00%"
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

// 格式化日期，例如："2024-01-15" → "2024/01/15"
export function formatDate(isoDate: string): string {
  return isoDate.replace(/-/g, '/')
}

// 根據損益數值回傳對應的 Tailwind 文字顏色 class
// 正值 → 綠色，負值 → 紅色，零 → 灰色
export function plColorClass(value: number): string {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-500'
  return 'text-gray-600'
}

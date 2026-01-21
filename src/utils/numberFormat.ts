/**
 * Format large numbers: 1000 -> 1K, 1500000 -> 1.5M
 */
export function formatNumber(num: number | null): string {
  if (num === null) return "\u2014";
  const abs = Math.abs(num);
  const sign = num < 0 ? '-': '';
  if (abs < 1000) return num.toLocaleString();
  if (abs < 1000000) {
    const k = abs / 1000;
    const value = k % 1 === 0 ? `${k}` : k.toFixed(1);
    return `${sign}${value}K`;
  }
  const m = abs / 1000000;
  const value = m % 1 === 0 ? `${m}` : m.toFixed(1);
  return `${sign}${value}M`;
}

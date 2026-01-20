/**
 * Format large numbers: 1000 -> 1K, 1500000 -> 1.5M
 */
export function formatNumber(num: number | null): string {
  if (num === null) return '—';
  if (num < 1000) return num.toLocaleString();
  if (num < 1000000) {
    const k = num / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  const m = num / 1000000;
  return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
}

export function getMaxCount(items: Array<{ count: number }>): number {
  return Math.max(...items.map((i) => i.count), 1)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function pct(a: number, b: number): string {
  if (b === 0) return '—'
  return ((a / b) * 100).toFixed(1) + '%'
}

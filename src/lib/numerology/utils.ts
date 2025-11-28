// src/lib/numerology/utils.ts

export const MASTER_SET = new Set([11, 22, 33]);

export function reduceToCore(num: unknown): number {
  let n = Number(num);
  if (!Number.isFinite(n)) n = 0;
  n = Math.abs(Math.floor(n));
  if (n === 0) return 1;

  while (n > 9 && !MASTER_SET.has(n)) {
    n = n.toString().split("").reduce((a, d) => a + Number(d), 0);
  }
  // 1–9, 11,22,33 범위를 벗어나는 예외 대비
  if (n === 0) return 1;
  return n;
}
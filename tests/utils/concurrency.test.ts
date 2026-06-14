import { describe, it, expect } from 'vitest'
import { runWithConcurrency } from '@/lib/utils/concurrency'

describe('runWithConcurrency', () => {
  it('preserves result order regardless of completion order', async () => {
    const result = await runWithConcurrency(
      [
        () => new Promise<number>((r) => setTimeout(() => r(1), 30)),
        () => new Promise<number>((r) => setTimeout(() => r(2), 5)),
        () => new Promise<number>((r) => setTimeout(() => r(3), 15)),
      ],
      2
    )
    expect(result).toEqual([1, 2, 3])
  })

  it('preserves heterogeneous tuple types', async () => {
    const [n, s, arr] = await runWithConcurrency(
      [() => Promise.resolve(42), () => Promise.resolve('hi'), () => Promise.resolve([true])],
      2
    )
    // Type-level: n:number, s:string, arr:boolean[] — also assert at runtime.
    expect(n).toBe(42)
    expect(s).toBe('hi')
    expect(arr).toEqual([true])
  })

  it('never exceeds the concurrency limit', async () => {
    let active = 0
    let peak = 0
    const makeTask = () => async () => {
      active++
      peak = Math.max(peak, active)
      await new Promise((r) => setTimeout(r, 10))
      active--
      return active
    }
    await runWithConcurrency(Array.from({ length: 9 }, makeTask), 3)
    expect(peak).toBeLessThanOrEqual(3)
    expect(peak).toBeGreaterThan(0)
  })

  it('runs sequentially when limit is 1', async () => {
    const order: number[] = []
    await runWithConcurrency(
      [
        async () => {
          order.push(1)
          await new Promise((r) => setTimeout(r, 20))
          order.push(2)
        },
        async () => {
          order.push(3)
        },
      ],
      1
    )
    // Second task only starts after the first fully completes.
    expect(order).toEqual([1, 2, 3])
  })

  it('clamps non-positive limits to at least 1', async () => {
    const result = await runWithConcurrency([() => Promise.resolve('a')], 0)
    expect(result).toEqual(['a'])
  })

  it('handles an empty task list', async () => {
    const result = await runWithConcurrency([], 4)
    expect(result).toEqual([])
  })
})

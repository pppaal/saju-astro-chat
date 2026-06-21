import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useTypewriterPlaceholder } from '@/hooks/useTypewriterPlaceholder'

const TYPING = 75
const DELETING = 35
const HOLD = 1600

describe('useTypewriterPlaceholder', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty string initially and for an empty prompt list', () => {
    const { result } = renderHook(() => useTypewriterPlaceholder([]))
    expect(result.current).toBe('')

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current).toBe('')
  })

  it('types a single prompt one character at a time', () => {
    const { result } = renderHook(() => useTypewriterPlaceholder(['Hi']))

    expect(result.current).toBe('')

    act(() => {
      vi.advanceTimersByTime(TYPING) // initial step
    })
    expect(result.current).toBe('H')

    act(() => {
      vi.advanceTimersByTime(TYPING)
    })
    expect(result.current).toBe('Hi')
  })

  it('settles on the first prompt and stops when loop is false (default)', () => {
    const { result } = renderHook(() => useTypewriterPlaceholder(['ab', 'cd']))

    act(() => {
      vi.advanceTimersByTime(TYPING * 2) // type "ab" fully
    })
    expect(result.current).toBe('ab')

    // Without loop, phase becomes 'done' — advancing further changes nothing.
    act(() => {
      vi.advanceTimersByTime(HOLD + DELETING * 10)
    })
    expect(result.current).toBe('ab')
  })

  it('cycles through prompts when loop is true', () => {
    const { result } = renderHook(() => useTypewriterPlaceholder(['ab', 'cd'], { loop: true }))

    // Type "ab".
    act(() => {
      vi.advanceTimersByTime(TYPING * 2)
    })
    expect(result.current).toBe('ab')

    // HOLD timer fires the holding branch (phase -> deleting), scheduling the
    // first deleting tick at DELETING ms later.
    act(() => {
      vi.advanceTimersByTime(HOLD)
    })
    // First deleting tick: "ab" -> "a".
    act(() => {
      vi.advanceTimersByTime(DELETING)
    })
    expect(result.current).toBe('a')
    // Second deleting tick: "a" -> "".
    act(() => {
      vi.advanceTimersByTime(DELETING)
    })
    expect(result.current).toBe('')

    // After clearing, promptIdx advances and the next deleting tick (still
    // scheduled by the deleting branch) re-enters typing for "cd".
    act(() => {
      vi.advanceTimersByTime(DELETING + TYPING)
    })
    expect(['c', 'cd']).toContain(result.current)
  })

  it('respects custom typing/deleting/hold timings', () => {
    const { result } = renderHook(() =>
      useTypewriterPlaceholder(['xy'], { typingMs: 10, deletingMs: 5, holdMs: 50 })
    )

    act(() => {
      vi.advanceTimersByTime(10)
    })
    expect(result.current).toBe('x')
    act(() => {
      vi.advanceTimersByTime(10)
    })
    expect(result.current).toBe('xy')
  })

  it('resets and restarts when the prompt list changes', () => {
    const { result, rerender } = renderHook(
      ({ prompts }: { prompts: string[] }) => useTypewriterPlaceholder(prompts),
      { initialProps: { prompts: ['abc'] } }
    )

    act(() => {
      vi.advanceTimersByTime(TYPING) // "a"
    })
    expect(result.current).toBe('a')

    rerender({ prompts: ['ZZ'] })

    // New effect starts fresh; first tick types from the new prompt.
    act(() => {
      vi.advanceTimersByTime(TYPING)
    })
    expect(result.current).toBe('Z')
  })

  it('clears the pending timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    const { unmount } = renderHook(() => useTypewriterPlaceholder(['hello']))

    act(() => {
      vi.advanceTimersByTime(TYPING)
    })

    unmount()
    expect(clearTimeoutSpy).toHaveBeenCalled()
  })

  it('stops mutating text after unmount (cancelled guard)', () => {
    const { result, unmount } = renderHook(() => useTypewriterPlaceholder(['abcdef']))

    act(() => {
      vi.advanceTimersByTime(TYPING)
    })
    const before = result.current

    unmount()
    act(() => {
      vi.advanceTimersByTime(TYPING * 10)
    })
    expect(result.current).toBe(before)
  })
})

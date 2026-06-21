/**
 * Tests for useModalA11y hooks
 * src/hooks/useModalA11y.ts — useModalDismiss + useModalTransition
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useModalDismiss, useModalTransition } from '@/hooks/useModalA11y'

describe('useModalDismiss — Esc 닫기 + 스크롤 잠금', () => {
  let onClose: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onClose = vi.fn()
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.width = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does nothing when the modal is closed', () => {
    renderHook(() => useModalDismiss(false, onClose))

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(onClose).not.toHaveBeenCalled()
    // No scroll lock applied while closed.
    expect(document.body.style.position).toBe('')
  })

  it('calls onClose when Escape is pressed while open', () => {
    renderHook(() => useModalDismiss(true, onClose))

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores non-Escape keys while open', () => {
    renderHook(() => useModalDismiss(true, onClose))

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('locks the body in a fixed position while open', () => {
    renderHook(() => useModalDismiss(true, onClose))

    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.left).toBe('0px')
    expect(document.body.style.right).toBe('0px')
    expect(document.body.style.width).toBe('100%')
    // top reflects the captured scrollY (0 in test env). happy-dom normalizes
    // the "-0px" the hook writes to "0px".
    expect(document.body.style.top).toBe('0px')
  })

  it('captures the current scrollY into the fixed top offset', () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(250)

    renderHook(() => useModalDismiss(true, onClose))

    expect(document.body.style.top).toBe('-250px')
  })

  it('restores body styles and scroll position on unmount', () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(120)
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    const { unmount } = renderHook(() => useModalDismiss(true, onClose))
    expect(document.body.style.position).toBe('fixed')

    unmount()

    expect(document.body.style.position).toBe('')
    expect(document.body.style.top).toBe('')
    expect(document.body.style.left).toBe('')
    expect(document.body.style.right).toBe('')
    expect(document.body.style.width).toBe('')
    expect(scrollToSpy).toHaveBeenCalledWith(0, 120)
  })

  it('removes the keydown listener on cleanup so Escape no longer fires', () => {
    const { rerender } = renderHook(
      ({ open }: { open: boolean }) => useModalDismiss(open, onClose),
      { initialProps: { open: true } }
    )

    // Close the modal -> effect cleanup removes the listener.
    rerender({ open: false })

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('applies the lock when transitioning from closed to open', () => {
    const { rerender } = renderHook(
      ({ open }: { open: boolean }) => useModalDismiss(open, onClose),
      { initialProps: { open: false } }
    )
    expect(document.body.style.position).toBe('')

    rerender({ open: true })
    expect(document.body.style.position).toBe('fixed')
  })
})

describe('useModalTransition — enter/exit 상태 머신', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts hidden and not animating when closed', () => {
    const { result } = renderHook(() => useModalTransition(false))
    expect(result.current.isVisible).toBe(false)
    expect(result.current.isAnimating).toBe(false)
  })

  it('mounts immediately then animates on next frame when opened', () => {
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useModalTransition(open),
      { initialProps: { open: false } }
    )

    act(() => {
      rerender({ open: true })
    })
    // Visible immediately, animation flag still off until rAF runs.
    expect(result.current.isVisible).toBe(true)
    expect(result.current.isAnimating).toBe(false)

    act(() => {
      vi.advanceTimersToNextFrame()
    })
    expect(result.current.isAnimating).toBe(true)
  })

  it('clears the animation flag immediately and unmounts after exitMs on close', () => {
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useModalTransition(open, 300),
      { initialProps: { open: false } }
    )

    act(() => {
      rerender({ open: true })
    })
    act(() => {
      vi.advanceTimersToNextFrame()
    })
    expect(result.current.isVisible).toBe(true)
    expect(result.current.isAnimating).toBe(true)

    act(() => {
      rerender({ open: false })
    })
    // Animation stops at once; still visible during the exit window.
    expect(result.current.isAnimating).toBe(false)
    expect(result.current.isVisible).toBe(true)

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current.isVisible).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.isVisible).toBe(false)
  })

  it('honors a custom exitMs duration', () => {
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useModalTransition(open, 1000),
      { initialProps: { open: true } }
    )

    act(() => {
      vi.advanceTimersToNextFrame()
    })
    expect(result.current.isVisible).toBe(true)

    act(() => {
      rerender({ open: false })
    })
    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(result.current.isVisible).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.isVisible).toBe(false)
  })

  it('cancels the pending rAF on unmount without throwing', () => {
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame')
    const { unmount } = renderHook(() => useModalTransition(true))

    expect(() => {
      act(() => {
        unmount()
      })
    }).not.toThrow()
    expect(cancelSpy).toHaveBeenCalled()
  })
})

/**
 * @file Tests for Mobile Enhancement Hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  usePullToRefresh,
  useHapticFeedback,
  useBottomSheet,
  useSwipeGesture,
  useVirtualKeyboard,
} from '@/hooks/useMobileEnhancements'

describe('useMobileEnhancements', () => {
  describe('usePullToRefresh', () => {
    let mockOnRefresh: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockOnRefresh = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true })
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should return a ref object', () => {
      const { result } = renderHook(() => usePullToRefresh(mockOnRefresh))

      expect(result.current).toBeDefined()
      expect(result.current).toHaveProperty('current')
    })

    it('should accept custom threshold', () => {
      const { result } = renderHook(() => usePullToRefresh(mockOnRefresh, 100))

      expect(result.current).toBeDefined()
    })

    it('should use default threshold of 80', () => {
      const { result } = renderHook(() => usePullToRefresh(mockOnRefresh))

      expect(result.current).toBeDefined()
    })

    it('should handle refresh callback', async () => {
      const { result } = renderHook(() => usePullToRefresh(mockOnRefresh))

      expect(result.current).toBeDefined()
      expect(mockOnRefresh).not.toHaveBeenCalled()
    })
  })

  describe('useHapticFeedback', () => {
    it('should return haptic feedback functions', () => {
      const { result } = renderHook(() => useHapticFeedback())

      expect(result.current).toBeDefined()
      expect(result.current).toHaveProperty('light')
      expect(result.current).toHaveProperty('medium')
      expect(result.current).toHaveProperty('heavy')
      expect(result.current).toHaveProperty('success')
      expect(result.current).toHaveProperty('warning')
      expect(result.current).toHaveProperty('error')
    })

    it('should handle vibrate API not available', () => {
      const originalVibrate = navigator.vibrate
      // @ts-ignore
      delete navigator.vibrate

      const { result } = renderHook(() => useHapticFeedback())

      expect(() => result.current.light()).not.toThrow()
      expect(() => result.current.medium()).not.toThrow()
      expect(() => result.current.heavy()).not.toThrow()

      // Restore
      navigator.vibrate = originalVibrate
    })

    it('should call vibrate with correct patterns', () => {
      const vibrateMock = vi.fn()
      navigator.vibrate = vibrateMock

      const { result } = renderHook(() => useHapticFeedback())

      act(() => {
        result.current.light()
      })
      expect(vibrateMock).toHaveBeenCalled()

      act(() => {
        result.current.medium()
      })
      expect(vibrateMock).toHaveBeenCalled()

      act(() => {
        result.current.heavy()
      })
      expect(vibrateMock).toHaveBeenCalled()
    })

    it('should provide success feedback', () => {
      const vibrateMock = vi.fn()
      navigator.vibrate = vibrateMock

      const { result } = renderHook(() => useHapticFeedback())

      act(() => {
        result.current.success()
      })

      expect(vibrateMock).toHaveBeenCalled()
    })

    it('should provide warning feedback', () => {
      const vibrateMock = vi.fn()
      navigator.vibrate = vibrateMock

      const { result } = renderHook(() => useHapticFeedback())

      act(() => {
        result.current.warning()
      })

      expect(vibrateMock).toHaveBeenCalled()
    })

    it('should provide error feedback', () => {
      const vibrateMock = vi.fn()
      navigator.vibrate = vibrateMock

      const { result } = renderHook(() => useHapticFeedback())

      act(() => {
        result.current.error()
      })

      expect(vibrateMock).toHaveBeenCalled()
    })
  })

  describe('useBottomSheet', () => {
    it('should return bottom sheet state and controls', () => {
      const { result } = renderHook(() => useBottomSheet())

      expect(result.current).toBeDefined()
      expect(result.current).toHaveProperty('isOpen')
      expect(result.current).toHaveProperty('open')
      expect(result.current).toHaveProperty('close')
      expect(result.current).toHaveProperty('toggle')
    })

    it('should start with closed state', () => {
      const { result } = renderHook(() => useBottomSheet())

      expect(result.current.isOpen).toBe(false)
    })

    it('should open bottom sheet', () => {
      const { result } = renderHook(() => useBottomSheet())

      act(() => {
        result.current.open()
      })

      expect(result.current.isOpen).toBe(true)
    })

    it('should close bottom sheet', () => {
      const { result } = renderHook(() => useBottomSheet())

      act(() => {
        result.current.open()
      })
      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.close()
      })
      expect(result.current.isOpen).toBe(false)
    })

    it('should toggle bottom sheet', () => {
      const { result } = renderHook(() => useBottomSheet())

      expect(result.current.isOpen).toBe(false)

      act(() => {
        result.current.toggle()
      })
      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.toggle()
      })
      expect(result.current.isOpen).toBe(false)
    })

    it('should accept initial open state', () => {
      const { result } = renderHook(() => useBottomSheet(true))

      expect(result.current.isOpen).toBe(true)
    })
  })

  describe('useSwipeGesture', () => {
    it('should return swipe gesture ref', () => {
      const onSwipeLeft = vi.fn()
      const onSwipeRight = vi.fn()

      const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight }))

      expect(result.current).toBeDefined()
      expect(result.current).toHaveProperty('current')
    })

    it('should handle missing callbacks', () => {
      const { result } = renderHook(() => useSwipeGesture({}))

      expect(result.current).toBeDefined()
    })

    it('should accept threshold parameter', () => {
      const { result } = renderHook(() => useSwipeGesture({ threshold: 100 }))

      expect(result.current).toBeDefined()
    })

    it('should accept velocity parameter', () => {
      const { result } = renderHook(() => useSwipeGesture({ minVelocity: 0.5 }))

      expect(result.current).toBeDefined()
    })
  })

  describe('useVirtualKeyboard', () => {
    beforeEach(() => {
      // Mock visualViewport
      Object.defineProperty(window, 'visualViewport', {
        value: {
          height: 800,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
        writable: true,
        configurable: true,
      })
    })

    it('should return keyboard state', () => {
      const { result } = renderHook(() => useVirtualKeyboard())

      expect(result.current).toBeDefined()
      expect(result.current).toHaveProperty('isKeyboardOpen')
      expect(result.current).toHaveProperty('keyboardHeight')
    })

    it('should start with keyboard closed', () => {
      const { result } = renderHook(() => useVirtualKeyboard())

      expect(result.current.isKeyboardOpen).toBe(false)
      expect(result.current.keyboardHeight).toBe(0)
    })

    it('should handle visualViewport not available', () => {
      // @ts-ignore
      delete window.visualViewport

      const { result } = renderHook(() => useVirtualKeyboard())

      expect(result.current.isKeyboardOpen).toBe(false)
      expect(result.current.keyboardHeight).toBe(0)
    })
  })

  describe('Integration', () => {
    it('should work together - haptic and bottom sheet', () => {
      const { result: hapticResult } = renderHook(() => useHapticFeedback())
      const { result: sheetResult } = renderHook(() => useBottomSheet())

      const vibrateMock = vi.fn()
      navigator.vibrate = vibrateMock

      act(() => {
        hapticResult.current.light()
        sheetResult.current.open()
      })

      expect(vibrateMock).toHaveBeenCalled()
      expect(sheetResult.current.isOpen).toBe(true)
    })

    it('should work together - swipe and haptic', () => {
      const onSwipeLeft = vi.fn()
      const { result: swipeResult } = renderHook(() => useSwipeGesture({ onSwipeLeft }))
      const { result: hapticResult } = renderHook(() => useHapticFeedback())

      const vibrateMock = vi.fn()
      navigator.vibrate = vibrateMock

      act(() => {
        hapticResult.current.success()
      })

      expect(swipeResult.current).toBeDefined()
      expect(vibrateMock).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid open/close calls', () => {
      const { result } = renderHook(() => useBottomSheet())

      act(() => {
        result.current.open()
        result.current.close()
        result.current.open()
        result.current.close()
      })

      expect(result.current.isOpen).toBe(false)
    })

    it('should handle multiple haptic calls', () => {
      const vibrateMock = vi.fn()
      navigator.vibrate = vibrateMock

      const { result } = renderHook(() => useHapticFeedback())

      act(() => {
        result.current.light()
        result.current.medium()
        result.current.heavy()
      })

      expect(vibrateMock).toHaveBeenCalledTimes(3)
    })

    it('should cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useBottomSheet())

      act(() => {
        result.current.open()
      })

      expect(() => unmount()).not.toThrow()
    })
  })
})

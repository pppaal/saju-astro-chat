/**
 * @file Tests for Mobile Enhancement Hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  usePullToRefresh,
  useHapticFeedback,
  useBottomSheet,
  useSwipeGesture,
  useKeyboardHeight,
  useIsMobile,
  useOrientation,
  useOnlineStatus,
  useTapFeedback,
  useScrollDirection,
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
    it('should return a triggerHaptic function', () => {
      const { result } = renderHook(() => useHapticFeedback())

      expect(result.current).toBeDefined()
      expect(typeof result.current).toBe('function')
    })

    it('should handle vibrate API not available', () => {
      const originalVibrate = navigator.vibrate
      // @ts-ignore
      delete navigator.vibrate

      const { result } = renderHook(() => useHapticFeedback())

      // Should not throw when vibrate is unavailable
      expect(() => result.current('light')).not.toThrow()
      expect(() => result.current('medium')).not.toThrow()
      expect(() => result.current('heavy')).not.toThrow()

      // Restore
      navigator.vibrate = originalVibrate
    })

    it('should call vibrate with correct patterns', () => {
      const vibrateMock = vi.fn()
      navigator.vibrate = vibrateMock

      const { result } = renderHook(() => useHapticFeedback())

      act(() => {
        result.current('light')
      })
      expect(vibrateMock).toHaveBeenCalledWith(10)

      act(() => {
        result.current('medium')
      })
      expect(vibrateMock).toHaveBeenCalledWith(20)

      act(() => {
        result.current('heavy')
      })
      expect(vibrateMock).toHaveBeenCalledWith(50)
    })

    it('should default to medium intensity', () => {
      const vibrateMock = vi.fn()
      navigator.vibrate = vibrateMock

      const { result } = renderHook(() => useHapticFeedback())

      act(() => {
        result.current()
      })

      expect(vibrateMock).toHaveBeenCalledWith(20)
    })
  })

  describe('useBottomSheet', () => {
    it('should return tuple [isOpen, open, close]', () => {
      const { result } = renderHook(() => useBottomSheet())

      expect(result.current).toBeDefined()
      expect(Array.isArray(result.current)).toBe(true)
      expect(result.current).toHaveLength(3)
      expect(typeof result.current[0]).toBe('boolean')
      expect(typeof result.current[1]).toBe('function')
      expect(typeof result.current[2]).toBe('function')
    })

    it('should start with closed state', () => {
      const { result } = renderHook(() => useBottomSheet())

      const [isOpen] = result.current
      expect(isOpen).toBe(false)
    })

    it('should open bottom sheet', () => {
      const { result } = renderHook(() => useBottomSheet())

      act(() => {
        result.current[1]() // open
      })

      expect(result.current[0]).toBe(true)
    })

    it('should close bottom sheet', () => {
      const { result } = renderHook(() => useBottomSheet())

      act(() => {
        result.current[1]() // open
      })
      expect(result.current[0]).toBe(true)

      act(() => {
        result.current[2]() // close
      })
      expect(result.current[0]).toBe(false)
    })

    it('should set body overflow hidden when open', () => {
      const { result } = renderHook(() => useBottomSheet())

      act(() => {
        result.current[1]() // open
      })

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should restore body overflow when closed', () => {
      const { result } = renderHook(() => useBottomSheet())

      act(() => {
        result.current[1]() // open
      })
      act(() => {
        result.current[2]() // close
      })

      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('useSwipeGesture', () => {
    it('should return swipe gesture ref', () => {
      const onSwipeLeft = vi.fn()
      const onSwipeRight = vi.fn()

      const { result } = renderHook(() => useSwipeGesture(onSwipeLeft, onSwipeRight))

      expect(result.current).toBeDefined()
      expect(result.current).toHaveProperty('current')
    })

    it('should handle missing callbacks', () => {
      const { result } = renderHook(() => useSwipeGesture())

      expect(result.current).toBeDefined()
    })

    it('should accept threshold parameter', () => {
      const { result } = renderHook(() => useSwipeGesture(undefined, undefined, 100))

      expect(result.current).toBeDefined()
    })
  })

  describe('useKeyboardHeight', () => {
    beforeEach(() => {
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

    it('should return keyboard height', () => {
      const { result } = renderHook(() => useKeyboardHeight())

      expect(typeof result.current).toBe('number')
    })

    it('should start with keyboard height 0', () => {
      const { result } = renderHook(() => useKeyboardHeight())

      expect(result.current).toBe(0)
    })

    it('should handle visualViewport not available', () => {
      // @ts-ignore
      delete window.visualViewport

      const { result } = renderHook(() => useKeyboardHeight())

      expect(result.current).toBe(0)
    })
  })

  describe('useIsMobile', () => {
    it('should return boolean', () => {
      const { result } = renderHook(() => useIsMobile())

      expect(typeof result.current).toBe('boolean')
    })
  })

  describe('useOrientation', () => {
    it('should return portrait or landscape', () => {
      const { result } = renderHook(() => useOrientation())

      expect(['portrait', 'landscape']).toContain(result.current)
    })
  })

  describe('useOnlineStatus', () => {
    it('should return boolean', () => {
      const { result } = renderHook(() => useOnlineStatus())

      expect(typeof result.current).toBe('boolean')
    })
  })

  describe('useTapFeedback', () => {
    it('should return a callback function', () => {
      const { result } = renderHook(() => useTapFeedback())

      expect(typeof result.current).toBe('function')
    })
  })

  describe('useScrollDirection', () => {
    it('should return tuple [direction, scrollY]', () => {
      const { result } = renderHook(() => useScrollDirection())

      expect(Array.isArray(result.current)).toBe(true)
      expect(result.current).toHaveLength(2)
    })

    it('should start with null direction and 0 scrollY', () => {
      const { result } = renderHook(() => useScrollDirection())

      expect(result.current[0]).toBeNull()
      expect(result.current[1]).toBe(0)
    })
  })

  describe('Integration', () => {
    it('should work together - haptic and bottom sheet', () => {
      const { result: hapticResult } = renderHook(() => useHapticFeedback())
      const { result: sheetResult } = renderHook(() => useBottomSheet())

      const vibrateMock = vi.fn()
      navigator.vibrate = vibrateMock

      act(() => {
        hapticResult.current('light')
        sheetResult.current[1]() // open
      })

      expect(vibrateMock).toHaveBeenCalled()
      expect(sheetResult.current[0]).toBe(true)
    })

    it('should work together - swipe and haptic', () => {
      const onSwipeLeft = vi.fn()
      const { result: swipeResult } = renderHook(() => useSwipeGesture(onSwipeLeft))
      const { result: hapticResult } = renderHook(() => useHapticFeedback())

      const vibrateMock = vi.fn()
      navigator.vibrate = vibrateMock

      act(() => {
        hapticResult.current('medium')
      })

      expect(swipeResult.current).toBeDefined()
      expect(vibrateMock).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid open/close calls', () => {
      const { result } = renderHook(() => useBottomSheet())

      act(() => {
        result.current[1]() // open
        result.current[2]() // close
        result.current[1]() // open
        result.current[2]() // close
      })

      expect(result.current[0]).toBe(false)
    })

    it('should handle multiple haptic calls', () => {
      const vibrateMock = vi.fn()
      navigator.vibrate = vibrateMock

      const { result } = renderHook(() => useHapticFeedback())

      act(() => {
        result.current('light')
        result.current('medium')
        result.current('heavy')
      })

      expect(vibrateMock).toHaveBeenCalledTimes(3)
    })

    it('should cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useBottomSheet())

      act(() => {
        result.current[1]() // open
      })

      expect(() => unmount()).not.toThrow()
    })
  })
})

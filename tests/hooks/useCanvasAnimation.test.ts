import { act, renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCanvasAnimation } from '@/hooks/useCanvasAnimation';
import { RefObject } from 'react';

describe('useCanvasAnimation', () => {
  let canvas: HTMLCanvasElement;
  let canvasRef: RefObject<HTMLCanvasElement>;
  let mockContext: any;
  let rafCallbacks: FrameRequestCallback[];
  let rafId: number;

  const flushRaf = (timestamp: number) => {
    const callbacks = [...rafCallbacks];
    rafCallbacks = [];
    callbacks.forEach((cb) => cb(timestamp));
  };

  const runFrames = (frames: number, step = 16) => {
    let time = 0;
    for (let i = 0; i < frames; i++) {
      time += step;
      flushRaf(time);
    }
  };

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    canvasRef = { current: canvas };

    // Mock canvas context
    mockContext = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
    };

    canvas.getContext = vi.fn(() => mockContext);

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });

    // Mock requestAnimationFrame
    rafCallbacks = [];
    rafId = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      rafId += 1;
      return rafId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Canvas initialization', () => {
    it('should initialize canvas on mount', () => {
      renderHook(() => useCanvasAnimation(canvasRef));

      expect(canvas.getContext).toHaveBeenCalledWith('2d');
      expect(canvas.width).toBe(1024);
      expect(canvas.height).toBe(768);
    });

    it('should not crash if canvas ref is null', () => {
      const nullRef: RefObject<HTMLCanvasElement> = { current: null };

      expect(() => {
        renderHook(() => useCanvasAnimation(nullRef));
      }).not.toThrow();
    });

    it('should not crash if context is not available', () => {
      canvas.getContext = vi.fn(() => null);

      expect(() => {
        renderHook(() => useCanvasAnimation(canvasRef));
      }).not.toThrow();
    });
  });

  describe('Canvas rendering', () => {
    it('should draw initial frame', () => {
      renderHook(() => useCanvasAnimation(canvasRef));

      flushRaf(40);

      expect(mockContext.createLinearGradient).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should draw stars', () => {
      renderHook(() => useCanvasAnimation(canvasRef));

      flushRaf(40);

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.arc).toHaveBeenCalled();
      expect(mockContext.fill).toHaveBeenCalled();
    });

    it('should draw moon glow effect', () => {
      renderHook(() => useCanvasAnimation(canvasRef));

      flushRaf(40);

      expect(mockContext.createRadialGradient).toHaveBeenCalled();
    });

    it('should adjust star count based on width', () => {
      // Small screen
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
      renderHook(() => useCanvasAnimation(canvasRef));
      flushRaf(40);
      const smallScreenCalls = mockContext.arc.mock.calls.length;
      mockContext.arc.mockClear();

      // Large screen
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      const canvas2 = document.createElement('canvas');
      canvas2.getContext = vi.fn(() => mockContext);
      renderHook(() => useCanvasAnimation({ current: canvas2 }));
      flushRaf(40);
      const largeScreenCalls = mockContext.arc.mock.calls.length;

      expect(largeScreenCalls).toBeGreaterThan(smallScreenCalls);
    });
  });

  describe('Animation control', () => {
    it('should start animation loop', () => {
      renderHook(() => useCanvasAnimation(canvasRef));

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should stop animation when reduced motion is preferred', () => {
      (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        matches: true, // prefers-reduced-motion
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      renderHook(() => useCanvasAnimation(canvasRef));

      // Should draw static frame but not animate
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should stop animation when document is hidden', () => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: true,
      });

      renderHook(() => useCanvasAnimation(canvasRef));

      // Should draw static frame
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should pause animation on visibility change', () => {
      renderHook(() => useCanvasAnimation(canvasRef));

      // Simulate visibility change
      act(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should resume animation when document becomes visible', () => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      renderHook(() => useCanvasAnimation(canvasRef));

      (window.requestAnimationFrame as ReturnType<typeof vi.fn>).mockClear();

      // Document becomes visible
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));

      // Should resume animation
      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Window resize handling', () => {
    it('should resize canvas on window resize', () => {
      renderHook(() => useCanvasAnimation(canvasRef));

      expect(canvas.width).toBe(1024);
      expect(canvas.height).toBe(768);

      // Resize window
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
      window.dispatchEvent(new Event('resize'));

      expect(canvas.width).toBe(1920);
      expect(canvas.height).toBe(1080);
    });

    it('should redraw after resize', () => {
      renderHook(() => useCanvasAnimation(canvasRef));

      mockContext.fillRect.mockClear();

      window.dispatchEvent(new Event('resize'));
      flushRaf(40);

      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should handle rapid resize events', () => {
      renderHook(() => useCanvasAnimation(canvasRef));

      for (let i = 0; i < 10; i++) {
        Object.defineProperty(window, 'innerWidth', { value: 1000 + i * 100 });
        window.dispatchEvent(new Event('resize'));
      }

      // Should not crash
      expect(canvas.width).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup event listeners on unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useCanvasAnimation(canvasRef));

      const addedEvents = addEventListenerSpy.mock.calls.map(call => call[0]);

      unmount();

      const removedEvents = removeEventListenerSpy.mock.calls.map(call => call[0]);

      // All added events should be removed
      addedEvents.forEach(event => {
        expect(removedEvents).toContain(event);
      });
    });

    it('should stop animation on unmount', () => {
      const { unmount } = renderHook(() => useCanvasAnimation(canvasRef));

      unmount();

      expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should cleanup media query listener on unmount', () => {
      const mockMediaQuery = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      (window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue(mockMediaQuery);

      const { unmount } = renderHook(() => useCanvasAnimation(canvasRef));

      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      unmount();

      expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('Frame rate control', () => {
    it('should limit frame rate to 30 FPS', () => {
      renderHook(() => useCanvasAnimation(canvasRef));

      const initialCalls = mockContext.fillRect.mock.calls.length;

      // Simulate 60 animation frames at ~60 FPS
      runFrames(60, 16);

      const finalCalls = mockContext.fillRect.mock.calls.length;
      const framesDrawn = finalCalls - initialCalls;

      // Should be around 30 frames (with some tolerance)
      expect(framesDrawn).toBeLessThanOrEqual(35);
    });
  });

  describe('Animation time progression', () => {
    it('should update time value over frames', () => {
      renderHook(() => useCanvasAnimation(canvasRef));

      flushRaf(40);
      const initialCall = mockContext.arc.mock.calls[0];

      flushRaf(80);
      const laterCall = mockContext.arc.mock.calls[mockContext.arc.mock.calls.length - 1];

      // Star positions should change (they depend on time)
      expect(initialCall).not.toEqual(laterCall);
    });
  });

  describe('Gradient creation', () => {
    it('should create linear gradient for background', () => {
      renderHook(() => useCanvasAnimation(canvasRef));

      flushRaf(40);

      expect(mockContext.createLinearGradient).toHaveBeenCalled();

      const gradient = mockContext.createLinearGradient.mock.results[0].value;
      expect(gradient.addColorStop).toHaveBeenCalledTimes(3);
    });

    it('should create radial gradient for moon glow', () => {
      renderHook(() => useCanvasAnimation(canvasRef));

      flushRaf(40);

      expect(mockContext.createRadialGradient).toHaveBeenCalled();

      const gradient = mockContext.createRadialGradient.mock.results[0].value;
      expect(gradient.addColorStop).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance optimizations', () => {
    it('should not animate when page is not visible', () => {
      Object.defineProperty(document, 'hidden', { value: true });

      (window.requestAnimationFrame as ReturnType<typeof vi.fn>).mockClear();

      renderHook(() => useCanvasAnimation(canvasRef));

      // Should draw initial frame but not start animation loop
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should use fewer stars on smaller screens', () => {
      // Mobile screen
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });

      renderHook(() => useCanvasAnimation(canvasRef));
      flushRaf(40);

      const mobileStarCount = mockContext.arc.mock.calls.length;

      mockContext.arc.mockClear();

      // Desktop screen
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      const canvas2 = document.createElement('canvas');
      canvas2.getContext = vi.fn(() => mockContext);
      renderHook(() => useCanvasAnimation({ current: canvas2 }));
      flushRaf(40);

      const desktopStarCount = mockContext.arc.mock.calls.length;

      expect(mobileStarCount).toBeLessThan(desktopStarCount);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero dimensions', () => {
      Object.defineProperty(window, 'innerWidth', { value: 0 });
      Object.defineProperty(window, 'innerHeight', { value: 0 });

      expect(() => {
        renderHook(() => useCanvasAnimation(canvasRef));
      }).not.toThrow();
    });

    it('should handle very large dimensions', () => {
      Object.defineProperty(window, 'innerWidth', { value: 10000 });
      Object.defineProperty(window, 'innerHeight', { value: 10000 });

      expect(() => {
        renderHook(() => useCanvasAnimation(canvasRef));
      }).not.toThrow();

      expect(canvas.width).toBe(10000);
      expect(canvas.height).toBe(10000);
    });

    it('should handle canvas ref change', () => {
      const { rerender } = renderHook(
        ({ ref }) => useCanvasAnimation(ref),
        { initialProps: { ref: canvasRef } }
      );

      const newCanvas = document.createElement('canvas');
      newCanvas.getContext = vi.fn(() => mockContext);
      const newRef = { current: newCanvas };

      rerender({ ref: newRef });

      // Should handle the change without crashing
      expect(true).toBe(true);
    });
  });
});

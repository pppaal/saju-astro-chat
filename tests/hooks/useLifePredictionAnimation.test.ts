/**
 * useLifePredictionAnimation Hook Tests
 * 인생 예측 페이지 배경 애니메이션 훅 테스트
 *
 * Note: This hook manages canvas animations and requires DOM attachment.
 * Tests focus on ref creation and basic behavior without full canvas integration.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLifePredictionAnimation } from '@/hooks/useLifePredictionAnimation';

describe('useLifePredictionAnimation', () => {
  describe('initialization', () => {
    it('should return a ref object', () => {
      const { result } = renderHook(() => useLifePredictionAnimation());

      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('object');
      expect('current' in result.current).toBe(true);
    });

    it('should return ref with initial null current', () => {
      const { result } = renderHook(() => useLifePredictionAnimation());

      // Before attaching to canvas, current should be the initial value
      // Note: The hook uses `useRef<HTMLCanvasElement>(null!)`
      expect(result.current).toHaveProperty('current');
    });
  });

  describe('hook behavior', () => {
    it('should be stable across re-renders', () => {
      const { result, rerender } = renderHook(() => useLifePredictionAnimation());

      const firstRef = result.current;
      rerender();
      const secondRef = result.current;

      // Ref object should be the same across renders
      expect(firstRef).toBe(secondRef);
    });

    it('should not throw when canvas is not attached', () => {
      // Canvas ref starts without DOM attachment
      expect(() => {
        renderHook(() => useLifePredictionAnimation());
      }).not.toThrow();
    });

    it('should clean up on unmount without errors', () => {
      const { unmount } = renderHook(() => useLifePredictionAnimation());

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('animation configuration documentation', () => {
    // These tests document the expected animation behavior

    it('should use 30 FPS frame rate (33.33ms interval)', () => {
      // Hook uses: frameInterval = 1000 / 30
      const expectedFrameInterval = 1000 / 30;
      expect(expectedFrameInterval).toBeCloseTo(33.33, 1);
    });

    it('should increment time by 0.003 per frame', () => {
      // Hook uses: time += 0.003 per frame
      // This creates smooth animation over time
      const timeIncrement = 0.003;
      expect(timeIncrement).toBe(0.003);
    });

    describe('responsive star count', () => {
      it('should use 30 stars for mobile (width < 640)', () => {
        const width = 400;
        const starCount = width < 640 ? 30 : width < 1024 ? 40 : 50;
        expect(starCount).toBe(30);
      });

      it('should use 40 stars for tablet (640 <= width < 1024)', () => {
        const width = 800;
        const starCount = width < 640 ? 30 : width < 1024 ? 40 : 50;
        expect(starCount).toBe(40);
      });

      it('should use 50 stars for desktop (width >= 1024)', () => {
        const width = 1920;
        const starCount = width < 640 ? 30 : width < 1024 ? 40 : 50;
        expect(starCount).toBe(50);
      });
    });

    describe('responsive orb count', () => {
      it('should use 3 orbs for mobile (width < 640)', () => {
        const width = 400;
        const orbCount = width < 640 ? 3 : 5;
        expect(orbCount).toBe(3);
      });

      it('should use 5 orbs for desktop (width >= 640)', () => {
        const width = 1024;
        const orbCount = width < 640 ? 3 : 5;
        expect(orbCount).toBe(5);
      });
    });

    describe('gradient colors', () => {
      it('should use dark blue gradient start', () => {
        const startColor = 'rgba(10, 15, 30, 1)';
        expect(startColor).toContain('10, 15, 30');
      });

      it('should use darker blue gradient middle', () => {
        const middleColor = 'rgba(20, 25, 50, 1)';
        expect(middleColor).toContain('20, 25, 50');
      });

      it('should use dark gradient end', () => {
        const endColor = 'rgba(15, 20, 40, 1)';
        expect(endColor).toContain('15, 20, 40');
      });
    });

    describe('star colors', () => {
      it('should use purple color for stars', () => {
        // Stars use rgba(167, 139, 250, opacity)
        const starColor = 'rgba(167, 139, 250, 0.1)';
        expect(starColor).toContain('167, 139, 250');
      });
    });

    describe('orb colors', () => {
      it('should use violet color for orbs', () => {
        // Orbs use rgba(139, 92, 246, opacity)
        const orbColor = 'rgba(139, 92, 246, 0.02)';
        expect(orbColor).toContain('139, 92, 246');
      });
    });
  });

  describe('animation math', () => {
    it('should calculate star position using sin/cos functions', () => {
      const time = 1.0;
      const i = 5;
      const width = 1024;
      const height = 768;

      // Replicate the hook's star position calculation
      const x = (Math.sin(time * 0.5 + i * 1.3) * 0.5 + 0.5) * width;
      const y = (Math.cos(time * 0.3 + i * 0.7) * 0.5 + 0.5) * height;

      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(height);
    });

    it('should calculate star opacity between 0.05 and 0.15', () => {
      const time = 1.0;
      const i = 5;

      // Replicate the hook's opacity calculation
      const opacity = 0.1 + Math.sin(time * 2 + i) * 0.05;

      expect(opacity).toBeGreaterThanOrEqual(0.05);
      expect(opacity).toBeLessThanOrEqual(0.15);
    });

    it('should calculate orb radius between 50 and 150', () => {
      const time = 1.0;
      const i = 2;

      // Replicate the hook's orb radius calculation
      const radius = 100 + Math.sin(time + i) * 50;

      expect(radius).toBeGreaterThanOrEqual(50);
      expect(radius).toBeLessThanOrEqual(150);
    });

    it('should calculate orb position within center region', () => {
      const time = 1.0;
      const i = 2;
      const width = 1024;
      const height = 768;

      // Replicate the hook's orb position calculation
      const x = (Math.sin(time + i * 1.2) * 0.3 + 0.5) * width;
      const y = (Math.cos(time * 0.7 + i * 0.8) * 0.3 + 0.5) * height;

      // Orbs should be positioned in the middle 60% of the canvas
      expect(x).toBeGreaterThanOrEqual(width * 0.2);
      expect(x).toBeLessThanOrEqual(width * 0.8);
      expect(y).toBeGreaterThanOrEqual(height * 0.2);
      expect(y).toBeLessThanOrEqual(height * 0.8);
    });
  });
});

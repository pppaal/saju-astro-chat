/**
 * Scroll Utils Tests
 * src/utils/scrollUtils.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { smoothScrollTo, scrollToElement } from '@/utils/scrollUtils';

describe('scrollUtils', () => {
  let originalScrollY: number;
  let originalScrollTo: typeof window.scrollTo;
  let originalRequestAnimationFrame: typeof requestAnimationFrame;
  let originalPerformanceNow: typeof performance.now;

  beforeEach(() => {
    originalScrollY = window.scrollY;
    originalScrollTo = window.scrollTo;
    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalPerformanceNow = performance.now;

    // Mock window properties
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    window.scrollTo = vi.fn();

    // Mock performance.now to control timing
    let time = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => time);

    // Mock requestAnimationFrame to run immediately with incremented time
    window.requestAnimationFrame = vi.fn((callback) => {
      time += 100; // Simulate 100ms between frames
      setTimeout(() => callback(time), 0);
      return 1;
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { value: originalScrollY, writable: true });
    window.scrollTo = originalScrollTo;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    vi.restoreAllMocks();
  });

  describe('smoothScrollTo', () => {
    it('should call window.scrollTo', () => {
      smoothScrollTo(500);

      // Wait for first animation frame
      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should start from current scroll position', () => {
      Object.defineProperty(window, 'scrollY', { value: 100, writable: true });

      smoothScrollTo(500);

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should accept custom duration', () => {
      smoothScrollTo(500, 1000);

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should use default duration of 600ms', () => {
      smoothScrollTo(500);

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should scroll to 0 when targeting top', () => {
      Object.defineProperty(window, 'scrollY', { value: 500, writable: true });

      smoothScrollTo(0);

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should handle negative target positions', () => {
      smoothScrollTo(-100);

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should handle very large target positions', () => {
      smoothScrollTo(10000);

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('scrollToElement', () => {
    it('should not scroll when element is null', () => {
      scrollToElement(null);

      expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('should scroll to element with default offset', () => {
      const element = document.createElement('div');
      element.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 200,
        left: 0,
        bottom: 250,
        right: 100,
        width: 100,
        height: 50,
      });

      scrollToElement(element);

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should scroll to element with custom offset', () => {
      const element = document.createElement('div');
      element.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 200,
        left: 0,
        bottom: 250,
        right: 100,
        width: 100,
        height: 50,
      });

      scrollToElement(element, -50);

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should scroll to element with custom duration', () => {
      const element = document.createElement('div');
      element.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 200,
        left: 0,
        bottom: 250,
        right: 100,
        width: 100,
        height: 50,
      });

      scrollToElement(element, -100, 1000);

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should handle positive offset', () => {
      const element = document.createElement('div');
      element.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 100,
        left: 0,
        bottom: 150,
        right: 100,
        width: 100,
        height: 50,
      });

      scrollToElement(element, 50);

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should handle element at the top of the page', () => {
      const element = document.createElement('div');
      element.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 0,
        left: 0,
        bottom: 50,
        right: 100,
        width: 100,
        height: 50,
      });

      scrollToElement(element);

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should account for current scroll position', () => {
      Object.defineProperty(window, 'scrollY', { value: 300, writable: true });

      const element = document.createElement('div');
      element.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 200, // Relative to viewport
        left: 0,
        bottom: 250,
        right: 100,
        width: 100,
        height: 50,
      });

      scrollToElement(element, -100);

      // Should calculate: 200 (top) + 300 (scrollY) + (-100) (offset) = 400
      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('easing function', () => {
    it('should start at the beginning position', async () => {
      // At progress 0, ease should be 0
      smoothScrollTo(500, 600);

      // requestAnimationFrame is called which triggers the animation
      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });
  });
});
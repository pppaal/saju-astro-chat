/**
 * Animation System Tests
 * UI 애니메이션 유틸리티 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DURATION,
  EASING,
  TRANSITIONS,
  ANIMATIONS,
  getTransition,
  getTransitions,
  delay,
  prefersReducedMotion,
  getAccessibleDuration,
  useAnimation,
  CSS_VARIABLES,
} from '@/lib/ui/animations';

describe('AnimationSystem', () => {
  describe('DURATION constants', () => {
    it('should have fast duration of 150ms', () => {
      expect(DURATION.fast).toBe('150ms');
      expect(DURATION.fastMs).toBe(150);
    });

    it('should have medium duration of 250ms', () => {
      expect(DURATION.medium).toBe('250ms');
      expect(DURATION.mediumMs).toBe(250);
    });

    it('should have slow duration of 400ms', () => {
      expect(DURATION.slow).toBe('400ms');
      expect(DURATION.slowMs).toBe(400);
    });

    it('should have bounce duration of 500ms', () => {
      expect(DURATION.bounce).toBe('500ms');
      expect(DURATION.bounceMs).toBe(500);
    });

    it('should have matching string and ms values', () => {
      expect(parseInt(DURATION.fast)).toBe(DURATION.fastMs);
      expect(parseInt(DURATION.medium)).toBe(DURATION.mediumMs);
      expect(parseInt(DURATION.slow)).toBe(DURATION.slowMs);
      expect(parseInt(DURATION.bounce)).toBe(DURATION.bounceMs);
    });
  });

  describe('EASING constants', () => {
    it('should have standard easing', () => {
      expect(EASING.standard).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
    });

    it('should have easeOut easing', () => {
      expect(EASING.easeOut).toBe('cubic-bezier(0, 0, 0.2, 1)');
    });

    it('should have easeIn easing', () => {
      expect(EASING.easeIn).toBe('cubic-bezier(0.4, 0, 1, 1)');
    });

    it('should have easeInOut easing', () => {
      expect(EASING.easeInOut).toBe('cubic-bezier(0.4, 0, 0.6, 1)');
    });

    it('should have bounce easing', () => {
      expect(EASING.bounce).toBe('cubic-bezier(0.68, -0.55, 0.265, 1.55)');
    });

    it('should have sharp easing', () => {
      expect(EASING.sharp).toBe('cubic-bezier(0.4, 0, 0.6, 1)');
    });

    it('should all be valid cubic-bezier functions', () => {
      const cubicBezierRegex = /^cubic-bezier\([\d.-]+,\s*[\d.-]+,\s*[\d.-]+,\s*[\d.-]+\)$/;
      Object.values(EASING).forEach(easing => {
        expect(easing).toMatch(cubicBezierRegex);
      });
    });
  });

  describe('TRANSITIONS constants', () => {
    it('should combine duration and easing for fast', () => {
      expect(TRANSITIONS.fast).toBe(`${DURATION.fast} ${EASING.standard}`);
    });

    it('should combine duration and easing for medium', () => {
      expect(TRANSITIONS.medium).toBe(`${DURATION.medium} ${EASING.standard}`);
    });

    it('should combine duration and easing for slow', () => {
      expect(TRANSITIONS.slow).toBe(`${DURATION.slow} ${EASING.standard}`);
    });

    it('should combine duration and easing for bounce', () => {
      expect(TRANSITIONS.bounce).toBe(`${DURATION.bounce} ${EASING.bounce}`);
    });

    it('should have fastOut with easeOut', () => {
      expect(TRANSITIONS.fastOut).toContain(EASING.easeOut);
    });

    it('should have mediumIn with easeIn', () => {
      expect(TRANSITIONS.mediumIn).toContain(EASING.easeIn);
    });
  });

  describe('ANIMATIONS constants', () => {
    it('should have fadeIn keyframes', () => {
      expect(ANIMATIONS.fadeIn).toContain('@keyframes fadeIn');
      expect(ANIMATIONS.fadeIn).toContain('opacity: 0');
      expect(ANIMATIONS.fadeIn).toContain('opacity: 1');
    });

    it('should have fadeOut keyframes', () => {
      expect(ANIMATIONS.fadeOut).toContain('@keyframes fadeOut');
      expect(ANIMATIONS.fadeOut).toContain('opacity: 1');
      expect(ANIMATIONS.fadeOut).toContain('opacity: 0');
    });

    it('should have slideInTop keyframes', () => {
      expect(ANIMATIONS.slideInTop).toContain('@keyframes slideInTop');
      expect(ANIMATIONS.slideInTop).toContain('translateY(-20px)');
      expect(ANIMATIONS.slideInTop).toContain('translateY(0)');
    });

    it('should have slideInBottom keyframes', () => {
      expect(ANIMATIONS.slideInBottom).toContain('@keyframes slideInBottom');
      expect(ANIMATIONS.slideInBottom).toContain('translateY(20px)');
    });

    it('should have scaleIn keyframes', () => {
      expect(ANIMATIONS.scaleIn).toContain('@keyframes scaleIn');
      expect(ANIMATIONS.scaleIn).toContain('scale(0.9)');
      expect(ANIMATIONS.scaleIn).toContain('scale(1)');
    });

    it('should have pulse keyframes', () => {
      expect(ANIMATIONS.pulse).toContain('@keyframes pulse');
      expect(ANIMATIONS.pulse).toContain('scale(1.05)');
    });

    it('should have spin keyframes', () => {
      expect(ANIMATIONS.spin).toContain('@keyframes spin');
      expect(ANIMATIONS.spin).toContain('rotate(0deg)');
      expect(ANIMATIONS.spin).toContain('rotate(360deg)');
    });

    it('should have shimmer keyframes', () => {
      expect(ANIMATIONS.shimmer).toContain('@keyframes shimmer');
      expect(ANIMATIONS.shimmer).toContain('background-position');
    });

    it('should have shake keyframes', () => {
      expect(ANIMATIONS.shake).toContain('@keyframes shake');
      expect(ANIMATIONS.shake).toContain('translateX(-8px)');
      expect(ANIMATIONS.shake).toContain('translateX(8px)');
    });

    it('should have bounceIn keyframes', () => {
      expect(ANIMATIONS.bounceIn).toContain('@keyframes bounceIn');
      expect(ANIMATIONS.bounceIn).toContain('scale(0.3)');
      expect(ANIMATIONS.bounceIn).toContain('scale(1.05)');
    });
  });

  describe('getTransition', () => {
    it('should create transition with property and default speed', () => {
      const result = getTransition('opacity');
      expect(result).toBe(`opacity ${TRANSITIONS.medium}`);
    });

    it('should create transition with property and fast speed', () => {
      const result = getTransition('opacity', 'fast');
      expect(result).toBe(`opacity ${TRANSITIONS.fast}`);
    });

    it('should create transition with property and slow speed', () => {
      const result = getTransition('transform', 'slow');
      expect(result).toBe(`transform ${TRANSITIONS.slow}`);
    });

    it('should create transition with bounce speed', () => {
      const result = getTransition('all', 'bounce');
      expect(result).toBe(`all ${TRANSITIONS.bounce}`);
    });

    it('should work with any CSS property', () => {
      expect(getTransition('background-color', 'fast')).toContain('background-color');
      expect(getTransition('border', 'medium')).toContain('border');
      expect(getTransition('box-shadow', 'slow')).toContain('box-shadow');
    });
  });

  describe('getTransitions', () => {
    it('should create multiple transitions with default speed', () => {
      const result = getTransitions(['opacity', 'transform']);
      expect(result).toContain('opacity');
      expect(result).toContain('transform');
      expect(result).toContain(',');
    });

    it('should create multiple transitions with custom speed', () => {
      const result = getTransitions(['opacity', 'transform', 'background'], 'fast');
      // Check that all three properties are present
      expect(result).toContain('opacity');
      expect(result).toContain('transform');
      expect(result).toContain('background');
      // Check that the transition contains the fast timing
      expect(result).toContain(DURATION.fast);
    });

    it('should handle single property', () => {
      const result = getTransitions(['opacity'], 'slow');
      expect(result).toBe(`opacity ${TRANSITIONS.slow}`);
      // Single property should contain only 'opacity' at the start
      expect(result.startsWith('opacity ')).toBe(true);
      // Should not contain multiple property definitions
      expect(result).not.toMatch(/opacity.*transform/);
    });

    it('should handle empty array', () => {
      const result = getTransitions([]);
      expect(result).toBe('');
    });
  });

  describe('delay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return a promise', () => {
      const result = delay(100);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve after specified time', async () => {
      const promise = delay(100);

      vi.advanceTimersByTime(99);
      // Promise should not be resolved yet

      vi.advanceTimersByTime(1);
      await promise;
      // Promise should now be resolved
    });

    it('should work with DURATION constants', async () => {
      const promise = delay(DURATION.fastMs);
      vi.advanceTimersByTime(DURATION.fastMs);
      await promise;
    });
  });

  describe('prefersReducedMotion', () => {
    const originalWindow = global.window;
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
      global.window = originalWindow;
      window.matchMedia = originalMatchMedia;
    });

    it('should return false when window is undefined', () => {
      // @ts-expect-error - Testing undefined window
      delete global.window;
      // Need to re-import to test this case
      expect(prefersReducedMotion()).toBe(false);
    });

    it('should return true when user prefers reduced motion', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });
      expect(prefersReducedMotion()).toBe(true);
    });

    it('should return false when user does not prefer reduced motion', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      expect(prefersReducedMotion()).toBe(false);
    });

    it('should query the correct media query', () => {
      const mockMatchMedia = vi.fn().mockReturnValue({ matches: false });
      window.matchMedia = mockMatchMedia;

      prefersReducedMotion();

      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });
  });

  describe('getAccessibleDuration', () => {
    afterEach(() => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    });

    it('should return 0 when user prefers reduced motion', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });
      expect(getAccessibleDuration('fast')).toBe(0);
      expect(getAccessibleDuration('medium')).toBe(0);
      expect(getAccessibleDuration('slow')).toBe(0);
    });

    it('should return fast duration when no reduced motion', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      expect(getAccessibleDuration('fast')).toBe(DURATION.fastMs);
    });

    it('should return medium duration when no reduced motion', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      expect(getAccessibleDuration('medium')).toBe(DURATION.mediumMs);
    });

    it('should return slow duration when no reduced motion', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      expect(getAccessibleDuration('slow')).toBe(DURATION.slowMs);
    });

    it('should return bounce duration when no reduced motion', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      expect(getAccessibleDuration('bounce')).toBe(DURATION.bounceMs);
    });

    it('should return default 150 for unknown duration', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      // @ts-expect-error - Testing unknown duration
      expect(getAccessibleDuration('unknown')).toBe(150);
    });
  });

  describe('useAnimation', () => {
    afterEach(() => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    });

    it('should return animation config with default speed', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      const result = useAnimation();

      expect(result).toHaveProperty('shouldAnimate');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('transition');
    });

    it('should enable animations when reduced motion is not preferred', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      const result = useAnimation('medium');

      expect(result.shouldAnimate).toBe(true);
      expect(result.duration).toBe(DURATION.mediumMs);
      expect(result.transition).toBe(TRANSITIONS.medium);
    });

    it('should disable animations when reduced motion is preferred', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });
      const result = useAnimation('medium');

      expect(result.shouldAnimate).toBe(false);
      expect(result.duration).toBe(0);
      expect(result.transition).toBe('none');
    });

    it('should work with fast speed', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      const result = useAnimation('fast');

      expect(result.transition).toBe(TRANSITIONS.fast);
    });

    it('should work with slow speed', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      const result = useAnimation('slow');

      expect(result.transition).toBe(TRANSITIONS.slow);
    });

    it('should work with bounce speed', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      const result = useAnimation('bounce');

      expect(result.transition).toBe(TRANSITIONS.bounce);
    });
  });

  describe('CSS_VARIABLES', () => {
    it('should contain :root selector', () => {
      expect(CSS_VARIABLES).toContain(':root');
    });

    it('should contain duration variables', () => {
      expect(CSS_VARIABLES).toContain('--duration-fast');
      expect(CSS_VARIABLES).toContain('--duration-medium');
      expect(CSS_VARIABLES).toContain('--duration-slow');
      expect(CSS_VARIABLES).toContain('--duration-bounce');
    });

    it('should contain easing variables', () => {
      expect(CSS_VARIABLES).toContain('--easing-standard');
      expect(CSS_VARIABLES).toContain('--easing-ease-out');
      expect(CSS_VARIABLES).toContain('--easing-ease-in');
      expect(CSS_VARIABLES).toContain('--easing-bounce');
    });

    it('should contain transition variables', () => {
      expect(CSS_VARIABLES).toContain('--transition-fast');
      expect(CSS_VARIABLES).toContain('--transition-medium');
      expect(CSS_VARIABLES).toContain('--transition-slow');
      expect(CSS_VARIABLES).toContain('--transition-bounce');
    });

    it('should contain actual duration values', () => {
      expect(CSS_VARIABLES).toContain(DURATION.fast);
      expect(CSS_VARIABLES).toContain(DURATION.medium);
      expect(CSS_VARIABLES).toContain(DURATION.slow);
    });

    it('should contain actual easing values', () => {
      expect(CSS_VARIABLES).toContain(EASING.standard);
      expect(CSS_VARIABLES).toContain(EASING.easeOut);
    });
  });
});

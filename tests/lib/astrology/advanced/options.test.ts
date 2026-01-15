import { describe, it, expect } from 'vitest';
import { resolveOptions, defaultOptions, presets } from '@/lib/astrology/advanced/options';

describe('Astrology Options', () => {
  describe('defaultOptions', () => {
    it('should have western theme by default', () => {
      expect(defaultOptions.theme).toBe('western');
    });

    it('should use Placidus house system', () => {
      expect(defaultOptions.houseSystem).toBe('Placidus');
    });

    it('should use true node type', () => {
      expect(defaultOptions.nodeType).toBe('true');
    });
  });

  describe('presets', () => {
    it('should have western preset with Placidus', () => {
      expect(presets.western.houseSystem).toBe('Placidus');
    });

    it('should have saju preset with WholeSign', () => {
      expect(presets.saju.houseSystem).toBe('WholeSign');
    });

    it('should enable bodies in western preset', () => {
      expect(presets.western.enable?.chiron).toBe(true);
    });
  });

  describe('resolveOptions', () => {
    it('should return defaults when no input', () => {
      const result = resolveOptions();
      expect(result.theme).toBe('western');
    });

    it('should apply western preset', () => {
      const result = resolveOptions({ theme: 'western' });
      expect(result.enable.chiron).toBe(true);
    });

    it('should apply saju preset', () => {
      const result = resolveOptions({ theme: 'saju' });
      expect(result.houseSystem).toBe('WholeSign');
    });

    it('should override preset with input', () => {
      const result = resolveOptions({
        theme: 'western',
        houseSystem: 'WholeSign',
      });
      expect(result.houseSystem).toBe('WholeSign');
    });
  });
});

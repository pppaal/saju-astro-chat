import { describe, it, expect } from 'vitest';
import {
  timingSafeCompare,
  timingSafeCompareBuffers,
  timingSafeCompareHashes,
} from '@/lib/security/timingSafe';

describe('timingSafe', () => {
  describe('timingSafeCompare', () => {
    it('should return true for identical strings', () => {
      expect(timingSafeCompare('secret123', 'secret123')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(timingSafeCompare('secret123', 'secret456')).toBe(false);
    });

    it('should return false for strings with different lengths', () => {
      expect(timingSafeCompare('short', 'much_longer_string')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(timingSafeCompare('', '')).toBe(true);
      expect(timingSafeCompare('', 'nonempty')).toBe(false);
    });

    it('should return false for non-string inputs', () => {
      // @ts-expect-error Testing invalid input
      expect(timingSafeCompare(null, 'string')).toBe(false);
      // @ts-expect-error Testing invalid input
      expect(timingSafeCompare(undefined, 'string')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(timingSafeCompare('Secret', 'secret')).toBe(false);
    });
  });

  describe('timingSafeCompareBuffers', () => {
    it('should return true for identical buffers', () => {
      const buf1 = Buffer.from('secret123');
      const buf2 = Buffer.from('secret123');
      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(true);
    });

    it('should return false for different buffers', () => {
      const buf1 = Buffer.from('secret123');
      const buf2 = Buffer.from('secret456');
      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(false);
    });

    it('should return false for non-buffer inputs', () => {
      const buf = Buffer.from('data');
      // @ts-expect-error Testing invalid input
      expect(timingSafeCompareBuffers(null, buf)).toBe(false);
    });
  });

  describe('timingSafeCompareHashes', () => {
    it('should return true for identical hashes', () => {
      const hash = 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3';
      expect(timingSafeCompareHashes(hash, hash)).toBe(true);
    });

    it('should return false for different hashes', () => {
      const hash1 = 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3';
      const hash2 = 'b94a8fe5ccb19ba61c4c0873d391e987982fbbd3';
      expect(timingSafeCompareHashes(hash1, hash2)).toBe(false);
    });
  });
});

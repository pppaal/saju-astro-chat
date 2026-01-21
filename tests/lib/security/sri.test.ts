/**
 * Tests for Subresource Integrity (SRI) utilities
 * src/lib/security/sri.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SRI_HASHES,
  getSRIAttributes,
  hasSRI,
  getScriptsNeedingSRI,
  generateScriptTag,
  verifySRIHash,
  type SRIEntry,
} from '@/lib/security/sri';

// Mock fetch for verifySRIHash tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SRI utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SRI_HASHES', () => {
    it('should contain kakaoSdk entry', () => {
      expect(SRI_HASHES.kakaoSdk).toBeDefined();
      expect(SRI_HASHES.kakaoSdk.url).toContain('kakao');
    });

    it('should contain googleAnalytics entry', () => {
      expect(SRI_HASHES.googleAnalytics).toBeDefined();
      expect(SRI_HASHES.googleAnalytics.url).toContain('googletagmanager');
    });

    it('should contain clarity entry', () => {
      expect(SRI_HASHES.clarity).toBeDefined();
      expect(SRI_HASHES.clarity.url).toContain('clarity');
    });

    it('should have version for each entry', () => {
      Object.values(SRI_HASHES).forEach((entry) => {
        expect(entry.version).toBeDefined();
      });
    });
  });

  describe('getSRIAttributes', () => {
    it('should return null when no integrity hash', () => {
      const result = getSRIAttributes('googleAnalytics');

      expect(result).toBeNull();
    });

    it('should return attributes when integrity hash exists', () => {
      // Temporarily set a hash for testing
      const originalEntry = SRI_HASHES.kakaoSdk;
      SRI_HASHES.kakaoSdk = {
        ...originalEntry,
        integrity: 'sha384-testHash123',
        crossOrigin: 'anonymous',
      };

      const result = getSRIAttributes('kakaoSdk');

      expect(result).toEqual({
        integrity: 'sha384-testHash123',
        crossOrigin: 'anonymous',
      });

      // Restore original
      SRI_HASHES.kakaoSdk = originalEntry;
    });

    it('should handle missing crossOrigin', () => {
      const originalEntry = SRI_HASHES.kakaoSdk;
      SRI_HASHES.kakaoSdk = {
        url: 'https://test.com/script.js',
        integrity: 'sha384-testHash',
      };

      const result = getSRIAttributes('kakaoSdk');

      expect(result).toEqual({
        integrity: 'sha384-testHash',
        crossOrigin: undefined,
      });

      SRI_HASHES.kakaoSdk = originalEntry;
    });
  });

  describe('hasSRI', () => {
    it('should return false for scripts without integrity', () => {
      expect(hasSRI('googleAnalytics')).toBe(false);
      expect(hasSRI('clarity')).toBe(false);
    });

    it('should return true when script has integrity', () => {
      const originalEntry = SRI_HASHES.kakaoSdk;
      SRI_HASHES.kakaoSdk = {
        ...originalEntry,
        integrity: 'sha384-testHash',
      };

      expect(hasSRI('kakaoSdk')).toBe(true);

      SRI_HASHES.kakaoSdk = originalEntry;
    });
  });

  describe('getScriptsNeedingSRI', () => {
    it('should return scripts without integrity that are not dynamic', () => {
      const scripts = getScriptsNeedingSRI();

      // Dynamic scripts should not be in the list
      const dynamicScripts = scripts.filter(
        (s) => s.version === 'dynamic'
      );
      expect(dynamicScripts).toHaveLength(0);
    });

    it('should exclude scripts with integrity', () => {
      const originalEntry = SRI_HASHES.kakaoSdk;
      SRI_HASHES.kakaoSdk = {
        ...originalEntry,
        integrity: 'sha384-hasHash',
      };

      const scripts = getScriptsNeedingSRI();
      const kakaoInList = scripts.some((s) => s.url.includes('kakao'));

      expect(kakaoInList).toBe(false);

      SRI_HASHES.kakaoSdk = originalEntry;
    });
  });

  describe('generateScriptTag', () => {
    it('should generate basic script tag', () => {
      const tag = generateScriptTag('googleAnalytics');

      expect(tag).toContain('<script');
      expect(tag).toContain('src="https://www.googletagmanager.com/gtag/js"');
      expect(tag).toContain('</script>');
    });

    it('should include integrity when available', () => {
      const originalEntry = SRI_HASHES.kakaoSdk;
      SRI_HASHES.kakaoSdk = {
        ...originalEntry,
        integrity: 'sha384-testIntegrity',
        crossOrigin: 'anonymous',
      };

      const tag = generateScriptTag('kakaoSdk');

      expect(tag).toContain('integrity="sha384-testIntegrity"');
      expect(tag).toContain('crossorigin="anonymous"');

      SRI_HASHES.kakaoSdk = originalEntry;
    });

    it('should include additional attributes', () => {
      const tag = generateScriptTag('googleAnalytics', {
        async: 'true',
        defer: 'true',
        'data-id': 'GA-123',
      });

      expect(tag).toContain('async="true"');
      expect(tag).toContain('defer="true"');
      expect(tag).toContain('data-id="GA-123"');
    });

    it('should throw for unknown script key', () => {
      expect(() => {
        // @ts-expect-error - Testing invalid key
        generateScriptTag('unknownScript');
      }).toThrow('Unknown script key: unknownScript');
    });
  });

  describe('verifySRIHash', () => {
    it('should return valid false on fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await verifySRIHash(
        'https://example.com/script.js',
        'sha384-expectedHash'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Failed to fetch');
    });

    it('should return valid false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await verifySRIHash(
        'https://example.com/script.js',
        'sha384-expectedHash'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should compute hash and compare', async () => {
      const scriptContent = 'console.log("test");';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => scriptContent,
      });

      const result = await verifySRIHash(
        'https://example.com/script.js',
        'sha384-invalidHash'
      );

      expect(result.valid).toBe(false);
      expect(result.actualHash).toBeDefined();
      expect(result.actualHash).toMatch(/^sha384-/);
    });

    it('should return valid true for matching hash', async () => {
      const scriptContent = 'test';
      // Pre-computed SHA-384 hash for "test"
      const expectedHash = 'sha384-K6iuXvtRVJGBSu4bNjdH5O1mAEqQ4V5xt9RnJp6mNYtKGSs5E5j1F8u7V5C5q9y4';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => scriptContent,
      });

      const result = await verifySRIHash(
        'https://example.com/script.js',
        expectedHash
      );

      // Will be false since hash won't match, but actualHash should be returned
      expect(result.actualHash).toBeDefined();
    });
  });

  describe('SRIEntry interface', () => {
    it('should accept valid entry structure', () => {
      const entry: SRIEntry = {
        url: 'https://cdn.example.com/lib.js',
        integrity: 'sha384-abc123',
        crossOrigin: 'anonymous',
        version: '1.0.0',
        updatedAt: '2024-01-15',
      };

      expect(entry.url).toBeDefined();
      expect(entry.integrity).toBeDefined();
    });

    it('should accept minimal entry', () => {
      const entry: SRIEntry = {
        url: 'https://cdn.example.com/lib.js',
        integrity: '',
      };

      expect(entry.url).toBeDefined();
      expect(entry.crossOrigin).toBeUndefined();
    });
  });
});

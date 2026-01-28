// tests/scripts/scripts-smoke.test.ts
/**
 * Smoke tests for script files
 * Validates that all script files exist
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

describe('Scripts Smoke Tests', () => {
  const scriptsDir = resolve(process.cwd(), 'scripts');

  describe('Automation Scripts', () => {
    it('should have daily fortune post script', () => {
      const filePath = resolve(scriptsDir, 'auto-post-daily-fortune.mjs');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Code Quality Scripts', () => {
    it('should have migrate console to logger script', () => {
      const filePath = resolve(scriptsDir, 'migrate-console-to-logger.js');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Setup Scripts', () => {
    it('should have wait for server script', () => {
      const filePath = resolve(scriptsDir, 'wait-for-server.mjs');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have owasp zap baseline script', () => {
      const filePath = resolve(scriptsDir, 'owasp-zap-baseline.mjs');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have validate env script', () => {
      const filePath = resolve(scriptsDir, 'validate-env.js');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Cleanup Scripts', () => {
    it('should have clear oauth tokens script', () => {
      const filePath = resolve(scriptsDir, 'cleanup/clear-oauth-tokens.js');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Dev Scripts', () => {
    it('should have dev-astro script', () => {
      const filePath = resolve(scriptsDir, 'dev-astro.ts');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Scripts Summary', () => {
    it('should have all essential script files', () => {
      const scripts = [
        'auto-post-daily-fortune.mjs',
        'migrate-console-to-logger.js',
        'wait-for-server.mjs',
        'owasp-zap-baseline.mjs',
        'validate-env.js',
        'dev-astro.ts',
        'cleanup/clear-oauth-tokens.js',
      ];

      scripts.forEach((script) => {
        const filePath = resolve(scriptsDir, script);
        expect(existsSync(filePath)).toBe(true);
      });

      expect(scripts.length).toBe(7);
    });
  });
});

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

  describe('Database Scripts (4)', () => {
    it('should have apply-schema script', () => {
      const filePath = resolve(scriptsDir, 'apply-schema.js');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have load-env-and-push script', () => {
      const filePath = resolve(scriptsDir, 'load-env-and-push.js');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have migrate-test-db script', () => {
      const filePath = resolve(scriptsDir, 'migrate-test-db.js');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have push-test-schema script', () => {
      const filePath = resolve(scriptsDir, 'push-test-schema.js');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Analysis Scripts (6)', () => {
    it('should have layer1 analysis script', () => {
      const filePath = resolve(scriptsDir, 'analyze-layer1-current.mjs');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have layer2 analysis script', () => {
      const filePath = resolve(scriptsDir, 'analyze-layer2-improvements.mjs');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have layer8 analysis script', () => {
      const filePath = resolve(scriptsDir, 'analyze-layer8-priority.mjs');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have layers 3-5-7 analysis script', () => {
      const filePath = resolve(scriptsDir, 'analyze-layers-3-5-7.mjs');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have mid-priority analysis script', () => {
      const filePath = resolve(scriptsDir, 'analyze-mid-priority.mjs');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have remaining analysis script', () => {
      const filePath = resolve(scriptsDir, 'analyze-remaining-3-5-7.mjs');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Automation Scripts (3)', () => {
    it('should have daily fortune post script', () => {
      const filePath = resolve(scriptsDir, 'auto-post-daily-fortune.mjs');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have enhanced auto post script', () => {
      const filePath = resolve(scriptsDir, 'enhanced-auto-post.mjs');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have bootstrap python script', () => {
      const filePath = resolve(scriptsDir, 'bootstrap-python.mjs');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Data Processing Scripts (3)', () => {
    it('should have csv to cities json script', () => {
      const filePath = resolve(scriptsDir, 'csv-to-cities-json.mjs');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have fix lat-lon script', () => {
      const filePath = resolve(scriptsDir, 'fix-lat-lon.mjs');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have prediction context script', () => {
      const filePath = resolve(scriptsDir, 'add-prediction-context.mjs');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Code Quality Scripts (3)', () => {
    it('should have check quotes script', () => {
      const filePath = resolve(scriptsDir, 'check-quotes.mjs');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have fix quotes script', () => {
      const filePath = resolve(scriptsDir, 'fix-quotes.mjs');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have migrate console to logger script', () => {
      const filePath = resolve(scriptsDir, 'migrate-console-to-logger.js');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Setup Scripts (3)', () => {
    it('should have download ephe script', () => {
      const filePath = resolve(scriptsDir, 'download-ephe.js');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have wait for server script', () => {
      const filePath = resolve(scriptsDir, 'wait-for-server.mjs');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have owasp zap baseline script', () => {
      const filePath = resolve(scriptsDir, 'owasp-zap-baseline.mjs');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Cleanup Scripts (1)', () => {
    it('should have clear oauth tokens script', () => {
      const filePath = resolve(scriptsDir, 'cleanup/clear-oauth-tokens.js');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Scripts Summary', () => {
    it('should have all essential script files', () => {
      const scripts = [
        // Database (4)
        'apply-schema.js',
        'load-env-and-push.js',
        'migrate-test-db.js',
        'push-test-schema.js',

        // Analysis (6)
        'analyze-layer1-current.mjs',
        'analyze-layer2-improvements.mjs',
        'analyze-layer8-priority.mjs',
        'analyze-layers-3-5-7.mjs',
        'analyze-mid-priority.mjs',
        'analyze-remaining-3-5-7.mjs',

        // Automation (3)
        'auto-post-daily-fortune.mjs',
        'enhanced-auto-post.mjs',
        'bootstrap-python.mjs',

        // Data Processing (3)
        'csv-to-cities-json.mjs',
        'fix-lat-lon.mjs',
        'add-prediction-context.mjs',

        // Code Quality (3)
        'check-quotes.mjs',
        'fix-quotes.mjs',
        'migrate-console-to-logger.js',

        // Setup (3)
        'download-ephe.js',
        'wait-for-server.mjs',
        'owasp-zap-baseline.mjs',

        // Cleanup (1)
        'cleanup/clear-oauth-tokens.js',
      ];

      scripts.forEach((script) => {
        const filePath = resolve(scriptsDir, script);
        expect(existsSync(filePath)).toBe(true);
      });

      expect(scripts.length).toBe(23);
    });
  });
});

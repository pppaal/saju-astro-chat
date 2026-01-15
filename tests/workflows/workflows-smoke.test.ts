// tests/workflows/workflows-smoke.test.ts
/**
 * Smoke tests for GitHub Actions workflows
 * Validates that all workflow files exist
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

describe('GitHub Workflows Smoke Tests', () => {
  const workflowsDir = resolve(process.cwd(), '.github/workflows');

  describe('CI/CD Workflows (3)', () => {
    it('should have ci workflow', () => {
      const filePath = resolve(workflowsDir, 'ci.yml');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have deploy preview workflow', () => {
      const filePath = resolve(workflowsDir, 'deploy-preview.yml');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have deploy production workflow', () => {
      const filePath = resolve(workflowsDir, 'deploy-production.yml');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Testing Workflows (3)', () => {
    it('should have e2e browser workflow', () => {
      const filePath = resolve(workflowsDir, 'e2e-browser.yml');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have performance tests workflow', () => {
      const filePath = resolve(workflowsDir, 'performance-tests.yml');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have pr checks workflow', () => {
      const filePath = resolve(workflowsDir, 'pr-checks.yml');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Quality & Security Workflows (3)', () => {
    it('should have quality workflow', () => {
      const filePath = resolve(workflowsDir, 'quality.yml');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have security workflow', () => {
      const filePath = resolve(workflowsDir, 'security.yml');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have owasp zap workflow', () => {
      const filePath = resolve(workflowsDir, 'owasp-zap.yml');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Workflows Summary', () => {
    it('should have all essential workflow files', () => {
      const workflows = [
        'ci.yml',
        'deploy-preview.yml',
        'deploy-production.yml',
        'e2e-browser.yml',
        'performance-tests.yml',
        'pr-checks.yml',
        'quality.yml',
        'security.yml',
        'owasp-zap.yml',
      ];

      workflows.forEach((workflow) => {
        const filePath = resolve(workflowsDir, workflow);
        expect(existsSync(filePath)).toBe(true);
      });

      expect(workflows.length).toBe(9);
    });
  });
});

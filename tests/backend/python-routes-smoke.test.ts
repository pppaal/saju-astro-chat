// tests/backend/python-routes-smoke.test.ts
/**
 * Smoke tests for Python backend routes
 * Validates that all Python route files exist
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

describe('Python Backend Routes Smoke Tests', () => {
  const backendDir = resolve(process.cwd(), 'backend_ai/app/routers');

  describe('Core Routes (19)', () => {
    it('should have astrology routes', () => {
      const filePath = resolve(backendDir, 'astrology_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have cache routes', () => {
      const filePath = resolve(backendDir, 'cache_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have chart routes', () => {
      const filePath = resolve(backendDir, 'chart_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have compatibility routes', () => {
      const filePath = resolve(backendDir, 'compatibility_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have core routes', () => {
      const filePath = resolve(backendDir, 'core_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have counseling routes', () => {
      const filePath = resolve(backendDir, 'counseling_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have dream routes', () => {
      const filePath = resolve(backendDir, 'dream_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have fortune routes', () => {
      const filePath = resolve(backendDir, 'fortune_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have health routes', () => {
      const filePath = resolve(backendDir, 'health_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have iching routes', () => {
      const filePath = resolve(backendDir, 'iching_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have icp routes', () => {
      const filePath = resolve(backendDir, 'icp_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have numerology routes', () => {
      const filePath = resolve(backendDir, 'numerology_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have prediction routes', () => {
      const filePath = resolve(backendDir, 'prediction_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have rlhf routes', () => {
      const filePath = resolve(backendDir, 'rlhf_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have saju routes', () => {
      const filePath = resolve(backendDir, 'saju_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have search routes', () => {
      const filePath = resolve(backendDir, 'search_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have stream routes', () => {
      const filePath = resolve(backendDir, 'stream_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have tarot routes', () => {
      const filePath = resolve(backendDir, 'tarot_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have theme routes', () => {
      const filePath = resolve(backendDir, 'theme_routes.py');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Services (1)', () => {
    it('should have birth data service', () => {
      const filePath = resolve(process.cwd(), 'backend_ai/app/services/birth_data_service.py');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('Python Backend Summary', () => {
    it('should have all Python route files', () => {
      const routes = [
        'astrology_routes.py',
        'cache_routes.py',
        'chart_routes.py',
        'compatibility_routes.py',
        'core_routes.py',
        'counseling_routes.py',
        'dream_routes.py',
        'fortune_routes.py',
        'health_routes.py',
        'iching_routes.py',
        'icp_routes.py',
        'numerology_routes.py',
        'prediction_routes.py',
        'rlhf_routes.py',
        'saju_routes.py',
        'search_routes.py',
        'stream_routes.py',
        'tarot_routes.py',
        'theme_routes.py',
      ];

      routes.forEach((route) => {
        const filePath = resolve(backendDir, route);
        expect(existsSync(filePath)).toBe(true);
      });

      expect(routes.length).toBe(19);
    });
  });
});

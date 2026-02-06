// tests/config/config-smoke.test.ts
/**
 * Smoke tests for configuration files
 * Validates that all config files can be imported or exist
 */
import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { resolve } from 'path'

describe('Config Files Smoke Tests', () => {
  describe('Next.js Config (1)', () => {
    it('should have next.config.ts', () => {
      const filePath = resolve(process.cwd(), 'next.config.ts')
      expect(existsSync(filePath)).toBe(true)
    })
  })

  describe('Vitest Config (1)', () => {
    it('should have vitest.config.ts', () => {
      const filePath = resolve(process.cwd(), 'vitest.config.ts')
      expect(existsSync(filePath)).toBe(true)
    })
  })

  describe('Playwright Config (3)', () => {
    it('should have playwright.config.ts', () => {
      const filePath = resolve(process.cwd(), 'playwright.config.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('should have playwright.ci.config.ts', () => {
      const filePath = resolve(process.cwd(), 'playwright.ci.config.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('should have playwright.critical.config.ts', () => {
      const filePath = resolve(process.cwd(), 'playwright.critical.config.ts')
      expect(existsSync(filePath)).toBe(true)
    })
  })

  describe('Prisma Config (2)', () => {
    it('should have prisma schema', () => {
      const filePath = resolve(process.cwd(), 'prisma/schema.prisma')
      expect(existsSync(filePath)).toBe(true)
    })

    it('should have prisma config', () => {
      const filePath = resolve(process.cwd(), 'prisma.config.ts')
      expect(existsSync(filePath)).toBe(true)
    })
  })

  describe('TypeScript Config (1)', () => {
    it('should have tsconfig.json', () => {
      const filePath = resolve(process.cwd(), 'tsconfig.json')
      expect(existsSync(filePath)).toBe(true)
    })
  })

  describe('Package Config (2)', () => {
    it('should have package.json', () => {
      const filePath = resolve(process.cwd(), 'package.json')
      expect(existsSync(filePath)).toBe(true)
    })

    it('should have package-lock.json', () => {
      const filePath = resolve(process.cwd(), 'package-lock.json')
      expect(existsSync(filePath)).toBe(true)
    })
  })

  describe('Environment & Validation (1)', () => {
    it('should import env config', async () => {
      const env = await import('@/lib/env')

      expect(env).toBeDefined()
      expect(Object.keys(env).length).toBeGreaterThan(0)
    })

    // Skipped: validateEnv module does not exist (only env.ts exists)
    it.skip('should import validateEnv (skipped - module does not exist)', async () => {})
  })

  describe('Config Summary', () => {
    it('should have all essential config files', () => {
      const configs = [
        'next.config.ts',
        'vitest.config.ts',
        'playwright.config.ts',
        'playwright.ci.config.ts',
        'playwright.critical.config.ts',
        'prisma/schema.prisma',
        'prisma.config.ts',
        'tsconfig.json',
        'package.json',
        'package-lock.json',
      ]

      configs.forEach((config) => {
        const filePath = resolve(process.cwd(), config)
        expect(existsSync(filePath)).toBe(true)
      })

      expect(configs.length).toBe(10)
    })
  })
})

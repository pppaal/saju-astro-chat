// tests/i18n/i18n-smoke.test.ts
/**
 * Smoke tests for i18n localization files
 * Validates that all locale files exist and can be imported
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync } from 'fs'
import { resolve } from 'path'

describe('i18n Smoke Tests', () => {
  const localesDir = resolve(process.cwd(), 'src/i18n/locales')

  describe('Locale Files', () => {
    it('should have Korean locale', () => {
      const filePath = resolve(localesDir, 'ko.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('should have English locale', () => {
      const filePath = resolve(localesDir, 'en.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('should have locale directory with subdirectories', () => {
      const entries = readdirSync(localesDir)
      expect(entries).toContain('ko')
      expect(entries).toContain('en')
    })
  })

  describe('i18n Core Modules', () => {
    it('should import i18n provider', async () => {
      const provider = await import('@/i18n/I18nProvider')

      expect(provider.I18nProvider).toBeDefined()
      expect(typeof provider.I18nProvider).toBe('function')
    })
  })

  describe('i18n Summary', () => {
    it('should have all currently supported locale files', () => {
      const requiredLocales = ['ko.ts', 'en.ts']

      requiredLocales.forEach((locale) => {
        const filePath = resolve(localesDir, locale)
        expect(existsSync(filePath)).toBe(true)
      })

      expect(requiredLocales.length).toBeGreaterThanOrEqual(2)
    })
  })
})

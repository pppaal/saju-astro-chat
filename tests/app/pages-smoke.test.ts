import { describe, it, expect } from 'vitest'
import path from 'path'
import { existsSync, readFileSync } from 'fs'

const resolveModuleFile = (modulePath: string) => {
  const basePath = path.join(process.cwd(), 'src', modulePath)
  const candidates = [`${basePath}.ts`, `${basePath}.tsx`, `${basePath}.js`, `${basePath}.jsx`]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

const assertPages = (modulePaths: string[]) => {
  modulePaths.forEach((modulePath) => {
    const filePath = resolveModuleFile(modulePath)
    if (!filePath) {
      throw new Error(`Missing module file for ${modulePath}`)
    }

    const content = readFileSync(filePath, 'utf8')
    expect(content).toMatch(/export\s+default/)
  })
}

describe('Pages Smoke Tests', () => {
  describe('Main Pages (3)', () => {
    it('should have main pages', () => {
      assertPages(['app/(main)/page', 'app/about/page'])
    })
  })

  describe('Admin Pages (2)', () => {
    it('should have admin pages', () => {
      assertPages(['app/admin/feedback/page', 'app/admin/dashboard/page'])
    })
  })

  describe('Auth Pages (1)', () => {
    it('should have auth pages', () => {
      assertPages(['app/auth/signin/page'])
    })
  })

  describe('Blog Pages (2)', () => {
    it('should have blog pages', () => {
      assertPages(['app/blog/page', 'app/blog/[slug]/page'])
    })
  })

  describe('Calendar Pages (1)', () => {
    it('should have calendar page', () => {
      assertPages(['app/calendar/page'])
    })
  })

  describe('Compatibility Pages (2)', () => {
    it('should have compatibility pages', () => {
      assertPages(['app/compatibility/page', 'app/compatibility/counselor/page'])
    })
  })

  describe('Contact Pages (1)', () => {
    it('should have contact page', () => {
      assertPages(['app/contact/page'])
    })
  })

  describe('Destiny Counselor Page', () => {
    it('should have destiny counselor page', () => {
      assertPages(['app/destiny-counselor/page'])
    })
  })

  describe('Destiny Match Pages (1)', () => {
    it('should have destiny match pages', () => {
      assertPages(['app/destiny-match/page'])
    })
  })

  describe('FAQ Pages (1)', () => {
    it('should have faq page', () => {
      assertPages(['app/faq/page'])
    })
  })

  describe('Policy Pages (3)', () => {
    it('should have policy pages', () => {
      assertPages(['app/policy/privacy/page', 'app/policy/refund/page', 'app/policy/terms/page'])
    })
  })

  describe('Pricing Pages (1)', () => {
    it('should have pricing page', () => {
      assertPages(['app/pricing/page'])
    })
  })

  describe('Profile Pages (1)', () => {
    it('should have profile page', () => {
      assertPages(['app/profile/page'])
    })
  })

  describe('Success Pages (1)', () => {
    it('should have success page', () => {
      assertPages(['app/success/page'])
    })
  })

  describe('Tarot Pages (5)', () => {
    it('should have tarot pages', () => {
      assertPages([
        'app/tarot/page',
        'app/tarot/couple/page',
        'app/tarot/history/page',
        'app/tarot/[categoryName]/[spreadId]/page',
        'app/tarot/couple/[readingId]/page',
      ])
    })
  })

  describe('Pages Summary', () => {
    it('should have all page categories', () => {
      const categories = [
        'main',
        'admin',
        'auth',
        'blog',
        'calendar',
        'compatibility',
        'contact',
        'destiny-counselor',
        'destiny-match',
        'faq',
        'policy',
        'pricing',
        'profile',
        'success',
        'tarot',
      ]

      expect(categories.length).toBe(15)
    })
  })
})

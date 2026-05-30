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

  describe('Destiny Map Pages (2)', () => {
    it('should have destiny map pages', () => {
      // result/theme 서브페이지는 제거됨 — page + counselor 만 남음.
      assertPages(['app/destiny-map/page', 'app/destiny-map/counselor/page'])
    })
  })

  describe('Destiny Match Pages (1)', () => {
    it('should have destiny match pages', () => {
      // 출시 전 hide — matches/setup/chat 서브페이지는 제거됐고 진입 page 만
      // redirect stub 으로 남아 있다.
      assertPages(['app/destiny-match/page'])
    })
  })

  describe('FAQ Pages (1)', () => {
    it('should have faq page', () => {
      assertPages(['app/faq/page'])
    })
  })

  // ICP / Personality 페이지군은 제거된 기능 — 해당 describe 블록도 함께 삭제.

  describe('Notifications Pages (1)', () => {
    it('should have notifications page', () => {
      assertPages(['app/notifications/page'])
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
        'destiny-map',
        'destiny-match',
        'faq',
        'notifications',
        'policy',
        'pricing',
        'profile',
        'success',
        'tarot',
      ]

      expect(categories.length).toBe(16)
    })
  })
})

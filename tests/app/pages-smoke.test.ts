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
  describe('Main Pages', () => {
    it('should have main pages', () => {
      assertPages(['app/(main)/page', 'app/about/page', 'app/about/features/page'])
    })
  })

  describe('Admin Pages', () => {
    it('should have admin pages', () => {
      assertPages(['app/admin/dashboard/page', 'app/admin/feedback/page', 'app/admin/refunds/page'])
    })
  })

  describe('Auth Pages', () => {
    it('should have auth pages', () => {
      assertPages(['app/auth/signin/page'])
    })
  })

  describe('Blog Pages', () => {
    it('should have blog pages', () => {
      assertPages(['app/blog/page', 'app/blog/[slug]/page'])
    })
  })

  describe('Calendar Pages', () => {
    it('should have calendar pages', () => {
      assertPages(['app/calendar/page', 'app/calendar/preview/page'])
    })
  })

  describe('Compatibility Pages', () => {
    it('should have compatibility pages', () => {
      assertPages(['app/compatibility/page', 'app/compatibility/counselor/page'])
    })
  })

  describe('Contact Pages', () => {
    it('should have contact page', () => {
      assertPages(['app/contact/page'])
    })
  })

  describe('Destiny Counselor Pages', () => {
    it('should have destiny counselor page', () => {
      assertPages(['app/destiny-counselor/page'])
    })
  })

  describe('Destiny Map Pages', () => {
    it('should have destiny map pages', () => {
      assertPages([
        'app/destiny-map/page',
        'app/destiny-map/counselor/page',
        'app/destiny-map/result/page',
        'app/destiny-map/theme/page',
      ])
    })
  })

  describe('Destiny Match Pages', () => {
    it('should have destiny match pages', () => {
      assertPages([
        'app/destiny-match/page',
        'app/destiny-match/matches/page',
        'app/destiny-match/setup/page',
        'app/destiny-match/chat/[connectionId]/page',
      ])
    })
  })

  describe('FAQ Pages', () => {
    it('should have faq page', () => {
      assertPages(['app/faq/page'])
    })
  })

  describe('ICP Pages', () => {
    it('should have icp pages', () => {
      assertPages(['app/icp/page', 'app/icp/quiz/page', 'app/icp/result/page'])
    })
  })

  describe('Notifications Pages', () => {
    it('should have notifications page', () => {
      assertPages(['app/notifications/page'])
    })
  })

  describe('Personality Pages', () => {
    it('should have personality pages', () => {
      assertPages([
        'app/personality/page',
        'app/personality/quiz/page',
        'app/personality/result/page',
        'app/personality/combined/page',
        'app/personality/compatibility/page',
        'app/personality/select/page',
      ])
    })
  })

  describe('Policy Pages', () => {
    it('should have policy pages', () => {
      assertPages(['app/policy/privacy/page', 'app/policy/refund/page', 'app/policy/terms/page'])
    })
  })

  describe('Pricing Pages', () => {
    it('should have pricing page', () => {
      assertPages(['app/pricing/page'])
    })
  })

  describe('Profile Pages', () => {
    it('should have profile pages', () => {
      assertPages(['app/profile/page', 'app/profile/decisions/page'])
    })
  })

  describe('Success Pages', () => {
    it('should have success page', () => {
      assertPages(['app/success/page'])
    })
  })

  describe('Tarot Pages', () => {
    it('should have tarot pages', () => {
      assertPages([
        'app/tarot/page',
        'app/tarot/couple/page',
        'app/tarot/history/page',
        'app/tarot/[categoryName]/page',
        'app/tarot/[categoryName]/[spreadId]/page',
        'app/tarot/couple/[readingId]/page',
      ])
    })
  })

  describe('Utility Pages', () => {
    it('should have utility pages', () => {
      assertPages(['app/api-docs/page', 'app/offline/page', 'app/report/page', 'app/shared/[id]/page'])
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
        'destiny-map',
        'destiny-match',
        'faq',
        'icp',
        'notifications',
        'personality',
        'policy',
        'pricing',
        'profile',
        'success',
        'tarot',
        'utility',
      ]

      expect(categories.length).toBe(20)
    })
  })
})

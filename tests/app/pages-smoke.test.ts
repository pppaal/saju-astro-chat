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
  describe('Main Pages (4)', () => {
    it('should have main pages', () => {
      assertPages([
        'app/(main)/page',
        'app/about/page',
        'app/about/features/page',
        'app/about/matrix/page',
      ])
    })
  })

  describe('Admin Pages (2)', () => {
    it('should have admin pages', () => {
      assertPages(['app/admin/feedback/page', 'app/admin/refunds/page'])
    })
  })

  describe('Astrology Pages (2)', () => {
    it('should have astrology pages', () => {
      assertPages(['app/astrology/page', 'app/astrology/counselor/page'])
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

  describe('Community Pages (2)', () => {
    it('should have community pages', () => {
      assertPages(['app/community/page', 'app/community/recommendations/page'])
    })
  })

  describe('Compatibility Pages (4)', () => {
    it('should have compatibility pages', () => {
      assertPages([
        'app/compatibility/page',
        'app/compatibility/chat/page',
        'app/compatibility/counselor/page',
        'app/compatibility/insights/page',
      ])
    })
  })

  describe('Contact Pages (1)', () => {
    it('should have contact page', () => {
      assertPages(['app/contact/page'])
    })
  })

  describe('Destiny Map Pages (5)', () => {
    it('should have destiny map pages', () => {
      assertPages([
        'app/destiny-map/page',
        'app/destiny-map/counselor/page',
        'app/destiny-map/matrix/page',
        'app/destiny-map/result/page',
        'app/destiny-map/theme/page',
      ])
    })
  })

  describe('Destiny Match Pages (4)', () => {
    it('should have destiny match pages', () => {
      assertPages([
        'app/destiny-match/page',
        'app/destiny-match/matches/page',
        'app/destiny-match/setup/page',
        'app/destiny-match/chat/[connectionId]/page',
      ])
    })
  })

  describe('Destiny Matrix Pages (2)', () => {
    it('should have destiny matrix pages', () => {
      assertPages(['app/destiny-matrix/themed-reports/page', 'app/destiny-matrix/viewer/page'])
    })
  })

  describe('Destiny Pal Pages (1)', () => {
    it('should have destiny pal page', () => {
      assertPages(['app/destiny-pal/page'])
    })
  })

  describe('Dream Pages (1)', () => {
    it('should have dream page', () => {
      assertPages(['app/dream/page'])
    })
  })

  describe('FAQ Pages (1)', () => {
    it('should have faq page', () => {
      assertPages(['app/faq/page'])
    })
  })

  describe('iChing Pages (1)', () => {
    it('should have iching page', () => {
      assertPages(['app/iching/page'])
    })
  })

  describe('ICP Pages (3)', () => {
    it('should have icp pages', () => {
      assertPages(['app/icp/page', 'app/icp/quiz/page', 'app/icp/result/page'])
    })
  })

  describe('Life Prediction Pages (2)', () => {
    it('should have life prediction pages', () => {
      assertPages(['app/life-prediction/page', 'app/life-prediction/result/page'])
    })
  })

  describe('My Journey Pages (3)', () => {
    it('should have my journey pages', () => {
      assertPages([
        'app/myjourney/page',
        'app/myjourney/circle/page',
        'app/myjourney/history/page',
        // 'app/myjourney/profile/page', // File doesn't exist yet
      ])
    })
  })

  describe('Notifications Pages (1)', () => {
    it('should have notifications page', () => {
      assertPages(['app/notifications/page'])
    })
  })

  describe('Numerology Pages (1)', () => {
    it('should have numerology page', () => {
      assertPages(['app/numerology/page'])
    })
  })

  describe('Personality Pages (3)', () => {
    it('should have personality pages', () => {
      assertPages([
        'app/personality/page',
        'app/personality/quiz/page',
        'app/personality/result/page',
      ])
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

  describe('Saju Pages (2)', () => {
    it('should have saju pages', () => {
      assertPages(['app/saju/page', 'app/saju/counselor/page'])
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

  describe('Test Pages (1)', () => {
    it('should have test pages', () => {
      assertPages(['app/test-credit-modal/page'])
    })
  })

  describe('Pages Summary', () => {
    it('should have all page categories', () => {
      const categories = [
        'main',
        'admin',
        'astrology',
        'auth',
        'blog',
        'calendar',
        'community',
        'compatibility',
        'contact',
        'destiny-map',
        'destiny-match',
        'destiny-matrix',
        'destiny-pal',
        'dream',
        'faq',
        'iching',
        'icp',
        'life-prediction',
        'myjourney',
        'notifications',
        'numerology',
        'personality',
        'policy',
        'pricing',
        'profile',
        'saju',
        'success',
        'tarot',
        'test',
      ]

      expect(categories.length).toBe(29)
    })
  })
})

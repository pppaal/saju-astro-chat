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

const assertModules = (modulePaths: string[]) => {
  modulePaths.forEach((modulePath) => {
    const filePath = resolveModuleFile(modulePath)
    if (!filePath) {
      throw new Error(`Missing module file for ${modulePath}`)
    }

    const content = readFileSync(filePath, 'utf8')
    expect(content).toMatch(/export\s+/)
  })
}

describe('API Routes Smoke Tests', () => {
  describe('Admin Routes (1)', () => {
    it('should have admin routes', () => {
      assertModules(['app/api/admin/overview/route', 'app/api/admin/metrics/route'])
    })
  })

  describe('Astrology Routes', () => {
    it('should have astrology core routes', () => {
      assertModules(['app/api/astrology/route'])
    })

    it('should have astrology advanced routes', () => {
      // asteroids/draconic/harmonics/midpoints — Hellenistic 정통 단일화 후
      // 소비처 0 이라 라우트째 삭제됨 (2026-07 DEAD 정리).
      assertModules([
        'app/api/astrology/advanced/eclipses/route',
        'app/api/astrology/advanced/fixed-stars/route',
        'app/api/astrology/advanced/lunar-return/route',
        'app/api/astrology/advanced/progressions/route',
        'app/api/astrology/advanced/solar-return/route',
      ])
    })
  })

  describe('Auth Routes (1)', () => {
    it('should have auth routes', () => {
      assertModules(['app/api/auth/revoke/route'])
    })
  })

  describe('Checkout Routes (1)', () => {
    it('should have checkout route', () => {
      assertModules(['app/api/checkout/route'])
    })
  })

  describe('Cities Routes (1)', () => {
    it('should have cities route', () => {
      assertModules(['app/api/cities/route'])
    })
  })

  describe('Compatibility Routes', () => {
    it('should have compatibility routes', () => {
      assertModules(['app/api/compatibility/counselor/route'])
    })
  })

  describe('Counselor Routes (4)', () => {
    it('should have counselor routes', () => {
      assertModules([
        'app/api/counselor/chat-history/route',
        'app/api/counselor/session/list/route',
        'app/api/counselor/session/load/route',
        'app/api/counselor/session/save/route',
      ])
    })
  })

  describe('Cron Routes', () => {
    it('should have cron routes', () => {
      assertModules(['app/api/cron/reset-credits/route'])
    })
  })

  describe('Me Routes (3)', () => {
    it('should have user profile routes', () => {
      assertModules([
        'app/api/me/circle/route',
        'app/api/me/credits/route',
        'app/api/me/profile/route',
      ])
    })
  })

  describe('Referral Routes', () => {
    it('should have referral routes', () => {
      assertModules([
        'app/api/referral/claim/route',
        'app/api/referral/create-code/route',
        'app/api/referral/me/route',
      ])
    })
  })

  describe('Saju Routes (1)', () => {
    it('should have saju routes', () => {
      assertModules(['app/api/saju/route'])
    })
  })

  describe('Tarot Routes', () => {
    it('should have tarot core routes', () => {
      assertModules([
        'app/api/tarot/route',
        'app/api/tarot/followup/route',
        'app/api/tarot/interpret-stream/route',
      ])
    })

    it('should have tarot save routes', () => {
      assertModules(['app/api/tarot/save/route', 'app/api/tarot/save/[id]/route'])
    })
  })

  describe('Webhook Routes (1)', () => {
    it('should have webhook routes', () => {
      assertModules(['app/api/webhook/stripe/route'])
    })
  })

  describe('API Routes Summary', () => {
    it('should have a route module under each expected API category directory', () => {
      const categories = [
        'admin',
        'astrology',
        'auth',
        'checkout',
        'cities',
        'compatibility',
        'counselor',
        'cron',
        'me',
        'referral',
        'saju',
        'tarot',
        'webhook',
      ]

      categories.forEach((category) => {
        const dir = path.join(process.cwd(), 'src', 'app', 'api', category)
        expect(existsSync(dir)).toBe(true)
      })
    })
  })
})

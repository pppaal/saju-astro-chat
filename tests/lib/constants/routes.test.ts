/**
 * Tests for src/lib/constants/routes.ts
 * 앱 라우트 상수 테스트
 */

import { describe, it, expect } from 'vitest'
import {
  CATEGORY_ROUTES,
  ROUTES,
  getCategoryRoute,
} from '@/lib/constants/routes'

describe('routes', () => {
  describe('CATEGORY_ROUTES', () => {
    describe('Data structure', () => {
      it('should define 9 category routes', () => {
        const keys = Object.keys(CATEGORY_ROUTES)
        expect(keys).toHaveLength(9)
      })

      it('should have all values as route strings starting with /', () => {
        Object.values(CATEGORY_ROUTES).forEach((route) => {
          expect(typeof route).toBe('string')
          expect(route.startsWith('/')).toBe(true)
        })
      })
    })

    describe('Category mappings', () => {
      it('should map Saju to /saju', () => {
        expect(CATEGORY_ROUTES.Saju).toBe('/saju')
      })

      it('should map Astrology to /astrology', () => {
        expect(CATEGORY_ROUTES.Astrology).toBe('/astrology')
      })

      it('should map Tarot to /tarot', () => {
        expect(CATEGORY_ROUTES.Tarot).toBe('/tarot')
      })

      it('should map Numerology to /numerology', () => {
        expect(CATEGORY_ROUTES.Numerology).toBe('/numerology')
      })

      it('should map I Ching to /iching', () => {
        expect(CATEGORY_ROUTES['I Ching']).toBe('/iching')
      })

      it('should map Dream to /dream', () => {
        expect(CATEGORY_ROUTES.Dream).toBe('/dream')
      })

      it('should map Compatibility to /destiny-match', () => {
        expect(CATEGORY_ROUTES.Compatibility).toBe('/destiny-match')
      })

      it('should map Personality to /personality', () => {
        expect(CATEGORY_ROUTES.Personality).toBe('/personality')
      })

      it('should map Destiny Map to /destiny-map', () => {
        expect(CATEGORY_ROUTES['Destiny Map']).toBe('/destiny-map')
      })
    })

    describe('Route format', () => {
      it('should have lowercase routes', () => {
        Object.values(CATEGORY_ROUTES).forEach((route) => {
          const routeWithoutSlash = route.substring(1)
          expect(routeWithoutSlash).toBe(routeWithoutSlash.toLowerCase())
        })
      })

      it('should not have trailing slashes', () => {
        Object.values(CATEGORY_ROUTES).forEach((route) => {
          expect(route.endsWith('/')).toBe(false)
        })
      })

      it('should have single leading slash', () => {
        Object.values(CATEGORY_ROUTES).forEach((route) => {
          expect(route.startsWith('/')).toBe(true)
          expect(route.startsWith('//')).toBe(false)
        })
      })
    })

    describe('Uniqueness', () => {
      it('should have unique route values', () => {
        const routes = Object.values(CATEGORY_ROUTES)
        const uniqueRoutes = new Set(routes)
        expect(uniqueRoutes.size).toBe(routes.length)
      })

      it('should have unique category keys', () => {
        const keys = Object.keys(CATEGORY_ROUTES)
        const uniqueKeys = new Set(keys)
        expect(uniqueKeys.size).toBe(keys.length)
      })
    })
  })

  describe('ROUTES', () => {
    describe('Data structure', () => {
      it('should define 18 main routes', () => {
        const keys = Object.keys(ROUTES)
        expect(keys).toHaveLength(18)
      })

      it('should have all values as route strings starting with /', () => {
        Object.values(ROUTES).forEach((route) => {
          expect(typeof route).toBe('string')
          expect(route.startsWith('/')).toBe(true)
        })
      })
    })

    describe('Main routes', () => {
      it('should define HOME route', () => {
        expect(ROUTES.HOME).toBe('/')
      })

      it('should define BLOG route', () => {
        expect(ROUTES.BLOG).toBe('/blog')
      })

      it('should define SAJU route', () => {
        expect(ROUTES.SAJU).toBe('/saju')
      })

      it('should define ASTROLOGY route', () => {
        expect(ROUTES.ASTROLOGY).toBe('/astrology')
      })

      it('should define TAROT route', () => {
        expect(ROUTES.TAROT).toBe('/tarot')
      })

      it('should define NUMEROLOGY route', () => {
        expect(ROUTES.NUMEROLOGY).toBe('/numerology')
      })

      it('should define ICHING route', () => {
        expect(ROUTES.ICHING).toBe('/iching')
      })

      it('should define DREAM route', () => {
        expect(ROUTES.DREAM).toBe('/dream')
      })

      it('should define COMPATIBILITY route', () => {
        expect(ROUTES.COMPATIBILITY).toBe('/compatibility')
      })

      it('should define DESTINY_MATCH route', () => {
        expect(ROUTES.DESTINY_MATCH).toBe('/destiny-match')
      })

      it('should define PERSONALITY route', () => {
        expect(ROUTES.PERSONALITY).toBe('/personality')
      })

      it('should define DESTINY_MAP route', () => {
        expect(ROUTES.DESTINY_MAP).toBe('/destiny-map')
      })

      it('should define PAST_LIFE route', () => {
        expect(ROUTES.PAST_LIFE).toBe('/past-life')
      })

      it('should define LIFE_PREDICTION route', () => {
        expect(ROUTES.LIFE_PREDICTION).toBe('/life-prediction')
      })
    })

    describe('Additional routes', () => {
      it('should define PREMIUM_REPORTS route', () => {
        expect(ROUTES.PREMIUM_REPORTS).toBe('/premium-reports')
      })

      it('should define COUNSELOR route', () => {
        expect(ROUTES.COUNSELOR).toBe('/counselor')
      })

      it('should define PROFILE route', () => {
        expect(ROUTES.PROFILE).toBe('/profile')
      })

      it('should define SETTINGS route', () => {
        expect(ROUTES.SETTINGS).toBe('/settings')
      })
    })

    describe('Route format', () => {
      it('should have lowercase routes', () => {
        Object.values(ROUTES).forEach((route) => {
          if (route !== '/') {
            const routeWithoutSlash = route.substring(1)
            expect(routeWithoutSlash).toBe(routeWithoutSlash.toLowerCase())
          }
        })
      })

      it('should not have trailing slashes except HOME', () => {
        Object.entries(ROUTES).forEach(([key, route]) => {
          if (key !== 'HOME') {
            expect(route.endsWith('/')).toBe(false)
          }
        })
      })

      it('should have single leading slash', () => {
        Object.values(ROUTES).forEach((route) => {
          expect(route.startsWith('/')).toBe(true)
          if (route !== '/') {
            expect(route.startsWith('//')).toBe(false)
          }
        })
      })

      it('should use hyphens instead of underscores in URLs', () => {
        Object.values(ROUTES).forEach((route) => {
          expect(route.includes('_')).toBe(false)
        })
      })
    })

    describe('Naming conventions', () => {
      it('should have SCREAMING_SNAKE_CASE keys', () => {
        Object.keys(ROUTES).forEach((key) => {
          expect(key).toMatch(/^[A-Z_]+$/)
        })
      })
    })

    describe('Uniqueness', () => {
      it('should have unique route values', () => {
        const routes = Object.values(ROUTES)
        const uniqueRoutes = new Set(routes)
        expect(uniqueRoutes.size).toBe(routes.length)
      })
    })
  })

  describe('getCategoryRoute', () => {
    describe('Valid categories', () => {
      it('should return correct route for Saju', () => {
        expect(getCategoryRoute('Saju')).toBe('/saju')
      })

      it('should return correct route for Astrology', () => {
        expect(getCategoryRoute('Astrology')).toBe('/astrology')
      })

      it('should return correct route for Tarot', () => {
        expect(getCategoryRoute('Tarot')).toBe('/tarot')
      })

      it('should return correct route for I Ching', () => {
        expect(getCategoryRoute('I Ching')).toBe('/iching')
      })

      it('should return correct route for Destiny Map', () => {
        expect(getCategoryRoute('Destiny Map')).toBe('/destiny-map')
      })
    })

    describe('Invalid categories', () => {
      it('should return default fallback for unknown category', () => {
        expect(getCategoryRoute('Unknown')).toBe(ROUTES.DESTINY_MAP)
      })

      it('should return default fallback for empty string', () => {
        expect(getCategoryRoute('')).toBe(ROUTES.DESTINY_MAP)
      })

      it('should return custom fallback when provided', () => {
        expect(getCategoryRoute('Unknown', '/custom')).toBe('/custom')
      })

      it('should use ROUTES.DESTINY_MAP as default fallback', () => {
        const result = getCategoryRoute('NonExistent')
        expect(result).toBe(ROUTES.DESTINY_MAP)
        expect(result).toBe('/destiny-map')
      })
    })

    describe('Case sensitivity', () => {
      it('should be case-sensitive for category names', () => {
        expect(getCategoryRoute('saju')).toBe(ROUTES.DESTINY_MAP) // lowercase doesn't match
        expect(getCategoryRoute('Saju')).toBe('/saju') // correct case matches
      })

      it('should not match lowercase categories', () => {
        expect(getCategoryRoute('tarot')).not.toBe('/tarot')
        expect(getCategoryRoute('Tarot')).toBe('/tarot')
      })
    })

    describe('All categories', () => {
      it('should return correct routes for all defined categories', () => {
        Object.entries(CATEGORY_ROUTES).forEach(([category, expectedRoute]) => {
          expect(getCategoryRoute(category)).toBe(expectedRoute)
        })
      })
    })

    describe('Fallback behavior', () => {
      it('should use fallback for undefined categories', () => {
        expect(getCategoryRoute('NotExists', '/fallback')).toBe('/fallback')
      })

      it('should prioritize category route over fallback', () => {
        expect(getCategoryRoute('Saju', '/fallback')).toBe('/saju')
        expect(getCategoryRoute('Saju', '/fallback')).not.toBe('/fallback')
      })
    })
  })

  describe('Integration', () => {
    describe('Category and main routes consistency', () => {
      it('should have matching routes between CATEGORY_ROUTES and ROUTES', () => {
        expect(CATEGORY_ROUTES.Saju).toBe(ROUTES.SAJU)
        expect(CATEGORY_ROUTES.Astrology).toBe(ROUTES.ASTROLOGY)
        expect(CATEGORY_ROUTES.Tarot).toBe(ROUTES.TAROT)
        expect(CATEGORY_ROUTES.Numerology).toBe(ROUTES.NUMEROLOGY)
        expect(CATEGORY_ROUTES.Dream).toBe(ROUTES.DREAM)
        expect(CATEGORY_ROUTES.Personality).toBe(ROUTES.PERSONALITY)
        expect(CATEGORY_ROUTES['Destiny Map']).toBe(ROUTES.DESTINY_MAP)
      })

      it('should have CATEGORY_ROUTES values exist in ROUTES', () => {
        const routeValues = new Set(Object.values(ROUTES))
        Object.values(CATEGORY_ROUTES).forEach((categoryRoute) => {
          expect(routeValues.has(categoryRoute)).toBe(true)
        })
      })
    })

    describe('Route naming patterns', () => {
      it('should follow kebab-case for multi-word routes', () => {
        expect(ROUTES.DESTINY_MAP).toBe('/destiny-map')
        expect(ROUTES.DESTINY_MATCH).toBe('/destiny-match')
        expect(ROUTES.PAST_LIFE).toBe('/past-life')
        expect(ROUTES.LIFE_PREDICTION).toBe('/life-prediction')
        expect(ROUTES.PREMIUM_REPORTS).toBe('/premium-reports')
      })

      it('should use single words or hyphens, not underscores', () => {
        Object.values(ROUTES).forEach((route) => {
          expect(route.includes('_')).toBe(false)
        })
      })
    })

    describe('Complete route coverage', () => {
      it('should cover all main features', () => {
        const featureRoutes = [
          ROUTES.SAJU,
          ROUTES.ASTROLOGY,
          ROUTES.TAROT,
          ROUTES.NUMEROLOGY,
          ROUTES.ICHING,
        ]
        featureRoutes.forEach((route) => {
          expect(route).toBeDefined()
          expect(route.startsWith('/')).toBe(true)
        })
      })

      it('should have user-related routes', () => {
        expect(ROUTES.PROFILE).toBeDefined()
        expect(ROUTES.SETTINGS).toBeDefined()
      })

      it('should have premium routes', () => {
        expect(ROUTES.PREMIUM_REPORTS).toBeDefined()
        expect(ROUTES.COUNSELOR).toBeDefined()
      })
    })

    describe('Default route behavior', () => {
      it('should use DESTINY_MAP as default for unknown categories', () => {
        const unknownCategories = ['Unknown1', 'Unknown2', 'Random']
        unknownCategories.forEach((category) => {
          expect(getCategoryRoute(category)).toBe(ROUTES.DESTINY_MAP)
        })
      })
    })
  })
})

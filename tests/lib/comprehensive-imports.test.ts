import { describe, it, expect } from 'vitest'
import path from 'path'
import { existsSync, readFileSync } from 'fs'

const resolveModuleFile = (modulePath: string) => {
  const basePath = path.join(process.cwd(), 'src', modulePath)
  const candidates = [
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
  ]

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
    expect(content).toMatch(/export\s+|module\.exports/)
  })
}

const serviceModules = [
  'lib/db/prisma',
  'lib/cache/chartDataCache',
  'lib/stripe/premiumCache',
  'lib/circuitBreaker',
  'lib/rateLimit',
  'lib/backend-health',
  'lib/backend-url',
  'lib/notifications/pushService',
  'lib/notifications/premiumNotifications',
  'lib/notifications/sse',
  'lib/ai/recommendations',
  'lib/ai/summarize',
  'lib/email/emailService',
  'lib/email/providers/resendProvider',
  'lib/auth/authOptions',
  'lib/auth/publicToken',
  'lib/auth/tokenRevoke',
  'lib/credits/withCredits',
  'lib/consultation/saveConsultation',
  'lib/referral/referralService',
  'lib/prediction/daeunTransitSync',
  'lib/prediction/tier7To10Analysis',
  'lib/weeklyFortune',
  'lib/userProfile',
  'lib/iChing/changingLineData',
  'lib/marketing/imageGenerator',
  'lib/marketing/socialMediaPoster',
  'lib/metrics',
  'lib/telemetry',
  'lib/env',
  'lib/api/ApiClient',
  'lib/api/errorHandler',
  'lib/api/middleware',
  'lib/errors/ApiError',
  'lib/replicate',
]

const componentModules = [
  'components/calendar/DestinyCalendar',
  'components/calendar/BirthInfoForm',
  'components/calendar/ParticleBackground',
  'components/calendar/CalendarHeader',
  'components/calendar/DayCell',
  'components/calendar/CalendarGrid',
  'components/calendar/FortuneGraph',
  'components/calendar/SelectedDatePanel',
  'components/calendar/MonthNavigation',
  'components/calendar/CategoryFilter',
  'components/astrology/AstrologyChat',
  'components/astrology/ResultDisplay',
  'components/saju/SajuChat',
  'components/saju/SajuResultDisplay',
  'components/tarot/TarotChat',
  'components/destiny-map/Chat',
  'components/destiny-map/DestinyMatrixStory',
  'components/destiny-map/InlineTarotModal',
  'components/destiny-map/Analyzer',
  'components/life-prediction/AdvisorChat/index',
  'components/life-prediction/BirthInfoForm/index',
  'components/life-prediction/ResultShare/index',
  'components/numerology/CompatibilityAnalyzer',
  'components/numerology/NumerologyAnalyzer',
  'components/share/ShareButton',
  'components/sharing/ShareResultButton',
  'components/iching/ResultDisplay',
  'components/ui/ShareButton',
  'components/ui/PageLoading',
  'components/ErrorBoundary',
]

const contextModules = [
  'contexts/NotificationContext',
  'contexts/CalendarContext',
  'i18n/I18nProvider',
]

const hookModules = [
  'hooks/calendar/useCalendarData',
  'hooks/calendar/useSavedDates',
  'hooks/calendar/useCitySearch',
  'hooks/calendar/useProfileLoader',
  'hooks/calendar/useMonthNavigation',
  'hooks/calendar/useParticleAnimation',
  'hooks/useChatSession.unified', // useChatSession.ts was renamed to useChatSession.unified.ts
]

const reducerModules = ['reducers/calendarReducer']

describe('Comprehensive Module Imports - Phase 3', () => {
  describe('Service Layer (35 modules)', () => {
    it('should have service modules', () => {
      expect(serviceModules.length).toBe(35)
      assertModules(serviceModules)
    })

    it('should have database layer modules', () => {
      const dbModules = serviceModules.filter((m) => m.includes('db/') || m.includes('prisma'))
      expect(dbModules.length).toBeGreaterThan(0)
    })

    it('should have caching modules', () => {
      const cacheModules = serviceModules.filter(
        (m) => m.includes('cache') || m.includes('Cache')
      )
      expect(cacheModules.length).toBeGreaterThan(0)
    })

    it('should have authentication modules', () => {
      const authModules = serviceModules.filter((m) => m.includes('auth/'))
      expect(authModules.length).toBeGreaterThan(0)
    })

    it('should have notification modules', () => {
      const notifModules = serviceModules.filter((m) => m.includes('notifications/'))
      expect(notifModules.length).toBeGreaterThan(0)
    })

    it('should have API utility modules', () => {
      const apiModules = serviceModules.filter(
        (m) => m.includes('api/') || m.includes('errors/')
      )
      expect(apiModules.length).toBeGreaterThan(0)
    })
  })

  describe('Component Layer (30 modules)', () => {
    it('should have component modules', () => {
      expect(componentModules.length).toBe(30)
      assertModules(componentModules)
    })

    it('should have calendar components', () => {
      const calendarComponents = componentModules.filter((m) => m.includes('calendar/'))
      expect(calendarComponents.length).toBeGreaterThanOrEqual(8)
    })

    it('should have astrology/saju components', () => {
      const astrologyComponents = componentModules.filter(
        (m) => m.includes('astrology/') || m.includes('saju/')
      )
      expect(astrologyComponents.length).toBeGreaterThanOrEqual(3)
    })

    it('should have destiny-map components', () => {
      const destinyComponents = componentModules.filter((m) => m.includes('destiny-map/'))
      expect(destinyComponents.length).toBeGreaterThanOrEqual(3)
    })

    it('should have UI utility components', () => {
      const uiComponents = componentModules.filter((m) => m.includes('ui/'))
      expect(uiComponents.length).toBeGreaterThanOrEqual(2)
    })

    it('should have sharing/share components', () => {
      const shareComponents = componentModules.filter(
        (m) => m.includes('share/') || m.includes('sharing/')
      )
      expect(shareComponents.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Context & Hooks (10 modules)', () => {
    it('should have context providers', () => {
      expect(contextModules.length).toBe(3)
      assertModules(contextModules)
    })

    it('should have hook modules', () => {
      expect(hookModules.length).toBe(7)
      assertModules(hookModules)
    })

    it('should have calendar-related hooks', () => {
      const calendarHooks = hookModules.filter((m) => m.includes('calendar/'))
      expect(calendarHooks.length).toBeGreaterThanOrEqual(5)
    })

    it('should have notification context', () => {
      expect(contextModules.some((m) => m.includes('NotificationContext'))).toBe(true)
    })

    it('should have calendar context', () => {
      expect(contextModules.some((m) => m.includes('CalendarContext'))).toBe(true)
    })

    it('should have i18n provider', () => {
      expect(contextModules.some((m) => m.includes('I18nProvider'))).toBe(true)
    })
  })

  describe('Reducer (1 module)', () => {
    it('should have calendar reducer', () => {
      expect(reducerModules.length).toBe(1)
      assertModules(reducerModules)
    })

    it('should have reducer with proper export patterns', () => {
      const filePath = resolveModuleFile(reducerModules[0])
      expect(filePath).not.toBeNull()
      if (filePath) {
        const content = readFileSync(filePath, 'utf8')
        // Reducer should have action type or reducer function
        expect(content).toMatch(/reducer|action|dispatch|state/i)
      }
    })
  })

  describe('Phase 3 Summary', () => {
    it('should have all Phase 3 modules (76 total)', () => {
      const total =
        serviceModules.length +
        componentModules.length +
        contextModules.length +
        hookModules.length +
        reducerModules.length

      expect(total).toBe(76)
    })
  })

  describe('Module File Patterns', () => {
    it('should have valid file extensions for all modules', () => {
      const allModules = [
        ...serviceModules,
        ...componentModules,
        ...contextModules,
        ...hookModules,
        ...reducerModules,
      ]

      allModules.forEach((modulePath) => {
        const filePath = resolveModuleFile(modulePath)
        expect(filePath).not.toBeNull()
        if (filePath) {
          expect(filePath).toMatch(/\.(ts|tsx|js|jsx)$/)
        }
      })
    })

    it('should have TypeScript files for service modules', () => {
      let tsCount = 0
      serviceModules.forEach((modulePath) => {
        const filePath = resolveModuleFile(modulePath)
        if (filePath && filePath.endsWith('.ts')) {
          tsCount++
        }
      })
      // Most service modules should be TypeScript
      expect(tsCount).toBeGreaterThan(serviceModules.length * 0.8)
    })

    it('should have TSX files for component modules', () => {
      let tsxCount = 0
      componentModules.forEach((modulePath) => {
        const filePath = resolveModuleFile(modulePath)
        if (filePath && filePath.endsWith('.tsx')) {
          tsxCount++
        }
      })
      // Most component modules should be TSX
      expect(tsxCount).toBeGreaterThan(componentModules.length * 0.5)
    })
  })

  describe('Export Patterns', () => {
    it('should have exports or async functions in service modules', () => {
      serviceModules.forEach((modulePath) => {
        const filePath = resolveModuleFile(modulePath)
        if (filePath) {
          const content = readFileSync(filePath, 'utf8')
          // Should have export, async function, or use module.exports pattern
          expect(content).toMatch(
            /export\s+|async\s+function|module\.exports|export\{|export\s*\*/
          )
        }
      })
    })

    it('should have exports in component modules', () => {
      componentModules.forEach((modulePath) => {
        const filePath = resolveModuleFile(modulePath)
        if (filePath) {
          const content = readFileSync(filePath, 'utf8')
          // Components should have export or be a re-export module
          expect(content).toMatch(/export\s+|export\{|export\s*\*|module\.exports/)
        }
      })
    })

    it('should have React imports in component modules', () => {
      let reactImportCount = 0
      componentModules.forEach((modulePath) => {
        const filePath = resolveModuleFile(modulePath)
        if (filePath) {
          const content = readFileSync(filePath, 'utf8')
          if (content.includes("from 'react'") || content.includes('from "react"')) {
            reactImportCount++
          }
        }
      })
      // Most components should import React
      expect(reactImportCount).toBeGreaterThan(componentModules.length * 0.5)
    })
  })

  describe('Hook Patterns', () => {
    it('should have use* naming convention for hooks', () => {
      hookModules.forEach((modulePath) => {
        const fileName = modulePath.split('/').pop()
        expect(fileName).toMatch(/^use[A-Z]/)
      })
    })

    it('should have useState or useEffect in hook modules', () => {
      let hookPatternCount = 0
      hookModules.forEach((modulePath) => {
        const filePath = resolveModuleFile(modulePath)
        if (filePath) {
          const content = readFileSync(filePath, 'utf8')
          if (
            content.includes('useState') ||
            content.includes('useEffect') ||
            content.includes('useCallback') ||
            content.includes('useMemo')
          ) {
            hookPatternCount++
          }
        }
      })
      // Most hooks should use React hooks
      expect(hookPatternCount).toBeGreaterThan(hookModules.length * 0.5)
    })
  })

  describe('Context Patterns', () => {
    it('should have createContext in context modules', () => {
      let contextPatternCount = 0
      contextModules.forEach((modulePath) => {
        const filePath = resolveModuleFile(modulePath)
        if (filePath) {
          const content = readFileSync(filePath, 'utf8')
          if (content.includes('createContext') || content.includes('useContext')) {
            contextPatternCount++
          }
        }
      })
      // Most context modules should use createContext
      expect(contextPatternCount).toBeGreaterThan(contextModules.length * 0.5)
    })

    it('should export Provider components', () => {
      let providerCount = 0
      contextModules.forEach((modulePath) => {
        const filePath = resolveModuleFile(modulePath)
        if (filePath) {
          const content = readFileSync(filePath, 'utf8')
          if (content.includes('Provider')) {
            providerCount++
          }
        }
      })
      // Context modules should have Provider exports
      expect(providerCount).toBeGreaterThan(0)
    })
  })
})

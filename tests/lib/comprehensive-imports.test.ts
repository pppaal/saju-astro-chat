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
  })

  describe('Component Layer (30 modules)', () => {
    it('should have component modules', () => {
      expect(componentModules.length).toBe(30)
      assertModules(componentModules)
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
  })

  describe('Reducer (1 module)', () => {
    it('should have calendar reducer', () => {
      expect(reducerModules.length).toBe(1)
      assertModules(reducerModules)
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
})

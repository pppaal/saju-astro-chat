/// <reference types="vitest/globals" />
/**
 * Vitest setup file
 * This file is automatically loaded before all tests
 */

import React from 'react'
import fs from 'fs'
import path from 'path'
import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Allow legacy Jest-style helpers in Vitest tests.
;(globalThis as typeof globalThis & { jest?: typeof vi }).jest = vi

// Mock next-auth/react globally for tests
const mockSession = {
  status: 'unauthenticated' as const,
  data: null,
  update: vi.fn(),
}

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => mockSession),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Export mock session utilities for tests to configure
export const mockUseSession = vi.fn(() => mockSession)
export const setMockSession = (session: {
  status: 'loading' | 'authenticated' | 'unauthenticated'
  data: any
  update?: any
}) => {
  const { useSession } = require('next-auth/react')
  ;(useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    ...session,
    update: session.update || vi.fn(),
  })
}

const shouldUseRealFetch =
  process.env.npm_lifecycle_event === 'test:e2e:api' || process.env.VITEST_REAL_FETCH === '1'

// Mock environment variables for unit/integration tests only.
process.env.NODE_ENV = process.env.NODE_ENV || 'test'
try {
  fs.mkdirSync(path.resolve(process.cwd(), 'coverage', '.tmp'), { recursive: true })
} catch {
  // Ignore coverage directory creation failures in constrained environments
}
if (!shouldUseRealFetch) {
  process.env.NEXTAUTH_SECRET = 'test-secret-at-least-32-characters-long'
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
  process.env.ADMIN_API_TOKEN = 'test-admin-token'
  process.env.CRON_SECRET = 'test-cron-secret'
  process.env.METRICS_TOKEN = 'test-metrics-token'
  process.env.NEXT_PUBLIC_AI_BACKEND = 'http://localhost:5000'
}

// Mock SwissEph (server-only module) for browser-based tests
vi.mock('swisseph', () => ({
  default: {
    swe_set_ephe_path: vi.fn(),
    swe_julday: vi.fn((year, month, day, hour) => {
      // Simple Julian Day calculation for testing
      const a = Math.floor((14 - month) / 12)
      const y = year + 4800 - a
      const m = month + 12 * a - 3
      return (
        day +
        Math.floor((153 * m + 2) / 5) +
        365 * y +
        Math.floor(y / 4) -
        Math.floor(y / 100) +
        Math.floor(y / 400) -
        32045 +
        (hour - 12) / 24
      )
    }),
    swe_revjul: vi.fn((jd) => {
      // Simple reverse Julian Day for testing
      const z = Math.floor(jd + 0.5)
      const f = jd + 0.5 - z
      const a = Math.floor((z - 1867216.25) / 36524.25)
      const b = z + 1 + a - Math.floor(a / 4)
      const c = b + 1524
      const d = Math.floor((c - 122.1) / 365.25)
      const e = Math.floor(365.25 * d)
      const g = Math.floor((c - e) / 30.6001)
      const day = c - e - Math.floor(30.6001 * g)
      const month = g < 14 ? g - 1 : g - 13
      const year = month > 2 ? d - 4716 : d - 4715
      const hour = f * 24
      return { year, month, day, hour }
    }),
    swe_calc_ut: vi.fn((jd, planet) => {
      // Mock planet positions - return realistic values
      const positions = {
        0: 45.5, // Sun
        1: 120.3, // Moon
        2: 200.7, // Mercury
        3: 310.2, // Venus
        4: 85.6, // Mars
        5: 150.9, // Jupiter
        6: 275.4, // Saturn
        7: 15.8, // Uranus
        8: 330.1, // Neptune
        9: 260.5, // Pluto
      }
      const longitude = positions[planet] || 0
      return {
        longitude,
        latitude: 0,
        distance: 1.0,
        speed: 1.0,
        longitudeSpeed: 1.0,
        latitudeSpeed: 0,
        distanceSpeed: 0,
        rflag: 258,
        error: null,
      }
    }),
    swe_houses: vi.fn((jd_ut, lat = 0, lon = 0) => {
      // Mock house cusps - 12 houses evenly distributed
      const house = Array.from({ length: 12 }, (_, i) => i * 30)
      const jdValue = Number(jd_ut) || 0
      const base = (jdValue * 1.0 + lat + lon) % 360
      const ascendant = (base + 360) % 360
      const mc = (ascendant + 90) % 360
      const vertex = (((lat + lon) % 360) + 360) % 360
      return {
        house,
        ascendant,
        mc,
        armc: mc,
        vertex,
        equatorialAscendant: ascendant,
      }
    }),
    swe_utc_to_jd: vi.fn((year, month, day, hour, minute, second, gregflag) => {
      // Calculate Julian Day from UTC components
      const a = Math.floor((14 - month) / 12)
      const y = year + 4800 - a
      const m = month + 12 * a - 3
      const jdn =
        day +
        Math.floor((153 * m + 2) / 5) +
        365 * y +
        Math.floor(y / 4) -
        Math.floor(y / 100) +
        Math.floor(y / 400) -
        32045
      const jd = jdn + (hour - 12) / 24 + minute / 1440 + second / 86400
      return {
        julianDayUT: jd,
        julianDayET: jd + 0.000777, // Approximate delta T
      }
    }),
    swe_jdut1_to_utc: vi.fn((jd, gregflag) => {
      // Convert Julian Day to UTC components
      const z = Math.floor(jd + 0.5)
      const f = jd + 0.5 - z
      const a = Math.floor((z - 1867216.25) / 36524.25)
      const b = z + 1 + a - Math.floor(a / 4)
      const c = b + 1524
      const d = Math.floor((c - 122.1) / 365.25)
      const e = Math.floor(365.25 * d)
      const g = Math.floor((c - e) / 30.6001)
      const day = c - e - Math.floor(30.6001 * g)
      const month = g < 14 ? g - 1 : g - 13
      const year = month > 2 ? d - 4716 : d - 4715
      const hours = f * 24
      const hour = Math.floor(hours)
      const minutes = (hours - hour) * 60
      const minute = Math.floor(minutes)
      const second = (minutes - minute) * 60
      return { year, month, day, hour, minute, second }
    }),
    SE_SUN: 0,
    SE_MOON: 1,
    SE_MERCURY: 2,
    SE_VENUS: 3,
    SE_MARS: 4,
    SE_JUPITER: 5,
    SE_SATURN: 6,
    SE_URANUS: 7,
    SE_NEPTUNE: 8,
    SE_PLUTO: 9,
    SE_MEAN_NODE: 10,
    SE_TRUE_NODE: 11,
    SE_CHIRON: 15,
    SE_GREG_CAL: 1,
    SEFLG_SPEED: 256,
    SEFLG_SWIEPH: 2,
  },
}))

// Mock the ephe module to return the mocked swisseph
vi.mock('@/lib/astrology/foundation/ephe', () => {
  // Create the mock SwissEph object
  const mockSwisseph = {
    swe_set_ephe_path: vi.fn(),
    swe_julday: vi.fn((year, month, day, hour, gregflag = 1) => {
      // Simple Julian Day calculation for testing
      const a = Math.floor((14 - month) / 12)
      const y = year + 4800 - a
      const m = month + 12 * a - 3
      return (
        day +
        Math.floor((153 * m + 2) / 5) +
        365 * y +
        Math.floor(y / 4) -
        Math.floor(y / 100) +
        Math.floor(y / 400) -
        32045 +
        (hour - 12) / 24
      )
    }),
    swe_revjul: vi.fn((jd, gregflag = 1) => {
      // Simple reverse Julian Day for testing
      const z = Math.floor(jd + 0.5)
      const f = jd + 0.5 - z
      const a = Math.floor((z - 1867216.25) / 36524.25)
      const b = z + 1 + a - Math.floor(a / 4)
      const c = b + 1524
      const d = Math.floor((c - 122.1) / 365.25)
      const e = Math.floor(365.25 * d)
      const g = Math.floor((c - e) / 30.6001)
      const day = c - e - Math.floor(30.6001 * g)
      const month = g < 14 ? g - 1 : g - 13
      const year = month > 2 ? d - 4716 : d - 4715
      const hour = f * 24
      return { year, month, day, hour }
    }),
    swe_calc_ut: vi.fn((jd, planet, iflag = 256) => {
      // Mock planet positions - return realistic values
      // Add some variation based on JD to make progressions work
      const basePositions = {
        0: 45.5, // Sun
        1: 120.3, // Moon
        2: 200.7, // Mercury
        3: 310.2, // Venus
        4: 85.6, // Mars
        5: 150.9, // Jupiter
        6: 275.4, // Saturn
        7: 15.8, // Uranus
        8: 330.1, // Neptune
        9: 260.5, // Pluto
        11: 90.0, // True Node
      }
      const basePosition = basePositions[planet] || 0
      // Add slight variation based on JD (simulate progression)
      const variation = (jd % 365) * 0.1
      const longitude = (basePosition + variation) % 360
      return {
        longitude,
        latitude: 0,
        distance: 1.0,
        speed: planet === 1 ? 13.2 : 1.0, // Moon moves faster
        longitudeSpeed: planet === 1 ? 13.2 : 1.0,
        latitudeSpeed: 0,
        distanceSpeed: 0,
        rflag: 258,
      }
    }),
    swe_houses: vi.fn((jd_ut, lat = 0, lon = 0, hsys = 'P') => {
      // Mock house cusps - 12 houses evenly distributed
      const house = Array.from({ length: 12 }, (_, i) => i * 30)
      const jdValue = Number(jd_ut) || 0
      const base = (jdValue * 1.0 + lat + lon) % 360
      const ascendant = (base + 360) % 360
      const mc = (ascendant + 90) % 360
      const vertex = (((lat + lon) % 360) + 360) % 360
      return {
        house,
        ascendant,
        mc,
        armc: mc,
        vertex,
        equatorialAscendant: ascendant,
      }
    }),
    swe_utc_to_jd: vi.fn((year, month, day, hour, minute, second, gregflag = 1) => {
      // Calculate Julian Day from UTC components
      const a = Math.floor((14 - month) / 12)
      const y = year + 4800 - a
      const m = month + 12 * a - 3
      const jdn =
        day +
        Math.floor((153 * m + 2) / 5) +
        365 * y +
        Math.floor(y / 4) -
        Math.floor(y / 100) +
        Math.floor(y / 400) -
        32045
      const jd = jdn + (hour - 12) / 24 + minute / 1440 + second / 86400
      return {
        julianDayUT: jd,
        julianDayET: jd + 0.000777, // Approximate delta T
      }
    }),
    swe_jdut1_to_utc: vi.fn((jd, gregflag = 1) => {
      // Convert Julian Day to UTC components
      const z = Math.floor(jd + 0.5)
      const f = jd + 0.5 - z
      const a = Math.floor((z - 1867216.25) / 36524.25)
      const b = z + 1 + a - Math.floor(a / 4)
      const c = b + 1524
      const d = Math.floor((c - 122.1) / 365.25)
      const e = Math.floor(365.25 * d)
      const g = Math.floor((c - e) / 30.6001)
      const day = c - e - Math.floor(30.6001 * g)
      const month = g < 14 ? g - 1 : g - 13
      const year = month > 2 ? d - 4716 : d - 4715
      const hours = f * 24
      const hour = Math.floor(hours)
      const minutes = (hours - hour) * 60
      const minute = Math.floor(minutes)
      const second = (minutes - minute) * 60
      return { year, month, day, hour, minute, second }
    }),
    // Constants
    SE_SUN: 0,
    SE_MOON: 1,
    SE_MERCURY: 2,
    SE_VENUS: 3,
    SE_MARS: 4,
    SE_JUPITER: 5,
    SE_SATURN: 6,
    SE_URANUS: 7,
    SE_NEPTUNE: 8,
    SE_PLUTO: 9,
    SE_MEAN_NODE: 10,
    SE_TRUE_NODE: 11,
    SE_CHIRON: 15,
    SE_GREG_CAL: 1,
    SEFLG_SPEED: 256,
    SEFLG_SWIEPH: 2,
  }

  return {
    getSwisseph: vi.fn(() => mockSwisseph),
  }
})

// Mock Prisma client for unit tests (Prisma 7.x requires adapter/accelerateUrl)
vi.mock('@/lib/db/prisma', () => {
  const createModelMock = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  })

  const models = {
    // Auth & Users
    user: createModelMock(),
    account: createModelMock(),
    session: createModelMock(),
    verificationToken: createModelMock(),
    userCredits: createModelMock(),
    userSettings: createModelMock(),
    userPreferences: createModelMock(),
    subscription: createModelMock(),

    // Credits & Purchases
    bonusCreditPurchase: createModelMock(),
    creditPurchase: createModelMock(),
    creditRefundLog: createModelMock(),

    // Readings & Consultations
    reading: createModelMock(),
    tarotReading: createModelMock(),
    consultationHistory: createModelMock(),

    // Destiny & Compatibility
    destinyMatrixReport: createModelMock(),
    compatibilityResult: createModelMock(),
    personalityResult: createModelMock(),
    iCPResult: createModelMock(),
    pastLifeResult: createModelMock(),
    sharedResult: createModelMock(),

    // Destiny Match
    matchProfile: createModelMock(),
    matchConnection: createModelMock(),
    matchMessage: createModelMock(),
    matchSwipe: createModelMock(),
    userBlock: createModelMock(),
    userReport: createModelMock(),

    // Calendar & Fortune
    savedCalendarDate: createModelMock(),
    fortune: createModelMock(),
    dailyFortune: createModelMock(),

    // User Features
    personaMemory: createModelMock(),
    savedPerson: createModelMock(),
    pushSubscription: createModelMock(),
    counselorChatSession: createModelMock(),

    // Referral
    referralReward: createModelMock(),

    // Logging & Admin
    adminAuditLog: createModelMock(),
    emailLog: createModelMock(),
    stripeEventLog: createModelMock(),
    sectionFeedback: createModelMock(),
    userInteraction: createModelMock(),
  }

  return {
    prisma: {
      ...models,
      $transaction: vi.fn((fn) => {
        if (typeof fn === 'function') {
          // Create a transactional client with the same model mocks
          const txClient: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(models)) {
            txClient[key] = value
          }
          return fn(txClient)
        }
        // Array-based transactions
        return Promise.all(fn)
      }),
      $queryRaw: vi.fn(),
      $executeRaw: vi.fn(),
      $disconnect: vi.fn(),
      $connect: vi.fn(),
    },
    encryptAccountData: vi.fn((data) => data),
    ensureDbConnection: vi.fn(),
  }
})

// Mock fetch globally for unit/integration tests.
if (!shouldUseRealFetch) {
  global.fetch = vi.fn()
}

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Clean up after all tests
afterAll(() => {
  vi.restoreAllMocks()
  // Fix "Cannot delete property 'window'" teardown error
  // by cleaning up any global DOM-related properties safely
  if (typeof globalThis !== 'undefined') {
    try {
      // Reset any test-modified globals
      vi.unstubAllGlobals()
    } catch {
      // Ignore cleanup errors
    }
  }
})

// Global test utilities
export const mockFetch = (response: unknown, status = 200) => {
  ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  })
}

export const mockFetchError = (error: Error) => {
  ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error)
}

// Console spy helpers
export const suppressConsoleErrors = () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
}

// Date mock helper
export const mockDate = (date: Date | string) => {
  const mockDate = new Date(date)
  vi.setSystemTime(mockDate)
  return mockDate
}

// Wait helper for async operations
export const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// tests/api/serviceEngineWiring.test.ts
//
// Static wiring guard for our user-facing services.
//
// We don't run the real engines here (swisseph + saju calculator are
// slow and need real inputs). Instead we treat each route file as text
// and assert that the code references the engines and helpers we expect.
//
// Catches the regression "someone deleted the saju import in route X"
// without paying for a full integration test run.

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '../..')

interface ServiceContract {
  name: string
  /** Route file path relative to repo root. */
  route: string
  /** Substrings that MUST appear in the route's source (or its support
   *  files). Each entry is one of: 'literal' | RegExp. */
  requires: Array<string | RegExp>
  /** Additional support files whose contents are concatenated for the check. */
  supportFiles?: string[]
}

const SERVICES: ServiceContract[] = [
  {
    name: 'compatibility (main)',
    route: 'src/app/api/compatibility/route.ts',
    requires: [
      'calculateAstrologyCompatibilityOnly',
      'calculateSajuCompatibilityOnly',
      'calculateFusionCompatibility',
      'performCrossSystemAnalysis',
    ],
  },
  {
    name: 'compatibility counselor (chat)',
    route: 'src/app/api/compatibility/counselor/route.ts',
    requires: [
      'buildAutoSajuContext',
      'buildAutoAstroContext',
      'calculateFusionCompatibility',
      'performExtendedSajuAnalysis',
      'performExtendedAstrologyAnalysis',
    ],
  },
  {
    name: 'compatibility 3-layer (premium report backend)',
    route: 'src/app/api/destiny-matrix/compatibility-3layer/route.ts',
    requires: [
      'analyzeThreeLayerCompatibility',
      'buildPremiumCompatibilityContext',
      'generateCompatibilityNarrative',
    ],
    supportFiles: ['src/lib/destiny-matrix/compatibility/buildPremiumContext.ts'],
  },
  {
    name: 'compatibility premium full engine',
    route: 'src/lib/destiny-matrix/compatibility/buildPremiumContext.ts',
    requires: [
      'calculateNatalChart',
      'calculateTransitChart',
      'calculateFusionCompatibility',
      'performExtendedSajuAnalysis',
      'performExtendedAstrologyAnalysis',
      'analyzeCoupleDeepInsights',
      'analyzeCoupleTiming',
      'analyzeCoupleAstroTiming',
      'buildIdealTypeProfiles',
      'buildMultiFacetReport',
      'analyzeCoupleExtraPoints',
      'buildCoupleTagline',
      'performCrossSystemAnalysis',
    ],
  },
  {
    name: 'calendar',
    route: 'src/app/api/calendar/route.ts',
    requires: [/calculateSajuData|sajuCalculation|saju\./, /calculateNatalChart|astroChart|astrology\./],
  },
  {
    name: 'destiny-map (free destiny report)',
    route: 'src/app/api/destiny-map/route.ts',
    requires: [/computeDestinyMap|destinyMap\.|destiny-map/i],
  },
  {
    name: 'destiny-map counselor (saju chat stream)',
    route: 'src/app/api/destiny-map/chat-stream/route.ts',
    requires: [/saju|matrixSnapshot|destinyMatrix/i, /astro|natal|chart/i],
    supportFiles: [
      'src/app/api/destiny-map/chat-stream/routeExecution.ts',
      'src/app/api/destiny-map/chat-stream/routeMatrixSnapshotFetchCoreSupport.ts',
      'src/app/api/destiny-map/chat-stream/lib/chart-calculator.ts',
    ],
  },
  {
    name: 'destiny-matrix ai-report (premium narrative entry)',
    route: 'src/app/api/destiny-matrix/ai-report/route.ts',
    requires: [
      'calculateDestinyMatrix',
      'FusionReportGenerator',
      /enrichRequestWithDerivedSaju|derivedSaju|sajuSnapshot/,
    ],
  },
  {
    name: 'saju standalone',
    route: 'src/app/api/saju/route.ts',
    requires: ['calculateSajuData'],
  },
  {
    name: 'astrology standalone',
    route: 'src/app/api/astrology/route.ts',
    requires: ['calculateNatalChart'],
  },
]

function loadCombined(service: ServiceContract): { content: string; missing: string[] } {
  const files = [service.route, ...(service.supportFiles ?? [])]
  const missing: string[] = []
  const content = files
    .map((rel) => {
      const abs = path.join(ROOT, rel)
      if (!existsSync(abs)) {
        missing.push(rel)
        return ''
      }
      return readFileSync(abs, 'utf8')
    })
    .join('\n')
  return { content, missing }
}

describe('service engine wiring (static check)', () => {
  for (const service of SERVICES) {
    it(`${service.name} wires the expected engine helpers`, () => {
      const { content, missing } = loadCombined(service)
      expect(missing, `route or support files missing: ${missing.join(', ')}`).toEqual([])
      for (const required of service.requires) {
        if (typeof required === 'string') {
          expect(content, `${service.name} should reference "${required}"`).toContain(required)
        } else {
          expect(
            required.test(content),
            `${service.name} should match ${required}`
          ).toBe(true)
        }
      }
    })
  }
})

describe('no silent null fallback in interpretation', () => {
  it('astrology route does not silently swallow AI errors', () => {
    const abs = path.join(ROOT, 'src/app/api/astrology/route.ts')
    const content = readFileSync(abs, 'utf8')
    // The previous regression: catch (aiErr) { aiInterpretation = ''; aiModelUsed = 'error-fallback' }
    // should be gone — we either re-throw or surface a real error.
    expect(content).not.toMatch(/'error-fallback'/)
  })

  it('compatibility 3-layer route does not partially fall back when withNarrative=true', () => {
    const abs = path.join(
      ROOT,
      'src/app/api/destiny-matrix/compatibility-3layer/route.ts'
    )
    const content = readFileSync(abs, 'utf8')
    // The previous regression: try { narrative } catch { return partial }.
    // With trust-the-engine wiring, the narrative call is no longer wrapped
    // in a try that lowers it to null.
    expect(content).not.toMatch(/narrative:\s*null,/)
  })

  it('premium compat context does not wrap engine modules in tryRun fallbacks', () => {
    const abs = path.join(
      ROOT,
      'src/lib/destiny-matrix/compatibility/buildPremiumContext.ts'
    )
    const content = readFileSync(abs, 'utf8')
    expect(content).not.toMatch(/\btryRun\b/)
    expect(content).not.toMatch(/\btryRunAsync\b/)
  })
})

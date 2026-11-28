// Shared Swiss Ephemeris accessor (server-only)
// IMPORTANT: This file must not have any top-level imports that would fail in the browser.
// All Node.js-specific imports (path, swisseph) are done dynamically inside getSwisseph().

import type * as SwissEph from 'swisseph'
import { logger } from '@/lib/logger'

let sw: typeof SwissEph | null = null
let ephePathSet = false
let swissephLoadError: Error | null = null

type SwissephMock = typeof SwissEph
type JoinFn = (...parts: string[]) => string

const getInjectedSwisseph = (): SwissephMock | null => {
  if (typeof globalThis === 'undefined') {
    return null
  }
  return (globalThis as typeof globalThis & { __SWISSEPH__?: SwissephMock }).__SWISSEPH__ || null
}

const getInjectedJoin = (): JoinFn | null => {
  if (typeof globalThis === 'undefined') {
    return null
  }
  return (
    (globalThis as typeof globalThis & { __EPHE_PATH_JOIN__?: JoinFn }).__EPHE_PATH_JOIN__ || null
  )
}

function toSwissephLoadError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error)
  const wrapped = new Error(
    [
      'Failed to load native module "swisseph".',
      'Ensure deployment includes "node_modules/swisseph/build/Release/swisseph.node".',
      'For Next.js serverless deploys, configure outputFileTracingIncludes.',
      `Original error: ${message}`,
    ].join(' ')
  )
  ;(wrapped as Error & { cause?: unknown }).cause = error
  return wrapped
}

/** J2000.0 (UT JD) — 천체력 출처 점검의 기준 시각. */
const J2000_JD = 2451545.0
/** Swiss Ephemeris 파일 사용 플래그(swisseph.SEFLG_SWIEPH) — 모의 객체에 없을 때의 값. */
const SEFLG_SWIEPH_FALLBACK = 2
/** Chiron 천체 번호(swisseph.SE_CHIRON). */
const SE_CHIRON_FALLBACK = 15

export interface EphemerisSourceCheck {
  /** 행성 파일(sepl_18.se1) — J2000 태양의 rflag 에 SEFLG_SWIEPH 가 있다. */
  planets: boolean
  /** 소행성 파일(seas_18.se1) — Chiron 이 계산된다. */
  asteroids: boolean
  /** 점검 자체를 못 했다(swe_calc_ut 없음·이상한 반환) — 판정 보류. */
  unchecked: boolean
  ephePath: string
  /** 실패 사유(Swiss Ephemeris 오류 문자열 등). */
  detail?: string
}

/**
 * 천체력 출처 점검 (docs/AUDIT_ASTRO.md §2.6, 엔진 감사 ASTRO-12).
 *
 * J2000 태양을 계산해 rflag 에 SEFLG_SWIEPH 가 있는지 본다 — 없으면 Swiss Ephemeris 가
 * public/ephe 를 못 찾아 Moshier 해석해로 조용히 대체한 것이다(행성 오차는 작지만 배포가
 * 파일을 빠뜨린 신호). Chiron 은 소행성 파일 없이는 아예 오류라, 그 경우 리포트·트랜짓에서
 * Chiron·Lilith 가 소리 없이 사라졌다. 실패는 logger.error 로 알린다(던지지 않는다 —
 * 행성 계산은 Moshier 로도 계속된다). 점검 자체가 불가능한 객체(테스트 주입 모의)는 warn.
 */
export function checkEphemerisSource(swe: typeof SwissEph, ephePath: string): EphemerisSourceCheck {
  const result: EphemerisSourceCheck = {
    planets: false,
    asteroids: false,
    unchecked: false,
    ephePath,
  }
  try {
    if (typeof swe.swe_calc_ut !== 'function') {
      result.unchecked = true
    } else {
      const swiephFlag =
        typeof swe.SEFLG_SWIEPH === 'number' ? swe.SEFLG_SWIEPH : SEFLG_SWIEPH_FALLBACK
      const chironId = typeof swe.SE_CHIRON === 'number' ? swe.SE_CHIRON : SE_CHIRON_FALLBACK
      const sun = swe.swe_calc_ut(J2000_JD, swe.SE_SUN ?? 0, swiephFlag) as
        | { rflag?: number; error?: string }
        | undefined
      if (!sun || typeof sun !== 'object') {
        result.unchecked = true
      } else if (typeof sun.rflag === 'number') {
        result.planets = (sun.rflag & swiephFlag) !== 0
        if (!result.planets) result.detail = `Sun rflag ${sun.rflag} (no SEFLG_SWIEPH)`
        const chiron = swe.swe_calc_ut(J2000_JD, chironId, swiephFlag) as
          | { rflag?: number; error?: string }
          | undefined
        result.asteroids =
          !!chiron &&
          typeof chiron === 'object' &&
          !chiron.error &&
          typeof chiron.rflag === 'number' &&
          (chiron.rflag & swiephFlag) !== 0
        if (!result.asteroids && chiron?.error) {
          result.detail = [result.detail, `Chiron: ${chiron.error}`].filter(Boolean).join('; ')
        }
      } else {
        result.detail = sun.error ? `Sun: ${sun.error}` : 'Sun: no rflag'
      }
    }
  } catch (err) {
    result.unchecked = true
    result.detail = err instanceof Error ? err.message : String(err)
  }

  if (result.unchecked) {
    logger.warn('[ephe] ephemeris source check skipped', { ephePath, detail: result.detail })
  } else if (!result.planets || !result.asteroids) {
    logger.error('[ephe] Swiss Ephemeris files not in use — check EPHE_PATH / public/ephe', {
      ephePath,
      planets: result.planets,
      asteroids: result.asteroids,
      detail: result.detail,
    })
  }
  return result
}

/**
 * Returns the Swiss Ephemeris module. Server-only.
 * Throws an error if called from the browser.
 */
export function getSwisseph(): typeof SwissEph {
  // Prevent usage in browser environment
  if (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as typeof globalThis & { window?: unknown }).window !== 'undefined'
  ) {
    throw new Error('swisseph is server-only and must not run in the browser.')
  }

  if (swissephLoadError) {
    throw swissephLoadError
  }

  if (!sw) {
    try {
      // Dynamic require to avoid bundling into client
      sw = getInjectedSwisseph() || (require('swisseph') as typeof SwissEph)
    } catch (error) {
      swissephLoadError = toSwissephLoadError(error)
      throw swissephLoadError
    }
  }

  if (!ephePathSet && sw) {
    // Dynamic require of path module
    const join = getInjectedJoin() || (require('path') as { join: JoinFn }).join
    const ephePath = process.env.EPHE_PATH || join(process.cwd(), 'public', 'ephe')
    sw.swe_set_ephe_path(ephePath)
    ephePathSet = true
    // 첫 호출에서 한 번 — 파일을 못 찾으면 Moshier 로 조용히 대체되는 것을 알린다.
    checkEphemerisSource(sw, ephePath)
  }

  return sw
}

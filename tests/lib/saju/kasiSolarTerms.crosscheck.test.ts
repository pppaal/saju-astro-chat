/**
 * KASI 절기표 ↔ 독립 태양황경 계산 교차검증.
 *
 * KASI_SOLAR_TERMS 는 1899~2051 의 24절기 중 12절(節)을 분 단위로 들고 있는
 * ~150년치 표다(1899–1938 은 scripts/golden/build-solar-terms.mts 로 생성, 엔진 감사 E14). 경계 *동작*(입춘/datePillars)은 몇몇 날짜로 잠겼지만, 표 자체의
 * 전사(轉寫) 오류는 무방비였다 — 한 해의 한 절기가 어긋나면 그 시기 출생자의 연/월주가
 * 통째로 틀어진다. 여기서는 표의 각 절기 시각에 태양 황경을 *독립적으로* 계산해, 그
 * 절기의 정통 황경(定氣)과 일치하는지 검증한다.
 *
 * 태양황경은 Swiss Ephemeris 가 아니라 자급식 공식(Meeus, Astronomical Algorithms §25,
 * 저정밀 ~0.01°)으로 구한다 — vitest 가 ephemeris 바인딩(@/lib/astrology/foundation/ephe)을
 * 전역 mock 하므로 실 천문 계산이 불가하고, 또 표와 독립적인 제3 출처여야 의미가 있다.
 *
 * 절기 month m(1=小寒 … 12=大雪) → 태양 황경 = (285 + (m-1)*30) mod 360.
 *   小寒285 立春315 驚蟄345 清明15 立夏45 芒種75 小暑105 立秋135 白露165 寒露195 立冬225 大雪255.
 */
import { describe, it, expect } from 'vitest'
import * as Astronomy from 'astronomy-engine'
import { getSolarTermKST, KASI_SOLAR_TERMS } from '@/lib/saju/constants'

const SAMPLE_YEARS = [1905, 1920, 1935, 1945, 1960, 1975, 1990, 2000, 2012, 2024, 2036, 2050]
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const expectedLongitude = (m: number): number => (285 + (m - 1) * 30) % 360
const angularDiff = (a: number, b: number): number => Math.abs(((a - b + 540) % 360) - 180)

const rad = (deg: number): number => (deg * Math.PI) / 180
const norm360 = (deg: number): number => ((deg % 360) + 360) % 360

/**
 * 태양의 겉보기 황경(度) — Meeus 저정밀(~0.01°). 입력은 UTC Date.
 * ΔT(UT↔TT) 무시 시 1945~2050 구간 오차 <0.001° 로 허용오차 대비 무시 가능.
 */
function sunApparentLongitude(date: Date): number {
  const jd = date.getTime() / 86_400_000 + 2440587.5
  const T = (jd - 2451545.0) / 36525
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T
  const Mr = rad(M)
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr)
  const trueLong = L0 + C
  const omega = 125.04 - 1934.136 * T
  const apparent = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega))
  return norm360(apparent)
}

describe('KASI_SOLAR_TERMS ↔ 독립 태양황경(Meeus) 교차검증', () => {
  // 저정밀 공식(~0.01°) + 분 단위 표 → 0.1° 이내면 일치. 전사 오류는 시간~일 단위
  // (= 수 度 이상)라 이 허용오차로도 즉시 잡힌다.
  const TOLERANCE_DEG = 0.1

  for (const year of SAMPLE_YEARS) {
    it(`${year}년 12절기 전부 정통 황경과 일치`, () => {
      let checked = 0
      for (const m of MONTHS) {
        const termDate = getSolarTermKST(year, m)
        if (!termDate) continue
        const lon = sunApparentLongitude(termDate)
        const diff = angularDiff(lon, expectedLongitude(m))
        expect(
          diff,
          `${year}-${m}: 태양황경 ${lon.toFixed(4)}° vs 기대 ${expectedLongitude(m)}° (Δ${diff.toFixed(4)}°)`
        ).toBeLessThan(TOLERANCE_DEG)
        checked++
      }
      expect(checked, `${year}년 절기 표본 존재`).toBeGreaterThan(0)
    })
  }

  it('자급식 공식 자체 sanity — 2000 입춘(2/4 근처)은 황경 315° 부근', () => {
    const d = getSolarTermKST(2000, 2)
    expect(d).not.toBeNull()
    if (d) expect(angularDiff(sunApparentLongitude(d), 315)).toBeLessThan(0.1)
  })
})

/**
 * 표 전체 ↔ astronomy-engine (OD-4, OD-13) — 각 節 instant 가 astronomy-engine
 * SearchSunLongitude(겉보기 황경, 진춘분점 of date)와 90 초 안. 위 Meeus 검사(0.1° ≈ 2.4 시간)는
 * 전사 오류만 잡고, 이 검사는 생성 정밀도를 잠근다. 1899–1939 는 생성기가 같은 기준으로
 * 검증했고(최대 49 초), 1940–2051 은 E0 골든 생성기 기준 최대 47 초였다.
 */
describe('KASI_SOLAR_TERMS ↔ astronomy-engine (≤ 90 초) — 표 전체', () => {
  const MAX_DEV_SEC = 90
  const years = Object.keys(KASI_SOLAR_TERMS)
    .map(Number)
    .sort((a, b) => a - b)

  it('표는 1899(경계)–2051(경계) 를 빠짐없이 갖는다', () => {
    expect(years[0]).toBe(1899)
    expect(years[years.length - 1]).toBe(2051)
    expect(years).toHaveLength(2051 - 1899 + 1)
  })

  it('1899–2051 모든 절기가 astronomy-engine 과 90 초 안 (1900–1939 포함)', () => {
    const bad: string[] = []
    let checked = 0
    for (const year of years) {
      for (const m of MONTHS) {
        const termDate = getSolarTermKST(year, m)
        if (!termDate) {
          bad.push(`${year}-${m}: 표에 없음`)
          continue
        }
        const ae = Astronomy.SearchSunLongitude(
          expectedLongitude(m),
          new Date(Date.UTC(year, m - 1, 1)),
          13
        )
        if (!ae) {
          bad.push(`${year}-${m}: astronomy-engine 탐색 실패`)
          continue
        }
        const dev = Math.abs(ae.date.getTime() - termDate.getTime()) / 1000
        if (dev > MAX_DEV_SEC) {
          bad.push(
            `${year}-${m}: 표 ${termDate.toISOString()} vs ${ae.date.toISOString()} (${dev.toFixed(1)}s)`
          )
        }
        checked++
      }
    }
    expect(bad).toEqual([])
    expect(checked).toBe(years.length * 12)
  })
})

// @vitest-environment node
/**
 * formatCompositeChart — 출생 시각 미상 시 composite ASC/MC 제외 회귀.
 *
 * 한 쪽이라도 시각 미상이면 그 사람 ASC/MC 가 자정 기준 날조값이라, 두 ASC/MC
 * 의 midpoint(=composite ASC/MC)도 무의미하다. 이 경우 composite 점에서 ASC/MC
 * 를 빼서 aspect 에 안 잡히게 한다. 행성(태양/달 등) midpoint 은 유지.
 */
import { describe, it, expect } from 'vitest'
import { formatCompositeChart } from '@/lib/compatibility/compositeChartFormatter'
import type { Chart, PlanetBase, ZodiacKo } from '@/lib/astrology/foundation/types'

const SIGNS: ZodiacKo[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

function planet(name: string, longitude: number): PlanetBase {
  const norm = ((longitude % 360) + 360) % 360
  const idx = Math.floor(norm / 30)
  return {
    name,
    longitude: norm,
    sign: SIGNS[idx],
    degree: Math.floor(norm % 30),
    minute: 0,
    formatted: `${SIGNS[idx]} ${Math.floor(norm % 30)}deg`,
    house: idx + 1,
    speed: 1,
    retrograde: false,
  } as PlanetBase
}

// 동일 좌표 두 차트 → composite midpoint = 그 좌표. Sun/Moon@0, Venus@200,
// ASC@0, MC@90. composite Sun(0)☌ASC(0) 가 baseline 에 잡힌다.
function chart(): Chart {
  return {
    planets: [planet('Sun', 0), planet('Moon', 0), planet('Venus', 200)],
    ascendant: planet('Ascendant', 0),
    mc: planet('MC', 90),
    houses: [],
  } as unknown as Chart
}

describe('formatCompositeChart — 시각 미상 ASC/MC 제외', () => {
  const chartA = chart()
  const chartB = chart()

  it('baseline(둘 다 시각 알면): composite ASC 가 aspect 에 잡힌다', () => {
    const out = formatCompositeChart({ chartA, chartB })
    expect(out).toContain('상승점') // composite Sun ☌ ASC
  })

  it('A 시각 미상: composite ASC/MC 제외 (행성 midpoint 은 유지)', () => {
    const out = formatCompositeChart({ chartA, chartB, timeUnknownA: true })
    expect(out).not.toContain('상승점')
    expect(out).not.toContain('중천점')
    // 태양☌달 등 행성 aspect 는 남아 composite 자체는 비지 않는다.
    expect(out).toContain('태양')
  })

  it('B 시각 미상도 동일하게 ASC/MC 제외', () => {
    const out = formatCompositeChart({ chartA, chartB, timeUnknownB: true })
    expect(out).not.toContain('상승점')
  })
})

// 재감사 CS-6: ASP_SYM/ASP_EN 이 'Conjunction' 처럼 대문자 키였는데 findNatalAspects 는
// 소문자 AspectType 을 내서 한 번도 매칭되지 않았다 — EN 은 범례 없는 맨 영어, KO 는
// koStructuralLabels 를 거쳐도 'sextile' 이 영어로 남았다. 라우트와 같은 후처리로 확인.
describe('formatCompositeChart — aspect labels map (KO/EN legend)', () => {
  // 같은 차트 두 개 → composite = 그 차트. Sun 10 · Moon 10.5 · Mercury 70 · Venus 100 ·
  // Mars 130 → 결합·육각·사각·삼각이 모두 생긴다. ASC 190 · MC 280.
  const all = (): Chart =>
    ({
      planets: [
        planet('Sun', 10),
        planet('Moon', 10.5),
        planet('Mercury', 70),
        planet('Venus', 100),
        planet('Mars', 130),
      ],
      ascendant: planet('Ascendant', 190),
      mc: planet('MC', 280),
      houses: [],
    }) as unknown as Chart
  const aspectLines = (out: string) => out.split('\n').filter((l) => l.startsWith('[C] '))

  it('EN: every [C] line carries the bracketed legend label, never a bare aspect word', () => {
    const out = formatCompositeChart({ chartA: all(), chartB: all(), lang: 'en' })
    const lines = aspectLines(out)
    expect(lines.length).toBeGreaterThan(3)
    expect(out).toContain('[C] Sun [conjunction] Moon 0.5°')
    expect(out).toContain('[C] Sun [sextile] Mercury 0.0°')
    for (const l of lines) {
      expect(l).toMatch(/\[(conjunction|opposition|trine|square|sextile)\]/)
      expect(l).not.toMatch(/ (conjunction|opposition|trine|square|sextile) /)
      expect(l).not.toMatch(/[가-힣]/)
    }
  })

  it('KO (after the route post-processor): Korean legend labels, no English aspect words', async () => {
    const { koStructuralLabels } = await import('@/lib/llm/koStructuralLabels')
    const out = koStructuralLabels(formatCompositeChart({ chartA: all(), chartB: all() }))
    const lines = out.split('\n').filter((l) => l.startsWith('[합성] '))
    expect(lines.length).toBeGreaterThan(3)
    expect(out).toContain('[합성] 태양 [결합] 달 0.5°')
    expect(out).toContain('[합성] 태양 [협력] 수성 0.0°')
    for (const l of lines) {
      expect(l).toMatch(/\[(결합|대립|조화|긴장|협력)\]/)
      expect(l).not.toMatch(/conjunction|opposition|trine|square|sextile/i)
    }
  })
})

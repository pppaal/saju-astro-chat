import { describe, it, expect } from 'vitest'
import { deriveConvergence } from '@/lib/calendar-engine/derivers/convergence'
import type { ActiveSignal, CalendarCell } from '@/lib/calendar-engine/types'

// 타이밍 표면화(스텝 1) — 큰 날에 window{start,peak,end} + confidence 부착 검증.

function win(start: string, peak: string, end: string) {
  return { start, peak, end }
}

function sig(p: {
  source: ActiveSignal['source']
  kind: ActiveSignal['kind']
  polarity: number
  weight: number
  active: { start: string; peak: string; end: string }
  themes?: ActiveSignal['themes']
}): ActiveSignal {
  return {
    id: `${p.source}.${String(p.kind)}.x`,
    source: p.source,
    kind: p.kind,
    name: 'test',
    themes: p.themes ?? ['career'],
    polarity: p.polarity as ActiveSignal['polarity'],
    layer: 'daily',
    active: p.active,
    weight: p.weight,
    evidence: { module: 'test', detail: {} },
  }
}

function cell(datetime: string, signals: ActiveSignal[]): CalendarCell {
  return {
    datetime,
    signals,
    derivedScore: 50,
    themeScores: {},
    matchedPatterns: [],
    topReasons: [],
    cautions: [],
  }
}

describe('deriveConvergence — window + confidence (타이밍 표면화)', () => {
  it('큰 날에 구성 신호들의 active window 를 집계해 붙인다 (점→구간)', () => {
    // 무거운 신호: astro lifecycle + saju hyeongchung. imp=|2|×0.6=1.2 ≥ MIN_IMPACT.
    const astroHeavy = sig({
      source: 'astro',
      kind: 'lifecycle',
      polarity: 2,
      weight: 0.6,
      active: win('2026-07-10T00:00:00Z', '2026-07-15T00:00:00Z', '2026-07-20T00:00:00Z'),
    })
    const sajuHeavy = sig({
      source: 'saju',
      kind: 'hyeongchung',
      polarity: 2,
      weight: 0.6,
      active: win('2026-07-12T00:00:00Z', '2026-07-14T00:00:00Z', '2026-07-18T00:00:00Z'),
    })
    const { keyDays } = deriveConvergence([cell('2026-07-15T00:00:00Z', [astroHeavy, sajuHeavy])], 5, 'ko')

    expect(keyDays.length).toBe(1)
    const d = keyDays[0]
    expect(d.bothSystems).toBe(true)
    // 윈도우 = 스케일 적합(≤45일) 신호들의 합집합 — 7/10 ~ 7/20.
    // 두 신호 모두 월 스케일 이내라 둘 다 집계된다(느린 외행성만 제외 대상).
    expect(d.window?.start).toBe('2026-07-10T00:00:00.000Z')
    expect(d.window?.end).toBe('2026-07-20T00:00:00.000Z')
    // peak = impact 동일하니 첫 신호(astro) 정점 7/15 (구간 안)
    expect(d.window?.peak).toBe('2026-07-15T00:00:00.000Z')
  })

  it('사주·점성 방향이 같으면 confidence↑, 반대면 ↓', () => {
    const w = win('2026-08-01T00:00:00Z', '2026-08-03T00:00:00Z', '2026-08-05T00:00:00Z')
    const aligned = deriveConvergence(
      [
        cell('2026-08-03T00:00:00Z', [
          sig({ source: 'astro', kind: 'lifecycle', polarity: 2, weight: 0.6, active: w }),
          sig({ source: 'saju', kind: 'hyeongchung', polarity: 2, weight: 0.6, active: w }),
        ]),
      ],
      5,
      'ko'
    ).keyDays[0]
    const opposed = deriveConvergence(
      [
        cell('2026-08-03T00:00:00Z', [
          sig({ source: 'astro', kind: 'lifecycle', polarity: 2, weight: 0.6, active: w }),
          sig({ source: 'saju', kind: 'hyeongchung', polarity: -2, weight: 0.6, active: w }),
        ]),
      ],
      5,
      'ko'
    ).keyDays[0]

    expect(aligned.bothSystems).toBe(true)
    expect(opposed.bothSystems).toBe(true)
    expect(aligned.confidence!).toBeGreaterThan(opposed.confidence!)
    expect(aligned.confidence!).toBeGreaterThanOrEqual(0)
    expect(aligned.confidence!).toBeLessThanOrEqual(100)
  })
})

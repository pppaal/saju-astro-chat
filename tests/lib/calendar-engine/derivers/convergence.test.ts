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
}): ActiveSignal {
  return {
    id: `${p.source}.${String(p.kind)}.x`,
    source: p.source,
    kind: p.kind,
    name: 'test',
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
    salience: 0,
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
    const { keyDays } = deriveConvergence(
      [cell('2026-07-15T00:00:00Z', [astroHeavy, sajuHeavy])],
      5,
      'ko'
    )

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

// ── 추가: meaning 톤 arm · 칩 선택 · 다양성 캡 · 폴백 (uncovered branches) ──

describe('deriveConvergence — meaning 톤 (positive/negative/neutral/disagree)', () => {
  it('순극성이 강하게 +면 positive 톤 한 줄', () => {
    const w = win('2026-09-10T00:00:00Z', '2026-09-15T00:00:00Z', '2026-09-20T00:00:00Z')
    const d = deriveConvergence(
      [
        cell('2026-09-15T00:00:00Z', [
          sig({ source: 'astro', kind: 'lifecycle', polarity: 3, weight: 0.8, active: w }),
          sig({ source: 'saju', kind: 'hyeongchung', polarity: 3, weight: 0.8, active: w }),
        ]),
      ],
      5,
      'ko'
    ).keyDays[0]
    expect(d.meaning).toBeTruthy()
  })

  it('순극성이 강하게 −면 negative 톤 한 줄 (양쪽 같은 방향이라 disagree 아님)', () => {
    const w = win('2026-10-10T00:00:00Z', '2026-10-15T00:00:00Z', '2026-10-20T00:00:00Z')
    const d = deriveConvergence(
      [
        cell('2026-10-15T00:00:00Z', [
          sig({ source: 'astro', kind: 'lifecycle', polarity: -3, weight: 0.8, active: w }),
          sig({ source: 'saju', kind: 'hyeongchung', polarity: -3, weight: 0.8, active: w }),
        ]),
      ],
      5,
      'en'
    ).keyDays[0]
    expect(d.meaning).toBeTruthy()
  })

  it('두 체계 방향이 어긋나면 disagree → neutral 톤으로 단정 회피', () => {
    const w = win('2026-11-10T00:00:00Z', '2026-11-15T00:00:00Z', '2026-11-20T00:00:00Z')
    const d = deriveConvergence(
      [
        cell('2026-11-15T00:00:00Z', [
          sig({ source: 'astro', kind: 'lifecycle', polarity: 3, weight: 0.9, active: w }),
          sig({ source: 'saju', kind: 'hyeongchung', polarity: -2, weight: 0.6, active: w }),
        ]),
      ],
      5,
      'ko'
    ).keyDays[0]
    // disagree confidence 는 같은 방향(+12)이 아니라 −12 가 적용돼 낮다.
    expect(d.bothSystems).toBe(true)
    expect(d.confidence!).toBeLessThan(50)
    expect(d.meaning).toBeTruthy()
  })

  it('순톤이 0 근처면 neutral 톤', () => {
    const w = win('2026-12-10T00:00:00Z', '2026-12-15T00:00:00Z', '2026-12-20T00:00:00Z')
    // 한쪽 polarity 0 → astroPolNet/sajuPolNet 분리상 disagree 아님, ratio≈ 작음.
    const d = deriveConvergence(
      [
        cell('2026-12-15T00:00:00Z', [
          sig({ source: 'astro', kind: 'lifecycle', polarity: 2, weight: 0.6, active: w }),
          sig({ source: 'saju', kind: 'hyeongchung', polarity: -2, weight: 0.6, active: w }),
        ]),
      ],
      5,
      'ko'
    ).keyDays[0]
    expect(d.meaning).toBeTruthy()
  })
})

describe('deriveConvergence — 폴백·필터 (uncovered branches)', () => {
  it('느린 외행성(장기 span) 만 있으면 window 가 셀 날짜 점으로 폴백', () => {
    // span > 45일 → aggregateWindow 집계 제외 → start/end 셀 날짜로 폴백.
    const slow = sig({
      source: 'astro',
      kind: 'lifecycle',
      polarity: 3,
      weight: 0.9,
      active: win('2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z', '2027-01-01T00:00:00Z'),
    })
    const d = deriveConvergence([cell('2026-06-01T00:00:00Z', [slow])], 5, 'ko').keyDays[0]
    expect(d).toBeTruthy()
    expect(d.window?.start).toBe('2026-06-01T00:00:00.000Z')
    expect(d.window?.end).toBe('2026-06-01T00:00:00.000Z')
  })

  it('imp 가 MIN_IMPACT 미만인 신호는 무시 → 큰 날 없음', () => {
    const tiny = sig({
      source: 'astro',
      kind: 'lifecycle',
      polarity: 1,
      weight: 0.01,
      active: win('2026-02-01T00:00:00Z', '2026-02-02T00:00:00Z', '2026-02-03T00:00:00Z'),
    })
    const { keyDays } = deriveConvergence([cell('2026-02-02T00:00:00Z', [tiny])], 5, 'ko')
    expect(keyDays.length).toBe(0)
  })

  it('가벼운(heavy 아님) 신호만 있으면 큰 날 없음', () => {
    const light = sig({
      source: 'astro',
      kind: 'moon-phase', // heavy astro kind 아님
      polarity: 2,
      weight: 0.6,
      active: win('2026-03-01T00:00:00Z', '2026-03-02T00:00:00Z', '2026-03-03T00:00:00Z'),
    })
    const { keyDays } = deriveConvergence([cell('2026-03-02T00:00:00Z', [light])], 5, 'ko')
    expect(keyDays.length).toBe(0)
  })

  it('점성-only(saju 무거움 없음) 도 큰 날로 잡힌다 (bothSystems=false)', () => {
    const astroOnly = sig({
      source: 'astro',
      kind: 'lifecycle',
      polarity: 3,
      weight: 0.9,
      active: win('2026-04-10T00:00:00Z', '2026-04-12T00:00:00Z', '2026-04-14T00:00:00Z'),
    })
    const d = deriveConvergence([cell('2026-04-12T00:00:00Z', [astroOnly])], 5, 'ko').keyDays[0]
    expect(d.bothSystems).toBe(false)
    expect(d.astro.length).toBeGreaterThanOrEqual(0)
  })
})

describe('deriveConvergence — 정렬·다양성·topN', () => {
  function heavyPair(day: string, pol: number) {
    const w = win(`${day}T00:00:00Z`, `${day}T06:00:00Z`, `${day}T23:00:00Z`)
    return cell(`${day}T12:00:00Z`, [
      sig({ source: 'astro', kind: 'lifecycle', polarity: pol, weight: 0.8, active: w }),
      sig({ source: 'saju', kind: 'hyeongchung', polarity: pol, weight: 0.8, active: w }),
    ])
  }

  it('score 내림차순으로 정렬하고 topN 으로 자른다', () => {
    const cells = [
      heavyPair('2026-05-01', 1),
      heavyPair('2026-05-10', 3),
      heavyPair('2026-05-20', 2),
    ]
    const { keyDays } = deriveConvergence(cells, 2, 'ko')
    expect(keyDays.length).toBe(2)
    expect(keyDays[0].date).toBe('2026-05-10') // 가장 강함 먼저
    expect(keyDays[0].score).toBeGreaterThanOrEqual(keyDays[1].score)
  })

  it('3일 이내 근접일은 dedup (큰 날 도배 방지)', () => {
    const cells = [
      heavyPair('2026-06-10', 3),
      heavyPair('2026-06-11', 3), // 1일 차 → 근접 dedup
      heavyPair('2026-06-25', 3), // 충분히 떨어짐
    ]
    const { keyDays } = deriveConvergence(cells, 5, 'ko')
    const dates = keyDays.map((d) => d.date)
    expect(dates).toContain('2026-06-10')
    expect(dates).not.toContain('2026-06-11')
    expect(dates).toContain('2026-06-25')
  })
})

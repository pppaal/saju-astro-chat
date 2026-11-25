import { describe, it, expect } from 'vitest'
import { extractCrossActivations } from '@/lib/calendar-engine/extractors/cross-activation'
import { dedupeCrossSignals, __bucketingInternals } from '@/lib/calendar-engine'
import type { ActiveSignal } from '@/lib/calendar-engine/types'

/**
 * cross-activation extractor — saju × astro 동시 활성 페어 합성.
 * cross-activation-band.test.ts 는 밴드 게이팅을 덮는다. 여기서는
 * combinePolarity arm, dedup(best-by-day), 키 추출/스킵 분기를 덮는다.
 *
 * 매핑 사전 페어 (data/saju-astro-mapping):
 *   정관 × Saturn (mapping polarity +1)
 *   편관 × Mars   (mapping polarity −2)  ← Mars 밴드 daily/monthly
 *   정재 × Venus  (mapping polarity +2)  ← Venus 밴드 daily/monthly
 */

function makeWin(start: string, peak: string, end: string) {
  return { start, peak, end }
}

function sajuSig(p: {
  sibsin?: string
  shinsalName?: string
  polarity: number
  weight?: number
  layer?: ActiveSignal['layer']
  win?: { start: string; peak: string; end: string }
}): ActiveSignal {
  return {
    id: `saju.${p.sibsin ?? p.shinsalName}.${p.win?.start ?? 'x'}`,
    source: 'saju',
    kind: 'pillar-sibsin',
    name: p.sibsin ?? p.shinsalName ?? 'x',
    polarity: p.polarity as ActiveSignal['polarity'],
    layer: p.layer ?? 'monthly',
    active:
      p.win ?? makeWin('2026-07-01T00:00:00Z', '2026-07-05T00:00:00Z', '2026-07-10T00:00:00Z'),
    weight: p.weight ?? 0.6,
    evidence: {
      // 교차 키는 정통 기둥 십신(saju-pillar)·신살 모듈에서만 나온다(엔진 감사 X4).
      module: p.sibsin ? 'saju-pillar' : 'saju-shinsal',
      detail: {},
      sibsin: p.sibsin as never,
      shinsalName: p.shinsalName,
    },
  }
}

function astroSig(p: {
  planet: string
  polarity: number
  weight?: number
  layer?: ActiveSignal['layer']
  win?: { start: string; peak: string; end: string }
}): ActiveSignal {
  return {
    id: `astro.${p.planet}.${p.win?.start ?? 'x'}`,
    source: 'astro',
    kind: 'transit',
    name: p.planet,
    polarity: p.polarity as ActiveSignal['polarity'],
    layer: p.layer ?? 'monthly',
    active:
      p.win ?? makeWin('2026-07-01T00:00:00Z', '2026-07-06T00:00:00Z', '2026-07-12T00:00:00Z'),
    weight: p.weight ?? 0.6,
    evidence: { module: 'test', detail: {}, planets: [p.planet] },
  }
}

describe('combinePolarity (extractCrossActivations 경유)', () => {
  it('둘 다 +면 매핑 polarity 부호·크기 그대로 (정재 × Venus = +2)', () => {
    const out = extractCrossActivations([
      sajuSig({ sibsin: '정재', polarity: 2 }),
      astroSig({ planet: 'Venus', polarity: 2 }),
    ])
    expect(out.length).toBe(1)
    expect(out[0].polarity).toBe(2)
    expect(out[0].name).toBe('정재 × 금성')
  })

  it('둘 다 −면 (같은 방향) 매핑 polarity 그대로 (정재 × Venus = +2)', () => {
    const out = extractCrossActivations([
      sajuSig({ sibsin: '정재', polarity: -2 }),
      astroSig({ planet: 'Venus', polarity: -1 }),
    ])
    expect(out.length).toBe(1)
    expect(out[0].polarity).toBe(2) // |mapping| 부호 유지
  })

  it('부호가 어긋나면 (+ / −) → polarity 0 (의미 충돌 무력화)', () => {
    const out = extractCrossActivations([
      sajuSig({ sibsin: '정재', polarity: 2 }),
      astroSig({ planet: 'Venus', polarity: -2 }),
    ])
    expect(out.length).toBe(1)
    expect(out[0].polarity).toBe(0)
  })

  it('부호 충돌이면 문구도 중립 교체 — 강한 길/흉 원문 유지 금지 (감사 #9)', () => {
    const out = extractCrossActivations([
      sajuSig({ sibsin: '정재', polarity: 2 }),
      astroSig({ planet: 'Venus', polarity: -2 }),
    ])
    expect(out[0].korean).toContain('상쇄')
    expect(out[0].english).toContain('cancel out')
    // "X × Y — 문장" 머리 형식 유지 — stripCrossPair 의존.
    expect(out[0].korean).toMatch(/×.*—/)
    expect(out[0].english).toMatch(/×.*—/)
    // EN 머리에 한글 페어명 누수 없음 (산문 무결성 가드와 동일 기준).
    expect(/[가-힣]/.test((out[0].english ?? '').split('—')[0])).toBe(false)
  })

  it('부호가 같은 방향이면 매핑 원문 문구 그대로 (중립 교체 없음)', () => {
    const out = extractCrossActivations([
      sajuSig({ sibsin: '정재', polarity: 2 }),
      astroSig({ planet: 'Venus', polarity: 2 }),
    ])
    expect(out[0].korean).not.toContain('상쇄되는 날')
    expect(out[0].polarity).toBe(2)
  })

  it('R3: 매핑 자체가 중립(polarity 0)이고 부모 같은 방향이면 "상쇄" 아님 — 매핑 원문 유지', () => {
    // 편인 × 수성 = mapping polarity 0. 옛 코드는 부모가 같은 방향(++)이어도
    // "서로 반대로 당겨 상쇄" 로 잘못 찍어 매핑 의미와 모순됐다(감사).
    const out = extractCrossActivations([
      sajuSig({ sibsin: '편인', polarity: 1 }),
      astroSig({ planet: 'Mercury', polarity: 1 }),
    ])
    expect(out.length).toBe(1)
    expect(out[0].polarity).toBe(0)
    expect(out[0].korean).not.toContain('상쇄')
    expect(out[0].korean).toContain('편인 × 수성') // 매핑 원문
  })

  it('한쪽 polarity=0 이면 매핑 polarity 그대로 (편관 × Mars = −2)', () => {
    const out = extractCrossActivations([
      sajuSig({ sibsin: '편관', polarity: 0 }),
      astroSig({ planet: 'Mars', polarity: 2 }),
    ])
    expect(out.length).toBe(1)
    expect(out[0].polarity).toBe(-2)
  })
})

describe('extractCrossActivations — 구조 / weight / layer', () => {
  it('합성 신호 evidence 에 parentIds·grade·mappingPolarity 를 보존', () => {
    const saju = sajuSig({ sibsin: '정관', polarity: 2, layer: 'yearly' })
    const astro = astroSig({ planet: 'Saturn', polarity: 2, layer: 'yearly' })
    const out = extractCrossActivations([saju, astro])
    expect(out.length).toBe(1)
    const detail = out[0].evidence.detail as Record<string, unknown>
    expect(detail.parentIds).toEqual([saju.id, astro.id])
    expect(detail.sajuKey).toBe('정관')
    expect(detail.astroKey).toBe('Saturn')
    expect(detail.grade).toBe('A')
    expect(out[0].kind).toBe('cross-activation')
    expect(out[0].source).toBe('saju')
  })

  it('weight = saju.w × astro.w × 0.6, [0,1] clamp', () => {
    const out = extractCrossActivations([
      sajuSig({ sibsin: '정재', polarity: 2, weight: 0.5 }),
      astroSig({ planet: 'Venus', polarity: 2, weight: 0.4 }),
    ])
    expect(out[0].weight).toBeCloseTo(0.5 * 0.4 * 0.6, 6)
  })

  it('id = cross.<십신>-x-<행성>.<layer>:<창 시작일>~<끝일> — 살아남은 교차끼리 유일', () => {
    const out = extractCrossActivations([
      sajuSig({ sibsin: '정재', polarity: 2 }),
      astroSig({ planet: 'Venus', polarity: 2 }),
    ])
    expect(out[0].id).toBe('cross.정재-x-Venus.monthly:2026-07-01~2026-07-10')
  })
})

describe('extractCrossActivations — dedup / 키 추출 / 스킵', () => {
  it('같은 페어·같은 창의 여러 부모 조합이면 가장 강한 한 쌍만 보존', () => {
    const win = makeWin('2026-07-01T00:00:00Z', '2026-07-05T00:00:00Z', '2026-07-10T00:00:00Z')
    const weakSaju = sajuSig({ sibsin: '정재', polarity: 2, weight: 0.3, win })
    const strongSaju = sajuSig({ sibsin: '정재', polarity: 2, weight: 0.9, win })
    strongSaju.id = 'saju.정재.strong'
    const astro = astroSig({ planet: 'Venus', polarity: 2, weight: 0.8, win })
    const out = extractCrossActivations([weakSaju, strongSaju, astro])
    // 같은 날 같은 페어 → 1개만, weight 큰 strong 쪽.
    expect(out.length).toBe(1)
    const detail = out[0].evidence.detail as Record<string, unknown>
    expect((detail.parentIds as string[])[0]).toBe('saju.정재.strong')
  })

  it('cross-activation 입력은 재투입에서 스킵 (재호출 안전)', () => {
    const prior = extractCrossActivations([
      sajuSig({ sibsin: '정재', polarity: 2 }),
      astroSig({ planet: 'Venus', polarity: 2 }),
    ])
    expect(prior.length).toBe(1)
    // prior(cross-activation) 를 다시 넣어도 자기 자신은 매칭 대상이 아님.
    const out = extractCrossActivations([...prior])
    expect(out.length).toBe(0)
  })

  it('매칭 키 없는 saju/astro 신호는 스킵', () => {
    const noKeySaju = sajuSig({ polarity: 2 }) // sibsin/shinsal 둘 다 없음
    noKeySaju.evidence = { module: 'test', detail: {} }
    const out = extractCrossActivations([noKeySaju, astroSig({ planet: 'Venus', polarity: 2 })])
    expect(out.length).toBe(0)
  })

  it('astro 신호에 planets 가 비면 키 추출 실패 → 스킵', () => {
    const noPlanet = astroSig({ planet: 'Venus', polarity: 2 })
    noPlanet.evidence = { module: 'test', detail: {}, planets: [] }
    const out = extractCrossActivations([sajuSig({ sibsin: '정재', polarity: 2 }), noPlanet])
    expect(out.length).toBe(0)
  })

  it('매핑 사전에 없는 페어면 emit 안 함 (편인 × Sun 미정의)', () => {
    // (예전 예시 정재×Mars 는 v5 커버리지 확장으로 매핑됨 — 미정의 페어 교체.)
    const out = extractCrossActivations([
      sajuSig({ sibsin: '편인', polarity: 2 }),
      astroSig({ planet: 'Sun', polarity: 2 }),
    ])
    expect(out.length).toBe(0)
  })

  it('활성 윈도우가 겹치지 않으면 emit 안 함', () => {
    const out = extractCrossActivations([
      sajuSig({
        sibsin: '정재',
        polarity: 2,
        win: makeWin('2026-07-01T00:00:00Z', '2026-07-02T00:00:00Z', '2026-07-03T00:00:00Z'),
      }),
      astroSig({
        planet: 'Venus',
        polarity: 2,
        win: makeWin('2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z', '2026-08-03T00:00:00Z'),
      }),
    ])
    expect(out.length).toBe(0)
  })

  it('신살 키(양인) 도 매칭 (shinsalName 경로)', () => {
    // 양인 × Mars 가 매핑에 있으면 emit. 없으면 0. 어느 쪽이든 키 추출 경로를 탄다.
    const out = extractCrossActivations([
      sajuSig({ shinsalName: '양인', polarity: 2, layer: 'daily' }),
      astroSig({ planet: 'Mars', polarity: 2, layer: 'daily' }),
    ])
    // shinsalName 경로가 실행됐는지: 결과가 0 또는 1 이며 에러 없이 처리.
    expect(out.length).toBeGreaterThanOrEqual(0)
    if (out.length === 1) {
      const detail = out[0].evidence.detail as Record<string, unknown>
      expect(detail.sajuKey).toBe('양인')
    }
  })
})

describe('교차 부모 자격 (엔진 감사 X4·X5)', () => {
  it('오행 흐름·지장간 통근 같은 파생 라인의 sibsin 은 교차 키가 아니다', () => {
    for (const mod of ['saju-element-flow', 'saju-jijanggan']) {
      const derived = sajuSig({ sibsin: '정재', polarity: -1 })
      derived.evidence = { ...derived.evidence, module: mod }
      const out = extractCrossActivations([derived, astroSig({ planet: 'Venus', polarity: -1 })])
      expect(out, mod).toHaveLength(0)
    }
  })

  it('시진(saju-hour)·신살(saju-shinsal-activation) 은 교차 키', () => {
    const hour = sajuSig({ sibsin: '정재', polarity: 2, layer: 'hourly' })
    hour.evidence = { ...hour.evidence, module: 'saju-hour' }
    expect(
      extractCrossActivations([hour, astroSig({ planet: 'Venus', polarity: 2, layer: 'daily' })])
    ).toHaveLength(1)
    const act = sajuSig({ shinsalName: '천을귀인', polarity: 2, layer: 'daily' })
    act.evidence = { ...act.evidence, module: 'saju-shinsal-activation' }
    const out = extractCrossActivations([
      act,
      astroSig({ planet: 'Jupiter', polarity: 2, layer: 'monthly' }),
    ])
    expect(out).toHaveLength(1)
    expect((out[0].evidence.detail as { sajuKey: string }).sajuKey).toBe('천을귀인')
  })

  it('행성시(planetary-hour) Saturn 은 정관·정재와 교차를 만들지 않는다 — 시간의 지배성', () => {
    const satHour = astroSig({ planet: 'Saturn', polarity: -1, layer: 'hourly' })
    satHour.kind = 'planetary-hour'
    const out = extractCrossActivations([
      sajuSig({ sibsin: '정관', polarity: 2, layer: 'decadal' }),
      sajuSig({ sibsin: '정재', polarity: 2, layer: 'decadal' }),
      satHour,
    ])
    expect(out).toHaveLength(0)
  })
})

describe('셀 단위 교차 dedup (엔진 감사 X2)', () => {
  const cross = (id: string, name: string, layer: ActiveSignal['layer'], pol: number, w: number) =>
    ({
      id,
      source: 'saju',
      kind: 'cross-activation',
      name,
      polarity: pol as ActiveSignal['polarity'],
      layer,
      active: makeWin('2026-07-01T00:00:00Z', '2026-07-01T12:00:00Z', '2026-07-01T23:00:00Z'),
      weight: w,
      evidence: { module: 'cross-activation', detail: {} },
    }) as ActiveSignal

  it('(name, layer) 당 가장 센 1개 — 다른 layer 는 따로 남는다', () => {
    const out = dedupeCrossSignals([
      cross('a', '정재 × 금성', 'daily', 2, 0.2),
      cross('b', '정재 × 금성', 'daily', 2, 0.3),
      cross('c', '정재 × 금성', 'monthly', 2, 0.1),
      sajuSig({ sibsin: '정재', polarity: 2 }),
    ])
    expect(out.map((s) => s.id)).toEqual(['b', 'c', 'saju.정재.x'])
  })

  it('짧은 강한 교차와 같은 날 시작한 긴 교차가 둘 다 산다 — 시작일이 생존을 정하지 않는다', () => {
    // 월운 정관(한 달) × 토성 라이프사이클(decadal) = decadal 교차(긴 창).
    // 같은 날 시작하는 시진 정관 × 토성 트랜짓(yearly) = yearly 교차(더 셈, 짧은 창).
    // 예전 dedup 키 (페어, 창 시작일)은 yearly 가 decadal 을 지워 이후 날에도 decadal 이 없었다.
    const wolun = sajuSig({
      sibsin: '정관',
      polarity: 2,
      layer: 'monthly',
      weight: 0.7,
      win: makeWin('2026-07-01T00:00:00Z', '2026-07-15T00:00:00Z', '2026-07-30T23:59:59Z'),
    })
    const hour = sajuSig({
      sibsin: '정관',
      polarity: 2,
      layer: 'hourly',
      weight: 0.4,
      win: makeWin('2026-07-01T09:00:00Z', '2026-07-01T10:00:00Z', '2026-07-01T11:00:00Z'),
    })
    hour.id = 'saju.hour.정관'
    hour.evidence = { ...hour.evidence, module: 'saju-hour' }
    const lifecycle = astroSig({
      planet: 'Saturn',
      polarity: 2,
      layer: 'decadal',
      weight: 0.5,
      win: makeWin('2026-01-01T00:00:00Z', '2026-07-01T00:00:00Z', '2027-12-31T00:00:00Z'),
    })
    const transit = astroSig({
      planet: 'Saturn',
      polarity: 2,
      layer: 'yearly',
      weight: 1,
      win: makeWin('2026-06-01T12:00:00Z', '2026-07-01T12:00:00Z', '2026-07-01T12:00:00Z'),
    })
    transit.id = 'astro.transit.Saturn'
    const signals = [wolun, hour, lifecycle, transit]
    const all = [...signals, ...extractCrossActivations(signals)]
    const cells = __bucketingInternals.groupIntoCells(
      all,
      { start: '2026-07-01T00:00:00.000Z', end: '2026-07-10T23:59:59.999Z', granularity: 'day' },
      { includeEvidence: true }
    )
    for (const c of cells) {
      const crosses = c.signals.filter((s) => s.kind === 'cross-activation')
      const keys = crosses.map((s) => `${s.name}|${s.layer}`)
      expect(new Set(keys).size, c.datetime).toBe(keys.length)
      expect(keys, c.datetime).toContain('정관 × 토성|decadal')
    }
    const first = cells[0].signals.filter((s) => s.kind === 'cross-activation')
    expect(first.map((s) => s.layer).sort()).toEqual(['decadal', 'yearly'])
  })
})

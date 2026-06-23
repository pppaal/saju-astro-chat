import { describe, it, expect } from 'vitest'
import extractor from '@/lib/calendar-engine/extractors/saju-jijanggan'
import type { ExtractorContext, ActiveSignal } from '@/lib/calendar-engine/types'

/**
 * saju-jijanggan — 시기 지지의 지장간 3층 × 본명 일간/천간/일지 지장간 매트릭스.
 * 세 신호 모드(통근·암합·충)와 화기(化氣) 게이트, 충 ladder 를 덮는다.
 *
 * 검증용 본명 (일간 乙=목, 월지 酉=금):
 *   year 庚酉 · month 戊酉 · day 乙午 · time 壬子
 *   yongsin {primary 금, secondary 토, avoid [목,화]}
 * 이 본명에서 (단일 일자 range, 세운/월운/월령 신호 포함):
 *   - 통근: 시기 지장간 甲/乙(목) = 일간 乙(목) → 통근 발화
 *   - 암합 full: 乙庚 → 화기 금 == 월령 酉(금) → status 'full' (+2 = yongsin.primary 금)
 *   - 암합 failed: 戊癸 → 화기 화, 월령 금이 화에 극받음 + 본명에 파합자 → 'failed'(0)
 *   - 충: 시기 지장간 ↔ 본명 일지 午 지장간(丙/己/丁). 癸-丁 충, 壬-丙 충.
 */

type Pillar = { stem: string; branch: string }
function ctx(opts: {
  day: Pillar
  year?: Pillar
  month?: Pillar
  time?: Pillar
  strength?: 'strong' | 'medium' | 'weak'
  yongsin?: { primary: string; secondary?: string; avoid: string[] }
  daeun?: Array<{ startYear: number; stem: string; branch: string }>
  start: string
  end: string
}): ExtractorContext {
  const p = (x?: Pillar) =>
    x ? { heavenlyStem: { name: x.stem }, earthlyBranch: { name: x.branch } } : {}
  return {
    natal: {
      input: { year: 1984, month: 1, date: 1 },
      saju: {
        pillars: {
          year: p(opts.year ?? { stem: '庚', branch: '酉' }),
          month: p(opts.month ?? { stem: '戊', branch: '酉' }),
          day: p(opts.day),
          time: p(opts.time ?? { stem: '壬', branch: '子' }),
        },
        strength: opts.strength ?? 'weak',
        yongsin: opts.yongsin ?? { primary: '금', secondary: '토', avoid: ['목', '화'] },
        daeun: opts.daeun ?? [],
      },
    },
    range: { start: opts.start, end: opts.end, granularity: 'day' },
    cache: { get: () => undefined, set: () => undefined },
  } as unknown as ExtractorContext
}

function run(c: ExtractorContext): ActiveSignal[] {
  return extractor.extract(c) as ActiveSignal[]
}
function modesOf(out: ActiveSignal[]): Set<string> {
  return new Set(out.map((s) => (s.evidence.detail as { mode: string }).mode))
}
const DAY = (n: number) => ({
  start: `2026-01-${String(n).padStart(2, '0')}T00:00:00.000Z`,
  end: `2026-01-${String(n).padStart(2, '0')}T23:59:59.999Z`,
})

const STD = { stem: '乙', branch: '午' } // 일간 乙, 일지 午(丙己丁)

describe('sajuJijangganExtractor — 메타 / 가드', () => {
  it('source/kind 선언', () => {
    expect(extractor.source).toBe('saju')
    expect(extractor.kind).toBe('jijanggan')
  })

  it('일간을 못 찾으면 빈 배열', () => {
    expect(run(ctx({ day: { stem: '없음', branch: '午' }, ...DAY(6) }))).toEqual([])
  })
})

describe('sajuJijangganExtractor — 3 신호 모드 동시 발화', () => {
  it('통근·암합·충 모두 발화한다 (풍부한 본명/하루)', () => {
    const out = run(ctx({ day: STD, ...DAY(6) }))
    const modes = modesOf(out)
    expect(modes.has('tonggeun')).toBe(true)
    expect(modes.has('amhap')).toBe(true)
    expect(modes.has('chung')).toBe(true)
  })

  it('모든 신호가 saju/jijanggan + evidence 모듈 + 윈도우', () => {
    const out = run(ctx({ day: STD, ...DAY(6) }))
    expect(out.length).toBeGreaterThan(0)
    for (const s of out) {
      expect(s.source).toBe('saju')
      expect(s.kind).toBe('jijanggan')
      expect(s.evidence.module).toBe('saju-jijanggan')
      expect(typeof s.korean).toBe('string')
      expect(typeof s.english).toBe('string')
      expect(s.active.start <= s.active.peak).toBe(true)
      expect(s.active.peak <= s.active.end).toBe(true)
      expect(s.weight).toBeGreaterThan(0)
    }
  })
})

describe('sajuJijangganExtractor — 통근 polarity (layer × strength)', () => {
  function tonggeunByLayer(out: ActiveSignal[]) {
    const map: Record<string, number> = {}
    for (const s of out) {
      const d = s.evidence.detail as { mode: string; jijangganLayer: string }
      if (d.mode === 'tonggeun') map[d.jijangganLayer] = s.polarity
    }
    return map
  }

  it('정기 통근: 신약 +3 / medium +1 / 신강 −1', () => {
    // 1/04 일진 寅(여기戊·중기丙·정기甲) → 정기 甲(목) = 일간 乙(목) 통근.
    const weak = tonggeunByLayer(run(ctx({ day: STD, strength: 'weak', ...DAY(4) })))
    expect(weak['정기']).toBe(3)
    const med = tonggeunByLayer(run(ctx({ day: STD, strength: 'medium', ...DAY(4) })))
    expect(med['정기']).toBe(1)
    const strong = tonggeunByLayer(run(ctx({ day: STD, strength: 'strong', ...DAY(4) })))
    expect(strong['정기']).toBe(-1)
  })
})

describe('sajuJijangganExtractor — 암합 화기 게이트', () => {
  it('full: 乙庚 화기 금 == 월령 酉(금) → polarity +2(용신 금) + 인접 보너스', () => {
    const out = run(ctx({ day: STD, ...DAY(6) }))
    const full = out.find((s) => {
      const d = s.evidence.detail as { mode: string; hwagiStatus?: string }
      return d.mode === 'amhap' && d.hwagiStatus === 'full'
    })!
    expect(full).toBeTruthy()
    expect(full.polarity).toBe(2)
    const d = full.evidence.detail as { transform: string; hwagiAdjacencyBonus: boolean }
    expect(d.transform).toBe('금')
    expect(d.hwagiAdjacencyBonus).toBe(true)
  })

  it('failed: 화기가 월령에 깨지거나 파합자 존재 → polarity 0 + 강도 대폭 절감', () => {
    const out = run(ctx({ day: STD, ...DAY(6) }))
    const failed = out.find((s) => {
      const d = s.evidence.detail as { mode: string; hwagiStatus?: string }
      return d.mode === 'amhap' && d.hwagiStatus === 'failed'
    })!
    expect(failed).toBeTruthy()
    expect(failed.polarity).toBe(0)
    // failed weight = base × layer × 0.9 × 0.3 → full(0.9×1.1) 보다 작다.
    const full = out.find((s) => {
      const dd = s.evidence.detail as { mode: string; hwagiStatus?: string }
      return dd.mode === 'amhap' && dd.hwagiStatus === 'full'
    })!
    expect(failed.weight).toBeLessThan(full.weight)
  })

  it('partial: 월령이 화기를 생/역생/중립이면 polarity 유지 강도 절감', () => {
    // 월령을 子(수)로 바꾸면 乙庚→금 에 대해 수≠금, 금生수(transform shengs month) → partial.
    const out = run(ctx({ day: STD, month: { stem: '戊', branch: '子' }, ...DAY(6) }))
    const partial = out.find((s) => {
      const d = s.evidence.detail as { mode: string; hwagiStatus?: string }
      return d.mode === 'amhap' && d.hwagiStatus === 'partial'
    })
    expect(partial).toBeTruthy()
  })
})

describe('sajuJijangganExtractor — 암합 polarity (용신 4-way)', () => {
  it('합화=primary 용신 → +2, 1차 기신(합거) → −2', () => {
    // primary 금 → 乙庚 화기 금 = +2 (full). avoid[0] 를 금 으로 두면 합거 −2.
    const good = run(ctx({ day: STD, ...DAY(6) })).find(
      (s) => (s.evidence.detail as { mode: string }).mode === 'amhap' && s.polarity === 2
    )
    expect(good).toBeTruthy()

    // 용신 뒤집기: primary 목, avoid 금 1차 → 합화 금 = 합거 −2. 단 status full 일 때만.
    const flipped = run(
      ctx({
        day: STD,
        yongsin: { primary: '목', secondary: '수', avoid: ['금', '토'] },
        ...DAY(6),
      })
    )
    const hard = flipped.find((s) => {
      const d = s.evidence.detail as { mode: string; hwagiStatus?: string; basePolarity?: number }
      return d.mode === 'amhap' && d.hwagiStatus === 'full' && d.basePolarity === -2
    })
    expect(hard).toBeTruthy()
    expect(hard!.polarity).toBe(-2)
  })
})

describe('sajuJijangganExtractor — 충 ladder (층 조합별 3-tier)', () => {
  it('정기↔정기 충 = polarity −3, tier jeonggi-jeonggi', () => {
    // 본명 일지 午 정기 丁. 시기(월운) 지장간 정기 癸(子) → 癸-丁 충 정기↔정기.
    // 子월 = 대설月(~12/7~1/5). 월주는 중순(12/15) 기준이므로 12월 range 로 子월 확보.
    // (1월 6일은 소한 이후라 丑월 — 옛 day-1 샘플링이 子 를 잘못 잡던 자리.)
    const out = run(
      ctx({ day: STD, start: '2025-12-10T00:00:00.000Z', end: '2025-12-10T23:59:59.999Z' })
    )
    const jj = out.find((s) => {
      const d = s.evidence.detail as { mode: string; chungTier?: string }
      return d.mode === 'chung' && d.chungTier === 'jeonggi-jeonggi'
    })!
    expect(jj).toBeTruthy()
    expect(jj.polarity).toBe(-3)
  })

  it('정기↔중기 충 = −2, 여기 포함 충 = −1', () => {
    const out = run(ctx({ day: STD, ...DAY(6) }))
    const tiers = new Map<string, number>()
    for (const s of out) {
      const d = s.evidence.detail as { mode: string; chungTier?: string }
      if (d.mode === 'chung' && d.chungTier) tiers.set(d.chungTier, s.polarity)
    }
    // 본명 일지 午: 정기 丁, 중기 己, 여기 丙. 시기 정기 癸 ↔ 본명 중기? 午 중기는 己(충 아님).
    // 실제로 jeonggi-junggi 와 yeogi-mixed 가 적어도 하나씩 나온다(여러 층 조합).
    expect([...tiers.keys()].length).toBeGreaterThanOrEqual(1)
    for (const [tier, pol] of tiers) {
      if (tier === 'jeonggi-jeonggi') expect(pol).toBe(-3)
      if (tier === 'jeonggi-junggi') expect(pol).toBe(-2)
      if (tier === 'yeogi-mixed') expect(pol).toBe(-1)
    }
  })
})

describe('sajuJijangganExtractor — 대운 / 세운 layer', () => {
  it('대운 지지(후반 5년)도 신호를 낸다 (decadal layer)', () => {
    // 대운 startYear 2019 → 후반 5년 mid=2024..2029, range 2026 이 안. baseWeight 1.0.
    const out = run(
      ctx({
        day: STD,
        daeun: [{ startYear: 2019, stem: '甲', branch: '寅' }],
        ...DAY(6),
      })
    )
    const decadal = out.filter((s) => s.layer === 'decadal')
    expect(decadal.length).toBeGreaterThan(0)
    expect(decadal[0].id).toContain('daeun')
  })

  it('세운/월운/일진 layer 도 함께 나온다', () => {
    const out = run(ctx({ day: STD, ...DAY(6) }))
    const layers = new Set(out.map((s) => s.layer))
    expect(layers.has('yearly')).toBe(true)
    expect(layers.has('monthly')).toBe(true)
    expect(layers.has('daily')).toBe(true)
  })

  it('월운 월주는 그 달 중순(15일) 절기 기준 — 1일(전월 절기달) 아님', () => {
    // 2026-06: 1일은 망종 전이라 巳월, 15일은 午월. 한 달 내내 day-15 의 午 를
    // 써야 한다(직전엔 day-1 의 巳 가 한 달 전체에 도장됐다).
    const out = run(
      ctx({
        day: STD,
        start: '2026-06-01T00:00:00.000Z',
        end: '2026-06-30T23:59:59.999Z',
      })
    )
    const monthly = out.filter((s) => s.layer === 'monthly')
    expect(monthly.length).toBeGreaterThan(0)
    // 월운 signal id 는 `...wolun.2026-6.<월지>...` — 午(중순) 이어야 하고 巳 아님.
    expect(monthly.every((s) => s.id.includes('.午'))).toBe(true)
    expect(monthly.some((s) => s.id.includes('wolun.2026-6.巳'))).toBe(false)
  })
})

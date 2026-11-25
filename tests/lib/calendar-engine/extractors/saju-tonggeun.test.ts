import { describe, it, expect } from 'vitest'
import extractor from '@/lib/calendar-engine/extractors/saju-tonggeun'
import type { ExtractorContext, ActiveSignal } from '@/lib/calendar-engine/types'

/**
 * saju-tonggeun (통근 강약 변화) — 본명 일간 × 대운 천간 오행 관계로 강약 시프트.
 * relation × strength 모든 arm 을 대운 천간을 골라 발화시킨다.
 *
 * 일간 甲(목) 기준 대운 천간 오행:
 *   甲/乙(목)=same · 壬/癸(수)=birth-receiving(인성) · 丙/丁(화)=birth-giving(식상)
 *   戊/己(토)=controlling(재성) · 庚/辛(금)=controlled-by(관성)
 */

function ctx(
  strength: 'strong' | 'medium' | 'weak',
  daeun: Array<{ stem: string; branch: string }>,
  dayStem = '甲'
): ExtractorContext {
  const cache = (() => {
    const m = new Map<string, unknown>()
    return {
      get: <T>(k: string) => m.get(k) as T | undefined,
      set: <T>(k: string, v: T) => void m.set(k, v),
    }
  })()
  return {
    natal: {
      // 대운 창은 민용 생일 경계(periodPillars.daeunWindows) — 출생 연·월·일이 필요하다.
      input: { year: 2000, month: 1, date: 1 },
      saju: {
        pillars: { day: { heavenlyStem: { name: dayStem } } },
        strength,
        daeun: daeun.map((d, i) => ({
          startAge: i * 10,
          startYear: 2000 + i * 10,
          stem: d.stem,
          branch: d.branch,
        })),
      },
    },
    range: {
      start: '2000-01-01T00:00:00.000Z',
      end: '2100-12-31T23:59:59.999Z',
      granularity: 'day',
    },
    cache,
  } as unknown as ExtractorContext
}

function run(c: ExtractorContext): ActiveSignal[] {
  return extractor.extract(c) as ActiveSignal[]
}

function relationOf(s: ActiveSignal): string {
  return (s.evidence.detail as { relation: string }).relation
}

describe('sajuTonggeunExtractor — 메타', () => {
  it('source/kind 를 선언한다', () => {
    expect(extractor.source).toBe('saju')
    expect(extractor.kind).toBe('tonggeun-shift')
  })

  it('일간을 못 찾으면 빈 배열', () => {
    expect(run(ctx('weak', [{ stem: '甲', branch: '子' }], '없는천간'))).toEqual([])
  })

  it('대운 천간을 못 찾으면 그 대운은 스킵', () => {
    const out = run(ctx('weak', [{ stem: '잘못', branch: '子' }]))
    expect(out).toEqual([])
  })
})

describe('sajuTonggeunExtractor — relation × strength polarity arms', () => {
  it('인성(birth-receiving): 신약 +3, 신강 +1', () => {
    const weak = run(ctx('weak', [{ stem: '壬', branch: '子' }]))[0]
    expect(relationOf(weak)).toBe('birth-receiving')
    expect(weak.polarity).toBe(3)
    expect(weak.name).toContain('인성 보강')

    const strong = run(ctx('strong', [{ stem: '壬', branch: '子' }]))[0]
    expect(strong.polarity).toBe(1)
    expect(strong.name).toContain('인성 활성')
  })

  it('비겁(same): 신약 +2, 신강/medium −1', () => {
    const weak = run(ctx('weak', [{ stem: '乙', branch: '卯' }]))[0]
    expect(relationOf(weak)).toBe('same')
    expect(weak.polarity).toBe(2)

    const strong = run(ctx('strong', [{ stem: '甲', branch: '寅' }]))[0]
    expect(strong.polarity).toBe(-1)

    // NOTE: polarityForShift(same, *)는 weak→2, 그외(strong/medium)→-1 로
    // 절대 0 을 반환하지 않는다. 따라서 extract() 의
    // `if (polarity === 0 && relation === 'same') continue` 스킵 분기는
    // relation==='same' 에서는 도달 불가(dead branch). medium 도 -1 로 발화됨.
    const med = run(ctx('medium', [{ stem: '甲', branch: '寅' }]))
    expect(med.length).toBe(1)
    expect(med[0].polarity).toBe(-1)
  })

  it('식상(birth-giving): 신강 +2, 그외 −1', () => {
    const strong = run(ctx('strong', [{ stem: '丙', branch: '午' }]))[0]
    expect(relationOf(strong)).toBe('birth-giving')
    expect(strong.polarity).toBe(2)

    const weak = run(ctx('weak', [{ stem: '丁', branch: '巳' }]))[0]
    expect(weak.polarity).toBe(-1)
  })

  it('재성(controlling): 신강 +2, 그외 −2', () => {
    const strong = run(ctx('strong', [{ stem: '戊', branch: '辰' }]))[0]
    expect(relationOf(strong)).toBe('controlling')
    expect(strong.polarity).toBe(2)

    const weak = run(ctx('weak', [{ stem: '己', branch: '丑' }]))[0]
    expect(weak.polarity).toBe(-2)
  })

  it('관성(controlled-by): 신강 +1, 그외 −3', () => {
    const strong = run(ctx('strong', [{ stem: '庚', branch: '申' }]))[0]
    expect(relationOf(strong)).toBe('controlled-by')
    expect(strong.polarity).toBe(1)

    const weak = run(ctx('weak', [{ stem: '辛', branch: '酉' }]))[0]
    expect(weak.polarity).toBe(-3)
    expect(weak.name).toContain('관성 압박')
  })
})

describe('sajuTonggeunExtractor — 신호 구조 / range 필터', () => {
  it('decadal layer, weight 0.85, EN/KO 라벨, evidence 모듈', () => {
    const s = run(ctx('weak', [{ stem: '壬', branch: '子' }]))[0]
    expect(s.layer).toBe('decadal')
    expect(s.weight).toBe(0.85)
    expect(typeof s.korean).toBe('string')
    expect(typeof s.english).toBe('string')
    expect(s.english).toContain('Resource boost')
    expect(s.evidence.module).toBe('saju-tonggeun')
    expect(s.id.startsWith('saju.tonggeun-shift.')).toBe(true)
    expect(s.active.start < s.active.peak).toBe(true)
    expect(s.active.peak < s.active.end).toBe(true)
  })

  it('range 밖 대운은 제외된다', () => {
    const cache = {
      get: () => undefined,
      set: () => undefined,
    }
    const c = {
      natal: {
        input: { year: 1980, month: 6, date: 15 },
        saju: {
          pillars: { day: { heavenlyStem: { name: '甲' } } },
          strength: 'weak',
          daeun: [
            { startAge: 10, startYear: 1990, stem: '壬', branch: '子' }, // 1990-06-15~2000-06-14 → range 밖
            { startAge: 20, startYear: 2000, stem: '癸', branch: '丑' }, // 2000-06-15~2010-06-14 → range 안
          ],
        },
      },
      range: {
        start: '2001-01-01T00:00:00.000Z',
        end: '2005-12-31T23:59:59.999Z',
        granularity: 'day',
      },
      cache,
    } as unknown as ExtractorContext
    const out = run(c)
    expect(out.length).toBe(1)
    expect(out[0].id).toContain('2000')
  })

  // 재감사 TP-7 — 대운은 1/1 이 아니라 만 나이 생일(민용)에 바뀐다(daeunAge SSOT).
  it('대운 창은 시작 나이 생일에 열리고 다음 대운 생일 전날 닫힌다', () => {
    const c = {
      natal: {
        input: { year: 1990, month: 10, date: 20 },
        saju: {
          pillars: { day: { heavenlyStem: { name: '甲' } } },
          strength: 'weak',
          daeun: [
            { startAge: 26, startYear: 2016, stem: '己', branch: '丑' },
            { startAge: 36, startYear: 2026, stem: '庚', branch: '寅' },
          ],
        },
      },
      range: {
        start: '2026-05-01T00:00:00.000Z',
        end: '2026-05-01T23:59:59.999Z',
        granularity: 'day',
      },
      cache: { get: () => undefined, set: () => undefined },
    } as unknown as ExtractorContext
    const out = run(c)
    // 2026-05-01 은 만 35세 — 己丑 대운만, 庚寅(2026-10-20~)은 아직.
    expect(out.map((s) => s.id)).toEqual(['saju.tonggeun-shift.2016.己'])
    expect(out[0].active.start).toBe('2016-10-20T00:00:00.000Z')
    expect(out[0].active.end).toBe('2026-10-19T23:59:59.999Z')
    const next = run({
      ...c,
      range: { ...c.range, start: '2026-10-20T00:00:00.000Z', end: '2026-10-20T23:59:59.999Z' },
    } as ExtractorContext)
    expect(next.map((s) => s.id)).toEqual(['saju.tonggeun-shift.2026.庚'])
    expect(next[0].active.start).toBe('2026-10-20T00:00:00.000Z')
  })
})

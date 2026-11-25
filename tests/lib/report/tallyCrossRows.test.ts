/**
 * tallyCrossRows — 리포트 교차 톤 집계 단일 규칙 (plan B4, 엔진 감사 E6).
 *
 * 예전엔 도입부 문장(synthesize: karmaAxis 로 제외, neutral 미집계)과 톤 막대
 * (IntegratedReport: 카테고리 이름으로 제외, neutral 집계)가 서로 다른 규칙이라 같은
 * 리포트에서 7/6/1 과 7·5·1·2 가 함께 보였다. 이제 둘 다 tallyCrossRows 하나로 센다:
 * karmaAxis 행(공망/카르마·성장 방향)은 빼고, neutral 은 unrelated 로 센다.
 *
 * 실데이터 절은 진짜 천체력(swisseph unmock, node 환경)으로 샘플 1997-03-21 14:30 서울
 * 여성을 돌린다 — 전역 목에선 모든 차트의 행성이 같은 자리라 교차가 가짜가 된다.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const swissephAvailable = await import('swisseph').then(
  () => true,
  () => false
)

const { tallyCrossRows, synthesize } = await import('@/lib/report/natalCross')
const { buildReportContext } = await import('@/lib/report/buildReportContext')
const { buildCrossRows } = await import('@/lib/report/integratedAdapter')

type Tone = 'resonant' | 'complement' | 'tension' | 'neutral'
const v = (tone: Tone, karmaAxis?: boolean) => ({
  tone,
  reason: { ko: '가', en: 'a' },
  ...(karmaAxis ? { karmaAxis } : {}),
})

describe('tallyCrossRows — 단위', () => {
  it('톤별로 세고 karmaAxis 행은 뺀다, neutral 은 unrelated', () => {
    const t = tallyCrossRows([
      v('resonant'),
      v('resonant'),
      v('complement'),
      v('tension'),
      v('neutral'),
      v('resonant', true),
      v('tension', true),
      v('neutral', true),
    ])
    expect(t).toEqual({ same: 2, supportive: 1, twoPulls: 1, unrelated: 1, total: 5 })
  })

  it('빈 입력은 전부 0', () => {
    expect(tallyCrossRows([])).toEqual({
      same: 0,
      supportive: 0,
      twoPulls: 0,
      unrelated: 0,
      total: 0,
    })
  })
})

describe('synthesize — tallyCrossRows 와 같은 숫자', () => {
  it('counts 가 tallyCrossRows 와 같고, 상관없는 영역이 있으면 도입부에 밝힌다', () => {
    const verdicts = [
      v('resonant'),
      v('complement'),
      v('tension'),
      v('neutral'),
      v('resonant', true),
    ]
    const s = synthesize(verdicts)!
    expect(s.counts).toEqual(tallyCrossRows(verdicts))
    expect(s.text.ko).toContain('잘 맞는 1곳 · 서로 돕는 1곳 · 부딪히는 1곳 · 상관없는 1곳이에요')
    expect(s.text.en).toContain("align in 1, complement in 1, clash in 1, and 1 doesn't connect")
  })

  it('상관없는 영역이 여럿이면 복수형, 0 이면 문장을 늘리지 않는다', () => {
    const many = synthesize([v('resonant'), v('neutral'), v('neutral')])!
    expect(many.text.ko).toContain('상관없는 2곳')
    expect(many.text.en).toContain("and 2 don't connect")
    const none = synthesize([v('resonant'), v('complement'), v('tension')])!
    expect(none.text.ko).not.toContain('상관없는')
    expect(none.text.en).toContain('align in 1, complement in 1, and clash in 1.')
    expect(none.text.en).not.toContain('connect')
  })
})

const SAMPLE = {
  birthDate: '1997-03-21',
  birthTime: '14:30',
  gender: 'female' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}
const NOW = new Date('2026-11-24T00:00:00Z')

describe.skipIf(!swissephAvailable)('buildCrossRows 샘플 — 도입부와 막대가 같은 집계', () => {
  it('1997-03-21 14:30 서울 여성: 7·6·3·0 (총 16), 도입부 숫자 = tallyCrossRows', async () => {
    const ctx = await buildReportContext(SAMPLE)
    const ko = buildCrossRows(ctx, 'ko', NOW)
    const en = buildCrossRows(ctx, 'en', NOW)
    // E2–E4 이후 재생성 값 — 용신이 금(E4)이 되어 욕망 행이 사자(火)극금 tension.
    // (plan B4 의 7·6·1·1 은 E2–E4 이전 본명 입력 기준이었다.)
    const t = tallyCrossRows(en.rows)
    expect(t).toEqual({ same: 7, supportive: 6, twoPulls: 3, unrelated: 0, total: 16 })
    expect(ko.synthesis).toContain(
      `잘 맞는 ${t.same}곳 · 서로 돕는 ${t.supportive}곳 · 부딪히는 ${t.twoPulls}곳이에요`
    )
    expect(en.synthesis).toContain(
      `align in ${t.same}, complement in ${t.supportive}, and clash in ${t.twoPulls}.`
    )
    // 결핍 두 축은 어느 톤이든 karmaAxis — 집계에서 빠진다.
    const karma = en.rows.filter((r) => r.karmaAxis === true).map((r) => r.key)
    expect(karma.sort()).toEqual(['growth', 'karma'])
    expect(t.total).toBe(en.rows.length - 2)
    expect(en.rows.find((r) => r.key === 'needs')?.tone).toBe('tension')
  }, 30_000)

  it('미성년 기준 시각이면 연애·재물 행이 빠지고 총계가 그만큼 준다', async () => {
    const ctx = await buildReportContext(SAMPLE)
    const adult = buildCrossRows(ctx, 'en', NOW)
    // 같은 본명, 2005-01-01 기준이면 만 7세 → 미성년 안전 모드.
    const minor = buildCrossRows(ctx, 'en', new Date('2005-01-01T00:00:00Z'))
    const keys = minor.rows.map((r) => r.key)
    expect(keys).not.toContain('romance')
    expect(keys).not.toContain('wealth')
    const dropped = adult.rows.filter((r) => r.key === 'romance' || r.key === 'wealth')
    expect(dropped).toHaveLength(2)
    const ta = tallyCrossRows(adult.rows)
    const tm = tallyCrossRows(minor.rows)
    expect(tm.total).toBe(ta.total - dropped.filter((r) => r.karmaAxis !== true).length)
    expect(tm).toEqual({ same: 5, supportive: 6, twoPulls: 3, unrelated: 0, total: 14 })
    expect(minor.synthesis).toContain(
      `align in ${tm.same}, complement in ${tm.supportive}, and clash in ${tm.twoPulls}.`
    )
  }, 30_000)
})

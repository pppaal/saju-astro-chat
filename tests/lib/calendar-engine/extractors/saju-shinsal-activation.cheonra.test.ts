/**
 * saju-shinsal-activation — 천라지망 캘린더 활성 = 시기(일진) 지지가 본명 지지와 짝을
 * 완성하는 날 (G4 · SDR-03, CONVENTIONS §8). 戌↔亥 = 천라, 辰↔巳 = 지망.
 *   - 본명 戌 하나 → 亥 일에 활성(戌 일은 짝이 아니라 아님).
 *   - 본명에 짝(戌·亥)이 다 있으면 두 지지 날 모두.
 *   - 본명 hit(target) anchor 로는 깨우지 않는다 — 같은 날 중복 신호 없음.
 */
import { describe, it, expect } from 'vitest'
import extractor from '@/lib/calendar-engine/extractors/saju-shinsal-activation'
import type { ActiveSignal, ExtractorContext } from '@/lib/calendar-engine/types'

const BR = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
// 2026-01-06 = 庚辰 일(JDN 독립 앵커).
const branchOf = (iso: string) => {
  const n = Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.UTC(2026, 0, 6)) / 86_400_000)
  return BR[(((4 + n) % 12) + 12) % 12]
}
const P = (s: string, b: string) => ({ heavenlyStem: { name: s }, earthlyBranch: { name: b } })

function run(
  branches: [string, string, string, string | null],
  natalShinsal: Array<{ kind: string; pillars: string[]; target: string }> = []
): ActiveSignal[] {
  const ctx = {
    natal: {
      saju: {
        pillars: {
          year: P('甲', branches[0]),
          month: P('丙', branches[1]),
          day: P('乙', branches[2]),
          time: branches[3] ? P('丙', branches[3]) : null,
        },
        natalShinsal,
      },
    },
    // 24일 — 12지지가 두 번씩 돈다.
    range: { start: '2026-01-01T00:00:00.000Z', end: '2026-01-24T23:59:59.999Z' },
  } as unknown as ExtractorContext
  return extractor.extract(ctx).filter((s) => s.evidence?.shinsalName === '천라지망')
}
const dayBranches = (sigs: ActiveSignal[]) =>
  [...new Set(sigs.map((s) => branchOf(s.active.start.slice(0, 10))))].sort()

describe('천라지망 캘린더 활성 — 짝 완성 규칙', () => {
  it('natal 戌 only (1997 sample 丁丑 癸卯 壬戌 丁未) → active on 亥 days, never on 戌 days', () => {
    const sigs = run(['丑', '卯', '戌', '未'])
    expect(dayBranches(sigs)).toEqual(['亥'])
    expect(sigs).toHaveLength(2)
    for (const s of sigs) {
      expect(s.polarity).toBe(-2)
      expect(s.evidence?.pillars).toEqual(['day'])
      expect(s.evidence?.detail).toMatchObject({
        source: 'pair-completion',
        anchorBranch: '亥',
        partnerBranch: '戌',
        net: '천라',
      })
      expect(s.english).toBe('Heaven-Earth Net active today')
    }
  })

  it('natal 巳 (year, hour) → 지망 on 辰 days, anchored on both 巳 pillars', () => {
    const sigs = run(['巳', '丑', '戌', '巳'])
    // 戌 일진은 짝(亥)이 본명에 없어 아님; 亥 일진은 본명 戌 과 천라를 완성.
    expect(dayBranches(sigs)).toEqual(['亥', '辰'])
    const jimang = sigs.filter((s) => branchOf(s.active.start.slice(0, 10)) === '辰')
    for (const s of jimang) {
      expect(s.evidence?.pillars).toEqual(['time', 'year'])
      expect((s.evidence?.detail as { net: string }).net).toBe('지망')
    }
  })

  it('natal pair 戌·亥 → both 戌 and 亥 days; the natal hits are not re-anchored (one signal per day)', () => {
    const natalShinsal = [
      { kind: '천라지망', pillars: ['year'], target: '戌' },
      { kind: '천라지망', pillars: ['day'], target: '亥' },
    ]
    const sigs = run(['戌', '寅', '亥', '子'], natalShinsal)
    expect(dayBranches(sigs)).toEqual(['亥', '戌'])
    const ids = sigs.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(sigs).toHaveLength(4)
  })

  it('no 辰巳戌亥 at all → never active', () => {
    expect(run(['子', '寅', '午', '申'])).toEqual([])
  })

  it('time unknown: the missing hour pillar cannot anchor a pair', () => {
    expect(run(['子', '寅', '午', null])).toEqual([])
    expect(dayBranches(run(['子', '寅', '辰', null]))).toEqual(['巳'])
  })
})

import { describe, it, expect } from 'vitest'
import extractor from '@/lib/calendar-engine/extractors/saju-hyeongchung'
import { halfHarmonyPairs, THREE_HARMONY } from '@/lib/saju/relationTables'
import type { ActiveSignal, ExtractorContext } from '@/lib/calendar-engine/types'

/**
 * saju-hyeongchung — 일진 지지 × 본명 지지의 삼합·반합·방합이 본명 relations 정본을 따르는지
 * (G4 · SDR-02, CALCULATION_SPEC §1 · CONVENTIONS §8):
 *   - 삼합·방합 = 일진 + 본명으로 서로 다른 세 멤버가 다 모일 때만, 국 전체 해석문.
 *   - 두 지지만이면 왕지(子午卯酉) 낀 반합 쌍만 '반합' — 짝 해석문, 삼합보다 약하게.
 *   - 生-墓 쌍(申辰·亥未·寅戌·巳丑)은 합 신호 없음. 2지지 방합 없음.
 */

const BR = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
// 2026-01-06 = 庚辰 일(JDN 독립 앵커). 2026 년의 날짜 n(1-based day-of-year) 일지.
const branchOfDay = (date: Date) => {
  const n = Math.round((date.getTime() - Date.UTC(2026, 0, 6)) / 86_400_000)
  return BR[(((4 + n) % 12) + 12) % 12]
}
const dayWithBranch = (b: string) => {
  for (let n = 1; n <= 12; n++) {
    const d = new Date(Date.UTC(2026, 0, n))
    if (branchOfDay(d) === b) {
      const iso = d.toISOString().slice(0, 10)
      return { start: `${iso}T00:00:00.000Z`, end: `${iso}T23:59:59.999Z` }
    }
  }
  throw new Error(b)
}

function ctx(
  branches: [string, string, string, string | null],
  range: { start: string; end: string }
): ExtractorContext {
  const stems = ['丁', '癸', '壬', '丁']
  const p = (i: number) => ({
    heavenlyStem: { name: stems[i] },
    earthlyBranch: { name: branches[i] as string },
  })
  return {
    natal: {
      saju: {
        pillars: { year: p(0), month: p(1), day: p(2), time: branches[3] ? p(3) : null },
      },
    },
    range: { ...range, granularity: 'day' },
    cache: { get: () => undefined, set: () => undefined },
  } as unknown as ExtractorContext
}

const label = (s: ActiveSignal) => (s.evidence.detail as { kindLabel: string }).kindLabel
const harmony = (out: ActiveSignal[]) =>
  out.filter((s) => ['삼합', '반합', '방합'].includes(label(s)))

describe('saju-hyeongchung — 삼합은 국이 완성될 때만', () => {
  it('申 + 辰 natal, 子 day → one full 삼합 (申子辰) with the trio text, no 반합 duplicates', () => {
    const out = harmony(extractor.extract(ctx(['申', '辰', '丑', '午'], dayWithBranch('子'))))
    expect(out.map(label)).toEqual(['삼합'])
    const s = out[0]
    const d = s.evidence.detail as Record<string, unknown>
    expect(d.samhapGroup).toEqual(['申', '子', '辰'])
    expect(d.natalPillars).toEqual(['year', 'month'])
    expect(s.polarity).toBe(3)
    expect(s.english).toContain('Monkey, Rat, and Dragon')
  })

  it('生-墓 pair (申 natal, 辰 day) with no 子 anywhere → no harmony signal', () => {
    const out = harmony(extractor.extract(ctx(['申', '丑', '午', '卯'], dayWithBranch('辰'))))
    expect(out).toEqual([])
  })

  it('a repeated branch is one member: 亥·亥·未 natal on a 亥 day is not 亥卯未', () => {
    const out = harmony(extractor.extract(ctx(['亥', '亥', '未', '未'], dayWithBranch('亥'))))
    expect(out.filter((s) => label(s) === '삼합')).toEqual([])
  })

  it('time-unknown (three pillars): the missing hour branch cannot complete a trio', () => {
    const out = harmony(extractor.extract(ctx(['申', '丑', '午', null], dayWithBranch('子'))))
    expect(out.map(label)).toEqual(['반합'])
  })
})

describe('saju-hyeongchung — 반합은 왕지 낀 쌍만, 짝 단위 해석', () => {
  it('申 natal, 子 day → 반합 申-子 (수), +2, weaker than a full 삼합, pair-level text', () => {
    const out = harmony(extractor.extract(ctx(['申', '丑', '午', '卯'], dayWithBranch('子'))))
    expect(out.map(label)).toEqual(['반합'])
    const s = out[0]
    const d = s.evidence.detail as Record<string, unknown>
    expect(d.element).toBe('수')
    expect(d.trio).toEqual(['申', '子', '辰'])
    expect(s.polarity).toBe(2)
    expect(s.weight).toBeLessThan(0.7)
    expect(s.korean).toContain('반합')
    expect(s.english).toContain('half-trine')
    expect(s.english).not.toContain('Monkey, Rat, and Dragon')
    expect(s.english).toContain('if the Dragon joins')
    expect(s.korean).toBe(
      '원숭이·쥐의 반합 — 물 기운이 반쯤 모이는 흐름이에요. 세 번째 지지인 용까지 모여야 삼합으로 완성돼요.'
    )
    expect(/[\u4e00-\u9fff]/.test(`${s.korean}${s.english}`)).toBe(false)
  })

  it('every one of the 144 day × natal branch pairs: 반합 iff halfHarmonyPairs', () => {
    const want = new Set(halfHarmonyPairs().flatMap(({ pair: [a, b] }) => [`${a}${b}`, `${b}${a}`]))
    for (const natal of BR) {
      for (const day of BR) {
        // 한 본명 지지만(네 기둥 모두 같은 지지) — 국은 완성될 수 없다.
        const out = harmony(
          extractor.extract(ctx([natal, natal, natal, natal], dayWithBranch(day)))
        )
        const halves = out.filter((s) => label(s) === '반합')
        expect(halves.length, `${day}-${natal}`).toBe(want.has(`${day}${natal}`) ? 4 : 0)
        expect(out.filter((s) => label(s) !== '반합')).toEqual([])
      }
    }
  })
})

describe('saju-hyeongchung — 방합은 세 멤버가 다 있을 때만', () => {
  it('亥 + 丑 natal, 子 day → full 방합 亥子丑 (plus the 子丑 육합), no 2-member 방합', () => {
    const out = extractor.extract(ctx(['亥', '丑', '午', '卯'], dayWithBranch('子')))
    const bang = out.filter((s) => label(s) === '방합')
    expect(bang).toHaveLength(1)
    expect((bang[0].evidence.detail as Record<string, unknown>).banghapGroup).toEqual([
      '亥',
      '子',
      '丑',
    ])
    expect(out.some((s) => label(s) === '육합')).toBe(true)
  })

  it('子丑 육합 day without 亥 → 육합 only, never a 방합 on top', () => {
    const out = extractor.extract(ctx(['丑', '午', '卯', '酉'], dayWithBranch('子')))
    expect(out.filter((s) => label(s) === '방합')).toEqual([])
    expect(out.filter((s) => label(s) === '육합')).toHaveLength(1)
  })
})

describe('saju-hyeongchung — product sample 丁丑 癸卯 壬戌 丁未 over 2026', () => {
  const out = extractor.extract(
    ctx(['丑', '卯', '戌', '未'], {
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-12-31T23:59:59.999Z',
    })
  )
  const natal = new Set(['丑', '卯', '戌', '未'])

  it('삼합 only on 亥 days (亥 completes 亥卯未 with natal 卯·未), one per day', () => {
    const sam = out.filter((s) => label(s) === '삼합')
    const 亥days = new Set<string>()
    for (let t = Date.UTC(2026, 0, 1); t <= Date.UTC(2026, 11, 31); t += 86_400_000) {
      if (branchOfDay(new Date(t)) === '亥') 亥days.add(new Date(t).toISOString().slice(0, 10))
    }
    expect(new Set(sam.map((s) => s.active.start.slice(0, 10)))).toEqual(亥days)
    expect(sam).toHaveLength(亥days.size)
    for (const s of sam) {
      const d = s.evidence.detail as { targetBranch: string; samhapGroup: string[] }
      const others = d.samhapGroup.filter((m) => m !== d.targetBranch)
      expect(others.every((m) => natal.has(m))).toBe(true)
    }
  })

  it('no 生-墓 삼합 (寅-戌, 巳-丑) and no 방합 at all; every 반합 holds a 왕지', () => {
    expect(out.filter((s) => label(s) === '방합')).toEqual([])
    const halves = out.filter((s) => label(s) === '반합')
    expect(halves.length).toBeGreaterThan(0)
    for (const s of halves) {
      const d = s.evidence.detail as { targetBranch: string; natalBranch: string }
      const pair = `${d.targetBranch}${d.natalBranch}`
      expect(
        ['子', '午', '卯', '酉'].some((w) => pair.includes(w)),
        pair
      ).toBe(true)
      const trio = THREE_HARMONY.find(
        (t) => t.members.includes(d.targetBranch) && t.members.includes(d.natalBranch)
      )
      expect(trio, pair).toBeTruthy()
    }
  })
})

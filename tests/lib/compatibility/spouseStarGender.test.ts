// tests/lib/compatibility/spouseStarGender.test.ts
//
// 배우자성(配偶星)은 성별로 갈린다 — 남=재성(정재/편재)이 처, 여=관성(정관/편관)이 부.
// 회귀 가드: 예전엔 4개를 성별 무관하게 다 올려, 남자에게 "부성(남편성)"·여자에게
// "처성(아내성)" 이라는 모순 팩트가 LLM(상담사)에 그대로 들어갔다.

import { describe, it, expect } from 'vitest'
import { computeSajuSynastryFacts } from '@/lib/compatibility/sajuSynastryFacts'
import { formatSajuSynastry } from '@/lib/compatibility/sajuSynastryFormatter'
import { spouseStarsFor } from '@/lib/compatibility/sajuSynastryData'
import type { SajuPillarInput } from '@/lib/compatibility/sajuSynastryData'

const P = (stem: string, branch: string): SajuPillarInput => ({ stem, branch })
// A 남(일간 辛) · B 여(일간 甲) — 실측 사례.
const pillarsA = [P('乙', '亥'), P('戊', '寅'), P('辛', '未'), P('辛', '卯')]
const pillarsB = [P('庚', '午'), P('己', '丑'), P('甲', '辰'), P('己', '巳')]

describe('spouseStarsFor — 성별별 배우자성 집합(SSOT)', () => {
  it('남자는 재성만', () => {
    expect([...spouseStarsFor('male')].sort()).toEqual(['정재', '편재'])
  })
  it('여자는 관성만', () => {
    expect([...spouseStarsFor('female')].sort()).toEqual(['정관', '편관'])
  })
  it('성별 미상이면 판정 불가 — 한쪽으로 단정하지 않고 넷 다', () => {
    expect([...spouseStarsFor(undefined)].sort()).toEqual(['정관', '정재', '편관', '편재'])
  })
})

describe('computeSajuSynastryFacts — 배우자성 성별 정합', () => {
  it('성별을 넘기면 남자에게 부성 / 여자에게 처성이 붙지 않는다', () => {
    const f = computeSajuSynastryFacts({
      pillarsA,
      pillarsB,
      genderA: 'male',
      genderB: 'female',
    })
    expect(f.spouseStars.length).toBeGreaterThan(0)
    for (const s of f.spouseStars) {
      if (s.from === 'A') expect(s.role.startsWith('처성')).toBe(true)
      else expect(s.role.startsWith('부성')).toBe(true)
    }
  })

  it('남자(A)의 배우자성은 재성 계열만', () => {
    const f = computeSajuSynastryFacts({ pillarsA, pillarsB, genderA: 'male', genderB: 'female' })
    const aStars = f.spouseStars.filter((s) => s.from === 'A').map((s) => s.sibsin)
    expect(aStars.length).toBeGreaterThan(0)
    for (const s of aStars) expect(['정재', '편재']).toContain(s)
  })

  it('여자(B)의 배우자성은 관성 계열만', () => {
    const f = computeSajuSynastryFacts({ pillarsA, pillarsB, genderA: 'male', genderB: 'female' })
    const bStars = f.spouseStars.filter((s) => s.from === 'B').map((s) => s.sibsin)
    expect(bStars.length).toBeGreaterThan(0)
    for (const s of bStars) expect(['정관', '편관']).toContain(s)
  })
})

describe('formatSajuSynastry — 상담사 프롬프트도 같은 규칙', () => {
  const base = { pillarsA, pillarsB, lang: 'ko' as const }
  // 최종 stripAux 가 괄호를 지우므로 역할 라벨(처성/부성)은 프롬프트에 남지 않는다.
  // 상담사에게 실제로 전달되는 신호는 *어떤 십성이 나열되는가* 이므로 그걸 검사한다.
  const spouseLines = (out: string) =>
    out.split('\n').filter((l) => l.includes('기준') && l.includes('배우자성'))

  it('남자(A) 줄엔 재성만, 관성이 새지 않는다', () => {
    const out = formatSajuSynastry({ ...base, genderA: 'male', genderB: 'female' })
    const line = spouseLines(out).find((l) => l.startsWith('A '))
    expect(line).toBeDefined()
    expect(line).toMatch(/정재|편재/)
    expect(line).not.toMatch(/정관|편관/)
  })

  it('여자(B) 줄엔 관성만, 재성이 새지 않는다', () => {
    const out = formatSajuSynastry({ ...base, genderA: 'male', genderB: 'female' })
    const line = spouseLines(out).find((l) => l.startsWith('B '))
    expect(line).toBeDefined()
    expect(line).toMatch(/정관|편관/)
    expect(line).not.toMatch(/정재|편재/)
  })

  it('성별 미상이면 예전처럼 재성·관성이 섞인다(판정 불가 — 단정 금지)', () => {
    const out = formatSajuSynastry(base)
    const joined = spouseLines(out).join('\n')
    expect(joined).toMatch(/정재|편재/)
    expect(joined).toMatch(/정관|편관/)
  })
})

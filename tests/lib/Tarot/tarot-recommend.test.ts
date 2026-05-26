import { describe, expect, it } from 'vitest'
import { recommendSpreads } from '@/lib/tarot/tarot-recommend'

describe('recommendSpreads — depth-based routing', () => {
  it('returns at least one recommendation for any input', () => {
    expect(recommendSpreads('test', 1).length).toBeGreaterThanOrEqual(1)
    expect(recommendSpreads('', 1).length).toBeGreaterThanOrEqual(1)
  })

  it('all recommendations are in the general-insight theme', () => {
    const recs = recommendSpreads('이직할까 고민이 큽니다', 4)
    expect(recs.length).toBeGreaterThan(0)
    for (const r of recs) {
      expect(r.themeId).toBe('general-insight')
    }
  })

  it('only returns the 4 canonical spread IDs (1·3·5·10)', () => {
    const allowed = new Set(['quick-reading', 'past-present-future', 'general-cross', 'celtic-cross'])
    const recs = recommendSpreads('이직할까 어떻게 해야할지 모르겠어요', 4)
    for (const r of recs) {
      expect(allowed.has(r.spreadId), `unexpected spreadId: ${r.spreadId}`).toBe(true)
    }
  })

  it('short/casual question → 1장 (quick-reading) as primary', () => {
    expect(recommendSpreads('낼 뭐 먹어', 1)[0].spreadId).toBe('quick-reading')
    expect(recommendSpreads('짧', 1)[0].spreadId).toBe('quick-reading')
  })

  it('flow-ish medium question → 3장 (past-present-future)', () => {
    // 11-39자, 캐주얼 prefix X, life-level keyword X, decision keyword X → normal depth
    expect(recommendSpreads('요즘 일상 흐름이 어떤가', 1)[0].spreadId).toBe('past-present-future')
  })

  it('decision/career/relationship → 5장 (general-cross)', () => {
    expect(recommendSpreads('이직할까 고민이 있어요', 1)[0].spreadId).toBe('general-cross')
    expect(recommendSpreads('어떻게 풀어가면 좋을지 정말 모르겠어요', 1)[0].spreadId).toBe('general-cross')
  })

  it('life-level question → 7장 심층 리딩 (id: celtic-cross)', () => {
    expect(recommendSpreads('인생의 방향을 모르겠다', 1)[0].spreadId).toBe('celtic-cross')
    expect(recommendSpreads('내 운명이 어떻게 풀릴까', 1)[0].spreadId).toBe('celtic-cross')
  })

  it('very long question (>= 80 chars) → 7장 심층 리딩 (id: celtic-cross)', () => {
    const longQ =
      '회사 그만두고 새로운 분야로 가고 싶은데 이게 정말 맞는 결정인지 모르겠고 가족도 반대하고 돈도 부족하고 그래서 어떻게 해야 할지 정말 막막한데 한번 봐주세요'
    expect(longQ.length).toBeGreaterThanOrEqual(80)
    expect(recommendSpreads(longQ, 1)[0].spreadId).toBe('celtic-cross')
  })

  it('returns multiple results when maxResults > 1', () => {
    const recs = recommendSpreads('이직할까', 3)
    expect(recs.length).toBe(3)
    // primary 가 첫 번째여야 함
    expect(recs[0].matchScore).toBe(100)
  })

  it('each result has reason / reasonKo populated', () => {
    const recs = recommendSpreads('test', 2)
    for (const r of recs) {
      expect(r.reason.length).toBeGreaterThan(0)
      expect(r.reasonKo.length).toBeGreaterThan(0)
    }
  })
})

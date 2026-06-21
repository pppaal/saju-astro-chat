import { describe, it, expect } from 'vitest'
import {
  isAxisConverged,
  isHeavyAstro,
  isSlowBackgroundAstro,
} from '@/lib/calendar-engine/derivers/convergence-heavy'

/**
 * 회귀 가드 — Fix R3가 막은 거짓 "양쪽 수렴" 트리거.
 *
 * v2 override 활성 시 sajuAxis/astroAxis는 헤드라인 점수와 평균 정렬하려고
 * 두 축 모두 같은 delta로 시프트된다(예: raw 50/50 → shifted 90/90). 그걸
 * 그대로 isAxisConverged에 넘기면 둘 다 중립서 40 벗어나니 거짓 true가 난다.
 * 대신 sajuAxisRaw/astroAxisRaw(시프트 전 진짜 신호 강도)를 우선 사용해야
 * 한다. 이 가드가 빠지면 R3 회귀 — YearHighlightsCard / DailyFlowCard에 거짓
 * "양쪽 수렴" 뱃지가 다시 떠 사용자가 "신호 강한 날"로 오해한다.
 */
describe('isAxisConverged — uses raw axes when present (R3 regression guard)', () => {
  it('returns false when raw axes are neutral even if shifted axes look strong', () => {
    // override가 큰 시프트를 입혔지만 진짜 신호(raw)는 둘 다 중립에 가깝다.
    const sb = {
      sajuAxis: 90,
      astroAxis: 90,
      sajuAxisRaw: 50,
      astroAxisRaw: 50,
      axisAgreement: 'aligned' as const,
      finalScore: 90,
    }
    expect(isAxisConverged(sb)).toBe(false)
  })

  it('returns true when raw axes are genuinely strong on both sides', () => {
    const sb = {
      sajuAxis: 75,
      astroAxis: 80,
      sajuAxisRaw: 75,
      astroAxisRaw: 80,
      axisAgreement: 'aligned' as const,
      finalScore: 78,
    }
    expect(isAxisConverged(sb)).toBe(true)
  })

  it('falls back to shifted axes when raw fields are absent (back-compat for older cached payloads)', () => {
    // 1일치 캐시 만료 전 raw 없는 응답이 떠도 fallback 일관됨.
    const sb = {
      sajuAxis: 75,
      astroAxis: 80,
      axisAgreement: 'aligned' as const,
      finalScore: 78,
    } as Parameters<typeof isAxisConverged>[0]
    expect(isAxisConverged(sb)).toBe(true)
  })

  it('returns false for null/undefined breakdown', () => {
    expect(isAxisConverged(null)).toBe(false)
    expect(isAxisConverged(undefined)).toBe(false)
  })

  it('returns false when only one axis is strong', () => {
    const sb = {
      sajuAxis: 75,
      astroAxis: 55,
      sajuAxisRaw: 75,
      astroAxisRaw: 55,
      axisAgreement: 'mixed' as const,
      finalScore: 65,
    }
    expect(isAxisConverged(sb)).toBe(false)
  })
})

/**
 * Heavy 분류는 트랜짓 행성을 *구조화된* evidence.planets[0]에서 읽어야 한다 —
 * 이름 문자열 토큰 파싱은 현지화/포맷 변형(예: 한글 표기, 재포맷)에 취약해서
 * 진짜 느린 transit 을 조용히 non-heavy 로 강등시킬 수 있다.
 */
describe('isHeavyAstro / isSlowBackgroundAstro — structured evidence over name parsing', () => {
  it('느린 행성을 evidence.planets[0]로 판정 (현지화된 name 이라도)', () => {
    const localizedName = {
      source: 'astro',
      kind: 'transit',
      name: '토성 □ 태양', // 한글 — leadToken 파싱이면 SLOW_PLANETS 미스
      evidence: { planets: ['Saturn', 'Sun'] },
    }
    expect(isHeavyAstro(localizedName)).toBe(true)
    expect(isSlowBackgroundAstro(localizedName)).toBe(true)
  })

  it('빠른 행성은 evidence 로 non-heavy', () => {
    const fast = {
      source: 'astro',
      kind: 'transit',
      name: '화성 □ 태양',
      evidence: { planets: ['Mars', 'Sun'] },
    }
    expect(isHeavyAstro(fast)).toBe(false)
    expect(isSlowBackgroundAstro(fast)).toBe(false)
  })

  it('교점(True/North Node)도 배경으로 판정', () => {
    const node = {
      source: 'astro',
      kind: 'transit',
      name: 'reformatted node label',
      evidence: { planets: ['True', 'Moon'] },
    }
    expect(isHeavyAstro(node)).toBe(true)
    expect(isSlowBackgroundAstro(node)).toBe(true)
  })

  it('evidence 없으면 name 토큰으로 폴백 (영문 라벨 호환)', () => {
    const noEvidence = {
      source: 'astro',
      kind: 'transit',
      name: 'Jupiter □ Moon',
    }
    expect(isHeavyAstro(noEvidence)).toBe(true)
    expect(isSlowBackgroundAstro(noEvidence)).toBe(true)
  })
})

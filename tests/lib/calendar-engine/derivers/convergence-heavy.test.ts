import { describe, it, expect } from 'vitest'
import {
  isHeavyAstro,
  isSlowBackgroundAstro,
} from '@/lib/calendar-engine/derivers/convergence-heavy'

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

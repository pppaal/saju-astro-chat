/**
 * evalNeeds 전수 행렬 — 용신 5 × 달 별자리 12 (plan B4 #9, 엔진 감사 E6).
 *
 * 예전 evalNeeds 는 '달이 용신을 생/극' 두 방향만 보고, 반대 방향(용신이 달을 생/극)은
 * 전부 'neutral'(상관없음)로 떨어뜨렸다 — 목(필요)×사자(火) 같은 상생 쌍이 '상관없음'.
 * 이제 다른 오행 축(elementVerdict)과 같은 족이다: 같음 → resonant, 생(어느 방향이든) →
 * complement, 극(어느 방향이든) → tension. 기준표는 평가기와 독립으로 여기서 다시 쓴다.
 */
import { describe, it, expect } from 'vitest'
import { evalNeeds } from '@/lib/report/natalCross'

const HANGUL = /[가-힣]/

const GEN: Record<string, string> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
}
const CTL: Record<string, string> = {
  wood: 'earth',
  fire: 'metal',
  earth: 'water',
  metal: 'wood',
  water: 'fire',
}
const family = (a: string, b: string) =>
  a === b
    ? 'resonant'
    : GEN[a] === b || GEN[b] === a
      ? 'complement'
      : CTL[a] === b || CTL[b] === a
        ? 'tension'
        : 'neutral'

const NEEDS: Record<string, string> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}
// 별자리 → 사주 오행 (air → 木 근사, natalCrossShared.signToSajuElement 계약).
const MOON: Record<string, string> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'wood',
  Libra: 'wood',
  Aquarius: 'wood',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
}

describe('evalNeeds — 용신 5 × 달 12 전수', () => {
  it('어느 칸도 neutral 이 아니고, 톤은 오행 생극 족을 따른다', () => {
    const bad: string[] = []
    for (const [needKo, need] of Object.entries(NEEDS)) {
      for (const [sign, moon] of Object.entries(MOON)) {
        const v = evalNeeds(needKo, sign)
        const want = family(need, moon)
        if (!v || v.tone !== want) bad.push(`${needKo}×${sign}: ${v?.tone} (want ${want})`)
        if (v?.tone === 'neutral') bad.push(`${needKo}×${sign}: neutral`)
      }
    }
    expect(bad).toEqual([])
  })

  it('새 두 갈래(필요→끌림 생·극)도 ko/en 문구 짝이 있고 EN 에 한글이 없다', () => {
    for (const [needKo] of Object.entries(NEEDS)) {
      for (const sign of Object.keys(MOON)) {
        const v = evalNeeds(needKo, sign)!
        expect(v.reason.ko.length).toBeGreaterThan(40)
        expect(v.reason.en.length).toBeGreaterThan(40)
        expect(HANGUL.test(v.reason.en)).toBe(false)
      }
    }
  })

  it("evalNeeds('목','Leo') 는 complement — 목생화 (예전엔 neutral)", () => {
    const v = evalNeeds('목', 'Leo')!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('자연스럽게 키워줘요')
  })

  it("evalNeeds('수','Aries') 는 tension — 수극화 (예전엔 neutral)", () => {
    expect(evalNeeds('수', 'Aries')!.tone).toBe('tension')
  })

  it('영문 용신 키도 같은 판정', () => {
    expect(evalNeeds('wood', 'Leo')!.tone).toBe('complement')
    expect(evalNeeds('water', 'Leo')!.tone).toBe('tension')
  })
})

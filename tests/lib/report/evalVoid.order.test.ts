/**
 * evalVoid 순서 불변성 — 공망 6쌍 × 사우스노드 12 별자리 (엔진 감사 X9, plan B4 #10).
 *
 * 공망(旬空)은 지지 한 쌍이고 6쌍 중 4쌍(戌亥·午未·辰巳·子丑)은 두 오행에 걸친다.
 * 예전 evalVoid 는 첫 지지만 봐 ['戌','亥'] 와 ['亥','戌'] 가 갈렸다. 이제 공망 오행
 * 집합 = {두 지지의 본기 오행}, 사우스노드 오행이 그 안에 들면 resonant, 아니면 neutral,
 * 그리고 모든 반환에 karmaAxis. 판정과 문구 모두 배열 순서와 무관해야 한다.
 */
import { describe, it, expect } from 'vitest'
import { evalVoid } from '@/lib/report/natalCross'

const BRANCH_EL: Record<string, string> = {
  子: 'water',
  丑: 'earth',
  寅: 'wood',
  卯: 'wood',
  辰: 'earth',
  巳: 'fire',
  午: 'fire',
  未: 'earth',
  申: 'metal',
  酉: 'metal',
  戌: 'earth',
  亥: 'water',
}
// 旬空 6쌍 (甲子旬 戌亥 … 甲寅旬 子丑).
const VOID_PAIRS: Array<[string, string]> = [
  ['戌', '亥'],
  ['申', '酉'],
  ['午', '未'],
  ['辰', '巳'],
  ['寅', '卯'],
  ['子', '丑'],
]
// 별자리 → 사주 오행 (air → 木 근사, signToSajuElement 계약).
const SIGN_EL: Record<string, string> = {
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

describe('evalVoid — 공망 두 지지 모두 본다', () => {
  it("evalVoid(['戌','亥'],'Cancer') 와 evalVoid(['亥','戌'],'Cancer') 는 둘 다 resonant + karmaAxis", () => {
    for (const pair of [
      ['戌', '亥'],
      ['亥', '戌'],
    ]) {
      const v = evalVoid(pair, 'Cancer')!
      expect(v.tone).toBe('resonant')
      expect(v.karmaAxis).toBe(true)
    }
  })

  it('6쌍 × 12 별자리: 판정·문구가 순서와 무관하고, 집합 규칙을 따르며, 항상 karmaAxis', () => {
    const bad: string[] = []
    for (const pair of VOID_PAIRS) {
      const set = new Set(pair.map((b) => BRANCH_EL[b]))
      for (const [sign, el] of Object.entries(SIGN_EL)) {
        const a = evalVoid(pair, sign)
        const b = evalVoid([...pair].reverse(), sign)
        const want = set.has(el) ? 'resonant' : 'neutral'
        if (JSON.stringify(a) !== JSON.stringify(b))
          bad.push(`${pair.join('')} ${sign}: order-dependent`)
        if (a?.tone !== want) bad.push(`${pair.join('')} ${sign}: ${a?.tone} (want ${want})`)
        if (a?.karmaAxis !== true) bad.push(`${pair.join('')} ${sign}: karmaAxis=${a?.karmaAxis}`)
      }
    }
    expect(bad).toEqual([])
  })

  it('4쌍은 두 오행에 걸친다 — 두 번째 지지 오행 일치도 resonant', () => {
    const twoEl = VOID_PAIRS.filter(([x, y]) => BRANCH_EL[x] !== BRANCH_EL[y])
    expect(twoEl.map((p) => p.join(''))).toEqual(['戌亥', '午未', '辰巳', '子丑'])
    // 첫 지지와 다른 오행의 별자리만 골라 resonant 확인 (예전엔 neutral 이던 24칸).
    let flipped = 0
    for (const pair of twoEl) {
      for (const [sign, el] of Object.entries(SIGN_EL)) {
        if (el === BRANCH_EL[pair[1]] && el !== BRANCH_EL[pair[0]]) {
          expect(evalVoid(pair, sign)!.tone).toBe('resonant')
          flipped++
        }
      }
    }
    expect(flipped).toBe(12)
  })
})

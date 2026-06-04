/**
 * 형(刑) 판정 단일 소스 골든 테스트.
 *
 * destiny counselorContext 와 compat sajuSynastryFormatter 가 공유하는
 * @/lib/saju/hyeong 의 보정 교리를 고정한다. 핵심 회귀 방지 포인트:
 *   - 삼형 세트(寅巳申·丑戌未) 중 충 페어(寅申·丑未)는 형이 아니다.
 *   - 자형은 辰/午/酉/亥 4지만 (子子·寅寅 등은 형 아님).
 *   - 子卯 상형은 형.
 * 엔진(relations.ts)이 trio 의 임의 두 지지를 형으로 잡던 버그가 표시
 * 계층으로 다시 새지 않도록 이 단언들이 지킨다.
 */

import { isHyeong, HYEONG_PAIR_TRIO, SELF_HYEONG, BRANCH_HYEONG_PAIR } from '@/lib/saju/hyeong'

describe('isHyeong — 형(刑) 단일 교리', () => {
  describe('삼형 세트의 실제 형 쌍 (대칭)', () => {
    const realPairs: Array<[string, string]> = [
      ['寅', '巳'],
      ['巳', '申'],
      ['丑', '戌'],
      ['戌', '未'],
    ]
    for (const [a, b] of realPairs) {
      it(`${a}${b} 는 형이다 (양방향)`, () => {
        expect(isHyeong(a, b)).toBe(true)
        expect(isHyeong(b, a)).toBe(true)
      })
    }
  })

  describe('삼형 세트의 충 페어는 형이 아니다 (핵심 회귀 방지)', () => {
    it('寅申 은 충이지 형이 아니다', () => {
      expect(isHyeong('寅', '申')).toBe(false)
      expect(isHyeong('申', '寅')).toBe(false)
    })
    it('丑未 는 충이지 형이 아니다', () => {
      expect(isHyeong('丑', '未')).toBe(false)
      expect(isHyeong('未', '丑')).toBe(false)
    })
  })

  describe('자형(自刑) — 표준 4지만', () => {
    for (const b of ['辰', '午', '酉', '亥']) {
      it(`${b}${b} 는 자형이다`, () => {
        expect(isHyeong(b, b)).toBe(true)
      })
    }
    for (const b of ['子', '丑', '寅', '卯', '巳', '未', '申', '戌']) {
      it(`${b}${b} 는 자형이 아니다`, () => {
        expect(isHyeong(b, b)).toBe(false)
      })
    }
  })

  describe('상형(相刑) 子卯', () => {
    it('子卯 는 형이다 (양방향)', () => {
      expect(isHyeong('子', '卯')).toBe(true)
      expect(isHyeong('卯', '子')).toBe(true)
    })
  })

  describe('무관한 쌍은 형이 아니다', () => {
    it('子午 (충) / 寅卯 (인접) 등은 형 아님', () => {
      expect(isHyeong('子', '午')).toBe(false)
      expect(isHyeong('寅', '卯')).toBe(false)
      expect(isHyeong('巳', '酉')).toBe(false)
    })
  })

  describe('교리 상수 무결성', () => {
    it('HYEONG_PAIR_TRIO 는 충 페어를 포함하지 않는다', () => {
      expect(HYEONG_PAIR_TRIO.has('寅申')).toBe(false)
      expect(HYEONG_PAIR_TRIO.has('申寅')).toBe(false)
      expect(HYEONG_PAIR_TRIO.has('丑未')).toBe(false)
      expect(HYEONG_PAIR_TRIO.has('未丑')).toBe(false)
    })
    it('SELF_HYEONG 는 정확히 4지', () => {
      expect([...SELF_HYEONG].sort()).toEqual(['午', '辰', '酉', '亥'].sort())
    })
    it('BRANCH_HYEONG_PAIR 는 子卯 상형만', () => {
      expect(BRANCH_HYEONG_PAIR['子']).toBe('卯')
      expect(BRANCH_HYEONG_PAIR['卯']).toBe('子')
      expect(Object.keys(BRANCH_HYEONG_PAIR).sort()).toEqual(['卯', '子'].sort())
    })
  })
})

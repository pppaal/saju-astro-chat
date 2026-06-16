/**
 * koStructuralLabels — KO LLM 컨텍스트의 영어 구조 태그/전문용어를 한글로 치환.
 * 데이터(궁합 route / 운명 context)와 시스템 프롬프트가 같은 매핑을 공유하므로
 * 라벨이 한 쌍으로 유지된다. 유지 코드(A/B/Y/M/D/H)는 건드리지 않는다.
 */
import { describe, it, expect } from 'vitest'
import { koStructuralLabels } from '@/lib/llm/koStructuralLabels'

describe('koStructuralLabels', () => {
  it('translates structural tags and jargon to Korean', () => {
    const cases: Array<[string, string]> = [
      ['[CRITICAL]', '[핵심]'],
      ['[IMPORTANT]', '[중요]'],
      ['[NOTE]', '[참고]'],
      ['cross', '교차'],
      ['Composite', '합성차트'],
      ['entity', '관계체'],
      ['House overlay', '하우스 중첩'],
      ['midpoint', '중점'],
      ['Lord', '주성'],
      ['SR', '솔라리턴'],
      ['detriment', '손상'],
      ['domicile', '본궁'],
      ['orb', '오차'],
      ['[C]', '[합성]'],
      ['(t)', '(현재)'],
      ['Sun', '태양'],
      ['Moon', '달'],
      ['timeUnknown=false', '시간미상=거짓'],
      ['cityUnknown=true', '도시미상=참'],
      ['[Meta]', '[메타]'],
      ['self', '본인'],
    ]
    for (const [input, expected] of cases) {
      expect(koStructuralLabels(input), input).toBe(expected)
    }
  })

  it('leaves kept structural codes (A/B/Y/M/D/H) and hanja/numbers untouched', () => {
    const s = 'A Y지 甲 · B D지 午 7H 32세'
    expect(koStructuralLabels(s)).toBe(s)
  })

  it('produces no leftover target English words on a realistic line', () => {
    const line =
      '== 시너스트리 (사주 cross) == [CRITICAL] A Venus House overlay Composite entity Lord orb (t)'
    const out = koStructuralLabels(line)
    for (const w of ['cross', 'CRITICAL', 'House', 'overlay', 'Composite', 'entity', 'Lord', 'orb'])
      expect(out.includes(w), `still has ${w}`).toBe(false)
  })
})

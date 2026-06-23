/**
 * DetailedCardItem.arePropsEqual — 스트리밍 리렌더 메모 비교 회귀 테스트.
 *
 * AI 해석 스트리밍 중 부모가 매 틱 새 card_insights 객체를 만든다. 이 비교가
 * (1) 텍스트가 안 바뀌면 skip 해 렉을 없애고, (2) 보이는 값이 바뀌면 반드시
 * 리렌더해 "글자가 안 따라오는" 버그를 막는지 잠근다. 둘 중 하나라도 깨지면
 * 유료 결과 화면이 렉이거나 멈춘 것처럼 보이므로 회귀를 막는다.
 */
import { describe, it, expect } from 'vitest'
import { arePropsEqual } from '@/app/tarot/[categoryName]/[spreadId]/components/ResultsView/DetailedCardItem'
import type { DrawnCard } from '@/lib/tarot/tarot.types'

const drawn = { card: { id: 1 } } as unknown as DrawnCard
const translate = (_k: string, f: string) => f

// 공통 베이스 props — 테스트마다 한 값만 바꿔 비교.
function base() {
  return {
    drawnCard: drawn,
    index: 0,
    positionTitle: '지금 마음',
    positionMeaning: undefined,
    cardInsight: {
      position: '지금 마음',
      card_name: 'A',
      is_reversed: false,
      interpretation: '안녕',
    },
    language: 'ko',
    selectedDeckStyle: 'celestial' as const,
    translate,
    aiPending: true,
  }
}

describe('DetailedCardItem.arePropsEqual', () => {
  it('모든 보이는 값이 같으면 skip(true) — cardInsight 객체가 새로 만들어져도', () => {
    const prev = base()
    const next = {
      ...base(),
      // 매 틱 새 객체지만 텍스트는 동일 → 리렌더 안 함이 핵심.
      cardInsight: {
        position: '지금 마음',
        card_name: 'A',
        is_reversed: false,
        interpretation: '안녕',
      },
    }
    expect(arePropsEqual(prev, next)).toBe(true)
  })

  it('해석 텍스트가 바뀌면 반드시 리렌더(false)', () => {
    const prev = base()
    const next = {
      ...base(),
      cardInsight: { ...base().cardInsight, interpretation: '안녕하세요 더' },
    }
    expect(arePropsEqual(prev, next)).toBe(false)
  })

  it('aiPending true→false(완료)면 리렌더(false) — 마지막 문장 강조가 바뀜', () => {
    expect(arePropsEqual(base(), { ...base(), aiPending: false })).toBe(false)
  })

  it('자리 라벨(positionTitle)이 바뀌면 리렌더(false)', () => {
    expect(arePropsEqual(base(), { ...base(), positionTitle: '상대 반응' })).toBe(false)
  })

  it('언어/덱/카드/인덱스가 바뀌면 리렌더(false)', () => {
    expect(arePropsEqual(base(), { ...base(), language: 'en' })).toBe(false)
    expect(arePropsEqual(base(), { ...base(), selectedDeckStyle: 'classic' as const })).toBe(false)
    expect(
      arePropsEqual(base(), { ...base(), drawnCard: { card: { id: 2 } } as unknown as DrawnCard })
    ).toBe(false)
    expect(arePropsEqual(base(), { ...base(), index: 1 })).toBe(false)
  })

  it('translate 함수 identity 가 바뀌어도 출력은 언어에만 의존 → skip(true)', () => {
    expect(arePropsEqual(base(), { ...base(), translate: (_k, f) => f })).toBe(true)
  })

  it('빈 해석(undefined cardInsight)끼리는 skip(true)', () => {
    const a = { ...base(), cardInsight: undefined }
    const b = { ...base(), cardInsight: undefined }
    expect(arePropsEqual(a, b)).toBe(true)
  })
})

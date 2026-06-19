// src/lib/tarot/signatureCard.ts
//
// "지금 나를 닮은 카드" — 사용자가 방금 뽑은 스프레드에서 가장 그 사람을
// 대표하는 한 장을 결정적으로 고른다. 별도 진단/LLM 없이, 이미 뽑은 카드와
// 기존 카드 데이터(nameKo·keywordsKo)만으로 정체성 한 컷을 만든다.
//
// 선택 규칙(결정적 — 같은 뽑기면 항상 같은 카드):
//  1) 메이저 아르카나 우선(원형성이 강해 "유형"으로 읽기 좋음)
//  2) 정방향 우선(왜곡 없는 본형)
//  3) 가장 먼저 뽑은 위치(보통 '핵심/자기' 자리) 우선

import type { DrawnCard } from './tarot.types'

export function pickSignatureCard(cards: DrawnCard[] | undefined | null): DrawnCard | null {
  if (!cards || cards.length === 0) return null
  let pool = cards.filter((c) => c.card.arcana === 'major')
  if (pool.length === 0) pool = cards
  const upright = pool.filter((c) => !c.isReversed)
  if (upright.length > 0) pool = upright
  return pool[0]
}

/** 카드 본질 키워드 한 줄 — 정/역 반영. 예: "고독 · 성찰 · 내면의 빛". */
export function signatureKeywords(dc: DrawnCard, isKo: boolean, max = 3): string {
  const m = dc.isReversed ? dc.card.reversed : dc.card.upright
  const kws = (isKo ? m.keywordsKo || m.keywords : m.keywords) || []
  return kws.slice(0, max).join(' · ')
}

/** 표시용 카드 이름(아키타입명). */
export function signatureName(dc: DrawnCard, isKo: boolean): string {
  return isKo ? dc.card.nameKo || dc.card.name : dc.card.name
}

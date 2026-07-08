// 타로 카드 의미 사전(/tarot/cards) 페이지용 헬퍼.
//
// 프로그램매틱 SEO 표면 — 덱 데이터(78장 정·역방향 의미 ko/en)를 슬러그 기반
// 콘텐츠 페이지로 노출한다. "the fool meaning", "타로 바보 카드" 류의 롱테일
// 검색 의도를 받는 상시 자산.
//
// 서버 전용: 전체 덱은 의미 전문 포함 ~400KB 라 클라이언트 import 금지
// (경량 경로는 cardNameIndex.ts 참조 — 같은 이유로 분리돼 있음).

import { tarotDeck, type Card } from './data'
import type { Suit } from './tarot.types'

/** 'The Fool' → 'the-fool', 'Ace of Cups' → 'ace-of-cups' */
export function cardSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const cardsBySlug = new Map<string, Card>(tarotDeck.map((c) => [cardSlug(c.name), c]))

export const ALL_CARD_SLUGS: readonly string[] = [...cardsBySlug.keys()]

export function getCardBySlug(slug: string): Card | null {
  return cardsBySlug.get(slug) ?? null
}

export const SUIT_ORDER: readonly Suit[] = ['major', 'wands', 'cups', 'swords', 'pentacles']

export const SUIT_LABELS: Record<Suit, { ko: string; en: string }> = {
  major: { ko: '메이저 아르카나', en: 'Major Arcana' },
  wands: { ko: '완드(지팡이)', en: 'Suit of Wands' },
  cups: { ko: '컵(성배)', en: 'Suit of Cups' },
  swords: { ko: '소드(검)', en: 'Suit of Swords' },
  pentacles: { ko: '펜타클(동전)', en: 'Suit of Pentacles' },
}

export function cardsOfSuit(suit: Suit): Card[] {
  return tarotDeck.filter((c) => c.suit === suit)
}

// 덱 순서(id) 기준 이전/다음 — 상세 페이지 하단 내부 링크 메시.
// 크롤러가 어느 카드로 들어와도 78장을 전부 타고 다닐 수 있게 한다.
export function neighborCards(card: Card): { prev: Card; next: Card } {
  const idx = tarotDeck.findIndex((c) => c.id === card.id)
  const prev = tarotDeck[(idx - 1 + tarotDeck.length) % tarotDeck.length]
  const next = tarotDeck[(idx + 1) % tarotDeck.length]
  return { prev, next }
}

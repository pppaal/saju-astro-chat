'use client'

// 클래리파이어 카드 — 상담 대화 중 한 장을 즉석에서 더 뽑아 직전 흐름에
// 보충 단서를 더한다. 운명상담사 / 궁합상담사 / 타로 followup 셋 다 동일
// 헬퍼를 쓴다. LLM 측 별도 엔드포인트 없이, 카드를 클라이언트가 뽑고
// 결과를 user 메시지(또는 systemHint)로 기존 채팅에 흘려보내는 방식이라
// 인프라 변경 없이 동작.
//
// 역방향 확률은 30% — 다른 타로 흐름과 동일 (50% 는 부정적 카드 비중
// 과해 부담된다는 피드백 반영, /api/tarot/route.ts 등과 통일).

import tarotDeck from '@/lib/tarot/data'

export interface ClarifierCard {
  name: string
  nameKo?: string
  image: string
  isReversed: boolean
}

const REVERSED_PROBABILITY = 0.3

export function drawClarifierCard(): ClarifierCard {
  const idx = Math.floor(Math.random() * tarotDeck.length)
  const card = tarotDeck[idx]
  return {
    name: card.name,
    nameKo: card.nameKo,
    image: card.image,
    isReversed: Math.random() < REVERSED_PROBABILITY,
  }
}

// 채팅 사용자 메시지로 보낼 텍스트 — 카드 이름·방향 + 카드 그림(markdown
// 이미지). MarkdownMessage 의 img 컴포넌트가 채팅 버블 안에 카드를 그려
// 사용자가 어떤 카드가 떴는지 한눈에 본다. AI 지시문은 realtime route
// 시스템 프롬프트가 "🃏 보충 카드 패턴 감지 시 같은 톤으로 한 단락
// 보충 해석" 으로 처리하므로 사용자 버블엔 따로 안 넣는다.
export function buildClarifierUserMessage(card: ClarifierCard, language: 'ko' | 'en'): string {
  const isKo = language === 'ko'
  const displayName = isKo && card.nameKo ? card.nameKo : card.name
  const reversedTag = card.isReversed ? (isKo ? ' (역방향)' : ' (reversed)') : ''
  const header = isKo
    ? `🃏 보충 카드 한 장을 더 뽑았어요: **${displayName}${reversedTag}**`
    : `🃏 One more clarifier card drawn: **${displayName}${reversedTag}**`

  return `${header}\n\n![${displayName}](${card.image})`
}

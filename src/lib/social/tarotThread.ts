// src/lib/social/tarotThread.ts
//
// "타로 공유 결과"를 만들어 Threads 에 올릴 게시물을 조립한다.
//
// 흐름: 슬롯(아침/오후/저녁)별로 카드를 결정론적으로 뽑고(날짜+슬롯 시드) →
// 실제 공유 링크(/r/{token}) 를 생성(createShareLink) → 그 링크를 CTA 로 박은
// Threads 캡션(후크 + 전체 해석 링크 + 무료 퍼널 /free + 해시태그)을 만든다.
//
// 발행은 cron(/api/cron/threads-tarot)이 threadsAdapter 로 수행. 카드 추첨은
// 결정론(같은 날·같은 슬롯이면 같은 카드)이라 중복 가드/재현이 쉽다. 공유
// 링크 토큰만 비결정론(랜덤) — 그건 계산이 아니라 I/O 라 무방.

import { createHash } from 'crypto'
import { tarotDeck } from '@/lib/tarot/data'
import { TAROT_REVERSED_BYTE_THRESHOLD } from '@/lib/tarot/reversedProbability'
import type { Card } from '@/lib/tarot/tarot.types'
import { createShareLink, siteBaseUrl, type TarotShareLinkPayload } from '@/lib/tarot/shareLink'
import { todayKeyKST } from './generateDrafts'

export type ThreadSlot = 'morning' | 'afternoon' | 'evening'

export function isThreadSlot(v: unknown): v is ThreadSlot {
  return v === 'morning' || v === 'afternoon' || v === 'evening'
}

/** KST 시각대로 슬롯 판정 — 스케줄러가 정시보다 늦게 떠도 같은 버킷에 든다. */
export function slotFromKst(now: Date = new Date()): ThreadSlot {
  const kstHour = (now.getUTCHours() + 9) % 24
  if (kstHour >= 5 && kstHour < 12) return 'morning'
  if (kstHour >= 12 && kstHour < 18) return 'afternoon'
  return 'evening'
}

export interface TarotThreadPost {
  slot: ThreadSlot
  locale: 'ko' | 'en'
  cardName: string
  isReversed: boolean
  /** Threads 캡션(공유 링크 + CTA 포함). 해시태그는 별도. */
  caption: string
  hashtags: string[]
  /** 카드 이미지 절대 URL — Threads IMAGE 게시용. */
  imageUrl?: string
  /** 생성된 공유 결과 공개 URL(/r/{token}). */
  shareUrl: string
}

// 날짜+슬롯 시드로 카드 1장 — 데일리 타로/소셜 초안과 같은 산식.
function drawSlotCard(dateKey: string, slot: ThreadSlot): { card: Card; isReversed: boolean } {
  const h = createHash('sha256').update(`threads:${dateKey}:${slot}`).digest()
  const idx = h.readUInt32BE(0) % tarotDeck.length
  const isReversed = h[4] < TAROT_REVERSED_BYTE_THRESHOLD
  return { card: tarotDeck[idx], isReversed }
}

function absoluteImageUrl(cardImage: string): string | undefined {
  if (!cardImage) return undefined
  if (/^https?:\/\//.test(cardImage)) return cardImage
  return `${siteBaseUrl()}${cardImage.startsWith('/') ? '' : '/'}${cardImage}`
}

const GREETING: Record<ThreadSlot, { ko: string; en: string }> = {
  morning: { ko: '오늘 하루를 여는 한 장', en: 'A card to open your day' },
  afternoon: { ko: '오후의 흐름을 짚는 한 장', en: 'A card for your afternoon' },
  evening: { ko: '하루를 돌아보는 한 장', en: 'A card to close your day' },
}

const HASHTAGS: Record<'ko' | 'en', string[]> = {
  ko: ['#오늘의타로', '#타로', '#타로카드', '#데일리타로', '#사주', '#운세'],
  en: ['#tarot', '#tarotcard', '#dailytarot', '#oracle', '#astrology', '#fortune'],
}

// 한 줄 후크 — 카드 키워드를 섞어 슬롯마다 다른 느낌. 공개 페이지/OG 의 주인공.
function buildHook(
  locale: 'ko' | 'en',
  cardName: string,
  isReversed: boolean,
  keywords: string[]
): string {
  const kw = keywords.slice(0, 3)
  const orient = isReversed ? (locale === 'ko' ? '역방향' : 'reversed') : ''
  const label = orient ? `${cardName} · ${orient}` : cardName
  if (locale === 'ko') {
    const kwLine = kw.length
      ? `오늘의 키워드는 '${kw.join(' · ')}'.`
      : '오늘의 기운을 살짝 들여다봐요.'
    return `${label} — ${kwLine}`
  }
  const kwLine = kw.length ? `Today's keywords: ${kw.join(' · ')}.` : "A glimpse of today's flow."
  return `${label} — ${kwLine}`
}

function buildCaption(
  locale: 'ko' | 'en',
  slot: ThreadSlot,
  hook: string,
  shareUrl: string
): string {
  const base = siteBaseUrl()
  const greeting = GREETING[slot][locale]
  if (locale === 'ko') {
    return [
      `🔮 ${greeting}`,
      '',
      hook,
      '',
      `🔗 전체 해석 보기 → ${shareUrl}`,
      `✨ 무료로 내 카드 뽑기 → ${base}/free`,
    ].join('\n')
  }
  return [
    `🔮 ${greeting}`,
    '',
    hook,
    '',
    `🔗 Read the full card → ${shareUrl}`,
    `✨ Pull your own, free → ${base}/free`,
  ].join('\n')
}

/**
 * 슬롯·로케일에 맞는 타로 공유 결과를 만들고 Threads 게시물을 조립한다.
 * 공유 링크 저장 실패 시 null(발행할 게 없음).
 */
export async function buildTarotThreadPost(
  slot: ThreadSlot,
  locale: 'ko' | 'en' = 'ko',
  now: Date = new Date()
): Promise<TarotThreadPost | null> {
  const dateKey = todayKeyKST(now)
  const { card, isReversed } = drawSlotCard(dateKey, slot)
  const meaning = isReversed ? card.reversed : card.upright
  const cardName = locale === 'ko' ? card.nameKo || card.name : card.name
  const keywords =
    locale === 'ko' ? meaning.keywordsKo || meaning.keywords || [] : meaning.keywords || []
  const meaningText = locale === 'ko' ? meaning.meaningKo || meaning.meaning : meaning.meaning

  const hook = buildHook(locale, cardName, isReversed, keywords)

  // 실제 공유 결과 생성 — /r/{token} 공개 페이지(+동적 OG)로 이어진다.
  const payload: TarotShareLinkPayload = {
    v: 1,
    kind: 'tarot',
    isKo: locale === 'ko',
    question: GREETING[slot][locale],
    spreadTitle: locale === 'ko' ? '오늘의 한 장' : 'Card of the moment',
    cards: [{ name: cardName, image: card.image, isReversed }],
    keyMessage: hook,
    body: meaningText,
  }
  const token = await createShareLink(payload)
  if (!token) return null

  const shareUrl = `${siteBaseUrl()}/r/${token}`

  return {
    slot,
    locale,
    cardName,
    isReversed,
    caption: buildCaption(locale, slot, hook, shareUrl),
    hashtags: HASHTAGS[locale],
    imageUrl: absoluteImageUrl(card.image),
    shareUrl,
  }
}

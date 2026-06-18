// src/lib/tarot/sharedReading.ts
//
// 공개 공유 리딩 조회 — /r/[token] 공개 페이지와 그 동적 OG 이미지가 같은
// 정규화 형태를 쓰도록 공통화. shareToken 으로만 조회하며(추측 불가 토큰),
// 토큰이 없거나 컬럼이 아직 없는 환경(P2022)이면 null 을 돌려준다.
//
// 서버 전용 (prisma 직접 조회). 클라이언트에서 import 하지 말 것.

import { cache } from 'react'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { extractStoredCards } from './savedReadingPayload'

export interface SharedReadingCard {
  name: string
  image: string
  isReversed: boolean
  position: string
}

export interface SharedReadingCardInsight {
  position: string
  card_name: string
  is_reversed: boolean
  interpretation: string
}

export interface SharedReading {
  question: string
  spreadTitle: string
  locale: string
  createdAt: Date
  cards: SharedReadingCard[]
  overallMessage: string
  cardInsights: SharedReadingCardInsight[]
  guidance: string
  affirmation: string
  /** 공유한 사람의 추천 코드 — 공개 페이지 CTA 에 ?ref= 로 붙여 유입을 귀속. */
  referrerCode: string | null
}

function asCards(value: unknown): SharedReadingCard[] {
  return extractStoredCards(value).map((c, i) => {
    const rec = c as Record<string, unknown>
    return {
      name: typeof rec.name === 'string' ? rec.name : `Card ${i + 1}`,
      image: typeof rec.image === 'string' ? rec.image : '/images/tarot/card-back.webp',
      isReversed: Boolean(rec.isReversed),
      position: typeof rec.position === 'string' ? rec.position : '',
    }
  })
}

function asInsights(value: unknown): SharedReadingCardInsight[] {
  if (!Array.isArray(value)) return []
  return value.map((c) => {
    const rec = (c || {}) as Record<string, unknown>
    return {
      position: typeof rec.position === 'string' ? rec.position : '',
      card_name: typeof rec.card_name === 'string' ? rec.card_name : '',
      is_reversed: Boolean(rec.is_reversed),
      interpretation: typeof rec.interpretation === 'string' ? rec.interpretation : '',
    }
  })
}

/**
 * 공개 토큰으로 리딩을 조회한다. 없거나(비공개/잘못된 토큰) 마이그레이션
 * 미적용(P2022)이면 null — 호출자는 notFound() 처리.
 */
export const getSharedReadingByToken = cache(_getSharedReadingByToken)

async function _getSharedReadingByToken(token: string): Promise<SharedReading | null> {
  const clean = (token || '').trim()
  if (!clean) return null
  try {
    const reading = await prisma.tarotReading.findUnique({
      where: { shareToken: clean },
      select: {
        question: true,
        spreadTitle: true,
        locale: true,
        createdAt: true,
        cards: true,
        overallMessage: true,
        cardInsights: true,
        guidance: true,
        affirmation: true,
        user: { select: { settings: { select: { referralCode: true } } } },
      },
    })
    if (!reading) return null

    return {
      question: reading.question,
      spreadTitle: reading.spreadTitle,
      locale: reading.locale,
      createdAt: reading.createdAt,
      cards: asCards(reading.cards),
      overallMessage: reading.overallMessage || '',
      cardInsights: asInsights(reading.cardInsights),
      guidance: reading.guidance || '',
      affirmation: reading.affirmation || '',
      referrerCode: reading.user?.settings?.referralCode ?? null,
    }
  } catch (error) {
    const code = (error as { code?: string } | null)?.code
    if (code === 'P2022') {
      logger.warn('[sharedReading] shareToken column missing — migration pending?')
      return null
    }
    logger.error('[sharedReading] query failed', error)
    return null
  }
}

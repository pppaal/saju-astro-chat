// src/lib/social/threadDaily.ts
//
// 슬롯(아침/오후/저녁)을 주제(타로/사주/점성)로 매핑해, 그 주제의 빌더로
// Threads 데일리 게시물을 만든다. cron 은 이 한 함수만 부른다.
//
//   아침(morning)   → 타로  (오늘의 카드 + /r 공유 결과)
//   오후(afternoon) → 사주  (오늘의 일진)
//   저녁(evening)   → 점성  (오늘의 하늘: 별자리 시즌 + 달 위상)

import { buildTarotThreadPost, type ThreadSlot } from './tarotThread'
import { buildSajuThreadPost } from './sajuThread'
import { buildAstroThreadPost } from './astroThread'
import type { ThreadPost, ThreadTopic } from './threadTypes'

const SLOT_TOPIC: Record<ThreadSlot, ThreadTopic> = {
  morning: 'tarot',
  afternoon: 'saju',
  evening: 'astro',
}

export function topicForSlot(slot: ThreadSlot): ThreadTopic {
  return SLOT_TOPIC[slot]
}

/**
 * 슬롯의 주제에 맞는 데일리 게시물을 만든다. 타로는 공유 링크 생성 실패 시
 * null(발행할 게 없음); 사주/점성은 결정론이라 항상 생성된다.
 */
export async function buildDailyThreadPost(
  slot: ThreadSlot,
  locale: 'ko' | 'en' = 'ko',
  now: Date = new Date()
): Promise<ThreadPost | null> {
  const topic = SLOT_TOPIC[slot]

  if (topic === 'saju') return buildSajuThreadPost(slot, locale, now)
  if (topic === 'astro') return buildAstroThreadPost(slot, locale, now)

  // tarot — TarotThreadPost 를 공통 ThreadPost 모양으로 변환.
  const t = await buildTarotThreadPost(slot, locale, now)
  if (!t) return null
  return {
    topic: 'tarot',
    slot: t.slot,
    locale: t.locale,
    summary: `${t.cardName}${t.isReversed ? ' (역)' : ''}`,
    caption: t.caption,
    hashtags: t.hashtags,
    imageUrl: t.imageUrl,
    shareUrl: t.shareUrl,
  }
}

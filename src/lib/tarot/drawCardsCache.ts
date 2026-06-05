// 드로우 시점의 *권위 있는* 뽑힌 카드를 draw nonce 로 잠깐 보관한다.
//
// 배경: /api/tarot 가 카드를 뽑아 클라이언트로 내려주면, 해석 단계
// (/api/tarot/interpret-stream)는 클라이언트가 다시 올려보낸 cards 배열을
// 그대로 LLM 에 넘겼다. 즉 사용자가 요청을 조작해 *실제로 안 뽑은* 카드의
// 해석을 받아낼 수 있는 무결성 갭이 있었다(부정행위 이득은 없지만 "뽑힌
// 카드 = 해석된 카드" 불변식이 깨짐).
//
// 해결: draw 가 뽑은 카드를 서버 캐시에 nonce 키로 저장하고, interpret 가
// 같은 nonce 로 읽어 *그* 카드를 쓴다. 캐시 miss(만료 / redis 다운 / nonce
// 미발급·위조 / nonce 없는 레거시·인라인 경로)면 호출자가 body.cards 로
// 안전하게 폴백한다 — 무결성은 best-effort 강화이지 하드 게이트가 아니다.
//
// ownerKey 는 draw 와 interpret 가 동일하게 drawNonceOwnerKey(req, userId) 로
// 만든다(로그인=userId, 게스트=ip). 그래서 같은 사용자/세션만 자기 nonce 의
// 카드를 읽는다.

import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'

/** interpret-stream 프롬프트가 필요로 하는 최소 카드 형태 (slimmed). */
export interface StoredDrawCard {
  name: string
  nameKo?: string
  isReversed: boolean
  keywords?: string[]
  keywordsKo?: string[]
}

// 충전하러 갔다 오는 왕복까지 커버 (turn-result 캐시와 동일한 30분).
const DRAW_CARDS_TTL_SEC = 1800

function drawCardsKey(ownerKey: string, nonce: string): string {
  return `tarot:draw-cards:${ownerKey}:${nonce}`
}

/** draw 라우트: 뽑은 카드를 nonce 로 보관. redis 실패해도 throw 없이 무시. */
export async function storeDrawCards(
  ownerKey: string,
  nonce: string,
  cards: StoredDrawCard[]
): Promise<void> {
  if (!nonce) return
  await cacheSet(drawCardsKey(ownerKey, nonce), cards, DRAW_CARDS_TTL_SEC)
}

/** interpret 라우트: nonce 로 권위 있는 카드 조회. 없으면 null → 호출자 폴백. */
export async function loadDrawCards(
  ownerKey: string,
  nonce: string
): Promise<StoredDrawCard[] | null> {
  if (!nonce) return null
  const cards = await cacheGet<StoredDrawCard[]>(drawCardsKey(ownerKey, nonce))
  if (!Array.isArray(cards) || cards.length === 0) return null
  return cards
}

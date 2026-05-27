// 저장된 리딩(SavedTarotReading) 에 들어있는 카드 정보(name / nameKo) 에서
// 전체 78장 deck 에 매칭되는 카드를 찾아 image 등 누락 필드를 보충한다.
// 히스토리 모달과 useTarotGame 의 reading 복원 양쪽에서 같은 매칭 로직을
// 쓰도록 분리.

import { tarotDeck } from '@/lib/tarot/data'
import type { Card } from '@/lib/tarot/tarot.types'

export interface SavedCardLike {
  name: string
  nameKo?: string
}

/**
 * SavedTarotReading.cards[i] → 전체 deck 의 Card. 매칭 실패 시 card-back
 * 이미지로 fallback 한 placeholder Card 반환 (히스토리 표시에 빈 슬롯 X).
 *
 * 매칭 우선순위: 영어/한국어 name 양방향 정규화 비교 → 첫 hit.
 *
 * @param index — 매칭 실패 시 fallback 카드 ID 유니크하게 만들기 위한
 *                위치 인덱스 (음수 sentinel 사용).
 */
export function findCardBySavedName(saved: SavedCardLike, index: number): Card {
  const normalizedName = saved.name.trim().toLowerCase()
  const normalizedNameKo = (saved.nameKo || '').trim().toLowerCase()

  const matchedCard = tarotDeck.find((card) => {
    const englishName = card.name.trim().toLowerCase()
    const koreanName = card.nameKo.trim().toLowerCase()
    return (
      englishName === normalizedName ||
      englishName === normalizedNameKo ||
      koreanName === normalizedName ||
      koreanName === normalizedNameKo
    )
  })

  if (matchedCard) {
    return matchedCard
  }

  const fallback = tarotDeck[0]
  return {
    ...fallback,
    id: -1 - index,
    name: saved.name,
    nameKo: saved.nameKo || saved.name,
    image: '/images/tarot/card-back.webp',
  }
}

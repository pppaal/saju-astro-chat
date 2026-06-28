// 경량 카드 이름→이미지 인덱스.
//
// 왜 별도 파일인가: 전체 덱(@/lib/tarot/data)은 78장의 정·역방향 의미/조언
// 텍스트(ko/en)까지 담아 ~400KB 다. 히스토리 페이지·공유 카드처럼 *이미지와
// 이름만* 필요한 클라이언트 경로가 findCardBySavedName 을 거쳐 그 덱을 통째로
// import 하면 의미 전문이 트리셰이킹 안 돼 클라 번들에 들어간다. 이 파일은
// id/name/nameKo 만 담아(의미 0) 그 경로들이 가볍게 쓰게 한다. 이미지는 id 로
// getCardImagePath 에서 파생.
//
// 드리프트 방지: tests/lib/tarot/cardNameIndex.sync.test.ts 가 이 표를 정식
// 덱(tarotDeck)과 대조해 id/name/nameKo 가 어긋나면 실패한다. 카드 추가/이름
// 변경 시 이 표도 같이 갱신할 것.
//
// 의미·키워드가 필요한 라이브 게임/해석 경로는 그대로 findCardBySavedName(전체
// 덱)을 쓴다 — 그쪽은 어차피 해석을 위해 의미 텍스트가 필요하다.

import { getCardImagePath } from './tarot.types'

export interface CardNameEntry {
  id: number
  name: string
  nameKo: string
}

export interface CardImageMatch {
  id: number
  name: string
  nameKo: string
  image: string
}

export const CARD_NAME_INDEX: ReadonlyArray<CardNameEntry> = [
  { id: 0, name: 'The Fool', nameKo: '바보' },
  { id: 1, name: 'The Magician', nameKo: '마법사' },
  { id: 2, name: 'The High Priestess', nameKo: '여사제' },
  { id: 3, name: 'The Empress', nameKo: '여황제' },
  { id: 4, name: 'The Emperor', nameKo: '황제' },
  { id: 5, name: 'The Hierophant', nameKo: '교황' },
  { id: 6, name: 'The Lovers', nameKo: '연인' },
  { id: 7, name: 'The Chariot', nameKo: '전차' },
  { id: 8, name: 'Strength', nameKo: '힘' },
  { id: 9, name: 'The Hermit', nameKo: '은둔자' },
  { id: 10, name: 'Wheel of Fortune', nameKo: '운명의 수레바퀴' },
  { id: 11, name: 'Justice', nameKo: '정의' },
  { id: 12, name: 'The Hanged Man', nameKo: '매달린 사람' },
  { id: 13, name: 'Death', nameKo: '죽음' },
  { id: 14, name: 'Temperance', nameKo: '절제' },
  { id: 15, name: 'The Devil', nameKo: '악마' },
  { id: 16, name: 'The Tower', nameKo: '탑' },
  { id: 17, name: 'The Star', nameKo: '별' },
  { id: 18, name: 'The Moon', nameKo: '달' },
  { id: 19, name: 'The Sun', nameKo: '태양' },
  { id: 20, name: 'Judgement', nameKo: '심판' },
  { id: 21, name: 'The World', nameKo: '세계' },
  { id: 22, name: 'Ace of Wands', nameKo: '완드 에이스' },
  { id: 23, name: 'Two of Wands', nameKo: '완드 2' },
  { id: 24, name: 'Three of Wands', nameKo: '완드 3' },
  { id: 25, name: 'Four of Wands', nameKo: '완드 4' },
  { id: 26, name: 'Five of Wands', nameKo: '완드 5' },
  { id: 27, name: 'Six of Wands', nameKo: '완드 6' },
  { id: 28, name: 'Seven of Wands', nameKo: '완드 7' },
  { id: 29, name: 'Eight of Wands', nameKo: '완드 8' },
  { id: 30, name: 'Nine of Wands', nameKo: '완드 9' },
  { id: 31, name: 'Ten of Wands', nameKo: '완드 10' },
  { id: 32, name: 'Page of Wands', nameKo: '완드 시종' },
  { id: 33, name: 'Knight of Wands', nameKo: '완드 기사' },
  { id: 34, name: 'Queen of Wands', nameKo: '완드 여왕' },
  { id: 35, name: 'King of Wands', nameKo: '완드 왕' },
  { id: 36, name: 'Ace of Cups', nameKo: '컵 에이스' },
  { id: 37, name: 'Two of Cups', nameKo: '컵 2' },
  { id: 38, name: 'Three of Cups', nameKo: '컵 3' },
  { id: 39, name: 'Four of Cups', nameKo: '컵 4' },
  { id: 40, name: 'Five of Cups', nameKo: '컵 5' },
  { id: 41, name: 'Six of Cups', nameKo: '컵 6' },
  { id: 42, name: 'Seven of Cups', nameKo: '컵 7' },
  { id: 43, name: 'Eight of Cups', nameKo: '컵 8' },
  { id: 44, name: 'Nine of Cups', nameKo: '컵 9' },
  { id: 45, name: 'Ten of Cups', nameKo: '컵 10' },
  { id: 46, name: 'Page of Cups', nameKo: '컵 시종' },
  { id: 47, name: 'Knight of Cups', nameKo: '컵 기사' },
  { id: 48, name: 'Queen of Cups', nameKo: '컵 여왕' },
  { id: 49, name: 'King of Cups', nameKo: '컵 왕' },
  { id: 50, name: 'Ace of Swords', nameKo: '소드 에이스' },
  { id: 51, name: 'Two of Swords', nameKo: '소드 2' },
  { id: 52, name: 'Three of Swords', nameKo: '소드 3' },
  { id: 53, name: 'Four of Swords', nameKo: '소드 4' },
  { id: 54, name: 'Five of Swords', nameKo: '소드 5' },
  { id: 55, name: 'Six of Swords', nameKo: '소드 6' },
  { id: 56, name: 'Seven of Swords', nameKo: '소드 7' },
  { id: 57, name: 'Eight of Swords', nameKo: '소드 8' },
  { id: 58, name: 'Nine of Swords', nameKo: '소드 9' },
  { id: 59, name: 'Ten of Swords', nameKo: '소드 10' },
  { id: 60, name: 'Page of Swords', nameKo: '소드 시종' },
  { id: 61, name: 'Knight of Swords', nameKo: '소드 기사' },
  { id: 62, name: 'Queen of Swords', nameKo: '소드 여왕' },
  { id: 63, name: 'King of Swords', nameKo: '소드 왕' },
  { id: 64, name: 'Ace of Pentacles', nameKo: '펜타클 에이스' },
  { id: 65, name: 'Two of Pentacles', nameKo: '펜타클 2' },
  { id: 66, name: 'Three of Pentacles', nameKo: '펜타클 3' },
  { id: 67, name: 'Four of Pentacles', nameKo: '펜타클 4' },
  { id: 68, name: 'Five of Pentacles', nameKo: '펜타클 5' },
  { id: 69, name: 'Six of Pentacles', nameKo: '펜타클 6' },
  { id: 70, name: 'Seven of Pentacles', nameKo: '펜타클 7' },
  { id: 71, name: 'Eight of Pentacles', nameKo: '펜타클 8' },
  { id: 72, name: 'Nine of Pentacles', nameKo: '펜타클 9' },
  { id: 73, name: 'Ten of Pentacles', nameKo: '펜타클 10' },
  { id: 74, name: 'Page of Pentacles', nameKo: '펜타클 시종' },
  { id: 75, name: 'Knight of Pentacles', nameKo: '펜타클 기사' },
  { id: 76, name: 'Queen of Pentacles', nameKo: '펜타클 여왕' },
  { id: 77, name: 'King of Pentacles', nameKo: '펜타클 왕' },
]

/**
 * 저장된 카드(name/nameKo)에서 이미지/이름만 가볍게 매칭한다. findCardBySavedName
 * 의 매칭 규칙(영/한 양방향 정규화)과 동일하되, 의미 텍스트가 없는 경량 표만 본다.
 * 매칭 실패 시 card-back 으로 폴백(빈 슬롯 방지).
 */
export function findCardImageBySavedName(
  saved: { name: string; nameKo?: string },
  index: number
): CardImageMatch {
  const normalizedName = saved.name.trim().toLowerCase()
  const normalizedNameKo = (saved.nameKo || '').trim().toLowerCase()

  const matched = CARD_NAME_INDEX.find((c) => {
    const en = c.name.trim().toLowerCase()
    const ko = c.nameKo.trim().toLowerCase()
    return (
      en === normalizedName ||
      en === normalizedNameKo ||
      ko === normalizedName ||
      ko === normalizedNameKo
    )
  })

  if (matched) {
    return { ...matched, image: getCardImagePath(matched.id) }
  }

  return {
    id: -1 - index,
    name: saved.name,
    nameKo: saved.nameKo || saved.name,
    image: '/images/tarot/card-back.webp',
  }
}

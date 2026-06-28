import { describe, it, expect } from 'vitest'
import { CARD_NAME_INDEX, findCardImageBySavedName } from '@/lib/tarot/cardNameIndex'
import { tarotDeck } from '@/lib/tarot/data'
import { getCardImagePath } from '@/lib/tarot/tarot.types'

// 경량 인덱스가 정식 덱과 어긋나지 않도록 잠근다. 카드 추가/이름 변경 시
// CARD_NAME_INDEX 도 같이 갱신해야 이 테스트가 통과한다.
describe('cardNameIndex ↔ tarotDeck 동기화', () => {
  it('78장 전부 id/name/nameKo 가 정식 덱과 일치', () => {
    expect(CARD_NAME_INDEX).toHaveLength(tarotDeck.length)
    const byId = new Map(tarotDeck.map((c) => [c.id, c]))
    for (const entry of CARD_NAME_INDEX) {
      const full = byId.get(entry.id)
      expect(full, `id ${entry.id} 가 정식 덱에 없음`).toBeTruthy()
      expect(entry.name).toBe(full!.name)
      expect(entry.nameKo).toBe(full!.nameKo)
    }
  })

  it('findCardImageBySavedName 매칭 결과가 정식 덱의 이미지와 동일', () => {
    for (const full of tarotDeck) {
      const m = findCardImageBySavedName({ name: full.name, nameKo: full.nameKo }, 0)
      expect(m.id).toBe(full.id)
      expect(m.image).toBe(getCardImagePath(full.id))
      expect(m.image).toBe(full.image)
    }
  })

  it('매칭 실패는 card-back 으로 폴백', () => {
    const m = findCardImageBySavedName({ name: 'Nonexistent Card' }, 3)
    expect(m.id).toBe(-4)
    expect(m.image).toBe('/images/tarot/card-back.webp')
  })
})

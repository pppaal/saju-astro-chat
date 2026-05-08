// Named tarot combination patterns — analog of saju 신살 patterns
// and astrology aspect patterns (T-square, Grand Trine, Stellium, Yod).
//
// When 2-3 specific cards co-occur in the same spread, the meaning of
// the spread compounds beyond the sum of its cards. This module pre-detects
// those named patterns deterministically so the UI/LLM can ground on them.
//
// Pure / no-LLM. Patterns are curated from traditional rider-waite reading
// literature (Greer, Pollack, Bunning) — most common 20 archetypal combos.

import type { DrawnCard } from '../tarot.types'

export type ComboTone = 'harmony' | 'tension' | 'transformation' | 'warning'

export interface CardSpec {
  id: number
  /** undefined = either orientation; 'upright' / 'reversed' = strict. */
  orientation?: 'upright' | 'reversed'
}

export interface ComboPattern {
  key: string
  label: string
  cards: CardSpec[]      // ALL must be present (in any positions/orientation matching)
  tone: ComboTone
  meaning: string
  advice: string
}

export interface ComboHit {
  pattern: ComboPattern
  matchedCardNames: string[]
}

// Card-id reference (only the ones used here, for readability):
// 0 Fool · 1 Magician · 2 High Priestess · 3 Empress · 5 Hierophant
// 6 Lovers · 9 Hermit · 10 Wheel · 13 Death · 15 Devil · 16 Tower
// 17 Star · 18 Moon · 19 Sun · 20 Judgement · 21 World
// 22 Ace Wands · 32 Page Wands · 35 King Wands
// 36 Ace Cups · 37 2 Cups · 38 3 Cups · 46 10 Cups · 49 King Cups
// 50 Ace Swords · 52 3 Swords · 54 5 Swords · 59 10 Swords
// 64 Ace Pents · 73 10 Pents

const PATTERNS: ComboPattern[] = [
  // Transformation cycles
  {
    key: 'tower_death_devil',
    label: '완전 정리 사이클 (Tower + Death + Devil)',
    cards: [{ id: 16 }, { id: 13 }, { id: 15 }],
    tone: 'transformation',
    meaning:
      '집착(Devil)이 죽음(Death)을 거쳐 외부 충격(Tower)으로 강제 해체되는 흐름. 막아도 무너지는 자리 — 흐름을 거스르지 마세요.',
    advice: '저항보다 흘려보내기. 이 사이클이 끝나면 진짜 새 자리에 있을 것.',
  },
  {
    key: 'tower_star',
    label: '파괴 후 희망 (Tower → Star)',
    cards: [{ id: 16 }, { id: 17 }],
    tone: 'transformation',
    meaning:
      '무너진 다음 별이 뜨는 결. 충격은 정화 과정이며, 그 뒤 진짜 가능성이 다시 열립니다.',
    advice: '지금의 상실은 끝이 아닙니다. 별빛이 보일 때까지 회복할 시간을 주세요.',
  },
  {
    key: 'death_judgement',
    label: '재탄생 (Death + Judgement)',
    cards: [{ id: 13 }, { id: 20 }],
    tone: 'transformation',
    meaning:
      '한 자아가 죽고 새 자아로 깨어나는 결. 옛 정체성을 붙잡으면 변용이 늦어지지만, 놓으면 부활입니다.',
    advice: '자기에 대한 옛 정의를 갱신하세요. 새로운 부름에 응답할 시기.',
  },
  {
    key: 'fool_world',
    label: '한 사이클 완결 (Fool + World)',
    cards: [{ id: 0 }, { id: 21 }],
    tone: 'transformation',
    meaning:
      '한 여정이 끝나고 또 다른 여정이 시작되는 결. World로 졸업하고 Fool로 다시 입학.',
    advice: '졸업과 입학을 동시에 받아들이세요. 새 자리는 옛 자리의 반복이 아닙니다.',
  },

  // Love / relationship axes
  {
    key: 'lovers_two_cups',
    label: '강한 사랑 축 (Lovers + 2 of Cups)',
    cards: [{ id: 6 }, { id: 37 }],
    tone: 'harmony',
    meaning:
      '운명적 결합(Lovers)과 일대일 친밀(2 of Cups)이 동시에. 깊고 진짜인 관계 에너지가 활성.',
    advice: '서두르지 말고 마음을 정직하게 표현하세요. 여기서는 진심이 통합니다.',
  },
  {
    key: 'lovers_hierophant',
    label: '결혼·서약 (Lovers + Hierophant)',
    cards: [{ id: 6 }, { id: 5 }],
    tone: 'harmony',
    meaning:
      '사랑(Lovers)이 공식 구조(Hierophant)와 만남 — 결혼·약혼·공인 결합의 결.',
    advice: '관계를 공적으로 한 단계 진전시킬 시기. 가족·전통·약속을 무시하지 마세요.',
  },
  {
    key: 'three_cups_ten_cups',
    label: '관계의 풍요 (3 of Cups + 10 of Cups)',
    cards: [{ id: 38 }, { id: 46 }],
    tone: 'harmony',
    meaning:
      '축하의 결(3 of Cups)에 가족적 충만(10 of Cups)이 더해짐. 관계의 황금기.',
    advice: '소중한 사람들과 시간을 쌓으세요. 이 결실은 일시적이지 않습니다.',
  },
  {
    key: 'three_swords_five_cups',
    label: '슬픔의 증폭 (3 of Swords + 5 of Cups)',
    cards: [{ id: 52 }, { id: 40 }],
    tone: 'warning',
    meaning:
      '심장의 상처(3 of Swords)에 잃은 것에 대한 후회(5 of Cups)가 겹침. 슬픔이 한 번에 몰림.',
    advice: '감정을 억누르지 말고 흘려보내세요. 아직 남아 있는 두 잔을 잊지 말고.',
  },

  // Manifestation / abundance
  {
    key: 'magician_wheel',
    label: '운명의 창조자 (Magician + Wheel of Fortune)',
    cards: [{ id: 1 }, { id: 10 }],
    tone: 'harmony',
    meaning:
      '실현 의지(Magician)와 우주의 회전(Wheel)이 동기화 — 행동이 운과 정렬되는 드문 시기.',
    advice: '망설이지 말고 행동하세요. 지금 만든 결정이 다음 사이클의 자리를 정합니다.',
  },
  {
    key: 'sun_world_star',
    label: '성취의 삼위 (Sun + World + Star)',
    cards: [{ id: 19 }, { id: 21 }, { id: 17 }],
    tone: 'harmony',
    meaning:
      '성공(Sun) · 완결(World) · 희망(Star). 세 카드가 함께라면 인생의 클라이맥스.',
    advice: '받을 수 있는 모든 것을 받으세요. 자격이 충분합니다.',
  },
  {
    key: 'empress_ace_pentacles',
    label: '풍요의 발현 (Empress + Ace of Pentacles)',
    cards: [{ id: 3 }, { id: 64 }],
    tone: 'harmony',
    meaning:
      '풍요의 어머니(Empress)와 물질적 새 씨앗(Ace of Pentacles). 임신·새 사업·재정 출발의 결.',
    advice: '심으면 자랍니다. 시작하기 좋은 자리.',
  },
  {
    key: 'ten_pentacles_king_pentacles',
    label: '재정 안정 (10 of Pentacles + 풍요)',
    cards: [{ id: 73 }, { id: 64 }],
    tone: 'harmony',
    meaning:
      '장기적 부의 구조(10 of Pentacles)와 새 자원(Ace)이 만나 안정성과 성장 동시 작동.',
    advice: '저축·투자·가족 자산을 한 단계 정리할 좋은 시점.',
  },

  // Shadow / introspection
  {
    key: 'hermit_moon',
    label: '깊은 내면 탐사 (Hermit + Moon)',
    cards: [{ id: 9 }, { id: 18 }],
    tone: 'tension',
    meaning:
      '은둔(Hermit)과 무의식·환상(Moon)이 동시에. 외부에서 답이 오지 않고 내면 깊은 곳에서만 옵니다.',
    advice: '혼자 있는 시간을 두려워하지 마세요. 명상·꿈·일기가 답을 줍니다.',
  },
  {
    key: 'devil_moon',
    label: '집착의 환상 (Devil + Moon)',
    cards: [{ id: 15 }, { id: 18 }],
    tone: 'warning',
    meaning:
      '집착(Devil)에 환상·자기기만(Moon)이 더해짐. 안 보이는 끈에 묶여 있을 가능성.',
    advice: '진짜와 가짜를 분리하세요. 의심이 들면 거리부터 두는 게 답입니다.',
  },
  {
    key: 'high_priestess_hermit',
    label: '직관의 시간 (High Priestess + Hermit)',
    cards: [{ id: 2 }, { id: 9 }],
    tone: 'harmony',
    meaning:
      '내면 지혜(High Priestess)와 자기 탐구(Hermit). 외부 조언보다 자기 직관이 옳은 시기.',
    advice: '결정을 서두르지 말고 며칠 머물러보세요. 답은 안에서 올라옵니다.',
  },

  // Crisis
  {
    key: 'three_swords_tower',
    label: '심장의 충격 (3 of Swords + Tower)',
    cards: [{ id: 52 }, { id: 16 }],
    tone: 'warning',
    meaning:
      '관계 상처(3 of Swords)와 외부 충격(Tower)이 겹침. 갑작스러운 결별·배신·진실 폭로의 결.',
    advice: '충격을 부정하지 말되, 이것이 정화 과정임을 기억하세요.',
  },
  {
    key: 'ten_swords_death',
    label: '진짜 끝 (10 of Swords + Death)',
    cards: [{ id: 59 }, { id: 13 }],
    tone: 'transformation',
    meaning:
      '한 결의 마지막(10 of Swords)과 변용(Death)이 동시. 더 이상 살릴 수 없는 자리는 놓아야 합니다.',
    advice: '마침을 받아들이세요. 부활은 죽음 다음에 옵니다.',
  },
  {
    key: 'five_swords_seven_swords',
    label: '갈등·기만 (5 of Swords + 7 of Swords)',
    cards: [{ id: 54 }, { id: 56 }],
    tone: 'warning',
    meaning:
      '승리하지만 잃는 갈등(5 of Swords)과 은밀한 회피(7 of Swords). 이기더라도 신뢰가 무너지는 결.',
    advice: '이기는 게 목표인지 다시 보세요. 정직한 협상이 장기적으로 유리합니다.',
  },

  // Fresh starts
  {
    key: 'four_aces',
    label: '네 원소의 시작 (Multiple Aces)',
    cards: [{ id: 22 }, { id: 36 }, { id: 50 }, { id: 64 }],
    tone: 'harmony',
    meaning:
      '네 슈트 모두의 에이스가 함께 등장한다면 — 인생 모든 영역에서 새 사이클이 동시에 시작.',
    advice: '큰 그림을 그릴 자리. 작게 시작하지 말고 장기 비전부터 정의하세요.',
  },
  {
    key: 'ace_wands_magician',
    label: '실현 의지 발화 (Ace of Wands + Magician)',
    cards: [{ id: 22 }, { id: 1 }],
    tone: 'harmony',
    meaning:
      '새 불씨(Ace of Wands)와 실현자(Magician). 아이디어를 행동으로 옮길 가장 좋은 결.',
    advice: '머리에서 손으로. 오늘 할 수 있는 첫 행동을 정하세요.',
  },
]

function cardMatches(dc: DrawnCard, spec: CardSpec): boolean {
  if (dc.card.id !== spec.id) return false
  if (!spec.orientation) return true
  return spec.orientation === 'upright' ? !dc.isReversed : dc.isReversed
}

export function detectComboPatterns(drawn: DrawnCard[]): ComboHit[] {
  const hits: ComboHit[] = []
  for (const pattern of PATTERNS) {
    const matched: string[] = []
    let allPresent = true
    for (const spec of pattern.cards) {
      const found = drawn.find((dc) => cardMatches(dc, spec))
      if (!found) {
        allPresent = false
        break
      }
      matched.push(found.card.nameKo || found.card.name)
    }
    if (allPresent) hits.push({ pattern, matchedCardNames: matched })
  }
  return hits
}

export const __PATTERN_LIBRARY = PATTERNS // for tests

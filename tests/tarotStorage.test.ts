/**
 * Tarot Storage 테스트
 * - ID 생성
 * - 날짜 포맷
 * - 상대 시간 포맷
 */

import { vi, beforeEach, afterEach } from 'vitest'
import {
  formatReadingForSave,
  getSavedReadings,
  saveReading,
  deleteReading,
  storeReadingRestorePayload,
  loadReadingRestorePayload,
  updateRestorePayloadFollowup,
  mapServerReadingToSavedReading,
  type SavedTarotReading,
} from '@/lib/tarot/tarot-storage'
import type { Spread, DrawnCard } from '@/lib/tarot/tarot.types'

describe('formatReadingForSave', () => {
  const mockSpread: Spread = {
    id: 'three-card',
    title: 'Three Card Spread',
    titleKo: '3카드 스프레드',
    description: 'Past, Present, Future',
    descriptionKo: '과거, 현재, 미래',
    cardCount: 3,
    positions: [
      { id: 'past', title: 'Past', titleKo: '과거', description: 'Past events' },
      { id: 'present', title: 'Present', titleKo: '현재', description: 'Current situation' },
      { id: 'future', title: 'Future', titleKo: '미래', description: 'Future possibilities' },
    ],
    categories: ['general'],
  }

  const mockDrawnCards: DrawnCard[] = [
    {
      card: {
        id: 'the-fool',
        name: 'The Fool',
        nameKo: '바보',
        number: 0,
        arcana: 'major',
        suit: null,
        keywords: ['new beginnings'],
        keywordsKo: ['새로운 시작'],
        uprightMeaning: 'New beginnings',
        uprightMeaningKo: '새로운 시작',
        reversedMeaning: 'Recklessness',
        reversedMeaningKo: '무모함',
        description: 'The Fool represents new beginnings',
        descriptionKo: '바보 카드는 새로운 시작을 의미합니다',
        imagePath: '/cards/fool.jpg',
      },
      isReversed: false,
    },
    {
      card: {
        id: 'the-magician',
        name: 'The Magician',
        nameKo: '마법사',
        number: 1,
        arcana: 'major',
        suit: null,
        keywords: ['power'],
        keywordsKo: ['힘'],
        uprightMeaning: 'Manifestation',
        uprightMeaningKo: '현실화',
        reversedMeaning: 'Manipulation',
        reversedMeaningKo: '조작',
        description: 'The Magician represents manifestation',
        descriptionKo: '마법사 카드는 현실화를 의미합니다',
        imagePath: '/cards/magician.jpg',
      },
      isReversed: true,
    },
    {
      card: {
        id: 'the-high-priestess',
        name: 'The High Priestess',
        nameKo: '여사제',
        number: 2,
        arcana: 'major',
        suit: null,
        keywords: ['intuition'],
        keywordsKo: ['직관'],
        uprightMeaning: 'Intuition',
        uprightMeaningKo: '직관',
        reversedMeaning: 'Secrets',
        reversedMeaningKo: '비밀',
        description: 'The High Priestess represents intuition',
        descriptionKo: '여사제 카드는 직관을 의미합니다',
        imagePath: '/cards/high-priestess.jpg',
      },
      isReversed: false,
    },
  ]

  const mockInterpretation = {
    overall_message: 'A journey of transformation awaits',
    guidance: 'Trust your intuition',
    card_insights: [
      { position: 'Past', card_name: 'The Fool', interpretation: 'New beginnings in the past' },
      { position: 'Present', card_name: 'The Magician', interpretation: 'Manifesting now' },
      { position: 'Future', card_name: 'The High Priestess', interpretation: 'Trust intuition' },
    ],
  }

  it('formats reading correctly', () => {
    const result = formatReadingForSave(
      'What does my future hold?',
      mockSpread,
      mockDrawnCards,
      mockInterpretation,
      'general',
      'three-card',
      'rider-waite'
    )

    expect(result.question).toBe('What does my future hold?')
    expect(result.categoryId).toBe('general')
    expect(result.spreadId).toBe('three-card')
    expect(result.deckStyle).toBe('rider-waite')
  })

  it('includes spread info', () => {
    const result = formatReadingForSave(
      'Test',
      mockSpread,
      mockDrawnCards,
      mockInterpretation,
      'general',
      'three-card'
    )

    expect(result.spread.title).toBe('Three Card Spread')
    expect(result.spread.titleKo).toBe('3카드 스프레드')
    expect(result.spread.cardCount).toBe(3)
  })

  it('includes all cards with positions', () => {
    const result = formatReadingForSave(
      'Test',
      mockSpread,
      mockDrawnCards,
      mockInterpretation,
      'general',
      'three-card'
    )

    expect(result.cards).toHaveLength(3)
    expect(result.cards[0].name).toBe('The Fool')
    expect(result.cards[0].nameKo).toBe('바보')
    expect(result.cards[0].isReversed).toBe(false)
    expect(result.cards[0].position).toBe('Past')
    // 자리 라벨은 이제 LLM 응답(card_insights.position)에서 가져오며 ko/en 동일.
    expect(result.cards[0].positionKo).toBe('Past')

    expect(result.cards[1].isReversed).toBe(true)
  })

  it('includes interpretation', () => {
    const result = formatReadingForSave(
      'Test',
      mockSpread,
      mockDrawnCards,
      mockInterpretation,
      'general',
      'three-card'
    )

    expect(result.interpretation.overallMessage).toBe('A journey of transformation awaits')
    expect(result.interpretation.guidance).toBe('Trust your intuition')
    expect(result.interpretation.cardInsights).toHaveLength(3)
  })

  it('includes question analysis metadata when provided', () => {
    const result = formatReadingForSave(
      'Test',
      mockSpread,
      mockDrawnCards,
      mockInterpretation,
      'general',
      'three-card',
      undefined,
      {
        question_summary: 'Overall life direction',
        direct_answer: 'You are in a transition phase.',
      }
    )

    expect(result.questionAnalysis).toEqual({
      question_summary: 'Overall life direction',
      direct_answer: 'You are in a transition phase.',
    })
  })

  it('handles null interpretation', () => {
    const result = formatReadingForSave(
      'Test',
      mockSpread,
      mockDrawnCards,
      null,
      'general',
      'three-card'
    )

    expect(result.interpretation.overallMessage).toBe('')
    expect(result.interpretation.guidance).toBe('')
    expect(result.interpretation.cardInsights).toEqual([])
  })

  it('handles missing position info gracefully', () => {
    const shortSpread: Spread = {
      ...mockSpread,
      positions: [mockSpread.positions[0]], // Only one position
    }

    const result = formatReadingForSave(
      'Test',
      shortSpread,
      mockDrawnCards,
      null,
      'general',
      'three-card'
    )

    // interpretation이 null이면 LLM 자리 라벨이 없어 'N번 카드' fallback 사용.
    expect(result.cards[0].position).toBe('1번 카드')
    expect(result.cards[1].position).toBe('2번 카드')
    expect(result.cards[2].position).toBe('3번 카드')
  })
})

describe('ID Generation Pattern', () => {
  it('generates unique IDs', () => {
    // Test the ID generation pattern
    const generateId = (): string => {
      return `tarot_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    }

    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateId())
    }

    expect(ids.size).toBe(100) // All unique
  })

  it('ID starts with tarot_ prefix', () => {
    const generateId = (): string => {
      return `tarot_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    }

    const id = generateId()
    expect(id.startsWith('tarot_')).toBe(true)
  })

  it('ID contains timestamp', () => {
    const before = Date.now()
    const generateId = (): string => {
      return `tarot_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    }
    const id = generateId()
    const after = Date.now()

    const parts = id.split('_')
    const timestamp = parseInt(parts[1], 10)

    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })
})

describe('Storage Constants', () => {
  it('MAX_SAVED_READINGS is reasonable', () => {
    const MAX_SAVED_READINGS = 50
    expect(MAX_SAVED_READINGS).toBeGreaterThan(0)
    expect(MAX_SAVED_READINGS).toBeLessThanOrEqual(100)
  })

  it('STORAGE_KEY is consistent', () => {
    const STORAGE_KEY = 'tarot_saved_readings'
    expect(STORAGE_KEY).toBe('tarot_saved_readings')
  })
})

// ───────────────────────── localStorage 저장/삭제 ─────────────────────────

function makeReadingInput(
  overrides: Partial<Omit<SavedTarotReading, 'id' | 'timestamp'>> = {}
): Omit<SavedTarotReading, 'id' | 'timestamp'> {
  return {
    question: '오늘의 운세는?',
    spread: { title: 'One Card', titleKo: '원 카드', cardCount: 1 },
    cards: [{ name: 'The Fool', nameKo: '바보', isReversed: false, position: '1번 카드' }],
    interpretation: { overallMessage: 'msg', guidance: 'guide', cardInsights: [] },
    categoryId: 'general',
    spreadId: 'one-card',
    ...overrides,
  }
}

describe('getSavedReadings / saveReading / deleteReading', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('저장된 것이 없으면 빈 배열을 반환한다', () => {
    expect(getSavedReadings()).toEqual([])
  })

  it('localStorage 가 깨진 JSON 이면 빈 배열로 복구한다 (throw 금지)', () => {
    localStorage.setItem('tarot_saved_readings', '{not valid json')
    expect(getSavedReadings()).toEqual([])
  })

  it('saveReading 은 id/timestamp 를 발급하고 storageOrigin 기본값은 local 이다', () => {
    const before = Date.now()
    const saved = saveReading(makeReadingInput())
    const after = Date.now()

    expect(saved.id).toMatch(/^tarot_\d+_[a-z0-9]+$/)
    expect(saved.timestamp).toBeGreaterThanOrEqual(before)
    expect(saved.timestamp).toBeLessThanOrEqual(after)
    expect(saved.storageOrigin).toBe('local')
  })

  it('명시한 storageOrigin(server) 은 보존한다', () => {
    const saved = saveReading(makeReadingInput({ storageOrigin: 'server' }))
    expect(saved.storageOrigin).toBe('server')
  })

  it('새 리딩은 목록 맨 앞에 추가된다 (최신순)', () => {
    saveReading(makeReadingInput({ question: '첫 번째' }))
    saveReading(makeReadingInput({ question: '두 번째' }))

    const readings = getSavedReadings()
    expect(readings).toHaveLength(2)
    expect(readings[0].question).toBe('두 번째')
    expect(readings[1].question).toBe('첫 번째')
  })

  it('50개 초과 시 가장 오래된 리딩을 잘라낸다', () => {
    for (let i = 0; i < 51; i++) {
      saveReading(makeReadingInput({ question: `질문 ${i}` }))
    }
    const readings = getSavedReadings()
    expect(readings).toHaveLength(50)
    expect(readings[0].question).toBe('질문 50') // 최신 유지
    expect(readings.some((r) => r.question === '질문 0')).toBe(false) // 최고(最古) 탈락
  })

  it('deleteReading 은 해당 id 만 지우고 true 를 반환한다', () => {
    const first = saveReading(makeReadingInput({ question: 'keep' }))
    const second = saveReading(makeReadingInput({ question: 'remove' }))

    expect(deleteReading(second.id)).toBe(true)
    const remaining = getSavedReadings()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(first.id)
  })

  it('존재하지 않는 id 삭제는 false 를 반환하고 목록을 건드리지 않는다', () => {
    saveReading(makeReadingInput())
    expect(deleteReading('no-such-id')).toBe(false)
    expect(getSavedReadings()).toHaveLength(1)
  })
})

// ───────────────────── sessionStorage 복원 페이로드 ─────────────────────

describe('reading restore payload (sessionStorage)', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  function makeSaved(overrides: Partial<SavedTarotReading> = {}): SavedTarotReading {
    return {
      id: 'tarot_1_abc',
      timestamp: 1700000000000,
      ...makeReadingInput(),
      ...overrides,
    }
  }

  it('store → load 라운드트립으로 동일한 리딩이 복원된다', () => {
    const reading = makeSaved()
    const key = storeReadingRestorePayload(reading)
    expect(key).toBeTruthy()
    expect(loadReadingRestorePayload(key)).toEqual(reading)
  })

  it('existingKey 를 넘기면 같은 슬롯을 덮어쓴다 (키 재사용)', () => {
    const key = storeReadingRestorePayload(makeSaved({ question: 'v1' }))
    const sameKey = storeReadingRestorePayload(makeSaved({ question: 'v2' }), key!)
    expect(sameKey).toBe(key)
    expect(loadReadingRestorePayload(key)?.question).toBe('v2')
  })

  it('없는 키 / null / undefined 키는 null 을 반환한다', () => {
    expect(loadReadingRestorePayload('missing-key')).toBeNull()
    expect(loadReadingRestorePayload(null)).toBeNull()
    expect(loadReadingRestorePayload(undefined)).toBeNull()
  })

  it('깨진 페이로드는 null 로 복구한다', () => {
    sessionStorage.setItem('tarot_restore_reading:bad', '{broken')
    expect(loadReadingRestorePayload('bad')).toBeNull()
  })

  it('updateRestorePayloadFollowup 은 followupTurns/clarifierCard 만 병합한다', () => {
    const reading = makeSaved({ question: '원본 질문' })
    const key = storeReadingRestorePayload(reading)!

    updateRestorePayloadFollowup(key, {
      followupTurns: [{ role: 'user', content: '더 알려줘' }],
      clarifierCard: { name: 'The Star', nameKo: '별', isReversed: false },
    })

    const updated = loadReadingRestorePayload(key)!
    expect(updated.question).toBe('원본 질문') // 본문 보존
    expect(updated.cards).toEqual(reading.cards)
    expect(updated.followupTurns).toEqual([{ role: 'user', content: '더 알려줘' }])
    expect(updated.clarifierCard).toEqual({ name: 'The Star', nameKo: '별', isReversed: false })
  })

  it('updateRestorePayloadFollowup 은 patch 에 없는 필드를 덮어쓰지 않는다', () => {
    const reading = makeSaved({
      followupTurns: [{ role: 'assistant', content: '기존 답변' }],
    })
    const key = storeReadingRestorePayload(reading)!

    updateRestorePayloadFollowup(key, {
      clarifierCard: { name: 'The Sun', isReversed: true },
    })

    const updated = loadReadingRestorePayload(key)!
    expect(updated.followupTurns).toEqual([{ role: 'assistant', content: '기존 답변' }])
    expect(updated.clarifierCard).toEqual({ name: 'The Sun', isReversed: true })
  })

  it('존재하지 않는 키에 대한 followup 갱신은 조용히 무시된다', () => {
    expect(() =>
      updateRestorePayloadFollowup('ghost', {
        followupTurns: [{ role: 'user', content: 'x' }],
      })
    ).not.toThrow()
    expect(loadReadingRestorePayload('ghost')).toBeNull()
  })
})

// ───────────────────── 서버 리딩 → SavedTarotReading 매핑 ─────────────────────

describe('mapServerReadingToSavedReading', () => {
  it('서버 row 의 모든 필드를 클라이언트 포맷으로 매핑한다', () => {
    const mapped = mapServerReadingToSavedReading({
      id: 'srv-1',
      createdAt: '2026-01-02T03:04:05.000Z',
      question: ' 연애운 봐줘 ',
      theme: 'love',
      spreadId: 'three-card',
      spreadTitle: 'Three Card',
      cards: [
        { name: 'The Fool', isReversed: false, position: 'Past' },
        { name: 'The Magician', isReversed: true, position: 'Present' },
      ],
      overallMessage: 'overall',
      guidance: 'guide',
      cardInsights: [{ position: 'Past', card_name: 'The Fool', interpretation: 'insight' }],
      clarifierCard: { name: 'The Star', isReversed: false },
      followupTurns: [{ role: 'user', content: 'q' }],
    })

    expect(mapped.id).toBe('srv-1')
    expect(mapped.timestamp).toBe(new Date('2026-01-02T03:04:05.000Z').getTime())
    expect(mapped.question).toBe('연애운 봐줘')
    expect(mapped.storageOrigin).toBe('server')
    expect(mapped.spread).toEqual({ title: 'Three Card', cardCount: 2 })
    expect(mapped.cards).toEqual([
      { name: 'The Fool', isReversed: false, position: 'Past' },
      { name: 'The Magician', isReversed: true, position: 'Present' },
    ])
    expect(mapped.interpretation).toEqual({
      overallMessage: 'overall',
      guidance: 'guide',
      cardInsights: [{ position: 'Past', cardName: 'The Fool', interpretation: 'insight' }],
    })
    expect(mapped.categoryId).toBe('love')
    expect(mapped.spreadId).toBe('three-card')
    expect(mapped.clarifierCard).toEqual({ name: 'The Star', isReversed: false })
    expect(mapped.followupTurns).toEqual([{ role: 'user', content: 'q' }])
  })

  it('빈 질문은 spreadTitle 로, 그것도 없으면 "Tarot reading" 으로 폴백한다', () => {
    const base = { id: 's', createdAt: '2026-01-01T00:00:00Z' }
    expect(
      mapServerReadingToSavedReading({ ...base, question: '  ', spreadTitle: 'Celtic Cross' })
        .question
    ).toBe('Celtic Cross')
    expect(mapServerReadingToSavedReading({ ...base, question: null }).question).toBe(
      'Tarot reading'
    )
  })

  it('잘못된 createdAt 은 현재 시각으로 폴백한다', () => {
    const before = Date.now()
    const mapped = mapServerReadingToSavedReading({ id: 's', createdAt: 'not-a-date' })
    expect(mapped.timestamp).toBeGreaterThanOrEqual(before)
    expect(Number.isFinite(mapped.timestamp)).toBe(true)
  })

  it('Date 객체 createdAt 도 지원한다', () => {
    const d = new Date('2025-12-25T00:00:00Z')
    expect(mapServerReadingToSavedReading({ id: 's', createdAt: d }).timestamp).toBe(d.getTime())
  })

  it('누락 필드들은 안전한 기본값으로 채운다', () => {
    const mapped = mapServerReadingToSavedReading({
      id: 's',
      createdAt: '2026-01-01T00:00:00Z',
      cards: [{}],
    })
    expect(mapped.spread.title).toBe('Tarot Reading')
    expect(mapped.cards).toEqual([{ name: 'Card 1', isReversed: false, position: 'Card 1' }])
    expect(mapped.interpretation.overallMessage).toBe('')
    expect(mapped.categoryId).toBe('general')
    expect(mapped.spreadId).toBe('')
    expect(mapped.clarifierCard).toBeNull()
    expect(mapped.followupTurns).toBeNull()
  })
})

// ───────────────────── formatReadingForSave 빈 질문 폴백 ─────────────────────

describe('formatReadingForSave question fallback', () => {
  it('빈 질문은 spread.titleKo 로 폴백한다', () => {
    const spread: Spread = {
      id: 'one',
      title: 'One Card',
      titleKo: '원 카드',
      description: '',
      descriptionKo: '',
      cardCount: 0,
      positions: [],
      categories: [],
    }
    const result = formatReadingForSave('   ', spread, [], null, 'general', 'one')
    expect(result.question).toBe('원 카드')
  })

  it('titleKo 도 없으면 title → "Tarot reading" 순서로 폴백한다', () => {
    const spread = {
      id: 'one',
      title: 'One Card',
      titleKo: '',
      description: '',
      descriptionKo: '',
      cardCount: 0,
      positions: [],
      categories: [],
    } as unknown as Spread
    expect(formatReadingForSave('', spread, [], null, 'g', 'one').question).toBe('One Card')

    const bare = { ...spread, title: '', titleKo: '' } as unknown as Spread
    expect(formatReadingForSave('', bare, [], null, 'g', 'one').question).toBe('Tarot reading')
  })
})

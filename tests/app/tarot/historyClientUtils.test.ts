import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getSavedReadings,
  deleteReading,
  storeReadingRestorePayload,
  formatRelativeTime,
  mapServerReadingToSavedReading,
  migrateLocalReadingsToServer,
  type SavedTarotReading,
} from '@/app/tarot/history/historyClientUtils'

const STORAGE_KEY = 'tarot_saved_readings'
const MIGRATION_FLAG = 'tarot_local_to_server_migrated_v1'
const RESTORE_PREFIX = 'tarot_restore_reading:'

const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

function makeReading(overrides: Partial<SavedTarotReading> = {}): SavedTarotReading {
  return {
    id: 'r1',
    timestamp: 1_700_000_000_000,
    question: '이직해도 될까요?',
    spread: { title: 'Three Card', cardCount: 1 },
    spreadId: 'past-present-future',
    categoryId: 'general-insight',
    cards: [{ name: 'The Fool', isReversed: false, position: '현재' }],
    interpretation: { overallMessage: 'hi', guidance: 'g', cardInsights: [] },
    ...overrides,
  }
}

describe('historyClientUtils', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    mockFetch.mockReset()
  })

  describe('getSavedReadings', () => {
    it('returns [] when storage is empty', () => {
      expect(getSavedReadings()).toEqual([])
    })

    it('parses stored readings', () => {
      const reading = makeReading()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([reading]))
      const got = getSavedReadings()
      expect(got).toHaveLength(1)
      expect(got[0].id).toBe('r1')
    })

    it('returns [] on corrupt JSON', () => {
      window.localStorage.setItem(STORAGE_KEY, '{broken')
      expect(getSavedReadings()).toEqual([])
    })
  })

  describe('deleteReading', () => {
    it('removes a reading and persists the rest', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([makeReading({ id: 'a' }), makeReading({ id: 'b' })])
      )
      expect(deleteReading('a')).toBe(true)
      const remaining = getSavedReadings()
      expect(remaining.map((r) => r.id)).toEqual(['b'])
    })

    it('returns false when id is not found', () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([makeReading({ id: 'a' })]))
      expect(deleteReading('nope')).toBe(false)
      expect(getSavedReadings()).toHaveLength(1)
    })

    it('returns false on empty storage', () => {
      expect(deleteReading('a')).toBe(false)
    })
  })

  describe('storeReadingRestorePayload', () => {
    it('writes a payload to sessionStorage under a generated key', () => {
      const reading = makeReading()
      const key = storeReadingRestorePayload(reading)
      expect(key).toBeTruthy()
      const raw = window.sessionStorage.getItem(`${RESTORE_PREFIX}${key}`)
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw!)
      expect(parsed.reading.id).toBe('r1')
      expect(typeof parsed.savedAt).toBe('number')
    })

    it('produces distinct keys across calls', () => {
      const k1 = storeReadingRestorePayload(makeReading())
      const k2 = storeReadingRestorePayload(makeReading())
      expect(k1).not.toBe(k2)
    })
  })

  describe('formatRelativeTime', () => {
    const now = 1_700_000_000_000

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(now)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('renders "just now" under a minute (ko/en)', () => {
      expect(formatRelativeTime(now - 30_000, true)).toBe('방금 전')
      expect(formatRelativeTime(now - 30_000, false)).toBe('Just now')
    })

    it('renders minutes', () => {
      expect(formatRelativeTime(now - 5 * 60_000, true)).toBe('5분 전')
      expect(formatRelativeTime(now - 5 * 60_000, false)).toBe('5 min ago')
    })

    it('renders hours', () => {
      expect(formatRelativeTime(now - 3 * 3_600_000, true)).toBe('3시간 전')
      expect(formatRelativeTime(now - 3 * 3_600_000, false)).toBe('3h ago')
    })

    it('renders days within a week', () => {
      expect(formatRelativeTime(now - 3 * 86_400_000, true)).toBe('3일 전')
      expect(formatRelativeTime(now - 3 * 86_400_000, false)).toBe('3d ago')
    })

    it('falls back to absolute date past a week (ko format)', () => {
      const ts = new Date('2023-01-15T10:00:00Z').getTime()
      vi.setSystemTime(new Date('2023-03-01T10:00:00Z'))
      const out = formatRelativeTime(ts, true)
      expect(out).toMatch(/2023년 1월 15일/)
    })

    it('falls back to absolute date past a week (en format)', () => {
      const ts = new Date('2023-01-15T10:00:00Z').getTime()
      vi.setSystemTime(new Date('2023-03-01T10:00:00Z'))
      const out = formatRelativeTime(ts, false)
      expect(out).toMatch(/2023/)
      expect(out).toMatch(/January|Jan/)
    })
  })

  describe('mapServerReadingToSavedReading', () => {
    it('maps a fully-populated server reading', () => {
      const mapped = mapServerReadingToSavedReading({
        id: 'srv1',
        createdAt: '2023-05-01T00:00:00.000Z',
        question: '  결혼운  ',
        theme: 'love',
        spreadId: 'past-present-future',
        spreadTitle: 'Three Card',
        cards: [{ name: 'The Sun', isReversed: true, position: 'past' }],
        questionContext: { question_summary: 'sum' },
        overallMessage: 'overall',
        guidance: 'guide',
        cardInsights: [{ position: 'past', card_name: 'The Sun', interpretation: 'i' }],
        clarifierCard: { name: 'The Moon', isReversed: false },
        followupTurns: [{ role: 'user', content: 'hi' }],
        source: 'standalone',
      })
      expect(mapped.id).toBe('srv1')
      expect(mapped.timestamp).toBe(new Date('2023-05-01T00:00:00.000Z').getTime())
      expect(mapped.question).toBe('결혼운') // trimmed
      expect(mapped.storageOrigin).toBe('server')
      expect(mapped.spread).toEqual({ title: 'Three Card', cardCount: 1 })
      expect(mapped.cards[0]).toEqual({ name: 'The Sun', isReversed: true, position: 'past' })
      expect(mapped.interpretation.overallMessage).toBe('overall')
      expect(mapped.interpretation.cardInsights[0].cardName).toBe('The Sun')
      expect(mapped.categoryId).toBe('love') // theme wins
      expect(mapped.clarifierCard?.name).toBe('The Moon')
      expect(mapped.followupTurns).toHaveLength(1)
      expect(mapped.source).toBe('standalone')
    })

    it('accepts a Date instance for createdAt', () => {
      const d = new Date('2023-06-01T00:00:00.000Z')
      const mapped = mapServerReadingToSavedReading({ id: 'x', createdAt: d })
      expect(mapped.timestamp).toBe(d.getTime())
    })

    it('falls back to now when createdAt is unparseable', () => {
      const mapped = mapServerReadingToSavedReading({ id: 'x', createdAt: 'not-a-date' })
      expect(Number.isFinite(mapped.timestamp)).toBe(true)
    })

    it('derives categoryId from spreadId when theme is absent', () => {
      // 'general-cross' belongs to the 'general-insight' theme.
      const mapped = mapServerReadingToSavedReading({
        id: 'x',
        createdAt: '2023-01-01',
        spreadId: 'general-cross',
      })
      expect(mapped.categoryId).toBe('general-insight')
    })

    it('falls back to first theme id for an unknown spreadId', () => {
      const mapped = mapServerReadingToSavedReading({
        id: 'x',
        createdAt: '2023-01-01',
        spreadId: 'totally-unknown-spread',
      })
      expect(mapped.categoryId).toBe('general-insight')
    })

    it('handles missing/empty optional fields with safe defaults', () => {
      const mapped = mapServerReadingToSavedReading({ id: 'x', createdAt: '2023-01-01' })
      expect(mapped.question).toBe('Tarot reading') // no question, no spreadTitle
      expect(mapped.spread).toEqual({ title: 'Tarot Reading', cardCount: 0 })
      expect(mapped.cards).toEqual([])
      expect(mapped.interpretation.overallMessage).toBe('')
      expect(mapped.interpretation.guidance).toBe('')
      expect(mapped.interpretation.cardInsights).toEqual([])
      expect(mapped.spreadId).toBe('')
      expect(mapped.clarifierCard).toBeNull()
      expect(mapped.followupTurns).toBeNull()
      expect(mapped.source).toBeUndefined()
      expect(mapped.questionAnalysis).toBeNull()
    })

    it('uses spreadTitle as the question when question is blank', () => {
      const mapped = mapServerReadingToSavedReading({
        id: 'x',
        createdAt: '2023-01-01',
        question: '   ',
        spreadTitle: 'Celtic Cross',
      })
      expect(mapped.question).toBe('Celtic Cross')
    })

    it('defaults card name/position by index when missing', () => {
      const mapped = mapServerReadingToSavedReading({
        id: 'x',
        createdAt: '2023-01-01',
        cards: [{ isReversed: false }, {}],
      })
      expect(mapped.cards[0]).toEqual({ name: 'Card 1', isReversed: false, position: 'Card 1' })
      expect(mapped.cards[1]).toEqual({ name: 'Card 2', isReversed: false, position: 'Card 2' })
    })

    it('coerces non-array cards/cardInsights to empty', () => {
      const mapped = mapServerReadingToSavedReading({
        id: 'x',
        createdAt: '2023-01-01',
        // @ts-expect-error intentionally wrong type
        cards: null,
        // @ts-expect-error intentionally wrong type
        cardInsights: 'oops',
      })
      expect(mapped.cards).toEqual([])
      expect(mapped.interpretation.cardInsights).toEqual([])
    })
  })

  describe('migrateLocalReadingsToServer', () => {
    function seed(readings: SavedTarotReading[]) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readings))
    }

    it('no-ops with the flag already set', async () => {
      window.localStorage.setItem(MIGRATION_FLAG, '123')
      const res = await migrateLocalReadingsToServer()
      expect(res).toEqual({ migrated: 0, failed: 0 })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('sets the flag and no-ops when there are no local readings', async () => {
      const res = await migrateLocalReadingsToServer()
      expect(res).toEqual({ migrated: 0, failed: 0 })
      expect(window.localStorage.getItem(MIGRATION_FLAG)).toBeTruthy()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('migrates all readings on success and clears local storage', async () => {
      seed([makeReading({ id: 'a' }), makeReading({ id: 'b' })])
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
      const res = await migrateLocalReadingsToServer()
      expect(res).toEqual({ migrated: 2, failed: 0 })
      expect(mockFetch).toHaveBeenCalledTimes(2)
      // success → local readings cleared + flag set
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
      expect(window.localStorage.getItem(MIGRATION_FLAG)).toBeTruthy()
    })

    it('preserves local data and does not set flag on partial failure', async () => {
      seed([makeReading({ id: 'a' }), makeReading({ id: 'b' })])
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      const res = await migrateLocalReadingsToServer()
      expect(res).toEqual({ migrated: 1, failed: 1 })
      // partial failure → keep local data, no flag.
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy()
      expect(window.localStorage.getItem(MIGRATION_FLAG)).toBeNull()
    })

    it('counts thrown fetches as failures', async () => {
      seed([makeReading({ id: 'a' })])
      mockFetch.mockRejectedValue(new Error('network'))
      const res = await migrateLocalReadingsToServer()
      expect(res).toEqual({ migrated: 0, failed: 1 })
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy()
    })

    it('defaults a missing spreadId to general-cross in the payload', async () => {
      seed([makeReading({ id: 'a', spreadId: '' })])
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
      await migrateLocalReadingsToServer()
      const [, init] = mockFetch.mock.calls[0]
      const body = JSON.parse(init.body)
      expect(body.spreadId).toBe('general-cross')
      expect(body.source).toBe('standalone')
      expect(body.cards[0].cardId).toBe('The Fool')
    })
  })
})

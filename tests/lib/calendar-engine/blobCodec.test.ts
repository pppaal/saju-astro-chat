import { describe, it, expect } from 'vitest'
import { encodeBlob, decodeBlob } from '@/lib/calendar-engine/blobCodec'

describe('blobCodec', () => {
  it('round-trips arrays (month cells shape)', () => {
    const cells = Array.from({ length: 31 }, (_, i) => ({
      datetime: `2026-07-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
      signals: [
        { id: `astro.transit.Saturn|Sun|square.2026-07-${i}`, korean: '토성 스퀘어', polarity: -1 },
      ],
      derivedScore: 50 + i,
    }))
    const encoded = encodeBlob(cells)
    expect(decodeBlob(encoded)).toEqual(cells)
  })

  it('round-trips objects (natal shape)', () => {
    const natal = { saju: { dayMaster: { name: '辛' } }, astro: { chart: { planets: [] } } }
    expect(decodeBlob(encodeBlob(natal))).toEqual(natal)
  })

  it('produces a tagged compressed wrapper, not the raw value', () => {
    const encoded = encodeBlob([1, 2, 3]) as { __c?: string; d?: string }
    expect(encoded.__c).toBe('br1')
    expect(typeof encoded.d).toBe('string')
  })

  it('passes through legacy uncompressed arrays (backward compat)', () => {
    const legacy = [{ datetime: '2026-07-01T00:00:00.000Z' }]
    expect(decodeBlob(legacy)).toBe(legacy)
  })

  it('passes through legacy uncompressed objects (backward compat)', () => {
    const legacy = { saju: { tag: 'natal' } }
    expect(decodeBlob(legacy)).toBe(legacy)
  })

  it('compresses redundant data far below the raw JSON size', () => {
    const cells = Array.from({ length: 31 }, () => ({
      datetime: '2026-07-01T00:00:00.000Z',
      signals: Array.from({ length: 180 }, (_, j) => ({
        id: `astro.transit.Saturn|Sun|square.2026-07-01#${j}`,
        korean: '토성이 본명 태양을 스퀘어로 압박하는 흐름',
        english: 'Saturn squares natal Sun',
        polarity: -1,
        weight: 0.8,
      })),
    }))
    const raw = JSON.stringify(cells).length
    const encoded = encodeBlob(cells) as { d: string }
    expect(encoded.d.length).toBeLessThan(raw / 5)
  })
})

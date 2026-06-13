/**
 * saju-natal-branch-relation extractor — 일진 지지 × 본명 4지지 충/육합/삼합/형/자형.
 *
 * Pure deterministic extractor (computeDayBranch + relation tables). Driven over
 * a 16-day window so the daily branch cycles through all 12 지지; with natal
 * branches {子,卯,辰,巳} every relation type is guaranteed to fire at least once.
 */
import extractor from '@/lib/calendar-engine/extractors/saju-natal-branch-relation'
import type { ExtractorContext, ActiveSignal } from '@/lib/calendar-engine/types'

function ctxWith(branches: { year: string; month: string; day: string; time: string } | null) {
  const pillars = branches
    ? {
        year: { earthlyBranch: { name: branches.year } },
        month: { earthlyBranch: { name: branches.month } },
        day: { earthlyBranch: { name: branches.day } },
        time: { earthlyBranch: { name: branches.time } },
      }
    : undefined
  const cache = (() => {
    const m = new Map<string, unknown>()
    return {
      get: <T>(k: string) => m.get(k) as T | undefined,
      set: <T>(k: string, v: T) => void m.set(k, v),
    }
  })()
  return {
    natal: { saju: pillars ? { pillars } : undefined },
    range: {
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-01-16T23:59:59.999Z',
      granularity: 'day',
    },
    cache,
  } as unknown as ExtractorContext
}

async function run(ctx: ExtractorContext): Promise<ActiveSignal[]> {
  return Promise.resolve(extractor.extract(ctx))
}

describe('sajuNatalBranchRelationExtractor', () => {
  it('declares the expected source/kind', () => {
    expect(extractor.source).toBe('saju')
    expect(extractor.kind).toBe('hyeongchung')
  })

  it('returns no signals when natal saju pillars are missing', async () => {
    expect(await run(ctxWith(null))).toEqual([])
  })

  it('returns no signals when all branches are empty strings', async () => {
    expect(await run(ctxWith({ year: '', month: '', day: '', time: '' }))).toEqual([])
  })

  it('fires every branch-relation type across a full 16-day window', async () => {
    const signals = await run(ctxWith({ year: '子', month: '卯', day: '辰', time: '巳' }))
    expect(signals.length).toBeGreaterThan(0)
    const relations = new Set(
      signals.map((s) => (s.evidence?.detail as { relation?: string } | undefined)?.relation)
    )
    expect(relations).toContain('chung')
    expect(relations).toContain('yukhap')
    expect(relations).toContain('hyung')
    expect(relations).toContain('samhap')
    expect(relations).toContain('hyung-self') // natal 辰 self-punishes on a 辰 day
  })

  it('maps each relation to the correct polarity', async () => {
    const signals = await run(ctxWith({ year: '子', month: '卯', day: '辰', time: '巳' }))
    const polarityByRelation: Record<string, number> = {
      chung: -2,
      yukhap: 1,
      hyung: -1,
      'hyung-self': -1,
      samhap: 1,
    }
    for (const s of signals) {
      const rel = (s.evidence?.detail as { relation?: string }).relation as string
      expect(s.polarity).toBe(polarityByRelation[rel])
    }
  })

  it('emits well-formed daily signals (id, layer, active window, module)', async () => {
    const signals = await run(ctxWith({ year: '子', month: '卯', day: '辰', time: '巳' }))
    for (const s of signals) {
      expect(s.source).toBe('saju')
      expect(s.kind).toBe('hyeongchung')
      expect(s.layer).toBe('daily')
      expect(s.id.startsWith('saju.natal-branch-relation.')).toBe(true)
      expect(typeof s.korean).toBe('string')
      expect(typeof s.weight).toBe('number')
      // active window is a single ISO day: start < peak < end
      expect(s.active.start < s.active.peak).toBe(true)
      expect(s.active.peak < s.active.end).toBe(true)
      expect(s.evidence?.module).toBe('saju-natal-branch-relation')
    }
  })

  it('marks a full 三合 (3/3) distinctly from a 반합 (2/3)', async () => {
    // natal 申·子·辰 all present → any 申子辰 day completes a full 삼합.
    const signals = await run(ctxWith({ year: '申', month: '子', day: '辰', time: '午' }))
    const samhaps = signals.filter(
      (s) => (s.evidence?.detail as { relation?: string }).relation === 'samhap'
    )
    expect(samhaps.length).toBeGreaterThan(0)
    expect(samhaps.some((s) => (s.evidence?.detail as { full?: boolean }).full === true)).toBe(true)
  })
})

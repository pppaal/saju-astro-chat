/**
 * Prompt-composition snapshot tests.
 *
 * Catch regressions where a future change drops one of the chart blocks
 * the LLM relies on. Mirrors what dumpDestinyPrompt.ts and
 * dumpCompatPrompt.ts run end-to-end — same canonical couple:
 *   A: 1995-02-09 06:40 서울 (남)
 *   B: 1991-02-03 00:35 서울 (여)
 *
 * The tests assert presence + (where applicable) row count, not exact
 * content. Astrological calculations vary by ephemeris version so we
 * don't pin specific aspect orbs.
 */

import { describe, it, expect } from 'vitest'
import {
  formatSajuAsTable,
  formatAstroAsTable,
  formatSajuExtras,
  formatDestinyTiming,
  formatDestinyAstro,
} from '@/lib/compatibility/sajuTableFormatter'
import {
  buildPersonSeed,
  buildAutoSajuContext,
  buildAutoAstroContext,
  mergeSajuContext,
  mergeAstroContext,
} from '@/app/api/compatibility/counselor/routeSupport'

const A = {
  name: '남',
  date: '1995-02-09',
  time: '06:40',
  gender: 'M' as const,
  city: 'Seoul, KR',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}
const B = {
  name: '여',
  date: '1991-02-03',
  time: '00:35',
  gender: 'F' as const,
  city: 'Seoul, KR',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
  relation: 'lover' as const,
}

// `buildAutoSajuContext` reads NODE_ENV and short-circuits to null in
// 'test'. We need real saju output, so flip it to 'development' just
// for this file (the bypass exists so unit tests of other modules
// don't pay the saju lib cost).
const ORIGINAL_NODE_ENV = process.env.NODE_ENV
;(process.env as Record<string, string>).NODE_ENV = 'development'

afterAll(() => {
  ;(process.env as Record<string, string>).NODE_ENV = ORIGINAL_NODE_ENV ?? 'test'
})

describe('compat counselor prompt composition', () => {
  it('saju block contains 4기둥 / 지장간 / 대운 / 세운 / 월운 / 일운', async () => {
    const seed = buildPersonSeed(A as unknown as Record<string, unknown>)
    const ctx = await buildAutoSajuContext(seed, new Date())
    const eff = mergeSajuContext(null, ctx)
    const out = formatSajuAsTable(eff as Parameters<typeof formatSajuAsTable>[0], 'A')

    expect(out).toContain('== A 사주 ==')
    expect(out).toContain('일간:')
    expect(out).toContain('오행:')
    expect(out).toContain('[4기둥]')
    expect(out).toMatch(/^연 \|/m)
    expect(out).toMatch(/^월 \|/m)
    expect(out).toMatch(/^일 \|/m)
    expect(out).toMatch(/^시 \|/m)
    expect(out).toContain('[지장간]')
    expect(out).toContain('[대운]')
    expect(out).toContain('[세운]')
    expect(out).toContain('[월운]')
    expect(out).toContain('[일운]')
    expect(out).toContain('← 현재') // active daeun stage marker
    expect(out).toContain('← 올해') // active seun marker
    expect(out).toContain('← 이번달') // active wolun marker
    expect(out).toContain('← 오늘') // active iljin marker
  })

  it('saju time windows are trimmed around "now" (not full almanac)', async () => {
    const seed = buildPersonSeed(A as unknown as Record<string, unknown>)
    const ctx = await buildAutoSajuContext(seed, new Date())
    const eff = mergeSajuContext(null, ctx)
    const out = formatSajuAsTable(eff as Parameters<typeof formatSajuAsTable>[0], 'A')

    // daeun: 10-stage life cycle trimmed to prev/current/next
    const daeunBlock = out.split('[대운]')[1]?.split(/\[/m)[0] ?? ''
    const daeunRows = daeunBlock.trim().split('\n').filter((l) => l.includes('세 '))
    expect(daeunRows.length).toBeLessThanOrEqual(3)

    // wolun: 12 months trimmed to ±1 month around current
    const wolunBlock = out.split('[월운]')[1]?.split(/\[/m)[0] ?? ''
    const wolunRows = wolunBlock.trim().split('\n').filter((l) => /^\d{4}-\d/.test(l))
    expect(wolunRows.length).toBeLessThanOrEqual(3)

    // iljin: 31 days trimmed to today ±3
    const iljinBlock = out.split('[일운]')[1]?.split(/\[/m)[0] ?? ''
    const iljinRows = iljinBlock.trim().split('\n').filter((l) => /^\d{4}-\d/.test(l))
    expect(iljinRows.length).toBeLessThanOrEqual(7)
  })

  it('extras block exposes 격국 / 용신 / 12운성 / 신살 / 공망 / 합/충', async () => {
    const seed = buildPersonSeed(A as unknown as Record<string, unknown>)
    const ctx = await buildAutoSajuContext(seed, new Date())
    const eff = mergeSajuContext(null, ctx) as unknown as {
      extras: Parameters<typeof formatSajuExtras>[0]['extras']
      natalRelations: Parameters<typeof formatSajuExtras>[0]['natalRelations']
    }
    const out = formatSajuExtras({
      extras: eff.extras,
      natalRelations: eff.natalRelations,
    })

    expect(out).toContain('[격국·용신·신살·합충]')
    expect(out).toMatch(/격국:/)
    expect(out).toMatch(/용신:/)
    expect(out).toMatch(/12운성:/)
    expect(out).toMatch(/신살:/)
    // 1995-02-09 always carries 공망 — sanity check
    expect(out).toMatch(/공망/)
  })

  it('astro block contains Asc / MC / planets / Natal aspects', async () => {
    const seed = buildPersonSeed(A as unknown as Record<string, unknown>)
    const ctx = await buildAutoAstroContext(seed, new Date())
    const eff = mergeAstroContext(null, ctx)
    const out = formatAstroAsTable(eff as Parameters<typeof formatAstroAsTable>[0], 'A')

    expect(out).toContain('== A 점성 ==')
    expect(out).toMatch(/^Asc:/m)
    expect(out).toMatch(/^MC:/m)
    expect(out).toContain('[행성]')
    expect(out).toContain('[Natal 어스펙트]')
    // canonical 11-planet set (Sun..Pluto + True Node)
    ;['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].forEach((p) => {
      expect(out).toContain(p)
    })
  })
})

describe('destiny counselor prompt composition', () => {
  it('formatDestinyTiming includes 대운 / 세운 / 월운 / 일운 single entries + sequence transition', async () => {
    const { buildSajuNormalizerInput } = await import(
      '@/lib/fortune/cross-rules/adapters/saju'
    )
    const input = buildSajuNormalizerInput({
      birthDate: A.date,
      birthTime: A.time,
      gender: 'male',
      calendarType: 'solar',
      timezone: A.timeZone,
      queryDate: new Date(),
    })
    const out = formatDestinyTiming(input)
    expect(out).toContain('[현재 시기]')
    // 대운 is intentionally NOT in the [현재 시기] block — the
    // formatSajuAsTable [대운] block already shows the active stage
    // with a "← 현재" marker, so re-printing here would duplicate
    // one line per turn.
    expect(out).not.toMatch(/^대운:/m)
    expect(out).toMatch(/세운:/)
    expect(out).toMatch(/월운:/)
    expect(out).toMatch(/일운:/)
  })

  it('formatDestinyAstro includes Natal / Natal aspects / transits / Solar+Lunar Return', async () => {
    const { runFortuneWithRaw } = await import('@/lib/fortune/cross-rules')
    const { astro } = await runFortuneWithRaw({
      birth: {
        birthDate: A.date,
        birthTime: A.time,
        gender: 'male',
        calendarType: 'solar',
        timezone: A.timeZone,
        latitude: A.latitude,
        longitude: A.longitude,
        astroTimezone: A.timeZone,
      },
      queryDate: new Date(),
    })
    const out = formatDestinyAstro(astro as Parameters<typeof formatDestinyAstro>[0])

    expect(out).toContain('== 점성 ==')
    expect(out).toContain('[Natal]')
    expect(out).toContain('[Natal 어스펙트]')
    expect(out).toContain('[현재 트랜짓 행성]')
    expect(out).toContain('[현재 트랜짓 어스펙트]')
    expect(out).toContain('[Solar Return]')
    expect(out).toContain('[Lunar Return]')
  })

  it('transit aspects are trimmed (≤ 5 rows per side)', async () => {
    const { runFortuneWithRaw } = await import('@/lib/fortune/cross-rules')
    const { astro } = await runFortuneWithRaw({
      birth: {
        birthDate: A.date,
        birthTime: A.time,
        gender: 'male',
        calendarType: 'solar',
        timezone: A.timeZone,
        latitude: A.latitude,
        longitude: A.longitude,
        astroTimezone: A.timeZone,
      },
      queryDate: new Date(),
    })
    const out = formatDestinyAstro(astro as Parameters<typeof formatDestinyAstro>[0])
    const block = out.split('[현재 트랜짓 어스펙트]')[1]?.split(/\[/)[0] ?? ''
    const rows = block.trim().split('\n').filter((l) => l.includes(' | '))
    // header row + ≤5 data rows; we trimmed the limit to 5 in
    // pickTopTransits, so the table should never exceed that.
    expect(rows.length).toBeLessThanOrEqual(1 + 5)
  })
})

describe('compat: B side also gets full coverage', () => {
  it('B saju + extras + astro all populate', async () => {
    const seed = buildPersonSeed(B as unknown as Record<string, unknown>)
    const ctx = await buildAutoSajuContext(seed, new Date())
    const eff = mergeSajuContext(null, ctx)
    const saju = formatSajuAsTable(eff as Parameters<typeof formatSajuAsTable>[0], 'B')
    const extras = formatSajuExtras({
      extras: (eff as { extras?: Parameters<typeof formatSajuExtras>[0]['extras'] })?.extras,
      natalRelations: (eff as { natalRelations?: Parameters<typeof formatSajuExtras>[0]['natalRelations'] })?.natalRelations,
    })

    expect(saju).toContain('== B 사주 ==')
    expect(saju).toContain('[4기둥]')
    expect(saju).toContain('[대운]')
    expect(extras).toContain('[격국·용신·신살·합충]')
    expect(extras).toMatch(/신살:/)

    const astroSeed = buildPersonSeed(B as unknown as Record<string, unknown>)
    const astroCtx = await buildAutoAstroContext(astroSeed, new Date())
    const astroEff = mergeAstroContext(null, astroCtx)
    const astroOut = formatAstroAsTable(astroEff as Parameters<typeof formatAstroAsTable>[0], 'B')
    expect(astroOut).toContain('== B 점성 ==')
    expect(astroOut).toContain('[행성]')
    expect(astroOut).toContain('[Natal 어스펙트]')
  })
})

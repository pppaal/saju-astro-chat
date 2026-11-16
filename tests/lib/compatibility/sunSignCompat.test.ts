// tests/lib/compatibility/sunSignCompat.test.ts
//
// Sun-sign compatibility engine + copy bank. Contracts: (1) 78 canonical slugs
// that round-trip through parse/canonicalise, (2) full symmetry — compute(A,B)
// deep-equals compute(B,A), (3) every score and every breakdown score in
// 0..100 and not all equal, (4) pinned values for three pairs so a weight
// change is a deliberate diff, (5) the copy is complete, English, placeholder-
// free, 40–70 words in the direct answer, and distinct across pairs.

import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SUN_SIGNS, getSunSignBySlug } from '@/lib/astrology/sunSigns'
import {
  allSignPairSlugs,
  bestMatchesFor,
  canonicalSignPairSlug,
  computeAllSunSignCompat,
  computeSunSignCompat,
  gradeForScore,
  parseSignPairSlug,
  relationForDistance,
  rulerRelationFor,
  signDistance,
} from '@/lib/compatibility/sunSignCompat'
import {
  buildSunSignCompatCopy,
  HUB_FAQ,
  HUB_INTRO,
  SIGN_PARTNER_LINE,
} from '@/lib/compatibility/sunSignCompatCopy'

const sign = (slug: string) => {
  const s = getSunSignBySlug(slug)
  if (!s) {
    throw new Error(`unknown sign ${slug}`)
  }
  return s
}

const aries = sign('aries')
const taurus = sign('taurus')
const gemini = sign('gemini')
const cancer = sign('cancer')
const leo = sign('leo')
const virgo = sign('virgo')
const libra = sign('libra')
const scorpio = sign('scorpio')

const wordCount = (s: string) => s.trim().split(/\s+/).length

describe('allSignPairSlugs', () => {
  it('returns 78 unique canonical slugs (12 same-sign + 66 distinct)', () => {
    const slugs = allSignPairSlugs()
    expect(slugs.length).toBe(78)
    expect(new Set(slugs).size).toBe(78)
    expect(slugs).toContain('aries-aries')
    expect(slugs).toContain('aries-pisces')
    expect(slugs).toContain('pisces-pisces')
    expect(slugs).not.toContain('pisces-aries')
  })

  it('every slug parses and is already canonical (lower index first)', () => {
    for (const slug of allSignPairSlugs()) {
      const parsed = parseSignPairSlug(slug)
      expect(parsed).not.toBeNull()
      const { a, b } = parsed!
      expect(a.index).toBeLessThanOrEqual(b.index)
      expect(canonicalSignPairSlug(a, b)).toBe(slug)
    }
  })
})

describe('canonicalSignPairSlug / parseSignPairSlug', () => {
  it('reversed order canonicalises to the same slug', () => {
    expect(canonicalSignPairSlug(aries, libra)).toBe('aries-libra')
    expect(canonicalSignPairSlug(libra, aries)).toBe('aries-libra')
    expect(canonicalSignPairSlug(leo, leo)).toBe('leo-leo')
  })

  it('reversed slugs parse (order as written) and round-trip to canonical', () => {
    const parsed = parseSignPairSlug('libra-aries')
    expect(parsed).toEqual({ a: libra, b: aries })
    expect(canonicalSignPairSlug(parsed!.a, parsed!.b)).toBe('aries-libra')
    expect(parseSignPairSlug('ARIES-Libra')).toEqual({ a: aries, b: libra })
  })

  it('rejects malformed slugs', () => {
    expect(parseSignPairSlug('')).toBeNull()
    expect(parseSignPairSlug('aries')).toBeNull()
    expect(parseSignPairSlug('aries-nope')).toBeNull()
    expect(parseSignPairSlug('aries-libra-leo')).toBeNull()
    expect(parseSignPairSlug('rat-ox')).toBeNull()
  })
})

describe('geometry helpers', () => {
  it('signDistance is the shortest way round the wheel', () => {
    expect(signDistance(aries, aries)).toBe(0)
    expect(signDistance(aries, taurus)).toBe(1)
    expect(signDistance(aries, sign('pisces'))).toBe(1)
    expect(signDistance(aries, libra)).toBe(6)
    expect(signDistance(taurus, scorpio)).toBe(6)
    expect(signDistance(aries, leo)).toBe(4)
  })

  it('relationForDistance maps 0..6', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(relationForDistance)).toEqual([
      'same',
      'semi-sextile',
      'sextile',
      'square',
      'trine',
      'quincunx',
      'opposition',
    ])
  })

  it('rulerRelationFor is symmetric and follows the table', () => {
    expect(rulerRelationFor('Mars', 'Mars')).toBe('same')
    expect(rulerRelationFor('Venus', 'Mars')).toBe('tense')
    expect(rulerRelationFor('Mars', 'Venus')).toBe('tense')
    expect(rulerRelationFor('Sun', 'Jupiter')).toBe('friendly')
    expect(rulerRelationFor('Mars', 'Mercury')).toBe('neutral')
    expect(rulerRelationFor('Saturn', 'Moon')).toBe('tense')
  })

  it('gradeForScore thresholds', () => {
    expect(gradeForScore(92).key).toBe('natural')
    expect(gradeForScore(85).key).toBe('natural')
    expect(gradeForScore(84).key).toBe('easy')
    expect(gradeForScore(70).key).toBe('spark')
    expect(gradeForScore(57).key).toBe('work')
    expect(gradeForScore(49).key).toBe('growth')
  })
})

describe('computeSunSignCompat', () => {
  it('is deterministic and fully symmetric for every pair', () => {
    for (const x of SUN_SIGNS) {
      for (const y of SUN_SIGNS) {
        const xy = computeSunSignCompat(x, y)
        const yx = computeSunSignCompat(y, x)
        expect(xy).toEqual(yx)
        expect(xy).toEqual(computeSunSignCompat(x, y))
      }
    }
  })

  it('keeps every score and breakdown score within 0..100, and scores are not all equal', () => {
    const all = computeAllSunSignCompat()
    expect(all.length).toBe(78)
    const scores = new Set<number>()
    for (const c of all) {
      expect(c.score).toBeGreaterThanOrEqual(0)
      expect(c.score).toBeLessThanOrEqual(100)
      expect(c.breakdown.length).toBe(4)
      for (const b of c.breakdown) {
        expect(b.score).toBeGreaterThanOrEqual(0)
        expect(b.score).toBeLessThanOrEqual(100)
        expect(b.rule.length).toBeGreaterThan(10)
      }
      scores.add(c.score)
    }
    expect(scores.size).toBeGreaterThan(10)
  })

  it('orders the classic angles sensibly: trine > sextile > opposition > square > quincunx', () => {
    const trine = computeSunSignCompat(aries, leo).score
    const sextile = computeSunSignCompat(aries, gemini).score
    const opposition = computeSunSignCompat(aries, libra).score
    const square = computeSunSignCompat(aries, cancer).score
    const quincunx = computeSunSignCompat(aries, virgo).score
    expect(trine).toBeGreaterThan(sextile)
    expect(sextile).toBeGreaterThan(opposition)
    expect(opposition).toBeGreaterThan(square)
    expect(square).toBeGreaterThan(quincunx)
  })

  it('every same-element pair (trine) grades as a natural fit', () => {
    for (const c of computeAllSunSignCompat()) {
      if (c.relation === 'trine') {
        expect(c.score).toBeGreaterThanOrEqual(85)
        expect(c.gradeKey).toBe('natural')
      }
    }
  })

  it('writes a receipt with the base line plus one line per factor', () => {
    const c = computeSunSignCompat(aries, libra)
    expect(c.receipt.map((r) => r.factor)).toEqual([
      'Sign distance',
      'Elements',
      'Modality',
      'Polarity',
      'Rulers',
    ])
    for (const r of c.receipt) {
      expect(r.detail.length).toBeGreaterThan(5)
      expect(r.effect.length).toBeGreaterThan(0)
    }
    expect(c.receipt[0].detail).toContain('6 signs apart')
    expect(c.receipt[4].detail).toContain('Mars')
    expect(c.receipt[4].detail).toContain('Venus')
  })

  it('returns a and b in canonical order whatever the input order', () => {
    const c = computeSunSignCompat(libra, aries)
    expect(c.a.slug).toBe('aries')
    expect(c.b.slug).toBe('libra')
    expect(c.slug).toBe('aries-libra')
  })

  // Pinned values — a change here must be a deliberate re-weighting.
  it('snapshot: Aries–Libra (opposition, tense rulers)', () => {
    const c = computeSunSignCompat(aries, libra)
    expect({
      score: c.score,
      gradeKey: c.gradeKey,
      relation: c.relation,
      elementPairing: c.elementPairing,
      modalityPairing: c.modalityPairing,
      polarityMatch: c.polarityMatch,
      rulerRelation: c.rulerRelation,
      breakdown: c.breakdown.map((b) => [b.key, b.score]),
    }).toEqual({
      score: 70,
      gradeKey: 'spark',
      relation: 'opposition',
      elementPairing: 'compatible',
      modalityPairing: 'same',
      polarityMatch: true,
      rulerRelation: 'tense',
      breakdown: [
        ['chemistry', 99],
        ['communication', 64],
        ['values', 56],
        ['longTerm', 60],
      ],
    })
  })

  it('snapshot: Taurus–Virgo (trine, friendly rulers)', () => {
    const c = computeSunSignCompat(taurus, virgo)
    expect({
      score: c.score,
      gradeKey: c.gradeKey,
      relation: c.relation,
      rulerRelation: c.rulerRelation,
      breakdown: c.breakdown.map((b) => [b.key, b.score]),
    }).toEqual({
      score: 93,
      gradeKey: 'natural',
      relation: 'trine',
      rulerRelation: 'friendly',
      breakdown: [
        ['chemistry', 84],
        ['communication', 93],
        ['values', 99],
        ['longTerm', 98],
      ],
    })
  })

  it('snapshot: Gemini–Scorpio (quincunx, neutral rulers)', () => {
    const c = computeSunSignCompat(gemini, scorpio)
    expect({
      score: c.score,
      gradeKey: c.gradeKey,
      relation: c.relation,
      rulerRelation: c.rulerRelation,
      breakdown: c.breakdown.map((b) => [b.key, b.score]),
    }).toEqual({
      score: 51,
      gradeKey: 'growth',
      relation: 'quincunx',
      rulerRelation: 'neutral',
      breakdown: [
        ['chemistry', 60],
        ['communication', 46],
        ['values', 43],
        ['longTerm', 52],
      ],
    })
  })
})

describe('bestMatchesFor', () => {
  it('returns the top three other signs, highest first, excluding the sign itself', () => {
    const best = bestMatchesFor(aries)
    expect(best.length).toBe(3)
    expect(best.map((m) => m.other.slug)).not.toContain('aries')
    expect(best[0].score).toBeGreaterThanOrEqual(best[1].score)
    expect(best[1].score).toBeGreaterThanOrEqual(best[2].score)
    // Aries' trines lead.
    expect(
      best
        .slice(0, 2)
        .map((m) => m.other.slug)
        .sort()
    ).toEqual(['leo', 'sagittarius'])
  })

  it('can include the same sign and honours count', () => {
    const best = bestMatchesFor(leo, { count: 12, includeSame: true })
    expect(best.length).toBe(12)
    expect(best.some((m) => m.other.slug === 'leo')).toBe(true)
  })
})

describe('buildSunSignCompatCopy', () => {
  const all = computeAllSunSignCompat().map((c) => ({ c, copy: buildSunSignCompatCopy(c) }))

  it('fills every field for all 78 pairs with no placeholders, undefined or Hangul', () => {
    for (const { copy } of all) {
      const text = JSON.stringify(copy)
      expect(text).not.toMatch(/\{\w+\}/)
      expect(text).not.toContain('undefined')
      expect(text).not.toMatch(/[가-힣]/)
      for (const field of [
        'directAnswer',
        'headline',
        'clicks',
        'rubs',
        'inLove',
        'friendsWork',
      ] as const) {
        expect(copy[field].trim().length).toBeGreaterThan(20)
      }
      expect(copy.tips.length).toBe(3)
      expect(copy.faq.length).toBe(3)
      expect(copy.partnerLines.length).toBeGreaterThanOrEqual(1)
      expect(copy.partnerLines.length).toBeLessThanOrEqual(2)
      for (const line of copy.partnerLines) {
        expect(line.startsWith('As a partner, ')).toBe(true)
      }
    }
  })

  it('direct answer is a quotable 40–70 words that names both signs and the score', () => {
    for (const { c, copy } of all) {
      const n = wordCount(copy.directAnswer)
      expect(n).toBeGreaterThanOrEqual(40)
      expect(n).toBeLessThanOrEqual(70)
      expect(copy.directAnswer).toContain(c.a.name)
      expect(copy.directAnswer).toContain(c.b.name)
      expect(copy.directAnswer).toContain(`${c.score}/100`)
    }
  })

  it('no two pairs share a paragraph', () => {
    for (const field of ['directAnswer', 'clicks', 'rubs', 'inLove', 'friendsWork'] as const) {
      const texts = all.map(({ copy }) => copy[field])
      expect(new Set(texts).size).toBe(texts.length)
    }
  })

  it('avoids doom language', () => {
    const banned =
      /\b(danger|disaster|doomed|will lose|death|lawsuit|scientifically proven|most accurate)\b/i
    for (const { copy } of all) {
      expect(JSON.stringify(copy)).not.toMatch(banned)
    }
  })

  it('FAQ asks the three required questions', () => {
    const { copy } = all.find(({ c }) => c.slug === 'aries-libra')!
    expect(copy.faq[0].question).toBe('Are Aries and Libra compatible?')
    expect(copy.faq[0].answer).toContain('70 out of 100')
    expect(copy.faq[1].question).toBe('What is the best match for Aries?')
    expect(copy.faq[1].answer).toContain('Leo')
    expect(copy.faq[2].question).toMatch(/matters more than sun signs/i)
  })

  it('same-sign pairs read naturally', () => {
    const { copy } = all.find(({ c }) => c.slug === 'leo-leo')!
    expect(copy.faq[0].question).toBe('Are two Leo partners compatible?')
    expect(copy.partnerLines.length).toBe(1)
    expect(copy.directAnswer).toContain('Leo and Leo')
  })

  it('has a partner line for every sign and a 4-question hub FAQ', () => {
    for (const s of SUN_SIGNS) {
      expect(SIGN_PARTNER_LINE[s.slug]).toContain(`As a partner, ${s.name}`)
    }
    expect(HUB_FAQ.length).toBe(4)
    const n = wordCount(HUB_INTRO)
    expect(n).toBeGreaterThanOrEqual(40)
    expect(n).toBeLessThanOrEqual(70)
  })
})

// ── Page render smoke (server components rendered to static markup) ──

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'
const count = (html: string, re: RegExp) => (html.match(re) || []).length

describe('/compatibility/signs pages render', () => {
  it('hub: one h1, 12×12 grid of pair links, visible FAQ mirrored in JSON-LD', async () => {
    const mod = await import('@/app/(seo)/compatibility/signs/page')
    const html = renderToStaticMarkup((await mod.default()) as ReactElement)
    expect(count(html, /<h1[\s>]/g)).toBe(1)
    expect(count(html, /application\/ld\+json/g)).toBe(3)
    expect(html).toContain('Frequently asked questions')
    for (const f of HUB_FAQ) {
      expect(html).toContain(f.question)
    }
    expect(count(html, /href="\/compatibility\/signs\/[a-z]+-[a-z]+"/g)).toBeGreaterThanOrEqual(144)
    expect(html).toContain('href="/compatibility/signs/aries-aries"')
    expect(html).toContain('href="/compatibility/signs/aries-pisces"')
    expect(html).not.toContain('href="/compatibility/signs/pisces-aries"')
    expect(html).toContain('href="/compatibility/free"')
    expect(html).toContain('href="/horoscope/aries"')
    expect(html).toContain('How this is computed')
    expect(html).not.toContain('<main')

    const meta = await mod.generateMetadata()
    expect(meta.alternates?.canonical).toBe(`${baseUrl}/compatibility/signs`)
  })

  it('pair: reversed slug 301s to the canonical (lower index first) slug', async () => {
    const mod = await import('@/app/(seo)/compatibility/signs/[pair]/page')
    const params = Promise.resolve({ pair: 'libra-aries' })
    let digest = ''
    try {
      await mod.default({ params })
    } catch (e) {
      digest = String((e as { digest?: string }).digest ?? e)
    }
    expect(digest).toContain('NEXT_REDIRECT')
    expect(digest).toContain('/compatibility/signs/aries-libra')
  })

  it('pair: canonical slug renders with canonical URL, sections, FAQ and links', async () => {
    const mod = await import('@/app/(seo)/compatibility/signs/[pair]/page')
    const params = Promise.resolve({ pair: 'aries-libra' })
    const html = renderToStaticMarkup((await mod.default({ params })) as ReactElement)
    expect(count(html, /<h1[\s>]/g)).toBe(1)
    expect(html).toContain('Aries and Libra Compatibility')
    expect(count(html, /application\/ld\+json/g)).toBe(3)
    for (const heading of [
      'Where it clicks',
      'Where it rubs',
      'In love',
      'As friends or colleagues',
      'Make it work',
      'Breakdown',
      'How this is computed',
      'Frequently asked questions',
    ]) {
      expect(html).toContain(heading)
    }
    expect(html).toContain('Are Aries and Libra compatible?')
    expect(html).toContain('href="/horoscope/aries"')
    expect(html).toContain('href="/horoscope/libra"')
    expect(html).toContain('href="/compatibility/free"')
    expect(html).toContain('href="/compatibility/signs"')
    // 11 other pairs for each sign, no self-link.
    expect(count(html, /href="\/compatibility\/signs\/[a-z]+-[a-z]+"/g)).toBe(22)
    expect(html).not.toContain('href="/compatibility/signs/aries-libra"')
    expect(html).not.toContain('<main')

    const meta = await mod.generateMetadata({ params: Promise.resolve({ pair: 'libra-aries' }) })
    expect(meta.alternates?.canonical).toBe(`${baseUrl}/compatibility/signs/aries-libra`)
    const languages = (meta.alternates?.languages ?? {}) as Record<string, string>
    expect(Object.keys(languages).sort()).toEqual(['en-US', 'x-default'])
    expect(String(meta.title)).toContain('Aries and Libra Compatibility')
    expect(String(meta.description).length).toBeLessThanOrEqual(160)
  })

  it('pair: same-sign page renders one partner line and one "more matches" list', async () => {
    const mod = await import('@/app/(seo)/compatibility/signs/[pair]/page')
    const html = renderToStaticMarkup(
      (await mod.default({ params: Promise.resolve({ pair: 'leo-leo' }) })) as ReactElement
    )
    expect(count(html, /<h1[\s>]/g)).toBe(1)
    expect(html).toContain('Leo and Leo Compatibility')
    expect(count(html, /As a partner, Leo/g)).toBe(1)
    expect(count(html, /href="\/compatibility\/signs\/[a-z]+-[a-z]+"/g)).toBe(11)
    expect(html).not.toContain('href="/compatibility/signs/leo-leo"')
  })

  it('pair: unknown slug is noindex and not found', async () => {
    const mod = await import('@/app/(seo)/compatibility/signs/[pair]/page')
    const meta = await mod.generateMetadata({ params: Promise.resolve({ pair: 'rat-ox' }) })
    expect(meta.robots).toEqual({ index: false, follow: false })
    await expect(mod.default({ params: Promise.resolve({ pair: 'rat-ox' }) })).rejects.toThrow()
  })
})

// Sun-sign compatibility hub — /compatibility/signs.
//
// English-only programmatic SEO surface. A 12×12 grid links every one of the
// 78 canonical pair pages (same sign on the diagonal), the "best matches"
// list is computed by the deterministic engine (sunSignCompat.ts), and the
// visible FAQ is mirrored in FAQPage JSON-LD. No LLM, no clock: the content is
// a pure function of the shared sign table. The /ko variant is noindex via
// generateEnglishOnlyMetadata.

import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateEnglishOnlyMetadata, generateJsonLd, getServerLocale } from '@/components/seo/SEO'
import { SUN_SIGNS } from '@/lib/astrology/sunSigns'
import { bestMatchesFor, computeSunSignCompat, DIMENSIONS } from '@/lib/compatibility/sunSignCompat'
import { HUB_FAQ, HUB_INTRO } from '@/lib/compatibility/sunSignCompatCopy'
import styles from './signs.module.css'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'
const pageUrl = `${baseUrl}/compatibility/signs`

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateEnglishOnlyMetadata(
    {
      title: 'Zodiac Sign Compatibility — All 78 Sun-Sign Pairs Scored',
      description:
        'Compatibility for every pair of zodiac signs, scored 0–100 from sign distance, element, modality, polarity and ruling planets. Deterministic, with the arithmetic shown. Pick two signs.',
      keywords: [
        'zodiac compatibility',
        'zodiac sign compatibility',
        'sun sign compatibility',
        'astrology compatibility chart',
        'which zodiac signs are compatible',
        'love compatibility by zodiac sign',
      ],
      canonicalUrl: pageUrl,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

function tintForScore(score: number): { fg: string; bg: string } {
  if (score >= 85) {
    return { fg: '#2f7d4f', bg: 'rgba(47,125,79,0.12)' }
  }
  if (score >= 75) {
    return { fg: '#4f7d2f', bg: 'rgba(79,125,47,0.12)' }
  }
  if (score >= 65) {
    return { fg: '#8a7a2f', bg: 'rgba(169,131,59,0.14)' }
  }
  if (score >= 55) {
    return { fg: '#a9683b', bg: 'rgba(169,104,59,0.12)' }
  }
  return { fg: '#a94b3b', bg: 'rgba(169,75,59,0.12)' }
}

export default async function SunSignCompatHubPage() {
  // 144 cells (12×12); the engine is pure arithmetic so this is cheap.
  const grid = SUN_SIGNS.map((row) => SUN_SIGNS.map((col) => computeSunSignCompat(row, col)))
  const best = SUN_SIGNS.map((s) => ({ sign: s, matches: bestMatchesFor(s, { count: 3 }) }))

  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Zodiac Sign Compatibility — All 78 Pairs',
    description:
      'Compatibility scores for every pair of the 12 zodiac signs, computed from sign distance, elements, modalities, polarity and ruling planets.',
    url: pageUrl,
  })
  const breadcrumbJsonLd = generateJsonLd({
    type: 'BreadcrumbList',
    breadcrumbs: [
      { name: 'Home', url: '' },
      { name: 'Compatibility', url: '/compatibility' },
      { name: 'Zodiac Sign Compatibility', url: '/compatibility/signs' },
    ],
  })
  const faqJsonLd = generateJsonLd({ type: 'FAQPage', faqs: HUB_FAQ })

  return (
    <article className={styles.page}>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={faqJsonLd} />
      <div className={`${styles.inner} ${styles.wide}`}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          {' · '}
          <Link href="/compatibility">Compatibility</Link>
          {' · '}
          <span className={styles.crumbCurrent}>Zodiac signs</span>
        </nav>

        <h1 className={styles.h1}>Zodiac Sign Compatibility</h1>
        <p className={styles.sub}>All 78 sun-sign pairs, scored 0–100 by one fixed rule set</p>

        <p className={styles.lede}>{HUB_INTRO}</p>

        <section aria-labelledby="grid-heading">
          <h2 id="grid-heading" className={styles.h2}>
            Pick two signs
          </h2>
          <p className={styles.small} style={{ margin: '0 0 12px' }}>
            Find your sign in the left column and read across. Each cell is the pair’s score; the
            dashed diagonal is a sign with itself. Tap a cell for the full reading.
          </p>
          <div className={styles.gridWrap}>
            <table className={styles.grid}>
              <thead>
                <tr>
                  <th aria-label="Your sign" />
                  {SUN_SIGNS.map((s) => (
                    <th key={s.slug} scope="col" title={s.name}>
                      <span className={styles.gridGlyph} aria-hidden="true">
                        {s.glyph}
                      </span>
                      <span style={{ position: 'absolute', left: -9999 }}>{s.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUN_SIGNS.map((row, i) => (
                  <tr key={row.slug}>
                    <th scope="row" style={{ textAlign: 'left' }}>
                      <Link href={`/horoscope/${row.slug}`} title={`${row.name} horoscope today`}>
                        <span className={styles.gridGlyph} aria-hidden="true">
                          {row.glyph}
                        </span>{' '}
                        {row.name}
                      </Link>
                    </th>
                    {grid[i].map((c, j) => {
                      const col = SUN_SIGNS[j]
                      const tint = tintForScore(c.score)
                      return (
                        <td key={col.slug}>
                          <Link
                            href={`/compatibility/signs/${c.slug}`}
                            className={`${styles.cell}${i === j ? ` ${styles.cellSame}` : ''}`}
                            style={{ color: tint.fg, background: tint.bg }}
                            aria-label={`${row.name} and ${col.name} compatibility, ${c.score} out of 100`}
                            title={`${row.name} & ${col.name}: ${c.score}/100 — ${c.gradeLabel}`}
                          >
                            {c.score}
                          </Link>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.small}>
            Color key: green 85+ natural fit · olive 75–84 easy rapport · gold 65–74 spark with
            friction · amber 55–64 takes real work · red below 55 growth pairing.
          </p>
        </section>

        <section aria-labelledby="best-heading">
          <h2 id="best-heading" className={styles.h2}>
            Best matches for each sign
          </h2>
          <p className={styles.small} style={{ margin: '0 0 14px' }}>
            The three highest-scoring other signs for each sun sign, by this engine. Trines (same
            element) lead almost everywhere; a sextile with friendly ruling planets can edge in.
          </p>
          <ul className={styles.bestList}>
            {best.map(({ sign, matches }) => (
              <li key={sign.slug}>
                <strong>
                  <span aria-hidden="true">{sign.glyph}</span> {sign.name}
                </strong>
                {' — '}
                {matches.map((m, idx) => (
                  <span key={m.slug}>
                    <Link href={`/compatibility/signs/${m.slug}`}>
                      {m.other.name} ({m.score})
                    </Link>
                    {idx < matches.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.card} aria-labelledby="method-heading">
          <h2 id="method-heading" className={styles.h3} style={{ marginTop: 0 }}>
            How this is computed
          </h2>
          <ul className={styles.receipt}>
            <li>
              <span className={styles.receiptFactor}>Sign distance</span> — how many signs apart the
              two are (0–6): same sign, semi-sextile, sextile, square, trine, quincunx or
              opposition. Sets the base for all four dimensions.
            </li>
            <li>
              <span className={styles.receiptFactor}>Elements</span> — Fire, Earth, Air, Water from
              the shared sign table; same element, compatible (Fire+Air, Earth+Water) or
              challenging, with a rule for each of the ten element pairs.
            </li>
            <li>
              <span className={styles.receiptFactor}>Modality</span> — Cardinal, Fixed or Mutable;
              same modality adds heat and competition, different modalities share the load.
            </li>
            <li>
              <span className={styles.receiptFactor}>Polarity</span> — both outward, both receptive,
              or mixed.
            </li>
            <li>
              <span className={styles.receiptFactor}>Rulers</span> — the traditional ruling planets
              of the two signs: the same planet, friendly, neutral, or in tension (planets that rule
              opposite signs, or the two traditional malefics together).
            </li>
            <li>
              <span className={styles.receiptFactor}>Score</span> —{' '}
              {DIMENSIONS.map(
                (d) => `${Math.round(d.weight * 100)}% ${d.label.toLowerCase()}`
              ).join(' + ')}
              , each 0–100, rounded. Every pair page shows its own receipt line by line.
            </li>
          </ul>
        </section>

        <section className={styles.cta} aria-labelledby="cta-heading">
          <h2 id="cta-heading" className={styles.h3} style={{ marginTop: 0 }}>
            Sun signs are one of about twenty factors
          </h2>
          <p className={styles.small} style={{ margin: 0 }}>
            A full compatibility reading compares two complete birth charts — Moon, Venus, Mars,
            rising sign and the aspects between them — plus the Korean Four Pillars. The free report
            needs two birth dates and no login.
          </p>
          <p className={styles.ctaLinks}>
            <Link href="/compatibility/free">Compare two full charts free →</Link>
            <Link href="/horoscope">Today’s horoscope for every sign →</Link>
            <Link href="/method">How readings are computed →</Link>
          </p>
        </section>

        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading" className={styles.h2}>
            Frequently asked questions
          </h2>
          <dl className={styles.faq}>
            {HUB_FAQ.map((f) => (
              <div key={f.question}>
                <dt>{f.question}</dt>
                <dd>{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className={styles.disclosure}>
          For reflection and entertainment. Scores come from a fixed rule set, not from AI, and are
          not advice about any real relationship. Sign dates, elements and rulers follow the
          tropical zodiac.
        </p>
      </div>
    </article>
  )
}

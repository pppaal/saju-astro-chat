// Sun-sign compatibility pair page — /compatibility/signs/[pair], e.g. aries-libra.
//
// Programmatic SEO page for "aries and libra compatibility" queries. Numbers
// and factors come from the deterministic engine (sunSignCompat.ts); the prose
// is picked from the text bank (sunSignCompatCopy.ts) by the same factors.
// Evergreen, English-only, no LLM. URL symmetry: a reversed slug (libra-aries)
// 301s to the canonical slug (lower index first) so only one URL is indexed.
// Unknown slugs → notFound() and a noindex metadata object.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateEnglishOnlyMetadata, generateJsonLd, getServerLocale } from '@/components/seo/SEO'
import { SUN_SIGNS, type SunSign } from '@/lib/astrology/sunSigns'
import {
  canonicalSignPairSlug,
  computeSunSignCompat,
  DIMENSIONS,
  parseSignPairSlug,
  type SunSignCompat,
} from '@/lib/compatibility/sunSignCompat'
import { buildSunSignCompatCopy } from '@/lib/compatibility/sunSignCompatCopy'
import styles from '../signs.module.css'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

type Props = {
  params: Promise<{ pair: string }>
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text
  }
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max).replace(/[,;:—-]$/, '')}…`
}

function pairTitle(c: SunSignCompat): string {
  return `${c.a.name} and ${c.b.name} Compatibility`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params
  const parsed = parseSignPairSlug(pair)
  if (!parsed) {
    return { title: 'Not Found', robots: { index: false, follow: false } }
  }
  const locale = await getServerLocale()
  const c = computeSunSignCompat(parsed.a, parsed.b)
  const copy = buildSunSignCompatCopy(c)
  const a = c.a.name.toLowerCase()
  const b = c.b.name.toLowerCase()
  return generateEnglishOnlyMetadata(
    {
      title: `${pairTitle(c)} — ${c.score}/100, ${c.gradeLabel}`,
      description: truncate(copy.directAnswer, 158),
      keywords: [
        `${a} and ${b} compatibility`,
        `${a} ${b} compatibility`,
        `${b} and ${a} compatibility`,
        `${a} ${b} love match`,
        'zodiac sign compatibility',
        'sun sign compatibility',
      ],
      canonicalUrl: `${baseUrl}/compatibility/signs/${c.slug}`,
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

function OtherPairs({ sign, exclude }: { sign: SunSign; exclude: SunSign }) {
  return (
    <ul className={styles.pills}>
      {/* The other 11 pairs for this sign: every partner except the one on this page. */}
      {SUN_SIGNS.filter((s) => s.slug !== exclude.slug).map((s) => {
        const c = computeSunSignCompat(sign, s)
        return (
          <li key={s.slug}>
            <Link href={`/compatibility/signs/${c.slug}`} className={styles.pill}>
              <span aria-hidden="true">
                {sign.glyph}
                {s.glyph}
              </span>{' '}
              {sign.name} & {s.name} · {c.score}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export default async function SunSignCompatPairPage({ params }: Props) {
  const { pair } = await params
  const parsed = parseSignPairSlug(pair)
  if (!parsed) {
    notFound()
  }
  // Reversed order (leo-aries) is a duplicate of the canonical page: 301 to it
  // so crawlers never see two URLs with the same content.
  const canonicalSlug = canonicalSignPairSlug(parsed.a, parsed.b)
  if (pair !== canonicalSlug) {
    permanentRedirect(`/compatibility/signs/${canonicalSlug}`)
  }
  const c = computeSunSignCompat(parsed.a, parsed.b)
  const copy = buildSunSignCompatCopy(c)
  const { a, b } = c
  const sameSign = a.index === b.index
  const tint = tintForScore(c.score)
  const pageUrl = `${baseUrl}/compatibility/signs/${canonicalSlug}`

  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: pairTitle(c),
    description: copy.directAnswer,
    url: pageUrl,
  })
  const breadcrumbJsonLd = generateJsonLd({
    type: 'BreadcrumbList',
    breadcrumbs: [
      { name: 'Home', url: '' },
      { name: 'Compatibility', url: '/compatibility' },
      { name: 'Zodiac Sign Compatibility', url: '/compatibility/signs' },
      { name: `${a.name} & ${b.name}`, url: `/compatibility/signs/${canonicalSlug}` },
    ],
  })
  const faqJsonLd = generateJsonLd({ type: 'FAQPage', faqs: copy.faq })

  return (
    <article className={styles.page}>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={faqJsonLd} />
      <div className={styles.inner}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          {' · '}
          <Link href="/compatibility/signs">Zodiac signs</Link>
          {' · '}
          <span className={styles.crumbCurrent}>
            {a.name} & {b.name}
          </span>
        </nav>

        <h1 className={styles.h1}>
          <span aria-hidden="true">
            {a.glyph}
            {b.glyph}
          </span>{' '}
          {pairTitle(c)}
        </h1>
        <p className={styles.sub}>
          {a.name} ({a.dates.from} – {a.dates.to}, {a.element}, {a.modality}) ·{' '}
          {sameSign ? 'with another ' : ''}
          {b.name} ({b.dates.from} – {b.dates.to}, {b.element}, {b.modality})
        </p>

        <div className={styles.scoreRow}>
          <span
            className={styles.scoreBadge}
            style={{ color: tint.fg, background: tint.bg, border: `1px solid ${tint.fg}33` }}
          >
            <span style={{ fontSize: 28 }}>{c.score}</span>
            <span style={{ fontSize: 14 }}>/100</span>
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: tint.fg }}>{c.gradeLabel}</span>
          <span className={styles.small}>{c.relationLabel}</span>
        </div>

        <p className={styles.lede}>{copy.directAnswer}</p>

        <section aria-labelledby="clicks-heading">
          <h2 id="clicks-heading" className={styles.h2}>
            Where it clicks
          </h2>
          <p className={styles.para}>{copy.clicks}</p>
        </section>

        <section aria-labelledby="rubs-heading">
          <h2 id="rubs-heading" className={styles.h2}>
            Where it rubs
          </h2>
          <p className={styles.para}>{copy.rubs}</p>
        </section>

        <section aria-labelledby="love-heading">
          <h2 id="love-heading" className={styles.h2}>
            In love
          </h2>
          <p className={styles.para}>{copy.inLove}</p>
          {copy.partnerLines.map((line) => (
            <p key={line} className={styles.small} style={{ margin: '0 0 8px' }}>
              {line}
            </p>
          ))}
        </section>

        <section aria-labelledby="friends-heading">
          <h2 id="friends-heading" className={styles.h2}>
            As friends or colleagues
          </h2>
          <p className={styles.para}>{copy.friendsWork}</p>
        </section>

        <section className={styles.card} aria-labelledby="tips-heading">
          <h2 id="tips-heading" className={styles.h3} style={{ marginTop: 0 }}>
            Make it work
          </h2>
          <ol className={styles.tips}>
            {copy.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="breakdown-heading">
          <h2 id="breakdown-heading" className={styles.h2}>
            Breakdown
          </h2>
          <div className={styles.bars}>
            {c.breakdown.map((item) => {
              const t = tintForScore(item.score)
              return (
                <div key={item.key}>
                  <div className={styles.barLabel}>
                    <span>{item.label}</span>
                    <span style={{ color: t.fg }}>{item.score}</span>
                  </div>
                  <div
                    className={styles.barTrack}
                    role="img"
                    aria-label={`${item.label} ${item.score} out of 100`}
                  >
                    <div
                      className={styles.barFill}
                      style={{ width: `${item.score}%`, background: t.fg }}
                    />
                  </div>
                  <p className={styles.barRule}>{item.rule}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className={styles.card} aria-labelledby="receipt-heading">
          <h2 id="receipt-heading" className={styles.h3} style={{ marginTop: 0 }}>
            How this is computed
          </h2>
          <ul className={styles.receipt}>
            {c.receipt.map((r) => (
              <li key={r.factor}>
                <span className={styles.receiptFactor}>{r.factor}</span> — {r.detail}
                <br />
                <span className={styles.receiptEffect}>{r.effect}</span>
              </li>
            ))}
            <li>
              <span className={styles.receiptFactor}>Overall</span> —{' '}
              {DIMENSIONS.map(
                (d) => `${Math.round(d.weight * 100)}% ${d.label.toLowerCase()}`
              ).join(' + ')}
              , rounded. Same two signs, same score every time; nothing here is generated by AI.
            </li>
          </ul>
        </section>

        <section className={styles.cta} aria-labelledby="cta-heading">
          <h2 id="cta-heading" className={styles.h3} style={{ marginTop: 0 }}>
            Sun signs are 1 of about 20 factors
          </h2>
          <p className={styles.small} style={{ margin: 0 }}>
            Your Moon, Venus, Mars and rising sign — and the aspects between your two charts —
            usually say more about day-to-day compatibility than the Sun alone. Compare two full
            charts free, no login.
          </p>
          <p className={styles.ctaLinks}>
            <Link href="/compatibility/free">Compare two full charts free →</Link>
            <Link href={`/horoscope/${a.slug}`}>{a.name} horoscope today →</Link>
            {!sameSign ? (
              <Link href={`/horoscope/${b.slug}`}>{b.name} horoscope today →</Link>
            ) : null}
          </p>
        </section>

        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading" className={styles.h2}>
            Frequently asked questions
          </h2>
          <dl className={styles.faq}>
            {copy.faq.map((f) => (
              <div key={f.question}>
                <dt>{f.question}</dt>
                <dd>{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="more-a-heading">
          <h2 id="more-a-heading" className={styles.h2}>
            More {a.name} matches
          </h2>
          <OtherPairs sign={a} exclude={b} />
        </section>

        {!sameSign ? (
          <section aria-labelledby="more-b-heading">
            <h2 id="more-b-heading" className={styles.h2}>
              More {b.name} matches
            </h2>
            <OtherPairs sign={b} exclude={a} />
          </section>
        ) : null}

        <p className={styles.small} style={{ marginTop: 24 }}>
          <Link href="/compatibility/signs" style={{ color: '#a9833b', fontWeight: 700 }}>
            ← All 78 sign pairs
          </Link>
          {' · '}
          <Link href="/method" style={{ color: '#a9833b', fontWeight: 700 }}>
            How readings are computed
          </Link>
        </p>

        <p className={styles.disclosure}>
          For reflection and entertainment. This score comes from a fixed rule set applied to two
          sun signs, not from AI and not from your birth charts, and it is not advice about any real
          relationship.
        </p>
      </div>
    </article>
  )
}

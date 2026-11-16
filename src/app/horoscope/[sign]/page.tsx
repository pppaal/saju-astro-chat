// Daily horoscope — one sun sign (English-only SEO surface).
//
// "<sign> horoscope today" intent. Body computed by the deterministic engine
// (src/lib/fortune/sunSignDaily.ts) from Swiss Ephemeris positions at 12:00
// UTC; the text is picked from a written bank by the same factors. No LLM,
// same UTC date → same page. Links down into the sign's compatibility pages
// and across to the free birth chart. Server component, no login.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateEnglishOnlyMetadata, generateJsonLd, getServerLocale } from '@/components/seo/SEO'
import { getSunSignBySlug, SUN_SIGNS, type SunSign } from '@/lib/astrology/sunSigns'
import { ELEMENT_BLURB, SIGN_PROFILES } from '@/lib/fortune/sunSignCopy'
import {
  computeSunSignDaily,
  computeSunSignTomorrow,
  computeSunSignWeek,
  GRADE_THRESHOLDS,
} from '@/lib/fortune/sunSignDaily'
import styles from '../horoscope.module.css'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

type Props = {
  params: Promise<{ sign: string }>
}

const GRADE_TINT: Record<number, { fg: string; bg: string }> = {
  5: { fg: '#2f7d4f', bg: 'rgba(47,125,79,0.10)' },
  4: { fg: '#4f7d2f', bg: 'rgba(79,125,47,0.10)' },
  3: { fg: '#6c665b', bg: 'rgba(108,102,91,0.10)' },
  2: { fg: '#a9683b', bg: 'rgba(169,104,59,0.10)' },
  1: { fg: '#a94b3b', bg: 'rgba(169,75,59,0.10)' },
}

/** Canonical pair slug: lower sign index first (rule shared with /compatibility/signs). */
function pairSlug(a: SunSign, b: SunSign): string {
  return a.index <= b.index ? `${a.slug}-${b.slug}` : `${b.slug}-${a.slug}`
}

function formatWeight(w: number): string {
  if (w === 0) return '0'
  const abs = Number.isInteger(w) ? String(Math.abs(w)) : Math.abs(w).toFixed(1)
  return w > 0 ? `+${abs}` : `−${abs}`
}

function weightClass(w: number): string {
  if (w > 0) return `${styles.weight} ${styles.weightPos}`
  if (w < 0) return `${styles.weight} ${styles.weightNeg}`
  return `${styles.weight} ${styles.weightZero}`
}

function buildFaq(sign: SunSign) {
  const rulerLine = sign.modernRuler
    ? `${sign.name}'s traditional ruler is ${sign.ruler}, and its modern ruler is ${sign.modernRuler}.`
    : `${sign.name}'s ruling planet is ${sign.ruler}.`
  return [
    {
      question: `What are the ${sign.name} dates?`,
      answer: `${sign.name} season runs from around ${sign.dates.from} to ${sign.dates.to}. The exact cusp shifts by about a day from year to year because the Sun's entry into each sign follows the tropical year, which does not line up exactly with the calendar; a birth chart settles a boundary birthday.`,
    },
    {
      question: `What element is ${sign.name}?`,
      answer: `${sign.name} is a ${sign.modality} ${sign.element} sign. ${ELEMENT_BLURB[sign.element]} Today's reading checks how the Moon's element and the ruler's element relate to ${sign.element}.`,
    },
    {
      question: `What is ${sign.name}'s ruling planet?`,
      answer: `${rulerLine} Today's grade looks at which sign ${sign.ruler} is in, whether it is retrograde, and how its element harmonizes with ${sign.name}.`,
    },
    {
      question: 'Is this horoscope personal to me?',
      answer: `No. A sun-sign horoscope reads today's planetary positions against the 30 degrees of the zodiac shared by everyone born under ${sign.name}. Your own birth chart adds your Moon sign, rising sign and house placements, which can change the picture; you can compute it free at DestinyPal, no login needed.`,
    },
  ]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sign: slug } = await params
  const sign = getSunSignBySlug(slug)
  if (!sign) {
    return { title: 'Not Found', robots: { index: false, follow: false } }
  }
  const locale = await getServerLocale()
  const d = computeSunSignDaily(sign)
  return generateEnglishOnlyMetadata(
    {
      title: `${sign.name} Horoscope Today — ${d.dateLabel}`,
      description: `${sign.name} horoscope for ${d.dateLabel}: ${d.gradeLabel} (${d.grade}/5), ${d.headline.toLowerCase()}. Love, work, money and the receipt behind the grade.`,
      keywords: [
        `${sign.slug} horoscope today`,
        `${sign.slug} daily horoscope`,
        `${sign.slug} horoscope`,
        `${sign.slug} love horoscope today`,
        'daily horoscope',
      ],
      canonicalUrl: `${baseUrl}/horoscope/${sign.slug}`,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

export default async function SunSignHoroscopePage({ params }: Props) {
  const { sign: slug } = await params
  const sign = getSunSignBySlug(slug)
  if (!sign) {
    notFound()
  }

  const d = computeSunSignDaily(sign)
  const tomorrow = computeSunSignTomorrow(sign)
  const week = computeSunSignWeek(sign)
  const profile = SIGN_PROFILES[sign.slug]
  const faq = buildFaq(sign)
  const tint = GRADE_TINT[d.grade]
  const others = SUN_SIGNS.filter((s) => s.slug !== sign.slug)

  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: `${sign.name} Horoscope Today — ${d.dateLabel}`,
    description: d.directAnswer,
    url: `${baseUrl}/horoscope/${sign.slug}`,
  })
  const breadcrumbJsonLd = generateJsonLd({
    type: 'BreadcrumbList',
    breadcrumbs: [
      { name: 'Home', url: '' },
      { name: 'Daily Horoscope', url: '/horoscope' },
      { name: sign.name, url: `/horoscope/${sign.slug}` },
    ],
  })
  const faqJsonLd = generateJsonLd({ type: 'FAQPage', faqs: faq })

  return (
    <article className={styles.page}>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={faqJsonLd} />
      <div className={styles.wrap}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          {' · '}
          <Link href="/horoscope">Daily Horoscope</Link>
          {' · '}
          <span className={styles.crumbCurrent}>{sign.name}</span>
        </nav>

        <h1 className={styles.h1}>
          {sign.glyph} {sign.name} Horoscope Today
        </h1>
        <p className={styles.meta}>
          {d.weekday}, {d.dateLabel} · {sign.dates.from} – {sign.dates.to} · Moon in {d.moonSign} (
          {d.moonPhaseName})
        </p>

        <p className={styles.lead}>{d.directAnswer}</p>

        <div className={styles.gradeRow}>
          <span
            className={styles.pill}
            style={{ color: tint.fg, background: tint.bg, borderColor: `${tint.fg}33` }}
          >
            Today · {d.gradeLabel} · {d.grade}/5
          </span>
          <p className={styles.headline}>{d.headline}</p>
        </div>

        <section aria-labelledby="areas-heading" className={styles.cardStack}>
          <h2 id="areas-heading" className={styles.h2} style={{ margin: '6px 0 0' }}>
            Love, work and money
          </h2>
          <div className={styles.card}>
            <h3 className={styles.h3}>Love</h3>
            <p className={styles.body}>{d.areas.love}</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.h3}>Work</h3>
            <p className={styles.body}>{d.areas.work}</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.h3}>Money</h3>
            <p className={styles.body}>{d.areas.money}</p>
          </div>
        </section>

        <section aria-labelledby="doavoid-heading">
          <h2 id="doavoid-heading" className={styles.h2}>
            Do and avoid
          </h2>
          <div className={styles.twoCol}>
            <div className={styles.card}>
              <h3 className={styles.h3}>Do today</h3>
              <p className={styles.body}>{d.doToday}</p>
            </div>
            <div className={styles.card}>
              <h3 className={styles.h3}>Avoid today</h3>
              <p className={styles.body}>{d.avoidToday}</p>
            </div>
          </div>
          <p className={styles.callout} style={{ marginTop: 12 }}>
            <strong style={{ color: '#7a6127' }}>Lucky window · </strong>
            {d.luckyWindow}. A three-hour slot derived from the Moon&apos;s position today; convert
            it to your own time zone.
          </p>
        </section>

        <section
          aria-labelledby="receipt-heading"
          className={styles.card}
          style={{ marginTop: 30 }}
        >
          <h2 id="receipt-heading" className={styles.h2} style={{ marginTop: 0 }}>
            How this is computed
          </h2>
          <p className={styles.muted}>
            Computed from planetary positions at 12:00 UTC, {d.dateLabel}, read against the midpoint
            of {sign.name} (15°). Each factor carries a fixed weight:
          </p>
          <ul className={styles.receipt}>
            {d.receipt.map((r) => (
              <li key={`${r.factor}-${r.detail}`}>
                <span>
                  <strong>{r.factor}.</strong> {r.detail}
                </span>
                <span className={weightClass(r.weight)}>{formatWeight(r.weight)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.muted} style={{ marginTop: 10 }}>
            Total {formatWeight(d.score)} → grade {d.grade}/5 (5 at ≥ {GRADE_THRESHOLDS.excellent},
            4 at ≥ {GRADE_THRESHOLDS.good}, 3 above {formatWeight(GRADE_THRESHOLDS.steady)}, 2 above{' '}
            {formatWeight(GRADE_THRESHOLDS.mixed)}, otherwise 1). Every sentence above is selected
            from a written library by these same factors; no AI model writes this page.{' '}
            <Link href="/method" className={styles.inlineLink}>
              Full method →
            </Link>
          </p>
        </section>

        <section aria-labelledby="tomorrow-heading">
          <h2 id="tomorrow-heading" className={styles.h2}>
            Tomorrow for {sign.name}
          </h2>
          <p className={styles.body}>
            <strong>
              {tomorrow.weekday}, {tomorrow.dateLabel}: {tomorrow.gradeLabel} ({tomorrow.grade}/5)
            </strong>{' '}
            — {tomorrow.headline}. Moon in {tomorrow.moonSign} ({tomorrow.moonPhaseName}).{' '}
            {tomorrow.summary}
          </p>
        </section>

        <section aria-labelledby="week-heading">
          <h2 id="week-heading" className={styles.h2}>
            Next seven days
          </h2>
          <ol className={styles.week} aria-label={`Seven-day outlook for ${sign.name}`}>
            {week.map((w) => (
              <li
                key={w.date}
                className={`${styles.weekDay} ${w.isToday ? styles.weekToday : ''}`}
                title={`${w.dateLabel}: ${w.gradeLabel} — ${w.headline}`}
              >
                {w.weekdayShort}
                <span className={styles.weekGrade} style={{ color: GRADE_TINT[w.grade].fg }}>
                  {w.grade}
                </span>
              </li>
            ))}
          </ol>
          <p className={styles.muted} style={{ marginTop: 8 }}>
            Grades from 1 (low-key) to 5 (excellent), each computed the same way as today&apos;s.
          </p>
        </section>

        <section aria-labelledby="cta-heading" className={styles.cta} style={{ marginTop: 30 }}>
          <h2 id="cta-heading" className={styles.h2} style={{ marginTop: 0 }}>
            Your own chart has your Moon and rising
          </h2>
          <p className={styles.muted}>
            A sun-sign reading covers the 30° everyone born under {sign.name} shares. Your birth
            chart adds your Moon sign, rising sign and houses, which is where the personal detail
            lives. Get it free, no login.
          </p>
          <p className={styles.ctaLinks}>
            <Link href="/integrated-report">Get your free birth chart →</Link>
            <Link href="/horoscope">All 12 signs today →</Link>
          </p>
        </section>

        <section aria-labelledby="profile-heading">
          <h2 id="profile-heading" className={styles.h2}>
            About {sign.name}
          </h2>
          <p className={styles.body}>
            <strong>Dates:</strong> around {sign.dates.from} to {sign.dates.to} ·{' '}
            <strong>Element:</strong> {sign.element} · <strong>Modality:</strong> {sign.modality} ·{' '}
            <strong>Ruler:</strong> {sign.ruler}
            {sign.modernRuler ? ` (modern: ${sign.modernRuler})` : ''}
          </p>
          <div className={styles.twoCol} style={{ marginTop: 12 }}>
            <div className={styles.card}>
              <h3 className={styles.h3}>Strengths</h3>
              <ul className={styles.list}>
                {profile.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className={styles.card}>
              <h3 className={styles.h3}>Watch-outs</h3>
              <ul className={styles.list}>
                {profile.watchOuts.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className={styles.callout} style={{ marginTop: 12 }}>
            <strong style={{ color: '#7a6127' }}>How to read {sign.name} days · </strong>
            {profile.howToRead}
          </p>
        </section>

        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading" className={styles.h2}>
            {sign.name} questions
          </h2>
          <dl className={styles.faq}>
            {faq.map((f) => (
              <div key={f.question}>
                <dt>{f.question}</dt>
                <dd>{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="compat-heading">
          <h2 id="compat-heading" className={styles.h2}>
            {sign.name} compatibility
          </h2>
          <ul className={styles.chips}>
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/compatibility/signs/${pairSlug(sign, o)}`} className={styles.chip}>
                  {sign.name} &amp; {o.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href={`/compatibility/signs/${pairSlug(sign, sign)}`} className={styles.chip}>
                {sign.name} &amp; {sign.name}
              </Link>
            </li>
          </ul>
        </section>

        <section aria-labelledby="others-heading">
          <h2 id="others-heading" className={styles.h2}>
            Other signs today
          </h2>
          <ul className={styles.chips}>
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/horoscope/${o.slug}`} className={styles.chip}>
                  {o.glyph} {o.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className={styles.disclosure}>
          For reflection and entertainment, not advice. The grade and text on this page are produced
          by a deterministic engine from planetary positions; no AI model writes them. Times are
          UTC.
        </p>
      </div>
    </article>
  )
}

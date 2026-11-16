// Daily horoscope hub — today for all 12 sun signs (English-only SEO surface).
//
// Programmatic daily page: "daily horoscope" / "horoscope today" intent, then
// twelve sign pages. Content comes from the deterministic engine
// (src/lib/fortune/sunSignDaily.ts): positions from the Swiss Ephemeris at
// 12:00 UTC, scored by fixed rules, text picked from a written bank. No LLM.
// Same UTC date → same page. Server component, no login.

import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateEnglishOnlyMetadata, generateJsonLd, getServerLocale } from '@/components/seo/SEO'
import { computeAllSunSignDaily } from '@/lib/fortune/sunSignDaily'
import styles from './horoscope.module.css'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

const GRADE_TINT: Record<number, string> = {
  5: '#2f7d4f',
  4: '#4f7d2f',
  3: '#8a8474',
  2: '#a9683b',
  1: '#a94b3b',
}

const HUB_FAQ: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: 'What is a daily horoscope?',
    answer:
      "A daily horoscope describes how today's planetary positions, especially the Moon's sign and phase, relate to each of the 12 zodiac signs. It is a general reading for everyone who shares a sun sign, not a personal chart.",
  },
  {
    question: 'How is this horoscope computed?',
    answer:
      "A deterministic engine casts the Sun, Moon and planets for 12:00 UTC with the Swiss Ephemeris, then scores each sign on the Moon's sign relation and phase, aspects from the Moon and from the Sun through Pluto to the sign's midpoint, planets in the sign, retrogrades and the ruler's condition. The weighted sum maps to a 1 to 5 grade, and the text is selected from a written library by those same factors. No AI writes it, and the same date always gives the same reading.",
  },
  {
    question: 'Which zodiac sign am I?',
    answer:
      "Your sun sign is set by the Sun's position on your birthday: Aries from around March 21, Taurus from April 20, Gemini from May 21, Cancer from June 21, Leo from July 23, Virgo from August 23, Libra from September 23, Scorpio from October 23, Sagittarius from November 22, Capricorn from December 22, Aquarius from January 20 and Pisces from February 19. The cusp moves by about a day from year to year, so if your birthday is on a boundary, a free birth chart settles it.",
  },
  {
    question: 'Is a sun-sign horoscope accurate for me?',
    answer:
      'It is accurate about the sky and general about you. Twelve signs cannot describe everyone, so treat it as a daily weather report for your sign and use your full birth chart, with your Moon and rising signs, for anything personal.',
  },
]

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const today = computeAllSunSignDaily()[0]
  return generateEnglishOnlyMetadata(
    {
      title: `Daily Horoscope for All 12 Zodiac Signs — ${today.dateLabel}`,
      description: `Today's horoscope for all 12 signs, ${today.dateLabel}: a 1–5 grade and a short reading each, computed from real planetary positions. Moon in ${today.moonSign}, ${today.moonPhaseName}.`,
      keywords: [
        'daily horoscope',
        'horoscope today',
        "today's horoscope all signs",
        'zodiac signs today',
        'free daily horoscope',
      ],
      canonicalUrl: `${baseUrl}/horoscope`,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

export default async function HoroscopeHubPage() {
  const all = computeAllSunSignDaily()
  const today = all[0]

  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: `Daily Horoscope for All 12 Zodiac Signs — ${today.dateLabel}`,
    description: `Today's horoscope for every zodiac sign, computed from planetary positions at 12:00 UTC on ${today.dateLabel}.`,
    url: `${baseUrl}/horoscope`,
  })
  const breadcrumbJsonLd = generateJsonLd({
    type: 'BreadcrumbList',
    breadcrumbs: [
      { name: 'Home', url: '' },
      { name: 'Daily Horoscope', url: '/horoscope' },
    ],
  })
  const faqJsonLd = generateJsonLd({ type: 'FAQPage', faqs: [...HUB_FAQ] })

  return (
    <article className={styles.page}>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={faqJsonLd} />
      <div className={styles.wrap}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          {' · '}
          <span className={styles.crumbCurrent}>Daily Horoscope</span>
        </nav>

        <h1 className={styles.h1}>Today&apos;s Horoscope for All 12 Zodiac Signs</h1>
        <p className={styles.meta}>
          {today.dateLabel} · Moon in {today.moonSign} ({today.moonPhaseName}) · positions cast at
          12:00 UTC
        </p>

        <p className={styles.lead}>
          A daily horoscope reads today&apos;s sky against each zodiac sign. This one is computed,
          not written by an AI: for {today.dateLabel}, the Moon, Sun and planets are cast at 12:00
          UTC with the Swiss Ephemeris, each sign is scored on the Moon&apos;s sign and phase,
          planetary aspects, retrogrades and its ruler, and the day is graded from 1 to 5.
        </p>
        <p className={styles.muted} style={{ marginBottom: 26 }}>
          Choose your sign for love, work and money, a do and a don&apos;t, a lucky window, and the
          full receipt of factors behind the grade.
        </p>

        <section aria-labelledby="signs-heading">
          <h2 id="signs-heading" className={styles.h2} style={{ marginTop: 0 }}>
            Today by sign
          </h2>
          <ul className={styles.grid}>
            {all.map((d) => (
              <li key={d.sign.slug}>
                <Link href={`/horoscope/${d.sign.slug}`} className={styles.gridLink}>
                  <span className={styles.gridTitle}>
                    <span>
                      {d.sign.glyph} {d.sign.name}
                    </span>
                    <span style={{ fontSize: 12, color: GRADE_TINT[d.grade] }}>
                      {d.gradeLabel} · {d.grade}/5
                    </span>
                  </span>
                  <span className={styles.gridDates}>
                    {d.sign.dates.from} – {d.sign.dates.to}
                  </span>
                  <span className={styles.gridHeadline}>{d.headline}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sky-heading">
          <h2 id="sky-heading" className={styles.h2}>
            Today&apos;s sky
          </h2>
          <p className={styles.body}>
            The Moon is in {today.moonSign} and the phase is {today.moonPhaseName}.{' '}
            {today.retrogrades.length > 0
              ? `Retrograde today: ${today.retrogrades.join(', ')}.`
              : 'No planets are retrograde today.'}{' '}
            Every sign below is read against this same sky; what differs is the angle each sign
            makes to it.
          </p>
        </section>

        <section aria-labelledby="method-heading" className={styles.card} style={{ marginTop: 28 }}>
          <h2 id="method-heading" className={styles.h2} style={{ marginTop: 0 }}>
            How this is computed
          </h2>
          <ol className={styles.list}>
            <li>
              Positions of the Sun, Moon and planets through Pluto at 12:00 UTC on {today.dateLabel}
              , from the Swiss Ephemeris (tropical zodiac).
            </li>
            <li>
              The Moon&apos;s relation to each sign by sign distance (same sign, sextile, square,
              trine, quincunx, opposition), its element harmony with the sign, and its phase.
            </li>
            <li>
              Aspects from each planet to the sign&apos;s midpoint (15°): orbs 8° for conjunction
              and opposition, 6° for square and trine, 4° for sextile; the Moon uses 4° throughout.
            </li>
            <li>
              Planets currently in the sign, retrograde planets, and the sign&apos;s traditional
              ruler: which sign it is in, its element harmony, whether it is retrograde.
            </li>
            <li>
              Each factor carries a fixed weight; the sum becomes a grade from 1 to 5, and every
              sentence is chosen from a written library by the same factors. The same date always
              produces the same page.
            </li>
          </ol>
          <p className={styles.muted} style={{ marginTop: 10 }}>
            <Link href="/method" className={styles.inlineLink}>
              Read how DestinyPal computes a reading →
            </Link>
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

        <section aria-labelledby="next-heading" className={styles.cta} style={{ marginTop: 30 }}>
          <h2 id="next-heading" className={styles.h2} style={{ marginTop: 0 }}>
            Go further than your sun sign
          </h2>
          <p className={styles.muted}>
            Your sun sign is one of about twenty factors in a birth chart. Your own chart adds your
            Moon and rising signs, free and without a login; the compatibility pages compare any two
            signs.
          </p>
          <p className={styles.ctaLinks}>
            <Link href="/integrated-report">Get your free birth chart →</Link>
            <Link href="/compatibility/signs">Zodiac sign compatibility →</Link>
            <Link href="/fortune">Korean zodiac today →</Link>
          </p>
        </section>

        <p className={styles.disclosure}>
          For reflection and entertainment, not advice. Grades and text on this page are produced by
          a deterministic engine from planetary positions; no AI model writes them. Times are UTC.
        </p>
      </div>
    </article>
  )
}

// /method — "How DestinyPal computes a reading".
//
// GEO/SEO 의 신뢰 앵커 페이지: AI 어시스턴트와 검색엔진이 "이 사이트의 리딩은
// 어떻게 계산되는가"를 인용할 수 있게, 코드베이스가 실제로 하는 일만 평이한 영어로
// 적는다. 모든 주장은 docs/CALCULATION_SPEC.md · docs/SOLAR_TIME_CONVENTION.md ·
// src/lib/config/calculationStandards.ts · src/lib/saju/birthTimeAnchor.ts ·
// src/lib/astrology/foundation/{ephe,houses,shared}.ts · src/lib/prompts/* 에
// 근거를 둔다. 영어 전용 표면(generateEnglishOnlyMetadata) — /ko 요청은 noindex.
// 서버 컴포넌트, LLM 호출 없음, 결정론(날짜 상수만 사용).
// 본문 예산 900–1400 단어 — tests/app/method.test.tsx 가 지킨다.

import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateEnglishOnlyMetadata, generateJsonLd, getServerLocale } from '@/components/seo/SEO'
import styles from './method.module.css'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'
const PAGE_URL = `${baseUrl}/method`

/** Article dateModified — 본문을 고칠 때 함께 올린다 (결정론: 런타임 클록 금지). */
const PAGE_DATE = '2026-11-16'

const TITLE = 'How DestinyPal Computes a Reading'
const DESCRIPTION =
  'Planetary positions from the Swiss Ephemeris in the tropical zodiac, Korean Four Pillars from the same birth instant, a rules engine for scores and dates, and an AI that only writes the words.'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateEnglishOnlyMetadata(
    {
      title: TITLE,
      description: DESCRIPTION,
      keywords: [
        'how is a birth chart calculated',
        'swiss ephemeris astrology',
        'tropical zodiac vs sidereal',
        'placidus house system',
        'four pillars calculation',
        'deterministic astrology engine',
        'ai astrology how it works',
      ],
      canonicalUrl: PAGE_URL,
      ogType: 'article',
      ogImage: '/og-image.png',
      publishedTime: PAGE_DATE,
      modifiedTime: PAGE_DATE,
    },
    locale
  )
}

// ── Copy ──────────────────────────────────────────────────────────────────────
// 문장은 상수로 두고 {} 로 렌더한다 — 어포스트로피 이스케이프 문제를 피하고,
// 테스트가 단어 수·금지어를 셀 수 있게.

const LEAD =
  'DestinyPal computes every reading in code before a single sentence is written. Planetary positions come from the Swiss Ephemeris in the tropical zodiac with Placidus houses; the Korean Four Pillars are derived from the same birth instant; a rules engine turns both into weighted factors, scores and dates. An AI model then writes the explanation from those factors. It cannot change them.'

const PIPELINE: ReadonlyArray<{ title: string; text: string }> = [
  {
    title: 'You enter birth data.',
    text: 'Birth date, time and place; or just a sign or the date for the free pages.',
  },
  {
    title: 'The moment is pinned down.',
    text: 'Clock time becomes UTC via the time-zone database; an unknown birth time is anchored to noon.',
  },
  {
    title: 'The sky is computed.',
    text: 'The Swiss Ephemeris returns each planet’s tropical longitude and speed; Placidus houses from the birth place.',
  },
  {
    title: 'The Four Pillars are derived.',
    text: 'The same instant, shifted to mean solar time, yields the year, month, day and hour pillars.',
  },
  {
    title: 'Facts are collected.',
    text: 'Aspects, dignities and profection; Day Master, five elements, ten gods and luck cycles.',
  },
  {
    title: 'The two systems are cross-read.',
    text: 'A fixed table pairs planets with Four Pillars signals; only graded pairs active together count.',
  },
  {
    title: 'Scores and dates are set.',
    text: 'Weighted factors add up to a 0 to 100 favorability or a 1 to 5 grade.',
  },
  {
    title: 'Words are written last.',
    text: 'An AI writes counselor prose from those factors; the free daily and sign pages use fixed templates.',
  },
]

const SECTIONS: ReadonlyArray<{ id: string; heading: string; paragraphs: string[] }> = [
  {
    id: 'planets',
    heading: 'Where the planets come from',
    paragraphs: [
      'Every planetary position comes from the Swiss Ephemeris, with speed, so a negative value marks a planet retrograde. Positions are tropical, 0 degrees Aries at the March equinox. Houses are Placidus; above roughly 66.5 degrees of latitude Placidus cannot be computed, so the engine falls back to Whole Sign and records which system produced the cusps. The lunar node is the True Node. The sidereal zodiac of Vedic astrology is not computed yet.',
    ],
  },
  {
    id: 'time',
    heading: 'Birth time, time zones and solar time',
    paragraphs: [
      'Your birth time is read in the time zone you choose; the offset for that date comes from the IANA time-zone database, daylight-saving and historical offsets included. If the time is unknown, the engine anchors to 12:00 noon and flags it: the AI counselor is told not to cite the Ascendant, Midheaven, houses or hour pillar, and the free report labels them noon-based rather than exact; likewise for an unknown birth place. For the Four Pillars only, the whole birth instant is then shifted to mean solar time, four minutes per degree between the birthplace and the standard meridian of its zone, so Seoul runs about 32 minutes behind Korean Standard Time. The equation of time is not applied, and the astrology engine uses the uncorrected instant in UTC.',
    ],
  },
  {
    id: 'four-pillars',
    heading: 'The second engine: Korean Four Pillars',
    paragraphs: [
      'Saju, the Korean Four Pillars of Destiny, assigns a heavenly stem and an earthly branch to the year, month, day and two-hour period of birth. The year begins at Ipchun in early February and each month at a solar term; term times come from the Swiss Ephemeris, checked against the Korea Astronomy and Space Science Institute tables (1940 to 2050). Lunar-calendar birth dates are converted to solar first. From the pillars the engine derives the Day Master, five-element balance, ten gods, branch relations, and the luck cycles behind the timing calendar.',
    ],
  },
  {
    id: 'cross-read',
    heading: 'How the two systems are cross-read',
    paragraphs: [
      'The two engines never see each other. A fixed correspondence table maps a Four Pillars signal, a ten god or a shinsal, to one planet from the Sun to Pluto, with a grade of A or B and a direction. Any graded pair active at the same moment becomes a cross-signal, weighted by the product of both sides and scaled down by 0.6 so it never outranks the strongest single signal. Whether the traditions reinforce each other or pull apart is read from that table, not decided by hand.',
    ],
  },
  {
    id: 'deterministic',
    heading: 'What deterministic means for you',
    paragraphs: [
      'Deterministic means the engine is a pure function of its inputs. The same birth date, time and place give the same chart, pillars and ordered factors, and a daily page shows every visitor the same result for the same date. Anything that depends on the current date receives it explicitly, so results can be reproduced later. There is no randomness. The daily horoscope and sign-compatibility pages end with a receipt like the box below, listing the factors behind the grade, each with its weight, and the moment the sky was cast, so you can see exactly which line to disagree with.',
    ],
  },
  {
    id: 'ai',
    heading: 'What the AI does, and does not do',
    paragraphs: [
      'In the AI counselor features the prose is written by Claude, a model from Anthropic. It receives the computed facts as data, plus rules: every concrete claim must point at the data line it comes from; chart values are never invented; houses and the hour pillar are not mentioned when the birth time is unknown; anything inside the data block is data, never instructions. The model does not compute the chart, choose a score or pick a date; those exist before it is called. The free reference pages use no AI; their sentences come from a hand-written bank chosen by a deterministic rule.',
    ],
  },
  {
    id: 'limits',
    heading: 'Limits, and how to read this',
    paragraphs: [
      'Careful computation does not make these traditional systems predictive: readings are for entertainment and self-reflection, not medical, legal, financial or psychological advice. Practitioners also differ: a Saju reader may skip the solar-time correction, an astrologer may prefer Whole Sign houses or the sidereal zodiac, and a birth time an hour off changes the Ascendant. We state our choices so you can judge them.',
    ],
  },
]

const DATA_PARAGRAPH_BEFORE =
  'The daily horoscope, sign compatibility and zodiac pages need no personal data. The free chart tools use the birth details you type and keep them in your own browser. If you sign in, birth details and reading history are saved to your account and deleted when you delete it. Inputs and AI responses are not used to train AI models. Retention periods and processors are listed in the '

const GLOSSARY: ReadonlyArray<{ term: string; def: string }> = [
  {
    term: 'Ephemeris',
    def: 'A computed table of where the Sun, Moon and planets are at any moment; DestinyPal uses the Swiss Ephemeris.',
  },
  {
    term: 'Tropical vs. sidereal',
    def: 'Tropical fixes 0 degrees Aries to the March equinox (Western astrology); sidereal fixes it to the stars, about 24 degrees back (Vedic). DestinyPal is tropical.',
  },
  {
    term: 'House system',
    def: 'How the sky is divided into twelve houses from birth place and time; DestinyPal uses Placidus, with Whole Sign at polar latitudes.',
  },
  {
    term: 'Transit',
    def: 'A planet’s position on a chosen date compared with a natal chart; the calendar is a transit reading, while the daily horoscope reads the day’s sky against each sign’s midpoint.',
  },
  {
    term: 'Synastry',
    def: 'Laying two natal charts over each other to read the aspects between them, as in the compatibility report.',
  },
]

const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'Is DestinyPal astrology tropical or sidereal?',
    a: 'Tropical: 0 degrees Aries is fixed to the March equinox. There is no sidereal or Vedic mode yet; a sidereal option is planned, with no date.',
  },
  {
    q: 'What happens if I do not know my birth time?',
    a: 'The engine anchors to noon and marks the time unknown; planets and the year, month and day pillars are computed as usual, the AI counselor is told not to cite the Ascendant, houses or hour pillar, and the free report labels them noon-based.',
  },
  {
    q: 'Does the AI decide my chart or my score?',
    a: 'No. The engine computes chart, factors, scores and dates first; the AI only writes the explanation from them, under rules that forbid inventing values.',
  },
  {
    q: 'Why does my hour pillar differ from another Saju site?',
    a: 'Usually the solar-time correction: we shift the birth instant to mean solar time at your longitude, which can move a birth near a two-hour boundary into the next pillar.',
  },
  {
    q: 'Is the daily horoscope personal to me?',
    a: 'Not fully: it is computed for the midpoint of your sign at 12:00 UTC, so everyone with that sign sees the same page. Your own chart adds the Moon, rising sign and houses.',
  },
]

const RELATED: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/horoscope', label: 'Daily horoscope' },
  { href: '/compatibility/signs', label: 'Sign compatibility' },
  { href: '/fortune', label: 'Korean zodiac' },
  { href: '/tarot/cards', label: 'Tarot cards' },
  { href: '/integrated-report', label: 'Birth chart' },
  { href: '/compatibility/free', label: 'Compatibility report' },
  { href: '/faq', label: 'FAQ' },
  { href: '/blog', label: 'Guides' },
]

const DISCLOSURE =
  'Readings are for entertainment and self-reflection, not professional advice. Charts, scores and dates come from a deterministic engine; AI prose is written from those factors and labeled as such.'

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MethodPage() {
  const articleJsonLd = {
    ...generateJsonLd({
      type: 'Article',
      name: TITLE,
      description: DESCRIPTION,
      datePublished: PAGE_DATE,
      dateModified: PAGE_DATE,
      author: { name: 'DestinyPal', url: baseUrl },
      image: `${baseUrl}/og-image.png`,
    }),
    mainEntityOfPage: PAGE_URL,
    inLanguage: 'en-US',
  }
  const breadcrumbJsonLd = generateJsonLd({
    type: 'BreadcrumbList',
    breadcrumbs: [
      { name: 'Home', url: '' },
      { name: 'How it works', url: '/method' },
    ],
  })
  const faqJsonLd = generateJsonLd({
    type: 'FAQPage',
    faqs: FAQS.map((f) => ({ question: f.q, answer: f.a })),
  })

  return (
    <article className={styles.page}>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={faqJsonLd} />
      <div className={styles.inner}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          {' · '}
          <span className={styles.crumbCurrent}>How it works</span>
        </nav>

        <header>
          <p className={styles.eyebrow}>Method</p>
          <h1 className={styles.title}>How DestinyPal computes a reading</h1>
          <p className={styles.lead}>{LEAD}</p>
          <p className={styles.meta}>Last updated {PAGE_DATE}</p>
        </header>

        <section className={styles.section} aria-labelledby="pipeline">
          <h2 id="pipeline" className={styles.h2}>
            The pipeline, step by step
          </h2>
          <ol className={styles.pipeline}>
            {PIPELINE.map((step) => (
              <li key={step.title} className={styles.step}>
                <strong className={styles.stepTitle}>{step.title}</strong>
                <span className={styles.stepText}>{step.text}</span>
              </li>
            ))}
          </ol>
        </section>

        {SECTIONS.map((s) => (
          <section key={s.id} className={styles.section} aria-labelledby={s.id}>
            <h2 id={s.id} className={styles.h2}>
              {s.heading}
            </h2>
            {s.paragraphs.map((text, i) => (
              <p key={i} className={styles.p}>
                {text}
              </p>
            ))}
          </section>
        ))}

        <section className={styles.section} aria-labelledby="data">
          <h2 id="data" className={styles.h2}>
            Your data
          </h2>
          <p className={styles.p}>
            {DATA_PARAGRAPH_BEFORE}
            <Link href="/policy/privacy">privacy policy</Link>.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="receipt-box">
          <div className={styles.receipt}>
            <p id="receipt-box" className={styles.receiptTitle}>
              How this page is computed
            </p>
            <ul className={styles.receiptList}>
              <li>
                Astronomy: Swiss Ephemeris, tropical zodiac, Placidus houses (Whole Sign beyond
                66.5° latitude), True Node.
              </li>
              <li>
                Time: IANA offsets; unknown time anchored to 12:00; Four Pillars shifted to mean
                solar time.
              </li>
              <li>
                Four Pillars: solar-term boundaries from the Swiss Ephemeris, verified against KASI;
                lunar dates converted to solar.
              </li>
              <li>
                AI: Claude writes prose from computed facts in counselor features; none on the free
                pages.
              </li>
            </ul>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="glossary">
          <h2 id="glossary" className={styles.h2}>
            Glossary
          </h2>
          <dl className={styles.glossary}>
            {GLOSSARY.map((g) => (
              <div key={g.term}>
                <dt className={styles.glossaryTerm}>{g.term}</dt>
                <dd className={styles.glossaryDef}>{g.def}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.section} aria-labelledby="faq">
          <h2 id="faq" className={styles.h2}>
            Frequently asked questions
          </h2>
          {FAQS.map((f) => (
            <div key={f.q} className={styles.faqItem}>
              <h3 className={styles.faqQ}>{f.q}</h3>
              <p className={styles.faqA}>{f.a}</p>
            </div>
          ))}
        </section>

        <section className={styles.cta} aria-label="Try it on your own chart">
          <p className={styles.ctaText}>
            See it on your own data: the free birth chart report computes your planets, houses and
            Four Pillars, no login.
          </p>
          <p className={styles.ctaLinks}>
            <Link href="/integrated-report">Get your free birth chart →</Link>
            <Link href="/compatibility/free">Compare two charts free →</Link>
          </p>
        </section>

        <section className={styles.section} aria-labelledby="related">
          <h2 id="related" className={styles.h2}>
            Explore
          </h2>
          <ul className={styles.links}>
            {RELATED.map((r) => (
              <li key={r.href}>
                <Link href={r.href}>{r.label}</Link>
              </li>
            ))}
          </ul>
        </section>

        <p className={styles.disclosure}>{DISCLOSURE}</p>
      </div>
    </article>
  )
}

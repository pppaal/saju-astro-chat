// 띠궁합 상세 — 두 띠 1쌍. "쥐띠 소띠 궁합" 류 검색을 받는 프로그램매틱 SEO 페이지.
//
// 본문은 결정론 엔진(zodiacCompat.ts)이 두 띠의 고전 지지 관계(삼합·육합·충 등)로
// 계산 — 상시(evergreen) 콘텐츠. 하단에서 개인화 제품(무료 궁합)으로 흘려보낸다.
// URL 대칭(A×B=B×A): 역순 슬러그도 열리지만 canonical 은 정규 순서를 가리킨다.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import {
  canonicalPairSlug,
  computeZodiacCompat,
  parsePairSlug,
} from '@/lib/compatibility/zodiacCompat'
import { ZODIAC_ANIMALS } from '@/lib/fortune/zodiacDaily'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

type Props = {
  params: Promise<{ pair: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params
  const parsed = parsePairSlug(pair)
  if (!parsed) {
    return { title: 'Not Found', robots: { index: false, follow: false } }
  }
  const { a, b } = parsed
  const locale = await getServerLocale()
  const c = computeZodiacCompat(a, b)
  // 역순 슬러그는 정규 슬러그로 canonical — 중복 색인 방지.
  const canonical = `${baseUrl}/compatibility/zodiac/${canonicalPairSlug(a, b)}`
  return generateLocalizedMetadata(
    {
      en: {
        title: `${a.en} & ${b.en} Compatibility — ${c.gradeLabel.en} (${c.score}/100)`,
        description: `${a.en} and ${b.en} zodiac compatibility: ${c.relationName.en}, ${c.score}/100. ${c.body.en.slice(0, 100)}`,
        keywords: [
          `${a.en.toLowerCase()} ${b.en.toLowerCase()} compatibility`,
          `${a.en.toLowerCase()} and ${b.en.toLowerCase()}`,
          'chinese zodiac compatibility',
          'korean zodiac love match',
        ],
      },
      ko: {
        title: `${a.ko} ${b.ko} 궁합 — ${c.gradeLabel.ko} (${c.score}점)`,
        description: `${a.ko}와 ${b.ko} 궁합: ${c.relationName.ko}, ${c.score}점. ${c.body.ko.slice(0, 80)}`,
        keywords: [
          `${a.ko} ${b.ko} 궁합`,
          `${b.ko} ${a.ko} 궁합`,
          '띠 궁합',
          '띠별 궁합',
          '십이지 궁합',
        ],
      },
      canonicalUrl: canonical,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

function tintForScore(score: number): { fg: string; bg: string } {
  if (score >= 75) return { fg: '#2f7d4f', bg: 'rgba(47,125,79,0.10)' }
  if (score >= 62) return { fg: '#4f7d2f', bg: 'rgba(79,125,47,0.10)' }
  if (score >= 50) return { fg: '#a9683b', bg: 'rgba(169,104,59,0.10)' }
  return { fg: '#a94b3b', bg: 'rgba(169,75,59,0.10)' }
}

export default async function ZodiacCompatPage({ params }: Props) {
  const { pair } = await params
  const parsed = parsePairSlug(pair)
  if (!parsed) notFound()
  const { a, b } = parsed
  const locale = await getServerLocale()
  const isKo = locale === 'ko'
  const c = computeZodiacCompat(a, b)
  const tint = tintForScore(c.score)
  const canonicalSlug = canonicalPairSlug(a, b)

  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: isKo ? `${a.ko} ${b.ko} 궁합` : `${a.en} & ${b.en} Compatibility`,
    description: c.body[locale],
    url: `${baseUrl}/compatibility/zodiac/${canonicalSlug}`,
  })
  const breadcrumbJsonLd = generateJsonLd({
    type: 'BreadcrumbList',
    breadcrumbs: [
      { name: 'Home', url: '' },
      { name: isKo ? '띠 궁합' : 'Zodiac Compatibility', url: '/compatibility/zodiac' },
      {
        name: isKo ? `${a.ko} ${b.ko}` : `${a.en} & ${b.en}`,
        url: `/compatibility/zodiac/${canonicalSlug}`,
      },
    ],
  })

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(900px 620px at 25% 8%, rgba(200,99,140,0.08), transparent 60%),' +
          'radial-gradient(820px 700px at 85% 100%, rgba(212,181,114,0.16), transparent 60%),' +
          'linear-gradient(160deg, #fbf9f4 0%, #f4efe5 58%, #f8f5ee 100%)',
        color: '#2a2722',
      }}
    >
      <JsonLd data={pageJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 96px' }}>
        <nav style={{ fontSize: 13, color: '#6c665b', marginBottom: 24 }}>
          <Link href="/" style={{ color: '#6c665b' }}>
            {isKo ? '홈' : 'Home'}
          </Link>
          {' · '}
          <Link href="/compatibility/zodiac" style={{ color: '#6c665b' }}>
            {isKo ? '띠 궁합' : 'Zodiac Compatibility'}
          </Link>
          {' · '}
          <span style={{ color: '#a9833b' }}>{isKo ? `${a.ko} ${b.ko}` : `${a.en} & ${b.en}`}</span>
        </nav>

        <h1 style={{ fontSize: 30, lineHeight: 1.25, margin: '0 0 6px', fontWeight: 700 }}>
          {a.emoji}
          {b.emoji} {isKo ? `${a.ko} ${b.ko} 궁합` : `${a.en} & ${b.en} Compatibility`}
        </h1>
        <p style={{ fontSize: 14, color: '#8a8474', margin: '0 0 22px' }}>
          {c.relationName[locale]}
        </p>

        {/* 점수 배지 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '0 0 22px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 3,
              padding: '8px 18px',
              borderRadius: 999,
              fontWeight: 800,
              color: tint.fg,
              background: tint.bg,
              border: `1px solid ${tint.fg}33`,
            }}
          >
            <span style={{ fontSize: 26 }}>{c.score}</span>
            <span style={{ fontSize: 14 }}>/100</span>
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: tint.fg }}>
            {c.gradeLabel[locale]}
          </span>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px' }}>{c.headline[locale]}</h2>
        <p style={{ fontSize: 16.5, lineHeight: 1.85, margin: '0 0 22px', color: '#3c372c' }}>
          {c.body[locale]}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 30 }}>
          <p
            style={{
              margin: 0,
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(47,125,79,0.08)',
              borderLeft: '3px solid #2f7d4f',
              fontSize: 14.5,
              lineHeight: 1.7,
              color: '#3c5040',
            }}
          >
            <strong style={{ color: '#2f7d4f' }}>{isKo ? '잘 맞는 점 · ' : 'Strengths · '}</strong>
            {c.goodSide[locale]}
          </p>
          <p
            style={{
              margin: 0,
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(169,104,59,0.08)',
              borderLeft: '3px solid #a9683b',
              fontSize: 14.5,
              lineHeight: 1.7,
              color: '#55463a',
            }}
          >
            <strong style={{ color: '#a9683b' }}>{isKo ? '조심할 점 · ' : 'Watch for · '}</strong>
            {c.watchSide[locale]}
          </p>
        </div>

        {/* 개인화 전환 훅 — 띠는 사주 한 글자, 진짜 궁합은 생년월일 전체 */}
        <section
          style={{
            padding: '18px 20px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(169,131,59,0.22)',
            marginBottom: 34,
          }}
        >
          <p style={{ fontSize: 13.5, color: '#6c665b', margin: '0 0 10px', lineHeight: 1.65 }}>
            {isKo
              ? '띠 궁합은 태어난 해(년지) 한 글자로 본 큰 그림입니다. 두 사람의 생년월일시 전체(사주 여덟 글자 × 별자리)를 겹쳐 보면 훨씬 정확한 궁합이 나와요 — 무료로 확인해 보세요.'
              : 'Zodiac-sign compatibility is the big picture from one character (birth year). Overlay both full birth charts (eight Saju characters × astrology) for a far more accurate match — free.'}
          </p>
          <p style={{ margin: 0, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14 }}>
            <Link href="/compatibility/free" style={{ color: '#a9833b', fontWeight: 700 }}>
              {isKo ? '💕 우리 진짜 궁합 무료로 보기 →' : '💕 Our real compatibility, free →'}
            </Link>
            <Link href="/free" style={{ color: '#a9833b', fontWeight: 600 }}>
              {isKo ? '✨ 무료 도구 전체 →' : '✨ All free tools →'}
            </Link>
          </p>
        </section>

        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: '#3c372c' }}>
          {isKo ? `${a.ko}의 다른 궁합` : `Other ${a.en} matches`}
        </h2>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {ZODIAC_ANIMALS.filter((z) => z.slug !== a.slug).map((z) => (
            <li key={z.slug}>
              <Link
                href={`/compatibility/zodiac/${canonicalPairSlug(a, z)}`}
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 13,
                  background: 'rgba(255,255,255,0.65)',
                  border: '1px solid rgba(169,131,59,0.18)',
                  color: '#55503f',
                  textDecoration: 'none',
                }}
              >
                {a.emoji}
                {z.emoji} {isKo ? `${a.ko}·${z.ko}` : `${a.en} & ${z.en}`}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

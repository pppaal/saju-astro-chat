// 타로 카드 상세 — 카드 1장의 정·역방향 의미/키워드/조언.
//
// 프로그램매틱 SEO 상세 페이지(78장): "the fool tarot meaning", "타로 바보
// 카드 의미" 류 롱테일을 받는다. 데이터는 덱 SSOT(@/lib/tarot/data)에서
// 그대로 렌더 — 별도 콘텐츠 관리 없음. 하단 prev/next + 인덱스 링크로
// 크롤러가 78장을 모두 순회한다. 무로그인 · 서버 컴포넌트.

import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { cardSlug, getCardBySlug, neighborCards, SUIT_LABELS } from '@/lib/tarot/cardPages'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const card = getCardBySlug(slug)
  if (!card) {
    return { title: 'Card Not Found', robots: { index: false, follow: false } }
  }
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: `${card.name} Tarot Card Meaning — Upright & Reversed`,
        description: `${card.name} tarot card meaning. Upright: ${card.upright.keywords
          .slice(0, 3)
          .join(', ')}. Reversed: ${card.reversed.keywords
          .slice(0, 3)
          .join(', ')}. Full interpretation, love & career insights, and advice.`,
        keywords: [
          `${card.name.toLowerCase()} tarot card`,
          `${card.name.toLowerCase()} meaning`,
          `${card.name.toLowerCase()} reversed`,
          `${card.name.toLowerCase()} upright`,
          `${card.name.toLowerCase()} love meaning`,
          'tarot card meanings',
        ],
      },
      ko: {
        title: `${card.nameKo}(${card.name}) 타로 카드 의미 — 정방향·역방향`,
        description: `타로 ${card.nameKo} 카드 의미. 정방향: ${card.upright.keywordsKo
          .slice(0, 3)
          .join(', ')}. 역방향: ${card.reversed.keywordsKo
          .slice(0, 3)
          .join(', ')}. 연애·직업 해석과 조언까지 한 페이지에.`,
        keywords: [
          `${card.nameKo} 타로`,
          `${card.nameKo} 카드 의미`,
          `타로 ${card.nameKo} 정방향`,
          `타로 ${card.nameKo} 역방향`,
          '타로 카드 의미',
        ],
      },
      canonicalUrl: `${baseUrl}/tarot/cards/${slug}`,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

const sectionTitleStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  margin: '0 0 12px',
  color: '#3c372c',
}

function KeywordChips({ words }: { words: string[] }) {
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: '0 0 14px',
        padding: 0,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      {words.map((w) => (
        <li
          key={w}
          style={{
            fontSize: 12.5,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(169,131,59,0.10)',
            border: '1px solid rgba(169,131,59,0.25)',
            color: '#7a6127',
          }}
        >
          {w}
        </li>
      ))}
    </ul>
  )
}

export default async function TarotCardPage({ params }: Props) {
  const { slug } = await params
  const card = getCardBySlug(slug)
  if (!card) {
    notFound()
  }
  const locale = await getServerLocale()
  const isKo = locale === 'ko'
  const { prev, next } = neighborCards(card)

  const title = isKo ? `${card.nameKo}(${card.name}) 카드 의미` : `${card.name} Tarot Card Meaning`
  const upright = isKo
    ? {
        keywords: card.upright.keywordsKo,
        meaning: card.upright.meaningKo,
        advice: card.upright.adviceKo,
      }
    : {
        keywords: card.upright.keywords,
        meaning: card.upright.meaning,
        advice: card.upright.advice,
      }
  const reversed = isKo
    ? {
        keywords: card.reversed.keywordsKo,
        meaning: card.reversed.meaningKo,
        advice: card.reversed.adviceKo,
      }
    : {
        keywords: card.reversed.keywords,
        meaning: card.reversed.meaning,
        advice: card.reversed.advice,
      }

  const articleJsonLd = generateJsonLd({
    type: 'Article',
    name: title,
    description: isKo
      ? `타로 ${card.nameKo} 카드의 정방향·역방향 의미와 조언`
      : `Upright and reversed meanings and advice for the ${card.name} tarot card`,
    image: `${baseUrl}${card.image}`,
    url: `${baseUrl}/tarot/cards/${slug}`,
    author: { name: 'DestinyPal', url: baseUrl },
  })
  const breadcrumbJsonLd = generateJsonLd({
    type: 'BreadcrumbList',
    breadcrumbs: [
      { name: 'Home', url: '' },
      { name: isKo ? 'AI 타로' : 'Tarot', url: '/tarot' },
      { name: isKo ? '카드 의미 사전' : 'Card Meanings', url: '/tarot/cards' },
      { name: isKo ? card.nameKo : card.name, url: `/tarot/cards/${slug}` },
    ],
  })

  const adviceBox = (text: string) => (
    <p
      style={{
        margin: 0,
        padding: '12px 16px',
        borderRadius: 10,
        background: 'rgba(169,131,59,0.08)',
        borderLeft: '3px solid #a9833b',
        fontSize: 14.5,
        lineHeight: 1.7,
        color: '#55503f',
      }}
    >
      <strong style={{ color: '#7a6127' }}>{isKo ? '조언 · ' : 'Advice · '}</strong>
      {text}
    </p>
  )

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(900px 620px at 25% 8%, rgba(99,124,200,0.07), transparent 60%),' +
          'radial-gradient(820px 700px at 85% 100%, rgba(212,181,114,0.16), transparent 60%),' +
          'linear-gradient(160deg, #fbf9f4 0%, #f4efe5 58%, #f8f5ee 100%)',
        color: '#2a2722',
      }}
    >
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 96px' }}>
        <nav style={{ fontSize: 13, color: '#6c665b', marginBottom: 24 }}>
          <Link href="/" style={{ color: '#6c665b' }}>
            {isKo ? '홈' : 'Home'}
          </Link>
          {' · '}
          <Link href="/tarot" style={{ color: '#6c665b' }}>
            {isKo ? 'AI 타로' : 'Tarot'}
          </Link>
          {' · '}
          <Link href="/tarot/cards" style={{ color: '#6c665b' }}>
            {isKo ? '카드 의미 사전' : 'Card Meanings'}
          </Link>
        </nav>

        <p style={{ fontSize: 13, color: '#a9833b', fontWeight: 600, margin: '0 0 6px' }}>
          {SUIT_LABELS[card.suit][locale]}
        </p>
        <h1 style={{ fontSize: 30, lineHeight: 1.25, margin: '0 0 6px', fontWeight: 700 }}>
          {title}
        </h1>
        <p style={{ fontSize: 14, color: '#8a8474', margin: '0 0 24px' }}>
          {isKo ? card.name : card.nameKo}
        </p>

        {/* 카드 이미지 — 덱 SSOT 의 webp. 원본 비율 유지, LCP 후보라 eager. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.image}
          alt={isKo ? `${card.nameKo}(${card.name}) 타로 카드` : `${card.name} tarot card`}
          width={220}
          height={378}
          style={{
            display: 'block',
            width: 220,
            height: 'auto',
            borderRadius: 12,
            margin: '0 0 32px',
            boxShadow: '0 10px 30px rgba(60,50,20,0.18)',
          }}
        />

        <section style={{ marginBottom: 34 }}>
          <h2 style={sectionTitleStyle}>{isKo ? '정방향 의미' : 'Upright Meaning'}</h2>
          <KeywordChips words={upright.keywords} />
          <p style={{ fontSize: 15.5, lineHeight: 1.85, margin: '0 0 14px', color: '#3c372c' }}>
            {upright.meaning}
          </p>
          {adviceBox(upright.advice)}
        </section>

        <section style={{ marginBottom: 34 }}>
          <h2 style={sectionTitleStyle}>{isKo ? '역방향 의미' : 'Reversed Meaning'}</h2>
          <KeywordChips words={reversed.keywords} />
          <p style={{ fontSize: 15.5, lineHeight: 1.85, margin: '0 0 14px', color: '#3c372c' }}>
            {reversed.meaning}
          </p>
          {adviceBox(reversed.advice)}
        </section>

        {/* 전환 훅 — 의미 검색으로 온 방문자를 무료 데일리 → AI 리딩으로 */}
        <section
          style={{
            padding: '18px 20px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(169,131,59,0.22)',
            marginBottom: 36,
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 10px' }}>
            {isKo
              ? `오늘 ${card.nameKo} 카드가 나올까요?`
              : `Will ${card.name} show up for you today?`}
          </p>
          <p style={{ fontSize: 13.5, color: '#6c665b', margin: '0 0 12px', lineHeight: 1.6 }}>
            {isKo
              ? '로그인 없이 오늘의 타로 한 장을 무료로 뽑아보세요. 더 깊은 질문은 AI 타로 리딩으로.'
              : 'Draw a free card of the day — no sign-up. For deeper questions, try an AI tarot reading.'}
          </p>
          <p style={{ margin: 0, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14 }}>
            <Link href="/tarot/daily" style={{ color: '#a9833b', fontWeight: 600 }}>
              {isKo ? '🔮 오늘의 타로 뽑기 →' : '🔮 Card of the day →'}
            </Link>
            <Link href="/tarot" style={{ color: '#a9833b', fontWeight: 600 }}>
              {isKo ? '✨ AI 타로 리딩 →' : '✨ AI tarot reading →'}
            </Link>
          </p>
        </section>

        <nav
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: 14,
            flexWrap: 'wrap',
          }}
        >
          <Link href={`/tarot/cards/${cardSlug(prev.name)}`} style={{ color: '#6c665b' }}>
            ← {isKo ? prev.nameKo : prev.name}
          </Link>
          <Link href="/tarot/cards" style={{ color: '#a9833b', fontWeight: 600 }}>
            {isKo ? '78장 전체 보기' : 'All 78 cards'}
          </Link>
          <Link href={`/tarot/cards/${cardSlug(next.name)}`} style={{ color: '#6c665b' }}>
            {isKo ? next.nameKo : next.name} →
          </Link>
        </nav>
      </div>
    </main>
  )
}

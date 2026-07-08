// 타로 카드 의미 사전 — 78장 인덱스.
//
// 프로그램매틱 SEO 허브: "tarot card meanings", "타로 카드 의미" 의도를 받고
// 78장 상세 페이지로 내부 링크를 뿌리는 크롤 진입점. 서버 컴포넌트 + 무로그인.
// 로케일은 proxy 가 주입하는 x-locale 로 읽는다(/free 와 동일 패턴).

import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { cardSlug, cardsOfSuit, SUIT_LABELS, SUIT_ORDER } from '@/lib/tarot/cardPages'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Tarot Card Meanings — All 78 Cards, Upright & Reversed',
        description:
          'Complete tarot card meanings for all 78 Rider-Waite cards. Major Arcana, Wands, Cups, Swords, and Pentacles — upright and reversed meanings, keywords, and advice.',
        keywords: [
          'tarot card meanings',
          'all 78 tarot cards',
          'major arcana meanings',
          'minor arcana meanings',
          'tarot cards list',
          'upright and reversed tarot meanings',
          'rider waite tarot meanings',
        ],
      },
      ko: {
        title: '타로 카드 의미 사전 — 78장 정방향·역방향 해석',
        description:
          '라이더-웨이트 타로 78장 전체 의미 사전. 메이저 아르카나부터 완드·컵·소드·펜타클까지, 정방향·역방향 의미와 키워드, 조언을 카드별로 정리했습니다.',
        keywords: [
          '타로 카드 의미',
          '타로 78장',
          '메이저 아르카나 의미',
          '마이너 아르카나',
          '타로 정방향 역방향',
          '타로 카드 해석',
        ],
      },
      canonicalUrl: `${baseUrl}/tarot/cards`,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

export default async function TarotCardsIndexPage() {
  const locale = await getServerLocale()
  const isKo = locale === 'ko'

  const breadcrumbJsonLd = generateJsonLd({
    type: 'BreadcrumbList',
    breadcrumbs: [
      { name: 'Home', url: '' },
      { name: isKo ? 'AI 타로' : 'Tarot', url: '/tarot' },
      { name: isKo ? '카드 의미 사전' : 'Card Meanings', url: '/tarot/cards' },
    ],
  })

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
      <JsonLd data={breadcrumbJsonLd} />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px 96px' }}>
        <nav style={{ fontSize: 13, color: '#6c665b', marginBottom: 24 }}>
          <Link href="/" style={{ color: '#6c665b' }}>
            {isKo ? '홈' : 'Home'}
          </Link>
          {' · '}
          <Link href="/tarot" style={{ color: '#6c665b' }}>
            {isKo ? 'AI 타로' : 'Tarot'}
          </Link>
          {' · '}
          <span style={{ color: '#a9833b' }}>{isKo ? '카드 의미 사전' : 'Card Meanings'}</span>
        </nav>

        <h1 style={{ fontSize: 30, lineHeight: 1.25, margin: '0 0 10px', fontWeight: 700 }}>
          {isKo ? '타로 카드 의미 사전 — 78장 전체' : 'Tarot Card Meanings — All 78 Cards'}
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#55503f', margin: '0 0 14px' }}>
          {isKo
            ? '라이더-웨이트 타로 78장의 정방향·역방향 의미, 키워드, 조언을 카드별로 정리했습니다. 카드를 눌러 자세한 해석을 확인하세요.'
            : 'Upright and reversed meanings, keywords, and advice for every card in the Rider-Waite deck. Tap a card for its full interpretation.'}
        </p>

        {/* 전환 훅 — 사전 방문자를 무료 데일리 → AI 리딩 퍼널로 */}
        <p style={{ fontSize: 14, margin: '0 0 34px' }}>
          <Link href="/tarot/daily" style={{ color: '#a9833b', fontWeight: 600 }}>
            {isKo ? '🔮 오늘의 타로 한 장 무료로 뽑기 →' : '🔮 Draw your free card of the day →'}
          </Link>
        </p>

        {SUIT_ORDER.map((suit) => {
          const cards = cardsOfSuit(suit)
          return (
            <section key={suit} style={{ marginBottom: 36 }}>
              <h2
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  margin: '0 0 4px',
                  color: '#3c372c',
                }}
              >
                {SUIT_LABELS[suit][locale]}
              </h2>
              <p style={{ fontSize: 13, color: '#8a8474', margin: '0 0 14px' }}>
                {isKo ? `${cards.length}장` : `${cards.length} cards`}
              </p>
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                  gap: 10,
                }}
              >
                {cards.map((card) => (
                  <li key={card.id}>
                    <Link
                      href={`/tarot/cards/${cardSlug(card.name)}`}
                      style={{
                        display: 'block',
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.65)',
                        border: '1px solid rgba(169,131,59,0.18)',
                        color: '#2a2722',
                        textDecoration: 'none',
                        fontSize: 14,
                        lineHeight: 1.5,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{isKo ? card.nameKo : card.name}</span>
                      <span style={{ color: '#8a8474', fontSize: 12, display: 'block' }}>
                        {isKo ? card.name : card.nameKo}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </main>
  )
}

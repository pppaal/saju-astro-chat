// src/app/r/[token]/page.tsx
//
// 공개 공유 리딩 페이지 — 로그인 없이 누구나 볼 수 있는 읽기 전용 타로 결과.
// 친구가 카톡/엑스 링크로 들어와 결과를 보고 "나도 뽑기" CTA 로 유입된다.
// CTA 에는 공유자의 추천 코드(?ref=)를 붙여, 신규 가입 시 양쪽 크레딧 귀속.
//
// 데이터는 shareToken 으로만 조회(getSharedReadingByToken) — 토큰이 없거나
// 비공개면 notFound(). 검색엔진 비색인(robots noindex) — 개인 리딩 보호.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSharedReadingByToken } from '@/lib/tarot/sharedReading'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ token: string }> }

const GOLD = '#e8cc8a'
const GOLD_SOFT = '#d4b572'
const MUTED = '#9aa3b8'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const reading = await getSharedReadingByToken(token)
  if (!reading) {
    return { title: 'DestinyPal Tarot', robots: { index: false, follow: false } }
  }
  const isKo = reading.locale === 'ko'
  const title = isKo ? `타로 리딩 — ${reading.question}` : `Tarot Reading — ${reading.question}`
  const description =
    (reading.overallMessage || reading.affirmation || '').slice(0, 160) ||
    (isKo ? 'DestinyPal 에서 받은 타로 리딩' : 'A tarot reading from DestinyPal')
  // OG 이미지는 같은 세그먼트의 opengraph-image.tsx 가 Next 파일 컨벤션으로
  // 자동 연결된다 — 여기선 제목/설명/비색인만.
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function SharedReadingPage({ params }: PageProps) {
  const { token } = await params
  const reading = await getSharedReadingByToken(token)
  if (!reading) notFound()

  const isKo = reading.locale === 'ko'
  const ctaHref = reading.referrerCode
    ? `/tarot?ref=${encodeURIComponent(reading.referrerCode)}`
    : '/tarot'

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(900px 620px at 25% 8%, rgba(99,124,200,0.16), transparent 60%),' +
          'radial-gradient(820px 700px at 85% 100%, rgba(212,181,114,0.14), transparent 60%),' +
          'linear-gradient(160deg, #0b1022 0%, #070a1a 58%, #0a0e1f 100%)',
        color: '#f1f3f9',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>
        {/* 브랜드 */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            color: GOLD,
            textDecoration: 'none',
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo.png"
            alt="DestinyPal"
            width={32}
            height={32}
            style={{ borderRadius: 6 }}
          />
          DestinyPal
        </Link>

        {/* 질문 */}
        <p
          style={{
            marginTop: 28,
            fontSize: 12,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: GOLD_SOFT,
          }}
        >
          {isKo ? '타로 리딩' : 'TAROT READING'}
        </p>
        <h1
          style={{
            marginTop: 10,
            fontSize: 26,
            lineHeight: 1.35,
            fontWeight: 700,
            wordBreak: 'keep-all',
          }}
        >
          {reading.question}
        </h1>
        <p style={{ marginTop: 8, fontSize: 13, color: MUTED }}>{reading.spreadTitle}</p>

        {/* 카드 */}
        <div
          style={{
            marginTop: 28,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {reading.cards.map((c, i) => (
            <div key={i} style={{ width: 96, textAlign: 'center' }}>
              <div
                style={{
                  width: 96,
                  height: 154,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '1px solid rgba(212,181,114,0.35)',
                  transform: c.isReversed ? 'rotate(180deg)' : 'none',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt={c.name}
                  width={96}
                  height={154}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <span style={{ fontSize: 11, color: MUTED, display: 'block', marginTop: 6 }}>
                {c.name}
                {c.isReversed ? (isKo ? ' (역)' : ' (R)') : ''}
              </span>
            </div>
          ))}
        </div>

        {/* overall */}
        {reading.overallMessage ? (
          <section style={{ marginTop: 32 }}>
            <p style={{ fontSize: 16, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {reading.overallMessage}
            </p>
          </section>
        ) : null}

        {/* 카드별 해석 */}
        {reading.cardInsights.length > 0 ? (
          <section style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {reading.cardInsights.map((ci, i) => (
              <div
                key={i}
                style={{
                  borderLeft: `2px solid rgba(212,181,114,0.4)`,
                  paddingLeft: 14,
                }}
              >
                <p style={{ fontSize: 13, color: GOLD_SOFT, fontWeight: 600 }}>
                  {ci.position || `${i + 1}`}
                  {ci.card_name ? ` · ${ci.card_name}` : ''}
                  {ci.is_reversed ? (isKo ? ' (역)' : ' (R)') : ''}
                </p>
                <p style={{ marginTop: 6, fontSize: 15, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                  {ci.interpretation}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        {/* advice */}
        {reading.guidance ? (
          <section
            style={{
              marginTop: 28,
              padding: 18,
              borderRadius: 14,
              background: 'rgba(212,181,114,0.08)',
              border: '1px solid rgba(212,181,114,0.25)',
            }}
          >
            <p style={{ fontSize: 13, color: GOLD_SOFT, fontWeight: 600, marginBottom: 6 }}>
              {isKo ? '조언' : 'Advice'}
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
              {reading.guidance}
            </p>
          </section>
        ) : null}

        {/* CTA — 나도 뽑기 (추천 코드 부착) */}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <Link
            href={ctaHref}
            style={{
              display: 'inline-block',
              padding: '14px 28px',
              borderRadius: 999,
              background: GOLD,
              color: '#1a1305',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: 16,
            }}
          >
            {isKo ? '나도 카드 뽑아보기 →' : 'Pull your own cards →'}
          </Link>
          <p style={{ marginTop: 12, fontSize: 12, color: MUTED }}>
            {isKo
              ? '이 링크로 가입하면 친구와 나 둘 다 무료 크레딧을 받아요.'
              : 'Sign up via this link and you both get free credits.'}
          </p>
        </div>
      </div>
    </main>
  )
}

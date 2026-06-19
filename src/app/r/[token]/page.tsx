// src/app/r/[token]/page.tsx
//
// 공개 공유 리딩 페이지 — 로그인 없이 누구나 볼 수 있는 읽기 전용 타로 결과.
// 친구가 카톡/엑스 링크로 들어와 카드+후크를 보고 "나도 뽑기" CTA 로 유입된다.
// 데이터는 토큰으로만 조회(getShareLink, Redis) — 없으면 notFound().
// 개인 리딩 보호를 위해 검색엔진 비색인(robots noindex).

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getShareLink } from '@/lib/tarot/shareLink'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PageProps = { params: Promise<{ token: string }> }

const GOLD = '#e8cc8a'
const GOLD_SOFT = '#d4b572'
const MUTED = '#9aa3b8'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const reading = await getShareLink(token)
  if (!reading) {
    return { title: 'DestinyPal Tarot', robots: { index: false, follow: false } }
  }
  const isKo = reading.isKo
  const title = reading.keyMessage
    ? `${reading.keyMessage} — DestinyPal`
    : isKo
      ? 'DestinyPal 타로 리딩'
      : 'DestinyPal Tarot Reading'
  const description = (reading.body || reading.question || '').slice(0, 160)
  // OG 이미지는 같은 세그먼트의 opengraph-image.tsx 가 자동 연결된다.
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
  const reading = await getShareLink(token)
  if (!reading) notFound()

  const isKo = reading.isKo
  const cards = reading.cards.slice(0, 10)

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
      <div
        style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px 96px', textAlign: 'center' }}
      >
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
            width={30}
            height={30}
            style={{ borderRadius: 6 }}
          />
          DestinyPal
        </Link>

        {/* 질문(맥락) */}
        <p
          style={{
            marginTop: 32,
            fontSize: 12,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: GOLD_SOFT,
          }}
        >
          {isKo ? '타로 리딩' : 'TAROT READING'}
        </p>
        <p style={{ marginTop: 10, fontSize: 16, color: MUTED, wordBreak: 'keep-all' }}>
          {reading.question}
        </p>

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
          {cards.map((c, i) => (
            <div key={i} style={{ width: 104, textAlign: 'center' }}>
              <div
                style={{
                  width: 104,
                  height: 166,
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid rgba(212,181,114,0.35)',
                  transform: c.isReversed ? 'rotate(180deg)' : 'none',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt={c.name}
                  width={104}
                  height={166}
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

        {/* 후크 — 주인공 */}
        {reading.keyMessage ? (
          <h1
            style={{
              marginTop: 32,
              fontSize: 30,
              fontWeight: 800,
              lineHeight: 1.35,
              color: GOLD,
              wordBreak: 'keep-all',
              textShadow: '0 2px 24px rgba(212,181,114,0.18)',
            }}
          >
            {reading.keyMessage}
          </h1>
        ) : null}

        {/* 본문(선택) */}
        {reading.body ? (
          <p
            style={{
              marginTop: 20,
              fontSize: 16,
              lineHeight: 1.85,
              color: '#dfe3ee',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
            }}
          >
            {reading.body}
          </p>
        ) : null}

        {/* CTA — 나도 뽑기 */}
        <div style={{ marginTop: 44 }}>
          <Link
            href="/tarot"
            style={{
              display: 'inline-block',
              padding: '15px 30px',
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
          <p style={{ marginTop: 14, fontSize: 12, color: MUTED }}>
            {isKo
              ? '질문 하나면 나만의 타로 해석을 받아볼 수 있어요.'
              : 'Ask one question and get your own tarot reading.'}
          </p>
        </div>
      </div>
    </main>
  )
}

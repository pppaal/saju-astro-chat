// src/app/r/[token]/page.tsx
//
// 공개 공유 리딩 페이지 — 로그인 없이 누구나 볼 수 있는 읽기 전용 타로 결과.
// 친구가 카톡/엑스 링크로 들어와 카드+후크를 보고 "나도 뽑기" CTA 로 유입된다.
// 데이터는 토큰으로만 조회(getShareLink, Redis) — 없으면 notFound().
// 개인 리딩 보호를 위해 검색엔진 비색인(robots noindex).

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getShareLink, isCompatShare } from '@/lib/tarot/shareLink'
import { recordCounter } from '@/lib/metrics/index'

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
  if (isCompatShare(reading)) {
    const headline = reading.verdict || (isKo ? 'DestinyPal 궁합' : 'DestinyPal Compatibility')
    const compatTitle = `${reading.nameA} ♥ ${reading.nameB} — DestinyPal`
    const compatDesc = (reading.verdict || reading.headline || '').slice(0, 160)
    return {
      title: headline.length > 60 ? compatTitle : `${headline} — DestinyPal`,
      description: compatDesc,
      robots: { index: false, follow: false },
      openGraph: { title: compatTitle, description: compatDesc, type: 'article' },
      twitter: { card: 'summary_large_image', title: compatTitle, description: compatDesc },
    }
  }
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

  // 퍼널 측정 — 공유 링크가 실제로 열린 횟수(바이럴 도달). 토큰 단위는 아니고 총량.
  recordCounter('tarot.share.viewed', 1)

  const isKo = reading.isKo

  // 궁합 공유는 카드가 없고 verdict 한 줄이 주인공 — 별도 레이아웃.
  if (isCompatShare(reading)) {
    recordCounter('compatibility.share.viewed', 1)
    const verdictColor =
      reading.verdictTone === 'aligned'
        ? GOLD
        : reading.verdictTone === 'tension'
          ? '#fda4af'
          : reading.verdictTone === 'mixed'
            ? '#fbbf24'
            : '#dfe3ee'
    return (
      <main
        style={{
          minHeight: '100vh',
          background:
            'radial-gradient(900px 620px at 25% 8%, rgba(236,72,153,0.16), transparent 60%),' +
            'radial-gradient(820px 700px at 85% 100%, rgba(212,181,114,0.14), transparent 60%),' +
            'linear-gradient(160deg, #0b1022 0%, #070a1a 58%, #0a0e1f 100%)',
          color: '#f1f3f9',
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: '0 auto',
            padding: '40px 20px 96px',
            textAlign: 'center',
          }}
        >
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

          <p
            style={{
              marginTop: 36,
              fontSize: 12,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: GOLD_SOFT,
            }}
          >
            {isKo ? '궁합 결과' : 'COMPATIBILITY'}
          </p>
          <p style={{ marginTop: 14, fontSize: 22, fontWeight: 700, color: '#f1f3f9' }}>
            {reading.nameA} <span style={{ color: '#ec4899' }}>♥</span> {reading.nameB}
          </p>

          <h1
            style={{
              marginTop: 28,
              fontSize: 28,
              fontWeight: 800,
              lineHeight: 1.4,
              color: verdictColor,
              wordBreak: 'keep-all',
              overflowWrap: 'anywhere',
              textShadow: '0 2px 24px rgba(212,181,114,0.18)',
            }}
          >
            {reading.verdict}
          </h1>

          {reading.headline ? (
            <p
              style={{
                marginTop: 18,
                fontSize: 16,
                lineHeight: 1.8,
                color: '#dfe3ee',
                wordBreak: 'keep-all',
              }}
            >
              {reading.headline}
            </p>
          ) : null}

          <div style={{ marginTop: 44 }}>
            <Link
              href="/compatibility/free"
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
              {isKo ? '우리 궁합도 무료로 보기 →' : 'Check your match free →'}
            </Link>
            <p style={{ marginTop: 14, fontSize: 12, color: MUTED }}>
              {isKo
                ? '로그인 없이 두 사람 생년월일만 넣으면 바로 결과가 나와요.'
                : 'No sign-up — just two birth dates and you get the result.'}
            </p>
          </div>
        </div>
      </main>
    )
  }

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
        <p
          style={{
            marginTop: 10,
            fontSize: 16,
            color: MUTED,
            wordBreak: 'keep-all',
            overflowWrap: 'anywhere',
          }}
        >
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
              <span
                style={{
                  fontSize: 11,
                  color: MUTED,
                  display: 'block',
                  marginTop: 6,
                  maxWidth: 104,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
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
              overflowWrap: 'anywhere',
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
            {/* 정상 문단 줄바꿈은 유지하되, 과한 빈 줄(3줄+)은 정리해 뚝뚝 끊김 방지. */}
            {reading.body.replace(/\n{3,}/g, '\n\n').trim()}
          </p>
        ) : null}

        {/* CTA — 나도 뽑기. 공유 링크로 온 사람은 가입·폼 없이 "오늘의 카드"를
            바로 무료로 받게 /tarot/daily 로 보낸다(즉시 가치 → 전환율↑). */}
        <div style={{ marginTop: 44 }}>
          <Link
            href="/tarot/daily"
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
            {isKo ? '나도 카드 뽑아보기 →' : 'Pull your own card →'}
          </Link>
          <p style={{ marginTop: 14, fontSize: 12, color: MUTED }}>
            {isKo
              ? '로그인 없이 오늘의 카드 한 장을 무료로 받아보세요.'
              : 'Get your free card of the day — no sign-up needed.'}
          </p>
        </div>
      </div>
    </main>
  )
}

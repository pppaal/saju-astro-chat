// src/app/r/[token]/page.tsx
//
// 공개 공유 리딩 페이지 — 로그인 없이 누구나 볼 수 있는 읽기 전용 타로 결과.
// 친구가 카톡/엑스 링크로 들어와 카드+후크를 보고 "나도 뽑기" CTA 로 유입된다.
// 데이터는 토큰으로만 조회(getShareLink, Redis) — 없으면 notFound().
// 개인 리딩 보호를 위해 검색엔진 비색인(robots noindex).

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getShareLink,
  isCompatShare,
  isCalendarShare,
  isDayShare,
  isLifeShare,
  isReportShare,
  bumpShareViews,
} from '@/lib/tarot/shareLink'
import { buildCurveSvg, curveSvgDataUri } from '@/lib/share/curveSvg'
import { recordCounter } from '@/lib/metrics/index'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PageProps = { params: Promise<{ token: string }> }

const GOLD = '#e8cc8a'
const GOLD_SOFT = '#d4b572'
const MUTED = '#9aa3b8'

// 라이트 페이퍼 팔레트 — 라이트로 전환된 공유 분기(캘린더·일진·인생·타로)에서 쓴다.
// 위 GOLD/GOLD_SOFT/MUTED 다크 상수는 다크를 유지하는 리포트 분기 전용으로 남긴다.
// (궁합 분기는 같은 값의 로컬 상수를 이미 선언하고 있다.)
const PAPER_BG =
  'radial-gradient(60% 32% at 50% 0%, rgba(169,131,59,0.08), transparent 70%),' +
  'linear-gradient(180deg, #FCFAF4 0%, #F6F1E6 100%)'
const INK = '#211f1b'
const SUB = '#6c665b'
const MUTE = '#9a9384'
const GOLD_INK = '#a9833b'
const ROSE = '#c2548a'
const AMBER = '#B98E3C'
const CARD_BG = '#FFFDF8'
const CARD_BORDER = '1px solid rgba(169,131,59,0.16)'
const CARD_SHADOW = '0 8px 22px rgba(120,90,30,0.06)'
const CTA_BG = 'linear-gradient(135deg, #B98E3C, #C9A85F)'
const CTA_SHADOW = '0 10px 26px rgba(169,131,59,0.26)'
// 라이트 곡선 테마 — buildCurveSvg 에 넘기는 라이트 페이퍼용 색.
const LIGHT_CURVE = {
  stroke: AMBER,
  fill: '#C9A85F',
  dotGood: '#C9A85F',
  dotMid: '#C9A85F',
  dotLow: ROSE,
  marker: AMBER,
  dotStroke: '#FBF6EC',
}

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
  if (isCalendarShare(reading)) {
    const calTitle = reading.headline
      ? `${reading.headline} — DestinyPal`
      : `${reading.periodLabel} — DestinyPal`
    const calDesc = (reading.headline || reading.periodLabel).slice(0, 160)
    return {
      title: calTitle,
      description: calDesc,
      robots: { index: false, follow: false },
      openGraph: { title: calTitle, description: calDesc, type: 'article' },
      twitter: { card: 'summary_large_image', title: calTitle, description: calDesc },
    }
  }
  if (isDayShare(reading)) {
    const dayTitle = `${reading.headline} — DestinyPal`
    const dayDesc = (reading.subline || reading.headline).slice(0, 160)
    return {
      title: dayTitle,
      description: dayDesc,
      robots: { index: false, follow: false },
      openGraph: { title: dayTitle, description: dayDesc, type: 'article' },
      twitter: { card: 'summary_large_image', title: dayTitle, description: dayDesc },
    }
  }
  if (isLifeShare(reading)) {
    const lifeTitle = `${reading.headline} — DestinyPal`
    const lifeDesc = (reading.subline || reading.headline).slice(0, 160)
    return {
      title: lifeTitle,
      description: lifeDesc,
      robots: { index: false, follow: false },
      openGraph: { title: lifeTitle, description: lifeDesc, type: 'article' },
      twitter: { card: 'summary_large_image', title: lifeTitle, description: lifeDesc },
    }
  }
  if (isReportShare(reading)) {
    const repTitle = `${reading.emoji} ${reading.typeName} — DestinyPal`
    const repDesc = reading.oneLiner.slice(0, 160)
    return {
      title: repTitle,
      description: repDesc,
      robots: { index: false, follow: false },
      openGraph: { title: repTitle, description: repDesc, type: 'article' },
      twitter: { card: 'summary_large_image', title: repTitle, description: repDesc },
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

  // 소셜 증거 — 이 결과(토큰)가 지금까지 몇 번 열렸나. 너무 작은 수(<5)는
  // 오히려 빈약해 보여 숨긴다. best-effort 라 실패하면 0 → 표시 안 함.
  const views = await bumpShareViews(token)
  const socialProof =
    views >= 5
      ? isKo
        ? `지금까지 ${views.toLocaleString()}번 열린 결과예요`
        : `Opened ${views.toLocaleString()} times so far`
      : null

  // 궁합 공유는 카드가 없고 verdict 한 줄이 주인공 — 별도 레이아웃.
  if (isCompatShare(reading)) {
    recordCounter('compatibility.share.viewed', 1)
    // 라이트 페이퍼 팔레트 — 무료 결과 페이지와 톤 통일(compat 분기 전용 로컬 색).
    const INK = '#211f1b'
    const SUB = '#6c665b'
    const MUTE = '#9a9384'
    const GOLD_INK = '#a9833b'
    const GOLD_LINE = 'rgba(169,131,59,0.5)'
    const ROSE = '#c2548a'
    const toneLabel =
      reading.verdictTone === 'aligned'
        ? isKo
          ? '결이 잘 맞아요'
          : 'Aligned'
        : reading.verdictTone === 'tension'
          ? isKo
            ? '팽팽한 긴장'
            : 'High tension'
          : reading.verdictTone === 'mixed'
            ? isKo
              ? '끌림과 충돌'
              : 'Push & pull'
            : isKo
              ? '담백한 케미'
              : 'Easy chemistry'
    return (
      <main
        style={{
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #FCFAF4 0%, #F6F1E6 100%)',
          color: INK,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '-8% 20% auto 20%',
            height: '32%',
            background:
              'radial-gradient(60% 100% at 50% 0%, rgba(169,131,59,0.08), transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'relative',
            maxWidth: 600,
            margin: '0 auto',
            padding: '44px 24px 96px',
            textAlign: 'center',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              color: GOLD_INK,
              textDecoration: 'none',
              fontWeight: 700,
              letterSpacing: '0.02em',
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
              marginTop: 44,
              fontSize: 12,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: MUTE,
            }}
          >
            {isKo ? '궁합' : 'Compatibility'}
          </p>
          <p style={{ marginTop: 16, fontSize: 23, fontWeight: 700, color: INK }}>
            {reading.nameA} <span style={{ color: ROSE, margin: '0 6px' }}>♥</span> {reading.nameB}
          </p>

          <div
            style={{
              marginTop: 30,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 16px',
              border: `1px solid ${GOLD_LINE}`,
              borderRadius: 999,
              fontSize: 13,
              color: GOLD_INK,
              background: 'rgba(169,131,59,0.06)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: GOLD_INK,
                display: 'inline-block',
              }}
            />{' '}
            {toneLabel}
          </div>

          <h1
            style={{
              marginTop: 22,
              fontSize: 29,
              fontWeight: 700,
              lineHeight: 1.45,
              color: INK,
              wordBreak: 'keep-all',
              overflowWrap: 'anywhere',
              letterSpacing: '-0.01em',
            }}
          >
            {reading.verdict}
          </h1>

          {reading.headline ? (
            <p
              style={{
                marginTop: 18,
                fontSize: 16,
                lineHeight: 1.85,
                color: SUB,
                wordBreak: 'keep-all',
              }}
            >
              {reading.headline}
            </p>
          ) : null}

          <div style={{ width: 48, height: 1, background: GOLD_LINE, margin: '40px auto 0' }} />

          {socialProof ? (
            <p style={{ marginTop: 28, fontSize: 13, color: MUTE }}>{socialProof}</p>
          ) : null}

          <div style={{ marginTop: socialProof ? 24 : 40 }}>
            <Link
              href={reading.inviter ? `/compatibility/free?invite=${token}` : '/compatibility/free'}
              style={{
                display: 'inline-block',
                padding: '16px 34px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #B98E3C, #C9A85F)',
                color: '#fff',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 16,
                boxShadow: '0 10px 28px rgba(169,131,59,0.28)',
              }}
            >
              {reading.inviter
                ? isKo
                  ? `${reading.nameA}님과 내 궁합 보기 →`
                  : `See your match with ${reading.nameA} →`
                : isKo
                  ? '우리 궁합도 무료로 보기 →'
                  : 'Check your match free →'}
            </Link>
            <p style={{ marginTop: 16, fontSize: 12, lineHeight: 1.7, color: MUTE }}>
              {reading.inviter
                ? isKo
                  ? `${reading.nameA}님 정보는 채워져 있어요 — 내 생년월일만 넣으면 바로 결과가 나와요.`
                  : `${reading.nameA} is already filled in — just add your own birth date.`
                : isKo
                  ? '로그인 없이 두 사람 생년월일만 넣으면 바로 결과가 나와요.'
                  : 'No sign-up — just two birth dates and you get the result.'}
            </p>
          </div>
        </div>
      </main>
    )
  }

  // 운흐름 캘린더 공유 — 기간 한 줄 총평이 주인공. 별도 레이아웃.
  if (isCalendarShare(reading)) {
    recordCounter('calendar.share.viewed', 1)
    return (
      <main
        style={{
          minHeight: '100vh',
          background: PAPER_BG,
          color: INK,
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
              color: GOLD_INK,
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
              color: MUTE,
            }}
          >
            {isKo ? '운흐름 캘린더' : 'DESTINY CALENDAR'}
          </p>
          <p style={{ marginTop: 12, fontSize: 18, fontWeight: 700, color: INK }}>
            {reading.periodLabel}
          </p>

          <h1
            style={{
              marginTop: 26,
              fontSize: 27,
              fontWeight: 800,
              lineHeight: 1.45,
              color: GOLD_INK,
              wordBreak: 'keep-all',
              overflowWrap: 'anywhere',
            }}
          >
            {reading.headline}
          </h1>

          {reading.curve && reading.curve.length >= 2
            ? (() => {
                const curveImg = curveSvgDataUri(
                  buildCurveSvg({
                    scores: reading.curve,
                    markerIndex: reading.markerIndex ?? -1,
                    width: 560,
                    height: 140,
                    strokeWidth: 3,
                    theme: LIGHT_CURVE,
                  })
                )
                return (
                  <div style={{ marginTop: 24 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={curveImg}
                      alt={isKo ? '이달 흐름 곡선' : 'Monthly flow'}
                      width={560}
                      height={140}
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                  </div>
                )
              })()
            : null}

          {reading.highlights?.length ? (
            <ul
              style={{
                marginTop: 26,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                textAlign: 'left',
              }}
            >
              {reading.highlights.slice(0, 5).map((h, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: SUB,
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: CARD_BG,
                    border: CARD_BORDER,
                    boxShadow: CARD_SHADOW,
                    wordBreak: 'keep-all',
                  }}
                >
                  {h}
                </li>
              ))}
            </ul>
          ) : null}

          {socialProof ? (
            <p style={{ marginTop: 26, fontSize: 13, color: GOLD_INK }}>✦ {socialProof}</p>
          ) : null}

          <div style={{ marginTop: 44 }}>
            <Link
              href="/free"
              style={{
                display: 'inline-block',
                padding: '15px 30px',
                borderRadius: 999,
                background: CTA_BG,
                color: '#fff',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 16,
                boxShadow: CTA_SHADOW,
              }}
            >
              {isKo ? '내 운흐름도 무료로 보기 →' : 'See your own timing free →'}
            </Link>
            <p style={{ marginTop: 14, fontSize: 12, color: MUTE }}>
              {isKo
                ? '생년월일로 이달의 큰 날과 흐름을 무료로 확인할 수 있어요.'
                : 'Find your key days and flow this month, free.'}
            </p>
          </div>
        </div>
      </main>
    )
  }

  // 무료 통합 리포트 공유 — 사주 "유형 별명" + 소름 한 줄이 주인공. 별도 레이아웃.
  if (isReportShare(reading)) {
    recordCounter('report.share.viewed', 1)
    return (
      <main
        style={{
          minHeight: '100vh',
          background:
            'radial-gradient(900px 620px at 25% 8%, rgba(212,181,114,0.18), transparent 60%),' +
            'radial-gradient(820px 700px at 85% 100%, rgba(99,124,200,0.14), transparent 60%),' +
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
            {isKo ? '사주 × 별자리 유형' : 'KOREAN ASTROLOGY × ZODIAC'}
          </p>
          <p style={{ marginTop: 16, fontSize: 52, lineHeight: 1 }}>{reading.emoji}</p>
          <h1
            style={{
              marginTop: 16,
              fontSize: 28,
              fontWeight: 800,
              lineHeight: 1.4,
              color: GOLD,
              wordBreak: 'keep-all',
              overflowWrap: 'anywhere',
              textShadow: '0 2px 24px rgba(212,181,114,0.18)',
            }}
          >
            {reading.typeName}
          </h1>
          {reading.iljuLine ? (
            <p
              style={{
                marginTop: 10,
                fontSize: 14,
                lineHeight: 1.6,
                color: GOLD_SOFT,
                wordBreak: 'keep-all',
              }}
            >
              {reading.iljuLine}
            </p>
          ) : null}
          <p
            style={{
              marginTop: 18,
              fontSize: 16,
              lineHeight: 1.8,
              color: '#dfe3ee',
              wordBreak: 'keep-all',
            }}
          >
            {reading.oneLiner}
          </p>

          {reading.resonant?.length ? (
            <ul
              style={{
                marginTop: 26,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                textAlign: 'left',
              }}
            >
              {reading.resonant.slice(0, 3).map((h, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: '#dfe3ee',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(232,204,138,0.14)',
                    wordBreak: 'keep-all',
                  }}
                >
                  🔮 {h}
                </li>
              ))}
            </ul>
          ) : null}

          {/* 동·서양이 엇갈린 지점 — 링크를 연 사람의 "내 것도 궁금"을 만드는,
              이 페이지에서 가장 차트-고유한 훅. */}
          {reading.clash ? (
            <div
              style={{
                marginTop: reading.resonant?.length ? 12 : 26,
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(232,204,138,0.22)',
                textAlign: 'left',
                fontSize: 15,
                lineHeight: 1.65,
                color: '#dfe3ee',
                wordBreak: 'keep-all',
              }}
            >
              ⚡{' '}
              {isKo ? (
                <>
                  <b style={{ color: GOLD }}>{reading.clash.category}</b>에선 갈렸어 — 사주는
                  &ldquo;{reading.clash.saju}&rdquo;, 별자리는 &ldquo;{reading.clash.astro}&rdquo;.
                  둘 다 이 사람이에요.
                </>
              ) : (
                <>
                  They split on <b style={{ color: GOLD }}>{reading.clash.category}</b> — Saju says
                  &ldquo;{reading.clash.saju}&rdquo;, the stars say &ldquo;{reading.clash.astro}
                  &rdquo;. Both are true.
                </>
              )}
            </div>
          ) : null}

          {socialProof ? (
            <p style={{ marginTop: 26, fontSize: 13, color: GOLD_SOFT }}>✦ {socialProof}</p>
          ) : null}

          <div style={{ marginTop: 44 }}>
            <Link
              // 초대 토큰을 실어 랜딩→전환을 리포트 퍼널로 귀속(K 계산). 리포트 페이지의
              // ReportInviteTracker 가 ?invite= 를 읽어 invite_landed/converted 를 쏜다.
              href={`/integrated-report?invite=${encodeURIComponent(token)}`}
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
              {isKo ? '내 유형도 무료로 보기 →' : 'See your own type free →'}
            </Link>
            <p style={{ marginTop: 14, fontSize: 12, color: MUTED }}>
              {isKo
                ? '생년월일만 넣으면 사주와 별자리를 함께 읽은 통합 리포트가 무료로 나와요.'
                : 'Just your birth date — get a free Saju + astrology report read together.'}
            </p>
          </div>
        </div>
      </main>
    )
  }

  // 하루(일진) 공유 — 점수 + 한 줄 + 이달 흐름 곡선이 주인공.
  if (isDayShare(reading)) {
    recordCounter('calendar.dayShare.viewed', 1)
    const accent = reading.tone === 'caution' ? ROSE : reading.tone === 'mixed' ? AMBER : GOLD_INK
    const curveImg =
      reading.curve && reading.curve.length >= 2
        ? curveSvgDataUri(
            buildCurveSvg({
              scores: reading.curve,
              markerIndex: reading.markerIndex ?? -1,
              width: 560,
              height: 150,
              strokeWidth: 3,
              theme: {
                stroke: accent,
                fill: accent,
                dotGood: accent,
                dotMid: '#C9A85F',
                dotLow: ROSE,
                marker: AMBER,
                dotStroke: '#FBF6EC',
              },
            })
          )
        : null
    return (
      <main
        style={{
          minHeight: '100vh',
          background: PAPER_BG,
          color: INK,
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
              color: GOLD_INK,
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
              color: MUTE,
            }}
          >
            {reading.dateLabel}
          </p>
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: 4,
              color: accent,
            }}
          >
            <span style={{ fontSize: 72, fontWeight: 800, lineHeight: 1 }}>{reading.score}</span>
            <span style={{ fontSize: 22, fontWeight: 800 }}>{isKo ? '점' : ''}</span>
          </div>

          <h1
            style={{
              marginTop: 22,
              fontSize: 28,
              fontWeight: 800,
              lineHeight: 1.4,
              color: INK,
              wordBreak: 'keep-all',
              overflowWrap: 'anywhere',
            }}
          >
            {reading.headline}
          </h1>
          {reading.subline ? (
            <p
              style={{
                marginTop: 14,
                fontSize: 16,
                lineHeight: 1.7,
                color: SUB,
                wordBreak: 'keep-all',
              }}
            >
              {reading.subline}
            </p>
          ) : null}

          {curveImg ? (
            <div style={{ marginTop: 28 }}>
              <p style={{ fontSize: 12, color: MUTE, marginBottom: 6 }}>
                {isKo ? '이달의 흐름' : 'This month'}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={curveImg}
                alt={isKo ? '이달 흐름 곡선' : 'Monthly flow'}
                width={560}
                height={150}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          ) : null}

          <div style={{ marginTop: 40 }}>
            <Link
              href="/free"
              style={{
                display: 'inline-block',
                padding: '15px 30px',
                borderRadius: 999,
                background: CTA_BG,
                color: '#fff',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 16,
                boxShadow: CTA_SHADOW,
              }}
            >
              {isKo ? '내 점수도 무료로 보기 →' : 'Get your score free →'}
            </Link>
            <p style={{ marginTop: 14, fontSize: 12, color: MUTE }}>
              {isKo
                ? '생년월일만 넣으면 오늘의 점수와 이달 흐름을 무료로 볼 수 있어요.'
                : 'Just your birth date — see today’s score and this month’s flow, free.'}
            </p>
          </div>
        </div>
      </main>
    )
  }

  // 인생/대운 곡선 공유 — 한 줄 + 인생 흐름 곡선이 주인공.
  if (isLifeShare(reading)) {
    recordCounter('life.share.viewed', 1)
    const curveImg =
      reading.curve.length >= 2
        ? curveSvgDataUri(
            buildCurveSvg({
              scores: reading.curve,
              markerIndex: reading.markerIndex ?? -1,
              peakIndex: reading.peakIndex ?? -1,
              width: 560,
              height: 180,
              strokeWidth: 3,
              theme: LIGHT_CURVE,
            })
          )
        : null
    const axis = (reading.axisLabels ?? []).slice(0, 4)
    return (
      <main
        style={{
          minHeight: '100vh',
          background: PAPER_BG,
          color: INK,
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
              color: GOLD_INK,
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
              color: MUTE,
            }}
          >
            {reading.rangeLabel || (isKo ? '사주 × 별자리' : 'Korean Astrology × Zodiac')}
          </p>

          <h1
            style={{
              marginTop: 22,
              fontSize: 30,
              fontWeight: 800,
              lineHeight: 1.36,
              color: INK,
              wordBreak: 'keep-all',
              overflowWrap: 'anywhere',
            }}
          >
            {reading.headline}
          </h1>
          {reading.subline ? (
            <p
              style={{
                marginTop: 14,
                fontSize: 16,
                lineHeight: 1.7,
                color: SUB,
                wordBreak: 'keep-all',
              }}
            >
              {reading.subline}
            </p>
          ) : null}

          {curveImg ? (
            <div style={{ marginTop: 28 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={curveImg}
                alt={isKo ? '인생 흐름 곡선' : 'Life curve'}
                width={560}
                height={180}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              {axis.length ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    maxWidth: 560,
                    margin: '4px auto 0',
                    padding: '0 8px',
                  }}
                >
                  {axis.map((a, i) => (
                    <span key={i} style={{ fontSize: 11, color: MUTE }}>
                      {a}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ marginTop: 40 }}>
            <Link
              href="/free"
              style={{
                display: 'inline-block',
                padding: '15px 30px',
                borderRadius: 999,
                background: CTA_BG,
                color: '#fff',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 16,
                boxShadow: CTA_SHADOW,
              }}
            >
              {isKo ? '내 인생 곡선도 무료로 보기 →' : 'See your life curve free →'}
            </Link>
            <p style={{ marginTop: 14, fontSize: 12, color: MUTE }}>
              {isKo
                ? '생년월일만 넣으면 대운 흐름과 큰 마디를 무료로 볼 수 있어요.'
                : 'Just your birth date — see your life’s arc and turning points, free.'}
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
        background: PAPER_BG,
        color: INK,
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
            color: GOLD_INK,
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
            color: MUTE,
          }}
        >
          {isKo ? '타로 리딩' : 'TAROT READING'}
        </p>
        <p
          style={{
            marginTop: 10,
            fontSize: 16,
            color: SUB,
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
                  border: '1px solid rgba(169,131,59,0.35)',
                  boxShadow: CARD_SHADOW,
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
                  color: MUTE,
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
              color: GOLD_INK,
              wordBreak: 'keep-all',
              overflowWrap: 'anywhere',
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
              color: SUB,
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
              background: CTA_BG,
              color: '#fff',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: 16,
              boxShadow: CTA_SHADOW,
            }}
          >
            {isKo ? '나도 카드 뽑아보기 →' : 'Pull your own card →'}
          </Link>
          <p style={{ marginTop: 14, fontSize: 12, color: MUTE }}>
            {isKo
              ? '로그인 없이 오늘의 카드 한 장을 무료로 받아보세요.'
              : 'Get your free card of the day — no sign-up needed.'}
          </p>
        </div>
      </div>
    </main>
  )
}

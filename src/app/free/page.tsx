// src/app/free/page.tsx
//
// 무료 퍼널 허브 — 인스타/쓰레드/유튜브 바이오에 링크하는 단일 랜딩.
// "전부 무료, 로그인 없이 지금 바로"를 내세워 4개 무료 도구로 분기시키고,
// 각 도구의 결과가 다시 공유로 퍼지는 바이럴 루프의 시작점이 된다.
//
// 서버 컴포넌트 — OG/트위터 카드 + SSR 로 소셜 크롤러가 미리보기를 잡고,
// 검색엔진에도 색인된다(개인 결과가 아니라 마케팅 랜딩이라 noindex 아님).
// 로케일은 미들웨어가 주입하는 x-locale 헤더로 읽는다(클라 useI18n 과 동일 SSOT).

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { recordCounter } from '@/lib/metrics/index'
import EngineMoatBanner from '@/components/marketing/EngineMoatBanner'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GOLD = '#e8cc8a'
const GOLD_SOFT = '#d4b572'
const MUTED = '#9aa3b8'

async function resolveLocale(): Promise<'ko' | 'en'> {
  const h = await headers()
  return h.get('x-locale') === 'en' ? 'en' : 'ko'
}

export async function generateMetadata(): Promise<Metadata> {
  const isKo = (await resolveLocale()) === 'ko'
  const title = isKo
    ? '전부 무료 — 오늘의 타로·운세 캘린더·사주 리포트·궁합 | DestinyPal'
    : 'All Free — Tarot, Fortune Calendar, Saju Report & Compatibility | DestinyPal'
  const description = isKo
    ? '로그인 없이 지금 바로. 오늘의 타로 한 장, 운세 캘린더, 사주·별자리 통합 리포트, 궁합까지 전부 무료로 받아보세요.'
    : 'No sign-up, right now. A free card of the day, fortune calendar, Saju + astrology report, and compatibility — all free.'
  return {
    title,
    description,
    alternates: { canonical: '/free' },
    openGraph: {
      type: 'website',
      url: '/free',
      title,
      description,
      images: [{ url: '/og-card-v2.png', width: 1200, height: 630, alt: 'DestinyPal' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-card-v2.png'] },
  }
}

// 무료 도구 카드 — href 는 전부 "로그인 없이 즉시 가치"가 나오는 진입점.
//  타로 → 데일리(완전 무료) / 캘린더 → 프리뷰 / 리포트 → 샘플 폴백 / 궁합 → 상담사
type FreeTool = {
  href: string
  emoji: string
  tint: string
  title: { ko: string; en: string }
  desc: { ko: string; en: string }
  badge: { ko: string; en: string }
}

const FREE_TOOLS: readonly FreeTool[] = [
  {
    href: '/tarot/daily',
    emoji: '🔮',
    tint: '#a855f7',
    title: { ko: '오늘의 타로 한 장', en: 'Card of the Day' },
    desc: {
      ko: '로그인 없이 하루 한 장. 오늘의 흐름과 해볼 만한 행동 한 가지.',
      en: 'One card a day, no sign-up. Today’s flow and one thing to try.',
    },
    badge: { ko: '완전 무료 · 로그인 X', en: 'Free · no sign-up' },
  },
  {
    href: '/compatibility/free',
    emoji: '💕',
    tint: '#ec4899',
    title: { ko: '궁합 보기', en: 'Compatibility' },
    desc: {
      ko: '두 사람의 사주·별자리로 보는 관계 케미. 친구·연인과 함께 해보세요.',
      en: 'Relationship chemistry from two charts. Try it with a friend or partner.',
    },
    badge: { ko: '완전 무료 · 로그인 X', en: 'Free · no sign-up' },
  },
  {
    href: '/calendar/preview',
    emoji: '🗓️',
    tint: '#38bdf8',
    title: { ko: '운세 캘린더', en: 'Fortune Calendar' },
    desc: {
      ko: '일·월·년 운흐름 타이밍을 한눈에. 언제 움직이면 좋을지 미리 보기.',
      en: 'Daily · monthly · yearly timing at a glance — see when to move.',
    },
    badge: { ko: '무료 미리보기', en: 'Free preview' },
  },
  {
    href: '/integrated-report',
    emoji: '📜',
    tint: '#e8cc8a',
    title: { ko: '사주·별자리 통합 리포트', en: 'Saju + Astrology Report' },
    desc: {
      ko: '사주 네 기둥과 출생 별자리를 함께 읽는 통합 분석. 생년월일만 있으면 끝.',
      en: 'Your four pillars and natal chart, read together. Just your birth date.',
    },
    badge: { ko: '무료 리포트', en: 'Free report' },
  },
]

export default async function FreeFunnelHub() {
  const isKo = (await resolveLocale()) === 'ko'

  // 퍼널 측정 — 허브 도달(소셜 유입의 1차 지표). /r 페이지 패턴과 동일.
  recordCounter('funnel.free_hub.viewed', 1)

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
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 96px' }}>
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

        {/* 히어로 */}
        <p
          style={{
            marginTop: 36,
            fontSize: 12,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: GOLD_SOFT,
            textAlign: 'center',
          }}
        >
          {isKo ? '전부 무료 · 로그인 없이' : 'ALL FREE · NO SIGN-UP'}
        </p>
        <h1
          style={{
            marginTop: 10,
            fontSize: 30,
            fontWeight: 800,
            lineHeight: 1.32,
            textAlign: 'center',
            wordBreak: 'keep-all',
          }}
        >
          {isKo ? '오늘의 운세, 지금 바로 무료로' : 'Your fortune, free, right now'}
        </h1>
        <p
          style={{
            marginTop: 14,
            fontSize: 16,
            lineHeight: 1.7,
            color: MUTED,
            textAlign: 'center',
            wordBreak: 'keep-all',
          }}
        >
          {isKo
            ? '타로 한 장, 궁합, 운세 캘린더, 사주·별자리 리포트까지 — 가입 없이 받아보고 마음에 들면 친구에게도 공유해 보세요.'
            : 'A tarot card, compatibility, a fortune calendar, and a Saju + astrology report — try them with no sign-up, then share with a friend.'}
        </p>

        {/* 무료 도구 그리드 */}
        <div
          style={{
            marginTop: 36,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {FREE_TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                padding: 22,
                borderRadius: 18,
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(212,181,114,0.22)',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  background: `${t.tint}22`,
                  border: `1px solid ${t.tint}55`,
                }}
              >
                {t.emoji}
              </div>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 16,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: GOLD_SOFT,
                }}
              >
                {isKo ? t.badge.ko : t.badge.en}
              </span>
              <h2 style={{ marginTop: 6, fontSize: 19, fontWeight: 700, color: '#f1f3f9' }}>
                {isKo ? t.title.ko : t.title.en}
              </h2>
              <p
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: MUTED,
                  wordBreak: 'keep-all',
                }}
              >
                {isKo ? t.desc.ko : t.desc.en}
              </p>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 14,
                  fontSize: 14,
                  fontWeight: 700,
                  color: GOLD,
                }}
              >
                {isKo ? '바로 해보기 →' : 'Try it now →'}
              </span>
            </Link>
          ))}
        </div>

        {/* 해자 — 무료 체험 직후 "왜 ChatGPT보다 나은가"를 각인 */}
        <div style={{ marginTop: 36 }}>
          <EngineMoatBanner />
        </div>

        {/* 공유 유도 — 바이럴 루프의 핵심 한 줄 */}
        <div
          style={{
            marginTop: 36,
            padding: 22,
            borderRadius: 16,
            background: 'rgba(212,181,114,0.08)',
            border: '1px solid rgba(212,181,114,0.28)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#dfe3ee', wordBreak: 'keep-all' }}>
            {isKo
              ? '결과가 마음에 들면 친구에게 링크를 보내보세요. 받은 친구도 로그인 없이 바로 무료로 해볼 수 있어요.'
              : 'Like your result? Send the link to a friend — they can try it free with no sign-up too.'}
          </p>
        </div>

        <p style={{ marginTop: 28, fontSize: 12, color: MUTED, textAlign: 'center' }}>
          {isKo
            ? '더 깊고 구체적인 해석은 앱 안에서 이어집니다.'
            : 'Deeper, more specific readings continue inside the app.'}
        </p>
      </div>
    </main>
  )
}

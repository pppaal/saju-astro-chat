// 띠별 오늘의 운세 — 12띠 인덱스.
//
// 데일리 프로그램매틱 SEO 허브: "띠별 운세", "오늘의 운세" 의도를 받고
// 12띠 상세로 분기한다. 콘텐츠는 결정론 엔진(zodiacDaily.ts)이 오늘의
// 일진 × 띠 관계로 계산 — LLM 0, 매일 자동 갱신. 무로그인 · 서버 컴포넌트.

import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { computeAllZodiacDaily } from '@/lib/fortune/zodiacDaily'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const today = computeAllZodiacDaily()[0]
  return generateLocalizedMetadata(
    {
      en: {
        title: `Korean Zodiac Daily Fortune — ${today.dateLabel.en}`,
        description: `Today's fortune for all 12 Korean zodiac animals, computed from today's day-pillar (${today.dayGanzhi.hanja}) using classical Saju relations — not AI guesswork.`,
        keywords: [
          'korean zodiac daily fortune',
          'chinese zodiac today',
          'daily horoscope zodiac animal',
          'saju daily fortune',
          'korean fortune today',
        ],
      },
      ko: {
        title: `띠별 오늘의 운세 — ${today.dateLabel.ko}`,
        description: `오늘(${today.dayGanzhi.ko}) 일진과 12띠의 합·충 관계를 결정론 엔진이 계산한 띠별 운세. 쥐띠부터 돼지띠까지 오늘의 흐름과 조언을 확인하세요.`,
        keywords: [
          '띠별 운세',
          '오늘의 운세',
          '띠별 오늘의 운세',
          '쥐띠 운세',
          '말띠 운세',
          '일진 운세',
        ],
      },
      canonicalUrl: `${baseUrl}/fortune`,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

const GRADE_TINT: Record<number, string> = {
  5: '#2f7d4f',
  4: '#4f7d2f',
  3: '#8a8474',
  2: '#a9683b',
  1: '#a94b3b',
}

export default async function FortuneIndexPage() {
  const locale = await getServerLocale()
  const isKo = locale === 'ko'
  const all = computeAllZodiacDaily()
  const today = all[0]

  const breadcrumbJsonLd = generateJsonLd({
    type: 'BreadcrumbList',
    breadcrumbs: [
      { name: 'Home', url: '' },
      { name: isKo ? '띠별 오늘의 운세' : 'Daily Zodiac Fortune', url: '/fortune' },
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
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 96px' }}>
        <nav style={{ fontSize: 13, color: '#6c665b', marginBottom: 24 }}>
          <Link href="/" style={{ color: '#6c665b' }}>
            {isKo ? '홈' : 'Home'}
          </Link>
          {' · '}
          <span style={{ color: '#a9833b' }}>
            {isKo ? '띠별 오늘의 운세' : 'Daily Zodiac Fortune'}
          </span>
        </nav>

        <h1 style={{ fontSize: 30, lineHeight: 1.25, margin: '0 0 8px', fontWeight: 700 }}>
          {isKo ? '띠별 오늘의 운세' : 'Korean Zodiac Daily Fortune'}
        </h1>
        <p style={{ fontSize: 14, color: '#8a8474', margin: '0 0 6px' }}>
          {today.dateLabel[locale]} ·{' '}
          {isKo
            ? `오늘의 일진 ${today.dayGanzhi.ko}(${today.dayGanzhi.hanja})`
            : `Day pillar ${today.dayGanzhi.hanja}`}
        </p>
        <p style={{ fontSize: 14.5, lineHeight: 1.75, color: '#55503f', margin: '0 0 30px' }}>
          {isKo
            ? '오늘 일진의 지지와 각 띠의 합(合)·충(沖)·형(刑) 관계를 결정론 엔진이 계산합니다 — AI가 지어내는 글이 아니라, 같은 날짜엔 언제나 같은 판정이 나옵니다.'
            : 'A deterministic engine reads today’s day-pillar against each zodiac branch using classical Saju relations — the same date always yields the same verdict, not AI guesswork.'}
        </p>

        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 10,
          }}
        >
          {all.map((f) => (
            <li key={f.animal.slug}>
              <Link
                href={`/fortune/${f.animal.slug}`}
                style={{
                  display: 'block',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(169,131,59,0.18)',
                  color: '#2a2722',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 700 }}>
                  {f.animal.emoji} {isKo ? f.animal.ko : f.animal.en}
                </span>
                <span
                  style={{
                    float: 'right',
                    fontSize: 12,
                    fontWeight: 700,
                    color: GRADE_TINT[f.grade],
                  }}
                >
                  {f.gradeLabel[locale]}
                </span>
                <span
                  style={{
                    display: 'block',
                    marginTop: 6,
                    fontSize: 12.5,
                    lineHeight: 1.55,
                    color: '#6c665b',
                  }}
                >
                  {f.message[locale].slice(0, 46)}…
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p style={{ marginTop: 30, fontSize: 14, lineHeight: 1.7, color: '#55503f' }}>
          {isKo ? (
            <>
              띠는 사주 여덟 글자 중 한 글자(년지)만 본 대략적 흐름입니다. 생년월일시 전체로 보는
              나만의 하루는{' '}
              <Link href="/calendar" style={{ color: '#a9833b', fontWeight: 600 }}>
                운흐름 캘린더 →
              </Link>
            </>
          ) : (
            <>
              Your zodiac sign is one of eight characters in a full Saju chart. For a day reading
              from your complete birth chart, see the{' '}
              <Link href="/calendar" style={{ color: '#a9833b', fontWeight: 600 }}>
                Fortune Calendar →
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  )
}

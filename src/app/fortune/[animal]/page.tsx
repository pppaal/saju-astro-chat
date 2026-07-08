// 띠별 오늘의 운세 — 띠 1개 상세.
//
// 데일리 프로그램매틱 SEO 페이지(12띠): "말띠 오늘의 운세" 류 검색을 받는다.
// 본문은 결정론 엔진(zodiacDaily.ts)이 오늘의 일진 × 띠 관계로 계산 — 매일
// 새 콘텐츠가 자동으로 생기고, 같은 날짜엔 언제나 같은 판정(결정론 컨벤션).
// 하단에서 개인화 제품(운흐름 캘린더)으로 흘려보낸다. 무로그인.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { computeZodiacDaily, getAnimalBySlug, ZODIAC_ANIMALS } from '@/lib/fortune/zodiacDaily'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

type Props = {
  params: Promise<{ animal: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { animal: slug } = await params
  const animal = getAnimalBySlug(slug)
  if (!animal) {
    return { title: 'Not Found', robots: { index: false, follow: false } }
  }
  const locale = await getServerLocale()
  const f = computeZodiacDaily(animal)
  return generateLocalizedMetadata(
    {
      en: {
        title: `${animal.en} Daily Fortune — ${f.dateLabel.en}`,
        description: `Today's fortune for the ${animal.en} (${f.gradeLabel.en}): ${f.message.en.slice(0, 110)}`,
        keywords: [
          `${animal.en.toLowerCase()} zodiac today`,
          `${animal.en.toLowerCase()} daily fortune`,
          'korean zodiac fortune',
          'chinese zodiac daily',
        ],
      },
      ko: {
        title: `${animal.ko} 오늘의 운세 — ${f.dateLabel.ko}`,
        description: `오늘 ${animal.ko} 운세(${f.gradeLabel.ko}): ${f.message.ko.slice(0, 90)}`,
        keywords: [
          `${animal.ko} 운세`,
          `${animal.ko} 오늘의 운세`,
          '띠별 운세',
          '오늘의 운세',
          '일진 운세',
        ],
      },
      canonicalUrl: `${baseUrl}/fortune/${slug}`,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

const GRADE_TINT: Record<number, { fg: string; bg: string }> = {
  5: { fg: '#2f7d4f', bg: 'rgba(47,125,79,0.10)' },
  4: { fg: '#4f7d2f', bg: 'rgba(79,125,47,0.10)' },
  3: { fg: '#6c665b', bg: 'rgba(108,102,91,0.10)' },
  2: { fg: '#a9683b', bg: 'rgba(169,104,59,0.10)' },
  1: { fg: '#a94b3b', bg: 'rgba(169,75,59,0.10)' },
}

export default async function ZodiacFortunePage({ params }: Props) {
  const { animal: slug } = await params
  const animal = getAnimalBySlug(slug)
  if (!animal) {
    notFound()
  }
  const locale = await getServerLocale()
  const isKo = locale === 'ko'
  const f = computeZodiacDaily(animal)
  const tint = GRADE_TINT[f.grade]

  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: isKo ? `${animal.ko} 오늘의 운세` : `${animal.en} Daily Fortune`,
    description: f.message[locale],
    url: `${baseUrl}/fortune/${slug}`,
  })
  const breadcrumbJsonLd = generateJsonLd({
    type: 'BreadcrumbList',
    breadcrumbs: [
      { name: 'Home', url: '' },
      { name: isKo ? '띠별 오늘의 운세' : 'Daily Zodiac Fortune', url: '/fortune' },
      { name: isKo ? animal.ko : animal.en, url: `/fortune/${slug}` },
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
      <JsonLd data={pageJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 96px' }}>
        <nav style={{ fontSize: 13, color: '#6c665b', marginBottom: 24 }}>
          <Link href="/" style={{ color: '#6c665b' }}>
            {isKo ? '홈' : 'Home'}
          </Link>
          {' · '}
          <Link href="/fortune" style={{ color: '#6c665b' }}>
            {isKo ? '띠별 오늘의 운세' : 'Daily Zodiac Fortune'}
          </Link>
          {' · '}
          <span style={{ color: '#a9833b' }}>{isKo ? animal.ko : animal.en}</span>
        </nav>

        <h1 style={{ fontSize: 30, lineHeight: 1.25, margin: '0 0 6px', fontWeight: 700 }}>
          {animal.emoji} {isKo ? `${animal.ko} 오늘의 운세` : `${animal.en} Daily Fortune`}
        </h1>
        <p style={{ fontSize: 14, color: '#8a8474', margin: '0 0 22px' }}>
          {f.dateLabel[locale]} ·{' '}
          {isKo
            ? `오늘의 일진 ${f.dayGanzhi.ko}(${f.dayGanzhi.hanja})`
            : `Day pillar ${f.dayGanzhi.hanja}`}
        </p>

        <p
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 700,
            color: tint.fg,
            background: tint.bg,
            border: `1px solid ${tint.fg}33`,
            margin: '0 0 20px',
          }}
        >
          {isKo ? '오늘의 흐름 · ' : 'Today · '}
          {f.gradeLabel[locale]}
        </p>

        <p style={{ fontSize: 16.5, lineHeight: 1.85, margin: '0 0 18px', color: '#3c372c' }}>
          {f.message[locale]}
        </p>

        <p
          style={{
            margin: '0 0 30px',
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(169,131,59,0.08)',
            borderLeft: '3px solid #a9833b',
            fontSize: 14.5,
            lineHeight: 1.7,
            color: '#55503f',
          }}
        >
          <strong style={{ color: '#7a6127' }}>
            {isKo ? '오늘의 조언 · ' : 'Today’s advice · '}
          </strong>
          {f.advice[locale]}
        </p>

        {/* 해자 한 줄 + 개인화 전환 훅 */}
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
              ? `이 운세는 오늘 일진(${f.dayGanzhi.hanja})과 ${animal.ko}의 고전 합충 관계를 엔진이 계산한 것입니다. 띠는 사주 여덟 글자 중 한 글자 — 생년월일시 전체로 보면 오늘의 답이 달라질 수 있어요.`
              : `This reading is computed from today’s day-pillar (${f.dayGanzhi.hanja}) and your sign’s classical relations. Your zodiac is one of eight characters — your full birth chart may tell today differently.`}
          </p>
          <p style={{ margin: 0, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14 }}>
            <Link href="/calendar" style={{ color: '#a9833b', fontWeight: 600 }}>
              {isKo ? '📅 내 사주로 정확하게 보기 →' : '📅 My full-chart day reading →'}
            </Link>
            <Link href="/free" style={{ color: '#a9833b', fontWeight: 600 }}>
              {isKo ? '✨ 무료 도구 전체 →' : '✨ All free tools →'}
            </Link>
          </p>
        </section>

        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: '#3c372c' }}>
          {isKo ? '다른 띠 보기' : 'Other signs'}
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
          {ZODIAC_ANIMALS.filter((a) => a.slug !== animal.slug).map((a) => (
            <li key={a.slug}>
              <Link
                href={`/fortune/${a.slug}`}
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
                {a.emoji} {isKo ? a.ko : a.en}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

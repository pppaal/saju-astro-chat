// 십성(十星) 상세 — 10개 중 1개.
//
// 색인 대상 SEO 표면. "정재 뜻", "편관이란", "십성" 류 한국어 헤드 용어를 받고,
// 영어로는 "direct wealth bazi", "ten gods meaning" 를 받는다.
//
// 이 표면을 만든 이유: /saju/ilju 60개 페이지가 "배우자궁 편인" 같은 문장을
// 쓰는데 그 용어를 설명하는 페이지가 없어 링크 그래프에 빠진 노드가 있었다.
// 여기서 "이 십성을 배우자궁에 가진 일주" 목록을 엔진으로 뽑아 양방향 링크를
// 만든다.
//
// 뜻풀이는 사람이 쓴 고전 해석(GLOSS)이고, 일간 쌍 10개·일주 목록은 엔진
// 계산이다. 둘을 섞지 않는다.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { sibsinBySlug, SIBSIN_ORDER, sibsinSlugOf } from '@/lib/saju/sibsinProfile'
import { ELEMENT_EN } from '@/lib/saju/iljuProfile'
import { canonicalIlganSlug } from '@/lib/saju/ilganCompat'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const s = sibsinBySlug(slug)
  if (!s) return { title: 'Not Found', robots: { index: false, follow: false } }

  const spouse = s.isSpouseStarForMale
    ? { ko: ' 남자의 배우자성(처성)입니다.', en: ' It is a man’s spouse star.' }
    : s.isSpouseStarForFemale
      ? { ko: ' 여자의 배우자성(부성)입니다.', en: ' It is a woman’s spouse star.' }
      : { ko: '', en: '' }

  return generateLocalizedMetadata(
    {
      en: {
        title: `${s.en} (${s.name}) — Ten Gods Meaning in Korean Saju`,
        description: `${s.gloss.en}${spouse.en} ${s.iljuWithSeat.length} of the 60 day pillars carry it in the spouse palace.`,
        keywords: [
          `${s.slug} ten gods`,
          `${s.en.toLowerCase()} bazi`,
          'ten gods meaning',
          'korean saju ten gods',
          'sibsin',
        ],
      },
      ko: {
        title: `${s.name}(${s.groupKo}) 뜻 — 십성 풀이`,
        description: `${s.gloss.ko}${spouse.ko} 60갑자 중 ${s.iljuWithSeat.length}개 일주가 배우자궁에 ${s.name}을 가집니다.`,
        keywords: [
          `${s.name}`,
          `${s.name} 뜻`,
          `${s.name}이란`,
          '십성',
          '십신',
          s.groupKo,
          '사주 십성',
        ],
      },
      canonicalUrl: `${baseUrl}/saju/sibsin/${s.slug}`,
      ogImage: '/og-card-v2.png',
    },
    await getServerLocale()
  )
}

export default async function SibsinDetailPage({ params }: Props) {
  const { slug } = await params
  const s = sibsinBySlug(slug)
  if (!s) notFound()

  const l = await getServerLocale()
  const isKo = l === 'ko'

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 72px' }}>
      <JsonLd
        data={generateJsonLd({
          type: 'Article',
          name: isKo ? `${s.name} 뜻 — 십성 풀이` : `${s.en} (${s.name}) — Ten Gods`,
          description: isKo ? s.gloss.ko : s.gloss.en,
          url: `${baseUrl}/saju/sibsin/${s.slug}`,
        })}
      />

      <nav style={{ fontSize: 13, color: '#8b8578', marginBottom: 20 }}>
        <Link href="/saju/sibsin" style={{ color: '#8a6d3b' }}>
          {isKo ? '십성 전체' : 'All Ten Gods'}
        </Link>
        {' / '}
        {isKo ? s.name : s.en}
      </nav>

      <h1 style={{ fontSize: 30, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
        {isKo ? s.name : s.en}
        <span style={{ fontSize: 18, color: '#8b8578', marginLeft: 10 }}>
          {isKo ? s.groupKo : s.name}
        </span>
      </h1>
      <p style={{ color: '#4a463f', margin: '0 0 28px', fontSize: 16, lineHeight: 1.8 }}>
        {isKo ? s.gloss.ko : s.gloss.en}
      </p>

      {(s.isSpouseStarForMale || s.isSpouseStarForFemale) && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 10,
            background: 'rgba(138,109,59,0.08)',
            border: '1px solid rgba(138,109,59,0.22)',
            marginBottom: 28,
            fontSize: 14,
            lineHeight: 1.7,
            color: '#4a463f',
          }}
        >
          <strong>{isKo ? '배우자성' : 'Spouse star'}</strong>
          {' — '}
          {s.isSpouseStarForMale
            ? isKo
              ? '정통 명리에서 남자의 배우자성은 재성입니다. 남자 사주에서 이 십성은 아내를 상징합니다(여자 사주에서는 재물·활동으로 봅니다).'
              : 'A man’s spouse star is the Wealth element, so in a man’s chart this stands for the wife. In a woman’s chart it reads as wealth and activity.'
            : isKo
              ? '정통 명리에서 여자의 배우자성은 관성입니다. 여자 사주에서 이 십성은 남편을 상징합니다(남자 사주에서는 직장·규범으로 봅니다).'
              : 'A woman’s spouse star is the Authority element, so in a woman’s chart this stands for the husband. In a man’s chart it reads as work and norms.'}
        </div>
      )}

      {/* 엔진 계산 — 이 십성을 만드는 일간 쌍 10개 */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>
          {isKo ? `일간별로 ${s.name}이 되는 천간` : 'Which stem is this, per day master'}
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {s.stemPairs.map((pair) => (
            <Link
              key={pair.dayStem}
              href={`/compatibility/ilgan/${canonicalIlganSlug(pair.dayStem, pair.otherStem)}`}
              style={{
                padding: '7px 11px',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.08)',
                background: '#fff',
                color: '#2f2b26',
                fontSize: 13,
                minWidth: 92,
              }}
            >
              <span style={{ fontWeight: 600 }}>
                {pair.dayStem} → {pair.otherStem}
              </span>
              <span style={{ display: 'block', color: '#8b8578', fontSize: 11, marginTop: 2 }}>
                {isKo
                  ? `${pair.dayElement}→${pair.otherElement}`
                  : `${ELEMENT_EN[pair.dayElement]}→${ELEMENT_EN[pair.otherElement]}`}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 일주 60페이지와 양방향 링크 */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>
          {isKo
            ? `배우자궁에 ${s.name}을 가진 일주 (${s.iljuWithSeat.length}개)`
            : `Day pillars with ${s.en} in the spouse palace (${s.iljuWithSeat.length})`}
        </h2>
        <p style={{ color: '#6c665b', fontSize: 14, lineHeight: 1.7, margin: '0 0 10px' }}>
          {isKo
            ? '일지의 지장간 본기를 일간 기준으로 본 십성입니다. 아래 일주는 배우자 자리에 이 십성이 앉은 경우입니다.'
            : 'Read from the hidden main stem of the day branch. These day pillars carry this god in the spouse seat.'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {s.iljuWithSeat.map((p) => (
            <Link
              key={p.slug}
              href={`/saju/ilju/${p.slug}`}
              style={{
                padding: '7px 11px',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.08)',
                background: '#fff',
                color: '#2f2b26',
                fontSize: 13,
              }}
            >
              {isKo ? `${p.ko}일주` : p.ganji}
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>{isKo ? '다른 십성' : 'Other Ten Gods'}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {SIBSIN_ORDER.filter((n) => n !== s.name).map((n) => (
            <Link
              key={n}
              href={`/saju/sibsin/${sibsinSlugOf(n)}`}
              style={{
                padding: '6px 11px',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.08)',
                background: '#fff',
                color: '#2f2b26',
                fontSize: 13,
              }}
            >
              {n}
            </Link>
          ))}
        </div>
      </section>

      <section
        style={{
          padding: 20,
          borderRadius: 12,
          background: 'rgba(138,109,59,0.07)',
          border: '1px solid rgba(138,109,59,0.18)',
        }}
      >
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>
          {isKo ? '내 사주의 십성 보기' : 'See the Ten Gods in your chart'}
        </h2>
        <p style={{ color: '#4a463f', lineHeight: 1.7, fontSize: 14, margin: '0 0 14px' }}>
          {isKo
            ? '십성은 개수와 위치, 그리고 대운에 따라 완전히 다르게 작용합니다. 한 글자의 뜻만으로는 판단할 수 없습니다.'
            : 'The Ten Gods work differently depending on count, position and the luck cycles. One definition is not a reading.'}
        </p>
        <Link
          href="/integrated-report"
          style={{
            display: 'inline-block',
            padding: '10px 18px',
            borderRadius: 999,
            background: '#8a6d3b',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {isKo ? '무료로 내 명식 보기' : 'Get your free chart'}
        </Link>
      </section>
    </main>
  )
}

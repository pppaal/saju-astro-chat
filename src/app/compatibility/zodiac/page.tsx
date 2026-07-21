// 띠 궁합 인덱스 — "띠 궁합" / "띠별 궁합" 헤드 검색어를 받는 허브. 12×12 매트릭스로
// 78개 상세 페이지(정규 조합)를 전부 링크해 크롤러가 한 번에 발견하게 한다.

import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { canonicalPairSlug } from '@/lib/compatibility/zodiacCompat'
import { ZODIAC_ANIMALS } from '@/lib/fortune/zodiacDaily'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Chinese Zodiac Compatibility — All 12 Signs Love Match',
        description:
          'Free Korean zodiac (tti) compatibility for every pair of the 12 signs. Tap two animals to see their match score and reading, computed from classical branch relations.',
        keywords: [
          'chinese zodiac compatibility',
          'korean zodiac compatibility',
          'zodiac love match',
          'tti compatibility',
        ],
      },
      ko: {
        title: '띠 궁합 — 십이지 12띠 궁합 전부 무료',
        description:
          '12띠 모든 조합의 띠 궁합을 무료로. 두 띠를 고르면 고전 지지 관계(삼합·육합·충)로 계산한 궁합 점수와 풀이가 나옵니다.',
        keywords: ['띠 궁합', '띠별 궁합', '십이지 궁합', '띠 궁합표', '무료 궁합'],
      },
      canonicalUrl: `${baseUrl}/compatibility/zodiac`,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

export default async function ZodiacCompatIndexPage() {
  const locale = await getServerLocale()
  const isKo = locale === 'ko'

  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: isKo ? '띠 궁합 — 십이지 12띠 궁합' : 'Chinese Zodiac Compatibility',
    description: isKo
      ? '12띠 모든 조합의 궁합을 고전 지지 관계로 계산해 무료로 보여줍니다.'
      : 'Free compatibility for every pair of the 12 zodiac signs, from classical branch relations.',
    url: `${baseUrl}/compatibility/zodiac`,
  })

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(900px 620px at 25% 8%, rgba(200,99,140,0.08), transparent 60%),' +
          'radial-gradient(820px 700px at 85% 100%, rgba(212,181,114,0.16), transparent 60%),' +
          'linear-gradient(160deg, #fbf9f4 0%, #f4efe5 58%, #f8f5ee 100%)',
        color: '#2a2722',
      }}
    >
      <JsonLd data={pageJsonLd} />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 96px' }}>
        <nav style={{ fontSize: 13, color: '#6c665b', marginBottom: 24 }}>
          <Link href="/" style={{ color: '#6c665b' }}>
            {isKo ? '홈' : 'Home'}
          </Link>
          {' · '}
          <span style={{ color: '#a9833b' }}>{isKo ? '띠 궁합' : 'Zodiac Compatibility'}</span>
        </nav>

        <h1 style={{ fontSize: 30, lineHeight: 1.25, margin: '0 0 8px', fontWeight: 700 }}>
          {isKo ? '띠 궁합 — 십이지 12띠 궁합' : 'Chinese Zodiac Compatibility'}
        </h1>
        <p style={{ fontSize: 15.5, color: '#55503f', lineHeight: 1.8, margin: '0 0 12px' }}>
          {isKo
            ? '두 띠를 고르면 삼합·육합·충 같은 고전 지지 관계로 계산한 궁합 점수와 풀이가 나옵니다. 아래 표에서 내 띠 줄에서 상대 띠를 눌러보세요.'
            : 'Pick two signs to see a match score and reading computed from classical branch relations (harmony, clash). Tap across your row below.'}
        </p>
        <p style={{ fontSize: 13, color: '#8a8474', lineHeight: 1.7, margin: '0 0 28px' }}>
          {isKo
            ? '띠 궁합은 태어난 해 한 글자로 본 큰 그림입니다. 생년월일시 전체로 보는 '
            : 'Zodiac-sign match is the big picture from birth year. For the full-chart version, see '}
          <Link href="/compatibility/free" style={{ color: '#a9833b', fontWeight: 700 }}>
            {isKo ? '무료 사주·별자리 궁합' : 'free Saju + astrology compatibility'}
          </Link>
          {isKo ? '도 확인해 보세요.' : '.'}
        </p>

        {/* 12×12 매트릭스 — 각 셀이 정규 조합 상세로 링크(78개 전부 커버) */}
        <div style={{ overflowX: 'auto', marginBottom: 12 }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13, margin: '0 auto' }}>
            <thead>
              <tr>
                <th style={{ padding: 6 }} aria-label="row-header" />
                {ZODIAC_ANIMALS.map((z) => (
                  <th key={z.slug} style={{ padding: 6, fontSize: 18 }} title={isKo ? z.ko : z.en}>
                    {z.emoji}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ZODIAC_ANIMALS.map((row) => (
                <tr key={row.slug}>
                  <th
                    style={{ padding: 6, fontSize: 18, whiteSpace: 'nowrap' }}
                    title={isKo ? row.ko : row.en}
                  >
                    {row.emoji}
                  </th>
                  {ZODIAC_ANIMALS.map((col) => (
                    <td key={col.slug} style={{ padding: 3, textAlign: 'center' }}>
                      <Link
                        href={`/compatibility/zodiac/${canonicalPairSlug(row, col)}`}
                        title={isKo ? `${row.ko} ${col.ko} 궁합` : `${row.en} & ${col.en}`}
                        aria-label={
                          isKo
                            ? `${row.ko} ${col.ko} 궁합`
                            : `${row.en} and ${col.en} compatibility`
                        }
                        style={{
                          display: 'block',
                          width: 30,
                          height: 30,
                          lineHeight: '30px',
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.6)',
                          border: '1px solid rgba(169,131,59,0.16)',
                          color: '#a9683b',
                          textDecoration: 'none',
                          fontSize: 14,
                        }}
                      >
                        ♥
                      </Link>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 접근성/크롤러용 텍스트 링크 목록 — 내 띠별 그룹 */}
        <div style={{ marginTop: 28 }}>
          {ZODIAC_ANIMALS.map((row) => (
            <section key={row.slug} style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: '#3c372c' }}>
                {row.emoji} {isKo ? `${row.ko} 궁합` : `${row.en} matches`}
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
                {ZODIAC_ANIMALS.map((col) => (
                  <li key={col.slug}>
                    <Link
                      href={`/compatibility/zodiac/${canonicalPairSlug(row, col)}`}
                      style={{
                        display: 'inline-block',
                        padding: '5px 11px',
                        borderRadius: 999,
                        fontSize: 12.5,
                        background: 'rgba(255,255,255,0.6)',
                        border: '1px solid rgba(169,131,59,0.16)',
                        color: '#55503f',
                        textDecoration: 'none',
                      }}
                    >
                      {isKo ? `${row.ko}·${col.ko}` : `${row.en} & ${col.en}`}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}

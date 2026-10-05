// 십성 허브 — "십성", "십신" 헤드 용어를 받고 10개 상세를 계열별로 묶어 링크한다.

import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { SIBSIN_ORDER, sibsinProfile } from '@/lib/saju/sibsinProfile'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  return generateLocalizedMetadata(
    {
      en: {
        title: 'The Ten Gods (Sibsin) — All Ten Explained | Korean Saju',
        description:
          'All ten of the Ten Gods in Korean saju: what each means, which stem it is for every day master, whether it is the spouse star, and which day pillars carry it in the spouse palace.',
        keywords: [
          'ten gods',
          'ten gods meaning',
          'sibsin',
          'korean saju ten gods',
          'bazi ten gods',
        ],
      },
      ko: {
        title: '십성(十星) 전체 — 비겁·식상·재성·관성·인성',
        description:
          '십성 10개를 계열별로 정리했습니다. 각 십성의 뜻, 일간별로 어느 천간이 그 십성이 되는지, 배우자성 여부, 그리고 배우자궁에 그 십성을 가진 일주까지.',
        keywords: ['십성', '십신', '비겁', '식상', '재성', '관성', '인성', '사주 십성'],
      },
      canonicalUrl: `${baseUrl}/saju/sibsin`,
      ogImage: '/og-card-v2.png',
    },
    await getServerLocale()
  )
}

export default async function SibsinHubPage() {
  const isKo = (await getServerLocale()) === 'ko'
  const all = SIBSIN_ORDER.map((n) => sibsinProfile(n)!)

  const groups = new Map<string, typeof all>()
  for (const p of all) {
    const k = isKo ? p.groupKo : p.groupEn
    groups.set(k, [...(groups.get(k) ?? []), p])
  }

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px 72px' }}>
      <JsonLd
        data={generateJsonLd({
          type: 'WebPage',
          name: isKo ? '십성 전체' : 'The Ten Gods',
          description: isKo
            ? '십성 10개의 뜻·일간별 천간·배우자성·해당 일주.'
            : 'Meaning, per-day-master stem, spouse star status and day pillars for all ten gods.',
          url: `${baseUrl}/saju/sibsin`,
        })}
      />

      <h1 style={{ fontSize: 30, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
        {isKo ? '십성(十星)' : 'The Ten Gods'}
      </h1>
      <p style={{ color: '#6c665b', margin: '0 0 28px', fontSize: 15, lineHeight: 1.7 }}>
        {isKo
          ? '십성은 일간(나)이 다른 글자를 어떤 관계로 보는지를 열 가지로 나눈 것입니다. 오행의 생극과 음양이 같은지 다른지로 결정되고, 사주 해석의 거의 모든 판단이 여기서 출발합니다.'
          : 'The Ten Gods classify how the day master relates to every other stem — determined by the generating/controlling cycle and whether polarity matches. Almost every judgment in a reading starts here.'}
      </p>

      {Array.from(groups.entries()).map(([group, list]) => (
        <section key={group} style={{ marginBottom: 26 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 10px', color: '#4a463f' }}>{group}</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {list.map((p) => (
              <Link
                key={p.slug}
                href={`/saju/sibsin/${p.slug}`}
                style={{
                  display: 'block',
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: '#fff',
                  color: '#2f2b26',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <strong style={{ fontSize: 16 }}>{isKo ? p.name : p.en}</strong>
                  <span style={{ color: '#8b8578', fontSize: 12 }}>{isKo ? p.en : p.name}</span>
                  {p.isSpouseStarForMale && (
                    <span style={{ color: '#8a6d3b', fontSize: 12 }}>
                      {isKo ? '· 남자 배우자성' : '· man’s spouse star'}
                    </span>
                  )}
                  {p.isSpouseStarForFemale && (
                    <span style={{ color: '#8a6d3b', fontSize: 12 }}>
                      {isKo ? '· 여자 배우자성' : '· woman’s spouse star'}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 14,
                    color: '#6c665b',
                    lineHeight: 1.65,
                  }}
                >
                  {isKo ? p.gloss.ko : p.gloss.en}
                </p>
                <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#8b8578' }}>
                  {isKo
                    ? `배우자궁에 가진 일주 ${p.iljuWithSeat.length}개`
                    : `${p.iljuWithSeat.length} day pillars carry it in the spouse palace`}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <p style={{ marginTop: 28, fontSize: 13, color: '#8b8578', lineHeight: 1.7 }}>
        {isKo ? '일주별 십성은 ' : 'For per-pillar readings see '}
        <Link href="/saju/ilju" style={{ color: '#8a6d3b' }}>
          {isKo ? '60갑자 일주' : 'all 60 day pillars'}
        </Link>
        {isKo ? ' 에서, 두 사람의 일간 관계는 ' : ' and '}
        <Link href="/compatibility/ilgan" style={{ color: '#8a6d3b' }}>
          {isKo ? '일간 궁합' : 'day master compatibility'}
        </Link>
        {isKo ? ' 에서 볼 수 있습니다.' : '.'}
      </p>
    </main>
  )
}

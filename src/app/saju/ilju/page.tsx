// 60갑자 일주 허브 — "일주", "일주론", "60갑자" 류 헤드 검색어를 받고,
// 60개 상세 페이지를 한 페이지에서 전부 링크해 크롤러가 한 번에 발견하게 한다
// (띠궁합 허브와 같은 패턴).
//
// 표는 일간 10 × 일지 12 중 실제 존재하는 60칸만 채운다 — 양간은 양지,
// 음간은 음지와만 짝하므로 나머지 60칸은 60갑자에 없는 조합이다.

import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { allIljuGanji, iljuProfile, ELEMENT_EN } from '@/lib/saju/iljuProfile'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'All 60 Day Pillars (Ilju) — Korean Four Pillars Reference',
        description:
          'Every one of the 60 day pillars in Korean saju: day master element, spouse palace reading, void branches, noble star and branch relations — each computed, not copied.',
        keywords: [
          'korean four pillars day pillar',
          '60 day pillars',
          'ilju meaning',
          'saju day master',
          'bazi day pillar list',
        ],
      },
      ko: {
        title: '60갑자 일주 전체 — 일간·배우자궁·공망 한눈에',
        description:
          '60갑자 일주 60개 전부. 일간 오행, 배우자궁 십성, 공망, 천을귀인, 일지 합충을 일주마다 계산해 보여줍니다.',
        keywords: ['일주', '일주론', '60갑자', '일주 성격', '배우자궁', '일간'],
      },
      canonicalUrl: `${baseUrl}/saju/ilju`,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

export default async function IljuHubPage() {
  const locale = await getServerLocale()
  const isKo = locale === 'ko'
  const all = allIljuGanji()
    .map((g) => iljuProfile(g))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))

  // 일간별로 묶는다 — 60개를 10줄 × 6개로 읽기 쉽게.
  const byStem = new Map<string, typeof all>()
  for (const p of all) {
    const k = p.dayStem.han
    byStem.set(k, [...(byStem.get(k) ?? []), p])
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 72px' }}>
      <JsonLd
        data={generateJsonLd({
          type: 'WebPage',
          name: isKo ? '60갑자 일주 전체' : 'All 60 Day Pillars',
          description: isKo
            ? '60갑자 일주별 일간·배우자궁·공망·천을귀인·지지 합충.'
            : 'Day master, spouse palace, void branches and branch relations for all 60 day pillars.',
          url: `${baseUrl}/saju/ilju`,
        })}
      />

      <h1 style={{ fontSize: 30, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
        {isKo ? '60갑자 일주' : 'All 60 Day Pillars'}
      </h1>
      <p style={{ color: '#6c665b', margin: '0 0 28px', fontSize: 15, lineHeight: 1.7 }}>
        {isKo
          ? '일주는 사주 네 기둥 중 "나 자신"을 나타내는 기둥입니다. 일간은 본인, 일지는 배우자궁으로 봅니다. 아래 60개는 각각 일간 오행·배우자궁 십성·공망·천을귀인·일지 합충을 엔진이 계산한 결과입니다.'
          : 'The day pillar is the pillar of the self. Its stem is you; its branch is the spouse palace. Each of the 60 below is computed — day master element, spouse palace reading, void branches, noble star and branch relations.'}
      </p>

      {Array.from(byStem.entries()).map(([stem, list]) => {
        const first = list[0]
        return (
          <section key={stem} style={{ marginBottom: 22 }}>
            <h2
              style={{
                fontSize: 15,
                margin: '0 0 8px',
                color: '#4a463f',
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 19 }}>{stem}</span>
              <span style={{ color: '#8b8578', fontWeight: 400, fontSize: 13 }}>
                {isKo
                  ? `${first.dayStem.ko}  ${first.dayStem.element}  ${first.dayStem.yinYang}`
                  : `${ELEMENT_EN[first.dayStem.element]} · ${
                      first.dayStem.yinYang === '양' ? 'yang' : 'yin'
                    }`}
              </span>
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {list.map((p) => (
                <Link
                  key={p.slug}
                  href={`/saju/ilju/${p.slug}`}
                  style={{
                    display: 'block',
                    padding: '8px 12px',
                    borderRadius: 9,
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: '#fff',
                    color: '#2f2b26',
                    fontSize: 14,
                    minWidth: 112,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{isKo ? `${p.ko}일주` : p.ganji}</span>
                  <span style={{ display: 'block', color: '#8b8578', fontSize: 12, marginTop: 2 }}>
                    {isKo ? `배우자궁 ${p.spouseSeat.sibsin}` : `${p.dayBranch.animalEn} · ${p.ko}`}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )
      })}

      <p style={{ marginTop: 32, fontSize: 13, color: '#8b8578', lineHeight: 1.7 }}>
        {isKo
          ? '일간 10개 × 일지 12개 중 60개만 존재합니다 — 양간은 양지, 음간은 음지와만 짝하기 때문입니다.'
          : 'Only 60 of the 10 × 12 combinations exist: yang stems pair only with yang branches, yin with yin.'}
      </p>
    </main>
  )
}

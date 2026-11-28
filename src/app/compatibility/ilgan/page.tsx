// 일간 궁합 허브 — "일간 궁합", "일간 상성" 류 헤드 검색어를 받고, 55개 정규
// 쌍을 10×10 매트릭스로 전부 링크해 크롤러가 한 번에 발견하게 한다
// (띠궁합 허브와 같은 패턴).
//
// 매트릭스는 대칭이라 아래 삼각만 링크한다 — 역순은 canonical 로 정규를
// 가리키므로 같은 페이지를 두 칸에서 링크할 이유가 없다.

import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { ILGAN_ORDER, canonicalIlganSlug, ilganCompat } from '@/lib/saju/ilganCompat'
import { ELEMENT_EN } from '@/lib/saju/iljuProfile'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Day Master Compatibility — All 55 Korean Saju Stem Pairs',
        description:
          'Every pair of the ten day stems: element relation, the Ten Gods each reads in the other, stem harmony and clash, and which pairs are each other’s primary spouse star.',
        keywords: [
          'day master compatibility',
          'korean saju compatibility',
          'four pillars day stem match',
          'bazi day master pair',
          'ten gods compatibility',
        ],
      },
      ko: {
        title: '일간 궁합 — 천간 10개 55쌍 전체',
        description:
          '일간 10개의 모든 조합. 오행 생극, 서로를 보는 십성, 천간합·충, 그리고 서로가 서로의 정배우자성인 10쌍을 엔진이 계산해 보여줍니다.',
        keywords: ['일간 궁합', '일간 상성', '사주 궁합', '십성 궁합', '배우자성', '천간합'],
      },
      canonicalUrl: `${baseUrl}/compatibility/ilgan`,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

export default async function IlganHubPage() {
  const locale = await getServerLocale()
  const isKo = locale === 'ko'

  const mutual = ILGAN_ORDER.flatMap((a, i) =>
    ILGAN_ORDER.slice(i).map((b) => ilganCompat(a, b)!)
  ).filter((c) => c.mutualPrimarySpouse)

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '32px 20px 72px' }}>
      <JsonLd
        data={generateJsonLd({
          type: 'WebPage',
          name: isKo ? '일간 궁합 전체' : 'All Day Master Pairs',
          description: isKo
            ? '일간 10개 55쌍의 오행 관계·십성·천간합충·배우자성.'
            : 'Element relation, Ten Gods, stem harmony and spouse star for all 55 day-stem pairs.',
          url: `${baseUrl}/compatibility/ilgan`,
        })}
      />

      <h1 style={{ fontSize: 30, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
        {isKo ? '일간 궁합' : 'Day Master Compatibility'}
      </h1>
      <p style={{ color: '#6c665b', margin: '0 0 24px', fontSize: 15, lineHeight: 1.7 }}>
        {isKo
          ? '일간은 사주에서 "나 자신"입니다. 두 사람의 일간이 서로를 무슨 십성으로 보는지가 궁합의 가장 기본 축입니다. 아래 55쌍은 오행 생극·십성 양방향·천간합충·배우자성을 엔진이 계산한 결과입니다.'
          : 'The day stem is the self. How two day stems read each other through the Ten Gods is the base axis of compatibility. All 55 pairs below are computed — element relation, both directions of the Ten Gods, stem harmony and clash, and the spouse star.'}
      </p>

      <section
        style={{
          padding: '14px 18px',
          borderRadius: 10,
          background: 'rgba(47,125,79,0.08)',
          border: '1px solid rgba(47,125,79,0.22)',
          marginBottom: 28,
        }}
      >
        <strong style={{ color: '#2f7d4f', fontSize: 15 }}>
          {isKo ? '서로가 서로의 정배우자성인 10쌍' : 'The 10 mutual primary-spouse pairs'}
        </strong>
        <div style={{ marginTop: 8, fontSize: 14, lineHeight: 2 }}>
          {mutual.map((c, i) => (
            <span key={c.slug}>
              {i > 0 && ' · '}
              <Link href={`/compatibility/ilgan/${c.slug}`} style={{ color: '#2f7d4f' }}>
                {isKo ? `${c.a.ko}·${c.b.ko}` : `${c.a.han}${c.b.han}`}
              </Link>
            </span>
          ))}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#4a463f' }}>
          {isKo
            ? '남·여 순서를 따지면 일간 조합 100가지 중 10가지입니다 — 좋은 배치지만 드물다고 할 정도는 아닙니다.'
            : '10 of the 100 ordered male–female combinations — favourable, but not rare.'}
        </p>
      </section>

      <h2 style={{ fontSize: 17, margin: '0 0 10px' }}>{isKo ? '55쌍 전체' : 'All 55 pairs'}</h2>
      {ILGAN_ORDER.map((a, i) => {
        const side = ilganCompat(a, a)!.a
        return (
          <section key={a} style={{ marginBottom: 18 }}>
            <h3
              style={{
                fontSize: 14,
                margin: '0 0 6px',
                color: '#4a463f',
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>{a}</span>
              <span style={{ color: '#8b8578', fontWeight: 400, fontSize: 12 }}>
                {isKo
                  ? `${side.ko} · ${side.element} · ${side.yinYang}`
                  : `${ELEMENT_EN[side.element]} · ${side.yinYang === '양' ? 'yang' : 'yin'}`}
              </span>
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {ILGAN_ORDER.slice(i).map((b) => {
                const c = ilganCompat(a, b)!
                return (
                  <Link
                    key={b}
                    href={`/compatibility/ilgan/${canonicalIlganSlug(a, b)}`}
                    style={{
                      padding: '7px 11px',
                      borderRadius: 8,
                      border: c.mutualPrimarySpouse
                        ? '1px solid rgba(47,125,79,0.35)'
                        : '1px solid rgba(0,0,0,0.08)',
                      background: c.mutualPrimarySpouse ? 'rgba(47,125,79,0.06)' : '#fff',
                      color: '#2f2b26',
                      fontSize: 13,
                      minWidth: 86,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      {a}
                      {b}
                    </span>
                    <span
                      style={{ display: 'block', color: '#8b8578', fontSize: 11, marginTop: 2 }}
                    >
                      {c.stemHap
                        ? isKo
                          ? '천간합'
                          : 'harmony'
                        : c.stemChung
                          ? isKo
                            ? '천간충'
                            : 'clash'
                          : isKo
                            ? c.aToB
                            : ''}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}

      <p style={{ marginTop: 28, fontSize: 13, color: '#8b8578', lineHeight: 1.7 }}>
        {isKo
          ? 'A×B 와 B×A 는 같은 쌍이라 한 페이지로 묶었습니다(10개 중 2개 고르기 45쌍 + 같은 일간 10쌍 = 55쌍). 일간은 궁합의 한 축일 뿐이니, 실제 판정은 '
          : 'A×B and B×A are one page (45 + 10 same-stem = 55). The day stem is only one axis — for a real reading see '}
        <Link href="/compatibility/free" style={{ color: '#8a6d3b' }}>
          {isKo ? '무료 궁합 리포트' : 'the free compatibility report'}
        </Link>
        {isKo ? '로 사주 전체와 점성 시너스트리를 함께 보세요.' : '.'}
      </p>
    </main>
  )
}

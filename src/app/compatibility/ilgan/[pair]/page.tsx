// 일간 궁합 상세 — 일간 55쌍 중 1개.
//
// 프로그래매틱 SEO 표면(55개 × ko/en = 110 URL). "갑목 신금 궁합", "일간 궁합",
// "금극목 궁합" 류 검색을 받는다.
//
// URL 대칭(A×B = B×A): 역순 슬러그도 열리지만 canonical 은 정규 순서를
// 가리킨다 — 띠궁합 페이지와 같은 처리로 중복 색인을 막는다.
//
// 핵심: 오행 관계는 대칭이지만 **십성은 방향이 있다.** 한 페이지에 양방향을
// 모두 싣고, 배우자성 판정은 성별로 갈라 적는다(남=재성이 처, 여=관성이 부).
// 본문은 전부 결정론 엔진(ilganCompat)이 일간 2글자에서 계산한다.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import {
  ILGAN_ORDER,
  canonicalIlganSlug,
  ilganCompatBySlug,
  type IlganCompat,
} from '@/lib/saju/ilganCompat'
import { ELEMENT_EN, iljuWithStem } from '@/lib/saju/iljuProfile'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

type Props = { params: Promise<{ pair: string }> }

const SIBSIN_EN: Record<string, string> = {
  비견: 'Peer',
  겁재: 'Rival',
  식신: 'Output',
  상관: 'Expression',
  편재: 'Indirect Wealth',
  정재: 'Direct Wealth',
  편관: 'Indirect Authority',
  정관: 'Direct Authority',
  편인: 'Indirect Resource',
  정인: 'Direct Resource',
}

function relationText(c: IlganCompat, isKo: boolean): string {
  const ae = isKo ? c.a.element : ELEMENT_EN[c.a.element]
  const be = isKo ? c.b.element : ELEMENT_EN[c.b.element]
  switch (c.relation) {
    case 'same':
      return isKo ? `같은 오행 (${ae}) — 비화` : `Same element (${ae}) — peers`
    case 'aControlsB':
      return isKo ? `${ae}극${be} — ${c.a.ko}이 다듬는 방향` : `${ae} controls ${be}`
    case 'bControlsA':
      return isKo ? `${be}극${ae} — ${c.b.ko}이 다듬는 방향` : `${be} controls ${ae}`
    case 'aGeneratesB':
      return isKo ? `${ae}생${be} — ${c.a.ko}이 생해주는 방향` : `${ae} generates ${be}`
    default:
      return isKo ? `${be}생${ae} — ${c.b.ko}이 생해주는 방향` : `${be} generates ${ae}`
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params
  const c = ilganCompatBySlug(pair)
  if (!c) return { title: 'Not Found', robots: { index: false, follow: false } }

  // 역순 슬러그는 정규 슬러그로 canonical — 중복 색인 방지.
  const canonical = `${baseUrl}/compatibility/ilgan/${c.slug}`
  const locale = await getServerLocale()
  const meta = generateLocalizedMetadata(
    {
      en: {
        title: `${c.a.han} × ${c.b.han} Day Master Compatibility — Korean Saju`,
        description: `${c.a.han} (${ELEMENT_EN[c.a.element]}) with ${c.b.han} (${ELEMENT_EN[c.b.element]}): ${c.a.han} reads ${c.b.han} as ${SIBSIN_EN[c.aToB] ?? c.aToB}, ${c.b.han} reads ${c.a.han} as ${SIBSIN_EN[c.bToA] ?? c.bToA}.${c.mutualPrimarySpouse ? ' These two are each other’s primary spouse star.' : ''}`,
        keywords: [
          `${c.a.ro} ${c.b.ro} compatibility`,
          'day master compatibility',
          'korean saju compatibility',
          'four pillars day stem match',
          'bazi day master pair',
        ],
      },
      ko: {
        title: `${c.a.ko}·${c.b.ko} 일간 궁합 — 십성·배우자성 풀이`,
        description: `${c.a.ko}(${c.a.element})과 ${c.b.ko}(${c.b.element}) 궁합. ${c.a.ko} 입장에서 ${c.b.ko}은 ${c.aToB}, ${c.b.ko} 입장에서 ${c.a.ko}은 ${c.bToA}.${c.mutualPrimarySpouse ? ' 서로가 서로의 정배우자성인 조합입니다.' : ''}`,
        keywords: [
          `${c.a.ko} ${c.b.ko} 궁합`,
          '일간 궁합',
          '일간 상성',
          '사주 궁합',
          '배우자성',
          '십성 궁합',
        ],
      },
      canonicalUrl: canonical,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
  // **색인 제외.** 일간 2글자만으로는 55페이지를 채울 정보가 없다 — 실측에서
  // 55쌍 중 서로 다른 사실집합이 15개뿐이었다(십성이 오행관계 × 음양으로
  // 결정되므로 조합이 수렴한다). 40쌍이 사실상 중복인 상태로 색인에 올리면
  // 얇은 페이지 대량 발행(thin content)이 된다.
  //
  // 그래서 이 페이지는 **허브 매트릭스에서 눌러 들어오는 사용자용 깊이**로만
  // 남긴다 — 실제 쓸모는 있으므로 지우지 않고, 색인만 막는다. 색인 대상
  // 표면은 십성 사전(/saju/sibsin)처럼 페이지마다 내용이 실제로 다른 쪽이다.
  return { ...meta, robots: { index: false, follow: true } }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        padding: '10px 0',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <dt style={{ color: '#6c665b', fontSize: 14 }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600, textAlign: 'right' }}>{value}</dd>
    </div>
  )
}

export default async function IlganCompatPage({ params }: Props) {
  const { pair } = await params
  const c = ilganCompatBySlug(pair)
  if (!c) notFound()

  const l = await getServerLocale()
  const isKo = l === 'ko'
  const sib = (s: string) => (isKo ? s : (SIBSIN_EN[s] ?? s))

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 72px' }}>
      <JsonLd
        data={generateJsonLd({
          type: 'Article',
          name: isKo
            ? `${c.a.ko}·${c.b.ko} 일간 궁합`
            : `${c.a.han} × ${c.b.han} Day Master Compatibility`,
          description: isKo
            ? `${relationText(c, true)}. ${c.a.ko}→${c.b.ko} ${c.aToB}, ${c.b.ko}→${c.a.ko} ${c.bToA}.`
            : `${relationText(c, false)}.`,
          url: `${baseUrl}/compatibility/ilgan/${c.slug}`,
        })}
      />

      <nav style={{ fontSize: 13, color: '#8b8578', marginBottom: 20 }}>
        <Link href="/compatibility/ilgan" style={{ color: '#8a6d3b' }}>
          {isKo ? '일간 궁합 전체' : 'All day-master pairs'}
        </Link>
        {' / '}
        {isKo ? `${c.a.ko}·${c.b.ko}` : `${c.a.han}×${c.b.han}`}
      </nav>

      <h1 style={{ fontSize: 30, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
        {isKo ? `${c.a.ko}·${c.b.ko} 일간 궁합` : `${c.a.han} × ${c.b.han}`}
        <span style={{ fontSize: 18, color: '#8b8578', marginLeft: 10 }}>
          {c.a.han}
          {c.b.han}
        </span>
      </h1>
      <p style={{ color: '#6c665b', margin: '0 0 28px', fontSize: 14 }}>{relationText(c, isKo)}</p>

      {c.mutualPrimarySpouse && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 10,
            background: 'rgba(47,125,79,0.08)',
            border: '1px solid rgba(47,125,79,0.22)',
            marginBottom: 28,
          }}
        >
          <strong style={{ color: '#2f7d4f', fontSize: 15 }}>
            {isKo ? '서로가 서로의 정배우자성' : 'Each other’s primary spouse star'}
          </strong>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#4a463f', lineHeight: 1.7 }}>
            {isKo
              ? '한쪽이 상대를 정재로, 상대는 그를 정관으로 봅니다. 일간 조합 100가지(남·여 순서 기준) 중 10가지에 해당합니다 — 좋은 배치지만 드물다고 할 정도는 아닙니다. 실제 궁합은 년·월·시주와 지지 합충까지 봐야 정해집니다.'
              : 'One reads the other as Direct Wealth, the other reads them as Direct Authority. This covers 10 of the 100 ordered male–female day-stem combinations — a favourable setup, though not rare. A real reading still needs the other three pillars and the branch relations.'}
          </p>
        </div>
      )}

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>
          {isKo ? '십성 — 방향이 있습니다' : 'Ten Gods — directional'}
        </h2>
        <dl style={{ margin: 0 }}>
          <Row
            label={isKo ? `${c.a.ko} 입장에서 ${c.b.ko}은` : `${c.a.han} reads ${c.b.han} as`}
            value={sib(c.aToB)}
          />
          <Row
            label={isKo ? `${c.b.ko} 입장에서 ${c.a.ko}은` : `${c.b.han} reads ${c.a.han} as`}
            value={sib(c.bToA)}
          />
          <Row
            label={isKo ? '천간합' : 'Stem harmony'}
            value={
              c.stemHap
                ? isKo
                  ? `합 → ${c.stemHap.element}으로 화함`
                  : `Yes → transforms to ${ELEMENT_EN[c.stemHap.element]}`
                : isKo
                  ? '없음'
                  : 'No'
            }
          />
          <Row
            label={isKo ? '천간충' : 'Stem clash'}
            value={c.stemChung ? (isKo ? '충' : 'Yes') : isKo ? '없음' : 'No'}
          />
        </dl>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>
          {isKo ? '배우자성 판정 (성별로 갈립니다)' : 'Spouse star (differs by gender)'}
        </h2>
        <p style={{ color: '#4a463f', lineHeight: 1.7, fontSize: 15, margin: '0 0 12px' }}>
          {isKo
            ? '정통 명리에서 남자의 배우자성은 재성(정재·편재), 여자의 배우자성은 관성(정관·편관)입니다. 같은 쌍이라도 누가 남자인지에 따라 판정이 달라집니다.'
            : 'In classical practice a man’s spouse star is Wealth, a woman’s is Authority. The same pair reads differently depending on who is which.'}
        </p>
        <dl style={{ margin: 0 }}>
          <Row
            label={isKo ? `${c.a.ko}이 남자라면` : `If ${c.a.han} is male`}
            value={
              c.aAsMaleSeesSpouse
                ? isKo
                  ? `${c.b.ko}이 처성 (${c.aToB})`
                  : `${c.b.han} is the spouse star (${sib(c.aToB)})`
                : isKo
                  ? '처성 아님'
                  : 'Not a spouse star'
            }
          />
          <Row
            label={isKo ? `${c.a.ko}이 여자라면` : `If ${c.a.han} is female`}
            value={
              c.aAsFemaleSeesSpouse
                ? isKo
                  ? `${c.b.ko}이 부성 (${c.aToB})`
                  : `${c.b.han} is the spouse star (${sib(c.aToB)})`
                : isKo
                  ? '부성 아님'
                  : 'Not a spouse star'
            }
          />
          <Row
            label={isKo ? `${c.b.ko}이 남자라면` : `If ${c.b.han} is male`}
            value={
              c.bAsMaleSeesSpouse
                ? isKo
                  ? `${c.a.ko}이 처성 (${c.bToA})`
                  : `${c.a.han} is the spouse star (${sib(c.bToA)})`
                : isKo
                  ? '처성 아님'
                  : 'Not a spouse star'
            }
          />
          <Row
            label={isKo ? `${c.b.ko}이 여자라면` : `If ${c.b.han} is female`}
            value={
              c.bAsFemaleSeesSpouse
                ? isKo
                  ? `${c.a.ko}이 부성 (${c.bToA})`
                  : `${c.a.han} is the spouse star (${sib(c.bToA)})`
                : isKo
                  ? '부성 아님'
                  : 'Not a spouse star'
            }
          />
        </dl>
      </section>

      {/* 일주 페이지로 교차 링크 — 두 표면이 서로를 가리켜 링크 그래프를 만든다. */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>
          {isKo ? '이 일간의 일주들' : 'Day pillars with these stems'}
        </h2>
        <div style={{ fontSize: 14, lineHeight: 2 }}>
          {[c.a, c.b]
            .filter((s, i, arr) => arr.findIndex((x) => x.han === s.han) === i)
            .map((side) => (
              <div key={side.han}>
                <span style={{ color: '#6c665b', marginRight: 8 }}>
                  {isKo ? `${side.ko}(${side.han}) 일간:` : `${side.han}:`}
                </span>
                {iljuWithStem(side.han).map((p, i) => (
                  <span key={p.slug}>
                    {i > 0 && ' · '}
                    <Link href={`/saju/ilju/${p.slug}`} style={{ color: '#8a6d3b' }}>
                      {isKo ? `${p.ko}일주` : p.ganji}
                    </Link>
                  </span>
                ))}
              </div>
            ))}
        </div>
      </section>

      {/* 같은 일간이 끼는 다른 쌍 — 55페이지 내부 링크 */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>
          {isKo ? `${c.a.ko} 일간의 다른 궁합` : `Other pairs for ${c.a.han}`}
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ILGAN_ORDER.filter((s) => s !== c.b.han).map((other) => (
            <Link
              key={other}
              href={`/compatibility/ilgan/${canonicalIlganSlug(c.a.han, other)}`}
              style={{
                padding: '6px 11px',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.08)',
                background: '#fff',
                color: '#2f2b26',
                fontSize: 13,
              }}
            >
              {c.a.han}
              {other}
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
          {isKo ? '두 사람 사주 전체로 궁합 보기' : 'Full compatibility reading'}
        </h2>
        <p style={{ color: '#4a463f', lineHeight: 1.7, fontSize: 14, margin: '0 0 14px' }}>
          {isKo
            ? '일간은 궁합의 한 축일 뿐입니다. 실제 판정은 배우자궁(일지)의 합충, 년·월·시주 교차, 오행 보완, 그리고 서양 점성 시너스트리까지 함께 봐야 나옵니다.'
            : 'The day stem is one axis. A real reading needs the spouse-palace branch relations, all four pillars crossed, element balance, and the Western synastry alongside it.'}
        </p>
        <Link
          href="/compatibility/free"
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
          {isKo ? '무료 궁합 리포트 받기' : 'Get the free compatibility report'}
        </Link>
      </section>
    </main>
  )
}

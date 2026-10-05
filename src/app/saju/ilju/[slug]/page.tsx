// 일주(日柱) 상세 — 60갑자 중 1개.
//
// 프로그래매틱 SEO 표면(60개 × ko/en = 120 URL). "신미일주", "辛未 일주",
// "sinmi ilju", "Korean four pillars day pillar" 류 검색을 받는다.
//
// 왜 이 주제인가: 2026-06 에 영어 타로 카드 의미 글 140개를 쏟아 발행했지만
// 그 키워드는 Biddy Tarot·Labyrinthos 가 10~15년 점유해 신규 도메인이 들어갈
// 틈이 없다. 일주 계열은 경쟁이 거의 없고 **우리 엔진만 계산할 수 있다** —
// 배우자궁 십성·공망·천을귀인·지지 합충은 사주 엔진 없이는 한 줄도 못 쓴다.
//
// 본문은 전부 결정론 엔진(iljuProfile)이 일주 2글자에서 계산한다. 해석 문장을
// 임의로 덧붙이지 않는다(날조 금지). 하단에서 개인화 제품으로 흘려보낸다.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { ELEMENT_EN, iljuBySlug, iljuWithBranch, type IljuProfile } from '@/lib/saju/iljuProfile'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

type Props = { params: Promise<{ slug: string }> }

const SIBSIN_EN: Record<string, string> = {
  비견: 'Peer (bijian)',
  겁재: 'Rival (jiecai)',
  식신: 'Output (shishen)',
  상관: 'Expression (shangguan)',
  편재: 'Indirect Wealth (piancai)',
  정재: 'Direct Wealth (zhengcai)',
  편관: 'Indirect Authority (pianguan)',
  정관: 'Direct Authority (zhengguan)',
  편인: 'Indirect Resource (pianyin)',
  정인: 'Direct Resource (zhengyin)',
}

const el = (e: string, isKo: boolean) => (isKo ? e : (ELEMENT_EN[e] ?? e))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const p = iljuBySlug(slug)
  if (!p) return { title: 'Not Found', robots: { index: false, follow: false } }

  const seatKo = p.spouseSeat.sibsin
  const seatEn = SIBSIN_EN[seatKo] ?? seatKo
  return generateLocalizedMetadata(
    {
      en: {
        title: `${p.ganji} (${p.slug}) Day Pillar — Korean Four Pillars Meaning`,
        description: `${p.ganji} day pillar: ${p.dayStem.han} ${ELEMENT_EN[p.dayStem.element]} day master over ${p.dayBranch.han} (${p.dayBranch.animalEn}). Spouse palace reads as ${seatEn}; void branches ${p.gongmang.join(', ')}.`,
        keywords: [
          `${p.slug} ilju`,
          `${p.ganji} day pillar`,
          'korean four pillars day pillar',
          'saju day master meaning',
          'bazi day pillar',
        ],
      },
      ko: {
        title: `${p.ko}일주(${p.ganji}) — 일간·배우자궁·공망 풀이`,
        description: `${p.ko}일주: 일간 ${p.dayStem.ko}(${p.dayStem.element}) · 일지 ${p.dayBranch.ko}(${p.dayBranch.element}·${p.dayBranch.animalKo}). 배우자궁은 ${seatKo}, 공망은 ${p.gongmang.join('·')}. 60갑자 ${p.index}번.`,
        keywords: [
          `${p.ko}일주`,
          `${p.ganji} 일주`,
          `${p.ko}일주 성격`,
          '일주론',
          '60갑자 일주',
          '배우자궁',
        ],
      },
      canonicalUrl: `${baseUrl}/saju/ilju/${p.slug}`,
      ogImage: '/og-card-v2.png',
    },
    await getServerLocale()
  )
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

/** 같은 지지를 일지로 갖는 일주 링크 묶음 — 60페이지 내부 링크 그래프. */
function IljuLinks({ branch, list }: { branch: string; list: IljuProfile[] }) {
  return (
    <span>
      {list.map((x, i) => (
        <span key={x.slug}>
          {i > 0 && ' · '}
          <Link href={`/saju/ilju/${x.slug}`} style={{ color: '#8a6d3b' }}>
            {x.ko}
          </Link>
        </span>
      ))}
      {list.length === 0 && branch}
    </span>
  )
}

export default async function IljuDetailPage({ params }: Props) {
  const { slug } = await params
  const p = iljuBySlug(slug)
  if (!p) notFound()

  const l = await getServerLocale()
  const isKo = l === 'ko'
  const seat = isKo ? p.spouseSeat.sibsin : (SIBSIN_EN[p.spouseSeat.sibsin] ?? p.spouseSeat.sibsin)

  const yukhapList = p.relations.yukhap ? iljuWithBranch(p.relations.yukhap) : []
  const chungList = p.relations.chung ? iljuWithBranch(p.relations.chung) : []

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 72px' }}>
      <JsonLd
        data={generateJsonLd({
          type: 'Article',
          name: isKo ? `${p.ko}일주(${p.ganji}) 풀이` : `${p.ganji} Day Pillar Meaning`,
          description: isKo
            ? `일간 ${p.dayStem.ko}, 일지 ${p.dayBranch.ko}. 배우자궁 ${p.spouseSeat.sibsin}, 공망 ${p.gongmang.join('·')}.`
            : `${p.dayStem.han} day master over ${p.dayBranch.han}. Spouse palace ${seat}.`,
          url: `${baseUrl}/saju/ilju/${p.slug}`,
        })}
      />

      <nav style={{ fontSize: 13, color: '#8b8578', marginBottom: 20 }}>
        <Link href="/saju/ilju" style={{ color: '#8a6d3b' }}>
          {isKo ? '60갑자 일주' : 'All 60 day pillars'}
        </Link>
        {' / '}
        {p.ko}
      </nav>

      <h1 style={{ fontSize: 30, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
        {isKo ? `${p.ko}일주` : `${p.ganji} Day Pillar`}
        <span style={{ fontSize: 18, color: '#8b8578', marginLeft: 10 }}>{p.ganji}</span>
      </h1>
      <p style={{ color: '#6c665b', margin: '0 0 28px', fontSize: 14 }}>
        {isKo
          ? `60갑자 ${p.index}번 · 일간 ${p.dayStem.ko}(${p.dayStem.element}·${p.dayStem.yinYang}) · 일지 ${p.dayBranch.ko}(${p.dayBranch.element}·${p.dayBranch.animalKo})`
          : `#${p.index} of 60 · ${p.dayStem.han} ${ELEMENT_EN[p.dayStem.element]} day master · ${p.dayBranch.han} ${p.dayBranch.animalEn} branch`}
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>
          {isKo ? '명식 기본값' : 'Chart fundamentals'}
        </h2>
        <dl style={{ margin: 0 }}>
          <Row
            label={isKo ? '일간 (나 자신)' : 'Day master'}
            value={`${p.dayStem.han} ${isKo ? p.dayStem.ko : ''} · ${el(p.dayStem.element, isKo)} · ${
              isKo ? p.dayStem.yinYang : p.dayStem.yinYang === '양' ? 'yang' : 'yin'
            }`}
          />
          <Row
            label={isKo ? '일지 (배우자궁)' : 'Day branch (spouse palace)'}
            value={`${p.dayBranch.han} ${isKo ? p.dayBranch.ko : ''} · ${el(p.dayBranch.element, isKo)} · ${
              isKo ? p.dayBranch.animalKo : p.dayBranch.animalEn
            }`}
          />
          <Row
            label={isKo ? '일지 지장간 본기' : 'Hidden stem (main qi)'}
            value={p.dayBranch.hiddenStem}
          />
          <Row label={isKo ? '배우자궁 십성' : 'Spouse palace reads as'} value={seat} />
          <Row label={isKo ? '공망' : 'Void branches'} value={p.gongmang.join(' · ')} />
          <Row
            label={isKo ? '천을귀인' : 'Noble star (cheoneul)'}
            value={
              <>
                {p.cheoneul.join(' · ')}
                {p.cheoneulOnDayBranch && (
                  <span style={{ color: '#2f7d4f', marginLeft: 8, fontSize: 13 }}>
                    {isKo ? '★ 일지에 적좌' : '★ on the day branch'}
                  </span>
                )}
              </>
            }
          />
        </dl>
      </section>

      {/* 배우자궁 — 성별로 판정이 갈린다(남=재성이 처, 여=관성이 부). */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>
          {isKo ? '배우자궁 판정' : 'Spouse palace'}
        </h2>
        <p style={{ color: '#4a463f', lineHeight: 1.7, fontSize: 15, margin: 0 }}>
          {isKo
            ? `일지 ${p.dayBranch.han}의 지장간 본기 ${p.dayBranch.hiddenStem}을 일간 ${p.dayStem.han} 기준으로 보면 ${p.spouseSeat.sibsin}입니다. `
            : `Reading the hidden main stem ${p.dayBranch.hiddenStem} of ${p.dayBranch.han} from the ${p.dayStem.han} day master gives ${seat}. `}
          {p.spouseSeat.isSpouseStarForMale
            ? isKo
              ? '정통 명리에서 남자의 배우자성은 재성이므로, 이 일주는 배우자성이 배우자궁에 그대로 앉은 경우입니다.'
              : 'In classical practice a man’s spouse star is the Wealth element, so here the spouse star sits directly in the spouse palace.'
            : p.spouseSeat.isSpouseStarForFemale
              ? isKo
                ? '정통 명리에서 여자의 배우자성은 관성이므로, 이 일주는 배우자성이 배우자궁에 그대로 앉은 경우입니다.'
                : 'In classical practice a woman’s spouse star is the Authority element, so here the spouse star sits directly in the spouse palace.'
              : isKo
                ? '재성·관성이 아니므로 배우자성이 배우자궁에 직접 앉은 형태는 아닙니다 — 배우자 관련 판단은 사주 전체(년·월·시주와 대운)를 함께 봐야 합니다.'
                : 'This is neither Wealth nor Authority, so the spouse star does not sit directly in the palace — partnership questions need the whole chart (year, month, hour pillars and luck cycles).'}
        </p>
      </section>

      {/* 지지 관계 — 내부 링크 그래프의 근거 */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>
          {isKo ? '일지 관계로 보는 다른 일주' : 'Related day pillars'}
        </h2>
        <dl style={{ margin: 0 }}>
          {p.relations.yukhap && (
            <Row
              label={isKo ? `육합 (${p.relations.yukhap})` : `Six harmony (${p.relations.yukhap})`}
              value={<IljuLinks branch={p.relations.yukhap} list={yukhapList} />}
            />
          )}
          {p.relations.chung && (
            <Row
              label={isKo ? `충 (${p.relations.chung})` : `Clash (${p.relations.chung})`}
              value={<IljuLinks branch={p.relations.chung} list={chungList} />}
            />
          )}
          {p.relations.samhap && (
            <Row
              label={
                isKo
                  ? `삼합 ${p.relations.samhap.element}국`
                  : `Trine (${ELEMENT_EN[p.relations.samhap.element]})`
              }
              value={p.relations.samhap.branches.join(' · ')}
            />
          )}
          {p.relations.hae && <Row label={isKo ? '해' : 'Harm'} value={p.relations.hae} />}
          {p.relations.pa && <Row label={isKo ? '파' : 'Break'} value={p.relations.pa} />}
        </dl>
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
          {isKo ? '내 사주 전체로 보기' : 'See your whole chart'}
        </h2>
        <p style={{ color: '#4a463f', lineHeight: 1.7, fontSize: 14, margin: '0 0 14px' }}>
          {isKo
            ? '위 내용은 일주 두 글자만으로 계산한 것입니다. 실제 판단은 년·월·시주, 대운·세운, 그리고 서양 점성 차트까지 교차해야 나옵니다.'
            : 'The above is computed from the two day-pillar characters alone. A real reading needs the year, month and hour pillars, the luck cycles, and the Western chart cross-checked against them.'}
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

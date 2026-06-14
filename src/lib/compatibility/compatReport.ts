/**
 * 궁합 차트 리포트 빌더 — 서버 전용 (엣지 보호).
 *
 * 시너스트리(calculateSynastry)·사주 cross(computeSajuSynastryFacts)·점수
 * 가중치 같은 "계산 로직"을 클라 번들에서 빼서 여기(서버)서만 돌린다. 차트는
 * 이 결과(JSON)만 받아 그린다. natal/pillars 같은 *데이터*는 어차피 차트
 * 시각화(휠·레이더·명식)에 필요해 클라에 있지만, *로직*은 서버에 남는다.
 */

import { computeSynastryView, type SynastryView } from './synastryView'
import {
  computeSajuSynastryFacts,
  type SajuPillarInput,
  type SajuCompatDayMaster,
  type SajuCompatSpouseStar,
  type SajuCompatPillarRel,
} from './sajuSynastryFormatter'

export interface CompatBandScores {
  eastern_hap?: number
  eastern_chung?: number
  elements_match?: number
  synastry_harmonic?: number
  synastry_tension?: number
}

export interface CompatReport {
  synView: SynastryView | null
  dayMaster: SajuCompatDayMaster | null
  /** 일주(배우자궁) 우선 정렬, 상위 4개 */
  spouseStars: SajuCompatSpouseStar[]
  /** 기둥 cross 관계 (관계 요약 시각화용 — 천간합/충·지지 육합/충/형/자형/해/파) */
  pillarRelations: SajuCompatPillarRel[]
  band?: CompatBandScores
  /** 동·서 교차 종합 — 사주(합/충)와 별자리(조화/긴장)가 한 방향인지 한 줄로. */
  crossVerdict?: { tone: 'aligned' | 'mixed' | 'tension' | 'neutral'; text: string }
}

// 사주(합/충)와 별자리(조화/긴장)의 net 을 교차해 "둘이 같은 말 하는지" 한 줄.
// raw 행 나열 대신 관계 전체의 결을 먼저 짚어줌(자연 리포트의 종합과 같은 결).
function buildCrossVerdict(
  pillarRels: SajuCompatPillarRel[],
  syn: SynastryView | null,
  isKo: boolean
): CompatReport['crossVerdict'] {
  if (pillarRels.length === 0 && (!syn || syn.aspects.length === 0)) return undefined
  let sajuNet = 0
  for (const r of pillarRels) {
    if (r.tone === 'bond') sajuNet++
    else if (r.tone === 'clash') sajuNet--
  }
  let astroNet = 0
  if (syn) {
    for (const a of syn.aspects) {
      if (a.tone === 'harmony') astroNet++
      else if (a.tone === 'tension') astroNet--
    }
  }
  const sp = sajuNet > 0
  const sn = sajuNet < 0
  const ap = astroNet > 0
  const an = astroNet < 0
  if (sp && ap)
    return {
      tone: 'aligned',
      text: isKo
        ? '사주도 별자리도 한목소리로 끌려요 — 동·서가 같은 방향을 가리키는, 자연스럽게 통하는 궁합이에요.'
        : 'Saju and the stars speak with one voice — both point the same way, a naturally flowing match.',
    }
  if (sn && an)
    return {
      tone: 'tension',
      text: isKo
        ? '사주도 별자리도 부딪힘을 짚어요 — 안 맞아서가 아니라, 마찰을 거치며 서로를 깎아 빛내는 단련형 관계예요.'
        : 'Both Saju and the stars flag friction — not a mismatch but a forging bond that sharpens you through the rub.',
    }
  if ((sp && an) || (sn && ap))
    return {
      tone: 'mixed',
      text: isKo
        ? `한쪽은 끌리고 한쪽은 부딪혀요 — 겉과 속(동·서)이 다른 입체적인 관계. 어디서 통하고 어디서 조율할지가 핵심이에요.`
        : 'One side pulls while the other rubs — a layered East-West contrast. The work is knowing where you click and where to tune.',
    }
  return {
    tone: 'neutral',
    text: isKo
      ? '끌림과 마찰이 고르게 섞인 균형형 — 극적이진 않아도 결이 오래가는 사이예요.'
      : 'Pull and friction evenly mixed — not dramatic, but a bond that lasts.',
  }
}

export interface CompatReportInput {
  /** unwrap된 natal (chartData) — A/B */
  astroA: unknown
  astroB: unknown
  /** {stem,branch}[] (년·월·일·시) — A/B. 없으면 사주측 생략 */
  pillarsA: SajuPillarInput[] | null
  pillarsB: SajuPillarInput[] | null
  lang?: 'ko' | 'en'
}

const ELEMENTS = ['목', '화', '토', '금', '수'] as const

export function buildCompatReport(input: CompatReportInput): CompatReport {
  const { astroA, astroB, pillarsA, pillarsB, lang = 'ko' } = input

  const synView = computeSynastryView(astroA, astroB, lang)

  const sajuFacts = pillarsA && pillarsB ? computeSajuSynastryFacts({ pillarsA, pillarsB }) : null

  // 배우자성 — 일주(배우자궁)에 잡힌 것 우선, 상위 4.
  const spouseStars = sajuFacts
    ? [...sajuFacts.spouseStars]
        .sort((a, b) => Number(b.isDayPillar) - Number(a.isDayPillar))
        .slice(0, 4)
    : []

  // 밴드 분해 바 — SSOT(엔진 시너스트리 + 사주 facts)에서 도출. 가중치는 서버에만.
  const band: CompatBandScores = {}
  if (sajuFacts) {
    let bond = 0
    let clash = 0
    for (const r of sajuFacts.pillarRelations) {
      if (r.tone === 'bond') bond++
      else if (r.tone === 'clash') clash++
    }
    band.eastern_hap = Math.min(100, bond * 20)
    band.eastern_chung = Math.max(0, 100 - clash * 15)
    if (sajuFacts.elementBalance) {
      const { a, b } = sajuFacts.elementBalance
      let comp = 0
      for (const e of ELEMENTS) {
        const av = a[e] ?? 0
        const bv = b[e] ?? 0
        if (av <= 1 && bv >= 2) comp += 20
        if (bv <= 1 && av >= 2) comp += 20
      }
      band.elements_match = Math.min(100, comp)
    }
  }
  if (synView && synView.aspects.length > 0) {
    let harm = 0
    let tens = 0
    for (const asp of synView.aspects) {
      if (asp.tone === 'harmony') harm++
      else if (asp.tone === 'tension') tens++
    }
    band.synastry_harmonic = Math.min(100, harm * 20)
    band.synastry_tension = Math.max(0, 100 - tens * 20)
  }

  const pillarRelations = sajuFacts?.pillarRelations ?? []
  return {
    synView,
    dayMaster: sajuFacts?.dayMaster ?? null,
    spouseStars,
    pillarRelations,
    band: Object.keys(band).length > 0 ? band : undefined,
    crossVerdict: buildCrossVerdict(pillarRelations, synView, lang === 'ko'),
  }
}

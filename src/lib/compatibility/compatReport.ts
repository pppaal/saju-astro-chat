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

  return {
    synView,
    dayMaster: sajuFacts?.dayMaster ?? null,
    spouseStars,
    pillarRelations: sajuFacts?.pillarRelations ?? [],
    band: Object.keys(band).length > 0 ? band : undefined,
  }
}

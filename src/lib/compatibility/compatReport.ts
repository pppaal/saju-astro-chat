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
  /**
   * 총합 궁합 점수 0~100. 중립(신호 없음)=50 기준선에서 좋은 신호는 더하고
   * 마찰 신호는 빼는 net 산식. 신호의 *중요도*(일주·배우자성 > 년·월주)를
   * 가중. 데이터가 한쪽만 있어도 기준선이 흔들리지 않게 설계.
   */
  score?: number
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

  // ── 점수 ───────────────────────────────────────────────────────────
  // net-signal: 중립 기준선 50에서 좋은 신호는 더하고 마찰은 뺀다. 정통
  // 궁합의 중요도 위계(일주·배우자성 > 년·월주, 일지충 > 기타충)와 시너스트리
  // 경험칙(개인행성 조화 가산, 긴장은 약하게 — '스파크'라 결정적 감점은 아님)을
  // 가중치로 반영. clamp 0~100.
  let score = 50
  let scored = false // 신호가 하나라도 잡혔나 (없으면 score 미출력)

  if (sajuFacts) {
    scored = true
    for (const r of sajuFacts.pillarRelations) {
      const day = r.isDayInvolved
      if (r.tags.includes('천간합')) score += day ? 12 : 6
      if (r.tags.includes('육합')) score += day ? 8 : 5
      if (r.tags.includes('충') || r.tags.includes('천간충')) score -= day ? 10 : 5
      if (r.tags.includes('형') || r.tags.includes('자형')) score -= 3
      if (r.tags.includes('해') || r.tags.includes('파')) score -= 2
    }
    // 일간 관계 — 상생(서로 보완)은 가산, 같은 오행(비화)은 소폭.
    if (sajuFacts.dayMaster?.relation === 'generate') score += 4
    else if (sajuFacts.dayMaster?.relation === 'same') score += 2
    // 배우자성 — 가장 강한 정통 신호. 배우자궁(일주)에 뜨면 크게, 그 외는 소폭.
    const sp = sajuFacts.spouseStars
    if (sp.some((s) => s.isDayPillar)) score += 10
    else if (sp.length > 0) score += 5
    score += Math.min(4, Math.max(0, sp.filter((s) => !s.isDayPillar).length) * 2)
    // 오행 상보 — 한쪽이 약한(<=1) 오행을 다른 쪽이 채워주면(>=2) 보완. 최대 +15.
    if (sajuFacts.elementBalance) {
      const { a, b } = sajuFacts.elementBalance
      let comp = 0
      for (const e of ELEMENTS) {
        const av = a[e] ?? 0
        const bv = b[e] ?? 0
        if (av <= 1 && bv >= 2) comp += 5
        if (bv <= 1 && av >= 2) comp += 5
      }
      score += Math.min(15, comp)
    }
  }

  if (synView && synView.aspects.length > 0) {
    scored = true
    let astro = 0
    for (const asp of synView.aspects) {
      const tight = asp.orb <= 1.5
      const clear = asp.orb <= 3
      if (asp.tone === 'harmony') astro += tight ? 5 : clear ? 4 : 2
      // 긴장은 '스파크' — 끌림의 원천이기도 해 감점을 약하게.
      else if (asp.tone === 'tension') astro -= tight ? 3 : clear ? 2 : 1
    }
    // 점성 신호가 사주를 압도하지 않게 net 기여 캡.
    score += Math.max(-12, Math.min(18, astro))
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  // 밴드 분해 바 — 헤드라인 점수의 *근거*. 긴장 계열(충·시너 긴장) 바는
  // '마찰의 양'을 그대로(높을수록 마찰 큼) 보여줘 색(로즈레드)과 의미를 일치.
  const band: CompatBandScores = {}
  if (sajuFacts) {
    let bond = 0
    let clash = 0
    for (const r of sajuFacts.pillarRelations) {
      if (r.tone === 'bond') bond++
      else if (r.tone === 'clash') clash++
    }
    band.eastern_hap = Math.min(100, bond * 25)
    band.eastern_chung = Math.min(100, clash * 25)
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
    band.synastry_tension = Math.min(100, tens * 20)
  }

  return {
    synView,
    dayMaster: sajuFacts?.dayMaster ?? null,
    spouseStars,
    pillarRelations: sajuFacts?.pillarRelations ?? [],
    score: scored ? score : undefined,
    band: Object.keys(band).length > 0 ? band : undefined,
  }
}

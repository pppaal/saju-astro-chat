/**
 * lifetimeFlow → destinypal `lifeStages[4]` 평탄화 adapter.
 *
 * lifetimeFlow.phases (deriveLifetimeFlow 결과) 는 한 phase 당:
 *   { label, ageRange, text, daeunLine?, milestoneLine?, relationLine?,
 *     shinsalLine?, twelveStageLine?, current }
 *
 * destinypal lifeStages 는:
 *   { id, name, ageFrom, ageTo, yearFrom, yearTo, now, tone, detail }
 *
 * id 는 phases 의 라벨 순서 고정 매핑 (초년기→early, 청년기→youth, …).
 * detail 은 phase.current 가 true 인 단계에만 채운다 — destinypal UI 가
 * 펼친 카드를 한 단계에만 노출하는 디자인. text 는 destinypal 의 tone 줄로,
 * 나머지 사실 라인(daeunLine 등)은 detail.body 배열로 흩뿌린다.
 */

import type { LifetimeFlow, LifePhase } from '@/lib/calendar-engine/derivers/lifetimeFlow'

export interface DestinypalLifeStageDetail {
  daeunText?: string // "丙子(병자) 2006–16 → 乙亥(을해) 2016–26 → 甲戌(갑술) 2026–36"
  body: string[]
  /**
   * 외행성 마일스톤 — 항상 배열 (없으면 빈 배열).
   * destinypal LifetimeTier 가 .map / .length 로 무조건 읽으므로 normalize.
   */
  outer: Array<{
    label: string
    date: string
    body: string
    kind?: string // 'jupiter' | 'saturn' | …
  }>
  hapchung?: { title: string; romaji?: string; body: string }
  shinsal?: { title: string; romaji?: string; body: string }
  unseong?: { title: string; romaji?: string; body: string }
}

export interface DestinypalLifeStage {
  id: 'early' | 'youth' | 'middle' | 'late'
  name: string // 초년기 / 청년기 / 중년기 / 장년기
  ageFrom: number
  ageTo: number
  yearFrom: number
  yearTo: number
  now: boolean
  tone: string // "편재 — 현실 성취의 무대"
  detail: DestinypalLifeStageDetail | null
}

const LABEL_TO_ID: Record<string, DestinypalLifeStage['id']> = {
  초년기: 'early',
  청년기: 'youth',
  중년기: 'middle',
  장년기: 'late',
  // English fallback (lifetimeFlow returns "Early years" 등)
  'Early years': 'early',
  'Young adulthood': 'youth',
  Midlife: 'middle',
  'Elder years': 'late',
}

const LABEL_FALLBACK: Array<{
  id: DestinypalLifeStage['id']
  ko: string
  ageFrom: number
  ageTo: number
}> = [
  { id: 'early', ko: '초년기', ageFrom: 0, ageTo: 19 },
  { id: 'youth', ko: '청년기', ageFrom: 20, ageTo: 39 },
  { id: 'middle', ko: '중년기', ageFrom: 40, ageTo: 59 },
  { id: 'late', ko: '장년기', ageFrom: 60, ageTo: 84 },
]

/** "20~39세 · 2015~2034" / "age 20-39 · 2015-2034" 모두 인식 */
function parseAgeRange(ageRange: string): {
  ageFrom: number
  ageTo: number
  yearFrom: number
  yearTo: number
} {
  // Korean form: "20~39세 · 2015~2034"
  // English form: "age 20-39 · 2015-2034"
  const nums = ageRange.match(/\d+/g) ?? []
  const [aF = 0, aT = 0, yF = 0, yT = 0] = nums.map((n) => parseInt(n, 10))
  return { ageFrom: aF, ageTo: aT, yearFrom: yF, yearTo: yT }
}

/**
 * phase.text 에 박힌 "편재(재성) 흐름 — ..." 같은 한국어 톤 문자열에서
 * "편재 — ..." 짧은 헤드만 추출. 추출 못하면 phase.text 의 첫 절반.
 */
function deriveTone(phase: LifePhase): string {
  const t = phase.text
  if (!t) return ''
  // "편재(재성) 흐름 — 현실 성취와 돈·연애의 무대가 열려요. 실속을 다지는 결."
  // 앞 두 절(— 까지의 한 절 + 다음 . 까지)을 톤으로.
  const dash = t.match(/^(.+?)\s—\s(.+?)[.。!?]/)
  if (dash) return `${dash[1].split('(')[0].trim()} — ${dash[2].trim()}`
  // 폴백 — 첫 마침표까지
  const dot = t.match(/^(.+?)[.。!?]/)
  return dot ? dot[1] : t
}

export interface ToLifeStagesOptions {
  birthYear: number
  /**
   * destinypal 라벨/연령대를 명시 (미지정 시 fallback 사용). 한국 phase 4구간
   * (0-19/20-39/40-59/60-84) 가 lifetimeFlow 의 BANDS 와 일치하므로 보통 생략.
   */
  bands?: Array<{ id: DestinypalLifeStage['id']; ko: string; ageFrom: number; ageTo: number }>
}

/**
 * lifetimeFlow.phases → destinypal lifeStages[4].
 *
 * lifetimeFlow.phases 가 4개 정확히 들어오면 그대로 매핑. 부족하면 LABEL_FALLBACK
 * 으로 빈 단계 채워 항상 4개 보장 (destinypal UI 가 4개 슬롯을 가정).
 */
export function toLifeStages(
  lifetimeFlow: LifetimeFlow | undefined,
  opts: ToLifeStagesOptions
): DestinypalLifeStage[] {
  const bands = opts.bands ?? LABEL_FALLBACK
  const phases = lifetimeFlow?.phases ?? []
  const phaseByLabel = new Map<DestinypalLifeStage['id'], LifePhase>()
  for (const p of phases) {
    const id = LABEL_TO_ID[p.label]
    if (id) phaseByLabel.set(id, p)
  }

  return bands.map((band) => {
    const phase = phaseByLabel.get(band.id)
    const yearFrom = opts.birthYear + band.ageFrom
    const yearTo = opts.birthYear + band.ageTo
    if (!phase) {
      return {
        id: band.id,
        name: band.ko,
        ageFrom: band.ageFrom,
        ageTo: band.ageTo,
        yearFrom,
        yearTo,
        now: false,
        tone: '',
        detail: null,
      }
    }
    const parsed = parseAgeRange(phase.ageRange)
    const tone = deriveTone(phase)
    // 4단계 *전부* detail 을 채운다 — 데이터(daeunLine/relationLine/외행성/신살/
    // 12운성)는 deriveLifetimeFlow 가 모든 단계에 대해 이미 만들어 넘긴다. 예전엔
    // phase.current 단계만 펼치고 나머지를 버려, 프리미엄의 "인생 전체 흐름"(4단계
    // 풀 서사)이 사라졌었다(사용자 지적). 현재 단계는 now 플래그로만 강조.
    const detail: DestinypalLifeStageDetail | null = {
      daeunText: phase.daeunLine,
      body: [
        phase.text,
        ...(phase.relationLine ? [phase.relationLine] : []),
        ...(phase.twelveStageLine ? [phase.twelveStageLine] : []),
      ],
      outer: phase.milestoneLine
        ? [{ label: phase.milestoneLine, date: '', body: phase.milestoneLine }]
        : [],
      shinsal: phase.shinsalLine ? { title: '신살 활성', body: phase.shinsalLine } : undefined,
    }
    return {
      id: band.id,
      name: band.ko,
      ageFrom: parsed.ageFrom || band.ageFrom,
      ageTo: parsed.ageTo || band.ageTo,
      yearFrom: parsed.yearFrom || yearFrom,
      yearTo: parsed.yearTo || yearTo,
      now: phase.current,
      tone,
      detail,
    }
  })
}

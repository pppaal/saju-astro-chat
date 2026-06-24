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
  /** body 영문 — 클라이언트 언어 토글용. 비면 body 폴백. */
  bodyEn: string[]
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
  shinsal?: { title: string; romaji?: string; body: string; bodyEn?: string; kind?: string }
  unseong?: { title: string; romaji?: string; body: string }
}

export interface DestinypalLifeStage {
  id: 'early' | 'youth' | 'middle' | 'late'
  name: string // 초년기 / 청년기 / 중년기 / 장년기
  /** 영문 단계명 — 'Early years' 등. 클라이언트 토글용. */
  nameEn: string
  ageFrom: number
  ageTo: number
  yearFrom: number
  yearTo: number
  now: boolean
  tone: string // "편재 — 현실 성취의 무대"
  /** 영문 톤 — 클라이언트 토글용. 비면 tone 폴백. */
  toneEn: string
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
  en: string
  ageFrom: number
  ageTo: number
}> = [
  { id: 'early', ko: '초년기', en: 'Early years', ageFrom: 0, ageTo: 19 },
  { id: 'youth', ko: '청년기', en: 'Young adulthood', ageFrom: 20, ageTo: 39 },
  { id: 'middle', ko: '중년기', en: 'Midlife', ageFrom: 40, ageTo: 59 },
  { id: 'late', ko: '장년기', en: 'Elder years', ageFrom: 60, ageTo: 84 },
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
 * phase.text 에서 톤 헤드라인(평이 첫 문장)을 뽑는다.
 *
 * textKo 형태: `[초년 도입부 — ]${평이 본문}. ${평이 톤}` (십신 원명은 source 에서
 * 제거됨). 초년 도입부("…시기예요 — ")가 있으면 떼어내고, 그 뒤 평이 본문의 첫
 * 문장만 톤으로 쓴다 — raw 십신/간지 없이 사람이 읽는 한 줄. KO·EN 동일 구조.
 */
function deriveToneFromText(t: string | undefined): string {
  if (!t) return ''
  // 초년 도입부(" … — ")를 떼어 톤이 평이 본문으로 시작하게 한다.
  const s = t.replace(/^[^—]{0,40}?\s—\s/, '').trim()
  const dot = s.match(/^(.+?)[.。!?]/)
  return (dot ? dot[1] : s).trim()
}

export interface ToLifeStagesOptions {
  birthYear: number
  /**
   * destinypal 라벨/연령대를 명시 (미지정 시 fallback 사용). 한국 phase 4구간
   * (0-19/20-39/40-59/60-84) 가 lifetimeFlow 의 BANDS 와 일치하므로 보통 생략.
   */
  bands?: Array<{
    id: DestinypalLifeStage['id']
    ko: string
    en: string
    ageFrom: number
    ageTo: number
  }>
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
        nameEn: band.en,
        ageFrom: band.ageFrom,
        ageTo: band.ageTo,
        yearFrom,
        yearTo,
        now: false,
        tone: '',
        toneEn: '',
        detail: null,
      }
    }
    const parsed = parseAgeRange(phase.ageRange)
    // 헤드라인 톤 = 운세 톤(평이). lifetimeFlow 가 분리 baked 한 toneKo/toneEn 을
    // 직접 쓴다. 옛 deriveToneFromText(textKo 역파싱)는 첫 본문 문장을 톤으로
    // 오추출하고 em-dash 절을 잘라먹어(감사 BUG-1/BUG-2) 폐기. 구버전 데이터
    // 호환을 위해 새 필드가 없을 때만 폴백.
    const tone = phase.toneKo ?? deriveToneFromText(phase.textKo)
    const toneEn = phase.toneEn ?? deriveToneFromText(phase.textEn)
    // 4단계 *전부* detail 을 채운다 — 데이터(daeunLine/relationLine/외행성/신살/
    // 12운성)는 deriveLifetimeFlow 가 모든 단계에 대해 이미 만들어 넘긴다. 예전엔
    // phase.current 단계만 펼치고 나머지를 버려, 프리미엄의 "인생 전체 흐름"(4단계
    // 풀 서사)이 사라졌었다(사용자 지적). 현재 단계는 now 플래그로만 강조.
    // body/bodyEn 양 언어 병행 — KO/EN 라인을 각각 모아 클라이언트가 토글로 고른다.
    const detail: DestinypalLifeStageDetail | null = {
      daeunText: phase.daeunLine,
      // body[0] = 서술 본문(narrative) — 운세 톤(headline)을 제외해 중복 없음
      // (감사 BUG-1). narrativeKo 가 없으면(구버전) textKo 폴백.
      body: [
        phase.narrativeKo ?? phase.textKo,
        ...(phase.relationLine ? [phase.relationLine] : []),
        ...(phase.twelveStageLine ? [phase.twelveStageLine] : []),
      ],
      bodyEn: [
        phase.narrativeEn ?? phase.textEn,
        ...(phase.relationLineEn ? [phase.relationLineEn] : []),
        ...(phase.twelveStageLineEn ? [phase.twelveStageLineEn] : []),
      ],
      outer: phase.milestoneLine
        ? [
            {
              label: phase.milestoneLineEn ?? phase.milestoneLine,
              date: '',
              body: phase.milestoneLine,
            },
          ]
        : [],
      shinsal: phase.shinsalLine
        ? {
            // title 은 generic 마커 — 렌더 단(tier)에서 kind 로 로케일 라벨을 고른다.
            title: '신살 활성',
            kind: 'shinsal',
            body: phase.shinsalLine,
            bodyEn: phase.shinsalLineEn,
          }
        : undefined,
    }
    return {
      id: band.id,
      name: band.ko,
      nameEn: band.en,
      ageFrom: parsed.ageFrom || band.ageFrom,
      ageTo: parsed.ageTo || band.ageTo,
      yearFrom: parsed.yearFrom || yearFrom,
      yearTo: parsed.yearTo || yearTo,
      now: phase.current,
      tone,
      toneEn,
      detail,
    }
  })
}

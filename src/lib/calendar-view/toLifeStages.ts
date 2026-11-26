/**
 * lifetimeFlow → 인생 흐름 `lifeStages[4]` 평탄화 adapter.
 *
 * lifetimeFlow.phases (deriveLifetimeFlow 결과) 는 한 phase 당:
 *   { label, ageRange, text, toneKo/toneEn, …, current }
 *
 * lifeStages 는:
 *   { id, name, nameEn, ageFrom, ageTo, yearFrom, yearTo, now, tone, toneEn }
 *
 * id 는 phases 의 라벨 순서 고정 매핑 (초년기→early, 청년기→youth, …). 인생 흐름 화면은
 * 지금 단계의 이름만 읽는다('Living your young adulthood'). 예전 LifetimeTier 의 펼침 상세
 * (대운 줄 · 관계 · 외행성 · 신살 · 12운성 문단)는 그 화면과 함께 빠졌다 — 상담사는
 * NatalContext 를 읽는다.
 */

import type { LifetimeFlow, LifePhase } from '@/lib/calendar-engine/derivers/lifetimeFlow'

export interface DestinypalLifeStage {
  id: 'early' | 'youth' | 'middle' | 'late'
  name: string // 초년기 / 청년기 / 중년기 / 장년기
  /** 영문 단계명 — 'Early years' 등. */
  nameEn: string
  ageFrom: number
  ageTo: number
  yearFrom: number
  yearTo: number
  now: boolean
  tone: string // "편재 — 현실 성취의 무대"
  /** 영문 톤. 비면 tone 폴백. */
  toneEn: string
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
 * lifetimeFlow.phases → lifeStages[4].
 *
 * lifetimeFlow.phases 가 4개 정확히 들어오면 그대로 매핑. 부족하면 LABEL_FALLBACK
 * 으로 빈 단계 채워 항상 4개 보장.
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
      }
    }
    const parsed = parseAgeRange(phase.ageRange)
    // 헤드라인 톤 = 운세 톤(평이). lifetimeFlow 가 분리 baked 한 toneKo/toneEn 을
    // 직접 쓴다. 옛 deriveToneFromText(textKo 역파싱)는 첫 본문 문장을 톤으로
    // 오추출하고 em-dash 절을 잘라먹어(감사 BUG-1/BUG-2) 폐기. 구버전 데이터
    // 호환을 위해 새 필드가 없을 때만 폴백.
    const tone = phase.toneKo ?? deriveToneFromText(phase.textKo)
    const toneEn = phase.toneEn ?? deriveToneFromText(phase.textEn)
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
    }
  })
}

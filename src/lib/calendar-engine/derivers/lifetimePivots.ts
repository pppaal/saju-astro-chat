import {
  buildLifecycleTiming,
  type LifecycleMilestoneOverride,
} from '@/lib/calendar-engine/lifecycle/astroLifecycle'
import type { NatalContext } from '../context/types'
import { currentManAge } from '@/lib/datetime/currentAge'
import { STEMS } from '@/lib/saju/constants'
import { getSibseong } from '@/lib/saju/core/sibsin'

/**
 * 십신(十神) → 대운 한 줄 의미(ko/en). 점성 마일스톤이 meaning 을 들고 오듯,
 * 대운 전환점도 그 10년의 십신을 *쉬운말 한 줄*로 풀어 빈 라벨이 안 나오게 한다.
 * 결정론적 정적 사전 — astrology 를 지어내지 않고 십신 의미만 다시 말한다.
 */
const DAEUN_SIBSIN_MEANING: Record<string, { ko: string; en: string }> = {
  비견: {
    ko: '비견 대운이 열려요 — 내 힘으로 홀로서기 하는 10년',
    en: 'Friend (Bijian) decade opens — a decade of standing on your own',
  },
  겁재: {
    ko: '겁재 대운이 열려요 — 경쟁과 협력이 같이 오는 10년',
    en: 'Rob-Wealth (Geopjae) decade opens — a decade of rivalry and partnership',
  },
  식신: {
    ko: '식신 대운이 열려요 — 꾸준히 만들고 표현하는 10년',
    en: 'Eating-God (Siksin) decade opens — a decade of steady creating and expression',
  },
  상관: {
    ko: '상관 대운이 열려요 — 재능이 톡톡 튀는 10년',
    en: 'Hurting-Officer (Sanggwan) decade opens — a decade of standout talent',
  },
  편재: {
    ko: '편재 대운이 열려요 — 활동적으로 기회·돈을 잡는 10년',
    en: 'Indirect-Wealth (Pyeonjae) decade opens — a decade of active opportunity and money',
  },
  정재: {
    ko: '정재 대운이 열려요 — 차근차근 쌓는 안정의 10년',
    en: 'Direct-Wealth (Jeongjae) decade opens — a decade of steady building',
  },
  편관: {
    ko: '편관 대운이 열려요 — 강하게 밀어붙이는 도전의 10년',
    en: 'Indirect-Officer (Pyeongwan) decade opens — a decade of challenge and pressure',
  },
  정관: {
    ko: '정관 대운이 열려요 — 자리·책임이 단단해지는 10년',
    en: 'Direct-Officer (Jeonggwan) decade opens — a decade of duty and standing',
  },
  편인: {
    ko: '편인 대운이 열려요 — 독자적으로 배우고 사유하는 10년',
    en: 'Indirect-Resource (Pyeonin) decade opens — a decade of independent study and depth',
  },
  정인: {
    ko: '정인 대운이 열려요 — 배움과 받쳐주는 도움이 드는 10년',
    en: 'Direct-Resource (Jeongin) decade opens — a decade of learning and support',
  },
}

/**
 * 십신을 못 푸는 대운의 평이 폴백 — novice 표면 제목이 raw 干支 라벨이 되지
 * 않도록 하는 최후의 의미 한 줄. (干支 원명은 hover tag 로만 보존된다.)
 */
const GENERIC_DAEUN_MEANING = {
  ko: '새로운 대운이 열려요 — 10년 흐름의 결이 바뀌는 시기',
  en: 'A new luck cycle opens — the grain of the next decade shifts',
}

/**
 * 대운 천간(干支의 천간) → 일간 기준 십신 한 줄 의미. 못 푸는 글자/십신은
 * undefined 반환(라벨만 남고 폴백) — 빈 문자열을 억지로 채우지 않는다.
 */
function daeunMeaning(
  dayMaster: NatalContext['saju']['dayMaster'],
  stem: string
): { ko: string; en: string } | undefined {
  const stemInfo = STEMS.find((s) => s.name === stem)
  if (!stemInfo) return undefined
  // dayMaster 가 element/yin_yang 을 안 들고 와도(최소 fixture) name 으로 보강.
  const dm =
    dayMaster?.element && dayMaster?.yin_yang
      ? dayMaster
      : STEMS.find((s) => s.name === dayMaster?.name)
  if (!dm) return undefined
  const sibsin = getSibseong(dm, stemInfo)
  return DAEUN_SIBSIN_MEANING[sibsin]
}

/**
 * 인생 분기점(lifetime pivots) 디라이버 — 월 단위 convergence 와 달리 "인생 스케일"
 * 의 큰 시기를 뽑는다.
 *
 * 두 출처를 합친다:
 *  - 점성 라이프사이클 마일스톤(토성 리턴 ~29, 목성 회귀 12·24·36…, 천왕성
 *    대립 ~42, 카이런 리턴 ~50 등) — buildLifecycleTiming
 *  - 사주 대운(大運) 전환점 — natal.saju.daeun
 *
 * 둘이 ±2년 안에 겹치면 한 분기점으로 병합하고 bothSystems 로 표시 — 점성·사주가
 * 같은 시기를 가리키는 "진짜 큰 전환"(예: 28세 대운 + 29세 토성 리턴).
 */

const MERGE_YEARS = 2

export interface LifePivot {
  age: number
  year: number
  /** 라벨 — 한국어(고정). 표시 로케일은 클라이언트가 label/labelEn 중 고른다. */
  label: string
  /** 라벨 영문(고정) — 클라이언트 언어 토글이 서버 baked 언어에 묶이지 않게 병행. */
  labelEn: string
  astro?: string // 점성 마일스톤 이름(KO — kind 판별·내부용)
  saju?: string // 대운 전환 이름(KO)
  meaning?: string // 점성 마일스톤 한 줄 의미(KO)
  /** 한 줄 의미 영문 — 미지정 시 클라이언트가 meaning 으로 폴백. */
  meaningEn?: string
  bothSystems: boolean // 점성·사주가 같은 시기 (진짜 큰 전환)
  phase: 'past' | 'current' | 'upcoming'
}

export interface LifetimePivots {
  pivots: LifePivot[]
}

export function deriveLifetimePivots(
  natal: NatalContext,
  /**
   * Deprecated for label language — each pivot now carries BOTH ko(`label`)
   * and en(`labelEn`) so the client toggle isn't bound to the server's render
   * language. Kept for signature/positional compatibility.
   */
  _lang: 'ko' | 'en' = 'ko',
  /**
   * Optional — calculateOuterPlanetMilestones 결과를 그대로 넘기면 토성/목성/
   * 천왕성 등 외행성 마일스톤 연도가 실제 transit 기반으로 교체된다. 미지정
   * 시 옛 평균 나이대 테이블 그대로(backward compat).
   */
  astroMilestoneOverrides?: readonly LifecycleMilestoneOverride[],
  /**
   * "지금" 주입점 — currentAge(phase past/current/upcoming 기준)와
   * buildLifecycleTiming 의 기준 연도를 결정한다. 기본값은 호출 시점이라
   * 프로덕션 동작은 그대로, 테스트는 고정해 결정론적으로 검증한다.
   */
  now: Date = new Date()
): LifetimePivots {
  const birthYear = natal.input?.year
  if (!birthYear) return { pivots: [] }
  // 만 나이 — 출생지 시간대 + 생일 통과 여부 반영 (옛 회귀: UTC year 만 빼서
  // 자정 경계 사용자가 화면마다 ±1 보였음).
  const currentAge = currentManAge({
    birthYear,
    birthMonth: natal.input.month,
    birthDate: natal.input.date,
    birthTimeZone: natal.input.timeZone,
    now,
  })
  const phaseOf = (age: number): LifePivot['phase'] =>
    age < currentAge - MERGE_YEARS
      ? 'past'
      : age > currentAge + MERGE_YEARS
        ? 'upcoming'
        : 'current'

  // 점성 라이프사이클 마일스톤 (출생~90세) — 이름 있는 핵심 전환들, 절대 누락 금지.
  // ko/en 두 번 산출해 병행 baked(같은 TABLE 순서라 인덱스로 1:1 zip).
  const astroKoEvents = buildLifecycleTiming(
    birthYear,
    birthYear + 90,
    true,
    astroMilestoneOverrides,
    now
  ).events
  const astroEnEvents = buildLifecycleTiming(
    birthYear,
    birthYear + 90,
    false,
    astroMilestoneOverrides,
    now
  ).events
  const astroEvents = astroKoEvents.map((e, i) => ({
    age: e.startYear - birthYear,
    year: e.startYear,
    label: e.label, // ko
    labelEn: astroEnEvents[i]?.label ?? e.label,
    meaning: e.meaning, // ko
    meaningEn: astroEnEvents[i]?.meaning,
  }))

  // 사주 대운 전환점 — ko/en 라벨 + 십신 한 줄 의미 모두 baked.
  const dayMaster = natal.saju?.dayMaster
  const daeun = (natal.saju?.daeun ?? []).map((d) => {
    const m = dayMaster ? daeunMeaning(dayMaster, d.stem) : undefined
    return {
      age: d.startAge,
      year: d.startYear,
      label: `${d.stem}${d.branch} 대운`,
      labelEn: `${d.stem}${d.branch} luck cycle`,
      // 십신을 못 풀어도(최소 fixture·미상 글자) novice 표면 제목이 raw 干支 라벨로
      // 새지 않도록 평이 폴백을 보장한다 — 클라이언트는 meaning 이 비면 label(干支)을
      // 제목으로 쓰기 때문(LifetimeTier mMeaning). 干支 원명은 hover tag 로만 남는다.
      meaning: m?.ko ?? GENERIC_DAEUN_MEANING.ko,
      meaningEn: m?.en ?? GENERIC_DAEUN_MEANING.en,
    }
  })

  // astro 이벤트를 앵커로 두고 ±MERGE_YEARS 안의 가장 가까운 대운을 1:1로 붙인다.
  // (astro 끼리는 병합하지 않으므로 토성 리턴 같은 핵심 전환이 절대 삼켜지지 않음)
  const usedDaeun = new Set<number>()
  const pivots: LifePivot[] = astroEvents.map((a) => {
    let bestIdx = -1
    let bestGap = MERGE_YEARS + 1
    daeun.forEach((d, i) => {
      if (usedDaeun.has(i)) return
      const gap = Math.abs(d.age - a.age)
      if (gap <= MERGE_YEARS && gap < bestGap) {
        bestGap = gap
        bestIdx = i
      }
    })
    const matched = bestIdx >= 0 ? daeun[bestIdx] : undefined
    if (matched) usedDaeun.add(bestIdx)
    return {
      age: a.age,
      year: a.year,
      label: a.label,
      labelEn: a.labelEn,
      astro: a.label,
      saju: matched?.label,
      meaning: a.meaning,
      meaningEn: a.meaningEn,
      bothSystems: Boolean(matched),
      phase: phaseOf(a.age),
    }
  })

  // 짝 못 찾은 대운 — 그 자체로 분기점.
  // 단, 아동기(만 16세 미만) 대운 개시는 "인생의 큰 마디"로 싣지 않는다 — 의미
  // 문구가 전부 성인 기준("도전의 10년", "홀로서기")이라 1·2세 유아에게 붙으면
  // 난센스가 된다(감사 BLOCKER). 짝지어진 점성 마일스톤(예: 11세 목성 회귀)은
  // 나이에 맞는 별도 문구라 그대로 둔다.
  const DAEUN_MILESTONE_MIN_AGE = 16
  daeun.forEach((d, i) => {
    if (usedDaeun.has(i)) return
    if (d.age < DAEUN_MILESTONE_MIN_AGE) return
    pivots.push({
      age: d.age,
      year: d.year,
      label: d.label,
      labelEn: d.labelEn,
      saju: d.label,
      meaning: d.meaning, // 십신 한 줄 의미 — 빈 라벨 방지
      meaningEn: d.meaningEn,
      bothSystems: false,
      phase: phaseOf(d.age),
    })
  })

  pivots.sort((a, b) => a.age - b.age)
  return { pivots }
}

import {
  buildLifecycleTiming,
  type LifecycleMilestoneOverride,
} from '@/lib/calendar-engine/lifecycle/astroLifecycle'
import type { NatalContext } from '../context/types'
import { currentManAge } from '@/lib/datetime/currentAge'

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
  label: string
  astro?: string // 점성 마일스톤 이름
  saju?: string // 대운 전환 이름
  meaning?: string // 점성 마일스톤 한 줄 의미
  bothSystems: boolean // 점성·사주가 같은 시기 (진짜 큰 전환)
  phase: 'past' | 'current' | 'upcoming'
}

export interface LifetimePivots {
  pivots: LifePivot[]
}

export function deriveLifetimePivots(
  natal: NatalContext,
  lang: 'ko' | 'en' = 'ko',
  /**
   * Optional — calculateOuterPlanetMilestones 결과를 그대로 넘기면 토성/목성/
   * 천왕성 등 외행성 마일스톤 연도가 실제 transit 기반으로 교체된다. 미지정
   * 시 옛 평균 나이대 테이블 그대로(backward compat).
   */
  astroMilestoneOverrides?: readonly LifecycleMilestoneOverride[]
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
  })
  const isKo = lang === 'ko'

  const phaseOf = (age: number): LifePivot['phase'] =>
    age < currentAge - MERGE_YEARS
      ? 'past'
      : age > currentAge + MERGE_YEARS
        ? 'upcoming'
        : 'current'

  // 점성 라이프사이클 마일스톤 (출생~90세) — 이름 있는 핵심 전환들, 절대 누락 금지.
  const astroEvents = buildLifecycleTiming(
    birthYear,
    birthYear + 90,
    isKo,
    astroMilestoneOverrides
  ).events.map((e) => ({
    age: e.startYear - birthYear,
    year: e.startYear,
    label: e.label,
    meaning: e.meaning,
  }))

  // 사주 대운 전환점
  const daeun = (natal.saju?.daeun ?? []).map((d) => ({
    age: d.startAge,
    year: d.startYear,
    label: isKo ? `${d.stem}${d.branch} 대운` : `${d.stem}${d.branch} luck cycle`,
  }))

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
      astro: a.label,
      saju: matched?.label,
      meaning: a.meaning,
      bothSystems: Boolean(matched),
      phase: phaseOf(a.age),
    }
  })

  // 짝 못 찾은 대운 — 그 자체로 분기점
  daeun.forEach((d, i) => {
    if (usedDaeun.has(i)) return
    pivots.push({
      age: d.age,
      year: d.year,
      label: d.label,
      saju: d.label,
      bothSystems: false,
      phase: phaseOf(d.age),
    })
  })

  pivots.sort((a, b) => a.age - b.age)
  return { pivots }
}

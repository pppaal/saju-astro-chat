/* ============================================================
   assembleLifetime — /destiny(인생 흐름) 전용 경량 어셈블러.
   ───────────────────────────────────────────────────────────
   인생 티어는 연 cells 를 단 하나도 쓰지 않는다(감사: 의존성 표) —
   natal + lifeCurve(외행성 트랜짓 ~31회) + now 로 완결된다. 예전엔
   loadTierData('year')를 공유해 1년 풀빌드(~3s 계산, 캐시 행 ~39MB)를
   통째로 내고 산출물 대부분을 버렸다. 이 어셈블러는 그 경로를 끊는다:

     · lifeCurve + 실측 외행성 마일스톤(outerMilestones)
     · lifetimeFlow / lifetimePivots (동일 now 주입)
     · toLifetime (만 나이 SSOT)
     · user 요약 (assembleUserSummary — /calendar 와 공유)

   결과는 { topbar, user, lifetime } — /destiny 가 렌더하는 전부.
   비용: natal 캐시 히트 후 ~100ms 수준이라 DB 캐시도 두지 않는다(감사:
   DB 왕복이 계산보다 비쌈).
   ============================================================ */

import { deriveLifetimeFlow } from '@/lib/calendar-engine/derivers/lifetimeFlow'
import { deriveLifetimePivots } from '@/lib/calendar-engine/derivers/lifetimePivots'
import { buildLifeCurve, computeTransitAstroSeries } from '@/lib/calendar-engine/derivers/lifeCurve'
import { calculateOuterPlanetMilestones } from '@/lib/calendar-engine/lifecycle/outerMilestones'
import type { LifecycleMilestoneOverride } from '@/lib/calendar-engine/lifecycle/astroLifecycle'
import { currentManAge } from '@/lib/datetime/currentAge'
import { toLifetime } from '@/components/calendar/adapters'
import { assembleUserSummary, type AssembledUser } from './assembleUser'

import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { DestinyLifetime } from '@/types/calendar'

export interface AssembleLifetimeInput {
  natal: NatalContext
  lang: 'ko' | 'en'
  birthYear: number
  targetYear: number
  sex: '남' | '여'
  birthDisplay: string
  whoBirthLine: string
  place: string
  /** "지금" 주입점 — 미지정 시 호출 시점. 테스트는 고정해 결정론 검증. */
  now?: Date
}

export interface AssembledLifetime {
  topbar: { whoBirthLine: string; place: string; ilganHanja: string }
  user: AssembledUser
  lifetime: DestinyLifetime
}

export async function assembleLifetime(input: AssembleLifetimeInput): Promise<AssembledLifetime> {
  const { natal, lang, birthYear, targetYear, sex, birthDisplay, whoBirthLine, place } = input
  const now = input.now ?? new Date()

  // 인생 곡선 — 실 외행성 트랜짓 시계열(프로세스 메모로 재방문 무료). 실패해도
  // 곡선만 빠지고 나머지는 정상(assembleTiers 와 동일 폴백 규약).
  let lifeCurve: ReturnType<typeof buildLifeCurve> = null
  try {
    const astroSeries = await computeTransitAstroSeries(natal, { span: 90, step: 3 })
    lifeCurve = buildLifeCurve(natal, { now, span: 90, astroSeries })
  } catch {
    lifeCurve = null
  }

  // 외행성 마일스톤 실측(감사 A-3) — 실패 시 undefined → 평균 테이블 폴백.
  let milestoneOverrides: LifecycleMilestoneOverride[] | undefined
  try {
    milestoneOverrides = await calculateOuterPlanetMilestones(natal)
  } catch {
    milestoneOverrides = undefined
  }

  // 동일 now 주입 — "현재 단계"와 "현재 pivot"이 같은 날짜를 본다.
  const lifetimeFlow = deriveLifetimeFlow(natal, lang, milestoneOverrides, now, lifeCurve)
  const lifetimePivots = deriveLifetimePivots(natal, lang, milestoneOverrides, now)

  const user = assembleUserSummary(natal, {
    birthDisplay,
    place,
    sex,
    intro: lifetimeFlow?.intro,
  })

  // 만 나이 SSOT — 곡선 nowAge·lifePattern 시제·대운/ZR now 플래그(감사 B1).
  const manAge = currentManAge({
    birthYear,
    birthMonth: natal.input?.month,
    birthDate: natal.input?.date,
    birthTimeZone: natal.input?.timeZone,
    now,
  })

  const lifetime = toLifetime(natal, {
    birthYear,
    currentYear: targetYear,
    manAge,
    lifetimeFlow,
    lifetimePivots,
    lifeCurve: lifeCurve ?? undefined,
  })

  const ilganHanja = user.ilgan.hanja || '辛'
  return { topbar: { whoBirthLine, place, ilganHanja }, user, lifetime }
}

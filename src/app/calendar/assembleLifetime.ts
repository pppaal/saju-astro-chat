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
import { getYearPillarForDate } from '@/lib/saju/datePillars'
import { getSibsinKo } from '@/lib/saju/cycleRelations'
import { sibsinArea, sibsinAreaEn } from '@/lib/calendar-engine/derivers/plainLanguage'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'
import { translateSignalLabel } from '@/lib/calendar-engine/derivers/signalI18n'
import { crossKeys, stripCrossPair, PLANET_EN_FROM_KO } from './crossPair'

import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { CalendarCell } from '@/lib/calendar-engine/types'
import type { DestinyLifetime, DestinyThisYear, DestinyDecadeCross } from '@/types/calendar'

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
  /**
   * 오늘의 evidence 셀(getFocusDayCell) — 대운(decadal) 층 사주×점성 교차 원천.
   * 없으면 decadeCross 생략(연 셀은 여전히 빌드 안 함 — 이 1일 셀만이 유일한
   * 셀 의존이고, /calendar 와 캐시 공유라 정상 사용에선 추가 빌드가 없다).
   */
  focusDayCell?: CalendarCell | null
  /** 세운(올해 간지) 기준 날짜 — 미지정 시 now. 입춘 SSOT 로 세운 결정. */
  todayIso?: string
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

  // ⑥ 올해 한 줄(세운) — 연 셀 없이 입춘 SSOT 로. 캘린더로 내려보내는 연결 고리.
  lifetime.thisYear = buildThisYear(natal, input.todayIso, now)
  // ⑧ 이 10년의 사주×점성 교차 — 1일 evidence 셀의 decadal 층만(연 셀 불필요).
  lifetime.decadeCross = buildDecadeCross(input.focusDayCell ?? null)

  const ilganHanja = user.ilgan.hanja || '辛'
  return { topbar: { whoBirthLine, place, ilganHanja }, user, lifetime }
}

/** 세운(올해 간지) 한 줄 — getYearPillarForDate(입춘 SSOT) + 일간 기준 십신. */
function buildThisYear(
  natal: NatalContext,
  todayIso: string | undefined,
  now: Date
): DestinyThisYear {
  const ref = todayIso ? new Date(`${todayIso}T12:00:00.000Z`) : now
  const yp = getYearPillarForDate(ref)
  const dm =
    (natal.saju?.dayMaster as { name?: string } | undefined)?.name ??
    (natal.saju?.pillars as { day?: { heavenlyStem?: { name?: string } } } | undefined)?.day
      ?.heavenlyStem?.name ??
    ''
  const sibsin = dm ? getSibsinKo(dm, yp.stem) || '' : ''
  return {
    gz: `${yp.stem}${yp.branch}`,
    sibsin,
    area: sibsin ? sibsinArea(sibsin) : '',
    areaEn: sibsin ? sibsinAreaEn(sibsin) : '',
  }
}

/** 대운(decadal) 층 사주×점성 교차 — 페어 기준 중복 제거(가장 센 |polarity|). */
function buildDecadeCross(focusDayCell: CalendarCell | null): DestinyDecadeCross[] {
  if (!focusDayCell) return []
  const byPair = new Map<string, DestinyDecadeCross>()
  for (const s of focusDayCell.signals) {
    if (s.kind !== 'cross-activation' || s.layer !== 'decadal') continue
    // 상충 무력화(polarity 0)는 인생 스케일 신뢰 카피("두 체계가 같은 말을 할
    // 때만")와 어긋나므로 제외 — 방향이 있는 교차만 올린다.
    if (s.polarity === 0) continue
    const { sajuKo, astroKo } = crossKeys(s)
    if (!sajuKo || !astroKo) continue
    const key = `${sajuKo}|${astroKo}`
    const prev = byPair.get(key)
    if (prev && Math.abs(prev.polarity) >= Math.abs(s.polarity)) continue
    byPair.set(key, {
      saju: sajuKo,
      sajuEn: SIBSIN_EN[sajuKo] ?? translateSignalLabel(sajuKo, 'en'),
      astro: astroKo,
      astroEn: PLANET_EN_FROM_KO[astroKo] ?? astroKo,
      meaning: stripCrossPair(s.korean ?? ''),
      meaningEn: stripCrossPair(s.english ?? ''),
      polarity: s.polarity,
    })
  }
  return [...byPair.values()]
    .sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity))
    .slice(0, 4)
}

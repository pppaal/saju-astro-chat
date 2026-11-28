/* ============================================================
   assembleLifetime — /destiny(인생 흐름) 전용 경량 어셈블러.
   ───────────────────────────────────────────────────────────
   인생 티어는 연 cells 를 단 하나도 쓰지 않는다(감사: 의존성 표) —
   natal + lifeCurve(외행성 트랜짓 ~31회) + now 로 완결된다. 예전엔
   loadTierData('year')를 공유해 1년 풀빌드(~3s 계산, 캐시 행 ~39MB)를
   통째로 내고 산출물 대부분을 버렸다. 이 어셈블러는 그 경로를 끊는다:

     · lifeCurve + 실측 생애 마디(outerMilestones — 캘린더 라이프사이클 신호와 같은 순간)
     · lifetimeFlow / lifetimePivots (동일 now 주입)
     · toLifetime (만 나이 SSOT)
     · user 요약 (assembleUserSummary — /calendar 와 공유)

   v9.2 Life 데이터(A4) — 같은 natal 에서 LLM 없이:
     · crossCheck  축별 교차(리포트 buildCrossRows 그대로 — lib/report/lifeCrossCheck)
     · share       사주 타입(홈 카드 typeNameOf) · 인생 모양 · 화면 카드 기둥
     · nextLifeTurn 생애 마디 중 올해 다음 첫 항목
     · decadeCross 부모 구조(대운 천간/지지 · 생애 마디 · 본명 자리 · 품위 · 오늘 트랜짓)
   추가 천체력은 10년 겹침 행이 있을 때만 트랜짓 차트 1회(캐시 키 공유).

   결과는 { topbar, user, lifetime } — /destiny 가 렌더하는 전부.
   비용: natal 캐시 히트 후 ~100ms 수준이라 DB 캐시도 두지 않는다(감사:
   DB 왕복이 계산보다 비쌈).
   ============================================================ */

import { deriveLifetimeFlow } from '@/lib/calendar-engine/derivers/lifetimeFlow'
import { deriveLifetimePivots } from '@/lib/calendar-engine/derivers/lifetimePivots'
import { lifeCurveAstroSeries, lifeCurveFromSeries } from '@/lib/calendar-view/lifeShape'
import { calculateOuterPlanetMilestones } from '@/lib/calendar-engine/lifecycle/outerMilestones'
import { currentManAge } from '@/lib/datetime/currentAge'
import { toLifetime } from '@/lib/calendar-view'
import { assembleUserSummary, type AssembledUser } from './assembleUser'
import { calendarTimeZone, pillarsForLocalDate } from '@/lib/calendar-engine/periodPillars'
import { getDateComponentsInTimezone } from '@/lib/datetime/timezone'
import { getSibsinKo } from '@/lib/saju/cycleRelations'
import { ganjiToKorean, ganjiToRoman } from '@/lib/saju/ganjiKo'
import { sibsinArea, sibsinAreaEn } from '@/lib/calendar-engine/derivers/plainLanguage'
import { crossKeys, stripCrossPair, PLANET_EN_FROM_KO } from './crossPair'
import { crossSajuEn } from '@/lib/calendar-engine/derivers/signalI18n'
import { SIBSIN_HANJA } from '@/lib/saju/sibsinLabels'
import {
  lifecycleEventDef,
  type AstroLifecycleEventKind,
} from '@/lib/calendar-engine/lifecycle/astroLifecycle'
import { getCachedTransitChart } from '@/lib/calendar-engine/ephe-cache'
import { createCache } from '@/lib/calendar-engine/cache'
import { buildLifeCrossCheck, type ReportBirthRef } from '@/lib/report/lifeCrossCheck'
import { cardPillar, typeNameOf } from '@/lib/card/buildSajuCard'
import { logger } from '@/lib/logger'

import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { CalendarCell } from '@/lib/calendar-engine/types'
import type {
  DestinyChartPoint,
  DestinyLifetime,
  DestinyLifeShare,
  DestinyNextLifeTurn,
  DestinyThisYear,
  DestinyDecadeCross,
} from '@/types/calendar'

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
   * evidence 포함 빌드여야 한다 — 교차의 부모(parentIds)를 이 셀에서 찾아 게이트한다.
   * Promise 로 넘기면 위 ephemeris 병렬 구간과 겹쳐 돌아 대기시간이 숨는다.
   */
  focusDayCell?: CalendarCell | null | Promise<CalendarCell | null>
  /**
   * 세운(올해 간지) 기준 날짜 'YYYY-MM-DD' — 출생지 시간대의 민용 날짜(캘린더 셀 날짜).
   * 미지정 시 now 를 그 시간대로 읽은 날짜. 캘린더 셀과 같은 절입일 규칙으로 세운 결정.
   */
  todayIso?: string
  /** 성별 — 미지정이면 sex('여' → 'female'). 축별 교차의 배우자성 · 자식성 분기. */
  gender?: 'male' | 'female'
  /** 출생시각 미상(로더 가드 guard.timeUnknown) — 미지정이면 natal.saju.timeUnknown. */
  timeUnknown?: boolean
  /** 출생지 미상 — 좌표가 시간대 기준점. 상승궁 · 하우스를 말하지 않는다. */
  cityUnknown?: boolean
  /** 리포트 링크용 출생 정보(guard.birth + 실제 출생지). 없으면 natal 입력에서 만든다. */
  birth?: ReportBirthRef
}

export interface AssembledLifetime {
  topbar: {
    whoBirthLine: string
    place: string
    ilganHanja: string
    /** 날짜만 — '1997.3.21'(시각은 싣지 않는다 · 상단 칩용). */
    birthDate: string
    /** 출생 줄 — '1997.3.21 14:30', 시간 미상이면 날짜만(폴리오용). */
    birthLine: string
  }
  user: AssembledUser
  lifetime: DestinyLifetime
}

export async function assembleLifetime(input: AssembleLifetimeInput): Promise<AssembledLifetime> {
  const { natal, lang, birthYear, targetYear, sex, birthDisplay, whoBirthLine, place } = input
  const now = input.now ?? new Date()

  // 두 무거운 ephemeris 호출(트랜짓 시계열·외행성 마디)은 서로 독립이라 병렬로.
  //   예전엔 순차 await 라 콜드 스타트에서 (A+B) 만큼 다 기다렸다 → max(A,B) 로 단축.
  //   각자 실패해도 나머지는 정상(개별 try/catch, 기존 폴백 규약 유지).
  const [astroSeries, milestoneOverrides] = await Promise.all([
    // 인생 곡선용 실 외행성 트랜짓 시계열(프로세스 메모로 재방문 무료). 홈 사주 카드의
    // 인생 모양(lifeShapeFor)과 같은 파이프라인·같은 상수(calendar-view/lifeShape).
    lifeCurveAstroSeries(natal),
    // 생애 마디 실측(감사 A-3, G6) — 캘린더 라이프사이클 신호(→ 아래 10년 겹침의 부모)와
    // 같은 함수·같은 메모라 인생 마디와 겹침이 같은 순간을 읽는다. 실패 시 [] → 마디 없음
    // (평균 나이표로 채우지 않는다).
    calculateOuterPlanetMilestones(natal).catch(() => []),
  ])

  // 곡선 조립은 동기 — astroSeries 있을 때만. 실패(null)면 곡선만 빠지고 나머지 정상.
  const lifeCurve = lifeCurveFromSeries(natal, astroSeries, now)

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

  // ⑥ 올해 한 줄(세운) — 연 셀 없이, 캘린더 셀과 같은 날짜별 헬퍼로. 캘린더로 내려보내는 연결 고리.
  lifetime.thisYear = buildThisYear(natal, input.todayIso, now)
  // ⑧ 이 10년의 사주×점성 교차 — 1일 evidence 셀의 decadal 층 중 대운 부모와 10년 층
  //   천체 부모가 교차와 같은 부호인 것만(정직성 게이트, 계획 B3 #8 — 연 셀 불필요).
  //   생애 마디 부모(astro.lifecycle.*)의 창은 위 milestoneOverrides 의 통과 창 그대로라
  //   (astro-lifecycle 추출기, G6) 겹침 행과 마디 날짜가 서로 어긋나지 않는다.
  //   캘린더 엔진이 범위 불변이라(엔진 감사 X1·E9) 이 1일 셀의 교차는 같은 날 월 빌드
  //   셀의 교차와 같다 — /calendar 월·일 화면과 같은 사실을 말한다(rangeInvariance 테스트).
  //   Promise 로 왔으면 여기서 await — 이미 위 병렬 구간과 겹쳐 돌았으니 대개 즉시.
  const focusDayCell = input.focusDayCell ? await input.focusDayCell : null
  const todayIso = input.todayIso ?? localDateIso(natal, now)
  lifetime.decadeCross = await withDecadeTransit(
    buildDecadeCross(focusDayCell, natal),
    natal,
    todayIso
  )

  // ⑨ 다음 인생 마디 — 생애 마디 목록에서 올해 다음 첫 점성 마디(대운 경계가 아니다, FIX9b E7).
  //   대운만의 마디(kind 'daewoon')는 건너뛴다. ±2년 안의 대운을 흡수한 점성 마디는 점성 kind 라 남는다.
  const nextLifeTurn = pickNextLifeTurn(lifetime.milestones, targetYear)
  if (nextLifeTurn) lifetime.nextLifeTurn = nextLifeTurn

  // ⑩ 축별 교차 — 리포트와 같은 판정(읽는 시점 보강, 캐시 행 그대로).
  const gender = input.gender ?? (sex === '여' ? 'female' : 'male')
  const timeUnknown = input.timeUnknown ?? natal.saju.timeUnknown === true
  const cityUnknown = input.cityUnknown === true
  try {
    lifetime.crossCheck = buildLifeCrossCheck(natal, {
      gender,
      timeUnknown,
      cityUnknown,
      now,
      lang,
      birth: input.birth,
    })
  } catch (err) {
    logger.warn('[assembleLifetime] cross-check unavailable — section omitted', err)
  }

  // ⑪ 공유 블록 재료 — 사주 타입(홈 카드와 같은 규칙) · 인생 모양 · 화면 카드 기둥.
  const share = buildLifeShare(natal, lifetime)
  if (share) lifetime.share = share

  const ilganHanja = user.ilgan.hanja || '辛'
  return {
    topbar: {
      whoBirthLine,
      place,
      ilganHanja,
      birthDate: `${natal.input.year}.${natal.input.month}.${natal.input.date}`,
      birthLine: birthDisplay,
    },
    user,
    lifetime,
  }
}

/** now 를 출생지 시간대로 읽은 민용 날짜 'YYYY-MM-DD'. */
function localDateIso(natal: NatalContext, now: Date): string {
  const local = getDateComponentsInTimezone(now, calendarTimeZone(natal))
  return `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`
}

/**
 * 생애 마디 중 올해 다음 첫 인생 전환 → 다음 인생 마디. 없으면 undefined.
 * 대운만의 마디(kind 'daewoon' — 점성 마디와 ±2년 안에 겹치지 않은 대운 시작)는 인생 전환이 아니다
 * (FIX9b E7: '大運 경계는 다른 사건'). 대운을 흡수한 점성 마디는 점성 kind 를 지녀 그대로 남는다.
 */
export function pickNextLifeTurn(
  milestones: DestinyLifetime['milestones'],
  currentYear: number
): DestinyNextLifeTurn | undefined {
  const m = milestones.find((x) => x.year > currentYear && x.kind !== 'daewoon')
  if (!m) return undefined
  return {
    year: m.year,
    age: m.age,
    label: m.label,
    labelEn: m.labelEn ?? m.label,
    meaningCore: m.meaningCore ?? m.meaning ?? m.label,
    meaningCoreEn: m.meaningCoreEn ?? m.meaningEn ?? m.labelEn ?? m.label,
  }
}

/**
 * Life 공유 블록 — 사주 타입은 홈 사주 카드(buildSajuCard.typeNameOf)와 같은 입력 · 같은 규칙
 * (명식 십성 개수 · 월간 십신 · 일지 십신 · 일간). 인생 모양 = lifetime.lifePattern 이름.
 * 화면 카드 기둥은 연 · 월 · 일(시주 없음). 실패하면 undefined.
 */
function buildLifeShare(
  natal: NatalContext,
  lifetime: DestinyLifetime
): DestinyLifeShare | undefined {
  try {
    const P = natal.saju.pillars
    // 리포트 어댑터(natalToReportData.sibsinCount)와 같은 칸 — analyses.sibsin.count.
    const count = natal.saju.analyses?.sibsin?.count as unknown as
      | Record<string, number>
      | undefined
    const crossType = typeNameOf({
      sibsinCount: count,
      monthStemSibsin: P.month.heavenlyStem.sibsin,
      dayBranchSibsin: P.day.earthlyBranch.sibsin,
      dayStem: P.day.heavenlyStem.name,
    })
    const lp = lifetime.lifePattern
    return {
      crossType,
      lifeShape: lp ? { ko: lp.ko, en: lp.en ?? lp.ko } : null,
      screenPillars: [P.year, P.month, P.day].map((p) =>
        cardPillar({ stem: p.heavenlyStem.name, branch: p.earthlyBranch.name })
      ),
    }
  } catch (err) {
    logger.warn('[assembleLifetime] share block unavailable', err)
    return undefined
  }
}

/**
 * 세운(올해 간지) 한 줄 — 그 날짜의 세운 + 일간 기준 십신. 세운은 캘린더 셀·상담사와 같은
 * pillarsForLocalDate(출생지 시간대 민용 날짜 — 立春 이 든 그 현지 날이 새 세운)로 고른다
 * (재감사 TP-4 · G3). 예전엔 `${todayIso}T12:00Z` 순간을 立春 순간과 비교해, 立春 날에
 * 캘린더 셀과 세운이 갈릴 수 있었다.
 */
function buildThisYear(
  natal: NatalContext,
  todayIso: string | undefined,
  now: Date
): DestinyThisYear {
  const tz = calendarTimeZone(natal)
  let y: number, m: number, d: number
  if (todayIso) {
    ;[y, m, d] = todayIso.split('-').map(Number)
  } else {
    const local = getDateComponentsInTimezone(now, tz)
    ;[y, m, d] = [local.year, local.month, local.day]
  }
  const yp = pillarsForLocalDate(y, m, d, tz).year
  const dm =
    (natal.saju?.dayMaster as { name?: string } | undefined)?.name ??
    (natal.saju?.pillars as { day?: { heavenlyStem?: { name?: string } } } | undefined)?.day
      ?.heavenlyStem?.name ??
    ''
  const sibsin = dm ? getSibsinKo(dm, yp.stem) || '' : ''
  const gz = `${yp.stem}${yp.branch}`
  return {
    gz,
    // bare 한자(丙午) 대신 한글 읽기·로마자를 함께 — 카드의 "한자로 시작 금지" 원칙
    // + EN 사용자에게 읽히는 라벨(감사 G2).
    gzKr: ganjiToKorean(gz),
    gzEn: ganjiToRoman(yp.stem, yp.branch),
    sibsin,
    area: sibsin ? sibsinArea(sibsin) : '',
    areaEn: sibsin ? sibsinAreaEn(sibsin) : '',
  }
}

type CellSignal = CalendarCell['signals'][number]

/** 10년 겹침 행의 두 부모 신호 — 사주(대운 기둥) · 점성(10년 층 천체). */
interface DecadeParents {
  saju: CellSignal
  astro: CellSignal
}

/**
 * 10년 겹침 정직성 게이트(계획 B3 #8, 엔진 감사 X7) — 교차의 두 부모를 셀 안에서
 * evidence.detail.parentIds 로 찾아, 인생 스케일 카피("사주 대운과 긴 주기 천체 흐름이
 * 같은 방향을 가리킬 때만")가 사실일 때만 그 두 부모를 돌려준다(아니면 null):
 *  · 교차 layer 가 decadal 이고 polarity ≠ 0.
 *  · 사주 부모 = 대운 기둥 신호(module 'saju-pillar', layer 'decadal'). 세운·월운·일진·
 *    시진(hourly)·신살(daily) 부모는 10년 겹침이 아니다.
 *  · 점성 부모 = 10년 층(decadal) 활성 천체 — 행성시(planetary-hour)·시간 층 금지.
 *  · 두 부모 모두 교차와 *같은 비영 부호*. 한쪽이 0 이면 그 체계는 아무 말도 하지 않은
 *    것이라 "같은 방향"이 아니다(엔진 교리는 (±,0) 도 부호를 주지만 인생 카피는 더 엄격).
 * E11 뒤로 엔진은 decadal 교차를 두 부모가 모두 10년 층일 때만 만들고 부호도 동의할 때만
 * 주므로, 앞의 세 조건은 엔진 불변식의 방어선(assertion)이다. 부모를 셀에서 찾지 못하면
 * (evidence 가 비워진 셀 등) 근거를 확인할 수 없으니 올리지 않는다 — fail-closed.
 */
function decadeCrossParents(
  s: CellSignal,
  byId: ReadonlyMap<string, CellSignal>
): DecadeParents | null {
  if (s.kind !== 'cross-activation' || s.layer !== 'decadal') return null
  const sign = Math.sign(s.polarity)
  if (sign === 0) return null
  const ids = (s.evidence?.detail as { parentIds?: unknown } | undefined)?.parentIds
  if (!Array.isArray(ids) || ids.length !== 2) return null
  const saju = byId.get(String(ids[0]))
  const astro = byId.get(String(ids[1]))
  if (!saju || !astro) return null
  const sajuIsDaeun =
    saju.source === 'saju' && saju.layer === 'decadal' && saju.evidence?.module === 'saju-pillar'
  const astroIsDecadal =
    astro.source === 'astro' && astro.layer === 'decadal' && astro.kind !== 'planetary-hour'
  if (!sajuIsDaeun || !astroIsDecadal) return null
  if (Math.sign(saju.polarity) !== sign || Math.sign(astro.polarity) !== sign) return null
  return { saju, astro }
}

/** 대운 기둥 신호(saju-pillar decadal) → 천간/지지 어느 쪽 · 그 대운 간지. */
function daeunSourceOf(saju: CellSignal): DestinyDecadeCross['sajuSource'] {
  const detail = saju.evidence?.detail as { phase?: unknown } | undefined
  const part =
    detail?.phase === 'stem-half' || saju.id.includes('.daeun-stem.')
      ? 'stem'
      : detail?.phase === 'branch-half' || saju.id.includes('.daeun-branch.')
        ? 'branch'
        : null
  const gz = saju.evidence?.pillars?.[0]
  return part && gz ? { pillar: 'daeun', part, gz } : undefined
}

/** 점성 부모가 생애 마디면 그 이름(짧은 꼴 — ko 는 ' — ' 앞, en 은 라벨 그대로). */
function lifecycleEventOf(astro: CellSignal): DestinyDecadeCross['astroEvent'] {
  if (astro.kind !== 'lifecycle') return undefined
  const kind = (astro.evidence?.detail as { event?: unknown } | undefined)?.event
  if (typeof kind !== 'string') return undefined
  try {
    const def = lifecycleEventDef(kind as AstroLifecycleEventKind)
    return { ko: def.labelKo.split(' — ')[0], en: def.labelEn }
  } catch {
    return undefined
  }
}

/** 본명 차트에서 그 행성의 자리 — 행성 목록 다음 추가 천체(카이런 등). */
function natalPointOf(natal: NatalContext, planet: string): DestinyChartPoint | undefined {
  // 출생시각 미상이면 달은 정오 앵커 자리(하루 ±6°)라 도를 말하지 않는다.
  if (planet === 'Moon' && natal.saju.timeUnknown === true) return undefined
  const body =
    natal.astro.chart.planets.find((p) => p.name === planet) ??
    natal.astro.extraPoints?.find((p) => p.name === planet)
  if (!body?.sign || typeof body.degree !== 'number' || typeof body.minute !== 'number')
    return undefined
  return { sign: body.sign, deg: body.degree, min: body.minute }
}

/** 본명 품위 — 본궁 · 고양 · 손상 · 추락 중 해당하는 첫 칸(dignities SSOT). */
function natalDignityOf(natal: NatalContext, planet: string): DestinyDecadeCross['dignity'] {
  const t = natal.astro.dignities?.find((d) => d.planet === planet)?.tiers
  if (!t) return undefined
  if (t.domicile) return 'domicile'
  if (t.exaltation) return 'exaltation'
  if (t.detriment) return 'detriment'
  if (t.fall) return 'fall'
  return undefined
}

/**
 * 대운(decadal) 층 사주×점성 교차 — 정직성 게이트(decadeCrossParents) 통과분만,
 * 페어 기준 중복 제거(가장 센 |polarity|). 통과분이 없으면 빈 배열 — 화면은 빈 상태를 보인다
 * (오너 결정 13). natal 을 넘기면 행마다 부모 구조(대운 천간/지지 · 생애 마디 · 본명 자리 ·
 * 품위)를 싣는다 — 셀 안의 부모 신호와 본명 차트에서 읽을 뿐 다시 판정하지 않는다.
 */
export function buildDecadeCross(
  focusDayCell: CalendarCell | null,
  natal?: NatalContext
): DestinyDecadeCross[] {
  if (!focusDayCell) return []
  const byId = new Map(focusDayCell.signals.map((s) => [s.id, s]))
  const byPair = new Map<string, DestinyDecadeCross>()
  for (const s of focusDayCell.signals) {
    const parents = decadeCrossParents(s, byId)
    if (!parents) continue
    const { sajuKo, astroKo } = crossKeys(s)
    if (!sajuKo || !astroKo) continue
    const key = `${sajuKo}|${astroKo}`
    const prev = byPair.get(key)
    if (prev && Math.abs(prev.polarity) >= Math.abs(s.polarity)) continue
    const astroEn = PLANET_EN_FROM_KO[astroKo] ?? astroKo
    const row: DestinyDecadeCross = {
      saju: sajuKo,
      sajuEn: crossSajuEn(sajuKo),
      astro: astroKo,
      astroEn,
      meaning: stripCrossPair(s.korean ?? ''),
      meaningEn: stripCrossPair(s.english ?? ''),
      polarity: s.polarity,
    }
    if (natal) {
      const hanja = SIBSIN_HANJA[sajuKo]
      if (hanja) row.sajuHanja = hanja
      const source = daeunSourceOf(parents.saju)
      if (source) row.sajuSource = source
      const event = lifecycleEventOf(parents.astro)
      if (event) row.astroEvent = event
      const planet = s.crossParents?.planet ?? astroEn
      const point = natalPointOf(natal, planet)
      if (point) row.natal = point
      const dignity = natalDignityOf(natal, planet)
      if (dignity) row.dignity = dignity
    }
    byPair.set(key, row)
  }
  return [...byPair.values()]
    .sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity))
    .slice(0, 4)
}

/**
 * 10년 겹침 행에 오늘의 트랜짓 자리를 얹는다 — 주입된 now 의 출생지 날짜 현지 정오 차트
 * (getCachedTransitChart → calculateTransitChart; 트랜짓 추출기 · 캘린더 근거와 같은 키라 대개
 * 캐시 적중). 행이 없으면 천체력을 부르지 않는다. 실패하면 트랜짓 없이 그대로(fail-soft).
 */
async function withDecadeTransit(
  rows: DestinyDecadeCross[],
  natal: NatalContext,
  todayIso: string
): Promise<DestinyDecadeCross[]> {
  if (rows.length === 0) return rows
  try {
    const chart = await getCachedTransitChart({
      iso: `${todayIso}T12:00:00`,
      latitude: natal.input.latitude,
      longitude: natal.input.longitude,
      timeZone: natal.input.timeZone,
      inMemoryCache: createCache(),
    })
    return rows.map((r) => {
      const body = chart.planets.find((p) => p.name === r.astroEn)
      if (!body?.sign || typeof body.degree !== 'number' || typeof body.minute !== 'number')
        return r
      return { ...r, transit: { sign: body.sign, deg: body.degree, min: body.minute } }
    })
  } catch (err) {
    logger.warn('[assembleLifetime] transit position unavailable — overlap without transit', err)
    return rows
  }
}

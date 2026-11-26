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
import { crossKeys, crossSajuEn, stripCrossPair, PLANET_EN_FROM_KO } from './crossPair'

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
   * evidence 포함 빌드여야 한다 — 교차의 부모(parentIds)를 이 셀에서 찾아 게이트한다.
   * Promise 로 넘기면 위 ephemeris 병렬 구간과 겹쳐 돌아 대기시간이 숨는다.
   */
  focusDayCell?: CalendarCell | null | Promise<CalendarCell | null>
  /**
   * 세운(올해 간지) 기준 날짜 'YYYY-MM-DD' — 출생지 시간대의 민용 날짜(캘린더 셀 날짜).
   * 미지정 시 now 를 그 시간대로 읽은 날짜. 캘린더 셀과 같은 절입일 규칙으로 세운 결정.
   */
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
  lifetime.decadeCross = buildDecadeCross(focusDayCell)

  const ilganHanja = user.ilgan.hanja || '辛'
  return { topbar: { whoBirthLine, place, ilganHanja }, user, lifetime }
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

/**
 * 10년 겹침 정직성 게이트(계획 B3 #8, 엔진 감사 X7) — 교차의 두 부모를 셀 안에서
 * evidence.detail.parentIds 로 찾아, 인생 스케일 카피("사주 대운과 긴 주기 천체 흐름이
 * 같은 방향을 가리킬 때만")가 사실일 때만 통과시킨다:
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
function decadeCrossParentsAgree(s: CellSignal, byId: ReadonlyMap<string, CellSignal>): boolean {
  if (s.kind !== 'cross-activation' || s.layer !== 'decadal') return false
  const sign = Math.sign(s.polarity)
  if (sign === 0) return false
  const ids = (s.evidence?.detail as { parentIds?: unknown } | undefined)?.parentIds
  if (!Array.isArray(ids) || ids.length !== 2) return false
  const saju = byId.get(String(ids[0]))
  const astro = byId.get(String(ids[1]))
  if (!saju || !astro) return false
  const sajuIsDaeun =
    saju.source === 'saju' && saju.layer === 'decadal' && saju.evidence?.module === 'saju-pillar'
  const astroIsDecadal =
    astro.source === 'astro' && astro.layer === 'decadal' && astro.kind !== 'planetary-hour'
  if (!sajuIsDaeun || !astroIsDecadal) return false
  return Math.sign(saju.polarity) === sign && Math.sign(astro.polarity) === sign
}

/**
 * 대운(decadal) 층 사주×점성 교차 — 정직성 게이트(decadeCrossParentsAgree) 통과분만,
 * 페어 기준 중복 제거(가장 센 |polarity|). 통과분이 없으면 빈 배열 — 화면은 섹션을 숨긴다.
 */
export function buildDecadeCross(focusDayCell: CalendarCell | null): DestinyDecadeCross[] {
  if (!focusDayCell) return []
  const byId = new Map(focusDayCell.signals.map((s) => [s.id, s]))
  const byPair = new Map<string, DestinyDecadeCross>()
  for (const s of focusDayCell.signals) {
    if (!decadeCrossParentsAgree(s, byId)) continue
    const { sajuKo, astroKo } = crossKeys(s)
    if (!sajuKo || !astroKo) continue
    const key = `${sajuKo}|${astroKo}`
    const prev = byPair.get(key)
    if (prev && Math.abs(prev.polarity) >= Math.abs(s.polarity)) continue
    byPair.set(key, {
      saju: sajuKo,
      sajuEn: crossSajuEn(sajuKo),
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

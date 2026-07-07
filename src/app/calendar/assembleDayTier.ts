/* ============================================================
   assembleDayTier — 일(日) 티어 단독 어셈블러
   ───────────────────────────────────────────────────────────
   assembleTiers 의 day 어셈블 블록을 함수로 분리한 것. 두 소비자:
     · assembleTiers (/calendar 서버 렌더 — 오늘)
     · /api/calendar/day (월 그리드에서 고른 날짜로 일 티어 재빌드)
   같은 코드가 같은 하루를 만들므로, 월에서 고른 날과 줌인한 일 화면이
   구조적으로 어긋날 수 없다. (예전엔 일 티어가 '오늘'만 빌드돼, 다른
   날을 골라 줌인해도 오늘 내용이 보였다.)

   점수는 assembleTiers 와 동일하게 deriveLayeredScores(cells).daily 에서
   읽는다 — 월 그리드 색과 일 티어 점수가 한 척도. cells 는 그 달(또는
   그 해) 전체를 줘야 salience/점수 정규화가 월 그리드와 같은 모집단이 된다.
   ============================================================ */

import {
  deriveLayeredScores,
  type LayeredScores,
} from '@/lib/calendar-engine/derivers/layeredScore'
import { CALENDAR_BANDS } from '@/lib/calendar-engine/derivers/constants'
import { personSeed } from '@/lib/calendar-engine/derivers/personSeed'
import { translateSignalLabel } from '@/lib/calendar-engine/derivers/signalI18n'
import { isMinorAge, minorSafeText, sanitizeCrossEntry } from '@/lib/calendar-engine/minorSafe'
import { computeDayPillarIndices } from '@/lib/saju/dayPillar'
import { STEM_NAMES, BRANCH_NAMES } from '@/lib/saju/constants'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'
import { currentManAge } from '@/lib/datetime/currentAge'
import { toUser, toDay } from '@/components/calendar/adapters'
import { reconcileCellOneLine } from '@/components/calendar/adapters/toDay'
import { buildHourCrossings } from '@/components/calendar/adapters/toHourCrossings'
import { buildHourMoon } from '@/components/calendar/adapters/toHourMoon'
import { crossKeys, stripCrossPair, PLANET_EN_FROM_KO } from './crossPair'

import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { CalendarCell } from '@/lib/calendar-engine/types'
import type { DestinyDay } from '@/types/calendar'

const SIG_KIND_TO_CAT: Record<string, string> = {
  shinsal: 'saju/shinsal',
  hyeongchung: 'saju/hyeongchung',
  'pillar-sibsin': 'saju/pillar-sibsin',
  'tonggeun-shift': 'saju/tonggeun-shift',
  'saju-pattern': 'saju/saju-pattern',
  jijanggan: 'saju/jijanggan',
  'geokguk-status': 'saju/geokguk-status',
  gongmang: 'saju/gongmang',
  'applied-pattern': 'saju/applied-pattern',
  transit: 'astro/transit',
  eclipse: 'astro/eclipse',
  progression: 'astro/progression',
  'progressed-moon': 'astro/progressed-moon',
  'solar-return': 'astro/solar-return',
  'lunar-return': 'astro/lunar-return',
  profection: 'astro/profection',
  'zodiacal-releasing': 'astro/zodiacal-releasing',
  lifecycle: 'astro/lifecycle',
  electional: 'astro/electional',
  'moon-phase': 'astro/moon-phase',
  'void-of-course': 'astro/void-of-course',
  'fixed-star': 'astro/fixed-star',
  'arabic-part': 'astro/arabic-part',
  'house-transit': 'astro/house-transit',
  'angle-contact': 'astro/angle-contact',
  midpoint: 'astro/midpoint',
  asteroid: 'astro/asteroid',
  'solar-arc': 'astro/solar-arc',
  draconic: 'astro/draconic',
  harmonic: 'astro/harmonic',
  'cross-activation': 'cross/activation',
}

/**
 * 다가오는 '큰 날' — upcoming(대상일 다음날~7일, 일점수) 중 '좋은 날'(band 기준)의
 * 최고점을 골라 D-day 로 라벨한다. 재방문 유인용(오늘만 보고 이탈하지 않게 다음
 * 방문 이유 제공). 조건 미달이면 null. 순수 함수 — 테스트 가능하게 분리.
 */
export function pickNextBigDay(
  upcoming: ReadonlyArray<{ date: string; score: number }>,
  targetDayIso: string
): { date: string; dDay: number; score: number } | null {
  if (!upcoming.length) return null
  const best = upcoming.reduce((a, b) => (b.score > a.score ? b : a))
  // '좋은 날' 문턱은 SSOT(CALENDAR_BANDS.good)와 일치시킨다 — 예전엔 65 하드코딩이라
  // 그리드는 초록(≥60)인데 "다가오는 큰 날"에선 빠지는 60~64 사각지대가 있었다(감사).
  if (best.score < CALENDAR_BANDS.good) return null
  const d0 = Date.parse(`${targetDayIso}T00:00:00Z`)
  const d1 = Date.parse(`${best.date}T00:00:00Z`)
  if (Number.isNaN(d0) || Number.isNaN(d1)) return null
  const dDay = Math.round((d1 - d0) / 86_400_000)
  return dDay >= 1 ? { date: best.date, dDay, score: best.score } : null
}

export interface AssembleDayTierInput {
  natal: NatalContext
  /** 대상 달(또는 그 해) CalendarCell — 점수 정규화·추이선·다가오는 며칠의 모집단. */
  cells: CalendarCell[]
  lang: 'ko' | 'en'
  /** 'YYYY-MM-DD' — 빌드할 그 하루. */
  targetDayIso: string
  /** evidence 포함 그 하루 셀(getFocusDayCell). 없으면 cells 의 해당 일로 폴백. */
  focusDayCell?: CalendarCell | null
  /** "지금" 주입점 — 미성년 게이트의 만 나이 기준. 미지정 시 호출 시점. */
  now?: Date
  /**
   * 미리 계산한 층별 점수 — assembleTiers 가 같은 cells 로 이미 계산한 값을
   * 넘겨 이중 전수 스캔(셀×신호 base-rate + 월 12패스)을 없앤다.
   * 단독 호출(/api/calendar/day)은 생략 → 자체 계산.
   */
  layered?: LayeredScores
  /**
   * 다음 달 cells(선택) — 월말엔 "다가오는 7일"이 월 경계에서 잘려 다음 달 초의
   * 큰 날이 안 보이다가 1일에 갑자기 나타났다(감사 #13). 대상일+7일이 월을 넘으면
   * 호출부가 다음 달 cells(캐시 히트)을 줘서 이어 붙인다. 점수는 *그 달 모집단*
   * 기준 — 사용자가 그 달을 열었을 때 볼 점수와 동일.
   */
  nextMonthCells?: CalendarCell[]
}

export async function assembleDayTier(input: AssembleDayTierInput): Promise<DestinyDay> {
  const { natal, cells, lang, targetDayIso, focusDayCell, now } = input

  const monthPrefix = targetDayIso.slice(0, 7)
  const monthCells = cells.filter((c) => c.datetime.slice(0, 7) === monthPrefix)
  // cells 는 evidence 없이 캐시되므로, evidence 가 필요한 근거카드·교차·시진은
  // focusDayCell(1일 evidence 빌드)을 우선 사용. 없으면 cells 의 해당 일로 폴백.
  const yearDayCell = cells.find((c) => c.datetime.slice(0, 10) === targetDayIso) ?? cells[0]
  const dayCell = focusDayCell ?? yearDayCell
  // 시(時)별 달 정밀(12 시진 ephemeris)은 natal·targetDayIso 에만 의존하므로 여기서
  // 미리 발진해, 아래 어셈블 작업과 겹쳐 돈다. 끝의 day 객체에서 await.
  const hourMoonP = buildHourMoon(targetDayIso, natal)

  // 층별 점수 — 월 그리드와 같은 소스(deriveLayeredScores.daily), 같은 모집단.
  // assembleTiers 경유면 precomputed 를 공유(이중 계산 제거), 단독 호출이면 계산.
  const layered = input.layered ?? deriveLayeredScores(cells)

  // ─── iljin(일진) 60갑자 (KASI 절기 룩업) ───
  const [focusY, focusM, focusD] = targetDayIso.split('-').map(Number)
  const dayIdx = computeDayPillarIndices(focusY, focusM, focusD)
  const iljinStem = STEM_NAMES[dayIdx.stemIndex]
  const iljinBranch = BRANCH_NAMES[dayIdx.branchIndex]

  // ilgan·seed — assembleTiers 의 user 와 같은 원천(toUser → personSeed 동일 입력)
  // 이라 두 경로의 seed(문구 회전)가 항상 일치한다.
  const userBase = toUser(natal)
  const seed = personSeed([
    userBase.ilgan.hanja,
    userBase.ilgan.kr,
    userBase.yongsin.hanja,
    userBase.gyeokguk,
    userBase.gangyak,
  ])

  const dayAdapter = toDay({
    cell: dayCell,
    natal,
    iljinStem,
    iljinBranch,
    favorScore: layered.daily.get(dayCell.datetime.slice(0, 10))?.score,
    lang,
  })

  // ── 한 줄·톤의 단일 소스 — *월 모집단 셀*로 화해 ──
  // 점수가 layered.daily(월 모집단)에서 오듯, 한 줄·verdict 도 같은 월 셀에서
  // 파생시킨다. focusDayCell(1일 evidence 빌드)은 salience 정규화 모집단이 달라
  // reasonNet 이 미세하게 어긋날 수 있는데, 그러면 월 리드아웃(월 셀 기반)과 일
  // 화면의 문장·톤이 같은 날인데 갈린다. 월 셀이 있으면 그걸 권위로 쓴다
  // (evidence 는 여전히 focusDayCell 에서 — 근거카드·교차·시진은 그대로).
  const monthPopCell = cells.find((c) => c.datetime.slice(0, 10) === targetDayIso) ?? null
  const unified = monthPopCell
    ? reconcileCellOneLine(monthPopCell, layered.daily.get(targetDayIso)?.score)
    : null

  const advanced = natal.saju.analyses
  const statusResult = advanced?.geokguk?.statusResult
  const geokgukName = advanced?.geokguk?.primary ?? '미정'

  // ── 일진 cell.signals → DestinySignal[] 풀세트 projection ──
  // adapter 의 DestinypalDaySignal 은 id/weight/layer/source 를 버리는데 DayTier 의
  // signal stream + FixedStarRow + ArabicLotRow 정렬·필터에 모두 필요.
  type DSig = DestinyDay['allSignals'][number]
  const allDaySignals: DSig[] = dayCell.signals.map((s) => {
    const base = {
      id: s.id,
      cat: SIG_KIND_TO_CAT[s.kind] ?? `${s.source}/${s.kind}`,
      label: s.name,
      // 엔진이 EN 라벨을 별도 방출했으면(있을 때만) 보존 — DayTier 신호 스트림이
      // EN 로케일에서 s.english 우선 사용(없으면 localizeLabel 폴백, KO 유지).
      english: s.english,
      polarity: s.polarity,
      weight: s.weight,
      kind: s.kind,
      layer: s.layer,
    }
    if (s.source === 'astro') {
      const planets = s.evidence?.planets ?? []
      return {
        ...base,
        source: 'astro' as const,
        body: planets[0],
        aspect: s.evidence?.aspectType,
        target: planets[1] ? `본명 ${planets[1]}` : undefined,
      }
    }
    return { ...base, source: 'saju' as const }
  }) as DSig[]
  const dayTransits = allDaySignals.filter((s) => s.kind === 'transit') as DestinyDay['transits']
  const daySajuSignals = allDaySignals.filter(
    (s) => s.kind !== 'transit' && s.kind !== 'cross-activation'
  ) as DestinyDay['signals']
  const dayCrossSignals = allDaySignals.filter(
    (s) => s.kind === 'cross-activation'
  ) as DestinyDay['crossSignals']
  const dayAppliedPatterns: DestinyDay['appliedPatterns'] = dayCell.signals
    .filter((s) => s.kind === 'applied-pattern')
    .map((s) => ({
      id: s.id,
      name: s.name,
      korean:
        typeof s.evidence?.detail?.korean === 'string'
          ? (s.evidence.detail.korean as string)
          : s.name,
      polarity: s.polarity,
      weight: s.weight,
      activeAxes: Array.isArray(s.evidence?.detail?.activeAxes)
        ? (s.evidence!.detail!.activeAxes as string[])
        : [],
      rule:
        typeof s.evidence?.detail?.rule === 'string' ? (s.evidence!.detail!.rule as string) : '',
    }))
  // name("편관 × 화성")에서 파싱 — detail.sajuName/astroName 은 존재하지 않는 필드라
  // 양쪽이 늘 빈 ↔ 로 떴다. name 파싱 + korean/english 로 교정. 같은 페어가 여러
  // 층(daily/monthly…)에서 잡혀 중복되므로 페어 기준 1개(가장 센 것)만 남긴다.
  const dayCrossByPair = new Map<string, DestinyDay['crossActivations'][number]>()
  for (const s of dayCell.signals) {
    if (s.kind !== 'cross-activation') continue
    // 포커스일 셀은 evidence.detail 이 살아 있어 구조화 키를 직접 쓴다(견고).
    const { sajuKo, astroKo } = crossKeys(s)
    if (!sajuKo || !astroKo) continue
    const key = `${sajuKo}|${astroKo}`
    const prev = dayCrossByPair.get(key)
    if (prev && Math.abs(prev.polarity) >= Math.abs(s.polarity)) continue
    const ko = lang === 'ko'
    dayCrossByPair.set(key, {
      id: s.id,
      sajuSide: ko ? sajuKo : (SIBSIN_EN[sajuKo] ?? translateSignalLabel(sajuKo, 'en')),
      astroSide: ko ? astroKo : (PLANET_EN_FROM_KO[astroKo] ?? astroKo),
      sajuKo, // raw — 분야 라우팅이 로케일에 흔들리지 않게(EN 에선 영문이라 키워드 매칭 실패).
      astroKo,
      // 양쪽 로케일 보관 — DayTier 가 클라이언트 로케일로 고른다(토글 불일치 방지).
      meaning: stripCrossPair(s.korean ?? ''),
      meaningEn: stripCrossPair(s.english ?? ''),
      polarity: s.polarity,
      weight: s.weight,
      layer: s.layer,
    })
  }
  const dayCrossActivations: DestinyDay['crossActivations'] = [...dayCrossByPair.values()].sort(
    (a, b) => Math.abs(b.polarity) - Math.abs(a.polarity)
  )

  // ── 타이밍 컨텍스트 (이달 흐름 추이 + 다가오는 7일) ──
  // 이달 일별 점수(추이선) — monthCells 순서대로, layered.daily 의 정규화 점수.
  const dayMonthScores = monthCells.map((c) => {
    const iso = c.datetime.slice(0, 10)
    return {
      day: Number(iso.slice(8, 10)),
      score: Math.round(layered.daily.get(iso)?.score ?? 50),
      today: iso === targetDayIso,
    }
  })
  // 다가오는 7일 — 대상일 다음날부터. 월 경계를 넘으면 nextMonthCells 로 이어
  // 붙인다(그 달 모집단 점수 — 다음 달 화면과 동일 값).
  const cellByIso = new Map(cells.map((c) => [c.datetime.slice(0, 10), c]))
  const nextCellByIso = new Map(
    (input.nextMonthCells ?? []).map((c) => [c.datetime.slice(0, 10), c])
  )
  const nextLayered = input.nextMonthCells?.length
    ? deriveLayeredScores(input.nextMonthCells)
    : null
  const upcoming: Array<{ date: string; score: number }> = []
  for (let i = 1; i <= 7; i++) {
    const d = new Date(`${targetDayIso}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + i)
    const iso = d.toISOString().slice(0, 10)
    if (cellByIso.has(iso)) {
      upcoming.push({ date: iso, score: Math.round(layered.daily.get(iso)?.score ?? 50) })
    } else if (nextLayered && nextCellByIso.has(iso)) {
      upcoming.push({ date: iso, score: Math.round(nextLayered.daily.get(iso)?.score ?? 50) })
    }
  }
  // 다가오는 큰 날 — 앞으로 7일 중 가장 센 '좋은 날'. 있으면 "6월 19일 (D-3)" 처럼
  // 재방문 유인을 준다. 이미 계산된 upcoming(일점수)에서 뽑으므로 새 계산 없음.
  const nextBigDay = pickNextBigDay(upcoming, targetDayIso)

  const day: DestinyDay = {
    date: dayAdapter.date,
    dateKo: dayAdapter.dateKo,
    iljin: dayAdapter.iljin,
    iljinSibsin: dayAdapter.iljinSibsin,
    // 본명 일간 — 그날 십신의 기준점. 화면 맨 위 기준선에 노출.
    dayMaster: { hanja: userBase.ilgan.hanja, kr: userBase.ilgan.kr, en: userBase.ilgan.en },
    seed,
    score: dayAdapter.score,
    oneLine: unified?.oneLine ?? dayAdapter.oneLine,
    oneLineEn: unified?.oneLineEn ?? dayAdapter.oneLineEn,
    totalSignals: dayAdapter.totalSignals,
    signals: daySajuSignals,
    transits: dayTransits,
    crossSignals: dayCrossSignals,
    allSignals: allDaySignals,
    jijanggan: dayAdapter.jijanggan,
    geokgukStatus: {
      name: geokgukName,
      status: statusResult?.status ?? '반성반파',
      factors: statusResult?.factors ?? { positive: [], negative: [] },
      description: dayAdapter.geokgukStatus ?? '',
    },
    gongmang: {
      natalBranches: dayAdapter.gongmang.natalBranches,
      activeBranches: dayAdapter.gongmang.activeBranches,
      activeAxes: dayAdapter.gongmang.activeAxes,
      note: dayAdapter.gongmang.note,
    },
    appliedPatterns: dayAppliedPatterns,
    crossActivations: dayCrossActivations,
    shinsalActive: dayAdapter.shinsalActive,
    narrative: dayAdapter.narrative,
    topReasons: dayAdapter.topReasons,
    topReasonsEn: dayAdapter.topReasonsEn,
    cautions: dayAdapter.cautions,
    cautionsEn: dayAdapter.cautionsEn,
    evidenceLadder: dayAdapter.evidenceLadder,
    evidenceLadderEn: dayAdapter.evidenceLadderEn,
    // 출력 화해 verdict — 월 모집단 셀 기준(위 unified)이 권위. 빠뜨리면 DayTier
    // 가 중립 fallback 으로 떨어져 tense/bright 화해가 프로덕션에서 죽는다.
    dayTone: unified?.dayTone ?? dayAdapter.dayTone,
    twelveStageMatrix: dayAdapter.twelveStageMatrix,
    monthScores: dayMonthScores,
    upcoming,
    nextBigDay,
    hourCrossings: buildHourCrossings(dayCell, targetDayIso, natal.astro.location),
    // 시(時)별 달 정밀 — 그날 12 시진 달을 재계산해 달×본명 어스펙트 절정 시각.
    // (위에서 미리 발진한 promise 를 여기서 수확.)
    hourMoon: await hourMoonP,
  }

  // 미성년 안전(감사 C3) — cross/시간 서술의 성인 도메인(결혼·공직·투자·삼각관계
  // 등)을 연령 적합 표현으로 치환. 만 나이로 게이트 — 연-차가 아닌 생일 통과 반영.
  const manAge = currentManAge({
    birthYear: natal.input.year,
    birthMonth: natal.input?.month,
    birthDate: natal.input?.date,
    birthTimeZone: natal.input?.timeZone,
    now,
  })
  if (isMinorAge(manAge)) {
    const rows = (xs: unknown): Array<Record<string, unknown>> =>
      (xs as Array<Record<string, unknown>>) ?? []
    for (const c of rows(day.crossActivations)) sanitizeCrossEntry(c, 'meaning', 'meaningEn')
    for (const h of rows(day.hourCrossings)) {
      if (typeof h.narrative === 'string') h.narrative = minorSafeText(h.narrative, 'ko')
      if (typeof h.narrativeEn === 'string') h.narrativeEn = minorSafeText(h.narrativeEn, 'en')
    }
  }

  return day
}

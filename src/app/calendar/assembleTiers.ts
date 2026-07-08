/* ============================================================
   /calendar tier 어셈블러 (page.tsx · preview/page.tsx 공유)
   ───────────────────────────────────────────────────────────
   직전까지 page.tsx 와 preview/page.tsx 가 *입력 소스만* 다른 채(세션/현재날짜
   vs 고정 1995 본명) tier 어셈블 로직을 통째로 복붙하고 있었다. 주석에 "preview
   와 동일"이 10번 넘게 박혀 있었고 실제로 한쪽만 고쳐진 버그(gender 매핑·signals
   투영 누락 등) 흔적이 있었다. 단일 함수로 모아 drift 를 끝낸다.

   NatalContext + 그 달 cells + 표시용 입력을 받아 PreviewClient 가 받는
   { topbar, user, lifetime, month, day } 를 만든다. (10년·1년 티어는 제거됨.)
   ============================================================ */

import { deriveConvergence } from '@/lib/calendar-engine/derivers/convergence'
import { deriveLifetimeFlow } from '@/lib/calendar-engine/derivers/lifetimeFlow'
import { deriveLifetimePivots } from '@/lib/calendar-engine/derivers/lifetimePivots'
import { buildLifeCurve, computeTransitAstroSeries } from '@/lib/calendar-engine/derivers/lifeCurve'
import { calculateOuterPlanetMilestones } from '@/lib/calendar-engine/lifecycle/outerMilestones'
import type { LifecycleMilestoneOverride } from '@/lib/calendar-engine/lifecycle/astroLifecycle'
import { currentManAge } from '@/lib/datetime/currentAge'
import { isMinorAge, sanitizeCrossEntry } from '@/lib/calendar-engine/minorSafe'
import { deriveMonthSummary } from '@/lib/calendar-engine/derivers/monthSummary'
import { reconcileMonthTone } from '@/lib/calendar-engine/derivers/reconcile'
import { personSeed } from '@/lib/calendar-engine/derivers/personSeed'
import { deriveLayeredScores } from '@/lib/calendar-engine/derivers/layeredScore'
import { getMonthPillarForDate } from '@/lib/saju/datePillars'
import { getSibsinKo } from '@/lib/saju/cycleRelations'

import { toLifetime, toMonth } from '@/components/calendar/adapters'
import { assembleUserSummary } from './assembleUser'
import { reconcileCellOneLine } from '@/components/calendar/adapters/toDay'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'
import { translateSignalLabel } from '@/lib/calendar-engine/derivers/signalI18n'
import { assembleDayTier } from './assembleDayTier'
import { crossKeys, stripCrossPair, PLANET_EN_FROM_KO } from './crossPair'

import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { CalendarCell } from '@/lib/calendar-engine/types'
import type {
  DestinyUserSummary,
  DestinyMonth,
  DestinyCalendarCell,
  DestinyDay,
  DestinyLifetime,
} from '@/types/calendar'

export interface AssembleTiersInput {
  natal: NatalContext
  /** 그 해(targetYear) 전체 CalendarCell — buildCalendar(year, granularity:'day') 결과. */
  cells: CalendarCell[]
  lang: 'ko' | 'en'
  birthYear: number
  targetYear: number
  /** 1-12 */
  targetMonth: number
  /** 펼침 기준 일(day-of-month). 보통 '오늘'(또는 preview 의 고정 focus 일). */
  targetDay: number
  /** 'YYYY-MM-DD' — 일 tier focus 일. */
  targetDayIso: string
  sex: '남' | '여'
  /** toUser.birthDisplay 로 들어갈 표시 문자열. */
  birthDisplay: string
  /** topbar.whoBirthLine 로 들어갈 표시 문자열(보통 birthDisplay 와 동일). */
  whoBirthLine: string
  place: string
  /**
   * 포커스된 하루의 evidence 포함 셀(getFocusDayCell). 연 cells 는 evidence 를
   * 빼고 캐시하므로(블롭 경량화), day tier 의 근거카드·교차·시진은 이 셀에서 읽는다.
   * 없으면 연 cells 의 해당 일 셀로 폴백(evidence 없음 — 근거 일부 비어 보일 수 있다).
   */
  focusDayCell?: CalendarCell | null
  /**
   * "지금" 주입점 — lifetime pivot 의 현재 나이/phase(past·current·upcoming)
   * 기준. 미지정 시 호출 시점(new Date()). 프로덕션은 그대로, 테스트는 고정.
   */
  now?: Date
  /**
   * 빌드 범위 — 'month'(캘린더: 월/일만 표시)면 숨은 인생/10년/연 티어의
   * 무거운 인생 곡선(외행성 트랜짓 ephemeris ~31회 + 90년 CPU 합성)을
   * 건너뛴다. 티어 객체 자체는 여전히 조립(타입·/destiny 호환)하되 곡선만
   * 빠진다 — lifetimeFlow 는 곡선 없이도 동작(기존 ephemeris 실패 폴백 경로와
   * 동일)해 월 총평의 '타고난 결' intro 는 유지된다. 기본 'year'(전체 계산).
   */
  scope?: 'month' | 'year'
  /**
   * 다음 달 cells(선택) — 월말에 "다가오는 7일"이 월 경계에서 잘리지 않게
   * assembleDayTier 로 그대로 전달(감사 #13). loadTierData 가 월말(±7일)일 때만
   * 캐시에서 얹어 준다.
   */
  nextMonthCells?: CalendarCell[]
}

export interface AssembledTiers {
  topbar: { whoBirthLine: string; place: string; ilganHanja: string }
  user: DestinyUserSummary & { gyeokgukStatus?: string; rootStatus?: string }
  lifetime: DestinyLifetime
  month: DestinyMonth
  day: DestinyDay
}

/** 동일 문구 중복 제거(순서 보존). monthly-layer 사유는 그 달 매일 동일 문자열로
 *  떠서, 셀을 가로질러 모으면 같은 줄이 반복된다 — body 기준 1회만 남긴다. */
function dedupeByBody<T extends { body: string }>(rows: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of rows) {
    if (seen.has(r.body)) continue
    seen.add(r.body)
    out.push(r)
  }
  return out
}

export async function assembleTiers(args: AssembleTiersInput): Promise<AssembledTiers> {
  const {
    natal,
    cells,
    lang,
    birthYear: BIRTH_YEAR,
    targetYear: TARGET_YEAR,
    targetMonth: TARGET_MONTH,
    targetDay: TARGET_DAY,
    targetDayIso,
    sex,
    birthDisplay,
    whoBirthLine,
    place,
    focusDayCell,
    now,
  } = args

  // 층별 점수 — 일/시는 일진, 월은 월운, 년은 세운, 10년은 대운 신호로만.
  // 한 번만 계산해 아래 월/연 어댑터와 일 티어(assembleDayTier)가 공유한다 —
  // 예전엔 두 어셈블러가 같은 cells 전수 스캔을 각자 반복했다(감사).
  const layered = deriveLayeredScores(cells)

  // ─── 일(日) 티어 — 분리 어셈블러로 *미리 발진* ───────────────────────────
  // /api/calendar/day(월 그리드에서 고른 날짜)와 같은 코드 경로. 내부의
  // 시진 달 ephemeris(12회)가 아래 lifeCurve·어댑터 작업과 겹쳐 돌도록 여기서
  // 시작하고, 포커스 셀 톤 정합 직전에 await 한다.
  const dayP = assembleDayTier({
    natal,
    cells,
    lang,
    targetDayIso,
    focusDayCell,
    now,
    layered,
    nextMonthCells: args.nextMonthCells,
  })

  // ─── 인생 굴곡 곡선 (사주 다층 + 실 외행성 트랜짓) ────────────────────────
  // 외행성은 느려 step=3 샘플 + 보간이면 envelope 보존(ephemeris 호출 ~31회).
  // 실패해도 곡선만 빠지고 나머지 티어는 정상. lifetimeFlow(단계 톤)·대운 1년운이
  // 이 곡선을 valence 출처로 쓰므로 *먼저* 빌드한다.
  //
  // scope='month'(캘린더 — 인생/10년/연 티어 숨김)면 통째로 건너뛴다: 이 블록이
  // 캘린더 요청의 최대 낭비였다(감사 — 결과가 클라이언트에서 버려지는데 매 방문
  // ephemeris ~31회 + 90년 합성 CPU). 곡선 없는 경로는 ephemeris 실패 폴백과
  // 동일해 이미 프로덕션에서 검증된 분기다.
  let lifeCurve: ReturnType<typeof buildLifeCurve> = null
  let milestoneOverrides: LifecycleMilestoneOverride[] | undefined
  if (args.scope !== 'month') {
    try {
      const astroSeries = await computeTransitAstroSeries(natal, { span: 90, step: 3 })
      lifeCurve = buildLifeCurve(natal, { now, span: 90, astroSeries })
    } catch {
      lifeCurve = null
    }
    // 외행성 마일스톤 실측(감사 A-3) — 고정 나이표 대신 실제 회귀/각 연도.
    // 실패하면 undefined → buildLifecycleTiming 이 평균 테이블 폴백(종전 동작).
    try {
      milestoneOverrides = await calculateOuterPlanetMilestones(natal)
    } catch {
      milestoneOverrides = undefined
    }
  }

  // ─── lifetimeFlow / lifetimePivots derivers ─────────────────────────────
  // 두 deriver 에 동일한 now 를 주입 — "현재 단계"와 "현재 pivot"이 같은 날짜를
  // 가리키도록(예전엔 flow 가 now 미주입으로 서버 시계를 읽어 둘이 어긋났다).
  // 마일스톤 override 도 동일하게 양쪽에 — 단계 카드와 pivot 점이 같은 해를 본다.
  const lifetimeFlow = deriveLifetimeFlow(natal, lang, milestoneOverrides, now, lifeCurve)
  const lifetimePivots = deriveLifetimePivots(natal, lang, milestoneOverrides, now)

  // ─── month / day 슬라이스 ───────────────────────────────────────────────
  const monthPrefix = `${TARGET_YEAR}-${String(TARGET_MONTH).padStart(2, '0')}`
  const monthCells = cells.filter((c) => c.datetime.slice(0, 7) === monthPrefix)

  // ─── woolun(월운) 60갑자 (KASI 절기 룩업) ─────────────────────────────────
  // 월운 기준 인스턴트는 *UTC* 로 만든다. tz-less `new Date('YYYY-MM-15T00:00:00')`
  // 는 서버 로컬로 해석돼 절입(節入) 근처에서 서버 시간대별로 60갑자가 갈렸다
  // (Honolulu↔Seoul ~19h 차). 15일이라 실제 플립은 드물지만 결정성 위반이라 고정.
  // (extractor 경로 saju-pillar.ts 는 이미 UTC — 이 표시 경로만 회귀였다.)
  const woolunRef = getMonthPillarForDate(new Date(Date.UTC(TARGET_YEAR, TARGET_MONTH - 1, 15)))
  const woolunStem = woolunRef.stem
  const woolunBranch = woolunRef.branch

  // ─── adapter 호출 (5 tier prop 자동 어셈블) ──────────────────────────────
  // user 매핑은 assembleUser.ts 로 분리 — /destiny(assembleLifetime)와 공유.
  const user = assembleUserSummary(natal, {
    birthDisplay,
    place,
    sex,
    intro: lifetimeFlow?.intro,
  })
  // seed 계산 등에 쓰는 어댑터 원본 필드 일부는 user 로 충분하지만, ilgan 표기
  // 등 아래 로직이 참조하는 값은 전부 user 에 있다.

  // 개인 시드 — 본명 고정 값(일간·용신·격국·신강약)에서 한 번 산출. 템플릿 문구를
  // 사람마다 다르게 고르는 데 쓴다(month.seed·day.seed 로 전달). 날짜 무관.
  const seed = personSeed([
    user.ilgan.hanja,
    user.ilgan.kr,
    user.yongsin.hanja,
    user.gyeokguk,
    user.gangyak,
  ])

  // ── 만 나이(SSOT) — 대운 매칭·프로펙션·미성년 게이트·인생 티어 공용 단일 출처 ──
  // 대운 startAge 는 만 나이(daeunAge.ts)이고 currentManAge 는 생일 통과까지 반영한
  // 만 나이다. 예전엔 대운/프로펙션을 TARGET_YEAR-BIRTH_YEAR(생일 전이면 +1 과다)로
  // 골라, 만 나이를 쓰는 인생 티어와 한 대운/하우스 어긋날 수 있었다(감사). 한
  // 컨벤션(만 나이)으로 통일해 티어 간 "현재"를 일치시킨다.
  const manAge = currentManAge({
    birthYear: BIRTH_YEAR,
    birthMonth: natal.input?.month,
    birthDate: natal.input?.date,
    birthTimeZone: natal.input?.timeZone,
    now,
  })

  const lifetime = toLifetime(natal, {
    birthYear: BIRTH_YEAR,
    currentYear: TARGET_YEAR,
    // 곡선 nowAge·lifePattern 시제·대운/ZR now 플래그의 만 나이 SSOT(감사 B1) —
    // 예전엔 toLifetime 이 연차 나이를 자체 계산해 생일 전 사용자에게 "지금" 핀이
    // milestones(만 나이)보다 1살 앞섰다.
    manAge,
    lifetimeFlow,
    lifetimePivots,
    lifeCurve: lifeCurve ?? undefined,
  })
  // (10년 대운·1년 세운 티어 제거 — 대운은 인생 흐름이, 세운은 인생 흐름 한 줄+
  //  캘린더가 커버. sewoonNowPillar·decade/year 조립·yearScoreByYear 삭제.)

  // 월 narrative — 타고난 결(lifetimeFlow.intro) + 그 달 상위 topReasons.
  const monthNarrative: Array<{ tag: string; body: string }> = []
  if (lifetimeFlow?.intro) {
    monthNarrative.push({
      tag: lang === 'ko' ? '타고난 결' : 'Innate grain',
      body: lifetimeFlow.intro,
    })
  }
  // monthly-layer 사유는 그 달 매일 동일 문자열 → 셀을 가로질러 모으면 같은 줄이
  // 반복된다. body 기준 dedup 후 상위 4개만 (직전엔 dedup 없어 같은 줄 도배).
  const monthTopReasons = dedupeByBody(
    monthCells
      .flatMap((c) =>
        ((lang === 'en' ? c.topReasonsEn : c.topReasons) ?? []).map((r) => ({
          score: c.derivedScore,
          body: r,
        }))
      )
      .sort((a, b) => b.score - a.score)
  ).slice(0, 4)
  const monthGrainTag = lang === 'ko' ? '이 달의 결' : "This month's grain"
  for (const r of monthTopReasons) {
    monthNarrative.push({ tag: monthGrainTag, body: r.body })
  }
  const { month: monthAdapter, calendar } = toMonth({
    ym: monthPrefix,
    label: `${TARGET_YEAR}년 ${TARGET_MONTH}월`,
    cells: monthCells,
    woolunStem,
    woolunBranch,
    narrative: monthNarrative,
    dayScores: layered.daily,
    // 펼침 기준일 — 보통 '오늘'. 안 주면 최고점수일로 펼쳐진다.
    focusDay: TARGET_DAY,
  })
  // 이달의 큰 날 — convergence keyDays(윈도우+신뢰도).
  const monthKeyDays = deriveConvergence(monthCells, 5, lang).keyDays.map((k) => ({
    date: k.date.slice(5),
    meaning: k.meaning,
    tone: k.tone,
    astro: k.astro,
    saju: k.saju,
    bothSystems: k.bothSystems,
    window: k.window,
    confidence: k.confidence,
  }))
  // 월운 천간 십신 — 본명 일간 기준 상대 십신. MonthTier 의 '한 줄 총평' 리드 문장
  // ("이달은 '○○' 쪽으로 결이 기울어요") + 용어 태그(甲午 · 편재)가 이 값을 쓴다.
  // 이전엔 어디서도 할당하지 않아 항상 undefined → 리드 문장 누락 + 태그에 십신 빠짐.
  const woolunStemSibsin = getSibsinKo(user.ilgan.hanja, woolunStem) || undefined

  const month: DestinyMonth = {
    label: monthAdapter.label,
    ym: monthAdapter.ym,
    woolun: monthAdapter.woolun ?? { hanja: '—', kr: '—', en: '—' },
    woolunSibsin: woolunStemSibsin,
    woolunStemSibsin,
    cautionDays: monthAdapter.cautionDays,
    goodDays: monthAdapter.goodDays,
    bestDay: monthAdapter.bestDay ?? { date: '', score: 0 },
    avoidDays: monthAdapter.avoidDays,
    narrative: monthAdapter.narrative,
    keyDays: monthKeyDays,
    converge: monthAdapter.converge
      ? {
          date: monthAdapter.converge.date,
          score: monthAdapter.converge.score,
          astro: monthAdapter.converge.astro,
          saju: monthAdapter.converge.saju,
          bothSystems: monthAdapter.converge.bothSystems,
          meaning: monthAdapter.converge.meaning ?? '',
        }
      : {
          date: '',
          score: 0,
          astro: [],
          saju: [],
          bothSystems: false,
          meaning: '',
        },
    focusDay: monthAdapter.focusDay,
    calendar,
    seed,
    evidenceLadder: monthAdapter.evidenceLadder,
    evidenceLadderEn: monthAdapter.evidenceLadderEn,
  }

  // 이달 총평(deriveMonthSummary)은 여기서 만들지 않는다 — 포커스 셀 중립화
  // (아래 toDay 이후 블록)가 good/caution/avoid 버킷과 bestDay 크라운을 *변경*하므로,
  // 그 전에 생성하면 총평 문장이 지워진 최고일을 계속 추천하고 날수도 헤더와 1
  // 어긋난다(감사: 순서 버그). 중립화 직후에 생성한다.

  // 이 달의 사주×점성 교차 — monthly 층 cross-activation 페어를 모아 카드 원료로.
  // 같은 페어가 그 달 여러 윈도우로 잡혀 id 는 달라도 의미는 같으므로 *페어* 기준
  // 중복 제거(가장 센 |polarity| 보존), |polarity| 상위 6개.
  type MCross = NonNullable<DestinyMonth['crossActivations']>[number]
  const monthCrossByPair = new Map<string, MCross>()
  for (const c of monthCells) {
    for (const s of c.signals) {
      if (s.kind !== 'cross-activation' || s.layer !== 'monthly') continue
      // 구조화 detail 우선(연 셀은 비어 name 파싱으로 폴백).
      const { sajuKo, astroKo } = crossKeys(s)
      if (!sajuKo || !astroKo) continue
      const pairKey = `${sajuKo}|${astroKo}`
      const prev = monthCrossByPair.get(pairKey)
      if (prev && Math.abs(prev.polarity) >= Math.abs(s.polarity)) continue
      monthCrossByPair.set(pairKey, {
        saju: sajuKo,
        sajuEn: SIBSIN_EN[sajuKo] ?? translateSignalLabel(sajuKo, 'en'),
        astro: astroKo,
        astroEn: PLANET_EN_FROM_KO[astroKo] ?? astroKo,
        meaning: stripCrossPair(s.korean ?? ''),
        meaningEn: stripCrossPair(s.english ?? ''),
        polarity: s.polarity,
      })
    }
  }
  month.crossActivations = [...monthCrossByPair.values()]
    .sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity))
    .slice(0, 6)

  // ── 날짜별 "근거" — 그날 가장 센 사주×점성 교차의 *쉬운 뜻* 을 각 calendar 셀에.
  //    선택일 리드아웃이 topReasons(전문용어) 대신 이 plain meaning 을 쓴다.
  //    교차 meaning(s.korean)은 이미 novice용 plain 문장이라 용어 누수가 없다.
  //
  //    *그날 고유*(daily/hourly/instant 층) 교차를 우선한다 — monthly 층 교차는 그 달
  //    내내 모든 날 셀에 똑같이 깔려, 그게 제일 세면 매일 같은 근거가 떠 "월 전체
  //    근거처럼" 보였다(감사). 같은 날짜 안에서 day-specific 이 month-background 를
  //    항상 이기게 rank 에 큰 가산점을 주고, day-specific 이 없을 때만 background 로.
  const DAY_LAYERS = new Set(['daily', 'hourly', 'instant'])
  type DReason = NonNullable<DestinyCalendarCell['reason']>
  const reasonByDs = new Map<string, DReason>()
  for (const c of monthCells) {
    const ds = c.datetime.slice(5, 10) // 'MM-DD'
    let best: DReason | null = null
    let bestRank = -1
    for (const s of c.signals) {
      if (s.kind !== 'cross-activation') continue
      // 부호 충돌로 톤이 무력화된(polarity 0) 교차는 근거 슬롯에서 제외 — 층 가산점
      // (+1000) 때문에 유의미한 길/흉 교차를 밀어내고 "왜 이런 날"에 중립 문구가
      // 뜨던 문제(감사 #9). 그날 남는 교차가 없으면 근거 없이 두는 게 정직하다.
      if (s.polarity === 0) continue
      const { sajuKo, astroKo } = crossKeys(s)
      if (!sajuKo || !astroKo) continue
      const meaning = stripCrossPair(s.korean ?? '')
      if (!meaning) continue
      const impact = Math.abs(s.polarity) * (s.weight ?? 1)
      const rank = (DAY_LAYERS.has(s.layer) ? 1000 : 0) + impact
      if (rank <= bestRank) continue
      bestRank = rank
      best = {
        saju: sajuKo,
        sajuEn: SIBSIN_EN[sajuKo] ?? translateSignalLabel(sajuKo, 'en'),
        astro: astroKo,
        astroEn: PLANET_EN_FROM_KO[astroKo] ?? astroKo,
        meaning,
        meaningEn: stripCrossPair(s.english ?? ''),
        polarity: s.polarity,
      }
    }
    if (best) reasonByDs.set(ds, best)
  }
  for (const cell of month.calendar) {
    const r = reasonByDs.get(cell.ds)
    if (r) cell.reason = r
  }

  // ── 날짜별 "한 줄" — 일(日) 티어 oneLine 과 같은 소스(reconcileCellOneLine)를
  //    각 calendar 셀에 실어, 월 리드아웃 문장이 줌인한 일 화면 첫 줄로 그대로
  //    이어지게 한다("월은 예고편, 일은 본편"). 예전엔 두 화면이 다른 풀
  //    (toneMeaningFor vs ONE_LINE_POOL)·다른 톤 산식을 써서 같은 날의 문장이
  //    화면마다 달랐다(감사 잔여 불일치 #2).
  const oneLineByDs = new Map<
    string,
    { oneLine: string; oneLineEn: string; tone: 'positive' | 'mixed' | 'caution' }
  >()
  for (const c of monthCells) {
    const iso = c.datetime.slice(0, 10)
    const u = reconcileCellOneLine(c, layered.daily.get(iso)?.score)
    oneLineByDs.set(c.datetime.slice(5, 10), {
      oneLine: u.oneLine,
      oneLineEn: u.oneLineEn,
      tone: u.dayTone.tone,
    })
  }
  for (const cell of month.calendar) {
    const u = oneLineByDs.get(cell.ds)
    if (u) {
      cell.oneLine = u.oneLine
      cell.oneLineEn = u.oneLineEn
      cell.tone = u.tone
    }
  }

  // 일 티어 수확 — 맨 위에서 미리 발진해 둔 분리 어셈블러 결과.
  const day = await dayP

  // ── 포커스(오늘) 셀 톤 정합 ──
  // 월 grid 의 셀 색은 *원점수 밴드*(60/35)인데, 일 카드 헤드라인은 toDay 가 화해한
  // verdict(tense/bright)다. 밴드↔신호 톤이 어긋난 날(tense: 좋은밴드인데 흉신 우세 /
  // bright: 낮은밴드인데 살릴 구석)은 같은 날 월=초록"좋음" vs 일=평이 로 모순됐다.
  // 포커스일(양쪽에 동시에 보이는 유일한 날)만 화해와 어긋나는 밴드 바를 중립화해
  // (mark→'focus': 바 없음, 오늘 링만) 두 화면의 톤을 일치시킨다. 비포커스일은
  // 셀에 실린 화해 톤(cell.tone)이 리드아웃 태그·조언을 지배하므로(감사 #2 수정)
  // 밴드 바(색=점수)는 그대로 둬도 문장·라벨과 축이 갈리지 않는다.
  if (day.dayTone?.tense || day.dayTone?.bright) {
    const focusCell = month.calendar.find((c) => c.focus)
    if (
      focusCell &&
      focusCell.mark &&
      focusCell.mark !== 'focus' &&
      focusCell.mark !== 'converge'
    ) {
      const wasBest = focusCell.mark === 'best'
      focusCell.mark = 'focus'
      // 밴드 바를 중립화한 날은 good/caution/avoid 버킷에서도 빼야 한다 —
      // 안 그러면 헤더·총평의 카운트(goodN/cautionN/avoidN)가 그리드의 실제
      // 색 셀보다 1 많아진다(off-by-one). MM-DD 키로 세 버킷에서 제거.
      const focusDs = focusCell.ds
      month.cautionDays = month.cautionDays.filter((d) => d !== focusDs)
      month.goodDays = month.goodDays.filter((d) => d !== focusDs)
      month.avoidDays = month.avoidDays.filter((d) => d !== focusDs)
      // 오늘(포커스)이 이달 '최고의 날'인데 tense/bright 로 grid 바를 중립화(회색)
      // 했다면, month.bestDay 를 그대로 두면 안 된다 — MonthTier 가 회색 셀에
      // "최고의 날 ✦"·"그날 추진하세요"를 그려 그리드(회색)·일 티어(tense)와 모순된다
      // (감사). 크라운을 비우면 doDate 는 goodDays[0](실제 초록일)로 폴백하고
      // keyDates 에서도 빠진다.
      if (wasBest && month.bestDay?.date === focusDs) {
        month.bestDay = { date: '', score: 0 }
      }
    }
  }

  // 이달 총평 — 타이밍·톤·지배 테마를 이어지는 한 문단으로 합성(deriveMonthSummary).
  // *반드시* 위 포커스 셀 중립화 이후에 생성 — 중립화가 버킷·bestDay 를 바꾸므로
  // 먼저 만들면 총평이 지워진 최고일을 추천하고 날수도 헤더와 1 어긋난다(감사).
  // 양쪽 로케일 요약을 함께 만들어 보관 — 클라이언트 로케일 토글 시 서버언어로
  // 굳던 문제 해소. 정본 태그 '이달 총평', body=ko / bodyEn=en 를 MonthTier 가 고른다.
  const monthReasonsBy = (en: boolean): string[] =>
    dedupeByBody(
      monthCells
        .flatMap((c) =>
          ((en ? c.topReasonsEn : c.topReasons) ?? []).map((r) => ({
            score: c.derivedScore,
            body: r,
          }))
        )
        .sort((a, b) => b.score - a.score)
    )
      .slice(0, 4)
      .map((r) => r.body)

  // ── 월 verdict — 톤의 단일 권위. 중립화까지 끝난 *최종* 카운트로 1회 산출해
  //    month.verdict 에 부착하고, 총평(deriveMonthSummary)에도 같은 톤을 주입한다.
  //    히어로 칩(MonthTier)·총평 문단·공유카드가 전부 이 하나를 읽어 어긋날 수 없다.
  const monthVerdict = reconcileMonthTone({
    goodN: month.goodDays.length,
    cautionN: month.cautionDays.length,
    avoidN: month.avoidDays.length,
    totalN: monthCells.length,
  })
  month.verdict = monthVerdict

  const summaryCommon = {
    woolunKr: month.woolun?.kr && month.woolun.kr !== '—' ? month.woolun.kr : undefined,
    goodDays: month.goodDays.length,
    cautionDays: month.cautionDays.length,
    // 나쁜 날(<30)을 deriveMonthSummary 의 주의-측 톤·날수에 합산(감사: 예전엔
    // avoid 를 안 넘겨 나쁜 달이 'bright'로 뒤집히고 날수에서 avoid 가 증발했다).
    avoidDays: month.avoidDays.length,
    totalDays: monthCells.length,
    bestDay: month.bestDay?.date || undefined,
    // caution 이 하나도 없고 avoid 만 있는 달도 '조심할 날'을 한 곳은 짚도록 폴백.
    cautionDay: month.cautionDays[0] ?? month.avoidDays[0],
    // convergeDate 는 MM-DD 로 정규화 — bestDay/cautionDay 와 같은 포맷이어야
    // deriveMonthSummary 의 동일-날짜 중복 가드(!==)와 fmtDate 가 작동한다.
    // (현재 converge 는 미배선이라 '' 이지만, 배선 시 YYYY-MM-DD 가 그대로 오면
    // 가드가 영영 안 맞고 "2026월 7일"로 렌더되는 잠복 버그 — 미리 차단.)
    convergeDate: month.converge?.date
      ? month.converge.date.length > 5
        ? month.converge.date.slice(-5)
        : month.converge.date
      : undefined,
  }
  // bestDayReason(keyDays meaning)은 서버 lang 으로만 산출돼 있어 그 로케일 요약에만
  // 싣는다. 톤 게이트: 그 keyDay 의 수렴 톤이 negative 면 이유를 생략 — 총평의
  // 최고의 날 문장은 "추진해 보세요" 액션으로 닫히는데 부정 의미를 붙이면 한 문장
  // 안에서 자기모순("부딪힘 조심 — 추진해 보세요")이 된다(감사).
  const bestKeyDay = monthKeyDays.find((k) => k.date === month.bestDay?.date)
  const bestDayReason =
    bestKeyDay && bestKeyDay.tone !== 'negative' ? bestKeyDay.meaning : undefined
  const summaryKo = deriveMonthSummary({
    ...summaryCommon,
    topReasons: monthReasonsBy(false),
    bestDayReason: lang === 'ko' ? bestDayReason : undefined,
    monthTone: monthVerdict.tone,
    lang: 'ko',
    seed,
  })
  const summaryEn = deriveMonthSummary({
    ...summaryCommon,
    topReasons: monthReasonsBy(true),
    bestDayReason: lang === 'en' ? bestDayReason : undefined,
    monthTone: monthVerdict.tone,
    lang: 'en',
    seed,
  })
  if (summaryKo || summaryEn) {
    month.narrative = [{ tag: '이달 총평', body: summaryKo, bodyEn: summaryEn }, ...month.narrative]
  }

  const ilganHanja = user.ilgan.hanja || '辛'

  // 미성년 안전(감사 C3) — cross/시간 서술의 성인 도메인(결혼·공직·투자·삼각관계
  // 등)을 연령 적합 표현으로 치환. 만 나이(위에서 산출한 manAge)로 게이트 — 연-차가
  // 아닌 생일 통과 반영(C7 off-by-one 회피). day 쪽은 assembleDayTier 가 자체 처리.
  if (isMinorAge(manAge)) {
    const rows = (xs: unknown): Array<Record<string, unknown>> =>
      (xs as Array<Record<string, unknown>>) ?? []
    for (const c of rows(month.crossActivations)) sanitizeCrossEntry(c, 'meaning', 'meaningEn')
  }

  return {
    topbar: { whoBirthLine, place, ilganHanja },
    user,
    lifetime,
    month,
    day,
  }
}

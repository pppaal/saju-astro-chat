/* ============================================================
   /calendar tier 어셈블러 (page.tsx · preview/page.tsx 공유)
   ───────────────────────────────────────────────────────────
   직전까지 page.tsx 와 preview/page.tsx 가 *입력 소스만* 다른 채(세션/현재날짜
   vs 고정 1995 본명) tier 어셈블 로직을 통째로 복붙하고 있었다. 주석에 "preview
   와 동일"이 10번 넘게 박혀 있었고 실제로 한쪽만 고쳐진 버그(gender 매핑·signals
   투영 누락 등) 흔적이 있었다. 단일 함수로 모아 drift 를 끝낸다.

   NatalContext + 그 달 cells + 표시용 입력을 받아 CalendarClient 가 받는
   { topbar, user, month, day } 를 만든다. (10년·1년 티어는 제거됨. 인생 티어는
   /destiny 전용 assembleLifetime 이 만든다 — 캘린더는 숨은 인생 티어를 계산·전송
   하지 않는다.)
   ============================================================ */

import { deriveConvergence } from '@/lib/calendar-engine/derivers/convergence'
import { currentManAge } from '@/lib/datetime/currentAge'
import { isMinorAge, sanitizeCrossEntry } from '@/lib/calendar-engine/minorSafe'
import {
  deriveMonthSummary,
  monthThemeCandidates,
} from '@/lib/calendar-engine/derivers/monthSummary'
import { reconcileMonthTone } from '@/lib/calendar-engine/derivers/reconcile'
import { personSeed } from '@/lib/calendar-engine/derivers/personSeed'
import { deriveLayeredScores } from '@/lib/calendar-engine/derivers/layeredScore'
import { pickTryThis, toMMDD } from '@/lib/calendar-engine/derivers/tryThis'
import {
  calendarTimeZone,
  monthWindows,
  pillarsForLocalDate,
} from '@/lib/calendar-engine/periodPillars'
import { getSibsinKo } from '@/lib/saju/cycleRelations'

import { toMonth } from '@/lib/calendar-view'
import { toGanji } from '@/lib/calendar-view/shared'
import { assembleUserSummary } from './assembleUser'
import { reconcileCellOneLine } from '@/lib/calendar-view/toDay'
import { withReasonDetail, withTransitPositions } from '@/lib/calendar-view/astroDetail'
import { ladderDaeunRange } from '@/lib/calendar-engine/derivers/evidenceLadder'
import { assembleDayTier } from './assembleDayTier'
import {
  crossKeys,
  stripCrossPair,
  PLANET_EN_FROM_KO,
  pickDayReason,
  pickDayReasonSignal,
} from './crossPair'
import { crossSajuEn } from '@/lib/calendar-engine/derivers/signalI18n'

import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { CalendarCell } from '@/lib/calendar-engine/types'
import type { DestinyUserSummary, DestinyMonth, DestinyDay } from '@/types/calendar'

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
   * "지금" 주입점 — 만 나이(미성년 게이트)와 일 티어의 현재 기준. 미지정 시
   * 호출 시점(new Date()). 프로덕션은 그대로, 테스트는 고정.
   */
  now?: Date
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
  month: DestinyMonth
  day: DestinyDay
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
  // 시진 달 ephemeris(12회)가 아래 어댑터 작업과 겹쳐 돌도록 여기서
  // 시작하고, 월 셀 근거·한 줄을 다 실은 뒤 await 한다.
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

  // ─── month / day 슬라이스 ───────────────────────────────────────────────
  const monthPrefix = `${TARGET_YEAR}-${String(TARGET_MONTH).padStart(2, '0')}`
  const monthCells = cells.filter((c) => c.datetime.slice(0, 7) === monthPrefix)

  // ─── woolun(월운) — 셀과 같은 규칙(periodPillars, 재감사 G2 · TP-2) ─────────
  // 양력 한 달은 절기월 둘에 걸친다 — 1일~절입 전날은 앞 절기월, 절입이 든 현지 날부터
  // 다음 절기월(절입일 규칙, 출생지 시간대 민용 날짜). 머리말 간지(woolun)는 이 달에 *시작
  // 하는* 절기월(15일이 든 쪽, 그 달 대부분)이고, woolunSpans 가 실제로 걸친 절기월과 날짜
  // 범위를 함께 싣는다 — 예전엔 15일의 월운 하나만 달아 첫 주 그리드(앞 절기월)와 머리말이
  // 엇갈렸다. 근거 사다리(toMonth)도 15일 셀을 대표로 읽어 이 간지와 같다.
  const tz = calendarTimeZone(natal)
  const woolunRef = pillarsForLocalDate(TARGET_YEAR, TARGET_MONTH, 15, tz).month
  const woolunStem = woolunRef.stem
  const woolunBranch = woolunRef.branch
  const monthLastDay = new Date(Date.UTC(TARGET_YEAR, TARGET_MONTH, 0)).getUTCDate()
  const monthLastIso = `${monthPrefix}-${String(monthLastDay).padStart(2, '0')}`
  const woolunSpans = monthWindows({ start: `${monthPrefix}-01`, end: monthLastIso }, tz).map(
    (w) => ({
      woolun: toGanji(w.stem, w.branch),
      fromDay: w.startDate < `${monthPrefix}-01` ? 1 : Number(w.startDate.slice(8, 10)),
      toDay: w.endDate > monthLastIso ? monthLastDay : Number(w.endDate.slice(8, 10)),
    })
  )

  // ─── adapter 호출 (월/일 tier prop 어셈블) ───────────────────────────────
  // user 매핑은 assembleUser.ts 로 분리 — /destiny(assembleLifetime)와 공유.
  const user = assembleUserSummary(natal, { birthDisplay, place, sex })
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

  // ── 만 나이(SSOT) — 미성년 게이트(아래 sanitizeCrossEntry)의 단일 출처 ──
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

  // (인생 티어 — lifetimeFlow·lifetimePivots·toLifetime·인생 곡선 — 은 캘린더에서
  //  계산하지 않는다: 셸 기본 가시 티어가 월·일이라 결과가 버려졌다. /destiny 의
  //  assembleLifetime 이 담당. 월 narrative 의 '타고난 결'·'이 달의 결' 항목도
  //  MonthTier 가 '이달 총평' 만 읽어 표시되지 않던 페이로드라 뺐다.)
  const { month: monthAdapter, calendar } = toMonth({
    ym: monthPrefix,
    label: `${TARGET_YEAR}년 ${TARGET_MONTH}월`,
    cells: monthCells,
    woolunStem,
    woolunBranch,
    dayScores: layered.daily,
    // 펼침 기준일 — 보통 '오늘'. 안 주면 최고점수일로 펼쳐진다.
    focusDay: TARGET_DAY,
    // 사다리 10년 칸의 기간 = 대표 셀(15일)이 든 대운 창.
    daeunRange: ladderDaeunRange(natal, `${monthPrefix}-15`),
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
    woolunSpans,
    woolunSibsin: woolunStemSibsin,
    woolunStemSibsin,
    cautionDays: monthAdapter.cautionDays,
    goodDays: monthAdapter.goodDays,
    bestDay: monthAdapter.bestDay ?? { date: '', score: 0 },
    avoidDays: monthAdapter.avoidDays,
    narrative: monthAdapter.narrative,
    keyDays: monthKeyDays,
    focusDay: monthAdapter.focusDay,
    calendar,
    seed,
    evidenceLadder: monthAdapter.evidenceLadder,
    evidenceLadderEn: monthAdapter.evidenceLadderEn,
  }

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
        sajuEn: crossSajuEn(sajuKo),
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

  // ── 날짜별 "근거"(왜 이런 날일까요) — 그날 가장 센 사주×점성 교차의 *쉬운 뜻* 을
  //    각 calendar 셀에. 선택일 리드아웃이 topReasons(전문용어) 대신 이 plain meaning
  //    을 쓴다. 고르는 규칙(일진·정점 층 우선·시진은 가산점 없음·polarity 0 제외·
  //    마크 부호 게이트)은 crossPair.pickDayReason 한 곳 — 일 티어(assembleDayTier)가
  //    같은 날짜의 같은 월 셀로 같은 함수를 불러 day.reason 을 만든다(월·일 근거 일치,
  //    엔진 감사 X1).
  //    부호 게이트: good·best 는 +, caution·avoid 는 −, 무색은 어느 쪽이든(계획 B1 #4).
  //    근거에는 십신 한자와 점성 부모의 구조(트랜짓 행성·어스펙트·본명 접점·orb)를 붙인다 —
  //    교차가 싣고 온 엔진의 부모 참조(crossParents)에서, 월 셀·오늘 모두 같은 값(astroDetail.ts).
  const monthCellByDs = new Map(monthCells.map((c) => [c.datetime.slice(5, 10), c]))
  const todayDs = targetDayIso.slice(5, 10)
  for (const cell of month.calendar) {
    const src = monthCellByDs.get(cell.ds)
    const r = pickDayReason(src, cell.mark)
    const sig = pickDayReasonSignal(src, cell.mark)
    if (r && src && sig) {
      cell.reason = withReasonDetail(r, sig)
    } else if (r) {
      cell.reason = r
    }
  }

  // ── 오늘·지난 날 — 주입된 now 의 출생지 시간대 날짜(targetDayIso)로 서버에서 정한다.
  //    cell.focus(다이브 일)와 겹쳐 쓰지 않는다: 다른 날로 다이브해도 오늘은 오늘이다.
  for (const cell of month.calendar) {
    const iso = `${monthPrefix}-${String(cell.d).padStart(2, '0')}`
    cell.isToday = iso === targetDayIso
    cell.past = iso < targetDayIso
  }
  if (targetDayIso.slice(0, 7) === monthPrefix) month.todayDay = Number(targetDayIso.slice(8, 10))

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

  // ── 근거의 트랜짓 위치(별자리·도) — 큰 날(최대 6: 수렴 keyDays 5 + 최고의 날) 만 그날 현지
  //    정오 트랜짓 차트(트랜짓 추출기와 같은 Redis 키)에서. 오늘은 일 티어(assembleDayTier)가
  //    이미 같은 차트로 구한 위치를 그대로 쓴다 — 같은 근거·같은 위치, 조회 1회.
  const positionDs = [
    ...new Set([...monthKeyDays.map((k) => k.date), month.bestDay?.date].filter(Boolean)),
  ].slice(0, 6) as string[]
  const positionCells = positionDs
    .map((ds) => month.calendar.find((c) => c.ds === ds))
    .filter((c): c is NonNullable<typeof c> => !!c?.reason?.astroDetail && c.ds !== todayDs)
  if (positionCells.length > 0) {
    const placed = await withTransitPositions(
      positionCells.map((c) => ({
        dateIso: `${monthPrefix}-${c.ds.slice(3, 5)}`,
        detail: c.reason!.astroDetail!,
      })),
      natal.astro.location
    )
    positionCells.forEach((c, i) => {
      c.reason = { ...c.reason!, astroDetail: placed[i] }
    })
  }
  const todayCell = month.calendar.find((c) => c.ds === todayDs)
  const dayDetail = day.reason?.astroDetail
  if (todayCell?.reason?.astroDetail && dayDetail?.transitSign) {
    const sameParent = dayDetail.transitPlanet === todayCell.reason.astroDetail.transitPlanet
    if (sameParent) {
      todayCell.reason = {
        ...todayCell.reason,
        astroDetail: {
          ...todayCell.reason.astroDetail,
          transitSign: dayDetail.transitSign,
          transitDeg: dayDetail.transitDeg,
        },
      }
    }
  }

  // (포커스 셀 중립화는 없다 — 계획 B1 #2. 예전엔 일 verdict 가 tense/bright 인
  //  날 포커스 셀 마크를 'focus' 로 지우고 버킷·크라운에서 빼, 이달 좋은 날 수·
  //  verdict·최고의 날이 *여는 날짜* 에 따라 달라졌다. 셀마다 화해 톤(cell.tone)이
  //  리드아웃 태그·라벨·조언을 지배하므로 밴드 마크(색=점수)를 그대로 둬도 문장과
  //  축이 갈리지 않는다. 오늘 링은 cell.focus 로만 그린다.)

  // 이달 총평 — 타이밍·톤·지배 테마를 이어지는 한 문단으로 합성(deriveMonthSummary).
  // 양쪽 로케일 요약을 함께 만들어 보관 — 클라이언트 로케일 토글 시 서버언어로
  // 굳던 문제 해소. 정본 태그 '이달 총평', body=ko / bodyEn=en 를 MonthTier 가 고른다.
  // 지배 테마는 *신호 id* 로 한 번 고른 후보 목록(월 층 우호 신호, 그 달 영향 순)을 두
  // 로케일에 똑같이 넘긴다 — 예전엔 로케일별 topReasons 문자열(점수 높은 날의 일진 사유 포함)을
  // 따로 모아 KO·EN 이 다른 테마를 말하고 '오늘 천을귀인' 이 월 테마가 됐다(재감사 SI-4).
  const monthThemes = monthThemeCandidates(monthCells)

  // ── 월 verdict — 톤의 단일 권위. 그리드 밴드 카운트(여는 날짜와 무관)로 1회 산출해
  //    month.verdict 에 부착하고, 총평(deriveMonthSummary)에도 같은 톤을 주입한다.
  //    히어로 칩(MonthTier)·총평 문단·공유카드가 전부 이 하나를 읽어 어긋날 수 없다.
  const monthVerdict = reconcileMonthTone({
    goodN: month.goodDays.length,
    cautionN: month.cautionDays.length,
    avoidN: month.avoidDays.length,
    totalN: monthCells.length,
  })
  month.verdict = monthVerdict

  // 총평이 짚는 날(밀어붙일 날·미룰 날)은 MonthTier "이렇게 해보세요"와 같은
  // pickTryThis 로 — 기준일(TARGET_DAY, 보통 오늘) 이후만. 예전엔 cautionDays[0]
  // 이라 19일에 "11/8 무렵엔 미루세요"처럼 지난 날을 짚었다(계획 B1 #3).
  const tryThis = pickTryThis(
    {
      bestDay: month.bestDay?.date,
      goodDays: month.goodDays,
      cautionDays: month.cautionDays,
      avoidDays: month.avoidDays,
    },
    toMMDD(month.ym, TARGET_DAY)
  )
  const summaryCommon = {
    woolunKr: month.woolun?.kr && month.woolun.kr !== '—' ? month.woolun.kr : undefined,
    goodDays: month.goodDays.length,
    cautionDays: month.cautionDays.length,
    // 나쁜 날(<30)을 deriveMonthSummary 의 주의-측 톤·날수에 합산(감사: 예전엔
    // avoid 를 안 넘겨 나쁜 달이 'bright'로 뒤집히고 날수에서 avoid 가 증발했다).
    avoidDays: month.avoidDays.length,
    totalDays: monthCells.length,
    bestDay: tryThis.push ?? undefined,
    // PUSH 가 그리드 최고의 날이 아니면(최고일이 이미 지남 → 앞으로 남은 첫 좋은 날)
    // 총평은 '가장 무게가 실리는 날' 대신 부드러운 대체일 문장을 쓴다.
    bestDayKind:
      tryThis.push && tryThis.push !== month.bestDay?.date
        ? ('next-good' as const)
        : ('best' as const),
    cautionDay: tryThis.hold ?? undefined,
  }
  // bestDayReason(keyDays meaning)은 서버 lang 으로만 산출돼 있어 그 로케일 요약에만
  // 싣는다. 톤 게이트: 그 keyDay 의 수렴 톤이 negative 면 이유를 생략 — 총평의
  // 최고의 날 문장은 "추진해 보세요" 액션으로 닫히는데 부정 의미를 붙이면 한 문장
  // 안에서 자기모순("부딪힘 조심 — 추진해 보세요")이 된다(감사).
  const bestKeyDay = tryThis.push ? monthKeyDays.find((k) => k.date === tryThis.push) : undefined
  const bestDayReason =
    bestKeyDay && bestKeyDay.tone !== 'negative' ? bestKeyDay.meaning : undefined
  const summaryKo = deriveMonthSummary({
    ...summaryCommon,
    themes: monthThemes,
    bestDayReason: lang === 'ko' ? bestDayReason : undefined,
    monthTone: monthVerdict.tone,
    lang: 'ko',
    seed,
  })
  const summaryEn = deriveMonthSummary({
    ...summaryCommon,
    themes: monthThemes,
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
  // 셀 '왜' 근거(cell.reason)도 교차 meaning 이라 같이 정화 — 일 티어 day.reason 과
  // 같은 문장이어야 한다.
  if (isMinorAge(manAge)) {
    const rows = (xs: unknown): Array<Record<string, unknown>> =>
      (xs as Array<Record<string, unknown>>) ?? []
    for (const c of rows(month.crossActivations)) sanitizeCrossEntry(c, 'meaning', 'meaningEn')
    for (const cell of month.calendar) {
      if (cell.reason) sanitizeCrossEntry(cell.reason, 'meaning', 'meaningEn')
    }
  }

  return {
    topbar: { whoBirthLine, place, ilganHanja },
    user,
    month,
    day,
  }
}

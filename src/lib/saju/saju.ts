// src/lib/Saju/saju.ts

import Calendar from 'korean-lunar-calendar'
import { logger } from '@/lib/logger'
import { parseHourMinute } from './timeParse'
import {
  FiveElement,
  YinYang,
  CalculateSajuDataResult,
  DaeunPillar,
  StemBranchInfo,
  PillarData,
  AnnualCycleData,
  MonthlyCycleData,
} from './types'
import {
  STEMS,
  BRANCHES,
  MONTH_STEM_LOOKUP,
  TIME_STEM_LOOKUP,
  JIJANGGAN,
  getSolarTermKST,
  assertKasiYearInRange,
} from './constants'
// 엔진 산식 버전(캐시 키 무효화용) — 정의는 constants.ts(의존성 없는 leaf).
export { SAJU_ENGINE_VERSION } from './constants'
import { toBranchId, toGanjiId, toSajuElementId, toStemId } from './graphIds'
import { computeDayPillarIndices } from './dayPillar'
// 연운/월운/일진 stem-branch 산술의 single source.
import { annualStemBranch, sajuMonthStemBranch } from './cycles'
import { getSajuYearForDate } from './datePillars'
import { SAJU_CACHE, CACHE_KEY } from '@/lib/constants/cache'
import { currentDaeun, daysToDaeunAge } from '@/lib/saju/daeunAge'
import { normalizeTimeZone } from '@/lib/datetime/timezone'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'
import { meanSolarMinuteOfDay } from './timezone'
import { resolveBirthInstantFromDate } from '@/lib/datetime/resolveBirthInstant'
import { TIME_UNKNOWN_ANCHOR } from './birthTimeAnchor'
// 십신 / 정기 매핑은 core 모듈이 single source.
import { getBranchMainStem, getSibseong } from './core/sibsin'

// 내부 타입(간단화)
type DayMaster = { name: string; element: FiveElement; yin_yang: YinYang }

// getSibseong + getBranchMainStem + MAIN_QI 매핑은 core/sibsin.ts 로 이동.
// 호출자는 이 파일 내에서 import 한 helper 만 사용.

// MAIN_QI 매핑 + getBranchMainStem 은 core/sibsin.ts 로 이동.

// 천을귀인 helper now lives in stemBranchUtils — see import block above.

/* ========== 시지(時支) — 평균태양시 한 경로 ==========
 *
 * 시주는 출생지의 평균태양시(= UT + 경도 × 4분)로 정한다. 보정분은
 * solarTimeCorrectionMinutes(timezone.ts) 하나만 계산한다(SOLAR_TIME_CONVENTION.md).
 * 경도가 없으면 존 기준 경도(Asia/Seoul = 126.978, 그 외 tzdata 대표 도시)를 쓴다
 * (OD-2) — 그래서 경도 없는 서울 출생과 서울 기본값 출생이 같은 시주를 낸다.
 *
 * 옛 '한국 LMT +30분' 표(子=23:30-01:30), 손으로 적은 한국 DST 윈도우, KMT 분기,
 * 1월/7월 offset 으로 DST 를 추정하던 경로는 2026-11(엔진 감사 E8: F7·F2·F3·SAJU-2·
 * SAJU-3)에 모두 지웠다. 타임존 offset 이 이미 DST·KMT(+8:30)를 담고 있으므로
 * UT + 경도 × 4분 하나로 모든 시대·지역이 같은 규칙을 따른다. 시진 경계는 정시
 * 경계(子=23:00-01:00) 하나다 — 평균태양시 기준.
 */

type HourRange = { idx: number; start: number; end: number }
const HOUR_RANGES: ReadonlyArray<HourRange> = [
  { idx: 0, start: 23 * 60, end: 25 * 60 }, // 子 23-25(=01)
  { idx: 1, start: 1 * 60, end: 3 * 60 },
  { idx: 2, start: 3 * 60, end: 5 * 60 },
  { idx: 3, start: 5 * 60, end: 7 * 60 },
  { idx: 4, start: 7 * 60, end: 9 * 60 },
  { idx: 5, start: 9 * 60, end: 11 * 60 },
  { idx: 6, start: 11 * 60, end: 13 * 60 },
  { idx: 7, start: 13 * 60, end: 15 * 60 },
  { idx: 8, start: 15 * 60, end: 17 * 60 },
  { idx: 9, start: 17 * 60, end: 19 * 60 },
  { idx: 10, start: 19 * 60, end: 21 * 60 },
  { idx: 11, start: 21 * 60, end: 23 * 60 },
]

/* ========== 메모이제이션 캐시 ========== */
const sajuCache = new Map<string, { result: CalculateSajuDataResult; timestamp: number }>()

/**
 * 안전한 캐시 키 생성
 * - 파이프 구분자 대신 null byte 구분자 사용으로 키 충돌 방지
 * - 예: birthDate가 "1990-01-01|admin" 이어도 안전
 */
function getSajuCacheKey(
  birthDate: string,
  birthTime: string,
  gender: string,
  calendarType: string,
  timezone: string,
  lunarLeap?: boolean,
  // longitude 가 들어오면 진경도(진태양시) 보정이 켜져 시지/시간이 달라진다 — 캐시 키에 반영.
  longitude?: number,
  // 출생지-로컬 "오늘" (YYYY-MM-DD). 대운/세운/월운이 날짜 의존이라 키에 반영.
  nowLocalDate?: string,
  // 시간 미상(삼주) — fiveElements 가 6글자로 바뀌므로 키에 반영.
  timeUnknown?: boolean
): string {
  const sep = CACHE_KEY.SEPARATOR
  const params = [
    birthDate,
    birthTime,
    gender,
    calendarType,
    timezone,
    lunarLeap ?? '',
    typeof longitude === 'number' && Number.isFinite(longitude) ? longitude.toFixed(4) : '',
    nowLocalDate ?? '',
    timeUnknown ? 'tu' : '',
  ]
  return `${CACHE_KEY.PREFIX.SAJU}${sep}${params.map((p) => JSON.stringify(p)).join(sep)}`
}

/** calculateSajuData 옵션 (위치 인자 뒤에 붙는 9번째 인자). */
export interface CalculateSajuOptions {
  /**
   * 출생시각 미상 — 삼주(년·월·일) 분석(CONVENTIONS §5, OD-5). 계산 앵커는 정오
   * (TIME_UNKNOWN_ANCHOR)로 년·월·일주만 고정하고, fiveElements 는 시주를 빼고
   * 6글자로 센다. 결과의 timePillar 는 정오 앵커 자리표시이며 result.timeUnknown=true.
   * birthTime 이 빈 문자열이면 이 옵션 없이도 미상으로 본다(isBirthTimeUnknown 규약).
   */
  timeUnknown?: boolean
}

/* ========== 메인 계산 ========== */
export function calculateSajuData(
  birthDate: string,
  birthTime: string,
  gender: 'male' | 'female',
  calendarType: 'solar' | 'lunar',
  timezone: string,
  lunarLeap?: boolean,
  // 진경도(평균태양시) 보정용 출생지 경도. 시주만 UT + 경도 × 4분으로 정한다.
  // 없으면 존 기준 경도(Asia/Seoul = 126.978 — 서울 기본값과 같은 시주, OD-2).
  // 존 자오선에서 60° 넘게 떨어진 경도는 버리고 존 기준 경도(OD-14).
  longitude?: number,
  // 현재 시각 주입점. 원국(네 기둥)은 birthDate/Time 만으로 결정되지만 대운/세운/
  // 월운·만나이는 "지금"에 의존한다. 예전엔 그 경로가 new Date() 를 직접 읽어
  // 같은 입력도 날짜마다 결과가 달라지고(=결정론 누수) 골든 테스트도 불가능했다.
  // 기본값은 호출 시점이라 프로덕션 동작은 그대로, 테스트는 now 를 고정해 검증한다.
  now: Date = new Date(),
  opts: CalculateSajuOptions = {}
): CalculateSajuDataResult {
  // 빈 시각 = 미상(birthTimeAnchor.isBirthTimeUnknown 과 같은 규약). 계산 앵커는 정오 —
  // 예전엔 '' 가 00:00 으로 떨어져 절입일 월주가 정오 앵커(리포트·점성)와 갈렸다
  // (1988-07-07: '' → 戊午, '12:00' → 己未; 엔진 감사 F15).
  const blankTime = !String(birthTime ?? '').trim()
  const timeUnknown = opts.timeUnknown === true || blankTime
  if (blankTime) birthTime = TIME_UNKNOWN_ANCHOR
  // 잘못된 IANA 타임존(빈 문자열·레거시·손상 프로필 값)이 들어오면 아래
  // Intl.DateTimeFormat 이 RangeError 로 throw → 사주를 쓰는 모든 서비스가
  // 한꺼번에 죽는다. 유효하지 않으면 사주 기준 timezone(CALCULATION_STANDARDS.saju.baseTimezone)
  // 으로 떨궈 계산은 진행되게 한다.
  timezone = normalizeTimeZone(timezone, CALCULATION_STANDARDS.saju.baseTimezone)
  // 캐시 키에 now 의 출생지-로컬 날짜를 섞는다 — 날짜에 따라 달라지는 대운/세운/
  // 월운이 어제 캐시로 오늘 stale 하게 나오지 않게, 그리고 테스트가 now 를 바꾸면
  // 키도 바뀌어 캐시 간섭 없이 결정론적이게 한다.
  const nowLocalDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  // Check cache first
  const cacheKey = getSajuCacheKey(
    birthDate,
    birthTime,
    gender,
    calendarType,
    timezone,
    lunarLeap,
    longitude,
    nowLocalDate,
    timeUnknown
  )
  const cached = sajuCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < SAJU_CACHE.TTL_MS) {
    return cached.result
  }

  try {
    // 1️⃣ 출생시각: 입력 보정 & 윤달 지원
    let solarBirthDateStr = birthDate

    if (calendarType === 'lunar') {
      const calendar = new Calendar()
      const [y, m, d] = birthDate.split('-').map(Number)
      const ok = calendar.setLunarDate(y, m, d, !!lunarLeap)
      const solar = calendar.getSolarCalendar()
      // L1 fix: korean-lunar-calendar 가 범위 밖 (현재 2050-12-27 이후) lunar
      // 입력에 대해 ok=false 와 (0/0/0) 을 반환. 옛 코드는 그걸 무시해
      // `"0-00-00"` 문자열로 계산하다 "Invalid birthLocal date object" 로 throw 했다.
      // 명시적으로 사용자 친화적 에러로.
      if (!ok || !solar.year) {
        throw new Error(
          `음력 ${y}-${m}-${d} 변환 실패: 지원 범위(현재 ~2050-12-27 음력) 밖 입니다.`
        )
      }
      solarBirthDateStr = `${solar.year}-${String(solar.month).padStart(2, '0')}-${String(solar.day).padStart(2, '0')}`
    }

    // 시각 문자열 → 24h 시·분 (단일 파서). '9:05'·'0:10'·'11:30 PM' 모두 같은 길.
    // 예전엔 'H:MM' 을 0 채움 없이 ISO 에 넣어 Invalid Date 로 throw 했다(SAJU-6).
    const { h: hour, m: minute } = parseHourMinute(birthTime)

    // 출생 instant — 사주·점성 공용 resolver(OD-3, RFC 5545). 서머타임 공백 시각은
    // 직전 offset 으로, 겹침 시각은 첫 번째로 푼다. natalToJD 도 같은 함수를 쓴다(F4).
    let resolved: ReturnType<typeof resolveBirthInstantFromDate>
    try {
      resolved = resolveBirthInstantFromDate(solarBirthDateStr, hour, minute, timezone)
    } catch (e) {
      logger.error('[saju.ts] ❌ Invalid birthLocal:', {
        birthDate,
        birthTime,
        solarBirthDateStr,
        timezone,
        error: e instanceof Error ? e.message : String(e),
      })
      throw new Error('Invalid birthLocal date object')
    }
    const birthDateTime = resolved.utc

    // civilY/M/D (below) — the birthplace calendar date as entered. Older code
    // read birthDateTime.getFullYear() / getMonth(), i.e. the server's *UTC*
    // year/month, so a birth at 1989-12-31 23:30 LA (UTC-8) became 1990-01-01
    // on a UTC server and the year/month pillar used 1990 instead of 1989.
    // ── 절입(節入) 판정 = 생(raw) UT 출생 instant — CONVENTIONS.md §1·§2 (OD-1, 2026-11).
    //    절입은 태양 시황경이 315°+30k° 에 닿는 *하나의 절대 instant* 다. 년주·월주와
    //    대운수 일수는 birthDateTime 을 KASI_SOLAR_TERMS instant 와 그대로 비교한다.
    //    평균태양시(진경도) 보정은 벽시계 라벨을 바꿀 뿐 출생을 절입 너머로 옮기지
    //    못하므로 **시주(時) lookup 에만** 쓴다(아래 meanSolarMinuteOfDay).
    //    예전(2026-06~11)엔 이 보정분만큼 출생 instant 자체를 옮겨(effectiveDateTime)
    //    절입과 비교했다. 그래서 서울(lon 126.978, −32분)은 절입 후 2~32분 출생이
    //    전 월·전 년으로, 도쿄(+19분)는 절입 직전 출생이 다음 월로 뒤집혔고 대운 방향·
    //    대운수까지 바뀌었다. 같은 instant·경도라도 timezone 라벨에 따라 답이 갈렸다
    //    (2020-02-04T11:00Z lon 75.99 — Asia/Shanghai 己亥 vs Asia/Urumqi 庚子).
    //    가드: tests/lib/saju/solarTermFrame.test.ts, tests/golden/saju.golden.test.ts

    // ── 민용일(civil day) Y/M/D — *입력한* 출생지 날짜 그대로(보정·instant 재유도 없음).
    //    절기 lookup 의 그레고리력 연·월, 일주(CONVENTIONS §1), 만 나이 생일(§14)이
    //    모두 이 값을 쓴다.
    //
    //    일주가 민용일인 이유: 일주는 60갑자 *달력 순환*이고, 입춘·절기는 *천문 사건*이다.
    //    2026-06-06 에 "네 기둥 모두 보정된 instant 한 기준에서" 로 통일했을 때 일주까지
    //    끌려가 민용일 규칙을 깼다. 경도를 넘기면 LMT 만큼 일 경계가 밀려, 문서화된
    //    골든(`1991-01-01 00:01 KST → 日 辛未`)이 日 庚午(전날)로 깨졌다.
    //    instant 에서 다시 읽지도 않는다 — 자정에 걸친 서머타임 공백(1961-08-10 00:15 서울,
    //    2018-11-04 00:30 상파울루)은 instant 를 어느 쪽으로 풀든 벽시계 날짜가 입력과
    //    달라질 수 있어 일주가 전날로 밀렸다(엔진 감사 E8, 골든 G26).
    //
    //    가드: `tests/lib/saju/doctrine-dayBoundary.test.ts`, 골든 G26·G26b·G26c
    const [civilY, civilM, civilD] = solarBirthDateStr.trim().split('-').map(Number)

    const year = civilY
    // 범위 검사도 민용 연도로 — 보정된 연도를 검사하던 옛 코드는 경도가 있으면
    // 1940-01-01 00:10 서울 출생을 1939 로 밀어 throw 했다(SAJU-5).
    assertKasiYearInRange(year)
    const month = civilM
    const birthMs = birthDateTime.getTime()

    /* ---------------- 연기둥 ---------------- */
    const ipchunUTC = getSolarTermKST(year, 2)
    if (!ipchunUTC) {
      throw new Error(`Cannot determine Saju year: solar term data missing for ${year}`)
    }
    const sajuYear = birthMs < ipchunUTC.getTime() ? year - 1 : year
    const idx60Y = (sajuYear - 4 + 6000) % 60
    const yearPillar = { stem: STEMS[idx60Y % 10], branch: BRANCHES[idx60Y % 12] }

    /* ---------------- 월기둥 ---------------- */
    let sajuMonth = month
    // sajuMonth 가 속한 "절기-연도" — 1월이지만 소한(1월 절기) 이전이면 사주월은
    // 작년 12월(子월)로 롤백되므로, 그 절기 lookup 도 작년에서 가져와야 한다.
    let sajuTermYear = year
    const termUTC_thisMonth = getSolarTermKST(year, month)
    if (!termUTC_thisMonth) {
      throw new Error(`Cannot determine Saju month: solar term data missing for ${year}/${month}`)
    }
    if (birthMs < termUTC_thisMonth.getTime()) {
      if (sajuMonth === 1) {
        sajuMonth = 12
        sajuTermYear = year - 1
      } else {
        sajuMonth = sajuMonth - 1
      }
    }

    const G_BRANCH: ReadonlyArray<string> = [
      '丑',
      '寅',
      '卯',
      '辰',
      '巳',
      '午',
      '未',
      '申',
      '酉',
      '戌',
      '亥',
      '子',
    ]
    const monthBranchName = G_BRANCH[(sajuMonth - 1) % 12]
    const monthBranchIndex = BRANCHES.findIndex((b) => b.name === monthBranchName)
    const firstMonthStemName = MONTH_STEM_LOOKUP[yearPillar.stem.name]
    const firstMonthStemIndex = STEMS.findIndex((s) => s.name === firstMonthStemName)
    const TIGER_INDEX = BRANCHES.findIndex((b) => b.name === '寅')
    const offsetFromTiger = (monthBranchIndex - TIGER_INDEX + 12) % 12
    const monthStemIndex = (firstMonthStemIndex + offsetFromTiger) % 10
    const monthPillar = { stem: STEMS[monthStemIndex], branch: BRANCHES[monthBranchIndex] }

    /* ---------------- 일기둥 ---------------- */
    // 민용일 Y/M/D — 진경도 보정 없는 출생지 벽시계 날짜.
    const { stemIndex: dayStemIndex, branchIndex: dayBranchIndex } = computeDayPillarIndices(
      civilY,
      civilM,
      civilD
    )
    const dayPillar = { stem: STEMS[dayStemIndex], branch: BRANCHES[dayBranchIndex] }
    const dayMaster: StemBranchInfo = {
      ...dayPillar.stem,
      graphId: toStemId(dayPillar.stem.name) ?? undefined,
      elementGraphId: toSajuElementId(dayPillar.stem.element) ?? undefined,
    }

    /* ---------------- 시기둥 ----------------
     * 평균태양시 한 경로: 출생 instant 의 출생지 벽시계 + solarTimeCorrectionMinutes
     * (= UT + 경도 × 4분). 경도 미상이면 존 기준 경도(OD-2). 년·월·대운은 생 instant,
     * 일주는 민용일이라 이 보정은 시주에만 들어간다(OD-1).
     *   예: 부산 (129.07°E, KST) → 보정 −23분 → 시계 11:00 = 평균태양시 10:37 → 巳
     */
    const solarMinuteOfDay = meanSolarMinuteOfDay(birthDateTime, longitude, timezone)
    const candidates = [solarMinuteOfDay, solarMinuteOfDay + 24 * 60]
    let hourBranchIndex = 0
    outer: for (const t of candidates) {
      for (const r of HOUR_RANGES) {
        if (t >= r.start && t < r.end) {
          hourBranchIndex = r.idx
          break outer
        }
      }
    }
    const firstHourStemName = TIME_STEM_LOOKUP[dayPillar.stem.name]
    const firstHourStemIndex = STEMS.findIndex((s) => s.name === firstHourStemName)
    const timeStemIndex = (firstHourStemIndex + hourBranchIndex) % 10
    const timePillar = { stem: STEMS[timeStemIndex], branch: BRANCHES[hourBranchIndex] }

    /* ---------------- 대운 계산 ---------------- */
    const isYangYear = yearPillar.stem.yin_yang === '양'
    const isMale = gender === 'male'
    const isForward = (isYangYear && isMale) || (!isYangYear && !isMale)
    // sajuTermYear: sajuMonth 가 1월에서 12월로 롤백된 경우 그 절기는 *작년*에
    // 속한다 (예: 1990-01-04 출생 → sajuMonth=12, sajuTermYear=1989 → 1989년 대설).
    // 이전엔 sajuMonth 만 보정하고 lookup year 는 Gregorian year 그대로 두어,
    // 자축월 무렵 연초 출생의 대운수가 ~365일 어긋났음 (regression test 참조).
    const termUTC_current = getSolarTermKST(sajuTermYear, sajuMonth)
    if (!termUTC_current) {
      throw new Error(
        `Cannot determine Daeun: solar term data missing for ${sajuTermYear}/${sajuMonth}`
      )
    }
    // 대운수 계산용 절기 결정.
    // 양남/음녀 순행 → 다음 月의 시작 절기까지 일수
    // 음남/양녀 역행 → 본인이 속한 月의 시작 절기까지(이미 지난) 일수
    //
    // 본인이 속한 月의 시작 절기 = termUTC_current (예: 寅월이면 입춘)
    // 다음 月의 시작 절기 = sajuMonth+1의 termUTC (예: 寅월의 다음은 卯월 = 경칩)
    let nextTermUTC: Date, prevTermUTC: Date
    if (isForward) {
      const nextMonth = sajuMonth === 12 ? 1 : sajuMonth + 1
      const nextYear = sajuMonth === 12 ? sajuTermYear + 1 : sajuTermYear
      const nextTerm = getSolarTermKST(nextYear, nextMonth)
      if (!nextTerm) {
        throw new Error(
          `Cannot determine Daeun: solar term data missing for ${nextYear}/${nextMonth}`
        )
      }
      nextTermUTC = nextTerm
      prevTermUTC = termUTC_current
    } else {
      // 역행(逆行) 대운수: 출생 시각에서 *직전* 절기까지의 시간으로 계산.
      // sajuMonth 보정 후 termUTC_current는 항상 birth가 그 이후인 절기이므로
      // (= 직전 절기), prevTermUTC = termUTC_current로 두면 된다.
      // 이전엔 prev month's term을 prevTerm으로 사용해 30일 가량의 오차가
      // 누적되어 대운수가 비정상적으로 컸음. (regression test 참조)
      prevTermUTC = termUTC_current
      nextTermUTC = termUTC_current // 역행에서는 사용되지 않음
    }

    // 대운수 거리는 절기 경계와 *같은 시간 기준* — 생 UT instant(birthMs) 와 절입
    // instant 의 차이다(OD-1). 경도 보정분을 섞으면 같은 출생의 대운수가 timezone
    // 라벨에 따라 ±1 흔들린다(예: 1963-11-02 02:17 마드리드, 한로 후 24.03일 → 8).
    const diffToTermMs = isForward
      ? nextTermUTC.getTime() - birthMs
      : birthMs - prevTermUTC.getTime()
    const daeWoonStartAge = daysToDaeunAge(diffToTermMs / 86400000)

    const daeWoonList: DaeunPillar[] = []
    const direction = isForward ? 1 : -1
    let curStemIdx = monthStemIndex
    let curBranchIdx = monthBranchIndex
    for (let i = 0; i < 10; i++) {
      const age = i * 10 + daeWoonStartAge
      curStemIdx = (curStemIdx + direction + 10) % 10
      curBranchIdx = (curBranchIdx + direction + 12) % 12
      const s = STEMS[curStemIdx]
      const b = BRANCHES[curBranchIdx]
      const mainForB = getBranchMainStem(b.name)
      daeWoonList.push({
        age,
        heavenlyStem: s.name,
        earthlyBranch: b.name,
        sibsin: { cheon: getSibseong(dayMaster, s), ji: getSibseong(dayMaster, mainForB ?? b) },
      })
    }

    /* ---------------- 결과 구성 ---------------- */
    const pillars = { yearPillar, monthPillar, dayPillar, timePillar } as const
    const finalPillars: Record<string, PillarData> = {} as Record<string, PillarData>

    // 지장간 기운 정보를 안전하게 생성하는 헬퍼
    const makeJijangganEntry = (stemName: string | undefined) => {
      if (!stemName) {
        return undefined
      }
      const stem = STEMS.find((s) => s.name === stemName)
      if (!stem) {
        return undefined
      }
      return {
        name: stemName,
        sibsin: getSibseong(dayMaster, stem),
        graphId: toStemId(stemName) ?? undefined,
      }
    }

    ;(['yearPillar', 'monthPillar', 'dayPillar', 'timePillar'] as const).forEach((name) => {
      const p = pillars[name]
      const j = JIJANGGAN[p.branch.name]
      const chogiName = j?.여기 // 여기(餘氣) = 잔여기운
      const junggiName = j?.중기
      const jeonggiName = j?.정기
      const mainStem = getBranchMainStem(p.branch.name)

      finalPillars[name] = {
        heavenlyStem: {
          name: p.stem.name,
          element: p.stem.element,
          yin_yang: p.stem.yin_yang,
          sibsin: getSibseong(dayMaster, p.stem),
          graphId: toStemId(p.stem.name) ?? undefined,
          elementGraphId: toSajuElementId(p.stem.element) ?? undefined,
        },
        earthlyBranch: {
          name: p.branch.name,
          element: p.branch.element,
          yin_yang: p.branch.yin_yang,
          sibsin: getSibseong(dayMaster, mainStem ?? p.branch),
          graphId: toBranchId(p.branch.name) ?? undefined,
          elementGraphId: toSajuElementId(p.branch.element) ?? undefined,
        },
        ganjiGraphId: toGanjiId(`${p.stem.name}${p.branch.name}`) ?? undefined,
        jijanggan: {
          chogi: makeJijangganEntry(chogiName),
          junggi: makeJijangganEntry(junggiName),
          jeonggi: makeJijangganEntry(jeonggiName),
        },
      }
    })

    const fiveElementsCount: { [key in FiveElement]: number } = {
      목: 0,
      화: 0,
      토: 0,
      금: 0,
      수: 0,
    }
    // 시간 미상이면 삼주 6글자만 센다 — 정오 앵커 시주는 날짜를 고정하는 자리표시라
    // 오행 분포에 넣으면 정오 추정(午시)이 판정을 좌우한다(엔진 감사 SAJU-4·SD-10).
    const countedPillars = timeUnknown
      ? [yearPillar, monthPillar, dayPillar]
      : [yearPillar, monthPillar, dayPillar, timePillar]
    countedPillars.forEach((p) => {
      fiveElementsCount[p.stem.element]++
      fiveElementsCount[p.branch.element]++
    })

    const yNowLocal = Number(
      new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric' }).format(now)
    )
    const mNowLocal = Number(
      new Intl.DateTimeFormat('en-US', { timeZone: timezone, month: 'numeric' }).format(now)
    )
    // 현재 대운 — 순수 함수 currentDaeun(daeunAge.ts) 하나가 고른다. /api/saju 도 캐시된
    // 결과에 같은 함수를 요청마다 다시 적용한다(SAJU-8). 만 나이는 출생지 시간대의 *민용*
    // 생일 기준(CONVENTIONS §14, currentManAge) — 보정된 날짜를 넘기면 자정 직후 출생의
    // 생일이 전날로 밀려 현재 대운이 하루 일찍 바뀌었다(F14). 첫 대운 전에는 월주가 그
    // 시기를 맡으므로 current = null + preDaeun {startsAtAge}(OD-12, SAJU-7) — 예전엔
    // `|| daeWoonList[0]` 폴백으로 만 4세에게 7세 대운을 '현재'라 했다.
    const { current: currentLuckPillar, preDaeun } = currentDaeun(
      daeWoonList,
      { year: civilY, month: civilM, day: civilD },
      timezone,
      now
    )

    // 연운 (현재 사주연도부터 6년치) — stem-branch 산술은 cycles.ts(single source) 위임.
    // baseAllDataPrompt/어댑터가 기대하는 wide shape(ganji/element 포함) 으로 매핑.
    // 세운은 1/1 이 아니라 *입춘*에 바뀐다 — getSajuYearForDate(입춘-aware)로 base 를
    // 잡아야 1/1~입춘 구간이 다음 해 세운으로 잘못 뜨지 않는다(currentUnse·생일차트와
    // 동일 convention). 직전엔 그레고리력 연도(yNowLocal)라 이 구간이 한 해 어긋났다.
    const baseSajuYear = getSajuYearForDate(now)
    const annualCycles: AnnualCycleData[] = []
    for (let i = 0; i < 6; i++) {
      const yr = baseSajuYear + i
      const { stem, branch } = annualStemBranch(yr)
      const mainForB = getBranchMainStem(branch.name)
      annualCycles.push({
        year: yr,
        ganji: `${stem.name}${branch.name}`,
        // 별도 필드도 함께 채워 다운스트림(어댑터·UI)에서 어느 쪽을 읽어도 안전.
        heavenlyStem: stem.name,
        earthlyBranch: branch.name,
        element: stem.element,
        sibsin: {
          cheon: getSibseong(dayMaster, stem),
          ji: getSibseong(dayMaster, mainForB ?? branch),
        },
      })
    }

    // 월운 (현재 월부터 12개월치) — 사주월(寅-first) 산술은 cycles.ts 위임.
    //
    // ⚠️ 정확도 한계: 이 배열은 (연, 양력월)만으로 간지를 매기며 절기 경계(월
    // 전환이 매월 4~6일경)를 반영하지 않아, 양력월 라벨과 사주월 간지가 최대 한
    // 칸 어긋날 수 있다(예: 양력 7월에 未월 대신 申월). 사용자에게 노출하는
    // "현재 월운"의 권위 있는 값은 절기 기준으로 계산하는 currentUnse
    // (computeCurrentUnse)를 쓴다 — 이 raw 배열을 직접 소비하지 말 것. 현재 활성
    // 소비자는 없으며(프롬프트/리포트/캘린더 모두 currentUnse 또는 getMonthlyCycles
    // 를 사용) 하위호환 shape 유지용으로만 남긴다.
    const monthlyCycles: MonthlyCycleData[] = []
    for (let i = 0; i < 12; i++) {
      let yr = yNowLocal
      let mo = mNowLocal + i
      if (mo > 12) {
        mo -= 12
        yr += 1
      }
      const { stem, branch } = sajuMonthStemBranch(yr, mo - 1)
      const mainForB = getBranchMainStem(branch.name)
      monthlyCycles.push({
        year: yr,
        month: mo,
        ganji: `${stem.name}${branch.name}`,
        heavenlyStem: stem.name,
        earthlyBranch: branch.name,
        element: stem.element,
        sibsin: {
          cheon: getSibseong(dayMaster, stem),
          ji: getSibseong(dayMaster, mainForB ?? branch),
        },
      })
    }

    // unse 구조 (baseAllDataPrompt.ts가 기대하는 형식)
    const unse = {
      daeun: daeWoonList.map((d) => ({
        age: d.age,
        heavenlyStem: d.heavenlyStem,
        earthlyBranch: d.earthlyBranch,
        ganji: `${d.heavenlyStem}${d.earthlyBranch}`,
      })),
      annual: annualCycles,
      monthly: monthlyCycles,
    }

    const result: CalculateSajuDataResult = {
      yearPillar: finalPillars.yearPillar,
      monthPillar: finalPillars.monthPillar,
      dayPillar: finalPillars.dayPillar,
      timePillar: finalPillars.timePillar,
      pillars: {
        year: finalPillars.yearPillar,
        month: finalPillars.monthPillar,
        day: finalPillars.dayPillar,
        time: finalPillars.timePillar,
      },
      daeWoon: {
        startAge: daeWoonStartAge,
        isForward,
        current: currentLuckPillar,
        preDaeun,
        list: daeWoonList,
      },
      unse,
      fiveElements: {
        wood: fiveElementsCount['목'],
        fire: fiveElementsCount['화'],
        earth: fiveElementsCount['토'],
        metal: fiveElementsCount['금'],
        water: fiveElementsCount['수'],
      },
      dayMaster,
      ...(timeUnknown ? { timeUnknown: true } : {}),
      meta: {
        birthUtc: birthDateTime.toISOString(),
        instantKind: resolved.kind,
        civilBirthDate: `${civilY}-${String(civilM).padStart(2, '0')}-${String(civilD).padStart(2, '0')}`,
        timeZone: timezone,
      },
    }

    // Cache the result (evict oldest if full)
    if (sajuCache.size >= SAJU_CACHE.MAX_SIZE) {
      const firstKey = sajuCache.keys().next().value
      if (firstKey) sajuCache.delete(firstKey)
    }
    sajuCache.set(cacheKey, { result, timestamp: Date.now() })

    return result
  } catch (error) {
    logger.error('[saju.ts] Error during Saju data calculation:', error)
    throw new Error(
      `Error during calculation: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/* ========== 연/월/일 유틸 ==========
 * 산술은 cycles.ts(single source) 로 위임. 아래 export 는 BC(테스트·옛 호출자)
 * 유지를 위한 thin re-export — 출력 byte 동일.
 */
export {
  getAnnualCycles,
  getSajuMonthlyCycles as getMonthlyCycles,
  getIljinCalendar,
} from './cycles'

// src/lib/Saju/saju.ts

import { toDate } from 'date-fns-tz'
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
import { toBranchId, toGanjiId, toSajuElementId, toStemId } from './graphIds'
import { computeDayPillarIndices } from './dayPillar'
// 연운/월운/일진 stem-branch 산술의 single source.
import { annualStemBranch, sajuMonthStemBranch } from './cycles'
import { SAJU_CACHE, CACHE_KEY } from '@/lib/constants/cache'
import { currentManAge } from '@/lib/datetime/currentAge'
import { daysToDaeunAge } from '@/lib/saju/daeunAge'
import { normalizeTimeZone } from '@/lib/datetime/timezone'
import { solarTimeCorrectionMinutes } from './timezone'
// 십신 / 정기 매핑은 core 모듈이 single source.
import { getBranchMainStem, getSibseong } from './core/sibsin'

// 내부 타입(간단화)
type DayMaster = { name: string; element: FiveElement; yin_yang: YinYang }

// getSibseong + getBranchMainStem + MAIN_QI 매핑은 core/sibsin.ts 로 이동.
// 호출자는 이 파일 내에서 import 한 helper 만 사용.

// MAIN_QI 매핑 + getBranchMainStem 은 core/sibsin.ts 로 이동.

// 천을귀인 helper now lives in stemBranchUtils — see import block above.

/* ========== 한국 LMT(평균태양시) 보정 + DST/KMT 분기 ==========
 *
 * 사주 시지(時支) 산정은 "출생지의 태양시"를 기준으로 한다.
 * 한국(Asia/Seoul) 표준시는 UTC+9(135°E 자오선) — 서울(~127°E)은 시계상
 * 약 +32분 늦게 정오를 맞는다. 전통 사주에서 자주 쓰는 단순화로
 * 30분 보정을 적용한다 (子=23:30-01:30 등).
 *
 * 그러나 (A) KMT 기간(1954-03-21 ~ 1961-08-10, UTC+8:30)에는 시계 자체가
 * 127.5°E 자오선을 따랐으므로 추가 30분 보정이 필요 없다. (B) 한국 DST
 * 기간에는 시계가 1시간 앞당겨져 있으므로, 시지 산정 전에 60분을
 * 빼서 평상시 시계로 환원한 뒤 LMT 보정을 적용한다.
 *
 * 한국 외 타임존에서 태어난 경우엔 한국 LMT를 적용해선 안 된다 → 평범한
 * 정시 경계(子=23:00-01:00)를 사용.
 *
 * 참고 출처: IANA tz database (zone Asia/Seoul, Rule ROK).
 *   https://github.com/eggert/tz/blob/main/asia
 */

const SEOUL_TZ = 'Asia/Seoul'

// KMT 시대: 1954-03-21 ~ 1961-08-10 (IANA tz Asia/Seoul). 둘 다 wall-clock 자정 기준.
// epoch ms 비교를 위해 UTC 시각으로 변환 — KMT 진입 직전 KST=UTC+9, 종료 시 KMT=UTC+8:30.
const KMT_START_UTC_MS = Date.UTC(1954, 2, 20, 15, 0, 0) // 1954-03-21 00:00 KST (UTC+9)
const KMT_END_UTC_MS = Date.UTC(1961, 7, 9, 15, 30, 0) // 1961-08-10 00:00 KMT (UTC+8:30)

/**
 * 한국 DST(Daylight Saving Time) 윈도우. IANA tz 데이터(Rule ROK)에서 직접 도출.
 * 각 항목은 [startUtcMs, endUtcMs) 반개구간. 시작/종료는 모두 wall-clock 자정 기준
 * (종료는 24:00 standard time = 다음 날 00:00).
 *
 * 시작/종료 시점의 UTC offset:
 * - 1948-1951: KST(UTC+9). KDT=UTC+10.
 * - 1955-1960: KMT 기간 → 시작 전 KMT(UTC+8:30), 시작 후 KDT(UTC+9:30).
 * - 1987-1988: KST(UTC+9). KDT=UTC+10. 시작 02:00 KST → 03:00 KDT,
 *              종료 03:00 KDT → 02:00 KST (보수적으로 자정 경계로 단순화).
 */
type DstWindow = { startUtcMs: number; endUtcMs: number }
const KOREAN_DST_WINDOWS: ReadonlyArray<DstWindow> = [
  // 1948: Jun 1 00:00 KST → Sep 13 00:00 KST (Sep 12 24:00 S)
  { startUtcMs: Date.UTC(1948, 4, 31, 15, 0), endUtcMs: Date.UTC(1948, 8, 12, 15, 0) },
  // 1949: Apr 3 00:00 KST → Sep 11 00:00 KST (Sat>=7 = Sep 10, 24:00 S)
  { startUtcMs: Date.UTC(1949, 3, 2, 15, 0), endUtcMs: Date.UTC(1949, 8, 10, 15, 0) },
  // 1950: Apr 1 00:00 KST → Sep 10 00:00 KST (Sep 9 24:00)
  { startUtcMs: Date.UTC(1950, 2, 31, 15, 0), endUtcMs: Date.UTC(1950, 8, 9, 15, 0) },
  // 1951: May 6 00:00 KST → Sep 9 00:00 KST (Sep 8 24:00)
  { startUtcMs: Date.UTC(1951, 4, 5, 15, 0), endUtcMs: Date.UTC(1951, 8, 8, 15, 0) },
  // 1955: May 5 00:00 KMT → Sep 9 00:00 KMT (Sep 8 24:00). KMT=UTC+8:30
  { startUtcMs: Date.UTC(1955, 4, 4, 15, 30), endUtcMs: Date.UTC(1955, 8, 8, 15, 30) },
  // 1956: May 20 00:00 KMT → Sep 30 00:00 KMT (Sep 29 24:00)
  { startUtcMs: Date.UTC(1956, 4, 19, 15, 30), endUtcMs: Date.UTC(1956, 8, 29, 15, 30) },
  // 1957: Sun>=1 May = May 5 → Sat>=17 Sep = Sep 21 24:00 = Sep 22 00:00 KMT
  { startUtcMs: Date.UTC(1957, 4, 4, 15, 30), endUtcMs: Date.UTC(1957, 8, 21, 15, 30) },
  // 1958: May 4 → Sep 20 24:00 = Sep 21 00:00
  { startUtcMs: Date.UTC(1958, 4, 3, 15, 30), endUtcMs: Date.UTC(1958, 8, 20, 15, 30) },
  // 1959: May 3 → Sep 19 24:00 = Sep 20 00:00
  { startUtcMs: Date.UTC(1959, 4, 2, 15, 30), endUtcMs: Date.UTC(1959, 8, 19, 15, 30) },
  // 1960: May 1 → Sep 17 24:00 = Sep 18 00:00
  { startUtcMs: Date.UTC(1960, 3, 30, 15, 30), endUtcMs: Date.UTC(1960, 8, 17, 15, 30) },
  // 1987: May 10 02:00 KST → Oct 11 03:00 KDT (단순화: 자정 경계 기반 윈도우)
  { startUtcMs: Date.UTC(1987, 4, 9, 17, 0), endUtcMs: Date.UTC(1987, 9, 10, 17, 0) },
  // 1988: May 8 02:00 KST → Oct 9 03:00 KDT
  { startUtcMs: Date.UTC(1988, 4, 7, 17, 0), endUtcMs: Date.UTC(1988, 9, 8, 17, 0) },
]

function isInKmtEra(birthUtcMs: number): boolean {
  return birthUtcMs >= KMT_START_UTC_MS && birthUtcMs < KMT_END_UTC_MS
}

function isInKoreanDst(birthUtcMs: number): boolean {
  for (const w of KOREAN_DST_WINDOWS) {
    if (birthUtcMs >= w.startUtcMs && birthUtcMs < w.endUtcMs) {
      return true
    }
  }
  return false
}

/**
 * 한국 LMT(평균태양시) +30분 보정을 적용할지 결정.
 * (a) 타임존이 Asia/Seoul 이고
 * (b) KMT 시대(1954-03-21 ~ 1961-08-10)가 아니며
 * (c) 한국 DST 윈도우가 아닐 때만 true.
 */
function applyKoreanLmtCorrection(birthUtcMs: number, timezone: string): boolean {
  if (timezone !== SEOUL_TZ) {
    return false
  }
  if (isInKmtEra(birthUtcMs)) {
    return false
  }
  if (isInKoreanDst(birthUtcMs)) {
    return false
  }
  return true
}

/**
 * 시지 산정용 분(min) 보정값.
 * - DST 기간: 시계가 1시간 앞당겨졌으므로 −60분 (평상시 시계로 환원)
 * - 그 외: 0
 *
 * KMT 시대는 시계 자체가 127.5°E 자오선 = 평상시 정오와 일치 → 분 보정 불필요.
 */
function getHourLookupOffsetMin(birthUtcMs: number, timezone: string): number {
  if (timezone !== SEOUL_TZ) {
    return 0
  }
  if (isInKoreanDst(birthUtcMs)) {
    return -60
  }
  return 0
}

// 시지 범위 — 두 가지 변형.
// LMT_HOUR_RANGES: 한국 LMT(+30) 보정 적용 — 子=23:30-01:30 등 (현행 동작).
// PLAIN_HOUR_RANGES: 평범한 정시 경계 — 子=23:00-01:00. KMT 시대 / 비한국 /
//                    DST 보정 후 사용.
type HourRange = { idx: number; start: number; end: number }
const LMT_HOUR_RANGES: ReadonlyArray<HourRange> = [
  { idx: 0, start: 23 * 60 + 30, end: 24 * 60 + 60 + 30 },
  { idx: 1, start: 1 * 60 + 30, end: 3 * 60 + 30 },
  { idx: 2, start: 3 * 60 + 30, end: 5 * 60 + 30 },
  { idx: 3, start: 5 * 60 + 30, end: 7 * 60 + 30 },
  { idx: 4, start: 7 * 60 + 30, end: 9 * 60 + 30 },
  { idx: 5, start: 9 * 60 + 30, end: 11 * 60 + 30 },
  { idx: 6, start: 11 * 60 + 30, end: 13 * 60 + 30 },
  { idx: 7, start: 13 * 60 + 30, end: 15 * 60 + 30 },
  { idx: 8, start: 15 * 60 + 30, end: 17 * 60 + 30 },
  { idx: 9, start: 17 * 60 + 30, end: 19 * 60 + 30 },
  { idx: 10, start: 19 * 60 + 30, end: 21 * 60 + 30 },
  { idx: 11, start: 21 * 60 + 30, end: 23 * 60 + 30 },
]
const PLAIN_HOUR_RANGES: ReadonlyArray<HourRange> = [
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
  nowLocalDate?: string
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
  ]
  return `${CACHE_KEY.PREFIX.SAJU}${sep}${params.map((p) => JSON.stringify(p)).join(sep)}`
}

/* ========== 메인 계산 ========== */
export function calculateSajuData(
  birthDate: string,
  birthTime: string,
  gender: 'male' | 'female',
  calendarType: 'solar' | 'lunar',
  timezone: string,
  lunarLeap?: boolean,
  // 진경도(진태양시) 보정용. 도시의 lon 을 넘기면 timezone 표준 자오선과의 차이만큼
  // 분 단위로 시지 룩업을 보정한다. 전세계 사용자에게 일관된 정통 사주학.
  // 없으면 한국 평균 LMT(+30분) 기존 동작 유지 — 옛 결과와 호환.
  longitude?: number,
  // 현재 시각 주입점. 원국(네 기둥)은 birthDate/Time 만으로 결정되지만 대운/세운/
  // 월운·만나이는 "지금"에 의존한다. 예전엔 그 경로가 new Date() 를 직접 읽어
  // 같은 입력도 날짜마다 결과가 달라지고(=결정론 누수) 골든 테스트도 불가능했다.
  // 기본값은 호출 시점이라 프로덕션 동작은 그대로, 테스트는 now 를 고정해 검증한다.
  now: Date = new Date()
): CalculateSajuDataResult {
  // 잘못된 IANA 타임존(빈 문자열·레거시·손상 프로필 값)이 들어오면 아래
  // Intl.DateTimeFormat 이 RangeError 로 throw → 사주를 쓰는 모든 서비스가
  // 한꺼번에 죽는다. 유효하지 않으면 기본값으로 떨궈 계산은 진행되게 한다.
  timezone = normalizeTimeZone(timezone)
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
    nowLocalDate
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
      // `"0-00-00"` 문자열을 만들고 toDate() 가 Invalid Date → "Invalid birthLocal
      // date object" 로 throw. 명시적으로 사용자 친화적 에러로.
      if (!ok || !solar.year) {
        throw new Error(
          `음력 ${y}-${m}-${d} 변환 실패: 지원 범위(현재 ~2050-12-27 음력) 밖 입니다.`
        )
      }
      solarBirthDateStr = `${solar.year}-${String(solar.month).padStart(2, '0')}-${String(solar.day).padStart(2, '0')}`
    }

    // ✅ 안전한 시간 문자열 처리
    const safeTime = (() => {
      const t = String(birthTime ?? '').trim()
      if (!t) {
        return '00:00:00'
      }
      if (/^\d{1,2}:\d{2}$/.test(t)) {
        return `${t}:00`
      }
      if (/^\d{1,2}$/.test(t)) {
        return `${t.padStart(2, '0')}:00:00`
      }
      // AM/PM 등 비표준 표기 — parseHourMinute 로 24h 정규화. 이게 없으면
      // SajuTimeSchema 가 허용하는 "11:30 PM" 같은 값이 그대로 ISO 문자열에
      // 들어가 toDate → Invalid Date → 전체 계산이 throw 하던 버그.
      const { h, m } = parseHourMinute(t)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    })()

    const isoString = `${solarBirthDateStr}T${safeTime}`
    const birthDateTime = toDate(isoString, { timeZone: timezone })
    const birthLocal = toDate(isoString, { timeZone: timezone })

    if (isNaN(birthLocal.getTime())) {
      logger.error('[saju.ts] ❌ Invalid birthLocal:', {
        birthDate,
        birthTime,
        isoString,
        timezone,
      })
      throw new Error('Invalid birthLocal date object')
    }

    // Y, M, D — timezone-aware year/month/day at the birthplace. The
    // previous code read birthDateTime.getFullYear() / getMonth() which
    // returns the server's *UTC* year/month, so a birth at 1989-12-31
    // 23:30 LA (UTC-8) became 1990-01-01 once it landed on the UTC
    // server, and the year/month pillar was computed against 1990
    // instead of 1989. Use the Intl-formatted values everywhere — they
    // already powered the day-pillar JDN below.
    // ── 진경도(평균태양시) 보정 — longitude 있으면 출생 instant *자체*를 옮긴다.
    //    예전엔 시주(時) lookup 에만 보정분을 더해, 자정·입춘·절기 경계에서 년/월/일은
    //    보정 안 된 생(raw) 시각으로 계산되는 불일치가 있었다. 이제 네 기둥 모두 이
    //    effectiveDateTime 한 기준에서 뽑는다 (시주 lookup 의 +correctionMin 과 동일 값).
    //    longitude 없으면 보정 0 → effectiveDateTime == birthDateTime (옛 동작 보존).
    const solarCorrectionMin = solarTimeCorrectionMinutes(birthDateTime, longitude, timezone)
    const effectiveDateTime = new Date(birthDateTime.getTime() + solarCorrectionMin * 60_000)

    const fmtNum = (opt: Intl.DateTimeFormatOptions) =>
      Number(
        new Intl.DateTimeFormat('en-US', { timeZone: timezone, ...opt }).format(effectiveDateTime)
      )
    const Y = fmtNum({ year: 'numeric' })
    const M = fmtNum({ month: '2-digit' })
    const D = fmtNum({ day: '2-digit' })

    const year = Y
    assertKasiYearInRange(year)
    const month = M

    /* ---------------- 연기둥 ---------------- */
    const ipchunUTC = getSolarTermKST(year, 2)
    if (!ipchunUTC) {
      throw new Error(`Cannot determine Saju year: solar term data missing for ${year}`)
    }
    const sajuYear = effectiveDateTime < ipchunUTC ? year - 1 : year
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
    if (effectiveDateTime < termUTC_thisMonth) {
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
    const { stemIndex: dayStemIndex, branchIndex: dayBranchIndex } = computeDayPillarIndices(
      Y,
      M,
      D
    )
    const dayPillar = { stem: STEMS[dayStemIndex], branch: BRANCHES[dayBranchIndex] }
    const dayMaster: StemBranchInfo = {
      ...dayPillar.stem,
      graphId: toStemId(dayPillar.stem.name) ?? undefined,
      elementGraphId: toSajuElementId(dayPillar.stem.element) ?? undefined,
    }

    /* ---------------- 시기둥 ----------------
     * 두 가지 모드:
     *
     *  A) longitude 있음 — 진경도(진태양시) 보정. 전세계 일관 정통 사주학.
     *     보정 분 = (longitude - 표준자오선) × 4. 표준자오선은 timezone 의
     *     UTC offset × 15 (KST = +9h → 135°E, JST = +9h → 135°E, 동남아 +7h
     *     → 105°E, 미동부 -5h → -75°E …). PLAIN_HOUR_RANGES (정시 경계).
     *     예: 부산 (129.07°E, KST) → 보정 -23분 → 시계시 11:00 = 진태양시 10:37
     *
     *  B) longitude 없음 — 옛 동작 보존 (한국 LMT +30 / KMT / DST 분기). 옛
     *     사용자/캐시와 결과 호환.
     */
    const { h: hour, m: minute } = parseHourMinute(birthTime)
    const birthUtcMs = birthDateTime.getTime()

    let totalMin: number
    let ranges: typeof LMT_HOUR_RANGES
    if (typeof longitude === 'number' && Number.isFinite(longitude)) {
      // 위에서 네 기둥 보정에 쓴 그 값(SSOT) 재사용 — 시·일 보정 분리 방지.
      totalMin = hour * 60 + minute + solarCorrectionMin
      ranges = PLAIN_HOUR_RANGES
    } else {
      const useLmtRanges = applyKoreanLmtCorrection(birthUtcMs, timezone)
      const lookupOffsetMin = getHourLookupOffsetMin(birthUtcMs, timezone)
      totalMin = hour * 60 + minute + lookupOffsetMin
      ranges = useLmtRanges ? LMT_HOUR_RANGES : PLAIN_HOUR_RANGES
    }
    // candidate 보정 — totalMin 이 음수일 수 있으므로 양수로 정규화 후 [0, 1440) 범위로 회수.
    const normTotalMin = ((totalMin % 1440) + 1440) % 1440
    const candidates = [normTotalMin, normTotalMin + 24 * 60]
    let hourBranchIndex = 0
    outer: for (const t of candidates) {
      for (const r of ranges) {
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

    // 대운수 거리는 절기 경계와 *같은 시간 기준*으로 재야 한다. sajuMonth/sajuYear
    // 경계는 effectiveDateTime(평균태양시 보정)으로 정해지는데, 거리만 raw
    // birthDateTime 으로 재면 경도 보정분(최대 ±수십 분)만큼 대운수가 어긋난다.
    // 경도 없으면 effectiveDateTime == birthDateTime 이라 옛 동작 그대로 보존.
    const diffToTermMs = isForward
      ? nextTermUTC.getTime() - effectiveDateTime.getTime()
      : effectiveDateTime.getTime() - prevTermUTC.getTime()
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
    ;[yearPillar, monthPillar, dayPillar, timePillar].forEach((p) => {
      fiveElementsCount[p.stem.element]++
      fiveElementsCount[p.branch.element]++
    })

    const yNowLocal = Number(
      new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric' }).format(now)
    )
    const mNowLocal = Number(
      new Intl.DateTimeFormat('en-US', { timeZone: timezone, month: 'numeric' }).format(now)
    )
    // 만 나이 — 출생지 시간대 기준 (자정 경계 사용자에서 ±1 회귀 방지).
    // currentManAge 가 SSOT — 사주/점성 전체가 만 나이 한 컨벤션이라 화면
    // 어디서나 동일 값 보장. 대운 list 의 d.age 도 만 나이라 비교 일관.
    const currentAge = currentManAge({
      birthYear: Y,
      birthMonth: M,
      birthDate: D,
      birthTimeZone: timezone,
      now,
    })
    const currentLuckPillar =
      daeWoonList
        .slice()
        .reverse()
        .find((d) => currentAge >= d.age) || daeWoonList[0]

    // 연운 (현재 연도부터 6년치) — stem-branch 산술은 cycles.ts(single source) 위임.
    // baseAllDataPrompt/어댑터가 기대하는 wide shape(ganji/element 포함) 으로 매핑.
    const annualCycles: AnnualCycleData[] = []
    for (let i = 0; i < 6; i++) {
      const yr = yNowLocal + i
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

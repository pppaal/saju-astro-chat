// src/lib/Saju/timezone.ts

import { logger } from '@/lib/logger'
import { normalizeTimeZone } from '@/lib/datetime/timezone'
import { ZONE_REFERENCE_POINTS, ZONE_LINKS } from './zoneReference.generated'

export function getSupportedTimezones(): string[] {
  const anyIntl = Intl
  if (typeof anyIntl?.supportedValuesOf === 'function') {
    try {
      const list = anyIntl.supportedValuesOf('timeZone') as string[]
      if (Array.isArray(list) && list.length > 0) {
        return list.slice().sort((a, b) => a.localeCompare(b))
      }
    } catch {
      // fall through
    }
  }

  const fallback = [
    'UTC',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Moscow',
    'Africa/Cairo',
    'Africa/Johannesburg',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Bangkok',
    'Asia/Jakarta',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Singapore',
    'Australia/Sydney',
    'Pacific/Auckland',
    'America/St_Johns',
    'America/Halifax',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'America/Sao_Paulo',
    'America/Mexico_City',
  ]

  // 런타임에서 실제 지원되는 것만 남기기
  const valid = fallback.filter((tz) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz })
      return true
    } catch {
      return false
    }
  })

  return valid.slice().sort((a, b) => a.localeCompare(b))
}

export function getUserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return typeof tz === 'string' && tz ? tz : 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * 내부 캐시: 같은 timeZone에 대해 Intl.DateTimeFormat 인스턴스를 재사용하여 성능 개선
 * 주의: Node 런타임의 ICU 구성에 따라 지원 타임존이 달라질 수 있음(컨테이너/이미지별 차이).
 */
const dtfCache = new Map<string, Intl.DateTimeFormat>()

/**
 * 주어진 UTC 시각(instantUTC)에서 특정 timeZone의 오프셋(분)을 계산
 * 반환값: offset minutes (예: KST는 540)
 * 유효하지 않은 timeZone 등 오류 시 0을 반환(UTC와 구분 필요하면 로직을 number | null로 바꿔도 됨)
 */
export function getOffsetMinutes(instantUTC: Date, timeZone: string): number {
  // timeZone 유효성 확인: 잘못되면 UTC로 처리(여기선 0 리턴)
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
  } catch {
    return 0
  }

  let dtf = dtfCache.get(timeZone)
  if (!dtf) {
    try {
      dtf = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      dtfCache.set(timeZone, dtf)
    } catch {
      return 0
    }
  }

  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = dtf.formatToParts(instantUTC)
  } catch {
    return 0
  }

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value])) as Record<string, string>
  const y = Number(map.year)
  const mo = Number(map.month)
  const d = Number(map.day)
  // Some ICU implementations return "24" for midnight instead of "00"
  const h = Number(map.hour) % 24
  const mi = Number(map.minute)
  const s = Number(map.second)

  if (![y, mo, d, h, mi, s].every((n) => Number.isFinite(n))) {
    return 0
  }

  const isoLocal = `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  const localAsUTC = new Date(isoLocal + 'Z')
  const diffMs = localAsUTC.getTime() - instantUTC.getTime()
  return Math.round(diffMs / 60000)
}

/** 제품 기본 출생지 — 서울 시청. 좌표 미상 Asia/Seoul 출생의 기준점(OD-2). */
export const SEOUL_DEFAULT_LOCATION = { latitude: 37.5665, longitude: 126.978 } as const

/** 경도가 존 표준자오선에서 이보다 멀면 잘못 짝지은 값으로 보고 버린다(OD-14).
 *  정상 최대치는 약 44°(Asia/Shanghai 아래 카슈가르, 서머타임 시기 59°). */
const LONGITUDE_SANITY_BOUND_DEG = 60

/** 표에 없는 존(Etc/*·UTC 등 고정 offset)의 offset 을 읽는 고정 시점 — 시계를 읽지 않는다. */
const FIXED_OFFSET_REFERENCE_INSTANT = new Date(Date.UTC(2000, 0, 1))

/** 각도 차이를 (−180, 180] 로 감는다 — 날짜변경선 근처 존(Kiritimati +14 등)용. */
function wrapDegrees(d: number): number {
  const w = ((((d + 180) % 360) + 360) % 360) - 180
  return w === -180 ? 180 : w
}

/**
 * 존 기준점 — 그 IANA 존 대표 도시의 위도·경도 (tzdata zone1970.tab, OD-2).
 * - Asia/Seoul(및 별칭 ROK) = SEOUL_DEFAULT_LOCATION (126.978°E) — 경도 없는 서울
 *   출생과 앱의 서울 기본값이 *구조적으로* 같은 시주를 낸다.
 * - 그 외 존 = zoneReference.generated.ts (zone1970.tab → zone.tab → 링크).
 * - Etc/*·UTC·표에 없는 존 = offset × 15 (위도 0).
 */
export function zoneReferencePoint(timeZone: string): { latitude: number; longitude: number } {
  const name = ZONE_REFERENCE_POINTS[timeZone] ? timeZone : ZONE_LINKS[timeZone]
  if (name === 'Asia/Seoul') return { ...SEOUL_DEFAULT_LOCATION }
  const p = name ? ZONE_REFERENCE_POINTS[name] : undefined
  if (p) return { latitude: p[0], longitude: p[1] }
  return {
    latitude: 0,
    longitude: (getOffsetMinutes(FIXED_OFFSET_REFERENCE_INSTANT, timeZone) / 60) * 15,
  }
}

/** 존 기준 경도 — 경도 미상 출생의 평균태양시 기준(OD-2). zoneReferencePoint 참조. */
export function zoneReferenceLongitude(timeZone: string): number {
  return zoneReferencePoint(timeZone).longitude
}

/**
 * 좌표 미상 출생의 기본 경도 — 호출부(캘린더·리포트·상담사·궁합)는 맨 126.978 대신
 * 이것을 쓴다. 비한국 타임존에 서울 경도를 붙이면 시주가 ~15시간 밀린다(SAJU-9).
 * 빈·잘못된 타임존은 Asia/Seoul 로 본다(normalizeTimeZone).
 */
export function defaultLongitudeFor(timeZone: string | null | undefined): number {
  return zoneReferenceLongitude(normalizeTimeZone(timeZone))
}

/** 좌표 미상 출생의 기본 위도 — defaultLongitudeFor 와 같은 존 기준점. */
export function defaultLatitudeFor(timeZone: string | null | undefined): number {
  return zoneReferencePoint(normalizeTimeZone(timeZone)).latitude
}

// 같은 (존, 경도) 경고는 한 번만 — 캘린더 시진 추출기가 날마다 부른다.
const warnedLongitudes = new Set<string>()

/** 보정에 쓸 경도 — 미상이면 존 기준 경도, 존 자오선에서 60° 넘게 떨어지면 버리고 존 기준 경도. */
function effectiveLongitude(
  longitude: number | undefined | null,
  timeZone: string,
  standardMeridian: number
): number {
  if (typeof longitude !== 'number' || !Number.isFinite(longitude)) {
    return zoneReferenceLongitude(timeZone)
  }
  if (Math.abs(wrapDegrees(longitude - standardMeridian)) > LONGITUDE_SANITY_BOUND_DEG) {
    const key = `${timeZone}|${longitude}`
    if (!warnedLongitudes.has(key) && warnedLongitudes.size < 500) {
      warnedLongitudes.add(key)
      logger.warn('[saju/timezone] longitude ignored: too far from the zone meridian', {
        timeZone,
        longitude,
        standardMeridian,
      })
    }
    return zoneReferenceLongitude(timeZone)
  }
  return longitude
}

/**
 * 평균태양시(진경도) 보정분 — 시계 시각을 출생지(또는 위치) 해 기준으로 옮기는 분(分).
 *
 *   보정분 = round((경도 − 표준자오선) × 4)
 *   표준자오선 = 그 instant 의 타임존 UTC offset(분) / 60 × 15   (KST=135°, 베이징=120°, EST=−75° …)
 *   평균태양시 = 시계 시각 + 보정분  (= UT + 경도 × 4분)
 *
 * 이것이 사주 시각 보정의 **단일 진실원천(SSOT)** 이다. 본명 시주(saju.ts)·
 * 달력 시진(saju-hour.ts)이 *전부* 이 함수만 호출한다 — 복붙 금지.
 *
 * - longitude 미상/비유한 → 존 기준 경도(zoneReferenceLongitude, OD-2). Asia/Seoul 은
 *   126.978 이라 경도 없는 서울 출생 = 서울 기본값 출생. 옛 '한국 LMT +30분' 표·
 *   한국 DST 윈도우·1월/7월 DST 추정은 이 한 경로로 대체됐다 — offset 이 이미
 *   DST·KMT 를 담고 있어 DST 를 따로 추정할 필요가 없다.
 * - 존 표준자오선에서 60° 넘게 떨어진 경도(LA 타임존 + 서울 경도 같은 잘못된 짝)는
 *   버리고 존 기준 경도를 쓴다 + 경고 로그(OD-14, SAJU-9).
 * - 균시차(equation of time, ±16분)는 적용하지 않는다(평균태양시). 천안/부산 같은
 *   경도 차이를 잡는 게 목적이고, 균시차는 별개 정밀도 옵션. docs/SOLAR_TIME_CONVENTION.md.
 * - DST 반영 위해 instant 별로 offset 을 구한다(getOffsetMinutes 가 그 시점 offset 산출).
 */
export function solarTimeCorrectionMinutes(
  instantUTC: Date,
  longitude: number | undefined | null,
  timeZone: string
): number {
  const standardMeridian = (getOffsetMinutes(instantUTC, timeZone) / 60) * 15
  const lon = effectiveLongitude(longitude, timeZone, standardMeridian)
  return Math.round(wrapDegrees(lon - standardMeridian) * 4)
}

/**
 * 출생 instant 의 평균태양시 — 하루 중 분 [0, 1440). 시주 lookup 의 유일한 입력.
 *   = 그 instant 의 출생지 벽시계 분 + solarTimeCorrectionMinutes  (= UT + 경도 × 4분)
 * 벽시계는 입력 문자열이 아니라 instant 에서 다시 읽는다 — 서머타임 공백 시각은
 * resolveBirthInstant 가 앞으로 민 instant 라, 입력 문자열 + 보정분은 1시간 어긋난다.
 */
export function meanSolarMinuteOfDay(
  instantUTC: Date,
  longitude: number | undefined | null,
  timeZone: string
): number {
  const utMinutes = Math.floor(
    (((instantUTC.getTime() % 86_400_000) + 86_400_000) % 86_400_000) / 60_000
  )
  const wallMinutes = utMinutes + getOffsetMinutes(instantUTC, timeZone)
  const total = wallMinutes + solarTimeCorrectionMinutes(instantUTC, longitude, timeZone)
  return ((total % 1440) + 1440) % 1440
}

export function formatOffset(offsetMin: number): string {
  const sign = offsetMin >= 0 ? '+' : '-'
  const h = Math.floor(Math.abs(offsetMin) / 60)
  const m = Math.abs(offsetMin) % 60
  return `UTC${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

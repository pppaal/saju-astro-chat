// src/lib/Saju/timezone.ts

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

/**
 * 평균태양시(진경도) 보정분 — 시계 시각을 출생지(또는 위치) 해 기준으로 옮기는 분(分).
 *
 *   보정분 = round((경도 − 표준자오선) × 4)
 *   표준자오선 = 그 instant 의 타임존 UTC offset(분) / 60 × 15   (KST=135°, 베이징=120°, EST=−75° …)
 *   평균태양시 = 시계 시각 + 보정분
 *
 * 이것이 사주 시각 보정의 **단일 진실원천(SSOT)** 이다. 본명 네 기둥(saju.ts)·
 * 달력 시진(saju-hour.ts)이 *전부* 이 함수만 호출한다 — 복붙 금지.
 *
 * - longitude 미상/비유한 → 0 (보정 없음, 옛 동작 보존).
 * - 균시차(equation of time, ±16분)는 적용하지 않는다(평균태양시). 천안/부산 같은
 *   경도 차이를 잡는 게 목적이고, 균시차는 별개 정밀도 옵션. docs/SOLAR_TIME_CONVENTION.md.
 * - DST 반영 위해 instant 별로 offset 을 구한다(getOffsetMinutes 가 그 시점 offset 산출).
 */
export function solarTimeCorrectionMinutes(
  instantUTC: Date,
  longitude: number | undefined | null,
  timeZone: string
): number {
  if (typeof longitude !== 'number' || !Number.isFinite(longitude)) return 0
  const standardMeridian = (getOffsetMinutes(instantUTC, timeZone) / 60) * 15
  return Math.round((longitude - standardMeridian) * 4)
}

/**
 * 그 해(연도)의 표준(비 DST) offset(분). DST 는 항상 시계를 앞당기므로,
 * 1월/7월 offset 중 *작은 쪽* 이 표준 offset 이다(남·북반구 모두 성립).
 * Intl 만으로 timeZone+instant 에서 순수 유도 — 새 입력 데이터 불필요.
 */
function getStandardOffsetMinutes(instantUTC: Date, timeZone: string): number {
  const y = instantUTC.getUTCFullYear()
  const jan = getOffsetMinutes(new Date(Date.UTC(y, 0, 1, 12)), timeZone)
  const jul = getOffsetMinutes(new Date(Date.UTC(y, 6, 1, 12)), timeZone)
  return Math.min(jan, jul)
}

/**
 * `instantUTC` 시점의 DST 적용분(분). 표준시면 0, DST 면 보통 60.
 * 시지(시주) 산정 전에 시계의 DST 인공물을 제거하는 데 쓴다 — DST 는 민간
 * 시계 규약일 뿐 천문학적 의미가 없어, 2시간 지지 버킷 경계를 한 시간 밀어
 * 잘못된 시지를 만든다. longitude(진태양시) 경로는 이미 offset 에 DST 가
 * 반영돼 별도 처리 불필요; 이 함수는 longitude 미상(옛 동작) 경로용이다.
 */
export function getDstAmountMinutes(instantUTC: Date, timeZone: string): number {
  return getOffsetMinutes(instantUTC, timeZone) - getStandardOffsetMinutes(instantUTC, timeZone)
}

export function formatOffset(offsetMin: number): string {
  const sign = offsetMin >= 0 ? '+' : '-'
  const h = Math.floor(Math.abs(offsetMin) / 60)
  const m = Math.abs(offsetMin) % 60
  return `UTC${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

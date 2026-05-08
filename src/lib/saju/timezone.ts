// src/lib/saju/timezone.ts

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

export function formatOffset(offsetMin: number): string {
  const sign = offsetMin >= 0 ? '+' : '-'
  const h = Math.floor(Math.abs(offsetMin) / 60)
  const m = Math.abs(offsetMin) % 60
  return `UTC${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

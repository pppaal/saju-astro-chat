/**
 * compat 최근 본 관계 (페어) localStorage helper.
 *
 * 사용자가 매번 두 사람 카드를 다시 입력하는 게 번거롭다는 피드백 →
 * 궁합 상담사에 진입할 때마다 현재 페어를 저장하고, 다음 번 입력 페이지
 * 진입 / 상담사 헤더 sticky 바에서 최근 페어 popover 로 재사용.
 *
 * 저장 위치: localStorage 'compat_recent_pairs_v1' (max 5).
 * 가장 최근 = index 0. 같은 페어가 다시 들어오면 위로 끌어올림(중복 X).
 */

const STORAGE_KEY = 'compat_recent_pairs_v1'
const MAX_PAIRS = 5

export interface RecentPairPerson {
  name: string
  date: string
  time: string
  gender?: 'M' | 'F' | 'Male' | 'Female'
  cityQuery: string
  lat: number | null
  lon: number | null
  timeZone: string
  relation?: string
  timeUnknown?: boolean
}

export interface RecentPair {
  /** 두 사람 정보. 첫 번째 = 본인 / 두 번째 = 상대. */
  persons: [RecentPairPerson, RecentPairPerson]
  /** 마지막 본 시각 (ms). 정렬 / "5일 전" 같은 표시용. */
  lastUsedAt: number
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/** 페어 동일성 — 두 사람 이름 + 생일이 모두 일치하면 같은 페어로 본다.
 *  (도시·시간 등은 한쪽이 빠진 채 저장됐을 수 있으니 키로 안 씀.) */
function pairKey(p: RecentPair): string {
  const a = p.persons[0]
  const b = p.persons[1]
  return [a.name.trim(), a.date, b.name.trim(), b.date].join('|')
}

export function getRecentPairs(): RecentPair[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is RecentPair => {
      if (!entry || typeof entry !== 'object') return false
      const e = entry as Partial<RecentPair>
      return (
        Array.isArray(e.persons) &&
        e.persons.length === 2 &&
        !!e.persons[0]?.name &&
        !!e.persons[1]?.name &&
        typeof e.lastUsedAt === 'number'
      )
    })
  } catch {
    return []
  }
}

export function getLatestPair(): RecentPair | null {
  return getRecentPairs()[0] ?? null
}

/** 현재 페어를 최근 리스트에 push (중복은 위로 끌어올림 + 최대 5개 유지). */
export function pushRecentPair(persons: [RecentPairPerson, RecentPairPerson]): void {
  if (!isBrowser()) return
  if (!persons[0]?.name?.trim() || !persons[1]?.name?.trim()) return
  try {
    const next: RecentPair = { persons, lastUsedAt: Date.now() }
    const key = pairKey(next)
    const existing = getRecentPairs().filter((p) => pairKey(p) !== key)
    const merged = [next, ...existing].slice(0, MAX_PAIRS)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch {
    // localStorage quota / private mode — silently skip.
  }
}

export function removeRecentPair(persons: [RecentPairPerson, RecentPairPerson]): void {
  if (!isBrowser()) return
  try {
    const key = pairKey({ persons, lastUsedAt: 0 })
    const filtered = getRecentPairs().filter((p) => pairKey(p) !== key)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch {
    /* ignore */
  }
}

import { normalizeGender } from '@/lib/utils/gender'
import { currentManAge } from '@/lib/datetime/currentAge'
import { resolveBirthTimeAnchor } from '@/lib/saju/birthTimeAnchor'
import type { ChatMessage } from '@/lib/api'

function clampMessages(messages: ChatMessage[], max = 8) {
  return messages.slice(-max)
}

type PersonSeed = {
  date: string
  /** 계산 앵커 (HH:MM). 시간 미상이면 정오(TIME_UNKNOWN_ANCHOR) — birthTimeAnchor SSOT. */
  time: string
  /** 시간 미상 여부 — 시주/ASC/MC/하우스 마스킹용. */
  timeUnknown: boolean
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string
  source: {
    usedDefaultLocation: boolean
    usedDefaultTimezone: boolean
    usedDefaultGender: boolean
  }
}

function parseDateString(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const normalized = input.trim().replace(/\./g, '-')
  const m = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseTimeString(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const normalized = input.trim()
  const m = normalized.match(/^(\d{1,2})(?::(\d{1,2}))?/)
  if (!m) return null
  const hour = Number(m[1])
  const minute = Number(m[2] ?? '0')
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function buildPersonSeed(person: Record<string, unknown> | null | undefined): PersonSeed | null {
  if (!person) return null
  const date = parseDateString(person.birthDate ?? person.date)
  // 시간 모름 → 정오 앵커(SSOT: birthTimeAnchor). 예전 '00:00' 폴백은 진태양시
  // 보정(-32분)으로 일주가 전날로 밀려, LLM 컨텍스트의 사주가 차트/통합리포트와
  // 달랐다. 명시 플래그(timeUnknown/birthTimeUnknown)와 '00:00' 입력 둘 다 미상.
  const { time, timeUnknown } = resolveBirthTimeAnchor(
    parseTimeString(person.birthTime ?? person.time),
    person.timeUnknown === true || person.birthTimeUnknown === true
  )
  if (!date) return null

  const latRaw = typeof person.latitude === 'number' ? person.latitude : null
  const lonRaw = typeof person.longitude === 'number' ? person.longitude : null
  const hasLocation = latRaw !== null && lonRaw !== null
  const latitude = hasLocation ? latRaw : 37.5665
  const longitude = hasLocation ? lonRaw : 126.978

  const tzRaw = typeof person.timeZone === 'string' ? person.timeZone.trim() : ''
  const timeZone = tzRaw.length > 0 ? tzRaw : 'Asia/Seoul'

  // 공용 normalizer — 'F' / 'Female' / 'female' / 'f' / 'M' / 'Male' 다 처리.
  // 이전 `lowercase === 'female'` 패턴은 'F' 가 'f' 로 떨어져 매칭 실패 →
  // 여자 사용자 'male' 로 잘못 분류 → 대운 순/역행 거꾸로.
  const genderInput = typeof person.gender === 'string' ? person.gender : undefined
  const normalized = normalizeGender(genderInput)
  const gender: 'male' | 'female' = normalized === 'female' ? 'female' : 'male'

  return {
    date,
    time,
    timeUnknown,
    gender,
    latitude,
    longitude,
    timeZone,
    source: {
      usedDefaultLocation: !hasLocation,
      usedDefaultTimezone: tzRaw.length === 0,
      // normalizer 가 'male'/'female' 둘 다 확정 못 한 경우 = 입력이 빠지거나
      // 알 수 없는 포맷 → 'male' fallback 을 썼다는 의미.
      usedDefaultGender: normalized !== 'male' && normalized !== 'female',
    },
  }
}

// 만 나이는 currentManAge(SSOT)에 위임. 예전엔 `new Date(date)`(=UTC 자정)와
// 서버-로컬 `new Date()` 필드를 섞어, 생일·연말 경계에서 ±1 어긋날 수 있었고
// 상담사/대운 화면이 쓰는 만나이와 기준이 갈렸다. birthTimeZone 을 주면 그
// 시간대 기준으로 계산(없으면 'Asia/Seoul' — buildPersonSeed 기본 tz 와 동일).
function getAgeFromBirthDate(date?: string, birthTimeZone = 'Asia/Seoul'): number {
  const parsed = parseDateString(date)
  if (!parsed) return 30
  const [y, m, d] = parsed.split('-').map(Number)
  return currentManAge({
    birthYear: y,
    birthMonth: m,
    birthDate: d,
    birthTimeZone,
  })
}

export { clampMessages, buildPersonSeed, getAgeFromBirthDate }

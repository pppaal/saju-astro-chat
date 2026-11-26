import { normalizeGender } from '@/lib/utils/gender'
import { currentManAge } from '@/lib/datetime/currentAge'
import { resolveBirthTimeAnchor } from '@/lib/saju/birthTimeAnchor'
import { defaultLatitudeFor, defaultLongitudeFor } from '@/lib/saju/timezone'
import { resolveBirthTimezoneStrict } from '@/lib/datetime/resolveTimezone'
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
  // 달랐다. 플래그는 tri-state — 명시 boolean 이면 신뢰(false + '00:00' = 실제
  // 자정 출생), 미전송(레거시 클라)이면 undefined 로 두어 '00:00'=미상 휴리스틱.
  const flagRaw = person.timeUnknown ?? person.birthTimeUnknown
  const { time, timeUnknown } = resolveBirthTimeAnchor(
    parseTimeString(person.birthTime ?? person.time),
    typeof flagRaw === 'boolean' ? flagRaw : undefined
  )
  if (!date) return null

  const latRaw = typeof person.latitude === 'number' ? person.latitude : null
  const lonRaw = typeof person.longitude === 'number' ? person.longitude : null
  const hasLocation = latRaw !== null && lonRaw !== null

  const tzRaw = typeof person.timeZone === 'string' ? person.timeZone.trim() : ''
  // 출생 타임존 — 명시 tz → 출생 좌표(도시)의 tz. 둘 다 없으면 seed 를 만들지 않는다(서울
  // 기둥을 지어내지 않음). 라우트는 그 사람을 차감 전에 422 로 거른다(G13).
  const tzResolved = resolveBirthTimezoneStrict({
    timezone: tzRaw,
    latitude: hasLocation ? latRaw : undefined,
    longitude: hasLocation ? lonRaw : undefined,
  })
  if (!tzResolved) return null
  const timeZone = tzResolved.timeZone
  // 좌표 미상 → 출생 타임존 기준점(존 기준 좌표, OD-2·SAJU-9).
  const latitude = hasLocation ? latRaw : defaultLatitudeFor(timeZone)
  const longitude = hasLocation ? lonRaw : defaultLongitudeFor(timeZone)

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
      // normalizer 가 'male'/'female' 둘 다 확정 못 한 경우 = 입력이 빠지거나
      // 알 수 없는 포맷 → 'male' fallback 을 썼다는 의미.
      usedDefaultGender: normalized !== 'male' && normalized !== 'female',
    },
  }
}

// 만 나이는 currentManAge(SSOT)에 위임. 예전엔 `new Date(date)`(=UTC 자정)와
// 서버-로컬 `new Date()` 필드를 섞어, 생일·연말 경계에서 ±1 어긋날 수 있었고
// 상담사/대운 화면이 쓰는 만나이와 기준이 갈렸다. birthTimeZone 기준으로 계산한다 —
// 출생 tz 를 모르는 사람(3번째 이후 인원)은 UTC 날짜로 센다(서울 기본값 없음, G13).
// now 는 라우트가 요청 경계에서 한 번 읽어 넘긴다(미지정이면 호출 시각).
function getAgeFromBirthDate(date?: string, birthTimeZone?: string, now?: Date): number {
  const parsed = parseDateString(date)
  if (!parsed) return 30
  const [y, m, d] = parsed.split('-').map(Number)
  return currentManAge({
    birthYear: y,
    birthMonth: m,
    birthDate: d,
    birthTimeZone: birthTimeZone || 'UTC',
    now,
  })
}

export { clampMessages, buildPersonSeed, getAgeFromBirthDate }

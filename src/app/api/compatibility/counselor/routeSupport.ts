import { normalizeGender } from '@/lib/utils/gender'
import type { ChatMessage } from '@/lib/api'

function clampMessages(messages: ChatMessage[], max = 8) {
  return messages.slice(-max)
}

type PersonSeed = {
  date: string
  time: string
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
  const time = parseTimeString(person.birthTime ?? person.time) || '00:00'
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

function getAgeFromBirthDate(date?: string): number {
  if (!date) return 30
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return 30
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1
  return Math.max(0, age)
}

export { clampMessages, buildPersonSeed, getAgeFromBirthDate }

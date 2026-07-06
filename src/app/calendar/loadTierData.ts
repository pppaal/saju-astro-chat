/* ============================================================
   loadTierData — /calendar 와 /destiny 가 공유하는 서버 데이터 로더.
   ───────────────────────────────────────────────────────────
   세션·본명 가드 → NatalContext + cells(DB 캐시) → assembleTiers 까지
   한 경로로 모은다. 두 surface 가 같은 어셈블 결과({lifetime/decade/year/
   month/day})를 받아, 각자 보여줄 티어만 골라 렌더한다.

   scope:
     · 'month' — 그 달만 빌드(저비용). 캘린더(월/일) 기본.
     · 'year'  — 1년 풀빌드(연/대운 티어가 필요로 함). 인생 뷰(/destiny).
   ============================================================ */

import { headers } from 'next/headers'
import { detectServerLocale } from '@/i18n/server'
import { getServerSession } from '@/lib/auth/session'
import { getClientIp } from '@/lib/request-ip'
import { rateLimit } from '@/lib/cache/redis-rate-limit'
import { prisma } from '@/lib/db/prisma'
import {
  getOrBuildNatalContext,
  getOrBuildYearCells,
  getOrBuildMonthCells,
  getFocusDayCell,
} from '@/lib/calendar-engine/persistence'
import { assembleTiers, type AssembledTiers } from './assembleTiers'
import { assembleLifetime, type AssembledLifetime } from './assembleLifetime'
import { getNowInTimezone, formatDateString } from '@/lib/datetime/timezone'

export type TierScope = 'month' | 'year'

export type LoadTierResult =
  | { kind: 'login' }
  | { kind: 'no-birth' }
  // 익명 + 무입력 — 임의 샘플 대신 생년월일 입력 게이트를 띄운다(lang 전달).
  | { kind: 'guest'; lang: 'ko' | 'en' }
  // 익명 override 빌드 IP 한도 초과 — 잠시 후 재시도 안내.
  | { kind: 'rate-limited'; lang: 'ko' | 'en' }
  | ({ kind: 'ok'; lang: 'ko' | 'en' } & AssembledTiers)

export type LoadLifetimeResult =
  | { kind: 'login' }
  | { kind: 'no-birth' }
  | { kind: 'guest'; lang: 'ko' | 'en' }
  | { kind: 'rate-limited'; lang: 'ko' | 'en' }
  | ({ kind: 'ok'; lang: 'ko' | 'en' } & AssembledLifetime)

// 쿼리파라미터로 들어온 생일 — 로그인 없이도 캘린더/인생흐름을 그 사람 기준으로
// 빌드한다(통합 리포트와 같은 규약: date/time/lat/lng/tz/gender).
export interface BirthOverride {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string
  place?: string
  name?: string
}

type SP = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v)

// searchParams → BirthOverride. date(YYYY-MM-DD)가 있어야 override 로 인정한다.
// 없으면 null → 세션(로그인 사용자) 또는 샘플(익명) 경로로 흐른다.
export function parseBirthOverride(sp: SP): BirthOverride | null {
  const date = one(sp.date)
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  // 빈 문자열/비숫자 좌표는 NaN 으로 떨궈 서울 기본으로 폴백(빈칸 → Number('')=0
  // 같은 잘못된 (0,0) 좌표 방지).
  const latRaw = one(sp.lat)
  const lngRaw = one(sp.lng)
  const lat = latRaw ? Number(latRaw) : NaN
  const lng = lngRaw ? Number(lngRaw) : NaN
  return {
    birthDate: date,
    birthTime: one(sp.time) || '12:00',
    gender: one(sp.gender) === 'female' ? 'female' : 'male',
    latitude: Number.isFinite(lat) ? lat : 37.5665,
    longitude: Number.isFinite(lng) ? lng : 126.978,
    timeZone: one(sp.tz) || 'Asia/Seoul',
    place: one(sp.place) || undefined,
    name: one(sp.name) || undefined,
  }
}

// DB UserProfile.gender → 'male' | 'female'. canonical 'female'/'male' 저장,
// 레거시 'F'/'M'/'U' 도 대소문자 무시 처리. 미상/기타는 male 기본.
function normalizeGender(g: string | null | undefined): 'male' | 'female' {
  const v = (g ?? '').trim().toLowerCase()
  if (v === 'female' || v === 'f') return 'female'
  return 'male'
}

export interface BirthInput {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string
}

export type SessionBirthResult =
  | { kind: 'anonymous' }
  | { kind: 'no-birth' }
  | { kind: 'ok'; birth: BirthInput; place: string | null }

/**
 * 세션(로그인 사용자)의 저장된 본명 — loadTierData 와 /api/calendar/day 가 공유.
 * 익명이면 'anonymous', 프로필 미완성이면 'no-birth'.
 */
export async function loadSessionBirth(): Promise<SessionBirthResult> {
  const session = await getServerSession()
  if (!session?.user?.id) return { kind: 'anonymous' }

  const userRow = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      profile: {
        select: {
          birthDate: true,
          birthTime: true,
          gender: true,
          birthCity: true,
          latitude: true,
          longitude: true,
          tzId: true,
        },
      },
    },
  })
  const profile = userRow?.profile
  const isBirthComplete =
    !!profile?.birthDate &&
    !!profile?.birthTime &&
    typeof profile?.latitude === 'number' &&
    typeof profile?.longitude === 'number' &&
    !!profile?.tzId
  if (!isBirthComplete || !profile) return { kind: 'no-birth' }

  return {
    kind: 'ok',
    birth: {
      birthDate: profile.birthDate!,
      birthTime: profile.birthTime!,
      gender: normalizeGender(profile.gender),
      latitude: profile.latitude!,
      longitude: profile.longitude!,
      timeZone: profile.tzId!,
    },
    place: profile.birthCity || null,
  }
}

// MM-DD 한국어 표기 — '1995.2.9 06:40'.
function formatBirthLine(birthDate: string, birthTime: string): string {
  const [y, m, d] = birthDate.split('-')
  const ymd = `${Number(y)}.${Number(m)}.${Number(d)}`
  return `${ymd} ${birthTime}`
}

/** 공용 본명 가드 — override(IP 한도) 또는 세션 본명. 두 로더가 공유. */
type BirthGuardResult =
  | { kind: 'guest' }
  | { kind: 'no-birth' }
  | { kind: 'rate-limited' }
  | { kind: 'ok'; birth: BirthInput; place: string }

async function resolveBirthGuard(
  override: BirthOverride | null | undefined,
  lang: 'ko' | 'en'
): Promise<BirthGuardResult> {
  if (override) {
    // 익명 override 빌드는 인증·rate-limit 없이 ?date=&lat= 변주로 무한 풀빌드
    // + 캐시 행 증식을 유발할 수 있다(DoS). IP 당 한도를 둔다 — 정상 '다른 사람
    // 보기'는 분당 수 회라 영향 없고, 스크립트 남용만 막는다.
    // Redis 없으면 fail-open(상태 없이는 제한 불가) — graceful.
    const ip = getClientIp(await headers())
    const rl = await rateLimit(`tier-override:${ip}`, { limit: 20, windowSeconds: 60 })
    if (!rl.allowed) return { kind: 'rate-limited' }
    return {
      kind: 'ok',
      birth: {
        birthDate: override.birthDate,
        birthTime: override.birthTime,
        gender: override.gender,
        latitude: override.latitude,
        longitude: override.longitude,
        timeZone: override.timeZone,
      },
      place: override.place || (lang === 'en' ? 'Seoul' : '서울'),
    }
  }
  const resolved = await loadSessionBirth()
  // 익명 + 무입력 — 임의 샘플로 풀이를 띄우지 않고 생년월일 입력 게이트로.
  // localStorage 에 저장된 생일이 있으면 클라이언트가 ?date=... 를 붙여
  // 자동으로 다시 연다(통합 리포트와 동일 규약).
  if (resolved.kind === 'anonymous') return { kind: 'guest' }
  if (resolved.kind === 'no-birth') return { kind: 'no-birth' }
  return {
    kind: 'ok',
    birth: resolved.birth,
    place: resolved.place || (lang === 'en' ? 'Seoul' : '미입력'),
  }
}

/**
 * 로그인 + 본명 가드를 통과하면 어셈블된 tier 데이터를, 아니면 fallback 종류를
 * 반환한다. 서버 컴포넌트(page.tsx)는 결과 kind 로 분기만 하면 된다.
 */
export async function loadTierData(
  scope: TierScope,
  override?: BirthOverride | null
): Promise<LoadTierResult> {
  const lang = await detectServerLocale()

  const guard = await resolveBirthGuard(override, lang)
  if (guard.kind === 'guest') return { kind: 'guest', lang }
  if (guard.kind === 'no-birth') return { kind: 'no-birth' }
  if (guard.kind === 'rate-limited') return { kind: 'rate-limited', lang }
  const BIRTH = guard.birth
  const place = guard.place
  const BIRTH_YEAR = Number(BIRTH.birthDate.split('-')[0])

  // '오늘' — 사용자 출생 타임존 기준(서버 UTC 와 무관하게 날짜 일관).
  // now 단일 기준: 같은 인스턴트를 deriver(currentManAge)까지 흘려 "현재 단계"가
  // TARGET_* 와 같은 날짜를 보게 한다(currentManAge 가 birthTimeZone 으로 포맷).
  const now = new Date()
  const today = getNowInTimezone(BIRTH.timeZone)
  const TARGET_YEAR = today.year
  const TARGET_MONTH = today.month
  const TARGET_DAY = today.day
  const targetDayIso = formatDateString(today.year, today.month, today.day)

  const natal = await getOrBuildNatalContext(BIRTH)
  // scope 에 맞춰 1년 ↔ 그 달만. evidence 가 필요한 그 하루는 따로(focusDayCell).
  // 월 scope 이고 오늘+7일이 월을 넘으면 다음 달 cells 도 얹는다 — "다가오는
  // 7일"이 월 경계에서 잘려 다음 달 초 큰 날이 안 보이던 문제(감사 #13).
  const lastDayOfMonth = new Date(Date.UTC(TARGET_YEAR, TARGET_MONTH, 0)).getUTCDate()
  const needNextMonth = scope === 'month' && TARGET_DAY + 7 > lastDayOfMonth
  const [nmY, nmM] = TARGET_MONTH === 12 ? [TARGET_YEAR + 1, 1] : [TARGET_YEAR, TARGET_MONTH + 1]
  const [cells, focusDayCell, nextMonthCells] = await Promise.all([
    scope === 'year'
      ? getOrBuildYearCells(BIRTH, natal, TARGET_YEAR, { includeEvidence: false })
      : getOrBuildMonthCells(BIRTH, natal, TARGET_YEAR, TARGET_MONTH, { includeEvidence: false }),
    getFocusDayCell(BIRTH, natal, targetDayIso),
    needNextMonth
      ? getOrBuildMonthCells(BIRTH, natal, nmY, nmM, { includeEvidence: false })
      : Promise.resolve(undefined),
  ])

  const birthDisplay = formatBirthLine(BIRTH.birthDate, BIRTH.birthTime)

  const assembled = await assembleTiers({
    natal,
    cells,
    lang,
    birthYear: BIRTH_YEAR,
    targetYear: TARGET_YEAR,
    targetMonth: TARGET_MONTH,
    targetDay: TARGET_DAY,
    targetDayIso,
    sex: BIRTH.gender === 'female' ? '여' : '남',
    birthDisplay,
    whoBirthLine: birthDisplay,
    place,
    focusDayCell,
    now,
    // 'month'(캘린더)면 숨은 상위 티어의 인생 곡선 계산을 건너뛴다(진입 속도).
    scope,
    nextMonthCells,
  })

  return { kind: 'ok', lang, ...assembled }
}

/**
 * /destiny(인생 흐름) 전용 경량 로더 — 연 cells 풀빌드 없이 natal 캐시 +
 * assembleLifetime 만. 예전엔 loadTierData('year')를 공유해 콜드 ~8초(연 셀
 * 2.9s 계산 + ~39MB 캐시 행 왕복)를 냈지만, 인생 티어는 연 cells 를 전혀 쓰지
 * 않는다(감사 의존성 표) — 이 로더는 ~0.4s(콜드)/~0.1s(natal 웜)로 같은 화면을
 * 만든다. 결과는 birthKey 순수 파생이라 DB 캐시도 두지 않는다.
 */
export async function loadLifetimeData(
  override?: BirthOverride | null
): Promise<LoadLifetimeResult> {
  const lang = await detectServerLocale()

  const guard = await resolveBirthGuard(override, lang)
  if (guard.kind === 'guest') return { kind: 'guest', lang }
  if (guard.kind === 'no-birth') return { kind: 'no-birth' }
  if (guard.kind === 'rate-limited') return { kind: 'rate-limited', lang }
  const BIRTH = guard.birth
  const place = guard.place
  const BIRTH_YEAR = Number(BIRTH.birthDate.split('-')[0])

  const now = new Date()
  const today = getNowInTimezone(BIRTH.timeZone)
  const todayIso = formatDateString(today.year, today.month, today.day)

  const natal = await getOrBuildNatalContext(BIRTH)
  const birthDisplay = formatBirthLine(BIRTH.birthDate, BIRTH.birthTime)
  // 오늘 1일 evidence 셀 — 대운층 사주×점성 교차 원천(연 셀은 여전히 안 빌드).
  // /calendar 와 같은 캐시(getFocusDayCell)라 두 화면 방문 시 공유된다.
  const focusDayCell = await getFocusDayCell(BIRTH, natal, todayIso)

  const assembled = await assembleLifetime({
    natal,
    lang,
    birthYear: BIRTH_YEAR,
    targetYear: today.year,
    sex: BIRTH.gender === 'female' ? '여' : '남',
    birthDisplay,
    whoBirthLine: birthDisplay,
    place,
    now,
    todayIso,
    focusDayCell,
  })

  return { kind: 'ok', lang, ...assembled }
}

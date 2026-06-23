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

import { detectServerLocale } from '@/i18n/server'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import {
  getOrBuildNatalContext,
  getOrBuildYearCells,
  getOrBuildMonthCells,
  getFocusDayCell,
} from '@/lib/calendar-engine/persistence'
import { assembleTiers, type AssembledTiers } from './assembleTiers'
import { getNowInTimezone, formatDateString } from '@/lib/datetime/timezone'

export type TierScope = 'month' | 'year'

export type LoadTierResult =
  | { kind: 'login' }
  | { kind: 'no-birth' }
  | ({ kind: 'ok'; lang: 'ko' | 'en' } & AssembledTiers)

// DB UserProfile.gender → 'male' | 'female'. canonical 'female'/'male' 저장,
// 레거시 'F'/'M'/'U' 도 대소문자 무시 처리. 미상/기타는 male 기본.
function normalizeGender(g: string | null | undefined): 'male' | 'female' {
  const v = (g ?? '').trim().toLowerCase()
  if (v === 'female' || v === 'f') return 'female'
  return 'male'
}

// MM-DD 한국어 표기 — '1995.2.9 06:40'.
function formatBirthLine(birthDate: string, birthTime: string): string {
  const [y, m, d] = birthDate.split('-')
  const ymd = `${Number(y)}.${Number(m)}.${Number(d)}`
  return `${ymd} ${birthTime}`
}

/**
 * 로그인 + 본명 가드를 통과하면 어셈블된 tier 데이터를, 아니면 fallback 종류를
 * 반환한다. 서버 컴포넌트(page.tsx)는 결과 kind 로 분기만 하면 된다.
 */
export async function loadTierData(scope: TierScope): Promise<LoadTierResult> {
  const lang = await detectServerLocale()

  const session = await getServerSession()
  if (!session?.user?.id) return { kind: 'login' }

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

  const BIRTH = {
    birthDate: profile.birthDate!,
    birthTime: profile.birthTime!,
    gender: normalizeGender(profile.gender),
    latitude: profile.latitude!,
    longitude: profile.longitude!,
    timeZone: profile.tzId!,
  }
  const BIRTH_YEAR = Number(profile.birthDate!.split('-')[0])

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
  const [cells, focusDayCell] = await Promise.all([
    scope === 'year'
      ? getOrBuildYearCells(BIRTH, natal, TARGET_YEAR, { includeEvidence: false })
      : getOrBuildMonthCells(BIRTH, natal, TARGET_YEAR, TARGET_MONTH, { includeEvidence: false }),
    getFocusDayCell(BIRTH, natal, targetDayIso),
  ])

  const birthDisplay = formatBirthLine(profile.birthDate!, profile.birthTime!)
  const place = profile.birthCity || '미입력'

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
  })

  return { kind: 'ok', lang, ...assembled }
}

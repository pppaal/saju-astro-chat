/* ============================================================
   /destinypal — Phase D 정식 라우트 (실 사용자 본명)
   ───────────────────────────────────────────────────────────
   /destinypal/preview (1995 고정 본명) 와 동일한 흐름이지만, BIRTH 상수
   를 next-auth getServerSession + prisma UserProfile 로 동적으로 대체.

   tier 어셈블은 두 라우트가 assembleTiers() 를 공유 (assembleTiers.ts).
   본명·cells 계산은 DB 캐시(getOrBuildNatalContext / getOrBuildYearCells)
   우선 — 매 방문 Swiss Ephemeris 재계산 방지.

   인증·본명 가드:
     · 세션 없음           → BirthRequiredFallback reason="login"
     · 세션 OK, 본명 부족  → BirthRequiredFallback reason="no-birth"
     · 둘 다 OK            → preview 와 동일한 5 tier 어셈블 진행

   "본명 부족" 판정:
     · birthDate, birthTime, latitude, longitude, tzId 중 하나라도 null/공란
       이면 본명 미입력으로 본다. (gender 는 'U' 도 허용 — male/female 로
       강제 매핑되므로 buildNatalContext 가 받아낼 수 있음.)
   ============================================================ */

import { headers } from 'next/headers'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

import PreviewClient from './preview/PreviewClient'
import BirthRequiredFallback from './birth-required'
import DailyFortunePushBanner from '@/components/push/DailyFortunePushBanner'

import {
  getOrBuildNatalContext,
  getOrBuildYearCells,
  getFocusDayCell,
} from '@/lib/calendar-engine/persistence'
import { assembleTiers } from './assembleTiers'
import { getNowInTimezone, formatDateString } from '@/lib/datetime/timezone'

// 서버 컴포넌트 — Swiss Ephemeris 비용 서버에서 한 번에 치름.
// 세션 기반이므로 force-dynamic 필수 (정적 캐시 금지).
export const dynamic = 'force-dynamic'

// DB UserProfile.gender → BuildContextInput.gender ('male' | 'female') 매핑.
// 현재 쓰기 경로(genderSchema)는 canonical 'female'/'male' 로 저장하고, 레거시
// 행은 'F'/'M'/'U' 일 수 있으므로 둘 다(대소문자 무시) 처리한다. 미상/기타는
// male 로 기본 (calendar-engine 이 둘 중 하나를 요구 — 향후 unknown 지원 시 분기).
// ⚠ 직전엔 `g === 'F'` 만 검사해, canonical 'female' 로 저장된 모든 여성 유저가
//   남성으로 계산되던 버그가 있었다(대운 방향·운세 전체 오류).
function normalizeGender(g: string | null | undefined): 'male' | 'female' {
  const v = (g ?? '').trim().toLowerCase()
  if (v === 'female' || v === 'f') return 'female'
  return 'male'
}

// MM-DD 한국어 표기 — preview 와 동일한 whoBirthLine 형식 ('1995.2.9 06:40').
function formatBirthLine(birthDate: string, birthTime: string): string {
  const [y, m, d] = birthDate.split('-')
  const ymd = `${Number(y)}.${Number(m)}.${Number(d)}`
  return `${ymd} ${birthTime}`
}

export default async function DestinypalPage() {
  // 서버 로케일 — 미들웨어 x-locale 헤더.
  const hdrs = await headers()
  const lang: 'ko' | 'en' = hdrs.get('x-locale') === 'ko' ? 'ko' : 'en'

  // ─── 1) 세션 검사 ─────────────────────────────────────────────────────
  const session = await getServerSession()
  if (!session?.user?.id) {
    return <BirthRequiredFallback reason="login" />
  }

  // ─── 2) UserProfile 본명 fetch (prisma 직접 — /api/me/profile 와 동일 스키마) ──
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

  if (!isBirthComplete || !profile) {
    return <BirthRequiredFallback reason="no-birth" />
  }

  // ─── 3) BIRTH 동적 구성 (preview 의 상수 자리) ────────────────────────
  const BIRTH = {
    birthDate: profile.birthDate!,
    birthTime: profile.birthTime!,
    gender: normalizeGender(profile.gender),
    latitude: profile.latitude!,
    longitude: profile.longitude!,
    timeZone: profile.tzId!,
  }
  const BIRTH_YEAR = Number(profile.birthDate!.split('-')[0])

  // 현재 연·월·일 — *사용자 출생 타임존(tzId)* 기준의 '오늘'. year/month/day/ISO
  // 를 같은 호출(getNowInTimezone)에서 한 번에 뽑아 한 시간대로 통일한다.
  // (과거: 전부 UTC 로 통일 → 프로덕션 UTC 서버에서 getUTC* 가 KST 00~09시 동안
  //  '어제'를 돌려줘 한국 새벽 사용자에게 하루 전 날짜가 펼쳐졌다. 사용자 시간대로
  //  통일하면 month grid·focus 일이 어긋나지 않고, 셀 datetime 은 YYYY-MM-DD
  //  라벨 매칭이라 그대로 호환.)
  const today = getNowInTimezone(BIRTH.timeZone)
  const TARGET_YEAR = today.year
  const TARGET_MONTH = today.month
  const TARGET_DAY = today.day
  const targetDayIso = formatDateString(today.year, today.month, today.day)

  // ─── 4) NatalContext + 올해 cells (DB 캐시 우선) ──────────────────────
  const natal = await getOrBuildNatalContext(BIRTH)
  // 연 cells 는 evidence 없이(경량 캐시) — 점수·라벨만. evidence 가 필요한 그 하루는 따로.
  const cells = await getOrBuildYearCells(BIRTH, natal, TARGET_YEAR, { includeEvidence: false })
  const focusDayCell = await getFocusDayCell(natal, targetDayIso)

  // ─── 5) 5 tier 어셈블 (preview 와 공유) ───────────────────────────────
  const birthDisplay = formatBirthLine(profile.birthDate!, profile.birthTime!)
  const place = profile.birthCity || '미입력'

  const { topbar, user, lifetime, decade, year, month, day } = await assembleTiers({
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
  })

  return (
    <>
      <PreviewClient
        topbar={topbar}
        user={user}
        lifetime={lifetime}
        decade={decade}
        year={year}
        month={month}
        day={day}
      />
      {/* 매일 아침 오늘의 운세 푸시 옵트인 — VAPID 미설정/미지원이면 스스로 숨음 */}
      <DailyFortunePushBanner locale={lang} />
    </>
  )
}

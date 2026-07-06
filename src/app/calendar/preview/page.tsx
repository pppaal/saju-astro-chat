/* ============================================================
   /calendar/preview — Phase F (adapters 완전 wire-up) 실데이터 검증 페이지
   ───────────────────────────────────────────────────────────
   본명 1995-02-09 06:40 Asia/Seoul Male — 진짜 NatalContext +
   2026년 CalendarCell 으로 5 tier UI 를 자동으로 채운다.

   tier 어셈블은 정식 라우트(/calendar/page.tsx)와 assembleTiers() 를 공유.
   본명·cells 계산은 DB 캐시(getOrBuildNatalContext / getOrBuildMonthCells) 우선.

   임시 처리 / `as unknown as` 캐스팅 0건 — adapter 가 NatalContext →
   destinypal tier props 까지 100% 책임.
   ============================================================ */

import { detectServerLocale } from '@/i18n/server'
import PreviewClient from './PreviewClient'

import {
  getOrBuildNatalContext,
  getOrBuildMonthCells,
  getFocusDayCell,
} from '@/lib/calendar-engine/persistence'
import { assembleTiers } from '../assembleTiers'

// Server component: 빌드 비용(Swiss Ephemeris) 을 서버에서 한 번만 치름.
export const dynamic = 'force-dynamic'

// 본명 입력 — 1995-02-09 06:40 Asia/Seoul Male.
const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

const BIRTH_YEAR = 1995
const TARGET_YEAR = 2026
const TARGET_MONTH = 6 // 6월 — preview default focus month
const TARGET_DAY_ISO = '2026-06-15' // preview default focus day

export default async function DestinypalPreview() {
  // 서버 로케일 — 헤더 → 쿠키 → Accept-Language 정식 해석(클라이언트 로케일과 일치).
  const lang = await detectServerLocale()

  // ─── NatalContext + 그 달 cells (DB 캐시 우선) ────────────────────────
  const natal = await getOrBuildNatalContext(BIRTH)
  const [cells, focusDayCell] = await Promise.all([
    getOrBuildMonthCells(BIRTH, natal, TARGET_YEAR, TARGET_MONTH, { includeEvidence: false }),
    getFocusDayCell(BIRTH, natal, TARGET_DAY_ISO),
  ])

  // ─── 월/일 tier 어셈블 (정식 라우트와 공유) ───────────────────────────
  const TARGET_DAY = Number(TARGET_DAY_ISO.split('-')[2])
  const { topbar, user, lifetime, month, day } = await assembleTiers({
    natal,
    cells,
    lang,
    birthYear: BIRTH_YEAR,
    targetYear: TARGET_YEAR,
    targetMonth: TARGET_MONTH,
    targetDay: TARGET_DAY,
    targetDayIso: TARGET_DAY_ISO,
    sex: '남',
    birthDisplay: '1995-02-09 06:40',
    whoBirthLine: '1995.2.9 06:40',
    place: '서울',
    focusDayCell,
    // 정식 라우트와 동일 규약 — 캘린더는 인생 곡선(90년) 계산 생략.
    scope: 'month',
  })

  return (
    <PreviewClient
      topbar={topbar}
      user={user}
      lifetime={lifetime}
      month={month}
      day={day}
      // preview 는 세션이 아닌 고정 본명 — 일 티어 재빌드 fetch 도 같은 본명으로
      // (override 쿼리 규약). 없으면 세션 본명/401 로 새서 다른 사람 하루가 뜬다.
      dayFetchParams={{
        date: BIRTH.birthDate,
        time: BIRTH.birthTime,
        gender: BIRTH.gender,
        lat: String(BIRTH.latitude),
        lng: String(BIRTH.longitude),
        tz: BIRTH.timeZone,
      }}
    />
  )
}

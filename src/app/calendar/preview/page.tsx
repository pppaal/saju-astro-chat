/* ============================================================
   /calendar/preview — Phase F (adapters 완전 wire-up) 실데이터 검증 페이지
   ───────────────────────────────────────────────────────────
   본명 1995-02-09 06:40 Asia/Seoul Male — 진짜 NatalContext +
   2026년 CalendarCell 으로 5 tier UI 를 자동으로 채운다.

   tier 어셈블은 정식 라우트(/calendar/page.tsx)와 assembleTiers() 를 공유.
   본명·cells 계산은 DB 캐시(getOrBuildNatalContext / getOrBuildYearCells) 우선.

   임시 처리 / `as unknown as` 캐스팅 0건 — adapter 가 NatalContext →
   destinypal tier props 까지 100% 책임.
   ============================================================ */

import { headers } from 'next/headers'
import PreviewClient from './PreviewClient'

import {
  getOrBuildNatalContext,
  getOrBuildYearCells,
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
  // 서버 로케일 — 미들웨어가 심은 x-locale 헤더(쿠키/Accept-Language 기반).
  const hdrs = await headers()
  const lang: 'ko' | 'en' = hdrs.get('x-locale') === 'ko' ? 'ko' : 'en'

  // ─── NatalContext + 그 해 cells (DB 캐시 우선) ────────────────────────
  const natal = await getOrBuildNatalContext(BIRTH)
  const [cells, focusDayCell] = await Promise.all([
    getOrBuildYearCells(BIRTH, natal, TARGET_YEAR, { includeEvidence: false }),
    getFocusDayCell(BIRTH, natal, TARGET_DAY_ISO),
  ])

  // ─── 5 tier 어셈블 (정식 라우트와 공유) ───────────────────────────────
  const TARGET_DAY = Number(TARGET_DAY_ISO.split('-')[2])
  const { topbar, user, lifetime, decade, year, month, day } = await assembleTiers({
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
  })

  return (
    <PreviewClient
      topbar={topbar}
      user={user}
      lifetime={lifetime}
      decade={decade}
      year={year}
      month={month}
      day={day}
    />
  )
}

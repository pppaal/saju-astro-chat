/* ============================================================
   /calendar/preview — 공개 샘플 (로그인·본명 없이 캘린더 미리보기)
   ───────────────────────────────────────────────────────────
   v9 디자인 샘플 본명 1997-03-21 14:30 Asia/Seoul 여 — 실존 인물 데이터가
   아닌 합성 샘플이다. 포커스는 2026-11-19 로 고정해 언제 열어도 같은 화면
   (디자인 목업과 일치)이 나온다 — "지금"도 그날 정오(서울)로 주입한다.

   tier 어셈블은 정식 라우트(/calendar/page.tsx)와 assembleTiers() 를 공유.
   본명·cells 계산은 DB 캐시(getOrBuildNatalContext / getOrBuildMonthCells) 우선.
   ============================================================ */

import { detectServerLocale } from '@/i18n/server'
import CalendarClient from '../CalendarClient'

import {
  getOrBuildNatalContext,
  getOrBuildMonthCells,
  getFocusDayCell,
} from '@/lib/calendar-engine/persistence'
import { assembleTiers } from '../assembleTiers'

// Server component: 빌드 비용(Swiss Ephemeris) 을 서버에서 한 번만 치름.
export const dynamic = 'force-dynamic'

// 샘플 본명 — 1997-03-21 14:30 Asia/Seoul 여 (v9 샘플, 합성 데이터).
const BIRTH = {
  birthDate: '1997-03-21',
  birthTime: '14:30',
  gender: 'female' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

const BIRTH_YEAR = 1997
const TARGET_YEAR = 2026
const TARGET_MONTH = 11 // 11월 — 샘플 고정 포커스 월
const TARGET_DAY_ISO = '2026-11-19' // 샘플 고정 포커스 일
// 샘플의 "지금" — 포커스 일 정오(서울, UTC+9). 만 나이·일 티어 기준을 고정한다.
const SAMPLE_NOW = new Date('2026-11-19T03:00:00Z')

export default async function DestinypalPreview() {
  // 서버 로케일 — 헤더 → 쿠키 → Accept-Language 정식 해석(클라이언트 로케일과 일치).
  const lang = await detectServerLocale()

  // ─── NatalContext + 그 달 cells (DB 캐시 우선) ────────────────────────
  // 본명도 샘플의 "지금"으로 — 현재 대운·만 나이가 서버 시계가 아니라 SAMPLE_NOW 기준(결정론).
  const natal = await getOrBuildNatalContext({ ...BIRTH, now: SAMPLE_NOW })
  const [cells, focusDayCell] = await Promise.all([
    getOrBuildMonthCells(BIRTH, natal, TARGET_YEAR, TARGET_MONTH, { includeEvidence: false }),
    getFocusDayCell(BIRTH, natal, TARGET_DAY_ISO),
  ])

  // ─── 월/일 tier 어셈블 (정식 라우트와 공유) ───────────────────────────
  const TARGET_DAY = Number(TARGET_DAY_ISO.split('-')[2])
  const { topbar, user, month, day } = await assembleTiers({
    natal,
    cells,
    lang,
    birthYear: BIRTH_YEAR,
    targetYear: TARGET_YEAR,
    targetMonth: TARGET_MONTH,
    targetDay: TARGET_DAY,
    targetDayIso: TARGET_DAY_ISO,
    sex: '여',
    birthDisplay: '1997-03-21 14:30',
    whoBirthLine: '1997.3.21 14:30',
    place: lang === 'en' ? 'Seoul' : '서울',
    focusDayCell,
    now: SAMPLE_NOW,
  })

  return (
    <CalendarClient
      topbar={topbar}
      user={user}
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

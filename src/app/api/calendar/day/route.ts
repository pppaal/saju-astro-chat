// src/app/api/calendar/day/route.ts
//
// 운흐름 캘린더 — 선택한 날짜의 일(日) 티어 데이터.
//
// 월 그리드에서 오늘이 아닌 날을 골라 줌인하면 클라이언트(PreviewClient)가
// 이 라우트로 그 날짜의 day 객체를 받아 DayTier 를 갈아끼운다. 어셈블은
// 서버 렌더와 *동일한* assembleDayTier 경로 — 월 그리드 점수(밴드 색)와
// 일 티어 점수가 같은 layered.daily 척도라 두 화면이 어긋나지 않는다.
//
// 입력:
//   · day=YYYY-MM-DD (필수) — 빌드할 날짜. 오늘 기준 ±370일로 제한(캐시 행
//     증식·무한 풀빌드 방지 — 캘린더 UI 는 그 달만 보여주므로 충분).
//   · 생일 override(date/time/lat/lng/tz/gender) — /calendar 페이지와 동일
//     규약. 없으면 세션 사용자의 저장된 본명.

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createSimpleGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
} from '@/lib/api/middleware'
import { detectServerLocale } from '@/i18n/server'
import {
  getOrBuildNatalContext,
  getOrBuildMonthCells,
  getFocusDayCell,
} from '@/lib/calendar-engine/persistence'
import { assembleDayTier } from '@/app/calendar/assembleDayTier'
import { parseBirthOverride, loadSessionBirth, type BirthInput } from '@/app/calendar/loadTierData'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_RANGE_DAYS = 370

/** 'YYYY-MM-DD' 가 실제 달력 날짜이며 오늘 ±370일 안인지. */
function validDayIso(iso: string): boolean {
  if (!DAY_RE.test(iso)) return false
  const [y, m, d] = iso.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) {
    return false // 2월 31일 같은 비실재 날짜
  }
  const diffDays = Math.abs(utc.getTime() - Date.now()) / 86_400_000
  return diffDays <= MAX_RANGE_DAYS
}

export const GET = withApiMiddleware(
  async (req: NextRequest) => {
    const sp = Object.fromEntries(req.nextUrl.searchParams.entries())

    const dayIso = typeof sp.day === 'string' ? sp.day : ''
    if (!validDayIso(dayIso)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_day')
    }

    // 생일 — override 쿼리(익명 '다른 사람 보기') 우선, 없으면 세션 본명.
    let birth: BirthInput
    const override = parseBirthOverride(sp)
    if (override) {
      birth = {
        birthDate: override.birthDate,
        birthTime: override.birthTime,
        gender: override.gender,
        latitude: override.latitude,
        longitude: override.longitude,
        timeZone: override.timeZone,
      }
    } else {
      const resolved = await loadSessionBirth()
      if (resolved.kind === 'anonymous') {
        return apiError(ErrorCodes.UNAUTHORIZED, 'login_required')
      }
      if (resolved.kind === 'no-birth') {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'birth_profile_incomplete')
      }
      birth = resolved.birth
    }

    const lang = await detectServerLocale()
    const [y, m] = dayIso.split('-').map(Number)

    const natal = await getOrBuildNatalContext(birth)
    // 그 달 cells(점수 모집단 — 월 그리드와 동일) + 그 하루 evidence 셀.
    // 대상일+7일이 월을 넘으면 다음 달 cells 도 — "다가오는 7일" 월말 절단 방지
    // (감사 #13). 캐시 히트라 정상 사용에선 추가 빌드 없음.
    const d = Number(dayIso.slice(8, 10))
    const lastDayOfMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const needNextMonth = d + 7 > lastDayOfMonth
    const [nmY, nmM] = m === 12 ? [y + 1, 1] : [y, m + 1]
    const [cells, focusDayCell, nextMonthCells] = await Promise.all([
      getOrBuildMonthCells(birth, natal, y, m, { includeEvidence: false }),
      getFocusDayCell(birth, natal, dayIso),
      needNextMonth
        ? getOrBuildMonthCells(birth, natal, nmY, nmM, { includeEvidence: false })
        : Promise.resolve(undefined),
    ])

    const day = await assembleDayTier({
      natal,
      cells,
      lang,
      targetDayIso: dayIso,
      focusDayCell,
      nextMonthCells,
    })

    return apiSuccess({ day })
  },
  // 서버 렌더의 override 한도(IP 당 20/분)와 동일 결. 날짜 탐색은 클라이언트
  // 캐시(같은 날짜 재요청 없음)가 있어 정상 사용은 분당 수 회.
  createSimpleGuard({ route: '/api/calendar/day', limit: 20, windowSeconds: 60 })
)

// src/lib/calendar-engine/profileBirth.ts
//
// 저장된 프로필 행(UserProfile) → 캘린더 엔진 본명 입력(BuildContextInput) — 단일 규칙.
//
// 웹 캘린더(loadTierData.loadSessionBirth)와 "오늘의 큰 날" 푸시(cron/keyday-push)가
// 같은 함수를 쓴다. 예전엔 푸시가 프로필의 원시 birthTime 을 그대로 넣어, 시간 미상
// 사용자는 웹(정오 앵커 + 삼주 + placeUnreliable)과 다른 본명·birthKey 로 푸시를
// 판정했다(엔진 감사 F1). 이제 시간 미상 판정·정오 앵커·성별 정규화가 한 곳에서
// 나오므로 두 경로의 birthKey(persistence.birthKeyFor)가 같다.
//
// 순수 함수 — DB·시계를 읽지 않는다.

import { resolveBirthTimeAnchor } from '@/lib/saju/birthTimeAnchor'
import { normalizeGender } from '@/lib/utils/gender'
import type { BuildContextInput } from './context/build'

/** 본명 판정에 필요한 프로필 열 — prisma UserProfile select 와 같은 이름. */
export interface CalendarProfileRow {
  birthDate: string | null
  birthTime: string | null
  /** 명시 "시간 모름" 플래그. NULL = 레거시 행('00:00'=미상 휴리스틱, birthTimeAnchor). */
  birthTimeUnknown?: boolean | null
  gender: string | null
  latitude: number | null
  longitude: number | null
  tzId: string | null
}

/** 캘린더 엔진 본명 입력 — 시간 미상이면 birthTime 은 정오 앵커, birthTimeUnknown=true. */
export type CalendarBirth = Required<
  Pick<
    BuildContextInput,
    'birthDate' | 'birthTime' | 'gender' | 'latitude' | 'longitude' | 'timeZone'
  >
> &
  Pick<BuildContextInput, 'birthTimeUnknown' | 'birthCityUnknown'>

/**
 * 프로필 → 본명 입력. 본명이 완비되지 않았으면(날짜·시각·좌표·tz 중 하나라도 없음) null.
 *
 * - 시간: resolveBirthTimeAnchor(tri-state) — 플래그 true 또는 빈 시각 = 미상, 플래그
 *   NULL 이면 '00:00' = 미상(레거시 행), false 면 '00:00' 도 실제 자정 출생.
 * - 출생지: 프로필에는 "출생지 모름" 열이 없다(본명 완비 = 좌표 저장). 그래서
 *   birthCityUnknown 은 넣지 않는다 — 웹 캘린더 세션 경로와 같다.
 * - 성별: 엔진은 이분 성별만 받는다 — female 로 읽히는 값만 female, 나머지는 male.
 */
export function profileToCalendarBirth(
  profile: CalendarProfileRow | null | undefined
): CalendarBirth | null {
  if (
    !profile?.birthDate ||
    !profile.birthTime ||
    typeof profile.latitude !== 'number' ||
    typeof profile.longitude !== 'number' ||
    !profile.tzId
  ) {
    return null
  }
  const anchor = resolveBirthTimeAnchor(profile.birthTime, profile.birthTimeUnknown)
  return {
    birthDate: profile.birthDate,
    birthTime: anchor.time,
    gender: normalizeGender(profile.gender) === 'female' ? 'female' : 'male',
    latitude: profile.latitude,
    longitude: profile.longitude,
    timeZone: profile.tzId,
    birthTimeUnknown: anchor.timeUnknown,
  }
}

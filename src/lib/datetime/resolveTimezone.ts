// src/lib/datetime/resolveTimezone.ts
//
// 타임존 폴백의 단일 resolver. 글로벌(영어 우선) 제품에서 흩어져 있던
// `tz ?? 'Asia/Seoul'` 폴백을 한 곳으로 모은다 — 뉴욕 출생자의 '오늘'이 서울 날짜로
// 잡히거나, 좌표만 온 해외 출생이 서울 존으로 계산되던 문제를 막는다.
//
// 두 종류를 구분한다.
//
//  출생 타임존(birth tz) — 사주·점성 본명 계산의 기준 존.
//    1. 명시 출생 tz (유효한 IANA 이름)
//    2. 출생 좌표의 tz (tz-lookup — 이미 도시 검색이 쓰는 경량 의존성)
//    3. CALCULATION_STANDARDS.saju.baseTimezone + logger.warn (진짜로 아무 단서가 없을 때)
//
//  보는 사람 타임존(viewer tz) — '오늘'·일진·푸시 날짜의 기준 존.
//    1. 명시 요청 tz (헤더·쿠키·본문의 기기 tz)
//    2. 출생 tz (위 규칙 — 기기 tz 를 모르면 출생지 날짜가 가장 그럴듯하다)
//    3. baseTimezone
//
// 유효한 tz 를 실은 요청은 그 tz 를 그대로 돌려받는다 — 동작이 바뀌지 않는다.
// 한국 고유 교리(한국 서머타임 창, KASI 절입표, 서울 기준 경도)는 이 모듈과 무관하다.

import tzLookup from 'tz-lookup'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'
import { logger } from '@/lib/logger'
import { isValidTimeZone } from './timezone'

export type BirthTimezoneSource = 'explicit' | 'coordinates' | 'base'
export type ViewerTimezoneSource = 'viewer' | BirthTimezoneSource

export interface BirthTimezoneInput {
  /** 저장·입력된 출생 타임존(IANA). 비었거나 잘못된 이름이면 다음 단계로. */
  timezone?: string | null
  /** 출생지 좌표 — 실제 출생지일 때만 넘긴다(미상 폴백 좌표는 tz 에서 나온 값이라 의미 없음). */
  latitude?: number | null
  longitude?: number | null
}

export interface ResolvedTimezone<S extends string> {
  timeZone: string
  source: S
}

export interface ResolveTimezoneOptions {
  /** baseTimezone 폴백 경고에 붙일 호출처 라벨(개인정보 없이). */
  context?: string
}

/** 좌표 → IANA 타임존. 좌표가 없거나 범위 밖이거나 조회가 실패하면 null. */
export function timezoneFromCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): string | null {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  try {
    const tz = tzLookup(latitude, longitude)
    return isValidTimeZone(tz) ? tz : null
  } catch {
    return null
  }
}

/** 출생 타임존 + 어느 단계에서 정해졌는지. */
export function resolveBirthTimezoneDetailed(
  input: BirthTimezoneInput,
  opts: ResolveTimezoneOptions = {}
): ResolvedTimezone<BirthTimezoneSource> {
  if (isValidTimeZone(input.timezone)) {
    return { timeZone: input.timezone as string, source: 'explicit' }
  }
  const fromCoords = timezoneFromCoordinates(input.latitude, input.longitude)
  if (fromCoords) return { timeZone: fromCoords, source: 'coordinates' }
  const base = CALCULATION_STANDARDS.saju.baseTimezone
  // 좌표·타임존 어느 쪽도 없는 입력 — 기준 존으로 계산은 진행하되 운영에서 보이게 남긴다.
  // 좌표·생년월일 같은 개인정보는 싣지 않는다.
  logger.warn('[timezone] no usable birth timezone or coordinates; using base timezone', {
    base,
    context: opts.context,
    invalidTimezone: !!input.timezone,
  })
  return { timeZone: base, source: 'base' }
}

/** 출생 타임존(IANA 이름). 규칙은 파일 머리말. */
export function resolveBirthTimezone(
  input: BirthTimezoneInput,
  opts: ResolveTimezoneOptions = {}
): string {
  return resolveBirthTimezoneDetailed(input, opts).timeZone
}

export interface ViewerTimezoneInput {
  /** 요청이 실어 온 보는 사람의 기기 타임존(헤더·쿠키·본문). */
  viewerTimezone?: string | null
  /** 보는 사람 tz 가 없을 때 쓸 출생 정보. */
  birth?: BirthTimezoneInput
}

/** 보는 사람 타임존 + 어느 단계에서 정해졌는지. */
export function resolveViewerTimezoneDetailed(
  input: ViewerTimezoneInput,
  opts: ResolveTimezoneOptions = {}
): ResolvedTimezone<ViewerTimezoneSource> {
  if (isValidTimeZone(input.viewerTimezone)) {
    return { timeZone: input.viewerTimezone as string, source: 'viewer' }
  }
  return resolveBirthTimezoneDetailed(input.birth ?? {}, opts)
}

/** 보는 사람 타임존(IANA 이름) — '오늘'·일진 날짜의 기준. 규칙은 파일 머리말. */
export function resolveViewerTimezone(
  input: ViewerTimezoneInput,
  opts: ResolveTimezoneOptions = {}
): string {
  return resolveViewerTimezoneDetailed(input, opts).timeZone
}

/**
 * 출생 타임존 — 서버 계산용 엄격판. 명시 tz → 출생 좌표(도시)의 tz 까지만 보고, 둘 다 없으면
 * null 이다. 사용자 출생 데이터로 사주·차트를 계산하는 경로(궁합 상담사·초대 페어링)는 null 이면
 * 서울(baseTimezone) 기둥을 지어내지 말고 422 로 거른다 — 제품은 전 세계에 팔린다.
 */
export function resolveBirthTimezoneStrict(
  input: BirthTimezoneInput
): ResolvedTimezone<'explicit' | 'coordinates'> | null {
  if (isValidTimeZone(input.timezone)) {
    return { timeZone: input.timezone as string, source: 'explicit' }
  }
  const fromCoords = timezoneFromCoordinates(input.latitude, input.longitude)
  return fromCoords ? { timeZone: fromCoords, source: 'coordinates' } : null
}

/** 출생 타임존도 출생 도시도 없을 때의 422 메시지 — 다른 zod 메시지처럼 영어 한 줄. */
export const BIRTH_TIMEZONE_REQUIRED_MESSAGE =
  'Birth timezone or birth city (latitude/longitude) is required'

/**
 * 출생 타임존 — 화면(클라이언트) 폼·피커용. 저장 tz → 출생 도시 좌표의 tz → 보는 사람 기기 tz
 * (getUserTimezone — 실패하면 'UTC') 순서(F5-2 resolver 와 같은 앞 두 단계). 서울을 하드코딩하지
 * 않는다: tz 없이 저장된 상대도 도시가 있으면 그 도시 tz 로, 도시도 없으면 보는 사람 기기 tz 로
 * 계산해 서버 422 를 피한다.
 */
export function resolveBirthTimezoneOnDevice(
  input: BirthTimezoneInput,
  deviceTimezone: string | null | undefined
): string {
  const strict = resolveBirthTimezoneStrict(input)
  if (strict) return strict.timeZone
  return isValidTimeZone(deviceTimezone) ? (deviceTimezone as string) : 'UTC'
}

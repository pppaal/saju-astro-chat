// src/lib/datetime/birthInstant.ts
//
// 출생 시각 → UTC instant 변환 — 도메인 무관 SINGLE SOURCE OF TRUTH.
//
// 사주/점성/타로 등 모든 도메인이 같은 변환 규칙을 써야 시각 비교가 일관된다.
// 옛 버그들 (사주 S1, 점성 A2) 의 공통 패턴:
//   - 사용자 wall-clock (year/month/day/hour/minute) + tz 를 받았는데
//   - server-local 또는 Date.UTC 같은 잘못된 변환으로 UTC instant 생성
//   - 결과 instant 가 ±tzOffset 어긋나 천체/절기 lookup 이 다른 결과
//
// 호출자는 항상 이 helper 만 사용. 직접 `new Date(...)` 또는 `Date.UTC(...)` 로
// 출생 시각 만들기 금지 — 그건 곧 같은 클래스 버그 재발.

import { toDate } from 'date-fns-tz'

/**
 * 출생 시각 (또는 임의 wall-clock 시각) 을 UTC instant 로 정규화.
 *
 * @param dateStr "YYYY-MM-DD"
 * @param timeStr "HH:mm"
 * @param timezone IANA timezone (예 "Asia/Seoul", "America/Los_Angeles")
 * @returns UTC Date — 모든 도메인 계산의 single ground truth
 */
export function buildBirthInstant(dateStr: string, timeStr: string, timezone: string): Date {
  return toDate(`${dateStr}T${timeStr}:00`, { timeZone: timezone })
}

/**
 * Date 가 이미 UTC instant 라는 계약을 명시하는 type alias.
 * 호출자가 이 타입으로 받으면 "재해석 금지" 의도가 시그니처에 드러남.
 */
export type BirthInstant = Date

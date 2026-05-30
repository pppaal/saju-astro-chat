// src/lib/saju/core/birthInstant.ts
//
// 사주 출생 시각 — SINGLE SOURCE OF TRUTH.
//
// 사주 모든 계산은 "출생의 절대 UTC 순간 (instant)" 한 가지만 사용한다.
// timezone 은 입력 (사용자가 어느 시계로 시각을 적었나) 을 UTC 로 변환할 때만
// 쓰이고, 일단 UTC instant 가 만들어지면 그게 사주의 단일 ground truth.
//
// 옛 버그 (S1):
//   unse.ts 의 normalizeBirthToUTC 가 birthDate 를 `birthDate.getFullYear()`
//   등 server-local accessor 로 다시 분해해 timezone 으로 재해석 → UTC 서버
//   (Vercel) 에서 두 번 변환 효과로 ±tzOffset 어긋남. 입춘 같은 절기 경계에서
//   대운 시작 나이가 ~10년 잘못 나옴.
//
// 옛 버그 (S2):
//   route.ts 가 getDaeunCycles 호출 시 timezone 자리에 'Asia/Seoul' 하드코딩
//   → 비한국 출생자가 UTC 서버에서 잘못된 birthUTC 로 들어감.
//
// 단일 source 패턴:
//   - 모든 입력 → `buildBirthInstant(date, time, tz)` 로 만든 UTC Date 만 사용
//   - 그 Date 객체를 호출자끼리 그대로 전달 (재해석 금지)
//   - 호출자는 timezone 인자가 필요 없으면 받지 않는다 (사주 절기는 KASI = KST
//     기준 lookup 이라 호출자 timezone 무관)

import { toDate } from 'date-fns-tz'

/**
 * 출생 시각을 UTC instant 로 정규화.
 *
 * @param dateStr "YYYY-MM-DD" (사용자가 적은 출생일)
 * @param timeStr "HH:mm" (사용자가 적은 출생시각)
 * @param timezone IANA timezone (출생지 tz, 예 "Asia/Seoul", "America/Los_Angeles")
 * @returns UTC Date — 사주 계산의 single ground truth
 */
export function buildBirthInstant(dateStr: string, timeStr: string, timezone: string): Date {
  return toDate(`${dateStr}T${timeStr}:00`, { timeZone: timezone })
}

/**
 * birthDate 가 이미 UTC instant 라는 계약을 명시적으로 표현하는 type alias.
 * 호출자가 이 타입으로 받으면 "재해석 금지" 의도가 시그니처에 드러남.
 */
export type BirthInstant = Date

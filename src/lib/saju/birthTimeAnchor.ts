/**
 * 출생 "시간 모름" 규약 SSOT — 시간 미상이면 계산 앵커를 정오(12:00)로.
 *
 * 왜 정오인가: calculateSajuData 는 진태양시(경도) 보정을 출생 인스턴트 *전체*에
 * 적용한다(saju.ts effectiveDateTime). 자정(00:00) 앵커는 서울 기준 -32분 보정만으로
 * 인스턴트가 전날 23:28 로 밀려 일주가 전날 간지가 되고, 절입일엔 월주(입춘이면
 * 년주)까지 어긋난다. 정오는 보정(전 세계 ±1시간 남짓)이 날짜 경계를 절대 넘지
 * 못하는 안전한 앵커다. 통합 리포트가 먼저 쓰던 규약(integrated-report/page.tsx)을
 * 전 서비스 표준으로 올린 것 — 예전엔 궁합/운명상담사/캘린더 세션 경로가 '00:00'
 * 앵커를 써서 같은 사람의 일주가 화면마다 달랐다.
 *
 * 미상 판정은 3-상태(tri-state)다:
 *   - flag === true  → 미상 (사용자가 "시간 모름" 체크 — 시각이 남아 있어도 미상 우선)
 *   - flag === false → 앎   ('00:00' 도 실제 자정 출생으로 신뢰. 단 빈 시각은 미상)
 *   - flag 미지정    → 레거시 휴리스틱: 빈 값 / '00:00' 은 미상
 * '00:00'=미상 휴리스틱이 남는 이유: 플래그가 저장되기 전의 레거시 데이터
 * (옛 프로필 행·옛 딥링크·recentPairs)는 '00:00' 이 미상 표기였기 때문.
 * 새 저장 경로(프로필/지인 DB의 birthTimeUnknown 컬럼, 폼 상태)는 플래그를
 * 끝까지 보존하므로 실제 자정 출생자가 미상으로 오분류되지 않는다.
 *
 * 시주/ASC/MC/하우스 마스킹은 각 서피스의 timeUnknown 플래그가 담당한다. 이
 * 헬퍼는 년·월·일주(및 점성 행성 위치)가 올바른 날짜에서 계산되게 하는 앵커만
 * 책임진다.
 */
export const TIME_UNKNOWN_ANCHOR = '12:00'

export interface BirthTimeAnchor {
  /** 엔진에 넣을 계산 앵커 (HH:MM). 미상이면 TIME_UNKNOWN_ANCHOR(정오). */
  time: string
  /** 시간 미상 여부 — 시주/ASC/MC/하우스 마스킹 플래그로 그대로 쓴다. */
  timeUnknown: boolean
}

/**
 * 시간 미상 판정(tri-state). flag 가 명시 boolean 이면 그대로 신뢰하고
 * (false + '00:00' = 실제 자정 출생), 미지정(null/undefined)이면 레거시
 * 휴리스틱('00:00'/빈 값 = 미상)으로 폴백한다. 빈 시각은 플래그와 무관하게 미상.
 */
export function isBirthTimeUnknown(
  time: string | null | undefined,
  timeUnknownFlag?: boolean | null
): boolean {
  const t = typeof time === 'string' ? time.trim() : ''
  if (!t) return true
  if (timeUnknownFlag === true) return true
  if (timeUnknownFlag === false) return false
  return t === '00:00'
}

/**
 * 출생 시각 입력 + (선택) 명시적 미상 플래그 → 계산 앵커.
 * 미상이면 정오 앵커, 아니면 입력 시각 그대로.
 */
export function resolveBirthTimeAnchor(
  time: string | null | undefined,
  timeUnknownFlag?: boolean | null
): BirthTimeAnchor {
  const unknown = isBirthTimeUnknown(time, timeUnknownFlag)
  return { time: unknown ? TIME_UNKNOWN_ANCHOR : (time as string).trim(), timeUnknown: unknown }
}

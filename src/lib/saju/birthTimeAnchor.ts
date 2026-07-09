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
 * '00:00' 도 미상으로 취급한다 — 프로필/폼이 시간 모름을 '00:00' 으로 저장하는
 * 앱 전역 규약(birthInfoStorage.timeToState, 궁합 PersonForm) 때문. 실제 자정
 * 출생과의 구분은 미상 플래그가 저장 전 구간까지 관통하기 전엔 불가(기존 한계
 * 유지 — 이 헬퍼로 나빠지지 않는다).
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
 * 출생 시각 입력 + (선택) 명시적 미상 플래그 → 계산 앵커.
 * 빈 값 / '00:00' / 플래그 true 는 전부 미상 → 정오 앵커.
 */
export function resolveBirthTimeAnchor(
  time: string | null | undefined,
  timeUnknownFlag?: boolean
): BirthTimeAnchor {
  const t = typeof time === 'string' ? time.trim() : ''
  const unknown = timeUnknownFlag === true || !t || t === '00:00'
  return { time: unknown ? TIME_UNKNOWN_ANCHOR : t, timeUnknown: unknown }
}

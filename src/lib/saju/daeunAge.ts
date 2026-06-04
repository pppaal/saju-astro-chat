/**
 * daeunAge — 대운 시작 나이 (한국나이) 계산 단일 출처.
 *
 * 옛 회귀: saju.ts 와 unse.ts 가 동일한 daysToDaeunAge() 를 각자 복사본으로
 * 갖고 있어, 라운딩 정책(CALCULATION_STANDARDS.saju.daeunRounding) 을 한 곳만
 * 바꾸면 사주 차트와 대운 표시가 다른 결과를 내는 위험. 한 모듈로 합쳤다.
 *
 * 정책 메모 (legacy, golden test 로 잠겨 있음):
 *  - days/3 → ceil/floor/round (정책 따라)
 *  - 결과 < 1 이면 1 로 clamp
 *  - 마지막에 +1 (한국나이 변환: 만 0세 → 한국 1세)
 *  - 절기 ±3일 출생(만 0)은 결과 2 가 나옴. "대운수 최소 1" 관례로 볼 수 있고
 *    determinism-golden 으로 잠겨 있어 임의로 바꾸지 않는다.
 */

import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'

const DAEUN_ROUNDING = CALCULATION_STANDARDS.saju.daeunRounding

export function daysToDaeunAge(days: number): number {
  const v = days / 3
  let age: number
  if (DAEUN_ROUNDING === 'ceil') {
    age = Math.ceil(v)
  } else if (DAEUN_ROUNDING === 'floor') {
    age = Math.floor(v)
  } else {
    age = Math.round(v)
  }
  return Math.max(1, age) + 1
}

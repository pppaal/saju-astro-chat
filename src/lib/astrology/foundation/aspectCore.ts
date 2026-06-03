// src/lib/astrology/foundation/aspectCore.ts
//
// 단일 핵심 aspect 평가 엔진.
//
// 배경: 과거에 `aspects.ts` (findAspects / findNatalAspects) 와 `transit.ts`
// (findTransitAspects) 가 "두 점 사이의 최단 분리각 → orb 테스트 → applying/
// separating 판정 → score" 라는 동일한 알고리즘을 각자 따로 구현하고 있었다.
// 두 구현이 미묘하게 어긋나면(예: applying 공식, orb 계산) 조용히 결과가 갈라진다.
//
// 이 파일은 그 *알고리즘* 만 하나로 통합한다. orb 테이블 / score 가중치 같은
// *튜닝 상수* 는 통합 대상이 아니다 — 트랜짓은 더 타이트한 오브를, 네이탈은
// 더 넓은 오브를 쓰는 게 의도된 설계이므로 각 호출처가 자신의 config 를
// `evaluateAspect` 에 그대로 주입한다.
//
// CRITICAL: 이 코어는 기존 두 구현의 산술을 *정확히* 재현해야 한다.
// 특히 transit.ts 는 calendar-engine 이 소비하므로 orb/score/applying 출력이
// 바이트 단위로 동일해야 한다. 그래서 코어는 "공통 골격"만 제공하고, 각 엔진의
// 서로 다른 세부(orb 계산식, applying 판정, score 식)는 config 콜백으로 받는다.

import { AspectType } from './types'

/**
 * 한 (점 A, 점 B, aspectType) 후보에 대한 평가 결과.
 * `accepted=false` 면 orb 한도를 벗어나 무시해야 한다는 뜻.
 */
export interface AspectEvaluation {
  accepted: boolean
  /** 후보 aspect 의 desired angle (e.g. trine=120) */
  targetAngle: number
  /** desired angle 으로부터의 편차 (도). 각 엔진이 보고하는 orb 값. */
  orb: number
  /** orb 한도 (도). 이 값 이하일 때 accepted. */
  limit: number
  /** applying(접근) = true, separating(분리) = false */
  applying: boolean
  /** 정렬·가중에 쓰는 score */
  score: number
}

/**
 * 코어가 호출처별 세부를 받기 위한 config.
 *
 * 각 엔진의 *원본 산술* 을 그대로 캡슐화한다. 코어는 이 함수들을 정해진
 * 순서로 호출만 할 뿐, 안에서 계산 방식을 바꾸지 않는다.
 */
export interface AspectEngineConfig {
  /** 후보 aspectType → desired angle (deg). */
  desiredAngle(aspect: AspectType): number
  /**
   * 최단 분리각 `sep` (0..180, shortestAngle/angleDiff 결과) 와 desired angle
   * 로부터 보고용 orb 를 계산. 두 엔진 모두 `|sep - target|` 을 쓴다 —
   * transit 의 옛 `orbAlt` 항은 수학적으로 no-op 이라 제거(아래 reasoning 참고).
   */
  computeOrb(sep: number, targetAngle: number): number
  /**
   * 이 (점 A 이름, 점 B 이름, aspectType) 쌍의 orb 한도.
   * orb 테이블·행성별 배율·perPair 오버라이드 등 엔진별 규칙을 전부 포함한다.
   */
  computeLimit(aName: string, bName: string, aspect: AspectType): number
  /**
   * applying(접근) 판정. 부호 있는 위치/속도 정보로 결정.
   * @param lonA  점 A 경도
   * @param lonB  점 B 경도
   * @param relSpeed  A 기준 상대 속도 (엔진에 따라 transitSpeed 만 쓰기도 함)
   * @param targetAngle  이 aspect 의 desired angle
   */
  isApplying(lonA: number, lonB: number, relSpeed: number, targetAngle: number): boolean
  /**
   * score 계산. orb/limit/applying/relSpeed/aspect 로부터 엔진별 가중치를 적용.
   */
  computeScore(args: {
    orb: number
    limit: number
    applying: boolean
    relSpeed: number
    aspect: AspectType
  }): number
}

/**
 * 단일 후보 (점 A, 점 B, aspectType) 를 평가한다.
 *
 * 호출처는 후보 aspect 목록을 순회하며 보통 첫 accepted 후보에서 멈추거나
 * (transit 은) 모든 accepted 후보를 수집한다 — 그 루프 정책은 호출처 책임.
 * 코어는 "이 하나의 후보가 맞는지 + 맞다면 orb/applying/score" 만 책임진다.
 */
export function evaluateAspect(
  aName: string,
  lonA: number,
  bName: string,
  lonB: number,
  sep: number,
  relSpeed: number,
  aspect: AspectType,
  config: AspectEngineConfig
): AspectEvaluation {
  const targetAngle = config.desiredAngle(aspect)
  const orb = config.computeOrb(sep, targetAngle)
  const limit = config.computeLimit(aName, bName, aspect)
  const accepted = orb <= limit
  // accepted 가 아니어도 applying/score 계산은 부작용 없으니 그대로 두되,
  // 호출처가 accepted 만 사용하도록 한다 (불필요한 분기 줄이려고 항상 계산).
  const applying = config.isApplying(lonA, lonB, relSpeed, targetAngle)
  const score = config.computeScore({ orb, limit, applying, relSpeed, aspect })
  return { accepted, targetAngle, orb, limit, applying, score }
}

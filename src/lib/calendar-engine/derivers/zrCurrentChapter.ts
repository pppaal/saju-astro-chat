// calendar-engine/derivers/zrCurrentChapter.ts
// ZR L1 + L2 현재 챕터 추출 — destinypal Timeline 의 본명 Decade · ZR-bar 가
// "지금 어느 sign 챕터에 있는지" 한 번에 조회할 수 있게 *현재 age* 기준 활성 period 를
// 미리 골라 둔다.
//
// foundation/zodiacalReleasing 에 모든 raw 계산 (L1 sign-walk, L2 sub-period 펼침)
// 이 있고, 본 deriver 는 그것에 *현재 age* 컨텍스트만 입혀 sign/ruler/duration/remain
// 4-field 으로 압축한다. UI 가 매번 90년치 sequence 를 훑지 않게 하는 cache layer.

import {
  getActiveZRPeriod,
  calculateZRSubPeriods,
  type ZRPeriod,
  type ZRSubPeriod,
} from '@/lib/astrology/foundation/zodiacalReleasing'
import type { ZodiacKo } from '@/lib/astrology/foundation/types'
import type { AstroPlanetName } from '@/lib/astrology/interpretations'
import type { ZodiacalReleasingResult } from '@/lib/calendar-engine/context/types'

export interface ZRCurrentLevel {
  sign: ZodiacKo
  ruler: AstroPlanetName
  /** Period 길이 (연 단위). L1 은 minor period 정수 (예: Moon=25), L2 는 그 1/12. */
  durationYears: number
  ageStart: number
  ageEnd: number
  /** age 가 활성 period 안에서 얼마나 진행됐는지 (years). */
  elapsedYears: number
  /** 활성 period 가 끝날 때까지 남은 years. */
  remainYears: number
}

export interface ZRCurrentLot {
  /** Lot 시작 sign — 본명 차트의 Spirit / Fortune lot sign. */
  startSign: ZodiacKo
  l1: ZRCurrentLevel | null
  l2: ZRCurrentLevel | null
}

export interface ZRCurrent {
  spirit: ZRCurrentLot | null
  fortune: ZRCurrentLot | null
}

function periodToLevel(period: ZRPeriod | ZRSubPeriod, age: number): ZRCurrentLevel {
  const elapsed = Math.max(0, age - period.startYear)
  const remain = Math.max(0, period.endYear - age)
  return {
    sign: period.sign,
    ruler: period.ruler,
    durationYears: period.durationYears,
    ageStart: period.startYear,
    ageEnd: period.endYear,
    elapsedYears: elapsed,
    remainYears: remain,
  }
}

function pickActiveLot(
  lot: ZodiacalReleasingResult['spirit'],
  age: number,
): ZRCurrentLot | null {
  if (!lot) return null
  const l1 = getActiveZRPeriod(lot.periods, age)
  if (!l1) {
    return { startSign: lot.startSign, l1: null, l2: null }
  }
  const l2List = calculateZRSubPeriods(l1)
  const l2 = l2List.find((p) => age >= p.startYear && age < p.endYear) ?? null
  return {
    startSign: lot.startSign,
    l1: periodToLevel(l1, age),
    l2: l2 ? periodToLevel(l2, age) : null,
  }
}

/**
 * 본명 ZR 시퀀스 (Spirit / Fortune L1 만 미리 펼쳐둔 상태) 에 *현재 age* 를 입혀
 * 활성 L1 + L2 챕터를 골라 반환.
 *
 * destinypal 5-tier Timeline ZR-bar 가 "지금 어느 sign 의 어느 행성이 다스리는
 * 챕터인가" 만 알면 되는 viewmodel 을 그대로 매핑한다.
 */
export function deriveZRCurrent(
  zr: ZodiacalReleasingResult,
  age: number,
): ZRCurrent {
  return {
    spirit: pickActiveLot(zr.spirit, age),
    fortune: pickActiveLot(zr.fortune, age),
  }
}

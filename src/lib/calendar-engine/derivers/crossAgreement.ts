/**
 * 교차검증 deriver (v2-native, 결정 D1).
 *
 * 구 yearlyDates 는 사주축·점성축 정렬도로 crossAgreementPercent·confidence·
 * scoreBreakdown 을 만들었다. v2 일원화에서 이를 **셀 신호에서 직접** 도출한다 —
 * destiny-map 의존 없이, 신호의 source(saju/astro)·polarity·weight 만으로.
 *
 * 핵심:
 *  - 축 점수: deriveScore 를 source 별로 따로 돌려 sajuAxis·astroAxis(0~100) 산출
 *    → derivedScore 와 동일 정규화라 의미가 일관.
 *  - crossAgreementPercent: 두 축이 같은 방향(>50 / <50)으로 얼마나 강하게
 *    함께 움직이는가. 한 축이 중립이면 50. 강하게 같은 방향이면 100, 반대면 0.
 *  - confidence: 그 날을 뒷받침하는 신호 질량(무거운 신호 수 + 양 시스템 동시
 *    존재 + 정렬 보너스). 0~100.
 *  - crossVerified: 양 축 신호 존재 && agreement ≥ 60 (양쪽이 같은 방향을 보증).
 */
import type { ActiveSignal } from '../types'
import { deriveScore, type SignalForScore } from './score'

export type AxisAgreement = 'aligned' | 'mixed' | 'opposed'

export interface CrossAgreement {
  sajuAxis: number
  astroAxis: number
  /** v2 엔 override 시프트가 없어 raw == display. 구 shape 호환 위해 같이 emit. */
  sajuAxisRaw: number
  astroAxisRaw: number
  axisAgreement: AxisAgreement
  finalScore: number
  crossAgreementPercent: number
  confidence: number
  crossVerified: boolean
}

const HEAVY_POLARITY = 2 // |polarity| ≥ 2 면 "무거운" 신호

export function deriveCrossAgreement(cell: {
  signals: ActiveSignal[]
  derivedScore: number
}): CrossAgreement {
  const saju = cell.signals.filter((s) => s.source === 'saju')
  const astro = cell.signals.filter((s) => s.source === 'astro')

  const toScoreInput = (s: ActiveSignal): SignalForScore => ({
    layer: s.layer,
    polarity: s.polarity,
    weight: s.weight,
  })

  const sajuPresent = saju.length > 0
  const astroPresent = astro.length > 0
  const sajuAxis = sajuPresent ? deriveScore(saju.map(toScoreInput)) : 50
  const astroAxis = astroPresent ? deriveScore(astro.map(toScoreInput)) : 50

  const sd = sajuAxis - 50 // -50 ~ +50
  const ad = astroAxis - 50

  // 방향 정렬 (둘 다 신호 있을 때만 의미)
  let axisAgreement: AxisAgreement = 'mixed'
  let crossAgreementPercent = 50
  if (sajuPresent && astroPresent) {
    const sameSign = (sd > 2 && ad > 2) || (sd < -2 && ad < -2)
    const opposed = (sd > 2 && ad < -2) || (sd < -2 && ad > 2)
    const magnitude = Math.min(Math.abs(sd), Math.abs(ad)) / 50 // 0~1
    if (sameSign) {
      axisAgreement = 'aligned'
      crossAgreementPercent = Math.round(50 + 50 * magnitude)
    } else if (opposed) {
      axisAgreement = 'opposed'
      crossAgreementPercent = Math.round(50 - 50 * magnitude)
    } else {
      axisAgreement = 'mixed'
      crossAgreementPercent = 50
    }
  }

  // confidence — 뒷받침 신호 질량
  const heavyCount =
    saju.filter((s) => Math.abs(s.polarity) >= HEAVY_POLARITY).length +
    astro.filter((s) => Math.abs(s.polarity) >= HEAVY_POLARITY).length
  const bothPresent = sajuPresent && astroPresent
  const confidence = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        45 +
          Math.min(heavyCount, 6) * 6 + // 무거운 신호 최대 +36
          (bothPresent ? 10 : 0) +
          (axisAgreement === 'aligned' ? 10 : axisAgreement === 'opposed' ? -8 : 0)
      )
    )
  )

  const crossVerified = bothPresent && crossAgreementPercent >= 60

  return {
    sajuAxis,
    astroAxis,
    sajuAxisRaw: sajuAxis,
    astroAxisRaw: astroAxis,
    axisAgreement,
    finalScore: cell.derivedScore,
    crossAgreementPercent,
    confidence,
    crossVerified,
  }
}

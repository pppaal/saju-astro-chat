import type { SignalLayer } from '../types'

/**
 * 레이어별 가중치 — score(점수)·summary(사유 랭킹) 공용 단일 정의.
 * 큰 레이어(대운) 1개의 강한 신호가 작은 레이어(일/시) 다수에 묻히지 않도록
 * 레이어 스케일에 비례한 가중. 이 값을 바꾸면 두 소비처가 함께 반영된다.
 */
export const LAYER_WEIGHT: Record<SignalLayer, number> = {
  decadal: 1.0,
  yearly: 0.85,
  monthly: 0.7,
  daily: 0.55,
  hourly: 0.4,
  instant: 0.5,
}

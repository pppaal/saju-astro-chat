import type { ActiveSignal, SignalLayer } from '../types'
import { translateSignalLabel } from './signalI18n'

/**
 * 한 셀의 활성 신호 다발에서 상위 N개 사유 텍스트 추출.
 * 가중치 큰 순 + 길흉 강도 큰 순. lang 별로 KO/EN 동시 지원.
 */

type Lang = 'ko' | 'en'

const LAYER_WEIGHT: Record<SignalLayer, number> = {
  decadal: 1.0,
  yearly: 0.85,
  monthly: 0.7,
  daily: 0.55,
  hourly: 0.4,
  instant: 0.5,
}

export function deriveTopReasons(signals: ActiveSignal[], limit = 5, lang: Lang = 'ko'): string[] {
  // 우호 신호(polarity > 0)만 — 가중치·강도 큰 순
  return [...signals]
    .filter((s) => s.polarity > 0)
    .map((s) => ({
      s,
      impact: s.polarity * s.weight * (LAYER_WEIGHT[s.layer] ?? 0.5),
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, limit)
    .map(({ s }) => formatReason(s, lang))
}

/**
 * 한 셀의 주의 신호(polarity < 0) top N — topReasons의 mirror.
 * cautions 배열을 채우는 deriver. 사용자가 주의 사유를 직접 보게.
 */
export function deriveCautions(signals: ActiveSignal[], limit = 5, lang: Lang = 'ko'): string[] {
  return [...signals]
    .filter((s) => s.polarity < 0)
    .map((s) => ({
      s,
      impact: Math.abs(s.polarity) * s.weight * (LAYER_WEIGHT[s.layer] ?? 0.5),
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, limit)
    .map(({ s }) => formatReason(s, lang))
}

/** 신호 → 표시 라벨. KO: korean 우선. EN: english 우선, 없으면 name 용어 치환. */
export function signalDisplayLabel(s: ActiveSignal, lang: Lang): string {
  if (lang === 'ko') return s.korean ?? s.name
  return s.english ?? translateSignalLabel(s.name, 'en')
}

function formatReason(s: ActiveSignal, lang: Lang): string {
  const tone = s.polarity > 0 ? '↑' : s.polarity < 0 ? '↓' : '·'
  const label = signalDisplayLabel(s, lang)
  return `${tone} [${layerLabel(s.layer, lang)}] ${label}`
}

function layerLabel(layer: SignalLayer, lang: Lang): string {
  const ko: Record<SignalLayer, string> = {
    decadal: '대운',
    yearly: '세운',
    monthly: '월운',
    daily: '일진',
    hourly: '시',
    instant: '정점',
  }
  const en: Record<SignalLayer, string> = {
    decadal: 'decade',
    yearly: 'year',
    monthly: 'month',
    daily: 'day',
    hourly: 'hour',
    instant: 'peak',
  }
  return (lang === 'ko' ? ko : en)[layer]
}

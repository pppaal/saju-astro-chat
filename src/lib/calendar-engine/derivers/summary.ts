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

// 일별 사유(추천·주의)는 "그날/그달 고유" 신호만 — 일진·월운 + 그날 일/월
// 점성 트랜짓. 1년 내내 켜진 대운·세운(점성: 외행성=yearly) 배경은 매일 같은
// 줄을 도배해 날짜 변별을 죽이므로 사유 목록에서 제외(점수에는 그대로 반영됨).
const REASON_LAYERS = new Set<SignalLayer>(['monthly', 'daily', 'hourly', 'instant'])

export function deriveTopReasons(signals: ActiveSignal[], limit = 5, lang: Lang = 'ko'): string[] {
  // 우호 신호(polarity > 0)만 — 가중치·강도 큰 순. 그날/그달 층만.
  const ranked = [...signals]
    .filter((s) => s.polarity > 0 && REASON_LAYERS.has(s.layer))
    .map((s) => ({
      s,
      impact: s.polarity * s.weight * (LAYER_WEIGHT[s.layer] ?? 0.5),
    }))
    .sort((a, b) => b.impact - a.impact)
    .map(({ s }) => formatReason(s, lang))
  return dedupe(ranked).slice(0, limit)
}

/**
 * 한 셀의 주의 신호(polarity < 0) top N — topReasons의 mirror.
 * cautions 배열을 채우는 deriver. 사용자가 주의 사유를 직접 보게.
 */
export function deriveCautions(signals: ActiveSignal[], limit = 5, lang: Lang = 'ko'): string[] {
  const ranked = [...signals]
    .filter((s) => s.polarity < 0 && REASON_LAYERS.has(s.layer))
    .map((s) => ({
      s,
      impact: Math.abs(s.polarity) * s.weight * (LAYER_WEIGHT[s.layer] ?? 0.5),
    }))
    .sort((a, b) => b.impact - a.impact)
    .map(({ s }) => formatReason(s, lang))
  return dedupe(ranked).slice(0, limit)
}

/** 동일 문구 중복 제거(순서 보존) — 추출기 중첩으로 같은 사유가 두 번 뜨는 것 방지. */
function dedupe(lines: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const l of lines) {
    if (seen.has(l)) continue
    seen.add(l)
    out.push(l)
  }
  return out
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

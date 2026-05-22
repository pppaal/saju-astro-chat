import type { ActiveSignal, CalendarCell } from '../types'

/**
 * 수렴(convergence) 디라이버 — "큰 날" 탐지.
 *
 * 기존 keyEvents 는 derivedScore(전 신호 평균) 최고일을 뽑아 "평균 높은 날"이
 * 나왔다. 이 모듈은 다른 기준 — **무거운 이벤트(느린 행성 transit·lifecycle·
 * 일진 충/합)가 점성·사주 양쪽에서 같은 날 겹칠 때**를 "큰 날"로 본다.
 * exactness 가중(transit 이 정확히 맞는 날↑)으로 그달 핵심일이 또렷해진다.
 *
 * keyEvents 를 대체하지 않고 별도 필드(Interpretation.convergence)로 얹는다.
 */

// 무거운 점성 = 느린 행성 transit + lifecycle/eclipse/angle-contact.
// 빠른 행성(달·수성·금성·화성·태양)은 큰날 판정에서 제외(시간 줌 전용 노이즈).
const SLOW_PLANETS = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron'])
const HEAVY_ASTRO_KINDS = new Set(['lifecycle', 'eclipse', 'angle-contact'])
// 무거운 사주 = 일진 충/합/삼합 + 용신 활성 (대운/세운 상시 배경은 제외).
const HEAVY_SAJU_KINDS = new Set(['hyeongchung'])

const MIN_IMPACT = 0.4
const PEAK_WINDOW_DAYS = 15

function leadToken(name: string): string {
  return (name || '').split(/[ ·]/)[0]
}

function isHeavyAstro(s: ActiveSignal): boolean {
  if (s.source !== 'astro') return false
  if (HEAVY_ASTRO_KINDS.has(s.kind)) return true
  if (s.kind === 'transit') {
    const p = leadToken(s.name)
    return SLOW_PLANETS.has(p) || p === 'True' || p === 'North' // True/North Node
  }
  return false
}

function isHeavySaju(s: ActiveSignal): boolean {
  if (s.source !== 'saju') return false
  if (HEAVY_SAJU_KINDS.has(s.kind)) return true
  return /용신 활성/.test(s.korean || s.name || '')
}

// transit 이 정확히 맞는 날(active.peak) 일수록 1.0, 윈도우 가장자리로 갈수록 감쇠.
// → 느린 transit 이 한 달 내내 비슷하게 깔려 핵심일이 무뎌지던 문제 해소.
function exactnessFactor(cellDate: string, s: ActiveSignal): number {
  const peak = s.active?.peak
  if (!peak) return 1
  const days = Math.abs(new Date(cellDate).getTime() - new Date(peak).getTime()) / 86_400_000
  return Math.max(0.3, 1 - days / PEAK_WINDOW_DAYS)
}

function cleanName(s: ActiveSignal): string {
  return (s.korean || s.name || '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim()
    .slice(0, 28)
}

export interface ConvergenceDay {
  date: string // YYYY-MM-DD
  score: number
  astro: string[] // 그날 무거운 점성 이벤트
  saju: string[] // 그날 무거운 사주 이벤트
  bothSystems: boolean // 점성·사주 둘 다 무거운 게 있었나 (진짜 수렴)
}

export interface Convergence {
  /** 그 기간 "큰 날" — 무거운 이벤트가 양 체계에서 겹치는 날 (수렴 내림차순) */
  keyDays: ConvergenceDay[]
}

export function deriveConvergence(cells: CalendarCell[], topN = 5): Convergence {
  const scored: ConvergenceDay[] = []
  for (const c of cells) {
    let astroHeavy = 0
    let sajuHeavy = 0
    const astro: string[] = []
    const saju: string[] = []
    for (const s of c.signals) {
      const imp = Math.abs(s.polarity) * s.weight
      if (imp < MIN_IMPACT) continue
      if (isHeavyAstro(s)) {
        astroHeavy += imp * exactnessFactor(c.datetime, s)
        const n = cleanName(s)
        if (n && astro.length < 3 && !astro.includes(n)) astro.push(n)
      } else if (isHeavySaju(s)) {
        sajuHeavy += imp
        const n = cleanName(s)
        if (n && saju.length < 3 && !saju.includes(n)) saju.push(n)
      }
    }
    if (astroHeavy === 0 && sajuHeavy === 0) continue
    const bothSystems = astroHeavy > 0 && sajuHeavy > 0
    const score = astroHeavy + sajuHeavy + (bothSystems ? Math.min(astroHeavy, sajuHeavy) * 1.5 : 0)
    scored.push({
      date: c.datetime.slice(0, 10),
      score: Math.round(score * 10) / 10,
      astro,
      saju,
      bothSystems,
    })
  }
  scored.sort((a, b) => b.score - a.score)
  // 같은 구간 중복 줄이기 — 3일 이내 근접일은 상위 하나만.
  const picked: ConvergenceDay[] = []
  for (const d of scored) {
    if (picked.length >= topN) break
    if (
      picked.some(
        (p) => Math.abs(new Date(p.date).getTime() - new Date(d.date).getTime()) < 3 * 86_400_000
      )
    )
      continue
    picked.push(d)
  }
  return { keyDays: picked }
}

import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { ActiveSignal, CalendarCell } from '../types'
import {
  cleanSignalName as cleanName,
  isHeavyAstro,
  isHeavySaju,
  MIN_IMPACT,
} from './convergence-heavy'

/**
 * 수렴(convergence) 디라이버 — "큰 날" 탐지.
 *
 * 기존 keyEvents 는 derivedScore(전 신호 평균) 최고일을 뽑아 "평균 높은 날"이
 * 나왔다. 이 모듈은 다른 기준 — **무거운 이벤트(느린 행성 transit·lifecycle·
 * 일진 충/합)가 점성·사주 양쪽에서 같은 날 겹칠 때**를 "큰 날"로 본다.
 * exactness 가중(transit 이 정확히 맞는 날↑)으로 그달 핵심일이 또렷해진다.
 *
 * keyEvents 를 대체하지 않고 별도 필드(Interpretation.convergence)로 얹는다.
 * 무거움 분류(SLOW_PLANETS/HEAVY_*_KINDS/isHeavy*)는 convergence-heavy.ts 단일 정의.
 */

const PEAK_WINDOW_DAYS = 15

// transit 이 정확히 맞는 날(active.peak) 일수록 1.0, 윈도우 가장자리로 갈수록 감쇠.
// → 느린 transit 이 한 달 내내 비슷하게 깔려 핵심일이 무뎌지던 문제 해소.
function exactnessFactor(cellDate: string, s: ActiveSignal): number {
  const peak = s.active?.peak
  if (!peak) return 1
  const days = Math.abs(new Date(cellDate).getTime() - new Date(peak).getTime()) / 86_400_000
  return Math.max(0.3, 1 - days / PEAK_WINDOW_DAYS)
}

const THEME_LABEL: Record<'ko' | 'en', Record<AstroThemeKey, string>> = {
  ko: { love: '연애', money: '재물', career: '직업', health: '건강', growth: '성장' },
  en: { love: 'love', money: 'money', career: 'career', health: 'health', growth: 'growth' },
}

// "2층 의미" 한 줄 — 그날 무거운 신호들의 theme(영역) + 순극성(톤)으로 구성.
// 특정 점성 산문을 지어내지 않고 엔진이 이미 태깅한 값만 쓴다.
// 톤 풀 — 사용자 피드백: 모든 큰 날 "X 영역이 기회가 열리는 날" 똑같이 나옴.
// 같은 톤(positive/neutral/negative) 안에서도 4가지로 회전 (날짜 hash 기반).
const TONE_POOL_KO = {
  positive: [
    (areas: string) => `${areas} 영역에 기회가 열리는 날`,
    (areas: string) => `${areas} 흐름이 모이는 시점`,
    (areas: string) => `${areas} 결정이 무르익는 날`,
    (areas: string) => `${areas} 신호가 강해지는 때`,
  ],
  negative: [
    (areas: string) => `${areas} 영역이 시험받는 날`,
    (areas: string) => `${areas} 점검이 필요한 시점`,
    (areas: string) => `${areas} 감정이 무거워질 수 있음`,
    (areas: string) => `${areas} 신중함이 우선되는 때`,
  ],
  neutral: [
    (areas: string) => `${areas} 영역이 크게 전환되는 날`,
    (areas: string) => `${areas} 방향이 바뀌는 시점`,
    (areas: string) => `${areas} 균형이 다시 잡히는 때`,
    (areas: string) => `${areas} 큰 변화가 시작되는 날`,
  ],
}
const TONE_POOL_EN = {
  positive: [
    (areas: string) => `${areas} opens up`,
    (areas: string) => `${areas} momentum builds`,
    (areas: string) => `${areas} resolves clearly`,
    (areas: string) => `${areas} signal strengthens`,
  ],
  negative: [
    (areas: string) => `${areas} is tested`,
    (areas: string) => `${areas} needs review`,
    (areas: string) => `${areas} feels heavier`,
    (areas: string) => `${areas} asks for caution`,
  ],
  neutral: [
    (areas: string) => `${areas} pivots`,
    (areas: string) => `${areas} direction shifts`,
    (areas: string) => `${areas} rebalances`,
    (areas: string) => `${areas} starts a new chapter`,
  ],
}

function composeMeaning(
  themeAcc: Partial<Record<AstroThemeKey, number>>,
  netPol: number,
  sumImp: number,
  lang: 'ko' | 'en',
  dateStr?: string
): string | undefined {
  const top = (Object.entries(themeAcc) as Array<[AstroThemeKey, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => THEME_LABEL[lang][k])
  if (top.length === 0) return undefined
  const ratio = sumImp > 0 ? netPol / sumImp : 0
  const toneKey: 'positive' | 'negative' | 'neutral' =
    ratio > 0.15 ? 'positive' : ratio < -0.15 ? 'negative' : 'neutral'
  // 날짜 hash 로 같은 톤에서도 다른 템플릿 — UI 가 여러 날 나란히 보일 때 단조로움 회피
  const dayNum = dateStr ? parseInt(dateStr.slice(-2), 10) : 0
  const pool = lang === 'en' ? TONE_POOL_EN : TONE_POOL_KO
  const templates = pool[toneKey]
  const tmpl = templates[Math.abs(dayNum) % templates.length]
  const areas = lang === 'en' ? top.join(' · ') : top.join('·')
  return tmpl(areas)
}

export interface ConvergenceDay {
  date: string // YYYY-MM-DD
  score: number
  astro: string[] // 그날 무거운 점성 이벤트
  saju: string[] // 그날 무거운 사주 이벤트
  bothSystems: boolean // 점성·사주 둘 다 무거운 게 있었나 (진짜 수렴)
  meaning?: string // 영역(theme) + 톤(polarity) 한 줄 의미
}

export interface Convergence {
  /** 그 기간 "큰 날" — 무거운 이벤트가 양 체계에서 겹치는 날 (수렴 내림차순) */
  keyDays: ConvergenceDay[]
}

export function deriveConvergence(
  cells: CalendarCell[],
  topN = 5,
  lang: 'ko' | 'en' = 'ko'
): Convergence {
  const scored: ConvergenceDay[] = []
  for (const c of cells) {
    let astroHeavy = 0
    let sajuHeavy = 0
    const astro: string[] = []
    const saju: string[] = []
    const themeAcc: Partial<Record<AstroThemeKey, number>> = {}
    let netPol = 0
    let sumImp = 0
    for (const s of c.signals) {
      const imp = Math.abs(s.polarity) * s.weight
      if (imp < MIN_IMPACT) continue
      const heavyAstro = isHeavyAstro(s)
      const heavySaju = !heavyAstro && isHeavySaju(s)
      if (!heavyAstro && !heavySaju) continue
      if (heavyAstro) {
        astroHeavy += imp * exactnessFactor(c.datetime, s)
        const n = cleanName(s)
        if (n && astro.length < 3 && !astro.includes(n)) astro.push(n)
      } else {
        sajuHeavy += imp
        const n = cleanName(s)
        if (n && saju.length < 3 && !saju.includes(n)) saju.push(n)
      }
      // 의미 한 줄용 — 무거운 신호의 theme/polarity 누적
      netPol += s.polarity * imp
      sumImp += imp
      for (const t of s.themes) themeAcc[t] = (themeAcc[t] ?? 0) + imp * (s.themeWeights?.[t] ?? 1)
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
      meaning: composeMeaning(themeAcc, netPol, sumImp, lang, c.datetime.slice(0, 10)),
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

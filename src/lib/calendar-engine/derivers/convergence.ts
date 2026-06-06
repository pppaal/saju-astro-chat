import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { ActiveSignal, CalendarCell } from '../types'
import {
  cleanSignalName as cleanName,
  isHeavyAstro,
  isHeavySaju,
  isSlowBackgroundAstro,
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

/**
 * 큰 날의 활성 구간 — 구성 무거운 신호들의 active window 를 합쳐 하나의 구간으로.
 * start = 가장 이른 시작, end = 가장 늦은 끝, peak = impact 최대 신호의 정점.
 */
function aggregateWindow(
  sigs: ActiveSignal[],
  cellIso: string
): { start: string; peak: string; end: string } | undefined {
  // 합집합 — 단, *스케일 적합* 신호만. 느린 외행성(윈도우 수개월~수년)이 섞이면
  // 합집합이 "큰 날" 윈도우를 1년으로 늘려 무의미해진다. 그래서 윈도우 폭이 월
  // 스케일(≤45일) 이하인 신호만 집계 → daily만 있으면 점(범위 숨김), monthly
  // 신호가 있으면 진짜 "빌드업→정점→소멸" 몇 주 구간이 잡힌다.
  const MAX_SPAN_MS = 45 * 86_400_000
  let startMs = Number.POSITIVE_INFINITY
  let endMs = Number.NEGATIVE_INFINITY
  let peakIso: string | undefined
  let peakImp = -1
  for (const s of sigs) {
    const st = s.active?.start ? Date.parse(s.active.start) : NaN
    const en = s.active?.end ? Date.parse(s.active.end) : NaN
    if (Number.isNaN(st) || Number.isNaN(en)) continue
    if (en - st > MAX_SPAN_MS) continue // 느린(년/십년) 신호는 윈도우 집계 제외
    startMs = Math.min(startMs, st)
    endMs = Math.max(endMs, en)
    const imp = Math.abs(s.polarity) * s.weight
    if (imp > peakImp && s.active?.peak) {
      peakImp = imp
      peakIso = s.active.peak
    }
  }
  const cellMs = Date.parse(cellIso)
  // 스케일 적합 신호가 하나도 없으면(전부 느림) 셀 날짜 점으로 폴백.
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    if (Number.isNaN(cellMs)) return undefined
    startMs = cellMs
    endMs = cellMs
  }
  // 정점 — 가장 강한 신호의 peak 이 구간 안이면 그걸, 아니면 셀 날짜(구간 안일
  // 때), 둘 다 아니면 중점.
  const peakMs = peakIso ? Date.parse(peakIso) : NaN
  const peakResolved =
    !Number.isNaN(peakMs) && peakMs >= startMs && peakMs <= endMs
      ? peakMs
      : !Number.isNaN(cellMs) && cellMs >= startMs && cellMs <= endMs
        ? cellMs
        : (startMs + endMs) / 2
  // 정점 기준 ±21일로 클램프 — 여러 월 스케일 신호의 합집합이 2~3개월로 벌어지면
  // "큰 날"의 빌드업→소멸로는 너무 넓다. 몇 주 구간으로 정직하게 묶는다.
  const PAD_MS = 21 * 86_400_000
  startMs = Math.max(startMs, peakResolved - PAD_MS)
  endMs = Math.min(endMs, peakResolved + PAD_MS)
  return {
    start: new Date(startMs).toISOString(),
    peak: new Date(peakResolved).toISOString(),
    end: new Date(endMs).toISOString(),
  }
}

/**
 * 큰 날 신뢰도 0~100. crossAgreement 와 같은 결: 무거운 신호 질량(|polarity|≥2
 * 개수) + 둘 다 존재 보너스 + 사주↔점성 *방향 일치*(같은 방향 +8 / 반대 −8).
 */
function convergenceConfidence(
  sigs: ActiveSignal[],
  bothSystems: boolean,
  astroPolNet: number,
  sajuPolNet: number
): number {
  // *깊이* = 양쪽이 동시에 무거운 정도 = min(사주 무거움, 점성 무거움).
  // 한쪽(느린 외행성)만 잔뜩 무거워도 신뢰가 오르면 안 된다 — 그건 "수렴"이
  // 아니라 늘 켜진 배경. 그래서 합이 아니라 *약한 쪽*(binding constraint)을 본다.
  const heavy = sigs.filter((s) => Math.abs(s.polarity) >= 2)
  const sajuHeavy = heavy.filter((s) => s.source === 'saju').length
  const astroHeavy = heavy.filter((s) => s.source === 'astro').length
  const depth = Math.min(sajuHeavy, astroHeavy, 4)
  let c = 40 + depth * 9
  if (bothSystems && astroPolNet !== 0 && sajuPolNet !== 0) {
    const same = Math.sign(astroPolNet) === Math.sign(sajuPolNet)
    c += same ? 12 : -12
  }
  return Math.max(0, Math.min(100, Math.round(c)))
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
  const entries = (Object.entries(themeAcc) as Array<[AstroThemeKey, number]>).sort(
    (a, b) => b[1] - a[1]
  )
  if (entries.length === 0) return undefined
  const ratio = sumImp > 0 ? netPol / sumImp : 0
  const toneKey: 'positive' | 'negative' | 'neutral' =
    ratio > 0.15 ? 'positive' : ratio < -0.15 ? 'negative' : 'neutral'
  // 날짜 hash 로 톤 템플릿 + "그날 두드러진 테마" 중 하나를 회전 선택. 항상 지배 테마
  // top-2(예: 직업·성장)를 붙이면 큰 날 목록이 같은 테마로 도배돼, 그날 notable
  // 테마(최댓값의 60% 이상) 중 날짜별로 하나만 골라 다양화(여전히 그날 실제 테마).
  const maxV = entries[0][1]
  const notable = entries.filter(([, v]) => v >= maxV * 0.6).map(([k]) => k)
  const dayNum = dateStr ? Math.abs(parseInt(dateStr.slice(-2), 10)) : 0
  const pool = lang === 'en' ? TONE_POOL_EN : TONE_POOL_KO
  const templates = pool[toneKey]
  const tmpl = templates[dayNum % templates.length]
  const area = THEME_LABEL[lang][notable[dayNum % notable.length]]
  return tmpl(area)
}

export interface ConvergenceDay {
  date: string // YYYY-MM-DD
  score: number
  astro: string[] // 그날 무거운 점성 이벤트
  saju: string[] // 그날 무거운 사주 이벤트
  bothSystems: boolean // 점성·사주 둘 다 무거운 게 있었나 (진짜 수렴)
  meaning?: string // 영역(theme) + 톤(polarity) 한 줄 의미
  /**
   * 그 큰 날의 *활성 구간* — 구성 무거운 신호들의 active window 집계.
   * start=가장 이른 시작, end=가장 늦은 끝, peak=가장 강한 신호의 정점.
   * "7/15 좋음"(점)이 아니라 "7/10~20 빌드업→정점→소멸"(구간)을 위해.
   * 윈도우 정보 있는 무거운 신호가 없으면 undefined.
   */
  window?: { start: string; peak: string; end: string }
  /**
   * 그 큰 날의 신뢰도 0~100 — 무거운 신호 질량 + 사주↔점성 *방향 일치*.
   * 둘 다 무겁고 같은 방향이면 ↑, 반대 방향이면 ↓ (수렴이지만 갈등).
   */
  confidence?: number
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
    // 윈도우 집계·confidence 용: 그날 무거운 신호와 source 별 방향(polarity×imp) 합.
    const heavySignals: ActiveSignal[] = []
    let astroPolNet = 0
    let sajuPolNet = 0
    for (const s of c.signals) {
      const imp = Math.abs(s.polarity) * s.weight
      if (imp < MIN_IMPACT) continue
      const heavyAstro = isHeavyAstro(s)
      const heavySaju = !heavyAstro && isHeavySaju(s)
      if (!heavyAstro && !heavySaju) continue
      heavySignals.push(s)
      if (heavyAstro) {
        astroHeavy += imp * exactnessFactor(c.datetime, s)
        astroPolNet += s.polarity * imp
        // 늘 켜진 최외곽 배경(천왕·해왕·명왕)은 칩에서 숨긴다 — 무거움 합산엔
        // 반영하되 표시는 그날 *구별되는* 점성 신호(달·수성·금성·화성·각 접촉)만.
        const n = cleanName(s)
        if (n && astro.length < 3 && !astro.includes(n) && !isSlowBackgroundAstro(s))
          astro.push(n)
      } else {
        sajuHeavy += imp
        sajuPolNet += s.polarity * imp
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
      window: aggregateWindow(heavySignals, c.datetime),
      confidence: convergenceConfidence(heavySignals, bothSystems, astroPolNet, sajuPolNet),
    })
  }
  scored.sort((a, b) => b.score - a.score)
  const picked: ConvergenceDay[] = []
  const tooClose = (d: ConvergenceDay) =>
    picked.some(
      (p) => Math.abs(new Date(p.date).getTime() - new Date(d.date).getTime()) < 3 * 86_400_000
    )
  // 다양성 — 같은 사주 근거 묶음(예: 亥-일진의 지지형/육합/파)이 큰 날을 도배하지
  // 않게 동일 사주 시그니처는 최대 2개. (astro 는 날마다 달라 점성-only 빈 사주는 캡 제외)
  const SAJU_SIG_CAP = 2
  const sigCount = new Map<string, number>()
  const sigOf = (d: ConvergenceDay) => [...d.saju].sort().join('|')
  // pass 1: 근접 dedup + 사주 시그니처 캡
  for (const d of scored) {
    if (picked.length >= topN) break
    if (tooClose(d)) continue
    const sig = sigOf(d)
    if (sig && (sigCount.get(sig) ?? 0) >= SAJU_SIG_CAP) continue
    picked.push(d)
    if (sig) sigCount.set(sig, (sigCount.get(sig) ?? 0) + 1)
  }
  // pass 2: 캡 때문에 topN 못 채웠으면 캡 무시하고 채움(근접 dedup 유지)
  if (picked.length < topN) {
    for (const d of scored) {
      if (picked.length >= topN) break
      if (picked.includes(d)) continue
      if (tooClose(d)) continue
      picked.push(d)
    }
  }
  return { keyDays: picked }
}

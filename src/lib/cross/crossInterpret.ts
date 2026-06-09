/**
 * 교차 해석 공통 코어 — 리포트·캘린더가 *같은* 사주×점성 교차 사전(SSOT)으로
 * 해석하도록 단일화한다.
 *
 * 철학(사용자 정의): "뭐가 교차됐는가(사주 요소 × 점성 요소)" 를 찾아 → **공통 DB
 * (SAJU_ASTRO_MAPPINGS) 의 meaning 으로 해석**. 테마 분류·합의/긴장 점수가 아니라,
 * 교차쌍 그 자체의 정통 의미가 곧 해석이다.
 *
 * - 리포트: 본명에서 동시 성립한 교차쌍 → meaning.
 * - 캘린더: 시간 위에서 동시 활성인 교차쌍(cross-activation 신호) → meaning.
 *   셀마다 교차가 여러 개라 v3 희소도(−logP, surprise)로 "드문(=특별한) 교차"만 추린다.
 *
 * 순수 함수. 사전은 calendar-engine/data 의 SSOT 한 벌만 참조.
 */

import {
  SAJU_ASTRO_MAPPINGS,
  type CrossMapping,
  type CrossMappingGrade,
} from '@/lib/calendar-engine/data/saju-astro-mapping'
import type { ActiveSignal } from '@/lib/calendar-engine/types'
import { signalImportance, type BaseRateTable } from '@/lib/calendar-engine/derivers/surprise'

// (saju|astro) → mapping 인덱스 (O(1) 룩업).
const CROSS_INDEX: Map<string, CrossMapping> = (() => {
  const m = new Map<string, CrossMapping>()
  for (const cm of SAJU_ASTRO_MAPPINGS) m.set(`${cm.saju}|${cm.astro}`, cm)
  return m
})()

/** 교차쌍 → 공통 DB 매핑. 없으면 null. */
export function lookupCross(saju: string, astro: string): CrossMapping | null {
  return CROSS_INDEX.get(`${saju}|${astro}`) ?? null
}

/** 교차쌍 → 해석 문장(공통 DB meaning). 없으면 null. */
export function crossMeaning(saju: string, astro: string, lang: 'ko' | 'en' = 'ko'): string | null {
  const m = lookupCross(saju, astro)
  return m ? m.meaning[lang] : null
}

export interface RankedCross {
  saju: string
  astro: string
  /** 공통 DB meaning(lang). 사전에 없으면 신호 자체 텍스트로 폴백. */
  meaning: string
  grade: CrossMappingGrade | null
  /** 그 시점 교차의 길흉 방향(신호 합성 polarity). */
  polarity: number
  /** v3 희소도 기여 = (−logP) × |polarity| × weight. 랭킹 기준. */
  importance: number
}

function crossKeys(s: ActiveSignal): { saju?: string; astro?: string } {
  const d = s.evidence?.detail as { sajuKey?: string; astroKey?: string } | undefined
  if (d?.sajuKey || d?.astroKey) return { saju: d.sajuKey, astro: d.astroKey }
  // 폴백: name "사주 × 점성" 파싱.
  const m = /^(.+?)\s*×\s*(.+)$/u.exec(s.name ?? '')
  return m ? { saju: m[1].trim(), astro: m[2].trim() } : {}
}

/**
 * 활성 교차(cross-activation) 신호를 v3 희소도로 추려 공통 DB 해석과 함께 반환.
 * "셀마다 교차가 여러 개" → 드문 것 top-N 만 노출(노이즈 억제, §0 타이밍 철학).
 *
 * @param signals 한 셀(혹은 한 시점)의 신호 전체 — cross-activation 만 골라낸다.
 * @param rates   base-rate 테이블(computeBaseRates).
 */
export function rankActiveCrosses(
  signals: ActiveSignal[],
  rates: BaseRateTable,
  opts: { lang?: 'ko' | 'en'; topN?: number } = {}
): RankedCross[] {
  const lang = opts.lang ?? 'ko'
  const topN = opts.topN ?? 3

  const ranked: RankedCross[] = []
  for (const s of signals) {
    if (s.kind !== 'cross-activation') continue
    const { saju, astro } = crossKeys(s)
    const mapping = saju && astro ? lookupCross(saju, astro) : null
    const meaning = mapping?.meaning[lang] ?? (lang === 'ko' ? s.korean : undefined) ?? s.name ?? ''
    ranked.push({
      saju: saju ?? '',
      astro: astro ?? '',
      meaning,
      grade: mapping?.grade ?? null,
      polarity: s.polarity,
      importance: Math.round(signalImportance(s, rates) * 1000) / 1000,
    })
  }
  ranked.sort((a, b) => b.importance - a.importance)
  return ranked.slice(0, topN)
}

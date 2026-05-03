// Cross-rules augmenter for calendar.
//
// 기존 analyzeDate (per-date 동기)를 건드리지 않고, cross-rules 엔진의
// 차트 단위 결과를 별도로 한 번 호출해서 캘린더 UI에 보조 데이터로 표시.
//
// 365번 반복 호출되는 analyzeDate에 async를 끼워 넣지 않아 성능 영향 0.
// 기존 캘린더 출력은 그대로, '이번 시기의 큰 그림' 한 카드만 추가.

import { runFortune, type FortuneReport } from '@/lib/fortune/cross-rules'
import type { BirthProfile } from '@/lib/fortune/cross-rules'

/** 캘린더 페이지 상단/사이드에 표시할 cross-rules 요약. */
export interface CalendarCrossAugment {
  /** 통합 테마 (메타룰 발화 결과). */
  themes: Array<{ id: string; meaning: string; narrative: string }>
  /** 도메인별 톤 + 강한 confirm + 양면 신호 (cross-rules의 핵심 가치). */
  domains: Array<{
    domain: 'self' | 'love' | 'money' | 'career' | 'health' | 'family'
    tone: 'positive' | 'negative' | 'mixed' | 'neutral'
    topConfirms: Array<{ meaning: string; intensity: 'strong' | 'moderate' | 'weak' }>
    /** 양면성(conflict) 신호 — 점수 시스템이 평탄화하는 정보를 보존. */
    dualSignals: Array<{
      meaning: string
      intensity: 'strong' | 'moderate' | 'weak'
      narrative: string
    }>
    /** 양면성 존재 여부 (UI에서 양면 배지 표시용). */
    hasConflict: boolean
  }>
  /** 컨텍스트 (현재 대운/세운/ZR chapter 등). */
  context: FortuneReport['context']
}

export async function buildCalendarCrossAugment(
  birth: BirthProfile,
  queryDate: Date = new Date(),
): Promise<CalendarCrossAugment> {
  return _buildAugmentForDate(birth, queryDate)
}

/**
 * 주간 augment — 7일 중 가운데 날을 대표로 한 번만 호출.
 * 일별 호출 7회 대신 1회로 줄이면서 그 주의 큰 흐름 보여줌.
 */
export async function buildWeeklyCrossAugment(
  birth: BirthProfile,
  weekStart: Date,
): Promise<CalendarCrossAugment & { weekStart: string; weekEnd: string }> {
  const mid = new Date(weekStart)
  mid.setDate(mid.getDate() + 3)
  const aug = await _buildAugmentForDate(birth, mid)
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  return {
    ...aug,
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: end.toISOString().slice(0, 10),
  }
}

/**
 * 월간 augment — 그 달 15일 기준 한 번 호출. 캘린더 헤더에 그 달 큰 흐름.
 */
export async function buildMonthlyCrossAugment(
  birth: BirthProfile,
  year: number,
  month: number, // 1-12
): Promise<CalendarCrossAugment & { year: number; month: number }> {
  const mid = new Date(year, month - 1, 15, 12, 0, 0)
  const aug = await _buildAugmentForDate(birth, mid)
  return { ...aug, year, month }
}

async function _buildAugmentForDate(
  birth: BirthProfile,
  queryDate: Date,
): Promise<CalendarCrossAugment> {
  const report = await runFortune({
    birth,
    queryDate,
    skipReturns: true, // 캘린더 augmenter는 가벼운 흐름 정보만 필요
  })

  const themes = report.themes.map((t) => ({
    id: t.rule.id,
    meaning: t.rule.meaning,
    narrative: t.rule.narrative,
  }))

  const domains = (Object.keys(report.byDomain) as Array<keyof typeof report.byDomain>).map((d) => {
    const agg = report.byDomain[d]
    return {
      domain: d,
      tone: agg.tone,
      topConfirms: agg.confirms.slice(0, 2).map((m) => ({
        meaning: m.rule.meaning,
        intensity: m.intensity,
      })),
      dualSignals: agg.conflicts.slice(0, 2).map((m) => ({
        meaning: m.rule.meaning,
        intensity: m.intensity,
        narrative: m.rule.narrative.conflict ?? m.rule.narrative.confirm,
      })),
      hasConflict: agg.conflicts.length > 0,
    }
  })

  // ZR chapter는 astro normalizer가 timing.zr.l1.* 시그널로 노출하지만,
  // augmenter 단계에서는 context를 활용. astro extras까지 가져오려면 어댑터 직접 호출 필요.
  // 여기선 가벼운 요약만 — 자세한 시각화는 별도 함수로 분리 가능.
  return { themes, domains, context: report.context }
}

/**
 * Decision Tracker (Tier 2B) — 사주·점성 분석을 한 결정과 결과를 학습 루프에.
 *
 * 1. 사용자가 결정을 내릴 때 logUserDecision() 호출 — 결정 + 그 시점 신호 강도 저장
 * 2. 3-6개월 뒤 reviewAt 시점이 되면 클라이언트가 evaluate API로 결과 입력
 * 3. 다음 분석 시 LLM 프롬프트에 "이전에 이런 결정 X를 했고 결과 Y였음" 컨텍스트 주입
 *
 * 효과: 사주·점성 신호가 실제 outcome과 어떻게 매핑되는지 사용자별 calibration 누적
 */

import { logger } from '@/lib/logger'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'

export type DecisionType =
  | 'career_change'
  | 'marriage'
  | 'move'
  | 'investment'
  | 'health'
  | 'other'

export type DecisionOutcome = 'good' | 'mixed' | 'bad' | 'pending'

export interface DecisionSignal {
  sajuConfidence?: number // 0-1
  astroConfidence?: number // 0-1
  crossBand?: 'high' | 'medium' | 'low' | 'conflict'
}

export interface LogDecisionInput {
  userId: string
  decisionType: DecisionType
  context: string
  recommendedAction?: string
  tookAction?: boolean
  decidedAt?: Date
  reviewMonthsLater?: number // 기본 3개월
  signalAtDecision?: DecisionSignal
}

/**
 * 결정 기록 — 분석 시점 신호 강도와 함께 저장.
 * reviewAt = decidedAt + reviewMonthsLater (기본 3)
 */
export async function logUserDecision(input: LogDecisionInput): Promise<{
  id: string
} | null> {
  try {
    const decidedAt = input.decidedAt || new Date()
    const reviewMonths = input.reviewMonthsLater ?? 3
    const reviewAt = new Date(decidedAt.getTime() + reviewMonths * 30 * 24 * 3600 * 1000)
    const created = await prisma.userDecision.create({
      data: {
        userId: input.userId,
        decisionType: input.decisionType,
        context: input.context.slice(0, 500),
        recommendedAction: input.recommendedAction?.slice(0, 500),
        tookAction: input.tookAction,
        decidedAt,
        reviewAt,
        outcome: 'pending',
        signalAtDecision: input.signalAtDecision
          ? (input.signalAtDecision as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
      select: { id: true },
    })
    return created
  } catch (err) {
    logger.warn('[decisionTracker] log failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

export interface EvaluateDecisionInput {
  decisionId: string
  userId: string
  outcome: DecisionOutcome
  outcomeNote?: string
}

/**
 * 결정 결과 평가 — 사용자가 후기 입력했을 때.
 */
export async function evaluateUserDecision(
  input: EvaluateDecisionInput
): Promise<boolean> {
  try {
    const result = await prisma.userDecision.updateMany({
      where: { id: input.decisionId, userId: input.userId },
      data: {
        outcome: input.outcome,
        outcomeNote: input.outcomeNote?.slice(0, 1000),
        evaluatedAt: new Date(),
      },
    })
    return result.count > 0
  } catch (err) {
    logger.warn('[decisionTracker] evaluate failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}

/**
 * 사용자의 최근 결정 + outcome 기록 조회 (LLM 프롬프트 주입용).
 */
export async function getDecisionHistory(
  userId: string,
  limit: number = 5
): Promise<
  Array<{
    decisionType: string
    context: string
    recommendedAction: string | null
    outcome: string | null
    outcomeNote: string | null
    decidedAt: Date | null
    evaluatedAt: Date | null
  }>
> {
  try {
    const rows = await prisma.userDecision.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        decisionType: true,
        context: true,
        recommendedAction: true,
        outcome: true,
        outcomeNote: true,
        decidedAt: true,
        evaluatedAt: true,
      },
    })
    return rows
  } catch (err) {
    logger.warn('[decisionTracker] history fetch failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

/**
 * Review 예정 (= reviewAt 지났는데 아직 outcome=pending) 결정들 조회.
 * 클라이언트 알림·추적 page에서 사용.
 */
export async function getPendingReviews(
  userId: string
): Promise<
  Array<{
    id: string
    decisionType: string
    context: string
    decidedAt: Date | null
    reviewAt: Date | null
  }>
> {
  try {
    const rows = await prisma.userDecision.findMany({
      where: {
        userId,
        outcome: 'pending',
        reviewAt: { lte: new Date() },
      },
      orderBy: { reviewAt: 'asc' },
      take: 10,
      select: {
        id: true,
        decisionType: true,
        context: true,
        decidedAt: true,
        reviewAt: true,
      },
    })
    return rows
  } catch (err) {
    logger.warn('[decisionTracker] pending reviews fetch failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

/**
 * 결정 history → LLM narrative.
 * 사주·점성 분석 LLM에 "이전에 이런 결정·결과 있었음" 컨텍스트로 주입.
 */
export function formatDecisionHistoryKo(
  history: Array<{
    decisionType: string
    context: string
    recommendedAction: string | null
    outcome: string | null
    outcomeNote: string | null
    decidedAt: Date | null
    evaluatedAt: Date | null
  }>
): string {
  if (history.length === 0) return ''
  const TYPE_KO: Record<string, string> = {
    career_change: '커리어 전환',
    marriage: '결혼',
    move: '이주',
    investment: '투자',
    health: '건강',
    other: '기타',
  }
  const OUTCOME_KO: Record<string, string> = {
    good: '좋은 결과',
    mixed: '혼합 결과',
    bad: '아쉬운 결과',
    pending: '아직 평가 전',
  }
  const evaluated = history.filter((d) => d.outcome && d.outcome !== 'pending')
  const lines: string[] = []
  if (evaluated.length > 0) {
    lines.push('이전 결정·결과 기록:')
    for (const d of evaluated.slice(0, 4)) {
      const type = TYPE_KO[d.decisionType] || d.decisionType
      const outcome = OUTCOME_KO[d.outcome || 'pending']
      const ctx = d.context.length > 80 ? d.context.slice(0, 80) + '…' : d.context
      lines.push(`• ${type}: "${ctx}" → ${outcome}`)
      if (d.outcomeNote) lines.push(`  후기: ${d.outcomeNote.slice(0, 100)}`)
    }
  }
  const pending = history.filter((d) => d.outcome === 'pending')
  if (pending.length > 0) {
    lines.push('\n진행 중인 결정 (평가 대기):')
    for (const d of pending.slice(0, 3)) {
      const type = TYPE_KO[d.decisionType] || d.decisionType
      const ctx = d.context.length > 80 ? d.context.slice(0, 80) + '…' : d.context
      lines.push(`• ${type}: "${ctx}"`)
    }
  }
  return lines.join('\n')
}

export function formatDecisionHistoryEn(
  history: Array<{
    decisionType: string
    context: string
    recommendedAction: string | null
    outcome: string | null
    outcomeNote: string | null
    decidedAt: Date | null
    evaluatedAt: Date | null
  }>
): string {
  if (history.length === 0) return ''
  const evaluated = history.filter((d) => d.outcome && d.outcome !== 'pending')
  const lines: string[] = []
  if (evaluated.length > 0) {
    lines.push('Past decisions and outcomes:')
    for (const d of evaluated.slice(0, 4)) {
      const ctx = d.context.length > 80 ? d.context.slice(0, 80) + '…' : d.context
      lines.push(`• ${d.decisionType}: "${ctx}" → ${d.outcome}`)
      if (d.outcomeNote) lines.push(`  note: ${d.outcomeNote.slice(0, 100)}`)
    }
  }
  const pending = history.filter((d) => d.outcome === 'pending')
  if (pending.length > 0) {
    lines.push('\nDecisions in progress:')
    for (const d of pending.slice(0, 3)) {
      const ctx = d.context.length > 80 ? d.context.slice(0, 80) + '…' : d.context
      lines.push(`• ${d.decisionType}: "${ctx}"`)
    }
  }
  return lines.join('\n')
}

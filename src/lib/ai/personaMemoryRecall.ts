/**
 * Persona Memory recall 강화 모듈 (Tier 2A).
 *
 * 사용자의 이전 질문과 결정을 verbatim 기록·회상해서
 * 후속 세션에서 LLM이 "이전에 결혼 고민하셨던 거 어떻게 됐어요?" 같은
 * 연속성 있는 응답을 만들 수 있게 하는 핵심 모듈.
 *
 * 저장:
 *   - recentQuestions: 최근 8개 verbatim 질문 (최신 → 오래)
 *   - decisionsMentioned: "결정/계획/하려고" 패턴이 들어간 발화 8개
 *
 * 회상:
 *   - formatRecallContextKo(memory) → narrative block
 *   - LLM 프롬프트에 주입돼 연속성 있는 상담 가능
 */

import { logger } from '@/lib/logger'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'

const MAX_QUESTIONS = 8
const MAX_DECISIONS = 8
const MAX_QUESTION_CHARS = 180
const MAX_DECISION_CHARS = 200

export interface PersonaRecall {
  recentQuestions: RecallEntry[]
  decisionsMentioned: RecallEntry[]
}

export interface RecallEntry {
  text: string
  recordedAt: string // ISO date
}

/**
 * 사용자 발화에서 *결정/계획성 표현*을 추출.
 * 한국어 패턴 위주, 영어 fallback 포함.
 */
export function extractDecisionsFromMessage(message: string): string[] {
  if (!message || message.length < 6) return []
  const decisions: string[] = []
  const koPatterns = [
    /([^.!?\n]{0,80}하기로\s*했[어요다습][^.!?\n]{0,40}[.!?])/g,
    /([^.!?\n]{0,80}하려고\s*[해하한합][^.!?\n]{0,40}[.!?])/g,
    /([^.!?\n]{0,80}결정[했하][^.!?\n]{0,40}[.!?])/g,
    /([^.!?\n]{0,80}이직[\s을를]+[^.!?\n]{0,40}[.!?])/g,
    /([^.!?\n]{0,80}그만두[기겠려][^.!?\n]{0,40}[.!?])/g,
    /([^.!?\n]{0,80}시작하[기려려][^.!?\n]{0,40}[.!?])/g,
    /([^.!?\n]{0,80}결혼[\s을를]+[^.!?\n]{0,40}[.!?])/g,
    /([^.!?\n]{0,80}이사[\s을를]+[^.!?\n]{0,40}[.!?])/g,
  ]
  const enPatterns = [
    /(I\s+(?:decided|plan|will|am\s+going\s+to)[^.!?\n]{0,80}[.!?])/gi,
    /(I'?m\s+(?:planning|thinking)\s+to[^.!?\n]{0,80}[.!?])/gi,
  ]
  const allPatterns = [...koPatterns, ...enPatterns]
  for (const p of allPatterns) {
    const matches = message.match(p)
    if (matches) {
      for (const m of matches) {
        const trimmed = m.trim().slice(0, MAX_DECISION_CHARS)
        if (trimmed && !decisions.includes(trimmed)) decisions.push(trimmed)
      }
    }
  }
  return decisions.slice(0, 3)
}

/**
 * 사용자 발화에서 *질문 형태*를 추출 (단일 질문 대표).
 */
export function extractQuestionFromMessage(message: string): string | null {
  if (!message || message.length < 4) return null
  const trimmed = message.trim().slice(0, MAX_QUESTION_CHARS)
  // 너무 짧은 인사·감탄은 skip
  if (trimmed.length < 6) return null
  if (/^(네|예|응|아|음|ㅎ|hi|hello|ok|okay|yes|no)\b[^?]{0,3}$/i.test(trimmed)) return null
  return trimmed
}

/**
 * Persona Memory에 recentQuestions·decisions 누적.
 * 호출 시점: 사용자 메시지 처리 직후 (혹은 세션 종료 시 batch).
 */
export async function appendUserUtteranceToRecall(
  userId: string,
  userMessage: string
): Promise<void> {
  if (!userId || !userMessage) return
  try {
    const question = extractQuestionFromMessage(userMessage)
    const decisions = extractDecisionsFromMessage(userMessage)
    if (!question && decisions.length === 0) return

    const existing = await prisma.personaMemory.findUnique({
      where: { userId },
      select: { recentQuestions: true, decisionsMentioned: true },
    })
    const now = new Date().toISOString()

    const prevQuestions = (existing?.recentQuestions as RecallEntry[] | null) || []
    const prevDecisions = (existing?.decisionsMentioned as RecallEntry[] | null) || []

    const updatedQuestions = question
      ? dedupePushFront(prevQuestions, { text: question, recordedAt: now }, MAX_QUESTIONS)
      : prevQuestions
    const updatedDecisions =
      decisions.length > 0
        ? decisions.reduce(
            (acc, d) => dedupePushFront(acc, { text: d, recordedAt: now }, MAX_DECISIONS),
            prevDecisions
          )
        : prevDecisions

    if (existing) {
      await prisma.personaMemory.update({
        where: { userId },
        data: {
          recentQuestions: updatedQuestions as unknown as Prisma.InputJsonValue,
          decisionsMentioned: updatedDecisions as unknown as Prisma.InputJsonValue,
        },
      })
    } else {
      await prisma.personaMemory.create({
        data: {
          userId,
          recentQuestions: updatedQuestions as unknown as Prisma.InputJsonValue,
          decisionsMentioned: updatedDecisions as unknown as Prisma.InputJsonValue,
          sessionCount: 0,
        },
      })
    }
  } catch (err) {
    logger.warn('[personaMemoryRecall] append failed', {
      err: err instanceof Error ? err.message : String(err),
    })
  }
}

function dedupePushFront(
  arr: RecallEntry[],
  entry: RecallEntry,
  cap: number
): RecallEntry[] {
  const filtered = arr.filter((e) => e.text !== entry.text)
  return [entry, ...filtered].slice(0, cap)
}

/**
 * 회상 narrative 생성 — 후속 세션 LLM 프롬프트에 주입.
 *
 * "이전에 이런 질문 하셨고 / 이런 결정 말씀하셨어요" 톤.
 */
export function formatRecallContextKo(
  memory: {
    recentQuestions?: unknown
    decisionsMentioned?: unknown
  } | null
): string {
  if (!memory) return ''
  const questions = (memory.recentQuestions as RecallEntry[] | null) || []
  const decisions = (memory.decisionsMentioned as RecallEntry[] | null) || []
  if (questions.length === 0 && decisions.length === 0) return ''

  const parts: string[] = []

  if (questions.length > 0) {
    const top = questions.slice(0, 3)
    const lines = top.map((q) => {
      const days = daysAgo(q.recordedAt)
      const label = days === 0 ? '오늘' : days === 1 ? '어제' : `${days}일 전`
      return `• [${label}] "${truncate(q.text, 90)}"`
    })
    parts.push(`이전에 이런 결을 가지고 오셨어요:\n${lines.join('\n')}`)
  }

  if (decisions.length > 0) {
    const top = decisions.slice(0, 3)
    const lines = top.map((d) => {
      const days = daysAgo(d.recordedAt)
      const label = days === 0 ? '오늘' : days === 1 ? '어제' : `${days}일 전`
      return `• [${label}] ${truncate(d.text, 100)}`
    })
    parts.push(`그동안 말씀하신 결정·계획:\n${lines.join('\n')}`)
  }

  return parts.join('\n\n')
}

export function formatRecallContextEn(
  memory: {
    recentQuestions?: unknown
    decisionsMentioned?: unknown
  } | null
): string {
  if (!memory) return ''
  const questions = (memory.recentQuestions as RecallEntry[] | null) || []
  const decisions = (memory.decisionsMentioned as RecallEntry[] | null) || []
  if (questions.length === 0 && decisions.length === 0) return ''

  const parts: string[] = []

  if (questions.length > 0) {
    const top = questions.slice(0, 3)
    const lines = top.map((q) => {
      const days = daysAgo(q.recordedAt)
      const label = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
      return `• [${label}] "${truncate(q.text, 90)}"`
    })
    parts.push(`Earlier you brought up:\n${lines.join('\n')}`)
  }

  if (decisions.length > 0) {
    const top = decisions.slice(0, 3)
    const lines = top.map((d) => {
      const days = daysAgo(d.recordedAt)
      const label = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
      return `• [${label}] ${truncate(d.text, 100)}`
    })
    parts.push(`Decisions / plans you mentioned:\n${lines.join('\n')}`)
  }

  return parts.join('\n\n')
}

function daysAgo(iso: string): number {
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return 0
  return Math.max(0, Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24)))
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}

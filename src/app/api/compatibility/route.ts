import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard, type ApiContext } from '@/lib/api/middleware'
import { apiClient } from '@/lib/api/ApiClient'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { captureServerError } from '@/lib/telemetry'
import { LIMITS } from '@/lib/validation'
import { sanitizeString } from '@/lib/api/sanitizers'
import { logger } from '@/lib/logger'
import { calculateSajuData } from '@/lib/Saju/saju'
import { calculateSajuCompatibilityOnly } from '@/lib/compatibility/cosmicCompatibility'
import type { SajuProfile } from '@/lib/compatibility/cosmicCompatibility'
import type { Relation, PersonInput, CompatibilityBackendResponse } from './types'
import { compatibilityRequestSchema } from '@/lib/api/zodValidation'

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

function relationWeight(r?: Relation) {
  if (!r) {
    return 1.0
  }
  if (r === 'lover') {
    return 1.0
  }
  if (r === 'friend') {
    return 0.95
  }
  return 0.9 // other
}

const MAX_NOTE = LIMITS.NOTE

function buildSajuProfileFromBirth(
  date: string,
  time: string,
  timezone: string
): SajuProfile | null {
  try {
    const result = calculateSajuData(date, time, 'male', 'solar', timezone)
    return {
      dayMaster: {
        name: result.dayMaster.name,
        element: result.dayMaster.element,
        yin_yang: result.dayMaster.yin_yang === '양' ? 'yang' : 'yin',
      },
      pillars: {
        year: {
          stem: result.yearPillar.heavenlyStem.name,
          branch: result.yearPillar.earthlyBranch.name,
        },
        month: {
          stem: result.monthPillar.heavenlyStem.name,
          branch: result.monthPillar.earthlyBranch.name,
        },
        day: {
          stem: result.dayPillar.heavenlyStem.name,
          branch: result.dayPillar.earthlyBranch.name,
        },
        time: {
          stem: result.timePillar.heavenlyStem.name,
          branch: result.timePillar.earthlyBranch.name,
        },
      },
      elements: result.fiveElements,
    }
  } catch (e) {
    logger.warn('[Compatibility] Saju profile build failed:', e)
    return null
  }
}

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const rawBody = await req.json()

    // Validate with Zod
    const validationResult = compatibilityRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Compatibility] validation failed', { errors: validationResult.error.errors })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    const body = validationResult.data
    const persons: PersonInput[] = body.persons.map(
      (p, i) =>
        ({
          name: sanitizeString(p.name, LIMITS.NAME),
          date: p.date,
          time: p.time,
          latitude: p.latitude,
          longitude: p.longitude,
          timeZone: p.timeZone,
          city: sanitizeString(p.city, LIMITS.CITY),
          relationToP1: i > 0 ? p.relationToP1 : undefined,
          relationNoteToP1: sanitizeString(p.relationNoteToP1, MAX_NOTE),
        }) as PersonInput
    )

    const names = persons.map((p, i) => p.name?.trim() || `Person ${i + 1}`)

    const pairs: [number, number][] = []
    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) {
        pairs.push([i, j])
      }
    }

    // Build Saju profiles once per person (cache to avoid redundant computation)
    const sajuProfiles: (SajuProfile | null)[] = persons.map((p) =>
      buildSajuProfileFromBirth(p.date, p.time, p.timeZone)
    )

    const scores = pairs.map(([a, b]) => {
      const profileA = sajuProfiles[a]
      const profileB = sajuProfiles[b]

      let base = 65 // neutral default if saju calculation fails
      if (profileA && profileB) {
        try {
          const { score: sajuScore } = calculateSajuCompatibilityOnly(profileA, profileB)
          base = sajuScore
        } catch (e) {
          logger.warn('[Compatibility] Saju scoring failed for pair:', { a, b, error: e })
        }
      }

      let weight = 1.0
      if (a === 0) {
        weight = relationWeight(persons[b].relationToP1)
      } else if (b === 0) {
        weight = relationWeight(persons[a].relationToP1)
      } else {
        weight =
          (relationWeight(persons[a].relationToP1) + relationWeight(persons[b].relationToP1)) / 2
      }

      const score = Math.round(base * weight)
      return { pair: [a, b], score }
    })

    const avg = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length)

    const lines: string[] = []
    lines.push(`## 종합 궁합 점수`)
    lines.push('')
    lines.push('사주(四柱) 일간 오행 궁합 분석 결과입니다.')
    lines.push('')
    lines.push(`${names.slice(0, 2).join(' & ')}의 궁합 점수: ${avg}점/100`)
    lines.push('')
    lines.push(`## 관계 분석`)
    lines.push('')
    lines.push('사주(四柱) 일간 오행 궁합 분석 결과입니다.')
    lines.push('')
    for (let i = 1; i < persons.length; i++) {
      const r = persons[i].relationToP1!
      const rLabel =
        r === 'lover' ? '연인' : r === 'friend' ? '친구' : persons[i].relationNoteToP1 || '기타'
      lines.push(`${names[0]} ↔ ${names[i]}: ${rLabel}`)
    }
    lines.push('')
    lines.push(`## 상세 점수`)
    lines.push('')
    lines.push('사주(四柱) 일간 오행 궁합 분석 결과입니다.')
    lines.push('')
    scores.forEach(({ pair: [a, b], score }) => {
      lines.push(`${names[a]} & ${names[b]}: ${score}점/100`)
    })
    lines.push('')
    lines.push(`## 조언`)
    lines.push('')
    lines.push('사주(四柱) 일간 오행 궁합 분석 결과입니다.')
    lines.push('')
    lines.push(
      'AI 기반 심화 분석을 위해 잠시 후 다시 시도해주세요. 현재는 기본 분석 결과만 제공됩니다.'
    )

    // ======== AI backend call (GPT + Fusion) ========
    let aiInterpretation = ''
    let aiModelUsed = ''
    let aiScore: number | null = null
    let timing: Record<string, unknown> | null = null
    let actionItems: string[] = []
    let isGroup = false
    let groupAnalysis: Record<string, unknown> | null = null
    let synergyBreakdown: Record<string, unknown> | null = null

    try {
      // Send to backend with full birth data for Saju+Astrology fusion analysis
      const response = await apiClient.post<CompatibilityBackendResponse>(
        '/api/compatibility',
        {
          persons: persons.map((p, i) => ({
            name: names[i],
            birthDate: p.date,
            birthTime: p.time,
            latitude: p.latitude,
            longitude: p.longitude,
            timeZone: p.timeZone,
            relation: i > 0 ? p.relationToP1 : undefined,
            relationNote: i > 0 ? p.relationNoteToP1 : undefined,
          })),
          relationship_type: persons[1]?.relationToP1 || 'lover',
          locale: body?.locale || 'ko',
        },
        { timeout: 60000 }
      )

      if (response.ok && response.data) {
        const aiData = response.data
        // Handle both nested (data.report) and flat response formats
        aiInterpretation =
          ('data' in aiData && aiData.data?.report) ||
          ('interpretation' in aiData && aiData.interpretation) ||
          ('report' in aiData && aiData.report) ||
          ''
        aiModelUsed =
          ('data' in aiData && aiData.data?.model) ||
          ('model' in aiData && aiData.model) ||
          'gpt-4o'
        // Get the AI-calculated overall score (Saju+Astrology fusion)
        aiScore =
          ('data' in aiData && aiData.data?.overall_score) ||
          ('overall_score' in aiData && aiData.overall_score) ||
          null
        // Get timing analysis
        timing =
          ('data' in aiData && aiData.data?.timing) || ('timing' in aiData && aiData.timing) || null
        // Get action items
        actionItems =
          ('data' in aiData && aiData.data?.action_items) ||
          ('action_items' in aiData && aiData.action_items) ||
          []
        // Get group analysis data (for 3+ people)
        isGroup = ('is_group' in aiData && aiData.is_group) || false
        groupAnalysis = ('group_analysis' in aiData && aiData.group_analysis) || null
        synergyBreakdown = ('synergy_breakdown' in aiData && aiData.synergy_breakdown) || null
      }
    } catch (aiErr) {
      logger.warn('[Compatibility API] AI backend call failed:', aiErr)
      aiInterpretation = ''
      aiModelUsed = 'error-fallback'
    }

    // Use AI score if available, otherwise use geo-based fallback
    const finalScore = aiScore ?? avg
    const fallbackInterpretation = lines.join('\n')

    // ======== 기록 저장 (로그인 사용자만) ========
    // 🔒 GDPR/개인정보보호법 준수: 타인의 생년월일/시간은 저장하지 않음
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      try {
        await prisma.reading.create({
          data: {
            userId: session.user.id,
            type: 'compatibility',
            title: `${names.slice(0, 2).join(' & ')} 궁합 분석 (${finalScore}점)`,
            content: JSON.stringify({
              // ✅ 결과만 저장: 점수, 해석, 관계 레이블
              score: finalScore,
              pairScores: scores,
              interpretation: aiInterpretation || fallbackInterpretation.substring(0, 500),
              // ✅ 익명화된 레이블만 저장 (생년월일/시간은 저장 안 함)
              personLabels: names.map((name, i) => ({
                label: name || `Person ${i + 1}`,
                relation: i > 0 ? persons[i].relationToP1 : 'self',
              })),
              // ❌ 저장하지 않음: date, time (타인의 개인정보)
            }),
          },
        })
      } catch (saveErr) {
        logger.warn('[Compatibility API] Failed to save reading:', saveErr)
      }
    }

    const res = NextResponse.json({
      interpretation: aiInterpretation || fallbackInterpretation,
      aiInterpretation,
      aiModelUsed,
      pairs: scores,
      average: finalScore,
      overall_score: finalScore,
      timing,
      action_items: actionItems,
      fusion_enabled: !!aiScore,
      is_group: isGroup,
      group_analysis: groupAnalysis,
      synergy_breakdown: synergyBreakdown,
    })
    res.headers.set('Cache-Control', 'no-store')
    return res
  },
  createPublicStreamGuard({
    route: 'compatibility',
    limit: 30,
    windowSeconds: 60,
  })
)

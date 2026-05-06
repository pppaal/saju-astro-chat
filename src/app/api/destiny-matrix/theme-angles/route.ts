import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import {
  generateThemeAnglesAI,
  ThemeAnglesAIError,
  type ThemeKey,
} from '@/lib/destiny-matrix/ai-report/themeAnglesAI'
import { CAREER_ANGLES, renderTheme } from '@/lib/destiny-matrix/ai-report/themeAngles'
import { THEME_ANGLES_MAP } from '@/lib/destiny-matrix/ai-report/themeAnglesExtra'
import {
  buildPeriodActivationContext,
  type ReportPeriodScope,
} from '@/lib/destiny-matrix/ai-report/periodSignalContext'
import type { NormalizedSignal } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
import type { TimingData } from '@/lib/destiny-matrix/ai-report/types'
import type { ActiveTransit } from '@/lib/destiny-matrix/interpreter/types'

export const runtime = 'nodejs'
export const maxDuration = 120

interface RequestBody {
  theme: ThemeKey
  period: ReportPeriodScope
  signals: NormalizedSignal[]
  timing?: TimingData
  activeTransits?: ActiveTransit[]
  birthYear?: number
  targetDate?: string
  name?: string
}

const VALID_THEMES = new Set<ThemeKey>(['career', 'love', 'wealth', 'health', 'family', 'move'])
const VALID_PERIODS = new Set<ReportPeriodScope>(['lifetime', 'yearly', 'monthly'])

export async function POST(req: NextRequest) {
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!VALID_THEMES.has(body.theme)) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
  }
  if (!VALID_PERIODS.has(body.period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }
  if (!Array.isArray(body.signals) || body.signals.length === 0) {
    return NextResponse.json({ error: 'signals must be a non-empty array' }, { status: 400 })
  }

  const targetDate = body.targetDate || new Date().toISOString().slice(0, 10)
  const ctx = buildPeriodActivationContext(
    {
      period: body.period,
      targetDate,
      timingData: body.timing,
      activeTransits: body.activeTransits,
    },
    { birthYear: body.birthYear }
  )

  // Try AI generation first.
  try {
    const result = await generateThemeAnglesAI({
      theme: body.theme,
      period: body.period,
      signals: body.signals,
      ctx,
      name: body.name,
    })
    logger.info('[theme-angles] AI generation succeeded', {
      theme: body.theme,
      period: body.period,
      angleCount: result.angles.length,
      cacheRead: result.usage?.cacheReadTokens,
      cacheCreate: result.usage?.cacheCreateTokens,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    })
    return NextResponse.json({
      source: 'ai',
      model: result.model,
      angles: result.angles,
    })
  } catch (err) {
    const code = err instanceof ThemeAnglesAIError ? err.code : 'UNKNOWN'
    logger.warn('[theme-angles] AI generation failed, falling back to deterministic', {
      theme: body.theme,
      period: body.period,
      code,
      message: err instanceof Error ? err.message : String(err),
    })
    // Deterministic fallback — always succeeds.
    const angleSet =
      body.theme === 'career' ? CAREER_ANGLES : THEME_ANGLES_MAP[body.theme] || CAREER_ANGLES
    const angles = renderTheme(angleSet, body.signals, ctx, body.period)
    return NextResponse.json({
      source: 'deterministic',
      fallbackReason: code,
      angles,
    })
  }
}

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

  // Up to 2 attempts — first try, plus one retry on transient failures
  // (timeout, 5xx, validation hiccup). The deterministic templates are
  // NOT served to users — they're only for QA / dev parity (see
  // ?fallback=1 below). If AI fails after retries, we surface a graceful
  // "본문 생성이 잠시 지연" card on the client; the user never sees the
  // template-flavored prose.
  const TRANSIENT_CODES = new Set([
    'TIMEOUT',
    'NETWORK_ERROR',
    'EMPTY_RESPONSE',
    'INVALID_JSON',
    'TOO_FEW_ANGLES',
    'HTTP_429',
    'HTTP_500',
    'HTTP_502',
    'HTTP_503',
    'HTTP_529',
  ])

  let lastErrorCode = 'UNKNOWN'
  let lastErrorMessage = ''

  for (let attempt = 1; attempt <= 2; attempt++) {
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
        attempt,
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
      lastErrorCode = err instanceof ThemeAnglesAIError ? err.code : 'UNKNOWN'
      lastErrorMessage = err instanceof Error ? err.message : String(err)
      const transient = TRANSIENT_CODES.has(lastErrorCode)
      const willRetry = attempt < 2 && transient
      logger.warn('[theme-angles] AI generation failed', {
        theme: body.theme,
        period: body.period,
        attempt,
        code: lastErrorCode,
        message: lastErrorMessage,
        willRetry,
      })
      if (!willRetry) break
      // Tiny backoff before retry (200ms — most transient errors clear faster
      // than the user can notice).
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  // Dev/QA escape hatch — `?fallback=1` exposes the deterministic
  // templates so engineers can compare prose paths. NEVER served by the
  // public client; the page never sets this flag.
  const url = new URL(req.url)
  if (url.searchParams.get('fallback') === '1') {
    const angleSet =
      body.theme === 'career' ? CAREER_ANGLES : THEME_ANGLES_MAP[body.theme] || CAREER_ANGLES
    const angles = renderTheme(angleSet, body.signals, ctx, body.period)
    return NextResponse.json({
      source: 'deterministic',
      fallbackReason: lastErrorCode,
      angles,
    })
  }

  return NextResponse.json(
    {
      source: 'unavailable',
      reason: lastErrorCode,
      message: lastErrorMessage.slice(0, 240),
    },
    { status: 503 }
  )
}

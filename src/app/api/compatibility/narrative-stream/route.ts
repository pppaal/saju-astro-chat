/**
 * Compatibility Narrative Stream
 *
 * Takes the deterministic deep insights produced by /api/compatibility
 * and streams a Claude-polished 4-5 paragraph natural Korean narrative
 * back to the client. Frontend renders this as the "AI 풀이" section
 * at the top of the compatibility report — matches the depth of the
 * premium saju reports without making the main analysis call wait on
 * the LLM.
 */

import { NextRequest } from 'next/server'
import {
  initializeApiContext,
  createPublicStreamGuard,
  extractLocale,
} from '@/lib/api/middleware'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

interface NarrativeRequest {
  pairLabels: string[]
  overallScore?: number | null
  scoreBreakdown?: {
    saju?: number | null
    astro?: number | null
    fusion?: number | null
    cross?: number | null
  }
  deepInsights?: {
    attractionReasons: string[]
    whyItWorks: string[]
    frictionPoints: string[]
    idealMatch: Array<{
      personIndex: number
      seeks: string
      partnerActually: string
      matchLevel: string
      note: string
    }>
    marriage: {
      score: number
      band: string
      bestWindow: string | null
      summary: string
    }
    longevity: {
      score: number
      band: string
      positive: string[]
      cautionary: string[]
      summary: string
    }
  } | null
  coupleTiming?: {
    activationPeriod?: { when: string; reason: string } | null
    cautionPeriod?: { when: string; reason: string } | null
    primeYearWindow?: { startYear: number; reason: string } | null
    monthlyOutlook?: string
  } | null
  astroTiming?: {
    saturnEra?: { signKo: string; bothImpact: string } | null
    jupiterEra?: { signKo: string; bothImpact: string } | null
    crossNarrative?: string | null
  } | null
}

const SYSTEM_PROMPT = `당신은 한국의 최고급 사주·점성 통합 카운슬러입니다. 두 분의 궁합을 깊이 있고 자연스러운 한국어로 풀어주세요.

규칙:
1. 5개 단락으로 구성 (각 단락 250-400자, 총 1500-2000자):
   - 첫 단락: 두 분의 만남의 결을 한 줄로 요약하고, 첫인상에서 무엇이 두 분을 끌어당겼는지
   - 두번째 단락: 일상에서 두 분이 어떻게 상호작용하는지 — 잘 맞는 부분과 부드럽게 다스려야 하는 부분
   - 세번째 단락: 두 분의 끌림의 본질 — 무엇이 서로를 매력적으로 만드는지 (Venus-Mars, 사주 일간 결)
   - 네번째 단락: 시기 흐름 — 언제 만남이 깊어지고 언제 큰 약속(결혼·동거)을 고려해도 좋은지
   - 다섯째 단락: 솔직한 마무리 — 관계 지속력과 앞으로의 조언

2. 톤: 따뜻하지만 명확. "...해요" 체. "이런 분들은", "이 분들의 결" 같은 정중한 3인칭으로.
3. 데이터 기반: 제공된 deep insights, 점수, 타이밍을 자연스럽게 녹여 쓰기. 점수 숫자 그대로 노출하지 말고 의미로 풀이.
4. 절대 마크다운(##, **, -, * 등) 쓰지 말 것 — 평문 5단락만.
5. 절대 영어/한자 단독 노출 금지. "Venus-Mars 합" 같은 점성/사주 용어는 한국어로 풀어쓰기 ("금성과 화성이 만나는 자리").
6. 추측·과장 금지. 데이터에 없는 사실 만들지 말 것.`

function buildUserPrompt(req: NarrativeRequest): string {
  const lines: string[] = []
  lines.push(`두 분: ${req.pairLabels.join(' & ')}`)
  if (req.overallScore != null) {
    lines.push(`종합 점수: ${req.overallScore}/100`)
  }
  if (req.scoreBreakdown) {
    const sb = req.scoreBreakdown
    const parts: string[] = []
    if (sb.saju != null) parts.push(`사주 ${sb.saju}`)
    if (sb.astro != null) parts.push(`점성 ${sb.astro}`)
    if (sb.fusion != null) parts.push(`융합 ${sb.fusion}`)
    if (sb.cross != null) parts.push(`교차 ${sb.cross}`)
    if (parts.length) lines.push(`내역: ${parts.join(' · ')}`)
  }

  const di = req.deepInsights
  if (di) {
    if (di.attractionReasons.length) {
      lines.push('\n끌림의 신호:')
      di.attractionReasons.forEach((r) => lines.push(`- ${r}`))
    }
    if (di.whyItWorks.length) {
      lines.push('\n잘 맞는 이유:')
      di.whyItWorks.forEach((r) => lines.push(`- ${r}`))
    }
    if (di.frictionPoints.length) {
      lines.push('\n마찰 가능 지점:')
      di.frictionPoints.forEach((r) => lines.push(`- ${r}`))
    }
    if (di.idealMatch?.length) {
      lines.push('\n이상형 매칭:')
      di.idealMatch.forEach((m) => {
        const personName = req.pairLabels[m.personIndex - 1] || `Person ${m.personIndex}`
        lines.push(`- ${personName} 추구: ${m.seeks} / 실제 상대: ${m.partnerActually} (${m.matchLevel})`)
      })
    }
    if (di.marriage) {
      lines.push(
        `\n결혼·약속 준비도: ${di.marriage.score}/100 (${di.marriage.band})${di.marriage.bestWindow ? ` — 최적 시기: ${di.marriage.bestWindow}` : ''}`
      )
      lines.push(`요약: ${di.marriage.summary}`)
    }
    if (di.longevity) {
      lines.push(`\n관계 지속력: ${di.longevity.score}/100 (${di.longevity.band})`)
      lines.push(`요약: ${di.longevity.summary}`)
      if (di.longevity.positive.length) lines.push(`지지: ${di.longevity.positive.join(', ')}`)
      if (di.longevity.cautionary.length) lines.push(`주의: ${di.longevity.cautionary.join(', ')}`)
    }
  }

  const ct = req.coupleTiming
  if (ct) {
    if (ct.activationPeriod) {
      lines.push(`\n사주 활성기: ${ct.activationPeriod.when} — ${ct.activationPeriod.reason}`)
    }
    if (ct.cautionPeriod) {
      lines.push(`사주 조심 시기: ${ct.cautionPeriod.when} — ${ct.cautionPeriod.reason}`)
    }
    if (ct.primeYearWindow) {
      lines.push(`사주 장기 약속 적기: ${ct.primeYearWindow.startYear}년 — ${ct.primeYearWindow.reason}`)
    }
  }

  const at = req.astroTiming
  if (at) {
    if (at.saturnEra) {
      lines.push(`\n점성 새턴: ${at.saturnEra.signKo} — ${at.saturnEra.bothImpact}`)
    }
    if (at.jupiterEra) {
      lines.push(`점성 주피터: ${at.jupiterEra.signKo} — ${at.jupiterEra.bothImpact}`)
    }
    if (at.crossNarrative) {
      lines.push(`교차 신호: ${at.crossNarrative}`)
    }
  }

  lines.push('\n위 데이터를 종합해 5 단락 자연 풀이를 작성하세요.')
  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  let body: NarrativeRequest
  try {
    body = await req.json()
  } catch {
    return createErrorResponse({
      code: ErrorCodes.BAD_REQUEST,
      message: '잘못된 요청 본문이에요.',
      locale: extractLocale(req),
      route: 'compatibility/narrative-stream',
    })
  }

  if (!Array.isArray(body.pairLabels) || body.pairLabels.length < 2) {
    return createErrorResponse({
      code: ErrorCodes.BAD_REQUEST,
      message: '두 명 이상의 정보가 필요해요.',
      locale: extractLocale(req),
      route: 'compatibility/narrative-stream',
    })
  }

  const initialized = await initializeApiContext(
    req,
    createPublicStreamGuard({
      route: 'compatibility-narrative-stream',
      limit: 30,
      windowSeconds: 60,
    })
  )
  if (initialized.error) return initialized.error

  try {
    return await streamClaudeAsSSE({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(body),
      maxTokens: 2200,
      temperature: 0.6,
      timeoutMs: 50000,
      label: 'compatibility-narrative',
    })
  } catch (err) {
    logger.error('[compatibility/narrative-stream] failed:', err)
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'AI 풀이 생성 중 일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.',
      locale: extractLocale(req),
      route: 'compatibility/narrative-stream',
    })
  }
}

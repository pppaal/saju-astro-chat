/**
 * Compatibility Narrative Stream
 *
 * Server-side recomputes both persons' full saju + extended astrology +
 * cross-system analyses from the persons input, then streams a
 * Claude-polished 7-8 paragraph (~5000-6000자) natural Korean narrative
 * grounded in the FULL deep data (십성/신살/합/충/용신/대운/세운 +
 * synastry aspects/composite/Mercury·Jupiter·Saturn) — matches the
 * richness of the premium saju report.
 *
 * Why server-recompute: the raw extended analysis is ~50KB JSON each;
 * recomputing is faster + cleaner than round-tripping through the
 * client. Saju engine has internal LRU cache so the second call is
 * essentially free.
 */

import { NextRequest } from 'next/server'
import {
  initializeApiContext,
  createPublicStreamGuard,
  extractLocale,
} from '@/lib/api/middleware'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { PREMIUM_CLAUDE_MODEL } from '@/lib/llm/claude'
import { logger } from '@/lib/logger'
import { calculateSajuData } from '@/lib/Saju/saju'
import { performExtendedSajuAnalysis } from '@/lib/compatibility/saju/comprehensive'
import { performExtendedAstrologyAnalysis } from '@/lib/compatibility/astrology/comprehensive'
import { performCrossSystemAnalysis } from '@/lib/compatibility/crossSystemAnalysis'
import { calculateFusionCompatibility } from '@/lib/compatibility/compatibilityFusion'
import {
  buildSajuProfileFromBirth,
  buildAstrologyProfileFromBirth,
} from '@/app/api/compatibility/routeSupport'
import { normalizeSajuGender } from '@/app/api/compatibility/routeSupportCommon'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 90

interface NarrativePerson {
  name?: string
  date: string
  time: string
  gender?: 'male' | 'female' | 'M' | 'F' | 'Male' | 'Female'
  latitude?: number
  longitude?: number
  timeZone?: string
  city?: string
  relationToP1?: string
}

interface NarrativeRequest {
  pairLabels: string[]
  persons: NarrativePerson[]
  overallScore?: number | null
  scoreBreakdown?: {
    saju?: number | null
    astro?: number | null
    fusion?: number | null
    cross?: number | null
  }
  // Optional pre-computed summary blocks from the main analysis call
  // (kept for context; the heavy lifting now happens on the server).
  deepInsightsSummary?: {
    attractionReasons?: string[]
    whyItWorks?: string[]
    frictionPoints?: string[]
    marriageSummary?: string
    longevitySummary?: string
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

const SYSTEM_PROMPT = `당신은 한국의 최고급 사주명리·점성술 통합 카운슬러입니다. 두 분의 궁합을 깊이 있고 자연스러운 한국어 long-form으로 풀어주세요.

규칙:
1. 7개 단락으로 구성 (각 단락 600-900자, 총 5000-6000자):
   ① 첫인상과 만남의 결 — 두 분이 만나면 어떤 분위기가 만들어지는지, 첫 끌림의 본질
   ② 사주 본성의 결 — 두 분 일간/오행/십성/음양이 어떻게 상호작용하는지 구체적으로
   ③ 점성 별의 결 — Sun/Moon/Venus/Mars + 외행성 + 합·trine·square 등 구체적 시너스트리
   ④ 사주·점성이 같이 가리키는 곳 — 두 시스템이 어디서 동의하고 어디서 다른지 (cross 분석)
   ⑤ 일상의 흐름과 마찰 — 함께할 때 자연스러운 부분, 부드럽게 다스려야 할 부분
   ⑥ 시기 흐름 — 사주 활성기/조심기 + 점성 새턴/주피터 + 인생 단계 transit 통합
   ⑦ 솔직한 마무리 — 결혼·약속 적합도, 관계 지속력, 앞으로의 핵심 조언

2. 톤: 따뜻하지만 명확. 평어 "...해요" 체. 정중한 3인칭 ("두 분의 결", "이 관계는", "한쪽이...").
3. 데이터 기반: 제공된 사주(십성/신살/합/용신/대운 등)와 점성(aspects/synastry/composite 등)을 자연스럽게 녹여 쓰기. 점수 숫자 그대로 노출하지 말고 의미로 풀이. 한자 용어는 한국어로 풀어쓰기 ("정관" → "책임감의 별", "Venus-Mars trine" → "금성과 화성이 부드럽게 만나는 자리").
4. 절대 마크다운(##, **, -, * 등) 쓰지 말 것 — 평문 단락 7개만, 단락 사이 빈 줄 한 칸.
5. 절대 영어 단독 노출 금지. 한자/영어 용어는 한국어 풀이로 대체.
6. 추측·과장 금지. 데이터에 없는 사실 만들지 말 것. "운명적" "필연" 같은 단어 자제, 데이터의 결을 그대로 묘사.
7. 각 단락은 풍부하게 — 한 줄 결론이 아니라 두 분의 구체적인 사주·점성 결을 짚어가며 풀이.`

function compactSibsin(s: unknown): string {
  if (!s || typeof s !== 'object') return ''
  const obj = s as { cheon?: string; ji?: string; name?: string }
  return obj.name || `${obj.cheon || ''}${obj.ji ? `/${obj.ji}` : ''}`
}

function compactSajuOverview(saju: unknown): string {
  if (!saju || typeof saju !== 'object') return ''
  const s = saju as Record<string, unknown>
  const dm = s.dayMaster as Record<string, unknown> | undefined
  const yp = s.yearPillar as Record<string, unknown> | undefined
  const mp = s.monthPillar as Record<string, unknown> | undefined
  const dp = s.dayPillar as Record<string, unknown> | undefined
  const tp = s.timePillar as Record<string, unknown> | undefined
  const elements = s.fiveElements as Record<string, number> | undefined

  const lines: string[] = []
  if (dm) {
    lines.push(
      `일간: ${dm.name} (${dm.element}, ${dm.yin_yang})`
    )
  }
  const fmt = (p: Record<string, unknown> | undefined): string => {
    if (!p) return ''
    const hs = p.heavenlyStem as Record<string, unknown> | undefined
    const eb = p.earthlyBranch as Record<string, unknown> | undefined
    return `${hs?.name || ''}${eb?.name || ''}`
  }
  lines.push(`4 pillars: 년 ${fmt(yp)} / 월 ${fmt(mp)} / 일 ${fmt(dp)} / 시 ${fmt(tp)}`)
  if (elements) {
    lines.push(
      `5행: ${Object.entries(elements)
        .map(([k, v]) => `${k}${v}`)
        .join(' ')}`
    )
  }

  const sibsinList = s.sibsinList as Array<Record<string, unknown>> | undefined
  if (Array.isArray(sibsinList) && sibsinList.length) {
    const top = sibsinList
      .slice(0, 6)
      .map((it) => `${compactSibsin(it)}`)
      .filter(Boolean)
      .join(', ')
    if (top) lines.push(`주요 십성: ${top}`)
  }

  // 용신
  const yongsin = (s.yongsin || (s.yongshin as unknown)) as Record<string, unknown> | undefined
  if (yongsin) {
    lines.push(`용신: ${JSON.stringify(yongsin).slice(0, 200)}`)
  }

  return lines.join('\n')
}

function buildUserPrompt(
  req: NarrativeRequest,
  blocks: {
    p1SajuOverview: string
    p2SajuOverview: string
    extendedSaju?: unknown
    extendedAstro?: unknown
    crossSystem?: unknown
    fusionDeepAnalysis?: string
  }
): string {
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

  // 사주 raw overview (per person)
  if (blocks.p1SajuOverview) {
    lines.push(
      `\n== ${req.pairLabels[0]} 사주 ==\n${blocks.p1SajuOverview}`
    )
  }
  if (blocks.p2SajuOverview) {
    lines.push(
      `\n== ${req.pairLabels[1]} 사주 ==\n${blocks.p2SajuOverview}`
    )
  }

  // Extended saju compatibility (십성·신살·합·충·용신·대운·세운·격국·12운성·천간합·공망)
  if (blocks.extendedSaju) {
    const block = JSON.stringify(blocks.extendedSaju, null, 1).slice(0, 6000)
    lines.push(`\n== 사주 심화 분석 (십성·신살·합·용신·대운/세운·격국·12운성·천간합·공망) ==\n${block}`)
  }

  // Extended astro compatibility (synastry/composite/aspects/Mercury·Jupiter·Saturn)
  if (blocks.extendedAstro) {
    const block = JSON.stringify(blocks.extendedAstro, null, 1).slice(0, 6000)
    lines.push(`\n== 점성 심화 분석 (aspects·synastry·composite·house·Mercury/Jupiter/Saturn 분석) ==\n${block}`)
  }

  // Cross-system analysis (사주 ↔ 점성 매핑)
  if (blocks.crossSystem) {
    const block = JSON.stringify(blocks.crossSystem, null, 1).slice(0, 3000)
    lines.push(`\n== 사주·점성 교차 분석 (일간↔Sun, 월지↔Moon, 5행 fusion, pillar↔planet 대응) ==\n${block}`)
  }

  // Fusion deep analysis
  if (blocks.fusionDeepAnalysis) {
    lines.push(`\n== 융합 핵심 흐름 ==\n${blocks.fusionDeepAnalysis.slice(0, 1500)}`)
  }

  // Deep insights summary (already plain Korean, used as scaffolding)
  const di = req.deepInsightsSummary
  if (di) {
    if (di.attractionReasons?.length) {
      lines.push(`\n끌림 신호: ${di.attractionReasons.join(' / ')}`)
    }
    if (di.whyItWorks?.length) {
      lines.push(`잘 맞는 이유: ${di.whyItWorks.join(' / ')}`)
    }
    if (di.frictionPoints?.length) {
      lines.push(`마찰 가능 지점: ${di.frictionPoints.join(' / ')}`)
    }
    if (di.marriageSummary) {
      lines.push(`결혼·약속: ${di.marriageSummary}`)
    }
    if (di.longevitySummary) {
      lines.push(`지속력: ${di.longevitySummary}`)
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
      lines.push(
        `사주 장기 약속 적기: ${ct.primeYearWindow.startYear}년 — ${ct.primeYearWindow.reason}`
      )
    }
  }

  const at = req.astroTiming
  if (at) {
    if (at.saturnEra) lines.push(`점성 새턴: ${at.saturnEra.signKo} — ${at.saturnEra.bothImpact}`)
    if (at.jupiterEra) lines.push(`점성 주피터: ${at.jupiterEra.signKo} — ${at.jupiterEra.bothImpact}`)
    if (at.crossNarrative) lines.push(`교차 신호: ${at.crossNarrative}`)
  }

  lines.push(
    `\n위 모든 데이터를 종합해 7 단락 자연 풀이를 작성하세요. 각 단락 600-900자, 총 5000-6000자. 마크다운 헤더 없이 평문 단락 7개만.`
  )
  return lines.join('\n')
}

async function buildExtendedBlocks(
  persons: NarrativePerson[]
): Promise<{
  p1SajuOverview: string
  p2SajuOverview: string
  extendedSaju?: unknown
  extendedAstro?: unknown
  crossSystem?: unknown
  fusionDeepAnalysis?: string
}> {
  const [p1, p2] = persons
  if (!p1 || !p2) return { p1SajuOverview: '', p2SajuOverview: '' }

  // Full saju (cached internally)
  const p1Full = calculateSajuData(
    p1.date,
    p1.time,
    normalizeSajuGender(p1.gender),
    'solar',
    p1.timeZone || 'Asia/Seoul'
  )
  const p2Full = calculateSajuData(
    p2.date,
    p2.time,
    normalizeSajuGender(p2.gender),
    'solar',
    p2.timeZone || 'Asia/Seoul'
  )

  // Slim saju profiles for extended analysis
  const p1Saju = buildSajuProfileFromBirth(
    p1.date,
    p1.time,
    p1.timeZone || 'Asia/Seoul',
    p1.gender as 'male' | 'female' | undefined
  )
  const p2Saju = buildSajuProfileFromBirth(
    p2.date,
    p2.time,
    p2.timeZone || 'Asia/Seoul',
    p2.gender as 'male' | 'female' | undefined
  )

  // Astro bundles
  const VALID_RELATIONS = ['lover', 'friend', 'other'] as const
  const personInputBase = (p: NarrativePerson) => ({
    name: p.name || 'Person',
    date: p.date,
    time: p.time,
    gender: (p.gender as 'male' | 'female') || 'male',
    city: p.city || 'Seoul, KR',
    latitude: p.latitude ?? 37.5665,
    longitude: p.longitude ?? 126.978,
    timeZone: p.timeZone || 'Asia/Seoul',
    relationToP1: VALID_RELATIONS.includes(p.relationToP1 as (typeof VALID_RELATIONS)[number])
      ? (p.relationToP1 as (typeof VALID_RELATIONS)[number])
      : undefined,
  })
  const [p1Astro, p2Astro] = await Promise.all([
    buildAstrologyProfileFromBirth(personInputBase(p1)),
    buildAstrologyProfileFromBirth(personInputBase(p2)),
  ])

  let extendedSaju: unknown = undefined
  let extendedAstro: unknown = undefined
  let crossSystem: unknown = undefined
  let fusionDeepAnalysis: string | undefined = undefined

  if (p1Saju && p2Saju) {
    try {
      const ageA = (() => {
        const b = new Date(p1.date)
        const now = new Date()
        let age = now.getFullYear() - b.getFullYear()
        const m = now.getMonth() - b.getMonth()
        if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1
        return Math.max(1, age)
      })()
      const ageB = (() => {
        const b = new Date(p2.date)
        const now = new Date()
        let age = now.getFullYear() - b.getFullYear()
        const m = now.getMonth() - b.getMonth()
        if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1
        return Math.max(1, age)
      })()
      extendedSaju = performExtendedSajuAnalysis(
        p1Saju,
        p2Saju,
        ageA,
        ageB,
        new Date().getFullYear()
      )
    } catch (e) {
      logger.warn('[narrative-stream] extended saju failed', e)
    }
  }

  if (p1Astro?.extendedAstroProfile && p2Astro?.extendedAstroProfile) {
    try {
      extendedAstro = performExtendedAstrologyAnalysis(
        p1Astro.extendedAstroProfile,
        p2Astro.extendedAstroProfile,
        0
      )
    } catch (e) {
      logger.warn('[narrative-stream] extended astro failed', e)
    }
  }

  if (p1Saju && p2Saju && p1Astro?.astroProfile && p2Astro?.astroProfile) {
    try {
      crossSystem = performCrossSystemAnalysis(
        p1Saju,
        p2Saju,
        p1Astro.astroProfile,
        p2Astro.astroProfile
      )
    } catch (e) {
      logger.warn('[narrative-stream] cross system failed', e)
    }

    try {
      const fusion = calculateFusionCompatibility(
        p1Saju,
        p1Astro.astroProfile,
        p2Saju,
        p2Astro.astroProfile
      )
      fusionDeepAnalysis = fusion?.aiInsights?.hiddenPatterns?.[0]
        ? `숨은 패턴: ${fusion.aiInsights.hiddenPatterns.join(' / ')}`
        : ''
      if (fusion?.relationshipDynamics?.conflictResolutionStyle) {
        fusionDeepAnalysis += `\n갈등 해결: ${fusion.relationshipDynamics.conflictResolutionStyle}`
      }
    } catch (e) {
      logger.warn('[narrative-stream] fusion failed', e)
    }
  }

  return {
    p1SajuOverview: compactSajuOverview(p1Full),
    p2SajuOverview: compactSajuOverview(p2Full),
    extendedSaju,
    extendedAstro,
    crossSystem,
    fusionDeepAnalysis,
  }
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
  if (!Array.isArray(body.persons) || body.persons.length < 2) {
    return createErrorResponse({
      code: ErrorCodes.BAD_REQUEST,
      message: '두 명의 출생 정보가 필요해요.',
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
    const blocks = await buildExtendedBlocks(body.persons)
    const userPrompt = buildUserPrompt(body, blocks)

    return await streamClaudeAsSSE({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 8000, // ~5000-6000자 Korean
      temperature: 0.6,
      timeoutMs: 80000,
      label: 'compatibility-narrative',
      model: PREMIUM_CLAUDE_MODEL, // Sonnet 4.5 — long-form Korean quality
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

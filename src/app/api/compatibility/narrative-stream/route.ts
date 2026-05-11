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
import { initializeApiContext, createPublicStreamGuard, extractLocale } from '@/lib/api/middleware'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { PREMIUM_CLAUDE_MODEL } from '@/lib/llm/claude'
import { logger } from '@/lib/logger'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { isDbPremiumUser } from '@/lib/auth/premium'
import { calculateSajuData } from '@/lib/saju/saju'
import { LRUCache } from '@/lib/saju/cache/LRUCache'
import { sanitizeAstroJargon, hasJargonLeak } from '@/lib/text/sanitizeAstroJargon'
import { performExtendedSajuAnalysis } from '@/lib/compatibility/saju/comprehensive'
import { performExtendedAstrologyAnalysis } from '@/lib/compatibility/astrology/comprehensive'
import { performCrossSystemAnalysis } from '@/lib/compatibility/crossSystemAnalysis'
import { calculateFusionCompatibility } from '@/lib/compatibility/compatibilityFusion'
import { analyzeCoupleExtraPoints } from '@/lib/compatibility/coupleExtraPoints'
import {
  buildSajuProfileFromBirth,
  buildAstrologyProfileFromBirth,
} from '@/app/api/compatibility/routeSupport'
import { normalizeSajuGender } from '@/app/api/compatibility/routeSupportCommon'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 180

// In-memory cache — same couple birth pair → reuse Sonnet output for 24h.
// Sonnet narrative is ~$0.05/call so even modest reuse pays off. Max 500
// entries × ~12KB each = ~6MB ceiling.
const narrativeCache = new LRUCache<string>({
  maxSize: 500,
  ttlMs: 24 * 60 * 60 * 1000, // 24h
  cleanupIntervalMs: 60 * 60 * 1000, // 1h
})

function buildCacheKey(persons: NarrativePerson[]): string {
  // Order-independent — same couple regardless of who's listed first
  const tag = (p: NarrativePerson) =>
    `${p.date}|${p.time}|${p.gender || ''}|${(p.timeZone || '').slice(0, 6)}`
  const tags = persons.slice(0, 2).map(tag).sort()
  return `compat-narrative:${tags.join('::')}`
}

function streamCachedNarrative(text: string, headers: Record<string, string>): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Replay cached text in small chunks so the FE reuses the same
      // streaming UI (skeleton → streaming → done) without a special path.
      const chunks = text.match(/[\s\S]{1,40}/g) || [text]
      let i = 0
      const tick = () => {
        if (i >= chunks.length) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: '', done: true })}\n\n`)
          )
          controller.close()
          return
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ content: chunks[i], done: false })}\n\n`)
        )
        i += 1
        // ~10ms tick — replay 6000 chars in ~1.5s so user still sees the streaming feel
        setTimeout(tick, 8)
      }
      tick()
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Narrative-Cache': 'hit',
      ...headers,
    },
  })
}

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
1. 12개 단락으로 구성 (각 단락 800-1100자, 총 10000-12000자):
   ① 첫인상과 만남의 결 — 두 분이 만나면 흐르는 분위기와 첫 끌림의 본질
   ② 본성의 만남 — 두 분의 타고난 성격이 어떻게 마주하고 어울리는지 (사주 일간 · 음양)
   ③ 마음의 결 — 의식과 감정이 같은 곳을 보는지 (태양 · 달의 만남)
   ④ 끌림의 본질 — 로맨스·신체적 케미가 어떻게 흐르는지 (금성 · 화성)
   ⑤ 대화와 사고 — 두 분의 소통 패턴과 사고방식 결 (수성)
   ⑥ 깊은 가치와 세계관 — 인생을 보는 큰 방향, 영적 결, 가치관 정렬
   ⑦ 그림자와 치유 — 무의식적 끌림과 서로의 상처를 치유하는 자리 (그림자점·상처점·운명점·행복점)
   ⑧ 사주에서 본 두 분의 결 — 십성·신살·합·충 등 동양적 신호 풀이
   ⑨ 일상의 흐름 — 함께할 때 자연스러운 부분과 부드럽게 다스려야 할 마찰
   ⑩ 시기 흐름 — 관계가 깊어질 시기, 큰 약속 고려할 해, 조심할 시기 (사주 활성기 + 점성 새턴/주피터)
   ⑪ 결혼·약속과 지속력 — 장기 약속 적합도와 시간이 지나도 단단해질 가능성
   ⑫ 솔직한 마무리 — 종합 결론과 두 분에게 가장 중요한 핵심 조언 3가지

2. 톤: 따뜻하지만 명확. 평어 "...해요" 체. 정중한 3인칭 ("두 분의 결", "이 관계는", "한쪽이...").

3. 친화적 용어 의무 — 한자/영어 용어 절대 단독 노출 금지. 풀이로 자연스럽게:
   - "일간" → "타고난 본성", "본성의 결"
   - "정관" "정재" "식상" → "책임감의 결", "안정의 결", "표현의 결" 등 의미로 풀이
   - "신살" → "특별한 별 신호", "보호의 별" 등
   - "용신" → "도와주는 기운"
   - "대운/세운" → "10년 흐름", "올해 흐름"
   - "충/형/파/해" → "어긋남", "마찰의 결"
   - "Sun/Moon" → "태양과 달", "마음의 별"
   - "Venus" → "금성", "끌림의 별"
   - "Mars" → "화성", "추진의 별"
   - "Mercury" → "수성", "대화의 별"
   - "Saturn" → "토성", "책임의 별"
   - "Jupiter" → "목성", "확장의 별"
   - "trine/sextile" → "부드럽게 만나는 자리"
   - "square/opposition" → "팽팽하게 마주치는 자리"
   - "synastry" → "두 차트의 만남"
   - "composite" → "두 분이 합쳐진 한 사람"
   - "house overlay" → "삶의 영역에서의 만남"
   - "transit" → "지금 별의 흐름"

4. 마크다운(##, **, -, * 등) 절대 금지 — 평문 단락 12개만, 단락 사이 빈 줄 한 칸.

5. 데이터 기반: 제공된 사주·점성 데이터를 자연스럽게 녹여 쓰기. 점수 숫자 그대로 노출 X — 의미로 풀이.

6. 추측·과장 금지: 데이터에 없는 사실 만들지 말 것. "운명적" "필연" 같은 단어 자제.

7. 각 단락은 풍부하게 — 한 줄 결론이 아니라 두 분의 구체적인 결을 짚어가며 풀이. 비유와 이미지(악기, 계절, 강물 등) 적절히 사용해 따뜻하게.`

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
    lines.push(`일간: ${dm.name} (${dm.element}, ${dm.yin_yang})`)
  }
  const fmt = (p: Record<string, unknown> | undefined): string => {
    if (!p) return ''
    const hs = p.heavenlyStem as Record<string, unknown> | undefined
    const eb = p.earthlyBranch as Record<string, unknown> | undefined
    return `${hs?.name || ''}${eb?.name || ''}`
  }
  lines.push(`4 pillars: 년 ${fmt(yp)} / 월 ${fmt(mp)} / 일 ${fmt(dp)} / 시 ${fmt(tp)}`)

  // 지장간 (hidden stems within branches) — adds depth to saju interpretation
  const fmtJijang = (p: Record<string, unknown> | undefined, label: string): string => {
    if (!p) return ''
    const j = p.jijanggan as Record<string, unknown> | undefined
    if (!j) return ''
    const chogi = (j.chogi as Record<string, unknown> | undefined)?.name
    const junggi = (j.junggi as Record<string, unknown> | undefined)?.name
    const jeonggi = (j.jeonggi as Record<string, unknown> | undefined)?.name
    const parts = [chogi, junggi, jeonggi].filter(Boolean).join('·')
    return parts ? `${label}: ${parts}` : ''
  }
  const jijangParts = [
    fmtJijang(yp, '년'),
    fmtJijang(mp, '월'),
    fmtJijang(dp, '일'),
    fmtJijang(tp, '시'),
  ].filter(Boolean)
  if (jijangParts.length) {
    lines.push(`지장간(지지의 숨은 천간): ${jijangParts.join(' / ')}`)
  }
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

  // Orthodox interpretation snippet — pillar positions / 격국 / 신강·약 /
  // 용신 / 일주 60갑자 archetype. Compatibility prompt benefits from
  // per-person 정통 명리 context.
  const orthodox = s.orthodoxInterpretation as Record<string, unknown> | undefined
  if (orthodox) {
    const advanced = orthodox.advanced as Record<string, unknown> | undefined
    const strength = advanced?.strength as Record<string, unknown> | undefined
    if (strength?.level) lines.push(`신강/신약: ${strength.level} (${strength.score ?? '-'})`)
    const geokguk = advanced?.geokguk as Record<string, unknown> | undefined
    if (geokguk?.type) lines.push(`격국: ${geokguk.type}`)
    const ortYongsin = advanced?.yongsin as Record<string, unknown> | undefined
    if (ortYongsin?.primary) lines.push(`정통 용신: ${ortYongsin.primary}`)
    const ilju = orthodox.iljuArchetype as Record<string, unknown> | undefined
    if (ilju?.character) lines.push(`일주 archetype: ${ilju.character}`)
    const root = orthodox.root as Record<string, unknown> | undefined
    if (root && typeof root.hasRoot === 'boolean') {
      const branches = Array.isArray(root.rootBranches)
        ? (root.rootBranches as string[]).join(',')
        : ''
      lines.push(
        `근/통근: ${root.hasRoot ? '있음' : '없음'} (${branches}) 득령=${root.deukryeong} 득지=${root.deukji} 득세=${root.deukse}`
      )
    }
    const positions = orthodox.pillarPositions as Array<Record<string, unknown>> | undefined
    if (Array.isArray(positions) && positions[0]) {
      const tagline = positions
        .map(
          (p) =>
            `${p.position}=${(p.stem as Record<string, unknown>)?.sibsin || '-'}/${(p.branch as Record<string, unknown>)?.sibsin || '-'}`
        )
        .join(' ')
      lines.push(`궁위(천간/지지 십성): ${tagline}`)
    }
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
    coupleMatrix?: unknown
    fusionDeepAnalysis?: string
    extraPoints?: ReturnType<typeof analyzeCoupleExtraPoints>
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
    lines.push(`\n== ${req.pairLabels[0]} 사주 ==\n${blocks.p1SajuOverview}`)
  }
  if (blocks.p2SajuOverview) {
    lines.push(`\n== ${req.pairLabels[1]} 사주 ==\n${blocks.p2SajuOverview}`)
  }

  // Extended saju compatibility (십성·신살·합·충·용신·대운·세운·격국·12운성·천간합·공망)
  if (blocks.extendedSaju) {
    const block = JSON.stringify(blocks.extendedSaju, null, 1).slice(0, 6000)
    lines.push(
      `\n== 사주 심화 분석 (십성·신살·합·용신·대운/세운·격국·12운성·천간합·공망) ==\n${block}`
    )
  }

  // Extended astro compatibility (synastry/composite/aspects/Mercury·Jupiter·Saturn)
  if (blocks.extendedAstro) {
    const block = JSON.stringify(blocks.extendedAstro, null, 1).slice(0, 6000)
    lines.push(
      `\n== 점성 심화 분석 (aspects·synastry·composite·house·Mercury/Jupiter/Saturn 분석) ==\n${block}`
    )
  }

  // Cross-system analysis (사주 ↔ 점성 매핑)
  if (blocks.crossSystem) {
    const block = JSON.stringify(blocks.crossSystem, null, 1).slice(0, 3000)
    lines.push(
      `\n== 사주·점성 교차 분석 (일간↔Sun, 월지↔Moon, 5행 fusion, pillar↔planet 대응) ==\n${block}`
    )
  }

  // Couple Matrix — cell-level cross between A and B (saju × saju, saju × astro, astro × astro)
  if (blocks.coupleMatrix) {
    const cm = blocks.coupleMatrix as {
      summary?: {
        totalScore?: number
        polarityBalance?: { positive?: number; negative?: number; neutral?: number }
        domainScores?: Record<string, number>
        topPositiveCells?: Array<{
          description: string
          sajuBasis: string
          astroBasis: string
          score: number
        }>
        topCautionCells?: Array<{
          description: string
          sajuBasis: string
          astroBasis: string
          score: number
        }>
      }
    }
    const s = cm.summary
    if (s) {
      const ds = s.domainScores || {}
      const topPos = (s.topPositiveCells || [])
        .slice(0, 3)
        .map((c) => `+ ${c.description} [${c.sajuBasis} × ${c.astroBasis}] (score ${c.score})`)
        .join('\n')
      const topNeg = (s.topCautionCells || [])
        .slice(0, 3)
        .map((c) => `- ${c.description} [${c.sajuBasis} × ${c.astroBasis}] (score ${c.score})`)
        .join('\n')
      lines.push(
        `\n== 커플 매트릭스 (셀-단위 교차: 6 레이어) ==\n` +
          `종합점수: ${s.totalScore} / overlap=${s.polarityBalance?.positive || 0}+ / ${s.polarityBalance?.negative || 0}-\n` +
          `도메인: 매력=${ds.attraction} 안정=${ds.stability} 성장=${ds.growth} 갈등견딤=${ds.conflict} 시기동기=${ds.timing}\n` +
          (topPos ? `\n[상위 결속 셀]\n${topPos}\n` : '') +
          (topNeg ? `\n[주의 셀]\n${topNeg}` : '')
      )
    }
  }

  // Fusion deep analysis
  if (blocks.fusionDeepAnalysis) {
    lines.push(`\n== 융합 핵심 흐름 ==\n${blocks.fusionDeepAnalysis.slice(0, 1500)}`)
  }

  // Extra points — Lilith / Chiron / Vertex / Part of Fortune
  if (blocks.extraPoints) {
    const ep = blocks.extraPoints
    const lines2: string[] = []
    lines2.push(`\n== 추가 점성 포인트 (상처·그림자·운명·행복점 + 결혼·헌신·지혜·돌봄 소행성) ==`)
    if (ep.p1.chiron || ep.p1.lilith || ep.p1.vertex || ep.p1.partOfFortune || ep.p1.juno) {
      lines2.push(`${req.pairLabels[0]}:`)
      if (ep.p1.chiron) lines2.push(`  · 카이런(상처점): ${ep.p1.chiron}`)
      if (ep.p1.lilith) lines2.push(`  · 릴리스(그림자점): ${ep.p1.lilith}`)
      if (ep.p1.vertex) lines2.push(`  · 버텍스(운명점): ${ep.p1.vertex}`)
      if (ep.p1.partOfFortune) lines2.push(`  · 행운점(POF): ${ep.p1.partOfFortune}`)
      if (ep.p1.juno) lines2.push(`  · 주노(결혼점): ${ep.p1.juno}`)
      if (ep.p1.vesta) lines2.push(`  · 베스타(헌신점): ${ep.p1.vesta}`)
      if (ep.p1.pallas) lines2.push(`  · 팔라스(지혜점): ${ep.p1.pallas}`)
      if (ep.p1.ceres) lines2.push(`  · 케레스(돌봄점): ${ep.p1.ceres}`)
    }
    if (ep.p2.chiron || ep.p2.lilith || ep.p2.vertex || ep.p2.partOfFortune || ep.p2.juno) {
      lines2.push(`${req.pairLabels[1]}:`)
      if (ep.p2.chiron) lines2.push(`  · 카이런(상처점): ${ep.p2.chiron}`)
      if (ep.p2.lilith) lines2.push(`  · 릴리스(그림자점): ${ep.p2.lilith}`)
      if (ep.p2.vertex) lines2.push(`  · 버텍스(운명점): ${ep.p2.vertex}`)
      if (ep.p2.partOfFortune) lines2.push(`  · 행운점(POF): ${ep.p2.partOfFortune}`)
      if (ep.p2.juno) lines2.push(`  · 주노(결혼점): ${ep.p2.juno}`)
      if (ep.p2.vesta) lines2.push(`  · 베스타(헌신점): ${ep.p2.vesta}`)
      if (ep.p2.pallas) lines2.push(`  · 팔라스(지혜점): ${ep.p2.pallas}`)
      if (ep.p2.ceres) lines2.push(`  · 케레스(돌봄점): ${ep.p2.ceres}`)
    }
    if (ep.crossAspects.p1ToP2.length || ep.crossAspects.p2ToP1.length) {
      lines2.push(`교차 aspects (서로의 추가 포인트가 상대 행성에 닿는 자리):`)
      ;[...ep.crossAspects.p1ToP2.slice(0, 4), ...ep.crossAspects.p2ToP1.slice(0, 4)].forEach(
        (a) => {
          lines2.push(`  · ${a.point} → ${a.to} ${a.aspect} (orb ${a.orb}°): ${a.meaning}`)
        }
      )
    }
    if (ep.summary.length) {
      lines2.push(`핵심 신호:`)
      ep.summary.forEach((s) => lines2.push(`  · ${s}`))
    }
    if (lines2.length > 1) {
      lines.push(lines2.join('\n').slice(0, 4000))
    }
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
    if (at.jupiterEra)
      lines.push(`점성 주피터: ${at.jupiterEra.signKo} — ${at.jupiterEra.bothImpact}`)
    if (at.crossNarrative) lines.push(`교차 신호: ${at.crossNarrative}`)
  }

  lines.push(
    `\n위 모든 데이터를 종합해 12 단락 자연 풀이를 작성하세요. 각 단락 800-1100자, 총 10000-12000자. 마크다운 헤더 없이 평문 단락 12개만. 한자/영어 용어는 절대 단독 노출 금지 — 모두 풀이된 한국어로. 절대 짧게 쓰지 말 것 — 짧으면 다시 쓰세요.`
  )
  return lines.join('\n')
}

async function buildExtendedBlocks(persons: NarrativePerson[]): Promise<{
  p1SajuOverview: string
  p2SajuOverview: string
  extendedSaju?: unknown
  extendedAstro?: unknown
  crossSystem?: unknown
  coupleMatrix?: unknown
  fusionDeepAnalysis?: string
  extraPoints?: ReturnType<typeof analyzeCoupleExtraPoints>
}> {
  const [p1, p2] = persons
  if (!p1 || !p2) return { p1SajuOverview: '', p2SajuOverview: '' }

  // Full saju (cached internally) + orthodox interpretation per person
  const { buildOrthodoxInterpretation } = await import('@/lib/saju/orthodoxInterpretation')
  const attachOrthodox = (s: ReturnType<typeof calculateSajuData>, isoBirth: string) => {
    try {
      const koreanAge = new Date().getFullYear() - new Date(isoBirth).getFullYear() + 1
      ;(s as unknown as Record<string, unknown>).orthodoxInterpretation =
        buildOrthodoxInterpretation(s, { koreanAge })
    } catch {
      // ignore — orthodox is additive
    }
    return s
  }
  const p1Full = attachOrthodox(
    calculateSajuData(
      p1.date,
      p1.time,
      normalizeSajuGender(p1.gender),
      'solar',
      p1.timeZone || 'Asia/Seoul'
    ),
    p1.date
  )
  const p2Full = attachOrthodox(
    calculateSajuData(
      p2.date,
      p2.time,
      normalizeSajuGender(p2.gender),
      'solar',
      p2.timeZone || 'Asia/Seoul'
    ),
    p2.date
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

  // Couple Matrix — cell-level cross between A's saju+astro and B's saju+astro.
  // Sits alongside extendedSaju / extendedAstro / crossSystem so the prompt
  // can quote specific cells (천간합 일주끼리 / 어스펙트 / 대운 시너지 등).
  let coupleMatrix: unknown = undefined
  try {
    const { buildCoupleMatrix } = await import('@/lib/compatibility/coupleMatrix')
    const koreanAge = (iso: string) => new Date().getFullYear() - new Date(iso).getFullYear() + 1
    const pickNatal = (astro: unknown): unknown => {
      const a = astro as Record<string, unknown> | null
      const profile = a?.astroProfile as Record<string, unknown> | undefined
      return (a?.natalChart as unknown) || (profile?.natalChart as unknown) || a
    }
    type NatalArg = Parameters<typeof buildCoupleMatrix>[0]['natal']
    coupleMatrix = buildCoupleMatrix(
      { saju: p1Full, natal: pickNatal(p1Astro) as NatalArg, koreanAge: koreanAge(p1.date) },
      { saju: p2Full, natal: pickNatal(p2Astro) as NatalArg, koreanAge: koreanAge(p2.date) }
    )
  } catch {
    // ignore — additive
  }

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

  // Extra points (Lilith / Chiron / Vertex / Part of Fortune) — wires
  // engine output that was previously unused in compatibility flow.
  let extraPoints: ReturnType<typeof analyzeCoupleExtraPoints> = null
  try {
    if (p1Astro?.natalChart && p2Astro?.natalChart) {
      extraPoints = analyzeCoupleExtraPoints(
        p1Astro.natalChart,
        p2Astro.natalChart,
        p1.latitude ?? 37.5665,
        p1.longitude ?? 126.978,
        p2.latitude ?? 37.5665,
        p2.longitude ?? 126.978
      )
    }
  } catch (e) {
    logger.warn('[narrative-stream] extra points failed', e)
  }

  return {
    p1SajuOverview: compactSajuOverview(p1Full),
    p2SajuOverview: compactSajuOverview(p2Full),
    extendedSaju,
    extendedAstro,
    crossSystem,
    coupleMatrix,
    fusionDeepAnalysis,
    extraPoints,
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

  // Premium gate — long-form Sonnet narrative is premium-tier only.
  // Free users get the basic structured analysis without LLM polish.
  const userId = (await getServerSession(authOptions))?.user?.id
  const isPremium = await isDbPremiumUser(userId).catch(() => false)
  if (!isPremium) {
    return createErrorResponse({
      code: ErrorCodes.UNAUTHORIZED,
      message: 'AI 풀이는 프리미엄 멤버십에서 제공됩니다. 업그레이드 후 다시 시도해주세요.',
      locale: extractLocale(req),
      route: 'compatibility/narrative-stream',
      headers: { 'X-Premium-Required': '1' },
    })
  }

  // Cache check — same couple in 24h replays cached Sonnet output.
  const cacheKey = buildCacheKey(body.persons)
  const cached = narrativeCache.get(cacheKey)
  if (cached) {
    logger.info('[compatibility/narrative-stream] cache hit', { cacheKey })
    return streamCachedNarrative(cached, {})
  }

  try {
    const blocks = await buildExtendedBlocks(body.persons)
    const userPrompt = buildUserPrompt(body, blocks)

    // Capture full text as it streams; per-chunk sanitize catches most
    // jargon leaks live, finalize stores the fully cleaned version in
    // cache so subsequent reads are pristine.
    let fullText = ''
    return await streamClaudeAsSSE({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 16000,
      temperature: 0.55,
      timeoutMs: 150000,
      label: 'compatibility-narrative',
      model: PREMIUM_CLAUDE_MODEL,
      transform: (chunk) => {
        // Live per-chunk sanitize — catches Sonnet emitting "Venus"
        // as a single token. Partial matches across token boundaries
        // are corrected in the cache later.
        const { cleaned } = sanitizeAstroJargon(chunk)
        fullText += cleaned
        return cleaned
      },
      finalize: () => {
        if (fullText.length >= 300) {
          // Final whole-text sanitize before caching — catches anything
          // that slipped per-chunk.
          const { cleaned, replacementsCount } = sanitizeAstroJargon(fullText)
          narrativeCache.set(cacheKey, cleaned)
          logger.info('[compatibility/narrative-stream] cached', {
            cacheKey,
            chars: cleaned.length,
            jargonReplacements: replacementsCount,
            stillHasLeak: hasJargonLeak(cleaned),
          })
        }
        return null
      },
      additionalHeaders: { 'X-Narrative-Cache': 'miss' },
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

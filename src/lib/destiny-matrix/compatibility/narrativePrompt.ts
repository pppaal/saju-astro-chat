// src/lib/destiny-matrix/compatibility/narrativePrompt.ts
//
// Builds the system + user prompts for the LLM polish pass on top of the
// FULL compatibility engine output (3-layer + fusion + extended saju +
// extended astrology + couple deep insights).
//
// The user prompt is intentionally fact-dense — every score, signal,
// shinsal hit, aspect, and pattern is listed so the model can ground
// each magazine paragraph in something the engine actually computed.
// The system prompt forbids inventing facts that contradict the input.

import type { ThreeLayerCompatibility, CompatibilityPerson } from './threeLayerSynastry'
import type { PremiumCompatibilityContext } from './buildPremiumContext'

export interface CompatibilityNarrativePromptInput {
  personA: CompatibilityPerson
  personB: CompatibilityPerson
  labelA?: string
  labelB?: string
  /** Always provided. Drives the score-cards row on the result page. */
  layers: ThreeLayerCompatibility
  /** Full engine context — when present, fed into the prompt as facts. */
  context?: PremiumCompatibilityContext | null
}

const ICON_KEYS = [
  'sparkles',
  'flame',
  'message',
  'heart',
  'compass',
  'star',
  'shield',
  'target',
] as const

const SYSTEM_PROMPT = `당신은 한국의 사주명리학과 서양 점성학을 모두 깊이 다루는 프리미엄 관계 분석 칼럼니스트입니다. 두 사람의 사주·점성 데이터를 받아 매거진 톤의 궁합 리포트를 작성합니다.

[톤 & 스타일]
- 가벼운 운세 톤 절대 금지("천생연분이에요!" 류). 차분하고 단정적인, 그러나 거만하지 않은 분석가의 톤.
- 사주 용어(일간·일지·천간합·지지충·삼합·원진·식상·관성·격국·신살·용신 등)는 자연스럽게 본문에 녹이되, 처음 접하는 독자도 이해할 수 있게 풀어쓴다.
- 점성 용어(태양·달·수성·금성·화성·시너스트리·컴포지트·어스펙트·트라인·스퀘어 등)도 마찬가지.
- 관계를 운명론으로 단정 짓지 말 것 — "흐름·경향·신호"로 표현.
- 두 사람을 도덕적으로 평가하지 않음. 어느 한 쪽을 가해자/피해자로 그리지 말 것.
- 성별 고정관념 금지.

[가장 중요한 규칙]
- 응답은 반드시 단 하나의 JSON 객체. 앞뒤 설명·코드펜스·해설 절대 금지.
- 글자수 목표를 반드시 충족할 것. 짧으면 광고문, 너무 길면 가독성 떨어짐.
- 입력으로 주는 "엔진 결과(팩트)"의 점수·신호와 모순되는 새 사실 발명 금지.
  예: 엔진이 "일간 충"이라 했는데 LLM이 "일간 합"이라 쓰면 안 됨.
- 사주 격국·신살·점성 어스펙트가 있을 때는 본문에 그 이름을 한 번 이상 인용해 신뢰를 줄 것
  (예: "정관격끼리의 만남이라", "Venus square Mars의 긴장감이").

[글자수 목표 (한국어 기준)]
- theme: 28~50자.
- subTheme: 50~90자. 사주 또는 점성 키워드 1개 포함.
- summary: 정확히 4개 문단. 각 문단 220~320자. 4문단의 흐름은:
    "본질적 끌림 → 일상의 결 → 부딪히는 지점 → 함께 성장하는 길"
- insights: 정확히 4개. 각:
    - title: 8~22자.
    - content: 정확히 2개 문단. 각 180~260자.
    - advice: 60~140자, 행동 처방 한두 문장.
    - 4영역: "끌림과 매력 / 의사소통과 일상 / 갈등과 주의 / 장기 성장과 공명".
- dosAndDonts: dos 4 / donts 4. 각 12~38자, 명령형. 일반 격언 금지.
  두 사람 사주의 구체적 신호(격국·신살·어스펙트·일간 합/충 등)에 근거한 처방만.
- keyMoments: 3~5개. 각:
    - phase: 4~10자 (예: "첫 만남", "안정기", "갈등 시기", "장기 흐름")
    - headline: 6~20자
    - desc: 60~140자

[출력 JSON 스키마] — 정확히 아래 키와 타입만.
{
  "theme": string,
  "subTheme": string,
  "summary": [string, string, string, string],
  "insights": [
    { "id": string, "title": string,
      "iconKey": one of ${ICON_KEYS.map((k) => `"${k}"`).join(' | ')},
      "content": [string, string], "advice": string },
    // 정확히 4개
  ],
  "dosAndDonts": {
    "dos": [string, string, string, string],
    "donts": [string, string, string, string]
  },
  "keyMoments": [
    { "phase": string, "headline": string, "desc": string }
    // 3~5개
  ]
}`

export function buildCompatibilityNarrativeSystemPrompt(): string {
  return SYSTEM_PROMPT
}

function formatLayer(label: string, layer: ThreeLayerCompatibility[keyof ThreeLayerCompatibility]): string {
  if (layer && typeof layer === 'object' && 'score' in layer) {
    const signals =
      'signals' in layer && Array.isArray(layer.signals)
        ? layer.signals
            .slice(0, 8)
            .map((s) => `  • [${s.delta >= 0 ? '+' : ''}${s.delta}] ${s.text}`)
            .join('\n')
        : ''
    const narration = 'narration' in layer && typeof layer.narration === 'string' ? layer.narration : ''
    return [`### ${label}`, `점수: ${layer.score}/100`, signals, narration].filter(Boolean).join('\n')
  }
  return `### ${label}\n(데이터 없음)`
}

function formatPerson(label: string, p: CompatibilityPerson, displayName?: string): string {
  return [
    `${label} (${displayName || label})`,
    `- 생년월일: ${p.birthDate}`,
    `- 출생시간: ${p.birthTime}`,
    `- 성별: ${p.gender === 'female' ? '여성' : '남성'}`,
  ].join('\n')
}

function formatStringList(label: string, items: unknown, max = 6): string | null {
  if (!Array.isArray(items)) return null
  const lines = items
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .slice(0, max)
    .map((s) => `  • ${s}`)
  if (lines.length === 0) return null
  return `${label}:\n${lines.join('\n')}`
}

function formatFusionBlock(ctx: PremiumCompatibilityContext): string | null {
  if (!ctx.fusion) return null
  const f = ctx.fusion
  const lines: string[] = ['### 사주 × 점성 융합 분석 (Fusion)']
  lines.push(`전체 점수: ${f.overallScore}/100`)
  if (f.breakdown) {
    lines.push(
      `세부: 사주 ${f.breakdown.saju} / 점성 ${f.breakdown.astrology} / 오행조화 ${f.breakdown.elementalHarmony} / 음양균형 ${f.breakdown.yinYangBalance}`
    )
  }
  const strengths = formatStringList('강점 신호', f.strengths)
  if (strengths) lines.push(strengths)
  const challenges = formatStringList('주의 신호', f.challenges)
  if (challenges) lines.push(challenges)
  if (f.aiInsights?.deepAnalysis) {
    lines.push(`엔진 심층 분석: ${f.aiInsights.deepAnalysis.slice(0, 400)}`)
  }
  const synergy = formatStringList('시너지 원천', f.aiInsights?.synergySources)
  if (synergy) lines.push(synergy)
  const growth = formatStringList('성장 기회', f.aiInsights?.growthOpportunities)
  if (growth) lines.push(growth)
  if (f.relationshipDynamics) {
    const d = f.relationshipDynamics
    lines.push(
      `관계 역학: 정서강도 ${d.emotionalIntensity} / 지적정합 ${d.intellectualAlignment} / 영적연결 ${d.spiritualConnection} / 갈등해결 스타일 ${d.conflictResolutionStyle}`
    )
  }
  if (f.futureGuidance) {
    if (f.futureGuidance.shortTerm) lines.push(`단기(1~6개월): ${f.futureGuidance.shortTerm}`)
    if (f.futureGuidance.mediumTerm) lines.push(`중기(6개월~2년): ${f.futureGuidance.mediumTerm}`)
    if (f.futureGuidance.longTerm) lines.push(`장기(2년+): ${f.futureGuidance.longTerm}`)
  }
  return lines.join('\n')
}

function formatExtendedSaju(ctx: PremiumCompatibilityContext): string | null {
  const ex = ctx.extendedSaju as Record<string, unknown> | null
  if (!ex || typeof ex !== 'object') return null
  const lines: string[] = ['### 확장 사주 분석 (격국·신살·60갑자·용신·대운 동행)']
  for (const [key, value] of Object.entries(ex)) {
    if (typeof value === 'string' && value.trim().length > 0 && value.length < 600) {
      lines.push(`- ${key}: ${value.trim()}`)
    } else if (typeof value === 'number') {
      lines.push(`- ${key}: ${value}`)
    } else if (Array.isArray(value)) {
      const list = value
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .slice(0, 5)
      if (list.length > 0) {
        lines.push(`- ${key}: ${list.join(' / ')}`)
      }
    } else if (value && typeof value === 'object') {
      const nested = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
        .slice(0, 5)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
      if (nested.length > 0) {
        lines.push(`- ${key}: { ${nested} }`)
      }
    }
  }
  return lines.length > 1 ? lines.join('\n') : null
}

function formatExtendedAstro(ctx: PremiumCompatibilityContext): string | null {
  const ex = ctx.extendedAstro as Record<string, unknown> | null
  if (!ex || typeof ex !== 'object') return null
  const lines: string[] = ['### 확장 점성 분석 (어스펙트·하우스·트랜짓)']
  for (const [key, value] of Object.entries(ex)) {
    if (typeof value === 'string' && value.trim().length > 0 && value.length < 600) {
      lines.push(`- ${key}: ${value.trim()}`)
    } else if (typeof value === 'number') {
      lines.push(`- ${key}: ${value}`)
    } else if (Array.isArray(value)) {
      const list = value
        .map((entry) => {
          if (typeof entry === 'string') return entry
          if (entry && typeof entry === 'object') {
            const o = entry as Record<string, unknown>
            const planet1 = o.planet1 || o.from || o.body1
            const planet2 = o.planet2 || o.to || o.body2
            const aspect = o.aspect || o.kind || o.type
            const orb = o.orb
            if (planet1 && planet2 && aspect) {
              return `${planet1} ${aspect} ${planet2}${orb !== undefined ? ` (orb ${orb})` : ''}`
            }
          }
          return null
        })
        .filter((s): s is string => typeof s === 'string')
        .slice(0, 6)
      if (list.length > 0) {
        lines.push(`- ${key}: ${list.join(' / ')}`)
      }
    }
  }
  return lines.length > 1 ? lines.join('\n') : null
}

function formatDeepInsights(ctx: PremiumCompatibilityContext): string | null {
  const di = ctx.deepInsights as Record<string, unknown> | null
  if (!di || typeof di !== 'object') return null
  const lines: string[] = ['### 커플 심층 인사이트 (성격·소통·갈등 패턴)']
  for (const [key, value] of Object.entries(di)) {
    if (typeof value === 'string' && value.trim().length > 0 && value.length < 600) {
      lines.push(`- ${key}: ${value.trim()}`)
    } else if (Array.isArray(value)) {
      const list = value
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .slice(0, 5)
      if (list.length > 0) {
        lines.push(`- ${key}: ${list.join(' / ')}`)
      }
    }
  }
  return lines.length > 1 ? lines.join('\n') : null
}

function formatCoupleTiming(ctx: PremiumCompatibilityContext): string | null {
  const t = ctx.coupleTiming
  if (!t) return null
  const lines = ['### 두 사람 동행 타이밍 (대운·세운 12개월)']
  if (t.bestMeetingMonth) {
    lines.push(`- 최적 시기: ${JSON.stringify(t.bestMeetingMonth)}`)
  }
  if (Array.isArray(t.upcomingMonths) && t.upcomingMonths.length > 0) {
    lines.push(
      `- 향후 12개월 주요 흐름: ${t.upcomingMonths
        .slice(0, 6)
        .map((m) => JSON.stringify(m))
        .join(' / ')}`
    )
  }
  if (t.activationPeriod) {
    lines.push(`- 활성기: ${t.activationPeriod.when} — ${t.activationPeriod.reason}`)
  }
  if (t.cautionPeriod) {
    lines.push(`- 주의기: ${t.cautionPeriod.when} — ${t.cautionPeriod.reason}`)
  }
  if (t.primeYearWindow) {
    lines.push(
      `- 핵심 연도: ${t.primeYearWindow.startYear}~${t.primeYearWindow.endYear} — ${t.primeYearWindow.reason}`
    )
  }
  if (t.monthlyOutlook) {
    lines.push(`- 월별 전망 요약: ${t.monthlyOutlook.slice(0, 280)}`)
  }
  return lines.length > 1 ? lines.join('\n') : null
}

function formatCoupleAstroTiming(ctx: PremiumCompatibilityContext): string | null {
  const t = ctx.coupleAstroTiming
  if (!t) return null
  const lines = ['### 점성 트랜짓 타이밍 (Saturn / Jupiter 시기)']
  if (t.saturnEra) {
    lines.push(
      `- 토성기 (${t.saturnEra.signKo}): ${t.saturnEra.themeKo} — ${t.saturnEra.bothImpact}`
    )
  }
  if (t.jupiterEra) {
    lines.push(
      `- 목성기 (${t.jupiterEra.signKo}): ${t.jupiterEra.themeKo} — ${t.jupiterEra.bothImpact}`
    )
  }
  if (Array.isArray(t.lifeStages) && t.lifeStages.length > 0) {
    for (const s of t.lifeStages.slice(0, 6)) {
      lines.push(`- ${s.label} (P${s.person}, ${s.timing}): ${s.description}`)
    }
  }
  if (t.crossNarrative) {
    lines.push(`- 교차 흐름: ${t.crossNarrative.slice(0, 280)}`)
  }
  return lines.length > 1 ? lines.join('\n') : null
}

function formatIdealTypes(ctx: PremiumCompatibilityContext): string | null {
  if (!ctx.idealTypes || ctx.idealTypes.length === 0) return null
  const lines = ['### 이상형 매칭 프로파일 (6각도)']
  for (const profile of ctx.idealTypes.slice(0, 2)) {
    lines.push(`- Person ${profile.personIndex}: ${profile.matchSummary}`)
    for (const angle of profile.angles.slice(0, 6)) {
      lines.push(
        `  · ${angle.label} [${angle.level}] — 찾는 모습: ${angle.seeks} / 실제: ${angle.partnerOffers}`
      )
    }
  }
  return lines.join('\n')
}

function formatMultiFacets(ctx: PremiumCompatibilityContext): string | null {
  if (!ctx.multiFacets || ctx.multiFacets.length === 0) return null
  const lines = ['### 8 영역 다각도 분석']
  for (const f of ctx.multiFacets) {
    lines.push(`- ${f.emoji} ${f.label} [${f.band} ${f.score}]: ${f.headline}`)
    if (f.strengths?.length) {
      lines.push(`  · 강점: ${f.strengths.slice(0, 2).join(' / ')}`)
    }
    if (f.minds?.length) {
      lines.push(`  · 유의: ${f.minds.slice(0, 2).join(' / ')}`)
    }
    if (f.tip) {
      lines.push(`  · 팁: ${f.tip}`)
    }
  }
  return lines.join('\n')
}

function formatExtraPoints(ctx: PremiumCompatibilityContext): string | null {
  const ex = ctx.extraPoints as Record<string, unknown> | null
  if (!ex || typeof ex !== 'object') return null
  const lines = ['### 가산점 신호 (Lilith·Chiron·Vertex 등)']
  for (const [key, value] of Object.entries(ex)) {
    if (typeof value === 'string' && value.trim().length > 0 && value.length < 400) {
      lines.push(`- ${key}: ${value.trim()}`)
    } else if (typeof value === 'number') {
      lines.push(`- ${key}: ${value}`)
    } else if (Array.isArray(value)) {
      const list = value
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .slice(0, 5)
      if (list.length > 0) {
        lines.push(`- ${key}: ${list.join(' / ')}`)
      }
    }
  }
  return lines.length > 1 ? lines.join('\n') : null
}

function formatCrossSystem(ctx: PremiumCompatibilityContext): string | null {
  const cs = ctx.crossSystem
  if (!cs) return null
  const lines = ['### 사주 ↔ 점성 교차 그래프']
  lines.push(`- 교차 점수: ${cs.crossSystemScore}/100`)
  if (cs.dayMasterSunAnalysis?.crossHarmony?.interpretation) {
    lines.push(`- 일간 × 태양: ${cs.dayMasterSunAnalysis.crossHarmony.interpretation}`)
  }
  if (Array.isArray(cs.monthBranchMoonAnalysis?.interpretation)) {
    const pick = cs.monthBranchMoonAnalysis.interpretation[0]
    if (pick) lines.push(`- 월지 × 달: ${pick}`)
  }
  if (Array.isArray(cs.elementFusionAnalysis?.interpretation)) {
    const pick = cs.elementFusionAnalysis.interpretation[0]
    if (pick) lines.push(`- 오행 융합: ${pick}`)
  }
  if (cs.pillarPlanetCorrespondence?.fusionReading) {
    lines.push(`- 기둥 × 행성 대응: ${cs.pillarPlanetCorrespondence.fusionReading}`)
  }
  if (Array.isArray(cs.fusionInsights) && cs.fusionInsights.length > 0) {
    for (const ins of cs.fusionInsights.slice(0, 3)) {
      if (typeof ins === 'string' && ins.trim().length > 0) {
        lines.push(`- 종합: ${ins}`)
      }
    }
  }
  return lines.length > 1 ? lines.join('\n') : null
}

function formatTagline(ctx: PremiumCompatibilityContext): string | null {
  if (!ctx.tagline) return null
  const { headline, subline } = ctx.tagline
  if (!headline && !subline) return null
  return `### 엔진 도출 한 줄 태그라인\n- ${headline}\n- ${subline}`
}

export function buildCompatibilityNarrativeUserPrompt(input: CompatibilityNarrativePromptInput): string {
  const labelA = input.labelA || 'A'
  const labelB = input.labelB || 'B'

  const sections: Array<string | null> = [
    '[두 사람 정보]',
    formatPerson('Person A', input.personA, labelA),
    '',
    formatPerson('Person B', input.personB, labelB),
    '',
    '[엔진 결과 — 팩트 (이 점수·신호와 모순되는 내용 절대 작성 금지)]',
    formatLayer('Layer 1: 사주 정합도', input.layers.layer1_saju),
    '',
    formatLayer('Layer 2: 점성 시너스트리 (간이)', input.layers.layer2_synastry),
    '',
    formatLayer('Layer 3: 합쳐진 에너지 (Composite)', input.layers.layer3_composite),
    '',
    `### 종합`,
    `점수: ${input.layers.integrated.score}/100`,
    `등급: ${input.layers.integrated.level}`,
    input.layers.integrated.narration,
    '',
  ]

  if (input.context) {
    const blocks = [
      formatTagline(input.context),
      formatFusionBlock(input.context),
      formatExtendedSaju(input.context),
      formatExtendedAstro(input.context),
      formatDeepInsights(input.context),
      formatCoupleTiming(input.context),
      formatCoupleAstroTiming(input.context),
      formatIdealTypes(input.context),
      formatMultiFacets(input.context),
      formatExtraPoints(input.context),
      formatCrossSystem(input.context),
    ]
    for (const block of blocks) {
      if (block) {
        sections.push(block, '')
      }
    }
    sections.push(
      `[보조 정보]`,
      `- 두 사람 나이: ${labelA} ${input.context.ages.a}세 / ${labelB} ${input.context.ages.b}세`,
      ''
    )
  }

  sections.push(
    '[작성 지시]',
    '위 모든 팩트(3-layer + Fusion + 확장 사주 + 확장 점성 + 커플 심층)를 근거로 매거진 톤 narrative JSON을 생성하라.',
    '본문에 격국·신살·일간 합/충·어스펙트 같은 구체적 용어를 자연스럽게 인용해 신뢰감을 줄 것.',
    '글자수·JSON 스키마 정확히 준수. JSON 객체 하나만 출력. 앞뒤 텍스트·코드펜스 금지.'
  )

  return sections.filter((line): line is string => line !== null).join('\n')
}

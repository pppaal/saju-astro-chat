import type { MatrixCalculationInput } from '../types'
import type { TimingData, UnifiedClaim, UnifiedParaEvidenceRef, UnifiedReportScope, UnifiedScenarioBundle, UnifiedScores, UnifiedSelectedSignal, UnifiedTimelineEvent, UnifiedTimeWindow } from './types'
import type { SectionEvidenceRefs } from './evidenceRefs'
import type { GraphRAGEvidenceBundle } from './graphRagEvidence'
import type { DeterministicSectionBlock } from './deterministicCore'
import { clamp, extractMustKeepTokens, sectionToDomain } from './unifiedReportSupport'
import type { MappingCountryFit, MappingIncomeBand, MappingRulebook } from './unifiedReportSupport'

const PARAGRAPH_COUNT_PER_SECTION = 3

export function claimTypeFromDomain(domain?: string): UnifiedTimelineEvent['type'] {
  if (domain === 'career') return 'job'
  if (domain === 'relationship') return 'relationship'
  if (domain === 'wealth') return 'money'
  if (domain === 'health') return 'health'
  if (domain === 'move') return 'relocation'
  if (domain === 'timing') return 'timing'
  return 'life'
}
export function claimToScenarioDomain(domain?: string): UnifiedScenarioBundle['domain'] | null {
  if (domain === 'career') return 'career'
  if (domain === 'relationship') return 'relationship'
  if (domain === 'wealth') return 'wealth'
  if (domain === 'health') return 'health'
  if (domain === 'move') return 'move'
  if (domain === 'timing') return 'timing'
  if (domain === 'personality' || domain === 'spirituality') return 'personality'
  return null
}

function inferAgeFromBirthDate(birthDate?: string): number | null {
  if (!birthDate) return null
  const parsed = new Date(birthDate)
  if (Number.isNaN(parsed.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - parsed.getFullYear()
  const m = now.getMonth() - parsed.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < parsed.getDate())) age -= 1
  return Number.isFinite(age) && age >= 0 ? age : null
}
export function buildUnifiedTimelineEventsFromClaims(params: {
  mode: 'comprehensive' | 'timing' | 'themed'
  lang: 'ko' | 'en'
  claims: UnifiedClaim[]
  graphRagEvidence: GraphRAGEvidenceBundle | undefined
  timingData?: TimingData
  scope: UnifiedReportScope
  birthDate?: string
}): UnifiedTimelineEvent[] {
  const events: UnifiedTimelineEvent[] = []
  const year = params.timingData?.seun?.year
  const month = params.timingData?.wolun?.month
  if (params.scope === 'LIFE') {
    const age = inferAgeFromBirthDate(params.birthDate)
    const stages = ['0-19', '20-34', '35-49', '50-64', '65-84']
    for (const stage of stages) {
      events.push({
        id: `EVT_STAGE_${stage.replace('-', '_')}`,
        type: 'life',
        timeHint: { ageRange: stage, confidence: 0.64 },
        thesis:
          params.lang === 'ko'
            ? `${stage}? ??? ?? ??? ????? ?? ??? ????? ?? ???? ???? ?????.${age ? ` ?? ??(? ${age}?) ???? ????? ?????.` : ''}`
            : `Stage ${stage} rewards simpler decision rules and repeatable routines for lower variance.${age ? ` Current age context (${age}) can refine priorities.` : ''}`,
        evidenceRefs: params.claims.flatMap((claim) => claim.selectedSignalIds).slice(0, 3),
      })
    }

    const turningAgeRanges = ['20-24', '25-29', '30-34', '35-39', '40-44', '45-54', '55-64']
    for (const [index, claim] of params.claims.slice(0, 7).entries()) {
      const ageRange = turningAgeRanges[index] || '65-74'
      events.push({
        id: `EVT_TURN_${index + 1}`,
        type: claimTypeFromDomain(claim.domain),
        timeHint: {
          ageRange,
          year,
          confidence: 0.61,
        },
        thesis:
          params.lang === 'ko'
            ? `${claim.text} ??? ????? ??? ????? ?? ?? ?? ??? ??? ?? ??? ????.`
            : `${claim.text} In turning-point windows, staged decisions with pre-commit verification improve cumulative outcomes.`,
        evidenceRefs: [
          ...(claim.selectedSignalIds || []).slice(0, 3),
          ...(claim.anchorIds || []).slice(0, 2),
        ],
      })
    }

    for (const anchor of params.graphRagEvidence?.anchors || []) {
      events.push({
        id: `EVT_LIFE_SUPPORT_${events.length + 1}`,
        type: 'timing',
        timeHint: { year, month, confidence: 0.52 },
        thesis:
          params.lang === 'ko'
            ? `${anchor.section} ?? ??? ?? ???? ?? ??? ??? ??? ?? ? ??? ?????.`
            : `Cross evidence in ${anchor.section} suggests monthly execution is safer with explicit verification gates.`,
        evidenceRefs: [anchor.id],
      })
      if (events.length >= 20) break
    }
    return events.slice(0, 20)
  }

  for (const claim of params.claims.slice(0, 8)) {
    events.push({
      id: `EVT_${events.length + 1}`,
      type: claimTypeFromDomain(claim.domain),
      timeHint: {
        year,
        month,
        confidence: 0.62,
      },
      thesis:
        params.lang === 'ko'
          ? `${claim.text} ?? ??? ??? ??? ???? ??? ??? ????? ?? ???? ?????.`
          : `${claim.text} This window is more stable when start and finalization are separated with one recheck step.`,
      evidenceRefs: [
        ...(claim.selectedSignalIds || []).slice(0, 3),
        ...(claim.anchorIds || []).slice(0, 2),
      ],
    })
  }

  for (const anchor of params.graphRagEvidence?.anchors || []) {
    events.push({
      id: `EVT_ANCHOR_${events.length + 1}`,
      type: 'timing',
      timeHint: { year, month, confidence: 0.58 },
      thesis:
        params.lang === 'ko'
          ? `${anchor.section} ?? ???? ??-?? ?? ??? ????, ?? ????? ?? ??? ?? ??? ???? ?? ? ????.`
          : `Cross evidence in ${anchor.section} indicates lower variance when a verification step is applied before commitment.`,
      evidenceRefs: [anchor.id],
    })
    if (events.length >= 12) break
  }

  return events.slice(0, 10)
}

export function buildUnifiedScenarioBundles(params: {
  claims: UnifiedClaim[]
  timelineEvents: UnifiedTimelineEvent[]
}): UnifiedScenarioBundle[] {
  const bundles = new Map<UnifiedScenarioBundle['domain'], UnifiedScenarioBundle>()
  for (const claim of params.claims) {
    const domain = claimToScenarioDomain(claim.domain)
    if (!domain || bundles.has(domain)) continue
    bundles.set(domain, {
      id: `SCB_${domain.toUpperCase()}_01`,
      domain,
      main: {
        eventIds: [],
        summaryTokens: [claim.text].filter(Boolean).slice(0, 2),
      },
      alt: [],
      selectionWhy: {
        claimIds: [claim.id],
        signalIds: [...claim.selectedSignalIds.slice(0, 4)],
        anchorIds: [...claim.anchorIds.slice(0, 3)],
      },
    })
  }

  const allEvents = [...params.timelineEvents]
  for (const bundle of bundles.values()) {
    const domainEvents = allEvents.filter((event) => {
      const eventDomain = claimToScenarioDomain(
        event.type === 'job'
          ? 'career'
          : event.type === 'relationship' || event.type === 'marriage'
            ? 'relationship'
            : event.type === 'money'
              ? 'wealth'
              : event.type === 'health'
                ? 'health'
                : event.type === 'relocation'
                  ? 'move'
                  : event.type === 'timing'
                    ? 'timing'
                    : 'personality'
      )
      return eventDomain === bundle.domain
    })
    if (domainEvents[0]) {
      bundle.main.eventIds = [domainEvents[0].id]
      bundle.main.summaryTokens = [domainEvents[0].thesis.slice(0, 64)]
    }
    const altCandidates = domainEvents
      .slice(1)
      .concat(allEvents.filter((event) => !bundle.main.eventIds.includes(event.id)))
    for (const candidate of altCandidates) {
      if (bundle.alt.length >= 2) break
      bundle.alt.push({
        eventIds: [candidate.id],
        summaryTokens: [candidate.thesis.slice(0, 64)],
      })
    }
    while (bundle.alt.length < 2 && allEvents.length > 0) {
      const fallback = allEvents[bundle.alt.length % allEvents.length]
      bundle.alt.push({
        eventIds: [fallback.id],
        summaryTokens: [fallback.thesis.slice(0, 64)],
      })
    }
  }
  return [...bundles.values()]
}

export function buildEvidenceRefsByPara(params: {
  sectionPaths: string[]
  evidenceRefs: SectionEvidenceRefs
  claims: UnifiedClaim[]
}): Record<string, UnifiedParaEvidenceRef> {
  const out: Record<string, UnifiedParaEvidenceRef> = {}
  for (const path of params.sectionPaths) {
    const refs = params.evidenceRefs[path] || []
    const allSignalIds = refs
      .map((ref) => ref.id)
      .filter(Boolean)
      .slice(0, 6)
    const perParagraph =
      allSignalIds.length > 0
        ? Math.max(1, Math.ceil(allSignalIds.length / PARAGRAPH_COUNT_PER_SECTION))
        : 1
    for (let index = 0; index < PARAGRAPH_COUNT_PER_SECTION; index += 1) {
      const paraSignalIds =
        allSignalIds.slice(index * perParagraph, (index + 1) * perParagraph).length > 0
          ? allSignalIds.slice(index * perParagraph, (index + 1) * perParagraph)
          : allSignalIds.slice(0, perParagraph)
      const claimIds = params.claims
        .filter((claim) => claim.selectedSignalIds.some((id) => paraSignalIds.includes(id)))
        .map((claim) => claim.id)
        .slice(0, 4)
      const anchorIds = params.claims
        .filter((claim) => claimIds.includes(claim.id))
        .flatMap((claim) => claim.anchorIds || [])
        .slice(0, 3)
      out[`${path}.p${index + 1}`] = { claimIds, signalIds: paraSignalIds, anchorIds }
    }
  }
  return out
}

export function sectionHeading(lang: 'ko' | 'en', sectionPath: string, index: number): string {
  const headingIndex = Math.max(1, Math.min(3, index)) - 1
  if (sectionPath.includes('spouseProfile')) {
    return lang === 'ko'
      ? ['# 배우자 아키타입', '## 만남 채널과 관계 단서', '## 오래 가는 관계 운영법'][headingIndex]
      : ['# Partner Archetype', '## Meeting Channels and Clues', '## How the Relationship Holds'][headingIndex]
  }
  if (sectionPath.includes('relationshipDynamics')) {
    return lang === 'ko'
      ? ['# 배우자 아키타입(누구)', '## 만남 채널·알아볼 단서', '## 관계 타임라인과 방어전략'][headingIndex]
      : ['# Partner Archetype', '# Meeting Channels and Recognition Clues', '# Timeline and Defense Strategy'][headingIndex]
  }
  if (sectionPath.includes('lifeStages')) {
    return lang === 'ko'
      ? ['# 인생 단계별 흐름', '## 단계별 과제', '## 다음 구간 준비'][headingIndex]
      : ['# Life Stages', '## Stage Tasks', '## Preparing the Next Phase'][headingIndex]
  }
  if (sectionPath.includes('turningPoints')) {
    return lang === 'ko'
      ? ['# 주요 변곡점', '## 변곡점 근거', '## 대응 원칙'][headingIndex]
      : ['# Major Turning Points', '## Why They Matter', '## Response Rules'][headingIndex]
  }
  if (sectionPath.includes('futureOutlook')) {
    return lang === 'ko'
      ? ['# 앞으로 3~5년', '## 중기 흐름', '## 준비할 변화'][headingIndex]
      : ['# Next 3-5 Years', '## Mid-Term Flow', '## Changes to Prepare'][headingIndex]
  }
  const key = sectionPath.split('.').join('_')
  const koMap: Record<string, [string, string, string]> = {
    introduction: ['# ?? ?? ? ? ????', '## ?? ??/?? ??', '## ???? ?? ??'],
    personalityDeep: ['# ?? ??(??)', '# ??? ??(???)', '# ?? ??? ???? ??'],
    careerPath: [
      '# ??? ??(?? ????)',
      '# ??·?? ??? ??',
      '# ????? 90? ??',
    ],
    relationshipDynamics: [
      '# ??? ????(??)',
      '# ?? ??·??? ??',
      '# ?? ????? ????',
    ],
    spouseProfile: ['# 배우자 아키타입', '## 만남 채널과 관계 단서', '## 오래 가는 관계 운영법'],
    wealthPotential: ['# ?? ???', '# ?? ??·?? ??? ??', '# ?? ??? ??? ?'],
    healthGuidance: ['# ?? ??', '# ?? ??', '# ?? ??'],
    lifeMission: ['# ?? ? ?', '# ?? ?? 3', '# ??/?? ???'],
    lifeStages: ['# 인생 단계별 흐름', '## 단계별 과제', '## 다음 구간 준비'],
    turningPoints: ['# 주요 변곡점', '## 변곡점 근거', '## 대응 원칙'],
    futureOutlook: ['# 앞으로 3~5년', '## 중기 흐름', '## 준비할 변화'],
    timingAdvice: ['# ?? ?? ??', '## ??? Top7 ??', '## ?? ??? ??'],
    actionPlan: ['# 2? ?? 3??', '# ?????', '# KPI? ??? ????'],
    conclusion: ['# ?? ??', '# ??? ? ??', '# ??? ???'],
    overview: ['# ?? ??', '## ?? ??', '## ?? ??'],
    energy: ['# ??? ??', '## ?? ??', '## ?? ??'],
    opportunities: ['# ?? ???', '## ?? ??', '## ?? ??'],
    cautions: ['# ?? ???', '## ?? ??', '## ?? ??'],
    actionPlan_timing: ['# ?? ??', '## ?? ??', '## ?? ??'],
  }
  const enMap: Record<string, [string, string, string]> = {
    introduction: ['# Life Logline', '## Score and Trust Summary', '## Levers and Execution'],
    personalityDeep: ['# Personality Engine', '# Shadow Patterns', '# Recovery and Decision Rules'],
    careerPath: [
      '# Career Engine',
      '# Industry/Country Fit Evidence',
      '# Scenarios and 90-Day Plan',
    ],
    relationshipDynamics: [
      '# Partner Archetype',
      '# Meeting Channels and Recognition Clues',
      '# Timeline and Defense Strategy',
    ],
    spouseProfile: ['# Partner Archetype', '## Meeting Channels and Clues', '## How the Relationship Holds'],
    wealthPotential: [
      '# Money Style',
      '# Income Bands and Jump Events',
      '# Leakage Control and Risk Rule',
    ],
    healthGuidance: ['# Vulnerability Patterns', '# Early Warnings', '# Minimum Routine'],
    lifeMission: ['# Mission Statement', '# Three Decision Criteria', '# Expand vs Reduce'],
    lifeStages: ['# Life Stages', '## Stage Tasks', '## Preparing the Next Phase'],
    turningPoints: ['# Major Turning Points', '## Why They Matter', '## Response Rules'],
    futureOutlook: ['# Next 3-5 Years', '## Mid-Term Flow', '## Changes to Prepare'],
    timingAdvice: ['# Life Chapter Flow', '## Top Turning Points Evidence', '## Timing Strategy'],
    actionPlan: ['# Two-Week Plan', '# Checklist', '# KPI and Trigger Protocol'],
    conclusion: ['# Winning Conditions', '# Conditions to Avoid', '# Closing Message'],
    overview: ['# Period Overview', '## Evidence Snapshot', '## Action Strategy'],
    energy: ['# Energy Flow', '## Evidence Snapshot', '## Action Strategy'],
    opportunities: ['# Opportunity Windows', '## Evidence Snapshot', '## Action Strategy'],
    cautions: ['# Caution Windows', '## Evidence Snapshot', '## Action Strategy'],
    actionPlan_timing: ['# Action Plan', '## Evidence Snapshot', '## Action Strategy'],
  }
  const mapKey =
    sectionPath === 'actionPlan' && key.includes('timing') ? 'actionPlan_timing' : sectionPath
  const indexSafe = headingIndex
  if (lang === 'ko') {
    const headings = koMap[mapKey] || [
      `## ${key} ?? ??`,
      `## ${key} ?? ??`,
      `## ${key} ?? ??`,
    ]
    return headings[indexSafe]
  }
  const headings = enMap[mapKey] || [
    `## ${key} Core Thesis`,
    `## ${key} Evidence Snapshot`,
    `## ${key} Action Strategy`,
  ]
  return headings[indexSafe]
}

export function formatTimeHintLabel(lang: 'ko' | 'en', hint?: UnifiedTimelineEvent['timeHint']): string {
  if (!hint) return lang === 'ko' ? '?? ??' : 'timing pending'
  if (hint.ageRange) return lang === 'ko' ? `${hint.ageRange}?` : `age ${hint.ageRange}`
  if (hint.date) return hint.date
  if (hint.year && hint.month) return `${hint.year}-${String(hint.month).padStart(2, '0')}`
  if (hint.year) return `${hint.year}`
  if (hint.month) return lang === 'ko' ? `${hint.month}?` : `M${hint.month}`
  return lang === 'ko' ? '?? ??' : 'timing pending'
}

export function formatTimelineEventLine(lang: 'ko' | 'en', event: UnifiedTimelineEvent): string {
  const label = formatTimeHintLabel(lang, event.timeHint)
  const confidence =
    typeof event.timeHint?.confidence === 'number'
      ? Math.round(clamp(event.timeHint.confidence, 0, 1) * 100)
      : null
  if (lang === 'ko') {
    return confidence !== null
      ? `${label} (${confidence}%): ${event.thesis}`
      : `${label}: ${event.thesis}`
  }
  return confidence !== null
    ? `${label} (${confidence}%): ${event.thesis}`
    : `${label}: ${event.thesis}`
}

export function formatScenarioLines(params: {
  lang: 'ko' | 'en'
  bundle?: UnifiedScenarioBundle
  eventsById: Map<string, UnifiedTimelineEvent>
}): string[] {
  const { lang, bundle, eventsById } = params
  if (!bundle) {
    return [
      lang === 'ko'
        ? '??/?? ????? ?? ??? ???? ???????.'
        : 'Main/alternative scenarios will be updated from core events.',
    ]
  }
  const toLines = (ids: string[]) =>
    ids
      .map((id) => eventsById.get(id))
      .filter(Boolean)
      .map((event) => formatTimelineEventLine(lang, event as UnifiedTimelineEvent))
      .slice(0, 2)
  const mainLines = toLines(bundle.main.eventIds || [])
  const altLines = (bundle.alt || [])
    .slice(0, 2)
    .flatMap((option) => toLines(option.eventIds || []))
  const out: string[] = []
  if (mainLines.length > 0) out.push(`Main: ${mainLines.join(' / ')}`)
  if (altLines.length > 0) out.push(`Alt: ${altLines.join(' / ')}`)
  if (out.length === 0) {
    out.push(
      lang === 'ko'
        ? '???? ??? ???? ?? ?? ??? ?????.'
        : 'Scenario evidence is limited; keep base safety strategy.'
    )
  }
  return out
}

export function formatCountryFitLine(lang: 'ko' | 'en', item: MappingCountryFit): string {
  return lang === 'ko'
    ? `${item.country} ??? ${item.fitScore}: ${item.tradeOff}`
    : `${item.country} fit ${item.fitScore}: ${item.tradeOff}`
}

export function formatIncomeBandLine(lang: 'ko' | 'en', item: MappingIncomeBand): string {
  const confidence = Math.round(clamp(item.confidence, 0, 1) * 100)
  return lang === 'ko'
    ? `${item.label} (${confidence}%): ????=${item.conditionsUpper} / ?????=${item.risksLower}`
    : `${item.label} (${confidence}%): upper=${item.conditionsUpper} / lower-risk=${item.risksLower}`
}

export function buildBlocksBySection(params: {
  lang: 'ko' | 'en'
  sectionPaths: string[]
  claims: UnifiedClaim[]
  selectedSignals: UnifiedSelectedSignal[]
  timelineEvents: UnifiedTimelineEvent[]
  scenarioBundles: UnifiedScenarioBundle[]
  mappingRulebook: MappingRulebook
  scores: UnifiedScores
  matrixInput?: MatrixCalculationInput
  timeWindow: UnifiedTimeWindow
  evidenceRefsByPara: Record<string, UnifiedParaEvidenceRef>
}): Record<string, DeterministicSectionBlock[]> {
  const blocksBySection: Record<string, DeterministicSectionBlock[]> = {}
  const eventsById = new Map(params.timelineEvents.map((event) => [event.id, event]))

  for (const sectionPath of params.sectionPaths) {
    const sectionKey = sectionPath.split('.').pop() || sectionPath
    const domain = sectionToDomain(sectionPath)
    const claim = params.claims.find((item) => (item.domain || 'personality') === domain)
    const relevantEvents = params.timelineEvents
      .filter((event) =>
        domain === 'personality'
          ? event.type === 'life'
          : claimTypeFromDomain(domain) === event.type
      )
      .slice(0, 6)
    const bundle = params.scenarioBundles.find((item) => item.domain === domain)

    const para1 = params.evidenceRefsByPara[`${sectionPath}.p1`] || {
      claimIds: claim ? [claim.id] : [],
      signalIds: claim?.selectedSignalIds.slice(0, 2) || [],
      anchorIds: claim?.anchorIds.slice(0, 2) || [],
    }
    const para2 = params.evidenceRefsByPara[`${sectionPath}.p2`] || para1
    const para3 = params.evidenceRefsByPara[`${sectionPath}.p3`] || para2

    const signalSummaries = params.selectedSignals
      .filter((signal) => [...para1.signalIds, ...para2.signalIds].includes(signal.id))
      .map((signal) => signal.summary)
      .slice(0, 4)

    const eventLines = relevantEvents.map((event) => event.thesis).slice(0, 3)
    const scenarioHint = bundle
      ? [
          ...(bundle.main.summaryTokens || []),
          ...(bundle.alt || []).flatMap((option) => option.summaryTokens || []),
        ]
      : []

    const scenarioLines = formatScenarioLines({ lang: params.lang, bundle, eventsById })
    const countryLines = params.mappingRulebook.countryFit
      .slice(0, 3)
      .map((item) => formatCountryFitLine(params.lang, item))
    const incomeBandLines = params.mappingRulebook.incomeBands
      .slice(0, 3)
      .map((item) => formatIncomeBandLine(params.lang, item))

    const topLifeEvents = params.timelineEvents
      .filter((event) => event.type === 'life')
      .slice(0, 3)
      .map((event) => formatTimelineEventLine(params.lang, event))

    const turningEvents = params.timelineEvents
      .filter((event) => event.id.startsWith('EVT_TURN_'))
      .slice(0, 3)
      .map((event) => formatTimelineEventLine(params.lang, event))

    const topDomainScores = Object.entries(params.scores.domains || {})
      .sort((a, b) => (b[1]?.score || 0) - (a[1]?.score || 0))
      .slice(0, 3)
      .map(([name, score]) =>
        params.lang === 'ko'
          ? `${name} ${score.score}?(${Math.round((score.confidence || 0) * 100)}%)`
          : `${name} ${score.score} (${Math.round((score.confidence || 0) * 100)}%)`
      )

    const mappingTokens = [
      params.mappingRulebook.countryFit[0]?.country,
      params.mappingRulebook.careerClusters.roleArchetypes[0],
      params.mappingRulebook.partnerArchetype.primaryTraits[0],
      params.mappingRulebook.incomeBands[0]?.label,
      String(params.scores.overall.score),
      `${Math.round((params.scores.overall.confidence || 0) * 100)}%`,
    ]

    const primaryTraitLine =
      params.lang === 'ko'
        ? `?? ??: ${params.mappingRulebook.partnerArchetype.primaryTraits.join(', ')} / ??: ${params.mappingRulebook.partnerArchetype.supportTraits.join(', ')}`
        : `Primary traits: ${params.mappingRulebook.partnerArchetype.primaryTraits.join(', ')} / support: ${params.mappingRulebook.partnerArchetype.supportTraits.join(', ')}`

    const partnerVibeLine =
      params.lang === 'ko'
        ? `???/???: ${params.mappingRulebook.partnerArchetype.vibe.slice(0, 3).join(', ')} / ${params.mappingRulebook.partnerArchetype.style.slice(0, 3).join(', ')}`
        : `Vibe/style: ${params.mappingRulebook.partnerArchetype.vibe.slice(0, 3).join(', ')} / ${params.mappingRulebook.partnerArchetype.style.slice(0, 3).join(', ')}`

    const partnerChannelLine =
      params.lang === 'ko'
        ? `?? ?? Top3: ${params.mappingRulebook.partnerArchetype.meetChannels.slice(0, 3).join(', ')}`
        : `Top channels: ${params.mappingRulebook.partnerArchetype.meetChannels.slice(0, 3).join(', ')}`

    const partnerClueLine =
      params.lang === 'ko'
        ? `??? ??: ${params.mappingRulebook.partnerArchetype.recognitionClues.slice(0, 3).join(', ')}`
        : `Recognition clues: ${params.mappingRulebook.partnerArchetype.recognitionClues.slice(0, 3).join(', ')}`

    const roleLine =
      params.lang === 'ko'
        ? `?? ????: ${params.mappingRulebook.careerClusters.roleArchetypes.slice(0, 3).join(', ')}`
        : `Role archetypes: ${params.mappingRulebook.careerClusters.roleArchetypes.slice(0, 3).join(', ')}`

    const industryLine =
      params.lang === 'ko'
        ? `??/?? Top5: ${params.mappingRulebook.careerClusters.industryClusters.slice(0, 5).join(', ')}`
        : `Industry clusters Top5: ${params.mappingRulebook.careerClusters.industryClusters.slice(0, 5).join(', ')}`

    let block1Bullets: string[] = []
    let block2Bullets: string[] = []
    let block3Bullets: string[] = []

    if (sectionKey === 'introduction') {
      block1Bullets = [
        params.lang === 'ko'
          ? `?? ${params.scores.overall.score}?, ?? ${Math.round((params.scores.overall.confidence || 0) * 100)}% ???? ??? ?????.`
          : `Start with score ${params.scores.overall.score} and confidence ${Math.round((params.scores.overall.confidence || 0) * 100)}%.`,
        ...(claim?.text ? [claim.text] : []),
      ]
      block2Bullets = [
        params.lang === 'ko'
          ? `?? ???: ${topDomainScores.join(' / ')}`
          : `Top domains: ${topDomainScores.join(' / ')}`,
        ...signalSummaries.map((summary) =>
          params.lang === 'ko'
            ? `${summary} ??? ????? ?????.`
            : `${summary} signal compresses priorities.`
        ),
      ]
      block3Bullets = [
        ...scenarioLines,
        ...(turningEvents.length > 0
          ? [
              params.lang === 'ko'
                ? `??? Top: ${turningEvents.join(' / ')}`
                : `Top turning points: ${turningEvents.join(' / ')}`,
            ]
          : []),
      ]
    } else if (sectionKey === 'personalityDeep') {
      block1Bullets = [
        params.lang === 'ko'
          ? `?? ??? ?? ${params.matrixInput?.dayMasterElement || '-'} + ?? ?? ${params.matrixInput?.dominantWesternElement || '-'} ???? ?????.`
          : `Core temperament is read from day master ${params.matrixInput?.dayMasterElement || '-'} + dominant element ${params.matrixInput?.dominantWesternElement || '-'}.`,
        ...(claim?.text ? [claim.text] : []),
      ]
      block2Bullets = signalSummaries.length
        ? signalSummaries.map((summary) =>
            params.lang === 'ko'
              ? `${summary} ??? ?? ??? ?? ??? ?? ?????.`
              : `${summary} pattern co-determines speed and verification depth.`
          )
        : [
            params.lang === 'ko'
              ? '?? ?? ??? ?? ?? ?? ???? ?????.'
              : 'Personality signal density is low; routine-first mode is used.',
          ]
      block3Bullets = [
        params.lang === 'ko'
          ? '?? ??: ?? 1? + ?? 1? + ??? 1?.'
          : 'Execution rule: one-line conclusion + one-line evidence + one recheck.',
        ...(topLifeEvents.length > 0
          ? [
              params.lang === 'ko'
                ? `?? ??: ${topLifeEvents.join(' / ')}`
                : `Life-stage flow: ${topLifeEvents.join(' / ')}`,
            ]
          : []),
      ]
    } else if (sectionKey === 'careerPath') {
      block1Bullets = [roleLine, industryLine, ...(claim?.text ? [claim.text] : [])]
      block2Bullets =
        countryLines.length > 0
          ? countryLines
          : [
              params.lang === 'ko'
                ? '?? ??? ???? ??? ??-?? ?? ???? ?????.'
                : 'Country-fit data is limited; role/cluster-first strategy is used.',
            ]
      block3Bullets = [
        ...scenarioLines,
        ...(relevantEvents.slice(0, 3).length > 0
          ? [
              params.lang === 'ko'
                ? `??? ???: ${relevantEvents
                    .slice(0, 3)
                    .map((event) => formatTimelineEventLine(params.lang, event))
                    .join(' / ')}`
                : `Career events: ${relevantEvents
                    .slice(0, 3)
                    .map((event) => formatTimelineEventLine(params.lang, event))
                    .join(' / ')}`,
            ]
          : []),
      ]
    } else if (sectionKey === 'relationshipDynamics') {
      block1Bullets = [primaryTraitLine, partnerVibeLine, ...(claim?.text ? [claim.text] : [])]
      block2Bullets = [partnerChannelLine, partnerClueLine]
      block3Bullets = [
        ...scenarioLines,
        ...(relevantEvents.slice(0, 3).length > 0
          ? [
              params.lang === 'ko'
                ? `?? ????: ${relevantEvents
                    .slice(0, 3)
                    .map((event) => formatTimelineEventLine(params.lang, event))
                    .join(' / ')}`
                : `Relationship timeline: ${relevantEvents
                    .slice(0, 3)
                    .map((event) => formatTimelineEventLine(params.lang, event))
                    .join(' / ')}`,
            ]
          : []),
      ]
    } else if (sectionKey === 'wealthPotential') {
      block1Bullets = [
        ...(claim?.text ? [claim.text] : []),
        ...(incomeBandLines.length > 0
          ? [
              params.lang === 'ko'
                ? `?? ??: ${incomeBandLines.join(' / ')}`
                : `Income bands: ${incomeBandLines.join(' / ')}`,
            ]
          : []),
      ]
      block2Bullets = signalSummaries.length
        ? signalSummaries.map((summary) =>
            params.lang === 'ko'
              ? `${summary} ??? ???? ??/?? ??? ?????.`
              : `Use ${summary} evidence to split upside/downside conditions.`
          )
        : [
            params.lang === 'ko'
              ? '?? ?? ??? ?? ??? ?? ??? ?? ?????.'
              : 'Wealth signal density is low; defense band is prioritized.',
          ]
      block3Bullets = [...scenarioLines]
    } else if (sectionKey === 'timingAdvice') {
      block1Bullets = [
        params.lang === 'ko'
          ? `??? ???: ${params.timeWindow.scope} (${params.timeWindow.start || '-'} ~ ${params.timeWindow.end || '-'})`
          : `Report scope: ${params.timeWindow.scope} (${params.timeWindow.start || '-'} ~ ${params.timeWindow.end || '-'})`,
        ...(claim?.text ? [claim.text] : []),
      ]
      block2Bullets =
        topLifeEvents.length > 0
          ? [
              params.lang === 'ko'
                ? `?? ?? ??: ${topLifeEvents.join(' / ')}`
                : `Life chapter summary: ${topLifeEvents.join(' / ')}`,
            ]
          : [
              params.lang === 'ko'
                ? '?? ?? ???? ??? ?? ???? ???? ?????.'
                : 'Life chapter data is limited; use current timeline events.',
            ]
      block3Bullets = turningEvents.length
        ? [
            params.lang === 'ko'
              ? `??? Top: ${turningEvents.join(' / ')}`
              : `Top turning points: ${turningEvents.join(' / ')}`,
            ...scenarioLines,
          ]
        : [...scenarioLines]
    } else if (sectionKey === 'actionPlan') {
      block1Bullets = [
        params.lang === 'ko'
          ? '2? ?? 3??: ?? 1? ?? -> ??? 1? -> ??/?? ??.'
          : 'Two-week loop: one completion -> one recheck -> split defer/commit.',
        ...(claim?.text ? [claim.text] : []),
      ]
      block2Bullets = [
        params.lang === 'ko'
          ? `?? ????: ${topDomainScores.join(' / ')}`
          : `Execution priority: ${topDomainScores.join(' / ')}`,
      ]
      block3Bullets = [
        ...scenarioLines,
        params.lang === 'ko'
          ? 'KPI: ???, ??? ???, ?? ???? ?? ?????.'
          : 'KPI: completion rate, recheck miss rate, and schedule delay rate.',
      ]
    } else if (sectionKey === 'lifeMission') {
      block1Bullets = [
        ...(claim?.text ? [claim.text] : []),
        params.lang === 'ko'
          ? '?? ??? ?? ???? ?? ??? ?? ??? ??? ? ????.'
          : 'The long mission is to leave repeatable decision criteria, not one-off wins.',
      ]
      block2Bullets = signalSummaries.length
        ? signalSummaries.map((summary) =>
            params.lang === 'ko'
              ? `${summary} ??? ??/?? ??? ????.`
              : `${summary} signal sets expand/reduce criteria.`
          )
        : [
            params.lang === 'ko'
              ? '?? ??? ??? ??/??/??? ?? ??? ?????.'
              : 'With limited signals, prioritize health/relationship/career balance.',
          ]
      block3Bullets = [...scenarioLines]
    } else if (sectionKey === 'conclusion') {
      block1Bullets = [
        params.lang === 'ko'
          ? `?? ??: ?? ${params.scores.overall.score}?, ?? ${Math.round((params.scores.overall.confidence || 0) * 100)}%`
          : `Final view: score ${params.scores.overall.score}, confidence ${Math.round((params.scores.overall.confidence || 0) * 100)}%`,
        ...(claim?.text ? [claim.text] : []),
      ]
      block2Bullets = [
        params.lang === 'ko'
          ? `?? ???: ${topDomainScores.join(' / ')}`
          : `Core axes to keep: ${topDomainScores.join(' / ')}`,
      ]
      block3Bullets = [...scenarioLines]
    } else {
      block1Bullets = [
        claim?.text ||
          (params.lang === 'ko'
            ? '?? ??? ???? ????? ?????.'
            : 'Lock priorities first using core signals.'),
      ]
      block2Bullets =
        signalSummaries.length > 0
          ? signalSummaries.map((summary) =>
              params.lang === 'ko'
                ? `${summary} ??? ??? ?? ??? ?????.`
                : `Calibrate decision intensity with ${summary} as evidence.`
            )
          : [
              params.lang === 'ko'
                ? '?? ?? ??? ?? ???? ?? ??? ????.'
                : 'Check evidence density first, then set conclusion strength.',
            ]
      block3Bullets = [...eventLines, ...scenarioHint]
        .slice(0, 3)
        .map((line) =>
          params.lang === 'ko'
            ? `${line} ?? ? ??? ? ?? ??? ?????.`
            : `${line} Keep verify-then-commit ordering during execution.`
        )
      if (block3Bullets.length === 0) {
        block3Bullets = [
          params.lang === 'ko'
            ? '??? ??-???-??? 3??? ??? ???? ????.'
            : 'Split execution into start-recheck-commit to reduce variance.',
        ]
      }
    }

    const blocks: DeterministicSectionBlock[] = [
      {
        blockId: `${sectionPath}.B1`,
        paraId: `${sectionPath}.p1`,
        heading: sectionHeading(params.lang, sectionPath, 1),
        bullets: block1Bullets.filter(Boolean),
        mustKeepTokens: extractMustKeepTokens(claim?.text, ...block1Bullets, ...mappingTokens),
        evidence: para1,
      },
      {
        blockId: `${sectionPath}.B2`,
        paraId: `${sectionPath}.p2`,
        heading: sectionHeading(params.lang, sectionPath, 2),
        bullets: block2Bullets.filter(Boolean),
        mustKeepTokens: extractMustKeepTokens(...signalSummaries, ...block2Bullets, claim?.text),
        evidence: para2,
      },
      {
        blockId: `${sectionPath}.B3`,
        paraId: `${sectionPath}.p3`,
        heading: sectionHeading(params.lang, sectionPath, 3),
        bullets: block3Bullets.filter(Boolean),
        mustKeepTokens: extractMustKeepTokens(
          ...eventLines,
          ...scenarioHint,
          ...block3Bullets,
          ...mappingTokens
        ),
        evidence: para3,
      },
    ]

    blocksBySection[sectionPath] = blocks
  }

  return blocksBySection
}





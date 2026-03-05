import type { FusionReport, InsightDomain } from '../interpreter/types'
import type { MatrixHighlight, MatrixSummary } from '../types'
import { getDomainSemantic, getLayerMeaning } from './matrixOntology'

export type SignalPolarity = 'strength' | 'balance' | 'caution'

export type SignalDomain = InsightDomain | 'relationship' | 'wealth' | 'move'

export interface NormalizedSignal {
  id: string
  layer: number
  rowKey: string
  colKey: string
  domainHints: SignalDomain[]
  polarity: SignalPolarity
  score: number
  rankScore: number
  keyword: string
  sajuBasis?: string
  astroBasis?: string
  advice?: string
  tags: string[]
  semantic?: {
    layerMeaningKo: string
    layerMeaningEn: string
    focusKo: string
    focusEn: string
    riskKo: string
    riskEn: string
  }
}

export interface SynthesizedClaim {
  claimId: string
  domain: SignalDomain
  thesis: string
  evidence: string[]
  riskControl: string
  actions: string[]
}

export interface SignalSynthesisResult {
  normalizedSignals: NormalizedSignal[]
  selectedSignals: NormalizedSignal[]
  claims: SynthesizedClaim[]
  signalsById: Record<string, NormalizedSignal>
}

interface SynthesisInput {
  lang: 'ko' | 'en'
  matrixReport: FusionReport
  matrixSummary?: MatrixSummary
}

const REQUIRED_CORE_DOMAINS: SignalDomain[] = ['career', 'wealth']
const CLAIM_DOMAIN_PRIORITY: Record<SignalDomain, number> = {
  career: 1,
  wealth: 2,
  relationship: 3,
  health: 4,
  timing: 5,
  personality: 6,
  spirituality: 7,
  move: 8,
}

const K_WORD_PYEONJAE = '\uD3B8\uC7AC'
const K_WORD_JEONGJAE = '\uC815\uC7AC'
const K_WORD_MONEY = '\uC7AC\uBB3C'
const K_WORD_JONGGYEOL = '\uC885\uACB0'
const K_WORD_PAGOE = '\uD30C\uAD34'
const K_WORD_IBYEOL = '\uC774\uBCC4'
const K_WORD_PAMYEOL = '\uD30C\uBA78'

const FEAR_WORD_REPLACEMENTS: Array<[RegExp, string, string]> = [
  [new RegExp(K_WORD_JONGGYEOL, 'gi'), '\uC7AC\uC815\uC758', 'redefinition'],
  [new RegExp(K_WORD_PAGOE, 'gi'), '\uAD6C\uC870 \uC870\uC815', 'structural adjustment'],
  [new RegExp(K_WORD_IBYEOL, 'gi'), '\uAC70\uB9AC \uC870\uC808', 'distance tuning'],
  [new RegExp(K_WORD_PAMYEOL, 'gi'), '\uB9AC\uC14B', 'reset'],
  [/catastrophe|doom|collapse|destroy/gi, '\uB9AC\uC2A4\uD06C \uAD00\uB9AC', 'risk control'],
]

const SECTION_DOMAIN_MAP: Record<string, SignalDomain[]> = {
  introduction: ['personality', 'timing'],
  personalityDeep: ['personality'],
  careerPath: ['career', 'wealth'],
  relationshipDynamics: ['relationship'],
  wealthPotential: ['wealth', 'career'],
  healthGuidance: ['health'],
  lifeMission: ['spirituality', 'personality'],
  timingAdvice: ['timing'],
  actionPlan: ['career', 'relationship', 'wealth', 'health', 'timing'],
  conclusion: ['personality', 'timing'],
}

function toLower(value: string): string {
  return String(value || '').toLowerCase()
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)]
}

function splitTags(source: string): string[] {
  return source
    .split(/[^\p{L}\p{N}_:+-]+/u)
    .map((v) => v.trim())
    .filter(Boolean)
}

function inferDomainsFromText(raw: string): SignalDomain[] {
  const text = toLower(raw)
  const domains = new Set<SignalDomain>()
  if (/h10|jupiter|mc|career|work|job|promotion/.test(text)) domains.add('career')
  if (/h7|venus|mars|love|romance|relationship|partner/.test(text)) domains.add('relationship')
  if (/h6|health|stress|saturn|moon|routine|fatigue/.test(text)) domains.add('health')
  if (/h4|h9|h12|move|travel|relocat|foreign|abroad/.test(text)) domains.add('move')
  if (new RegExp(`${K_WORD_PYEONJAE}|${K_WORD_JEONGJAE}|${K_WORD_MONEY}`).test(raw)) {
    domains.add('wealth')
  }
  if (/wealth|money|finance|budget|cash|asset|saturn|jupiter/.test(text)) {
    if (/wealth|money|finance|budget|cash|asset/.test(text)) domains.add('wealth')
  }
  if (/timing|transit|daeun|seun|wolun|ilun|iljin/.test(text)) domains.add('timing')
  if (/personality|identity|self|h1|saturn/.test(text)) domains.add('personality')
  if (/spiritual|mission|purpose|node|chiron/.test(text)) domains.add('spirituality')
  return [...domains]
}

function fallbackDomainsByLayer(layer: number): SignalDomain[] {
  if (layer === 4) return ['timing']
  if (layer === 6) return ['career', 'relationship']
  if (layer === 3) return ['career', 'relationship', 'wealth']
  if (layer === 5) return ['relationship']
  if (layer === 7 || layer === 10) return ['spirituality', 'personality']
  return ['personality']
}

function sanitizeFearWords(text: string, lang: 'ko' | 'en'): string {
  let out = text || ''
  for (const [regex, koValue, enValue] of FEAR_WORD_REPLACEMENTS) {
    out = out.replace(regex, lang === 'ko' ? koValue : enValue)
  }
  return out
}

function normalizeHighlight(
  point: MatrixHighlight,
  polarity: SignalPolarity,
  lang: 'ko' | 'en'
): NormalizedSignal {
  const keyword = point.cell.interaction.keyword || point.cell.interaction.keywordEn || ''
  const tags = uniq(
    [
      ...splitTags(point.rowKey),
      ...splitTags(point.colKey),
      ...splitTags(keyword),
      ...splitTags(point.cell.sajuBasis || ''),
      ...splitTags(point.cell.astroBasis || ''),
    ].filter(Boolean)
  )
  const domainHints = uniq([
    ...inferDomainsFromText(
      [point.rowKey, point.colKey, keyword, point.cell.sajuBasis, point.cell.astroBasis]
        .filter(Boolean)
        .join(' ')
    ),
    ...fallbackDomainsByLayer(point.layer),
  ])
  const semanticDomain = (domainHints[0] || 'personality') as SignalDomain
  const semantic = getDomainSemantic(point.layer, semanticDomain)
  const score = Number(point.cell.interaction.score || 0)
  const rankScore = polarity === 'caution' ? 11 - score : score
  return {
    id: `L${point.layer}:${point.rowKey}:${point.colKey}`,
    layer: point.layer,
    rowKey: point.rowKey,
    colKey: point.colKey,
    domainHints,
    polarity,
    score,
    rankScore,
    keyword,
    sajuBasis: point.cell.sajuBasis,
    astroBasis: point.cell.astroBasis,
    advice: sanitizeFearWords(point.cell.advice || '', lang),
    tags,
    semantic: {
      layerMeaningKo: getLayerMeaning(point.layer, 'ko'),
      layerMeaningEn: getLayerMeaning(point.layer, 'en'),
      focusKo: semantic.focusKo,
      focusEn: semantic.focusEn,
      riskKo: semantic.riskKo,
      riskEn: semantic.riskEn,
    },
  }
}

function toPolarityFromCategory(category: string): SignalPolarity {
  if (category === 'strength' || category === 'opportunity') return 'strength'
  if (category === 'balance') return 'balance'
  return 'caution'
}

function normalizeFromTopInsights(report: FusionReport): NormalizedSignal[] {
  return (report.topInsights || []).map((insight, index) => {
    const polarity = toPolarityFromCategory(insight.category)
    const score = Number(insight.score || insight.weightedScore || 0)
    const rankScore = polarity === 'caution' ? 101 - score : score
    const domain = (insight.domain as SignalDomain) || 'personality'
    const semantic = getDomainSemantic(0, domain)
    return {
      id: `I${index}:${insight.id || insight.title}`,
      layer: 0,
      rowKey: insight.domain || 'personality',
      colKey: insight.category,
      domainHints: [domain],
      polarity,
      score,
      rankScore,
      keyword: insight.title || insight.description || '',
      sajuBasis: insight.sources?.[0]?.sajuFactor,
      astroBasis: insight.sources?.[0]?.astroFactor,
      advice: insight.actionItems?.[0]?.text,
      tags: uniq(splitTags(`${insight.title} ${insight.description || ''}`)),
      semantic: {
        layerMeaningKo: getLayerMeaning(0, 'ko'),
        layerMeaningEn: getLayerMeaning(0, 'en'),
        focusKo: semantic.focusKo,
        focusEn: semantic.focusEn,
        riskKo: semantic.riskKo,
        riskEn: semantic.riskEn,
      },
    }
  })
}

function dedupeSignals(list: NormalizedSignal[]): NormalizedSignal[] {
  const seen = new Set<string>()
  const out: NormalizedSignal[] = []
  for (const signal of list) {
    const dedupeKey = `L${signal.layer}:${signal.rowKey}:${signal.colKey}:${signal.polarity}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    out.push(signal)
  }
  return out
}

function primaryDomain(signal: NormalizedSignal): SignalDomain {
  return (signal.domainHints[0] || 'personality') as SignalDomain
}

function hasDomain(signal: NormalizedSignal, domain: SignalDomain): boolean {
  return (signal.domainHints || []).includes(domain)
}

function claimDomains(signal: NormalizedSignal): SignalDomain[] {
  const hints = uniq((signal.domainHints || []).filter(Boolean)) as SignalDomain[]
  if (hints.length === 0) return ['personality']

  const sorted = [...hints].sort(
    (a, b) => (CLAIM_DOMAIN_PRIORITY[a] || 99) - (CLAIM_DOMAIN_PRIORITY[b] || 99)
  )
  const core = sorted.filter(
    (domain) => CLAIM_DOMAIN_PRIORITY[domain] <= CLAIM_DOMAIN_PRIORITY.timing
  )
  if (core.length > 0) return core.slice(0, 2)
  return sorted.slice(0, 1)
}

function pickByQuota(
  candidates: NormalizedSignal[],
  quota: number,
  selected: NormalizedSignal[]
): NormalizedSignal[] {
  for (const signal of candidates.sort((a, b) => b.rankScore - a.rankScore)) {
    if (selected.some((s) => s.id === signal.id)) continue
    selected.push(signal)
    if (selected.filter((s) => s.polarity === signal.polarity).length >= quota) break
  }
  return selected
}

function ensureDomainDiversity(
  selected: NormalizedSignal[],
  bench: NormalizedSignal[],
  minDomains = 3,
  protectedDomains: SignalDomain[] = []
): NormalizedSignal[] {
  const result = [...selected]
  const distinct = () => new Set(result.map((s) => primaryDomain(s))).size
  while (distinct() < minDomains) {
    const candidate = bench.find(
      (item) =>
        !result.some((s) => s.id === item.id) &&
        !result.some((s) => primaryDomain(s) === primaryDomain(item))
    )
    if (!candidate) break
    const domainCounts = result.reduce<Record<string, number>>((acc, cur) => {
      const key = primaryDomain(cur)
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    const removable = result
      .filter(
        (signal) =>
          signal.polarity === candidate.polarity &&
          (domainCounts[primaryDomain(signal)] || 0) > 1 &&
          !protectedDomains.some((domain) => hasDomain(signal, domain))
      )
      .sort((a, b) => a.rankScore - b.rankScore)[0]
    if (!removable) break
    const idx = result.findIndex((s) => s.id === removable.id)
    result[idx] = candidate
  }
  return result
}

function ensureRequiredDomainCoverage(
  selected: NormalizedSignal[],
  bench: NormalizedSignal[],
  requiredDomains: SignalDomain[]
): NormalizedSignal[] {
  const result = [...selected]
  for (const domain of requiredDomains) {
    if (result.some((signal) => hasDomain(signal, domain))) continue
    const candidate = bench.find(
      (signal) => !result.some((picked) => picked.id === signal.id) && hasDomain(signal, domain)
    )
    if (!candidate) continue

    const removable =
      result
        .filter(
          (signal) =>
            signal.polarity === candidate.polarity &&
            !requiredDomains.some((required) => hasDomain(signal, required))
        )
        .sort((a, b) => a.rankScore - b.rankScore)[0] ||
      result
        .filter((signal) => !requiredDomains.some((required) => hasDomain(signal, required)))
        .sort((a, b) => a.rankScore - b.rankScore)[0]

    if (!removable) continue
    const idx = result.findIndex((signal) => signal.id === removable.id)
    if (idx >= 0) result[idx] = candidate
  }
  return result
}

function riskControlByDomain(domain: SignalDomain, lang: 'ko' | 'en'): string {
  const ko: Record<SignalDomain, string> = {
    career:
      '\uACB0\uC815\uC740 \uBD84\uD560\uD558\uACE0 \uC5ED\uD560\u00B7\uAE30\uD55C\u00B7\uCC45\uC784\uC744 \uBB38\uC11C\uB85C \uACE0\uC815\uD558\uC138\uC694.',
    relationship:
      '\uAC10\uC815 \uC18D\uB3C4\uBCF4\uB2E4 \uD655\uC778 \uC9C8\uBB38\uC744 \uBA3C\uC800 \uB193\uACE0 \uD574\uC11D \uC624\uCC28\uB97C \uC904\uC774\uC138\uC694.',
    wealth:
      '\uD655\uC815 \uC804\uC5D0 \uAE08\uC561\u00B7\uAE30\uD55C\u00B7\uCDE8\uC18C \uC870\uAC74\uC744 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8\uB85C \uC7AC\uD655\uC778\uD558\uC138\uC694.',
    health:
      '\uACFC\uC18D\uBCF4\uB2E4 \uC218\uBA74\u00B7\uC218\uBD84\u00B7\uD68C\uBCF5 \uC2DC\uAC04\uC744 \uBA3C\uC800 \uACE0\uC815\uD558\uC5EC \uC2E4\uC218 \uBE44\uC6A9\uC744 \uC904\uC774\uC138\uC694.',
    move: '\uC774\uB3D9\u00B7\uBCC0\uD654\uB294 \uD55C \uBC88\uC5D0 \uD655\uC815\uD558\uC9C0 \uB9D0\uACE0 \uB2E8\uACC4 \uBCC4\uB85C \uC791\uAC8C \uAC80\uC99D\uD558\uC138\uC694.',
    personality:
      '\uD310\uB2E8 \uC2DC\uC810\uACFC \uC2E4\uD589 \uC2DC\uC810\uC744 \uBD84\uB9AC\uD558\uBA74 \uC624\uD310 \uBC0F \uB204\uB77D \uB9AC\uC2A4\uD06C\uAC00 \uC904\uC5B4\uB4ED\uB2C8\uB2E4.',
    spirituality:
      '\uD070 \uC120\uC5B8\uBCF4\uB2E4 \uC8FC\uAC04 \uAE30\uB85D\uACFC \uBCF5\uAE30 \uB8E8\uD2F4\uC73C\uB85C \uC7A5\uAE30 \uBC29\uD5A5\uC744 \uACE0\uC815\uD558\uC138\uC694.',
    timing:
      '\uC2DC\uAE30 \uC2E0\uD638\uAC00 \uD754\uB4E4\uB9AC\uBA74 \uB2F9\uC77C \uD655\uC815\uC744 \uD53C\uD558\uACE0 24\uC2DC\uAC04 \uC7AC\uD655\uC778 \uC2AC\uB86F\uC744 \uB123\uC73C\uC138\uC694.',
  }
  const en: Record<SignalDomain, string> = {
    career: 'Split decisions and lock scope, deadline, and ownership in writing.',
    relationship: 'Prioritize confirmation questions before emotional conclusions.',
    wealth: 'Validate amount, due date, and cancellation clauses before commitment.',
    health: 'Stabilize sleep, hydration, and recovery blocks before pushing volume.',
    move: 'Handle change in staged checkpoints instead of one-shot commitment.',
    personality: 'Separate decision timing from execution timing to reduce mistakes.',
    spirituality: 'Use weekly logs and reflection routines to ground long-term direction.',
    timing: 'If timing signals are mixed, move commitment to a 24h recheck window.',
  }
  return lang === 'ko' ? ko[domain] : en[domain]
}

function conflictThesisByDomain(domain: SignalDomain, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    const ko: Record<SignalDomain, string> = {
      career:
        '커리어는 확장 동력이 크지만 역할·범위 재정의를 함께 해야 손실 없이 성장합니다. 두 신호는 상충이 아니라 조건이 다른 분기 신호입니다.',
      relationship:
        '관계는 진전 신호와 긴장 신호가 동시에 작동합니다. 두 신호는 상충이 아니라 속도와 확인 단계를 분리하라는 조건 신호입니다.',
      wealth:
        '재정은 수익 기회와 변동 리스크가 동시에 열려 있습니다. 두 신호는 상충이 아니라 확정 전에 조건 검증을 요구하는 분기 신호입니다.',
      health:
        '건강은 퍼포먼스 상승과 피로 누적 신호가 함께 나타납니다. 두 신호는 상충이 아니라 회복 블록을 선행하라는 조건 신호입니다.',
      move: '이동·변화는 기회와 불확실성이 동시에 큽니다. 두 신호는 상충이 아니라 단계별 검증을 요구하는 분기 신호입니다.',
      personality:
        '성향 축에서는 추진력과 과속 리스크가 동시에 나타납니다. 두 신호는 상충이 아니라 판단과 실행 시점을 분리하라는 조건 신호입니다.',
      spirituality:
        '장기 방향은 확장 욕구와 재정렬 요구가 동시에 있습니다. 두 신호는 상충이 아니라 우선순위를 재정의하라는 조건 신호입니다.',
      timing:
        '시기 축에서는 기회 창과 주의 창이 동시에 열립니다. 두 신호는 상충이 아니라 결정과 확정을 분리하라는 조건 신호입니다.',
    }
    return ko[domain]
  }

  const en: Record<SignalDomain, string> = {
    career:
      'Career has expansion momentum and reset pressure at the same time. These are conditional branch signals, not contradictions.',
    relationship:
      'Relationship shows progress and tension together. These are conditional branch signals that require pace-control and explicit confirmation.',
    wealth:
      'Wealth shows upside and volatility together. These are conditional branch signals that require term-check before commitment.',
    health:
      'Health shows performance upside with fatigue pressure. These are conditional branch signals that require recovery-first execution.',
    move: 'Move/change has opportunity and uncertainty together. These are branch signals that require staged validation.',
    personality:
      'Personality axis shows drive and overspeed risk together. These are branch signals that require separating decision and execution timing.',
    spirituality:
      'Long-term direction has expansion pull and reset demand together. These are branch signals that require priority redefinition.',
    timing:
      'Timing has opportunity windows and caution windows together. These are branch signals, not contradictions.',
  }
  return en[domain]
}

function buildClaim(domain: SignalDomain, signals: NormalizedSignal[], lang: 'ko' | 'en') {
  const orderedSignals = [...signals].sort((a, b) => b.rankScore - a.rankScore)
  const hasStrength = signals.some((s) => s.polarity === 'strength')
  const hasCaution = signals.some((s) => s.polarity === 'caution')
  const hasBalance = signals.some((s) => s.polarity === 'balance')
  let thesis = ''
  if (lang === 'ko') {
    if (hasStrength && hasCaution) {
      thesis = conflictThesisByDomain(domain, lang)
    } else if (hasStrength) {
      thesis =
        '\uD655\uC7A5 \uC2E0\uD638\uAC00 \uC6B0\uC138\uD558\uC5EC \uC2E4\uD589\uB825\uC744 \uC62C\uB9AC\uAE30 \uC88B\uC740 \uAD6C\uAC04\uC785\uB2C8\uB2E4.'
    } else if (hasCaution) {
      thesis =
        '\uC8FC\uC758 \uC2E0\uD638\uAC00 \uBA3C\uC800 \uB4DC\uB7EC\uB098 \uD655\uC815 \uC804 \uC7AC\uD655\uC778\uC774 \uC131\uD328\uB97C \uAC00\uB985\uB2C8\uB2E4.'
    } else if (hasBalance) {
      thesis =
        '\uADDC\uCE59\uACFC \uB9AC\uB4EC\uC744 \uC9C0\uD0A4\uBA74 \uC548\uC815 \uC218\uC775\uC774 \uC313\uC77C \uAD6C\uAC04\uC785\uB2C8\uB2E4.'
    } else {
      thesis =
        '\uD575\uC2EC \uC2E0\uD638\uAC00 \uC791\uC544 \uAE30\uBCF8\uAE30\uB97C \uC9C0\uD0A4\uB294 \uC6B4\uC601\uC774 \uC720\uB9AC\uD569\uB2C8\uB2E4.'
    }
  } else {
    if (hasStrength && hasCaution) thesis = conflictThesisByDomain(domain, lang)
    else if (hasStrength) thesis = 'Expansion signals dominate and execution leverage is high.'
    else if (hasCaution) thesis = 'Caution signals dominate; verify before commitment.'
    else if (hasBalance) thesis = 'Stable routines are the best path in this window.'
    else thesis = 'Signal density is low; keep baseline discipline.'
  }
  const anchor = orderedSignals[0]
  const semanticAddon =
    lang === 'ko'
      ? [
          anchor?.semantic?.layerMeaningKo,
          hasCaution ? anchor?.semantic?.riskKo : anchor?.semantic?.focusKo,
        ]
          .filter(Boolean)
          .slice(0, 2)
          .join(' ')
      : [
          anchor?.semantic?.layerMeaningEn,
          hasCaution ? anchor?.semantic?.riskEn : anchor?.semantic?.focusEn,
        ]
          .filter(Boolean)
          .slice(0, 2)
          .join(' ')
  const thesisWithSemantic = semanticAddon ? `${thesis} ${semanticAddon}`.trim() : thesis
  const claimId = `${domain}_${hasStrength && hasCaution ? 'growth_with_guardrails' : hasStrength ? 'expansion' : hasCaution ? 'risk_control' : 'stability'}`
  const actions = orderedSignals
    .map((s) => s.advice)
    .filter(Boolean)
    .slice(0, 2) as string[]
  return {
    claimId,
    domain,
    thesis: sanitizeFearWords(thesisWithSemantic, lang),
    evidence: orderedSignals.map((s) => s.id),
    riskControl: riskControlByDomain(domain, lang),
    actions: actions.length > 0 ? actions : [riskControlByDomain(domain, lang)],
  } satisfies SynthesizedClaim
}

function buildClaims(selectedSignals: NormalizedSignal[], lang: 'ko' | 'en'): SynthesizedClaim[] {
  const grouped = selectedSignals.reduce<Record<string, NormalizedSignal[]>>((acc, signal) => {
    for (const domain of claimDomains(signal)) {
      if (!acc[domain]) acc[domain] = []
      acc[domain].push(signal)
    }
    return acc
  }, {})
  return Object.entries(grouped)
    .map(([domain, signals]) => buildClaim(domain as SignalDomain, signals, lang))
    .sort((a, b) => {
      if (b.evidence.length !== a.evidence.length) return b.evidence.length - a.evidence.length
      return (CLAIM_DOMAIN_PRIORITY[a.domain] || 99) - (CLAIM_DOMAIN_PRIORITY[b.domain] || 99)
    })
}

function toSignalsById(signals: NormalizedSignal[]): Record<string, NormalizedSignal> {
  return signals.reduce<Record<string, NormalizedSignal>>((acc, signal) => {
    acc[signal.id] = signal
    return acc
  }, {})
}

function selectSevenSignals(signals: NormalizedSignal[]): NormalizedSignal[] {
  const selected: NormalizedSignal[] = []
  const strengths = signals.filter((s) => s.polarity === 'strength')
  const cautions = signals.filter((s) => s.polarity === 'caution')
  const balances = signals.filter((s) => s.polarity === 'balance')
  pickByQuota(strengths, 3, selected)
  pickByQuota(cautions, 2, selected)
  pickByQuota(balances, 2, selected)
  const bench = [...strengths, ...cautions, ...balances].sort((a, b) => b.rankScore - a.rankScore)
  const withDiversity = ensureDomainDiversity(selected, bench, 3, REQUIRED_CORE_DOMAINS)
  const withRequiredDomains = ensureRequiredDomainCoverage(
    withDiversity,
    bench,
    REQUIRED_CORE_DOMAINS
  )
  return ensureDomainDiversity(withRequiredDomains, bench, 3, REQUIRED_CORE_DOMAINS)
}

export function getDomainsForSection(sectionKey: string): SignalDomain[] {
  return SECTION_DOMAIN_MAP[sectionKey] || ['personality']
}

export function synthesizeMatrixSignals(input: SynthesisInput): SignalSynthesisResult {
  const summary = input.matrixSummary
  const fromSummary: NormalizedSignal[] = [
    ...((summary?.strengthPoints || []).map((point) =>
      normalizeHighlight(point, 'strength', input.lang)
    ) || []),
    ...((summary?.cautionPoints || []).map((point) =>
      normalizeHighlight(point, 'caution', input.lang)
    ) || []),
    ...((summary?.balancePoints || []).map((point) =>
      normalizeHighlight(point, 'balance', input.lang)
    ) || []),
  ]
  const fromTopInsights = normalizeFromTopInsights(input.matrixReport)
  const normalizedSignals = dedupeSignals(
    fromSummary.length > 0 ? [...fromSummary, ...fromTopInsights] : fromTopInsights
  )
  const selectedSignals = selectSevenSignals(normalizedSignals)
  const claims = buildClaims(selectedSignals, input.lang)
  return {
    normalizedSignals,
    selectedSignals,
    claims,
    signalsById: toSignalsById(normalizedSignals),
  }
}

export function buildSynthesisFactsForSection(
  synthesis: SignalSynthesisResult | undefined,
  sectionKey: string,
  lang: 'ko' | 'en'
): string[] {
  if (!synthesis || synthesis.claims.length === 0) return []
  const domains = getDomainsForSection(sectionKey)
  const claims = synthesis.claims.filter((claim) => domains.includes(claim.domain)).slice(0, 2)
  if (claims.length === 0) return []

  const lines: string[] = []
  for (const claim of claims) {
    lines.push(claim.thesis)
    lines.push(claim.riskControl)
    const evidenceSignals = claim.evidence
      .map((id) => synthesis.signalsById[id])
      .filter(Boolean)
      .slice(0, 2)
    for (const signal of evidenceSignals) {
      if (lang === 'ko') {
        lines.push(
          `\uADFC\uAC70 ${signal.id}: ${signal.keyword || signal.rowKey} (${signal.sajuBasis || 'saju basis pending'} / ${signal.astroBasis || 'astro basis pending'})`
        )
      } else {
        lines.push(
          `Evidence ${signal.id}: ${signal.keyword || signal.rowKey} (${signal.sajuBasis || 'saju basis pending'} / ${signal.astroBasis || 'astro basis pending'})`
        )
      }
    }
  }
  return uniq(lines)
}

import type { ReportTheme } from './types'
import type { ReportEvidenceRef, SectionEvidenceRefs } from './evidenceRefs'
import type { SignalDomain, SignalSynthesisResult } from './signalSynthesizer'
import { THEME_DOMAIN_ONTOLOGY } from './matrixOntology'

const EVIDENCE_TOKEN_STOP_WORDS = new Set([
  '그리고',
  '하지만',
  '에서',
  '으로',
  '입니다',
  '합니다',
  '흐름',
  '현재',
  '기질',
  '성향',
  '기준',
  'signal',
  'signals',
  'with',
  'from',
  'this',
  'that',
  'the',
  'and',
  'for',
  'your',
])

const EVIDENCE_DOMAIN_PRIORITY = [
  'career',
  'wealth',
  'relationship',
  'health',
  'timing',
  'personality',
  'spirituality',
  'move',
] as const

export const MIN_EVIDENCE_REFS_PER_SECTION = 2

const GLOBAL_EVIDENCE_DOMAINS: SignalDomain[] = [
  'career',
  'relationship',
  'wealth',
  'health',
  'timing',
  'personality',
  'spirituality',
  'move',
]

export type ReportEvidenceSupportDeps = {
  comprehensiveSectionKeys: string[]
  getDomainsForSection: (path: string) => string[]
  getPathText: (sections: Record<string, unknown>, path: string) => string
  setPathText: (sections: Record<string, unknown>, path: string, value: string) => void
  buildReportCoreLine: (text: string, lang: 'ko' | 'en') => string
  normalizeNarrativeCoreText: (text: string, lang: 'ko' | 'en') => string
}

function compactToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim()
}

function tokenizeEvidenceText(value?: string): string[] {
  if (!value) return []
  return value
    .split(/[^\p{L}\p{N}_:]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .map((token) => compactToken(token))
    .filter((token) => token.length >= 2 && !EVIDENCE_TOKEN_STOP_WORDS.has(token))
}

export function resolveSignalDomain(
  domainHints: string[] | undefined,
  preferredDomains?: Set<SignalDomain>
): SignalDomain {
  const hints = (domainHints || []).filter(Boolean)
  if (hints.length === 0) return 'personality'
  if (preferredDomains) {
    const direct = hints.find((domain): domain is SignalDomain =>
      preferredDomains.has(domain as SignalDomain)
    )
    if (direct) return direct
  }
  const sorted = [...new Set(hints)].sort((a, b) => {
    const ai = EVIDENCE_DOMAIN_PRIORITY.indexOf(a as (typeof EVIDENCE_DOMAIN_PRIORITY)[number])
    const bi = EVIDENCE_DOMAIN_PRIORITY.indexOf(b as (typeof EVIDENCE_DOMAIN_PRIORITY)[number])
    return (ai >= 0 ? ai : 99) - (bi >= 0 ? bi : 99)
  })
  return (sorted[0] as SignalDomain | undefined) || 'personality'
}

function toEvidenceRef(
  signal: NonNullable<SignalSynthesisResult>['selectedSignals'][number],
  preferredDomains?: Set<SignalDomain>
): ReportEvidenceRef {
  return {
    id: signal.id,
    domain: resolveSignalDomain(signal.domainHints, preferredDomains),
    layer: signal.layer,
    rowKey: signal.rowKey,
    colKey: signal.colKey,
    keyword: signal.keyword,
    sajuBasis: signal.sajuBasis,
    astroBasis: signal.astroBasis,
    score: signal.score,
  }
}

function selectEvidenceRefsByDomains(
  synthesis: SignalSynthesisResult | undefined,
  domains: string[],
  limit = 4,
  usedSignalIds?: Set<string>
): ReportEvidenceRef[] {
  if (!synthesis) return []
  const domainSet = new Set(domains as SignalDomain[])
  const claimWeightBySignal = new Map<string, number>()
  for (const claim of synthesis.claims) {
    if (!domainSet.has(claim.domain)) continue
    for (const signalId of claim.evidence) {
      claimWeightBySignal.set(signalId, (claimWeightBySignal.get(signalId) || 0) + 1)
    }
  }

  const candidateById = new Map<
    string,
    {
      signal: NonNullable<SignalSynthesisResult>['selectedSignals'][number]
      overlap: number
      claimWeight: number
      freshness: number
      score: number
    }
  >()

  const pushCandidate = (
    signal: NonNullable<SignalSynthesisResult>['selectedSignals'][number] | undefined,
    baseBoost = 0
  ) => {
    if (!signal) return
    const overlap = (signal.domainHints || []).filter((domain) => domainSet.has(domain)).length
    const claimWeight = claimWeightBySignal.get(signal.id) || 0
    const freshness = usedSignalIds && !usedSignalIds.has(signal.id) ? 1 : 0
    const relevance =
      overlap * 100 + claimWeight * 24 + freshness * 12 + baseBoost + (signal.rankScore || 0)
    const existing = candidateById.get(signal.id)
    if (!existing || relevance > existing.score) {
      candidateById.set(signal.id, {
        signal,
        overlap,
        claimWeight,
        freshness,
        score: relevance,
      })
    }
  }

  for (const signalId of claimWeightBySignal.keys()) {
    pushCandidate(synthesis.signalsById[signalId], 12)
  }
  for (const signal of synthesis.selectedSignals) {
    pushCandidate(signal)
  }
  for (const signal of synthesis.normalizedSignals) {
    if ((signal.domainHints || []).some((domain) => domainSet.has(domain))) {
      pushCandidate(signal)
    }
  }

  const orderedSignals = [...candidateById.values()]
    .sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap
      if (b.claimWeight !== a.claimWeight) return b.claimWeight - a.claimWeight
      if (b.freshness !== a.freshness) return b.freshness - a.freshness
      return b.score - a.score
    })
    .map((item) => item.signal)
  const deduped: ReportEvidenceRef[] = []
  const seen = new Set<string>()
  for (const signal of orderedSignals) {
    if (!signal || seen.has(signal.id)) continue
    seen.add(signal.id)
    deduped.push(toEvidenceRef(signal, domainSet))
    if (usedSignalIds) usedSignalIds.add(signal.id)
    if (deduped.length >= limit) break
  }
  return deduped
}

function getTimingPathDomains(path: string): string[] {
  if (path === 'domains.career') return ['career']
  if (path === 'domains.love') return ['relationship']
  if (path === 'domains.wealth') return ['wealth']
  if (path === 'domains.health') return ['health']
  if (path === 'luckyElements') return ['timing', 'personality']
  return ['timing', 'career', 'relationship', 'wealth', 'health']
}

function getThemedPathDomains(theme: ReportTheme, path: string): string[] {
  const profile = THEME_DOMAIN_ONTOLOGY[theme] || THEME_DOMAIN_ONTOLOGY.family
  if (path === 'timing' || path === 'riskWindows') return [...profile.timing]
  return [...profile.primary, ...profile.support]
}

function mergeEvidenceRefs(
  base: ReportEvidenceRef[],
  incoming: ReportEvidenceRef[],
  limit = 4
): ReportEvidenceRef[] {
  const merged = [...base]
  const seen = new Set(base.map((ref) => ref.id))
  for (const ref of incoming) {
    if (!ref?.id || seen.has(ref.id)) continue
    seen.add(ref.id)
    merged.push(ref)
    if (merged.length >= limit) break
  }
  return merged
}

function ensureMinimumEvidenceRefs(
  refs: SectionEvidenceRefs,
  sectionPaths: string[],
  synthesis: SignalSynthesisResult | undefined,
  resolveDomains: (path: string) => string[]
): SectionEvidenceRefs {
  if (!synthesis) return refs
  const next: SectionEvidenceRefs = { ...refs }
  for (const path of sectionPaths) {
    const existing = [...(next[path] || [])]
    if (existing.length >= MIN_EVIDENCE_REFS_PER_SECTION) continue

    const local = selectEvidenceRefsByDomains(synthesis, resolveDomains(path), 4)
    let merged = mergeEvidenceRefs(existing, local, 4)
    if (merged.length < MIN_EVIDENCE_REFS_PER_SECTION) {
      const global = selectEvidenceRefsByDomains(synthesis, GLOBAL_EVIDENCE_DOMAINS, 4)
      merged = mergeEvidenceRefs(merged, global, 4)
    }
    next[path] = merged
  }
  return next
}

export function buildComprehensiveEvidenceRefs(
  synthesis: SignalSynthesisResult | undefined,
  deps: ReportEvidenceSupportDeps
): SectionEvidenceRefs {
  const refs: SectionEvidenceRefs = {}
  const usedSignalIds = new Set<string>()
  for (const sectionKey of deps.comprehensiveSectionKeys) {
    refs[sectionKey] = selectEvidenceRefsByDomains(
      synthesis,
      deps.getDomainsForSection(sectionKey),
      4,
      usedSignalIds
    )
  }
  return ensureMinimumEvidenceRefs(
    refs,
    deps.comprehensiveSectionKeys,
    synthesis,
    deps.getDomainsForSection
  )
}

export function buildTimingEvidenceRefs(
  sectionPaths: string[],
  synthesis: SignalSynthesisResult | undefined
): SectionEvidenceRefs {
  const refs: SectionEvidenceRefs = {}
  const usedSignalIds = new Set<string>()
  for (const path of sectionPaths) {
    refs[path] = selectEvidenceRefsByDomains(
      synthesis,
      getTimingPathDomains(path),
      4,
      usedSignalIds
    )
  }
  return ensureMinimumEvidenceRefs(refs, sectionPaths, synthesis, getTimingPathDomains)
}

export function buildThemedEvidenceRefs(
  theme: ReportTheme,
  sectionPaths: string[],
  synthesis: SignalSynthesisResult | undefined
): SectionEvidenceRefs {
  const refs: SectionEvidenceRefs = {}
  const usedSignalIds = new Set<string>()
  for (const path of sectionPaths) {
    refs[path] = selectEvidenceRefsByDomains(
      synthesis,
      getThemedPathDomains(theme, path),
      4,
      usedSignalIds
    )
  }
  return ensureMinimumEvidenceRefs(refs, sectionPaths, synthesis, (path) =>
    getThemedPathDomains(theme, path)
  )
}

export function hasEvidenceSupport(text: string, refs: ReportEvidenceRef[]): boolean {
  if (!text || refs.length === 0) return true
  const lowered = text.toLowerCase()
  for (const ref of refs) {
    const tokens = [
      ...tokenizeEvidenceText(ref.keyword),
      ...tokenizeEvidenceText(ref.rowKey),
      ...tokenizeEvidenceText(ref.colKey),
      ...tokenizeEvidenceText(ref.sajuBasis),
      ...tokenizeEvidenceText(ref.astroBasis),
    ].slice(0, 12)
    for (const token of tokens) {
      if (!token || token.length < 2) continue
      if (lowered.includes(token)) return true
    }
  }
  return false
}

function hasEvidenceIdReference(text: string, refs: ReportEvidenceRef[]): boolean {
  if (!text || refs.length === 0) return true
  const lowered = text.toLowerCase()
  return refs.some((ref) => {
    const hints = [ref.keyword, ref.rowKey, ref.colKey]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase())
    return hints.some((hint) => lowered.includes(hint))
  })
}

export function enforceEvidenceRefFooters(
  sections: Record<string, unknown>,
  sectionPaths: string[],
  evidenceRefs: SectionEvidenceRefs,
  lang: 'ko' | 'en',
  deps: ReportEvidenceSupportDeps
): Record<string, unknown> {
  for (const path of sectionPaths) {
    const text = deps.getPathText(sections, path)
    if (!text) continue
    if (/(?:핵심 근거는|Key grounding comes from)/i.test(text)) {
      continue
    }
    const refs = (evidenceRefs[path] || []).filter((ref) => Boolean(ref.id))
    if (refs.length === 0) continue
    if (hasEvidenceIdReference(text, refs)) continue
    const top = refs.slice(0, 2)
    const hints = top
      .map((ref) => ref.keyword || ref.rowKey || ref.colKey)
      .filter(Boolean)
      .join(', ')
    const hintLine = deps.buildReportCoreLine(hints || '', lang)
    const footer =
      lang === 'ko'
        ? `핵심 근거는 ${hintLine || '현재 활성 신호'}입니다.`
        : deps
            .normalizeNarrativeCoreText(
              `Key grounding comes from ${hintLine || 'current active signals'}.`,
              lang
            )
            .replace(/대운\s+metal/gi, 'Daeun metal')
            .replace(/대운\s+wood/gi, 'Daeun wood')
            .replace(/대운\s+water/gi, 'Daeun water')
            .replace(/대운\s+fire/gi, 'Daeun fire')
            .replace(/대운\s+earth/gi, 'Daeun earth')
            .replace(/dominant element\s+바람/gi, 'dominant element air')
            .replace(/dominant western element\s+바람/gi, 'dominant western element air')
    deps.setPathText(sections, path, `${text} ${footer}`.replace(/\s{2,}/g, ' ').trim())
  }
  return sections
}

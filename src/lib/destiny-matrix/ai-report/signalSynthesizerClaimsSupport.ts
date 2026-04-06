import type { ActivationEngineResult } from '../core/activationEngine'
import type { RuleEngineResult } from '../core/ruleEngine'
import type { StateEngineResult } from '../core/stateEngine'
import type {
  NormalizedSignal,
  SignalDomain,
  SignalPolarity,
  SynthesizedClaim,
} from './signalSynthesizer'
import {
  CLAIM_DOMAIN_PRIORITY,
  REQUIRED_CORE_DOMAINS,
  sanitizeFearWords,
  uniq,
} from './signalSynthesizerSupport'

export interface SignalSynthesisResolvedContext {
  activation: ActivationEngineResult
  rules: RuleEngineResult
  states: StateEngineResult
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

function isSignalInDomain(signal: NormalizedSignal, domain: SignalDomain): boolean {
  return (signal.domainHints || []).includes(domain)
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
    move:
      '\uC774\uB3D9\u00B7\uBCC0\uD654\uB294 \uD55C \uBC88\uC5D0 \uD655\uC815\uD558\uC9C0 \uB9D0\uACE0 \uB2E8\uACC4 \uBCC4\uB85C \uC791\uAC8C \uAC80\uC99D\uD558\uC138\uC694.',
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
        'ì»¤ë¦¬ì–´ëŠ” ê¸°íšŒê°€ ì™€ë„ ë§¡ì„ ì—­í• ê³¼ ì±…ìž„ ë²”ìœ„ë¥¼ ë¨¼ì € ë¶„ëª…ížˆ í•´ì•¼ ì†ì‹¤ ì—†ì´ ì»¤ì§‘ë‹ˆë‹¤. ì§€ê¸ˆì€ ë¬´í„±ëŒ€ê³  ë„“ížˆê¸°ë³´ë‹¤ ì–´ë–¤ ì¼ë¡œ í‰ê°€ë°›ì„ì§€ ë¨¼ì € ì •í•˜ëŠ” íŽ¸ì´ ë§žìŠµë‹ˆë‹¤.',
      relationship:
        'ê´€ê³„ëŠ” ê°€ê¹Œì›Œì§ˆ ì—¬ì§€ë„ ìžˆì§€ë§Œ ì†ë„ë¥¼ ìž˜ëª» ìž¡ìœ¼ë©´ ì˜¤í•´ë„ ê°™ì´ ì»¤ì§ˆ ìˆ˜ ìžˆìŠµë‹ˆë‹¤. ì§„ì „ê³¼ í™•ì¸ì„ ê°™ì€ ë‚ ì— ëë‚´ë ¤ í•˜ê¸°ë³´ë‹¤ ë‹¨ê³„ë¥¼ ë‚˜ëˆ  ê°€ëŠ” íŽ¸ì´ ë§žìŠµë‹ˆë‹¤.',
      wealth:
        'ìž¬ì •ì€ ëˆì´ ë“¤ì–´ì˜¬ ì—¬ì§€ë„ ìžˆì§€ë§Œ ì¡°ê±´ì„ ëŒ€ì¶© ë³´ë©´ ë‹¤ì‹œ ìƒˆì–´ ë‚˜ê°€ê¸° ì‰½ìŠµë‹ˆë‹¤. ì§€ê¸ˆì€ ìˆ˜ìµ ê¸°ëŒ€ë³´ë‹¤ ê¸ˆì•¡, ê¸°í•œ, ì†ì‹¤ ìƒí•œì„ ë¨¼ì € í™•ì¸í•˜ëŠ” íŽ¸ì´ ë§žìŠµë‹ˆë‹¤.',
      health:
        'ì»¨ë””ì…˜ì€ ëŒì–´ì˜¬ë¦´ ìˆ˜ ìžˆì§€ë§Œ ë¬´ë¦¬í•˜ë©´ í”¼ë¡œê°€ í•œ ë²ˆì— ëª°ë¦´ ìˆ˜ ìžˆìŠµë‹ˆë‹¤. ì„±ê³¼ë¥¼ ë” ë‚´ê¸°ë³´ë‹¤ íšŒë³µ ì‹œê°„ì„ ë¨¼ì € í™•ë³´í•˜ëŠ” íŽ¸ì´ ì˜¤ëž˜ ê°‘ë‹ˆë‹¤.',
      move:
        'ì´ë™Â·ë³€í™”ëŠ” ê¸°íšŒì™€ ë¶ˆí™•ì‹¤ì„±ì´ ë™ì‹œì— í½ë‹ˆë‹¤. ë‘ ì‹ í˜¸ëŠ” ìƒì¶©ì´ ì•„ë‹ˆë¼ ë‹¨ê³„ë³„ ê²€ì¦ì„ ìš”êµ¬í•˜ëŠ” ë¶„ê¸° ì‹ í˜¸ìž…ë‹ˆë‹¤.',
      personality:
        'ì§€ê¸ˆì€ ì¶”ì§„ë ¥ë„ ìžˆì§€ë§Œ ê³¼ì†í•˜ë©´ ì‹¤ìˆ˜ë„ ê°™ì´ ì»¤ì§ˆ ìˆ˜ ìžˆìŠµë‹ˆë‹¤. íŒë‹¨ì€ ë¹ ë¥´ê²Œ í•˜ë˜ ì‹¤í–‰ì€ ë‹¨ê³„ë³„ë¡œ ëŠì–´ ê°€ëŠ” íŽ¸ì´ ì•ˆì „í•©ë‹ˆë‹¤.',
      spirituality:
        'ìž¥ê¸° ë°©í–¥ì€ ë„“í˜€ ë³´ê³  ì‹¶ì€ ë§ˆìŒê³¼ ë‹¤ì‹œ ì •ë¦¬í•´ì•¼ í•œë‹¤ëŠ” ìš”êµ¬ê°€ í•¨ê»˜ ìžˆìŠµë‹ˆë‹¤. ìš•ì‹¬ì„ ë”í•˜ê¸°ë³´ë‹¤ ì§€ê¸ˆ ë‚¨ê¸¸ ê¸°ì¤€ì„ ë¨¼ì € ì •í•˜ëŠ” íŽ¸ì´ ë§žìŠµë‹ˆë‹¤.',
      timing:
        'ì§€ê¸ˆì€ ê¸°íšŒë„ ë³´ì´ì§€ë§Œ ë°”ë¡œ í™•ì •í•˜ë©´ ë‹¤ì‹œ ì†ë³¼ ì¼ë„ ìƒê¸°ê¸° ì‰½ìŠµë‹ˆë‹¤. ê²°ì •ê³¼ í™•ì • ì‚¬ì´ì— í•œ ë²ˆ ë” í™•ì¸ ë‹¨ê³„ë¥¼ ë‘ëŠ” íŽ¸ì´ ë§žìŠµë‹ˆë‹¤.',
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
    move:
      'Move/change has opportunity and uncertainty together. These are branch signals that require staged validation.',
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
      ? [anchor?.semantic?.layerMeaningKo, hasCaution ? anchor?.semantic?.riskKo : anchor?.semantic?.focusKo]
          .filter(Boolean)
          .slice(0, 2)
          .join(' ')
      : [anchor?.semantic?.layerMeaningEn, hasCaution ? anchor?.semantic?.riskEn : anchor?.semantic?.focusEn]
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

function buildClaimSourceSignals(
  domain: SignalDomain,
  selectedSignals: NormalizedSignal[],
  normalizedSignals: NormalizedSignal[]
): NormalizedSignal[] {
  const selectedDomainSignals = selectedSignals.filter((signal) => isSignalInDomain(signal, domain))
  const supplementalSignals = normalizedSignals
    .filter(
      (signal) =>
        isSignalInDomain(signal, domain) &&
        !selectedDomainSignals.some((selected) => selected.id === signal.id)
    )
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 3)

  return [...selectedDomainSignals, ...supplementalSignals]
    .filter((signal, index, array) => array.findIndex((item) => item.id === signal.id) === index)
    .sort((a, b) => b.rankScore - a.rankScore)
}

export function buildClaims(
  selectedSignals: NormalizedSignal[],
  normalizedSignals: NormalizedSignal[],
  lang: 'ko' | 'en'
): SynthesizedClaim[] {
  const grouped = selectedSignals.reduce<Record<string, NormalizedSignal[]>>((acc, signal) => {
    for (const domain of claimDomains(signal)) {
      if (!acc[domain]) acc[domain] = []
      acc[domain].push(signal)
    }
    return acc
  }, {})
  return Object.entries(grouped)
    .map(([domain]) =>
      buildClaim(
        domain as SignalDomain,
        buildClaimSourceSignals(domain as SignalDomain, selectedSignals, normalizedSignals),
        lang
      )
    )
    .sort((a, b) => {
      if (b.evidence.length !== a.evidence.length) return b.evidence.length - a.evidence.length
      return (CLAIM_DOMAIN_PRIORITY[a.domain] || 99) - (CLAIM_DOMAIN_PRIORITY[b.domain] || 99)
    })
}

export function toSignalsById(signals: NormalizedSignal[]): Record<string, NormalizedSignal> {
  return signals.reduce<Record<string, NormalizedSignal>>((acc, signal) => {
    acc[signal.id] = signal
    return acc
  }, {})
}

function ensureFamilyDiversity(
  selected: NormalizedSignal[],
  bench: NormalizedSignal[],
  minFamilies = 4
): NormalizedSignal[] {
  const result = [...selected]
  const familyCount = () => new Set(result.map((s) => s.family)).size

  while (familyCount() < minFamilies) {
    const candidate = bench.find(
      (item) =>
        !result.some((s) => s.id === item.id) &&
        !result.some((s) => s.family === item.family)
    )
    if (!candidate) break

    const removable = [...result]
      .filter((signal) => signal.polarity === candidate.polarity)
      .sort((a, b) => {
        const familyDupA = result.filter((item) => item.family === a.family).length
        const familyDupB = result.filter((item) => item.family === b.family).length
        if (familyDupB !== familyDupA) return familyDupB - familyDupA
        return a.rankScore - b.rankScore
      })[0]

    if (!removable) break
    const idx = result.findIndex((signal) => signal.id === removable.id)
    if (idx >= 0) result[idx] = candidate
  }

  return result
}

export function selectSevenSignals(signals: NormalizedSignal[]): NormalizedSignal[] {
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
  return ensureFamilyDiversity(
    ensureDomainDiversity(withRequiredDomains, bench, 3, REQUIRED_CORE_DOMAINS),
    bench
  )
}

export function buildLeadSignalIds(selectedSignals: NormalizedSignal[]): string[] {
  return [...selectedSignals]
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 3)
    .map((signal) => signal.id)
}

export function buildSupportSignalIds(selectedSignals: NormalizedSignal[]): string[] {
  return [...selectedSignals]
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(3, 7)
    .map((signal) => signal.id)
}

export function buildSuppressedSignalIds(
  normalizedSignals: NormalizedSignal[],
  selectedSignals: NormalizedSignal[]
): string[] {
  const selectedIds = new Set(selectedSignals.map((signal) => signal.id))
  return normalizedSignals
    .filter((signal) => !selectedIds.has(signal.id))
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 6)
    .map((signal) => signal.id)
}

export function applyResolvedContextBoosts(
  signals: NormalizedSignal[],
  resolvedContext: SignalSynthesisResolvedContext | undefined
): NormalizedSignal[] {
  if (!resolvedContext) return signals

  return signals.map((signal) => {
    const relevantDomains = signal.domainHints
    const activationHits = resolvedContext.activation.domains.filter((domain) =>
      relevantDomains.includes(domain.domain)
    )
    const ruleHits = resolvedContext.rules.domains.filter((domain) =>
      relevantDomains.includes(domain.domain)
    )
    const stateHits = resolvedContext.states.domains.filter((domain) =>
      relevantDomains.includes(domain.domain)
    )

    const activationBoost =
      activationHits.reduce((sum, domain) => sum + Math.min(domain.activationScore, 4) * 0.08, 0) /
      Math.max(1, activationHits.length)
    const priorityBoost =
      ruleHits.reduce((sum, domain) => sum + domain.priorityScore * 0.06, 0) /
      Math.max(1, ruleHits.length)
    const contradictionPenalty =
      ruleHits.reduce((sum, domain) => sum + domain.contradictionPenalty * 0.18, 0) /
      Math.max(1, ruleHits.length)
    const gatingPenalty =
      signal.polarity === 'strength' && ruleHits.some((domain) => domain.gate.includes('commit_now'))
        ? 0.18
        : 0
    const recoveryPenalty =
      stateHits.some((domain) => domain.state === 'consolidation' || domain.state === 'residue') &&
      signal.polarity === 'strength'
        ? 0.12
        : 0
    const stateBoost =
      stateHits.some((domain) => domain.state === 'peak')
        ? 0.16
        : stateHits.some((domain) => domain.state === 'active')
          ? 0.1
          : stateHits.some((domain) => domain.state === 'opening')
            ? 0.05
            : 0

    return {
      ...signal,
      rankScore:
        Math.round(
          (signal.rankScore +
            activationBoost +
            priorityBoost +
            stateBoost -
            contradictionPenalty -
            gatingPenalty -
            recoveryPenalty) *
            100
        ) / 100,
      tags: uniq([
        ...signal.tags,
        ...activationHits.map((domain) => `activation:${domain.domain}`),
        ...ruleHits.map((domain) => `rule:${domain.resolvedMode}`),
        ...stateHits.map((domain) => `state:${domain.state}`),
      ]),
    }
  })
}

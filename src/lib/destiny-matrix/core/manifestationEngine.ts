import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type {
  BuildCoreCanonicalOutputInput,
  CoreActivationSource,
  CoreDomainAdvisory,
  CoreDomainLead,
  CoreDomainManifestation,
  CoreDomainTimingWindow,
  CoreDomainVerdict,
  CorePatternLead,
  CoreProvenance,
  CoreScenarioLead,
} from './types'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function localizeManifestationDomain(domain: string): string {
  switch (domain) {
    case 'career':
      return '\ucee4\ub9ac\uc5b4'
    case 'relationship':
      return '\uad00\uacc4'
    case 'wealth':
      return '\uc7ac\uc815'
    case 'health':
      return '\uac74\uac15'
    case 'move':
      return '\uc774\ub3d9'
    case 'timing':
      return '\ud0c0\uc774\ubc0d'
    case 'personality':
    default:
      return '\uc131\ud5a5'
  }
}
function localizeManifestationWindow(window: string): string {
  switch (window) {
    case 'now':
      return '\uc9c0\uae08'
    case '1-3m':
      return '1~3\uac1c\uc6d4'
    case '3-6m':
      return '3~6\uac1c\uc6d4'
    case '6-12m':
      return '6~12\uac1c\uc6d4'
    case '12m+':
      return '1\ub144 \uc774\uc0c1'
    default:
      return window
  }
}
function localizeManifestationMode(mode: string | null | undefined): string {
  switch (mode) {
    case 'execute':
      return '\uc2e4\ud589 \ubaa8\ub4dc'
    case 'prepare':
      return '\uc900\ube44 \ubaa8\ub4dc'
    case 'verify':
    default:
      return '\uac80\uc99d \ubaa8\ub4dc'
  }
}
function localizePatternFamily(family: string | null | undefined): string {
  switch (family) {
    case 'career':
      return '\ucee4\ub9ac\uc5b4 \uacc4\uc5f4'
    case 'relationship':
      return '\uad00\uacc4 \uacc4\uc5f4'
    case 'wealth':
      return '\uc7ac\uc815 \uacc4\uc5f4'
    case 'health':
      return '\uac74\uac15 \uacc4\uc5f4'
    case 'move':
      return '\uc774\ub3d9 \uacc4\uc5f4'
    case 'timing':
      return '\ud0c0\uc774\ubc0d \uacc4\uc5f4'
    case 'personality':
      return '\uc131\ud5a5 \uacc4\uc5f4'
    case 'core':
    default:
      return '\ud575\uc2ec \uacc4\uc5f4'
  }
}

function normalizeKoreanish(value: string): string {
  const raw = String(value || '').toLowerCase()
  if (/imgwan|\uc784\uad00/.test(raw)) return '\uc784\uad00'
  if (/jewang|\uc81c\uc655/.test(raw)) return '\uc81c\uc655'
  if (/geonrok|\uac74\ub85d/.test(raw)) return '\uac74\ub85d'
  if (/gwandae|\uad00\ub300/.test(raw)) return '\uad00\ub300'
  if (/jangsaeng|\uc7a5\uc0dd/.test(raw)) return '\uc7a5\uc0dd'
  if (/yang|\uc591/.test(raw)) return '\uc591'
  if (/tae|\ud0dc/.test(raw)) return '\ud0dc'
  if (/byeong|\ubcd1/.test(raw)) return '\ubcd1'
  if (/soe|\uc1e0/.test(raw)) return '\uc1e0'
  if (/jeol|\uc808/.test(raw)) return '\uc808'
  if (/myo|\ubb18/.test(raw)) return '\ubb18'
  if (/sa$|\uc0ac/.test(raw)) return '\uc0ac'
  if (/\ubaa9|wood/.test(raw)) return '\ubaa9'
  if (/\ud654|fire/.test(raw)) return '\ud654'
  if (/\ud1a0|earth/.test(raw)) return '\ud1a0'
  if (/\uae08|metal/.test(raw)) return '\uae08'
  if (/\uc218|water/.test(raw)) return '\uc218'
  return String(value || '')
}

function summarizePillarElements(matrixInput: MatrixCalculationInput | undefined) {
  const counts = new Map<string, number>()
  for (const value of matrixInput?.pillarElements || []) {
    const key = normalizeKoreanish(String(value))
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return {
    dominantElement: ordered[0]?.[0] || null,
    dominantCount: ordered[0]?.[1] || 0,
  }
}

function summarizeTwelveStages(matrixInput: MatrixCalculationInput | undefined) {
  const entries = Object.entries(matrixInput?.twelveStages || {})
    .map(([stage, count]) => [normalizeKoreanish(stage), Number(count || 0)] as const)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
  return {
    leadStage: entries[0]?.[0] || null,
    leadCount: entries[0]?.[1] || 0,
  }
}

function buildStructuralNotes(domain: string, matrixInput: MatrixCalculationInput | undefined, lang: 'ko' | 'en') {
  const pillar = summarizePillarElements(matrixInput)
  const stage = summarizeTwelveStages(matrixInput)
  const baseline: string[] = []
  const likely: string[] = []
  const risk: string[] = []

  if (pillar.dominantCount >= 2) {
    if (pillar.dominantElement === '\uae08' && ['career', 'personality', 'wealth'].includes(domain)) {
      baseline.push(
        lang === 'ko'
          ? '\uae30\ubcf8 \uad6c\uc870\uc5d0\uc11c \uac80\ud1a0\uc640 \uc815\ubc00 \uc870\uc815 \uc131\ud5a5\uc774 \uac15\ud569\ub2c8\ub2e4.'
          : 'The baseline structure favors precision, filtering, and verification.'
      )
      likely.push(lang === 'ko' ? '\uae30\uc900 \uc815\ub9ac \ud6c4 \uc2e4\ud589' : 'execute after criteria-setting')
    }
    if (pillar.dominantElement === '\ubaa9' && ['career', 'move', 'relationship'].includes(domain)) {
      baseline.push(
        lang === 'ko'
          ? '\uae30\ubcf8 \uad6c\uc870\uc5d0\uc11c \ud655\uc7a5\uacfc \uc5f0\uacb0\uc744 \uba3c\uc800 \uc5ec\ub294 \uacbd\ud5a5\uc774 \uac15\ud569\ub2c8\ub2e4.'
          : 'The baseline structure opens through growth and connection first.'
      )
      likely.push(lang === 'ko' ? '\uc0c8 \uc5f0\uacb0 \ub610\ub294 \uc0c8 \ud310 \uc5f4\uae30' : 'open a new lane or connection')
    }
    if (pillar.dominantElement === '\ud1a0' && ['wealth', 'career', 'health'].includes(domain)) {
      baseline.push(
        lang === 'ko'
          ? '\uae30\ubcf8 \uad6c\uc870\uc5d0\uc11c \uae30\ubc18 \uc815\ube44\uc640 \ub204\uc801 \uc6b4\uc601\uc774 \uc6b0\uc120\ub429\ub2c8\ub2e4.'
          : 'The baseline structure prefers foundation-building and accumulation.'
      )
      likely.push(lang === 'ko' ? '\uae30\ubc18 \uc815\ube44 \ud6c4 \ud655\uc7a5' : 'expand after base-building')
    }
    if (pillar.dominantElement === '\uc218' && ['health', 'spirituality', 'relationship'].includes(domain)) {
      baseline.push(
        lang === 'ko'
          ? '\uae30\ubcf8 \uad6c\uc870\uc5d0\uc11c \ud68c\ubcf5\uacfc \uac10\uc815 \uc21c\ud658\uc744 \uba3c\uc800 \uc0b4\ud53c\ub294 \ud3b8\uc785\ub2c8\ub2e4.'
          : 'The baseline structure checks recovery and emotional flow first.'
      )
      likely.push(lang === 'ko' ? '\ud68c\ubcf5 \ud6c4 \uc7ac\uac1c' : 'resume after recovery')
    }
  }

  if (stage.leadStage) {
    if (['\uc784\uad00', '\uc81c\uc655', '\uac74\ub85d', '\uad00\ub300', '\uc591'].includes(stage.leadStage) && ['career', 'timing', 'personality'].includes(domain)) {
      baseline.push(
        lang === 'ko'
          ? `${stage.leadStage} \uc131\ud5a5\uc774 \uac15\ud574 \uc5ed\ud560\uacfc \uc874\uc7ac\uac10\uc774 \uc55e\uc5d0 \uc11c\ub294 \uad6c\uc870\uc785\ub2c8\ub2e4.`
          : `A ${stage.leadStage} stage signature makes role and presence more outward-facing.`
      )
      likely.push(lang === 'ko' ? '\uacf5\uc801 \uc5ed\ud560 \ud655\ub300' : 'public role expansion')
    }
    if (['\ubcd1', '\uc1e0', '\uc808', '\uc0ac', '\ubb18'].includes(stage.leadStage) && ['health', 'relationship', 'timing'].includes(domain)) {
      baseline.push(
        lang === 'ko'
          ? `${stage.leadStage} \uc131\ud5a5\uc774 \uac15\ud574 \uc18d\ub3c4\ubcf4\ub2e4 \ud68c\ubcf5\uacfc \uac70\ub9ac \uc870\uc808\uc774 \uc911\uc694\ud569\ub2c8\ub2e4.`
          : `A ${stage.leadStage} stage signature makes recovery and pacing more important than speed.`
      )
      risk.push(lang === 'ko' ? '\ubb34\ub9ac\ud55c \ubc00\uc5b4\ubd99\uc774\uae30' : 'overpushing before readiness')
    }
    if (['\uc7a5\uc0dd', '\ud0dc', '\uc591'].includes(stage.leadStage) && ['health', 'move', 'relationship'].includes(domain)) {
      likely.push(
        lang === 'ko'
          ? '\uc7ac\uc815\ube44 \ub4a4 \ub2e4\uc2dc \uc0b4\uc544\ub098\ub294 \ud750\ub984'
          : 'renewal after recalibration'
      )
    }
  }

  return { baseline, likely, risk }
}

function buildActivationSources(
  input: BuildCoreCanonicalOutputInput
): CoreActivationSource[] {
  const matrixInput = input.matrixInput
  const advancedAstroCount = Object.values(matrixInput?.advancedAstroSignals || {}).filter(Boolean).length
  const transitCount = matrixInput?.activeTransits?.length || 0
  const astroTiming = matrixInput?.astroTimingIndex

  const sources: CoreActivationSource[] = [
    {
      source: 'natal',
      active: true,
      intensity: 0.95,
      label:
        input.lang === 'ko'
          ? '\ud0c0\uace0\ub09c \uae30\ubcf8 \uad6c\uc870'
          : 'Natal baseline structure',
      evidenceIds: ['natal:baseline'],
    },
    {
      source: 'daeun',
      active: Boolean(matrixInput?.currentDaeunElement),
      intensity: matrixInput?.currentDaeunElement ? 0.84 : 0.18,
      label:
        input.lang === 'ko'
          ? matrixInput?.currentDaeunElement
            ? `\ub300\uc6b4 \ud65c\uc131 (${matrixInput.currentDaeunElement})`
            : '\ub300\uc6b4 \ube44\ud65c\uc131'
          : matrixInput?.currentDaeunElement
            ? `Daeun active (${matrixInput.currentDaeunElement})`
            : 'Daeun inactive',
      evidenceIds: matrixInput?.currentDaeunElement ? [`daeun:${matrixInput.currentDaeunElement}`] : [],
    },
    {
      source: 'saeun',
      active: Boolean(matrixInput?.currentSaeunElement),
      intensity: matrixInput?.currentSaeunElement ? 0.76 : 0.16,
      label:
        input.lang === 'ko'
          ? matrixInput?.currentSaeunElement
            ? `\uc138\uc6b4 \ud65c\uc131 (${matrixInput.currentSaeunElement})`
            : '\uc138\uc6b4 \ube44\ud65c\uc131'
          : matrixInput?.currentSaeunElement
            ? `Annual cycle active (${matrixInput.currentSaeunElement})`
            : 'Annual cycle inactive',
      evidenceIds: matrixInput?.currentSaeunElement ? [`saeun:${matrixInput.currentSaeunElement}`] : [],
    },
    {
      source: 'wolun',
      active: Boolean(matrixInput?.currentWolunElement),
      intensity: matrixInput?.currentWolunElement ? 0.68 : 0.14,
      label:
        input.lang === 'ko'
          ? matrixInput?.currentWolunElement
            ? `\uc6d4\uc6b4 \ud65c\uc131 (${matrixInput.currentWolunElement})`
            : '\uc6d4\uc6b4 \ube44\ud65c\uc131'
          : matrixInput?.currentWolunElement
            ? `Monthly cycle active (${matrixInput.currentWolunElement})`
            : 'Monthly cycle inactive',
      evidenceIds: matrixInput?.currentWolunElement ? [`wolun:${matrixInput.currentWolunElement}`] : [],
    },
    {
      source: 'ilun',
      active: Boolean(matrixInput?.currentIljinElement || matrixInput?.currentIljinDate),
      intensity: matrixInput?.currentIljinElement || matrixInput?.currentIljinDate ? 0.61 : 0.12,
      label:
        input.lang === 'ko'
          ? matrixInput?.currentIljinElement
            ? `\uc77c\uc6b4 \ud65c\uc131 (${matrixInput.currentIljinElement})`
            : matrixInput?.currentIljinDate
              ? `\uc77c\uc6b4 \ud65c\uc131 (${matrixInput.currentIljinDate})`
              : '\uc77c\uc6b4 \ube44\ud65c\uc131'
          : matrixInput?.currentIljinElement
            ? `Daily cycle active (${matrixInput.currentIljinElement})`
            : matrixInput?.currentIljinDate
              ? `Daily cycle active (${matrixInput.currentIljinDate})`
              : 'Daily cycle inactive',
      evidenceIds: [
        ...(matrixInput?.currentIljinElement ? [`ilun:${matrixInput.currentIljinElement}`] : []),
        ...(matrixInput?.currentIljinDate ? [`ilun-date:${matrixInput.currentIljinDate}`] : []),
      ],
    },
    {
      source: 'transit',
      active: transitCount > 0,
      intensity: transitCount > 0 ? round2(clamp(0.45 + transitCount * 0.06, 0.45, 0.9)) : 0.1,
      label:
        input.lang === 'ko'
          ? transitCount > 0
            ? `\ud2b8\ub79c\uc9d3 \ud65c\uc131 (${transitCount}\uac1c)`
            : '\ud2b8\ub79c\uc9d3 \ube44\ud65c\uc131'
          : transitCount > 0
            ? `Active transits (${transitCount})`
            : 'No active transits',
      evidenceIds: (matrixInput?.activeTransits || []).map((item) => `transit:${item}`),
    },
    {
      source: 'astro_timing',
      active: Boolean(astroTiming),
      intensity: astroTiming
        ? round2(clamp(
            astroTiming.decade * 0.2 +
              astroTiming.annual * 0.25 +
              astroTiming.monthly * 0.3 +
              astroTiming.daily * 0.25,
            0.2,
            0.95
          ))
        : 0.1,
      label:
        input.lang === 'ko'
          ? astroTiming
            ? `\uc810\uc131 \ud0c0\uc774\ubc0d \uc9c0\uc218 (${Math.round(astroTiming.confidence * 100)}%)`
            : '\uc810\uc131 \ud0c0\uc774\ubc0d \ube44\ud65c\uc131'
          : astroTiming
            ? `Astro timing index (${Math.round(astroTiming.confidence * 100)}%)`
            : 'Astro timing inactive',
      evidenceIds: astroTiming ? ['astroTimingIndex'] : [],
    },
    {
      source: 'advanced_astro',
      active: advancedAstroCount > 0,
      intensity: advancedAstroCount > 0 ? round2(clamp(0.35 + advancedAstroCount * 0.04, 0.35, 0.88)) : 0.08,
      label:
        input.lang === 'ko'
          ? advancedAstroCount > 0
            ? `\uace0\uae09 \uc810\uc131 \ud65c\uc131 (${advancedAstroCount}\uac1c)`
            : '\uace0\uae09 \uc810\uc131 \ube44\ud65c\uc131'
          : advancedAstroCount > 0
            ? `Advanced astrology active (${advancedAstroCount})`
            : 'Advanced astrology inactive',
      evidenceIds:
        advancedAstroCount > 0
          ? Object.keys(matrixInput?.advancedAstroSignals || {}).map((key) => `advanced:${key}`)
          : [],
    },
  ]

  return sources
}

function selectSourcesForDomain(
  domain: string,
  sources: CoreActivationSource[]
): CoreActivationSource[] {
  const primary = sources.filter((source) => source.active)
  if (domain === 'health') {
    return primary
      .filter((source) => source.source !== 'daeun' || source.intensity >= 0.7)
      .slice(0, 5)
  }
  if (domain === 'move') {
    return primary
      .filter((source) => source.source !== 'natal' || source.intensity >= 0.9)
      .slice(0, 5)
  }
  return primary.slice(0, 5)
}

function mergeProvenance(parts: Array<CoreProvenance | undefined>): CoreProvenance {
  return {
    sourceFields: [...new Set(parts.flatMap((item) => item?.sourceFields || []))].slice(0, 10),
    sourceSignalIds: [...new Set(parts.flatMap((item) => item?.sourceSignalIds || []))].slice(0, 10),
    sourceRuleIds: [...new Set(parts.flatMap((item) => item?.sourceRuleIds || []))].slice(0, 10),
    sourceSetIds: [...new Set(parts.flatMap((item) => item?.sourceSetIds || []))].slice(0, 10),
  }
}

function describeBaseline(
  lead: CoreDomainLead,
  pattern: CorePatternLead | null,
  advisory: CoreDomainAdvisory | null,
  lang: 'ko' | 'en'
): string {
  if (advisory?.thesis) return advisory.thesis
  const domainLabel = lang === 'ko' ? localizeManifestationDomain(lead.domain) : lead.domain
  const familyLabel =
    lang === 'ko'
      ? localizePatternFamily(pattern?.family || 'core')
      : pattern?.family || 'core'
  return lang === 'ko'
    ? `${domainLabel} \uc601\uc5ed\uc740 ${familyLabel}\uc774 \uae30\ubcf8 \uad6c\uc870\ub97c \uc774\ub8e8\uace0 \uc788\uc2b5\ub2c8\ub2e4.`
    : `${lead.domain} is structurally anchored by the ${familyLabel} family.`
}

function describeActivation(
  domain: string,
  timing: CoreDomainTimingWindow,
  sources: CoreActivationSource[],
  verdict: CoreDomainVerdict | null,
  lang: 'ko' | 'en'
): string {
  const domainLabel = lang === 'ko' ? localizeManifestationDomain(domain) : domain
  const windowLabel = lang === 'ko' ? localizeManifestationWindow(timing.window) : timing.window
  const modeLabel =
    lang === 'ko' ? localizeManifestationMode(verdict?.mode || 'verify') : verdict?.mode || 'verify'
  const sourceLabels = sources.slice(0, 3).map((source) => source.label).join(lang === 'ko' ? ', ' : ', ')
  return lang === 'ko'
    ? `${domainLabel} \uc601\uc5ed\uc740 ${windowLabel} \ucc3d\uc774 \uc5f4\ub824 \uc788\uace0, ${sourceLabels || '\uae30\ubcf8 \ud65c\uc131'}\uc774 \uacb9\uce58\uba74\uc11c \ud604\uc7ac \ubaa8\ub4dc\ub294 ${modeLabel}\ub85c \uc218\ub834\ud569\ub2c8\ub2e4.`
    : `${domain} is in a ${timing.window} window, and ${sourceLabels || 'baseline activation'} is converging into ${verdict?.mode || 'verify'} mode.`
}

function describeManifestation(
  lead: CoreDomainLead,
  pattern: CorePatternLead | null,
  scenario: CoreScenarioLead | null,
  verdict: CoreDomainVerdict | null,
  lang: 'ko' | 'en'
): string {
  const domainLabel = lang === 'ko' ? localizeManifestationDomain(lead.domain) : lead.domain
  if (lang === 'ko') {
    if (verdict?.mode === 'execute') {
      return `${domainLabel} \uc601\uc5ed\uc740 ${pattern?.label || '\uc8fc\ub3c4 \ud328\ud134'}\uc774 \uc2e4\uc81c \uc0ac\uac74\uc73c\ub85c \uc804\ud658\ub418\uae30 \uc26c\uc6b4 \uad6c\uac04\uc785\ub2c8\ub2e4. ${scenario?.branch || '\ub300\ud45c \ubd84\uae30'} \ucabd\uc73c\ub85c \uc77c\uc774 \uad6c\uccb4\ud654\ub420 \uac00\ub2a5\uc131\uc774 \ub192\uc2b5\ub2c8\ub2e4.`
    }
    if (verdict?.mode === 'prepare') {
      return `${domainLabel} \uc601\uc5ed\uc740 \ub2f9\uc7a5 \ud655\uc815\ubcf4\ub2e4 \uad6c\uc870 \uc7ac\uc815\ube44\uac00 \uba3c\uc800 \uc77c\uc5b4\ub098\ub294 \uad6c\uac04\uc785\ub2c8\ub2e4. \uac89\uc73c\ub85c\ub294 \ub290\ub824 \ubcf4\uc5ec\ub3c4 \ub0b4\ubd80 \uc870\uac74\uc744 \uc7ac\ubc30\uc5f4\ud558\ub294 \ud604\uc0c1\uc774 \uc911\uc2ec\uc774 \ub429\ub2c8\ub2e4.`
    }
    return `${domainLabel} \uc601\uc5ed\uc740 \uae30\ud68c\uc640 \ub9ac\uc2a4\ud06c\uac00 \ud568\uaed8 \uc791\ub3d9\ud558\ub294 \uad6c\uac04\uc785\ub2c8\ub2e4. \uc0ac\uac74\uc740 \ubc14\ub85c \ud655\uc815\ubcf4\ub2e4 \ub2e8\uacc4\uc801 \ud569\uc758\ub098 \uac80\uc99d \uacfc\uc815\uc744 \uac70\uccd0 \ud604\uc2e4\ud654\ub420 \uac00\ub2a5\uc131\uc774 \ud07d\ub2c8\ub2e4.`
  }
  if (verdict?.mode === 'execute') {
    return `${lead.domain} is in a phase where the ${pattern?.label || 'lead pattern'} is more likely to materialize as an actual event, especially through the ${scenario?.branch || 'lead branch'} branch.`
  }
  if (verdict?.mode === 'prepare') {
    return `${lead.domain} is more likely to manifest as restructuring before commitment. The visible pace may slow, but internal conditions are being reset.`
  }
  return `${lead.domain} is running in a mixed phase where upside and risk activate together, so reality is more likely to form through staged verification than direct commitment.`
}

export function buildDomainManifestations(input: {
  lang: 'ko' | 'en'
  canonicalInput: BuildCoreCanonicalOutputInput
  domainLeads: CoreDomainLead[]
  domainVerdicts: CoreDomainVerdict[]
  domainTimingWindows: CoreDomainTimingWindow[]
  advisories: CoreDomainAdvisory[]
  topPatterns: CorePatternLead[]
  topScenarios: CoreScenarioLead[]
}): CoreDomainManifestation[] {
  const activationSources = buildActivationSources(input.canonicalInput)
  const matrixInput = input.canonicalInput.matrixInput

  return input.domainLeads.map((lead) => {
    const advisory = input.advisories.find((item) => item.domain === lead.domain) || null
    const timing = input.domainTimingWindows.find((item) => item.domain === lead.domain)
    const verdict = input.domainVerdicts.find((item) => item.domain === lead.domain) || null
    const pattern =
      input.topPatterns.find((item) => item.domains.includes(lead.domain)) || null
    const scenario =
      input.topScenarios.find((item) => item.domain === lead.domain) || null
    const selectedSources = selectSourcesForDomain(lead.domain, activationSources)
    const structuralNotes = buildStructuralNotes(lead.domain, matrixInput, input.lang)
    const likelyExpressions = [
      ...structuralNotes.likely,
      advisory?.action,
      ...(scenario?.entryConditions || []),
      ...(advisory?.leadScenarioIds || []),
    ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index)
    const riskExpressions = [
      ...structuralNotes.risk,
      advisory?.caution,
      ...(scenario?.abortConditions || []),
      ...(verdict?.blockedActions || []),
    ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index)
    const evidenceIds = [
      ...(advisory?.evidenceIds || []),
      ...(timing?.evidenceIds || []),
      ...(selectedSources.flatMap((source) => source.evidenceIds) || []),
    ].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)

    return {
      domain: lead.domain,
      baselineThesis: [
        describeBaseline(lead, pattern, advisory, input.lang),
        ...structuralNotes.baseline,
      ]
        .filter(Boolean)
        .join(input.lang === 'ko' ? ' ' : ' '),
      activationThesis: timing
        ? describeActivation(lead.domain, timing, selectedSources, verdict, input.lang)
        : input.lang === 'ko'
          ? `${localizeManifestationDomain(lead.domain)} \uc601\uc5ed\uc740 \ud604\uc7ac \uad6d\uba74 \uae30\uc900\uc73c\ub85c \ub2e8\uacc4\uc801 \ud65c\uc131\ud654\uac00 \uc6b0\uc120\uc785\ub2c8\ub2e4.`
          : `${lead.domain} is currently activating in a staged manner under the present phase.`,
      manifestation: describeManifestation(lead, pattern, scenario, verdict, input.lang),
      likelyExpressions: likelyExpressions.slice(0, 5),
      riskExpressions: riskExpressions.slice(0, 5),
      timingWindow: timing?.window || '12m+',
      activationSources: selectedSources,
      evidenceIds: evidenceIds.slice(0, 10),
      provenance: mergeProvenance([advisory?.provenance, timing?.provenance, verdict?.provenance]),
    }
  })
}


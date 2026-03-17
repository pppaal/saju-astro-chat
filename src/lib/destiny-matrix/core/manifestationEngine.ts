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
  CoreScenarioLead,
} from './types'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function normalizeKoreanish(value: string): string {
  const raw = String(value || '').toLowerCase()
  if (/imgwan|임관/.test(raw)) return '임관'
  if (/jewang|제왕/.test(raw)) return '제왕'
  if (/geonrok|건록/.test(raw)) return '건록'
  if (/gwandae|관대/.test(raw)) return '관대'
  if (/jangsaeng|장생/.test(raw)) return '장생'
  if (/yang|양/.test(raw)) return '양'
  if (/tae|태/.test(raw)) return '태'
  if (/byeong|병/.test(raw)) return '병'
  if (/soe|쇠/.test(raw)) return '쇠'
  if (/jeol|절/.test(raw)) return '절'
  if (/myo|묘/.test(raw)) return '묘'
  if (/sa$|사/.test(raw)) return '사'
  if (/목|wood/.test(raw)) return '목'
  if (/화|fire/.test(raw)) return '화'
  if (/토|earth/.test(raw)) return '토'
  if (/금|metal/.test(raw)) return '금'
  if (/수|water/.test(raw)) return '수'
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
    if (pillar.dominantElement === '금' && ['career', 'personality', 'wealth'].includes(domain)) {
      baseline.push(
        lang === 'ko'
          ? '기본 구조에서 검토와 정밀 조정 성향이 강합니다.'
          : 'The baseline structure favors precision, filtering, and verification.'
      )
      likely.push(lang === 'ko' ? '기준 정리 후 실행' : 'execute after criteria-setting')
    }
    if (pillar.dominantElement === '목' && ['career', 'move', 'relationship'].includes(domain)) {
      baseline.push(
        lang === 'ko'
          ? '기본 구조에서 확장과 연결을 먼저 여는 경향이 강합니다.'
          : 'The baseline structure opens through growth and connection first.'
      )
      likely.push(lang === 'ko' ? '새 연결 또는 새 판 열기' : 'open a new lane or connection')
    }
    if (pillar.dominantElement === '토' && ['wealth', 'career', 'health'].includes(domain)) {
      baseline.push(
        lang === 'ko'
          ? '기본 구조에서 기반 정비와 누적 운영이 우선됩니다.'
          : 'The baseline structure prefers foundation-building and accumulation.'
      )
      likely.push(lang === 'ko' ? '기반 정비 후 확장' : 'expand after base-building')
    }
    if (pillar.dominantElement === '수' && ['health', 'spirituality', 'relationship'].includes(domain)) {
      baseline.push(
        lang === 'ko'
          ? '기본 구조에서 회복과 감정 순환을 먼저 살피는 편입니다.'
          : 'The baseline structure checks recovery and emotional flow first.'
      )
      likely.push(lang === 'ko' ? '회복 후 재개' : 'resume after recovery')
    }
  }

  if (stage.leadStage) {
    if (['임관', '제왕', '건록', '관대', '양'].includes(stage.leadStage) && ['career', 'timing', 'personality'].includes(domain)) {
      baseline.push(
        lang === 'ko'
          ? `${stage.leadStage} 성향이 강해 역할과 존재감이 앞에 서는 구조입니다.`
          : `A ${stage.leadStage} stage signature makes role and presence more outward-facing.`
      )
      likely.push(lang === 'ko' ? '공적 역할 확대' : 'public role expansion')
    }
    if (['병', '쇠', '절', '사', '묘'].includes(stage.leadStage) && ['health', 'relationship', 'timing'].includes(domain)) {
      baseline.push(
        lang === 'ko'
          ? `${stage.leadStage} 성향이 강해 속도보다 회복과 거리 조절이 중요합니다.`
          : `A ${stage.leadStage} stage signature makes recovery and pacing more important than speed.`
      )
      risk.push(lang === 'ko' ? '무리한 밀어붙이기' : 'overpushing before readiness')
    }
    if (['장생', '태', '양'].includes(stage.leadStage) && ['health', 'move', 'relationship'].includes(domain)) {
      likely.push(
        lang === 'ko'
          ? '재정비 뒤 다시 살아나는 흐름'
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
          ? '타고난 기본 구조'
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
            ? `대운 활성 (${matrixInput.currentDaeunElement})`
            : '대운 비활성'
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
            ? `세운 활성 (${matrixInput.currentSaeunElement})`
            : '세운 비활성'
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
            ? `월운 활성 (${matrixInput.currentWolunElement})`
            : '월운 비활성'
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
            ? `일운 활성 (${matrixInput.currentIljinElement})`
            : matrixInput?.currentIljinDate
              ? `일운 활성 (${matrixInput.currentIljinDate})`
              : '일운 비활성'
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
            ? `트랜짓 활성 (${transitCount}개)`
            : '트랜짓 비활성'
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
            ? `점성 타이밍 지수 (${Math.round(astroTiming.confidence * 100)}%)`
            : '점성 타이밍 비활성'
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
            ? `고급 점성 활성 (${advancedAstroCount}개)`
            : '고급 점성 비활성'
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

function describeBaseline(
  lead: CoreDomainLead,
  pattern: CorePatternLead | null,
  advisory: CoreDomainAdvisory | null,
  lang: 'ko' | 'en'
): string {
  if (advisory?.thesis) return advisory.thesis
  return lang === 'ko'
    ? `${lead.domain} 영역은 ${pattern?.family || 'core'} 계열이 기본 구조를 이루고 있습니다.`
    : `${lead.domain} is structurally anchored by the ${pattern?.family || 'core'} family.`
}

function describeActivation(
  domain: string,
  timing: CoreDomainTimingWindow,
  sources: CoreActivationSource[],
  verdict: CoreDomainVerdict | null,
  lang: 'ko' | 'en'
): string {
  const sourceLabels = sources.slice(0, 3).map((source) => source.label).join(lang === 'ko' ? ', ' : ', ')
  return lang === 'ko'
    ? `${domain} 영역은 ${timing.window} 창이 열려 있고, ${sourceLabels || '기본 활성'}이 겹치면서 현재 모드는 ${verdict?.mode || 'verify'}로 수렴합니다.`
    : `${domain} is in a ${timing.window} window, and ${sourceLabels || 'baseline activation'} is converging into ${verdict?.mode || 'verify'} mode.`
}

function describeManifestation(
  lead: CoreDomainLead,
  pattern: CorePatternLead | null,
  scenario: CoreScenarioLead | null,
  verdict: CoreDomainVerdict | null,
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    if (verdict?.mode === 'execute') {
      return `${lead.domain} 영역은 ${pattern?.label || '주도 패턴'}이 실제 사건으로 전환되기 쉬운 구간입니다. ${scenario?.branch || '대표 분기'} 쪽으로 일이 구체화될 가능성이 높습니다.`
    }
    if (verdict?.mode === 'prepare') {
      return `${lead.domain} 영역은 당장 확정보다 구조 재정비가 먼저 일어나는 구간입니다. 겉으로는 느려 보여도 내부 조건을 재배열하는 현상이 중심이 됩니다.`
    }
    return `${lead.domain} 영역은 기회와 리스크가 함께 작동하는 구간입니다. 사건은 바로 확정보다 단계적 합의나 검증 과정을 거쳐 현실화될 가능성이 큽니다.`
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
          ? `${lead.domain} 영역은 현재 국면 기준으로 단계적 활성화가 우선입니다.`
          : `${lead.domain} is currently activating in a staged manner under the present phase.`,
      manifestation: describeManifestation(lead, pattern, scenario, verdict, input.lang),
      likelyExpressions: likelyExpressions.slice(0, 5),
      riskExpressions: riskExpressions.slice(0, 5),
      timingWindow: timing?.window || '12m+',
      activationSources: selectedSources,
      evidenceIds: evidenceIds.slice(0, 10),
    }
  })
}

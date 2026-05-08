import type { MatrixCalculationInput } from '../types'
import type { TimingData } from './types'
import {
  findReportCoreManifestation,
  findReportCoreTimingWindow,
  findReportCoreVerdict,
  type ReportCoreViewModel,
} from './reportCoreHelpers'
import {
  collectCleanNarrativeLines,
  buildReportCoreLine,
  getElementByStemName,
  getElementLabel,
  getReportDomainLabel,
  getWesternElementLabel,
  hasBatchim,
  localizeGeokgukLabel,
  localizePlanetName,
  localizeSignName,
  sanitizeEvidenceToken,
  withSubjectParticle,
} from './reportTextHelpers'
import { formatNarrativeParagraphs } from './reportNarrativeFormatting'
import { sanitizeUserFacingNarrative } from './reportNarrativeSanitizer'
import { describeTimingWindowNarrative as describeHumanTimingWindowNarrative } from '@/lib/matrix/interpretation/humanSemantics'

export function toObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export type PersonalDaeunWindow = {
  startAge: number
  endAge: number
  element?: string
  ganji?: string
  isCurrent: boolean
}

export function extractPersonalDaeunWindows(
  input: MatrixCalculationInput,
  timingData?: TimingData
): PersonalDaeunWindow[] {
  const age = calculateProfileAge(input.profileContext?.birthDate, input.currentDateIso)
  const windows: PersonalDaeunWindow[] = []
  const rawSnapshot = toObjectRecord(input.sajuSnapshot)
  const rawUnse = toObjectRecord(rawSnapshot?.unse)
  const rawDaeun = rawUnse?.daeun
  if (Array.isArray(rawDaeun)) {
    for (const item of rawDaeun) {
      const row = toObjectRecord(item)
      if (!row) continue
      const startAge =
        toFiniteNumber(row.startAge) ??
        toFiniteNumber(row.age) ??
        toFiniteNumber(row.start) ??
        toFiniteNumber(row.beginAge)
      if (startAge === null) continue
      const endAge =
        toFiniteNumber(row.endAge) ??
        toFiniteNumber(row.end) ??
        (Number.isFinite(startAge) ? startAge + 9 : null)
      if (endAge === null) continue
      const heavenlyStem = typeof row.heavenlyStem === 'string' ? row.heavenlyStem : ''
      const earthlyBranch = typeof row.earthlyBranch === 'string' ? row.earthlyBranch : ''
      const ganji =
        typeof row.ganji === 'string' && row.ganji
          ? row.ganji
          : `${heavenlyStem || ''}${earthlyBranch || ''}` || undefined
      const element =
        typeof row.element === 'string'
          ? row.element
          : heavenlyStem
            ? getElementByStemName(heavenlyStem)
            : undefined
      const isCurrent =
        row.current === true ||
        row.isCurrent === true ||
        (age !== null && age >= startAge && age <= endAge)
      windows.push({
        startAge,
        endAge,
        element,
        ganji,
        isCurrent,
      })
    }
  }

  if (windows.length === 0 && timingData?.daeun) {
    windows.push({
      startAge: timingData.daeun.startAge,
      endAge: timingData.daeun.endAge,
      element: timingData.daeun.element,
      ganji: `${timingData.daeun.heavenlyStem}${timingData.daeun.earthlyBranch}`,
      isCurrent:
        timingData.daeun.isCurrent ||
        (age !== null && age >= timingData.daeun.startAge && age <= timingData.daeun.endAge),
    })
  }

  return windows
    .sort((a, b) => a.startAge - b.startAge)
    .filter((item, index, array) => {
      const prev = array[index - 1]
      return !prev || prev.startAge !== item.startAge || prev.ganji !== item.ganji
    })
}

export function buildPersonalLifeTimelineNarrative(
  input: MatrixCalculationInput,
  timingData: TimingData | undefined,
  lang: 'ko' | 'en'
): string {
  const windows = extractPersonalDaeunWindows(input, timingData)
  const age = calculateProfileAge(input.profileContext?.birthDate, input.currentDateIso)
  if (windows.length === 0) return buildPersonalCycleNarrative(input, lang)
  const currentIndex = Math.max(
    0,
    windows.findIndex((item) => item.isCurrent)
  )
  const current = windows[currentIndex] || windows[0]
  const prev = currentIndex > 0 ? windows[currentIndex - 1] : null
  const next = currentIndex < windows.length - 1 ? windows[currentIndex + 1] : null
  const currentLabel = formatCycleLabel(
    current.ganji,
    current.element,
    lang,
    lang === 'ko' ? '현재 대운' : 'current 10-year cycle'
  )
  if (lang !== 'ko') {
    const currentAgeLine =
      age !== null
        ? `At around age ${age}, the active 10-year cycle is ${current.startAge}-${current.endAge} (${currentLabel}).`
        : `The active 10-year cycle is ${current.startAge}-${current.endAge} (${currentLabel}).`
    const prevLine = prev
      ? `The previous ${prev.startAge}-${prev.endAge} cycle set the habits you are now either carrying forward or editing.`
      : ''
    const nextLine = next
      ? `The next ${next.startAge}-${next.endAge} cycle is likely to shift emphasis toward ${formatCycleLabel(
          next.ganji,
          next.element,
          lang,
          'a different operating mode'
        )}, so this period should be used to prepare that handoff.`
      : ''
    return [currentAgeLine, prevLine, nextLine].filter(Boolean).join(' ')
  }

  const currentAgeLine =
    age !== null
      ? `현재 ${age}세 전후의 핵심 장기 흐름은 ${current.startAge}-${current.endAge}세 대운(${currentLabel})입니다. 이 구간이 인생 전체의 큰 기후를 정하고, 세운·월운·일운은 그 위에서 실제 사건의 속도와 체감 강도를 조절합니다.`
      : `${current.startAge}-${current.endAge}세 대운(${currentLabel})이 현재 장기 흐름의 중심입니다. 이 구간이 인생 전체의 큰 기후를 정하고, 세운·월운·일운은 그 위에서 실제 사건의 속도와 체감 강도를 조절합니다.`
  const prevLine = prev
    ? `${prev.startAge}-${prev.endAge}세 구간에서 굳어진 습관과 판단 기준이 지금 흐름의 출발점이 됩니다. 그래서 현재 대운은 새 기회를 여는 동시에, 예전 방식 중 무엇을 유지하고 무엇을 버릴지 다시 고르게 만듭니다.`
    : ''
  const nextLine = next
    ? `다음 ${next.startAge}-${next.endAge}세 대운(${next.ganji || next.element || '다음 장기 흐름'})으로 넘어가기 전까지는, 지금 구간에서 성과를 내는 방식과 다음 구간에 가져갈 기준을 구분해 두는 것이 중요합니다.`
    : ''
  return [currentAgeLine, prevLine, nextLine].filter(Boolean).join(' ')
}

export function calculateProfileAge(
  birthDate: string | undefined,
  currentDateIso: string | undefined
): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const current = currentDateIso ? new Date(currentDateIso) : new Date()
  if (Number.isNaN(birth.getTime()) || Number.isNaN(current.getTime())) return null
  let age = current.getUTCFullYear() - birth.getUTCFullYear()
  const currentMonthDay = current.toISOString().slice(5, 10)
  const birthMonthDay = birth.toISOString().slice(5, 10)
  if (currentMonthDay < birthMonthDay) age -= 1
  return age >= 0 ? age : null
}

export function formatPlanetPlacement(
  input: MatrixCalculationInput,
  planet: 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn',
  lang: 'ko' | 'en'
): string {
  const sign = input.planetSigns?.[planet]
  const house = input.planetHouses?.[planet]
  if (!sign && !house) return ''
  if (lang === 'ko') {
    const planetLabel = localizePlanetName(planet, lang)
    const signLabel = localizeSignName(String(sign || ''), lang)
    if (sign && house)
      return `${planetLabel}${hasBatchim(planetLabel) ? '은' : '는'} ${signLabel} ${house}하우스에 놓여 있습니다`
    if (sign) return `${planetLabel}${hasBatchim(planetLabel) ? '은' : '는'} ${signLabel}에 놓여 있습니다`
    return `${planetLabel}${hasBatchim(planetLabel) ? '은' : '는'} ${house}하우스에 놓여 있습니다`
  }
  if (sign && house) return `${planet} in ${sign}, house ${house}`
  if (sign) return `${planet} in ${sign}`
  return `${planet} in house ${house}`
}

export function buildPersonalCycleNarrative(
  input: MatrixCalculationInput,
  lang: 'ko' | 'en',
  timingData?: TimingData
): string {
  if (lang === 'ko' && timingData?.daeun) {
    return buildPersonalLifeTimelineNarrative(input, timingData, lang)
  }
  const age = calculateProfileAge(input.profileContext?.birthDate, input.currentDateIso)
  const parts = [
    input.currentDaeunElement
      ? lang === 'ko'
        ? `대운 ${input.currentDaeunElement}`
        : `Daeun ${getElementLabel(input.currentDaeunElement, lang)}`
      : '',
    input.currentSaeunElement
      ? lang === 'ko'
        ? `세운 ${input.currentSaeunElement}`
        : `annual cycle ${getElementLabel(input.currentSaeunElement, lang)}`
      : '',
    input.currentWolunElement
      ? lang === 'ko'
        ? `월운 ${input.currentWolunElement}`
        : `monthly cycle ${getElementLabel(input.currentWolunElement, lang)}`
      : '',
    input.currentIljinElement
      ? lang === 'ko'
        ? `일운 ${input.currentIljinElement}`
        : `daily cycle ${getElementLabel(input.currentIljinElement, lang)}`
      : '',
  ].filter(Boolean)
  if (lang === 'ko') {
    const agePart = age !== null ? `현재 ${age}세 전후` : '현재 구간'
    if (parts.length === 0) return `${agePart}는 타이밍 입력은 있으나 겹친 운의 이름이 약하게 포착된 상태입니다.`
    const normalizedParts = parts.map((part) => {
      const [cycle, element] = part.split(' ')
      if (!cycle || !element) return part
      return `${withSubjectParticle(`${cycle} ${element}`)}`
    })
    return `${agePart}는 ${normalizedParts.join(', ')} 겹쳐 작동하는 구간입니다. 큰 기후는 대운이 만들고, 세운과 월운이 실제 체감 강도를 조절합니다.`
  }
  const agePart = age !== null ? `Around age ${age}` : 'At the current phase'
  if (parts.length === 0)
    return `${agePart}, timing inputs are present but the active cycle names are only weakly captured.`
  return `${agePart}, ${parts.join(', ')} are overlapping. The long climate is set by the larger cycle, and yearly/monthly cycles adjust what becomes tangible.`
}

export function buildFocusedCycleLead(
  input: MatrixCalculationInput,
  timingData: TimingData | undefined,
  lang: 'ko' | 'en',
  focus: 'career' | 'wealth' | 'health' | 'lifeMission' | 'actionPlan' | 'conclusion'
): string {
  const windows = extractPersonalDaeunWindows(input, timingData)
  const current = windows.find((item) => item.isCurrent) || windows[0] || null
  const age = calculateProfileAge(input.profileContext?.birthDate, input.currentDateIso)
  const currentLabel =
    current && (current.ganji || current.element)
      ? `${current.ganji || ''}${current.element ? `(${current.element})` : ''}`
      : lang === 'ko'
        ? '현재 흐름'
        : 'current cycle'

  if (lang !== 'ko') {
    const agePrefix = age !== null ? `Around age ${age}, ` : 'At the current phase, '
    switch (focus) {
      case 'career':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} favors role clarity and priority control over broad expansion.`
      case 'wealth':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} rewards term checks and downside control before chasing upside.`
      case 'health':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} works better when recovery rhythm is protected before intensity.`
      case 'lifeMission':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} is a phase for refining standards you can carry into the next stage.`
      case 'actionPlan':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} is best managed by separating start, review, and commitment.`
      case 'conclusion':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} puts more value on clean sequencing than fast commitment.`
    }
  }

  const agePrefix = age !== null ? `현재 ${age}세 전후는 ` : '지금은 '
  const cycleLabel =
    current !== null ? `${current.startAge}-${current.endAge}세 대운(${currentLabel})` : currentLabel
  switch (focus) {
    case 'career':
      return `${agePrefix}${cycleLabel} 흐름 안에 있어 커리어 판단에서도 새 확장보다 역할·우선순위 정리가 먼저입니다.`
    case 'wealth':
      return `${agePrefix}${cycleLabel} 흐름 안에 있어 재정 판단에서는 수익 기대보다 조건 검토와 손실 상한 관리가 먼저입니다.`
    case 'health':
      return `${agePrefix}${cycleLabel} 흐름 안에 있어 건강 관리에서는 강한 가속보다 회복 리듬을 먼저 세우는 편이 맞습니다.`
    case 'lifeMission':
      return `${agePrefix}${cycleLabel} 흐름은 다음 장기 구간까지 가져갈 기준을 정리하고 반복 가능한 원칙을 남기는 데 의미가 큽니다.`
    case 'actionPlan':
      return `${agePrefix}${cycleLabel} 흐름에서는 실행을 착수-재확인-확정으로 나눌수록 결과 재현성이 올라갑니다.`
    case 'conclusion':
      return `${agePrefix}${cycleLabel} 흐름의 결론은 성급한 확정보다 기준 정리와 순서 설계가 더 큰 차이를 만든다는 점입니다.`
  }
}

export function buildPersonalBaseNarrative(input: MatrixCalculationInput, lang: 'ko' | 'en'): string {
  const dayMaster = sanitizeEvidenceToken(getElementLabel(input.dayMasterElement, lang), lang)
  const yongsin = sanitizeEvidenceToken(getElementLabel(input.yongsin, lang), lang)
  const western = sanitizeEvidenceToken(
    getWesternElementLabel(input.dominantWesternElement, lang),
    lang
  )
  const geokguk = sanitizeEvidenceToken(localizeGeokgukLabel(input.geokguk, lang), lang)

  if (lang === 'ko') {
    const parts = [
      dayMaster ? `일간 ${dayMaster}` : '',
      geokguk ? `격국 ${geokguk}` : '',
      yongsin ? `용신 ${yongsin}` : '',
      western ? `서양 원소 ${western}` : '',
    ].filter(Boolean)
    if (parts.length === 0) return '원국에서는 기본 구조보다 현재 활성 흐름과 실행 순서를 함께 보는 편이 맞습니다.'
    return `원국 기준으로는 ${parts.join(', ')} 흐름이 현재 판단의 바탕을 만듭니다.`
  }

  const parts = [
    dayMaster ? `day master ${dayMaster}` : '',
    geokguk ? `frame ${geokguk}` : '',
    yongsin ? `useful element ${yongsin}` : '',
    western ? `dominant western element ${western}` : '',
  ].filter(Boolean)
  if (parts.length === 0)
    return 'At the natal level, the base structure matters less than how the current phase is being activated.'
  return `At the natal level, ${parts.join(', ')} form the base layer behind the current reading.`
}

export function buildSectionPersonalLead(
  section:
    | 'introduction'
    | 'personalityDeep'
    | 'careerPath'
    | 'relationshipDynamics'
    | 'wealthPotential'
    | 'healthGuidance'
    | 'lifeMission'
    | 'timingAdvice'
    | 'actionPlan'
    | 'conclusion',
  input: MatrixCalculationInput,
  lang: 'ko' | 'en',
  timingData?: TimingData
): string {
  switch (section) {
    case 'introduction':
      return buildPersonalCycleNarrative(input, lang, timingData)
    case 'personalityDeep':
      return [
        buildPersonalBaseNarrative(input, lang),
        formatPlanetPlacement(input, 'Sun', lang),
        formatPlanetPlacement(input, 'Moon', lang),
        formatPlanetPlacement(input, 'Mercury', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'careerPath':
      return [
        buildFocusedCycleLead(input, timingData, lang, 'career'),
        formatPlanetPlacement(input, 'Jupiter', lang),
        formatPlanetPlacement(input, 'Saturn', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'relationshipDynamics':
      return [
        formatPlanetPlacement(input, 'Moon', lang),
        formatPlanetPlacement(input, 'Venus', lang),
        formatPlanetPlacement(input, 'Mars', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'wealthPotential':
      return [
        buildFocusedCycleLead(input, timingData, lang, 'wealth'),
        formatPlanetPlacement(input, 'Jupiter', lang),
        formatPlanetPlacement(input, 'Venus', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'healthGuidance':
      return [
        buildFocusedCycleLead(input, timingData, lang, 'health'),
        formatPlanetPlacement(input, 'Moon', lang),
        formatPlanetPlacement(input, 'Saturn', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'lifeMission':
      return [
        buildPersonalBaseNarrative(input, lang),
        buildFocusedCycleLead(input, timingData, lang, 'lifeMission'),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? ' ' : ' ')
    case 'timingAdvice':
      return buildPersonalLifeTimelineNarrative(input, timingData, lang)
    case 'actionPlan':
      return buildFocusedCycleLead(input, timingData, lang, 'actionPlan')
    case 'conclusion':
      return [
        buildPersonalBaseNarrative(input, lang),
        buildFocusedCycleLead(input, timingData, lang, 'conclusion'),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? ' ' : ' ')
    default:
      return ''
  }
}

export function buildNarrativeSectionFromCore(
  primary: Array<string | undefined | null>,
  supporting: Array<string | undefined | null>,
  base: string,
  lang: 'ko' | 'en',
  minChars: number,
  includeBase = false,
  allowBaseFallback = true
): string {
  const primaryLines = collectCleanNarrativeLines(primary, lang)
  const supportingLines = collectCleanNarrativeLines(supporting, lang)
  const baseLine = includeBase ? buildReportCoreLine(base, lang) : ''
  // 단락 구분(\n\n)이 있는 entry가 있으면 entry끼리도 \n\n로 연결해서 의도 보존
  const hasParagraphBreaks = primaryLines.some((l) => /\n\s*\n/.test(l))
  let out = primaryLines.join(hasParagraphBreaks ? '\n\n' : ' ').trim()

  if (baseLine && !out.includes(baseLine)) {
    out = out ? (hasParagraphBreaks ? `${out}\n\n${baseLine}` : `${out} ${baseLine}`) : baseLine
  }

  out = ensureLongSectionNarrative(out, minChars, supportingLines)
  if (allowBaseFallback && (!out || out.length < Math.floor(minChars * 0.7))) {
    out = ensureLongSectionNarrative(out, minChars, [sanitizeUserFacingNarrative(base)])
  }
  return formatNarrativeParagraphs(sanitizeUserFacingNarrative(out), lang)
}

function ensureLongSectionNarrative(base: string, minChars: number, extras: string[]): string {
  // base가 \n\n 단락 구분을 가지면 보존, 없으면 정규화
  const hasParagraphBreaks = /\n\s*\n/.test(base)
  let out = hasParagraphBreaks
    ? String(base || '').trim()
    : String(base || '').replace(/\s{2,}/g, ' ').trim()
  const uniqExtras = [...new Set(extras.map((v) => String(v || '').trim()).filter(Boolean))]
  for (const extra of uniqExtras) {
    if (out.length >= minChars) break
    if (out.includes(extra)) continue
    if (hasParagraphBreaks) {
      out = `${out}\n\n${extra}`.trim()
    } else {
      out = `${out} ${extra}`.replace(/\s{2,}/g, ' ').trim()
    }
  }
  return out
}

export function buildTimingWindowNarrative(
  domain: string,
  item: NonNullable<ReturnType<typeof findReportCoreTimingWindow>>,
  lang: 'ko' | 'en'
): string {
  const domainLabel = getReportDomainLabel(domain, lang)
  return describeHumanTimingWindowNarrative({
    domainLabel,
    window: item.window,
    whyNow: item.whyNow,
    entryConditions: item.entryConditions,
    abortConditions: item.abortConditions,
    timingGranularity: item.timingGranularity,
    precisionReason: item.precisionReason,
    timingConflictNarrative: item.timingConflictNarrative,
    lang,
  })
}

export function buildManifestationNarrative(
  item: NonNullable<ReturnType<typeof findReportCoreManifestation>>,
  lang: 'ko' | 'en'
): string {
  const expressions = [...(item.likelyExpressions || []), ...(item.riskExpressions || [])]
  if (lang === 'ko') {
    return [item.baselineThesis, item.activationThesis, item.manifestation, ...expressions]
      .filter(Boolean)
      .join(' ')
  }
  return [item.baselineThesis, item.activationThesis, item.manifestation, ...expressions]
    .filter(Boolean)
    .join(' ')
}

export function buildVerdictNarrative(
  item: NonNullable<ReturnType<typeof findReportCoreVerdict>>,
  lang: 'ko' | 'en'
): string {
  const allowed = (item.allowedActionLabels || item.allowedActions || [])
    .filter(Boolean)
    .slice(0, 2)
    .join(', ')
  const blocked = (item.blockedActionLabels || item.blockedActions || [])
    .filter(Boolean)
    .slice(0, 2)
    .join(', ')
  if (lang === 'ko') {
    const parts = [
      item.rationale,
      allowed ? `지금 허용되는 움직임은 ${allowed} 쪽입니다.` : '',
      blocked ? `반대로 ${blocked}는 지금 무리하게 밀지 않는 편이 맞습니다.` : '',
    ]
    return parts.filter(Boolean).join(' ')
  }
  const parts = [
    item.rationale,
    allowed ? `The moves currently allowed are ${allowed}.` : '',
    blocked ? `By contrast, ${blocked} should not be forced right now.` : '',
  ]
  return parts.filter(Boolean).join(' ')
}

export function buildPrimaryActionLead(
  action: string | undefined | null,
  fallback: string,
  lang: 'ko' | 'en'
): string {
  const value = buildReportCoreLine(action, lang)
  if (!value) return fallback
  if (/[.!?]\s*$/.test(value)) return value
  return lang === 'ko' ? `${value}에 힘을 두는 편이 맞습니다.` : `Lean into ${value}.`
}

export function buildPrimaryCautionLead(
  caution: string | undefined | null,
  fallback: string,
  lang: 'ko' | 'en'
): string {
  const value = buildReportCoreLine(caution, lang)
  if (!value) return fallback
  if (/[.!?]\s*$/.test(value)) return value
  return lang === 'ko' ? `${value}은 먼저 막는 편이 맞습니다.` : `Block ${value} first.`
}

export function findReportCoreDomainVerdict(reportCore: ReportCoreViewModel, domain: string) {
  return reportCore.domainVerdicts.find((item) => item.domain === domain) || null
}

export function formatScenarioIdForNarrative(
  scenarioId: string | null | undefined,
  lang: 'ko' | 'en'
): string {
  const value = String(scenarioId || '')
    .replace(/_window$/i, '')
    .replace(/_(main|alt|defensive)$/i, '')
    .trim()
  if (!value) return ''
  if (/(hidden|support|defensive|cluster|fallback|generic|alt|residual|residue)/i.test(value)) {
    return ''
  }

  const entries: Array<[RegExp, string, string]> = [
    [/promotion_review/i, '승진/역할 재검토', 'promotion or role review'],
    [/contract_negotiation/i, '조건 협의', 'contract negotiation'],
    [/manager_track/i, '관리 책임 확장', 'management-track expansion'],
    [/specialist_track/i, '전문성 심화', 'specialist-track deepening'],
    [/entry/i, '새 역할 진입', 'entry into a new role'],
    [/distance_tuning/i, '관계 거리 조정', 'distance tuning'],
    [/boundary_reset/i, '경계 재설정', 'boundary reset'],
    [/commitment_preparation/i, '관계 정의 준비', 'commitment preparation'],
    [/clarify_expectations/i, '기대치 명확화', 'expectation clarification'],
    [/commitment_execution/i, '관계 확정 실행', 'commitment execution'],
    [/cohabitation/i, '생활 결합 점검', 'cohabitation planning'],
    [/family_acceptance/i, '가족 수용 절차', 'family acceptance'],
    [/separation/i, '관계 분리 정리', 'relationship separation'],
    [/capital_allocation/i, '자금 배분 재검토', 'capital allocation review'],
    [/asset_exit/i, '자산 정리', 'asset exit'],
    [/debt_restructure/i, '부채 구조 재정리', 'debt restructuring'],
    [/income_growth/i, '수입 확장', 'income growth'],
    [/liquidity_defense/i, '유동성 방어', 'liquidity defense'],
    [/recovery_reset/i, '회복 리듬 재설정', 'recovery reset'],
    [/routine_lock/i, '루틴 고정', 'routine lock'],
    [/burnout_trigger/i, '번아웃 경고', 'burnout risk'],
    [/sleep_disruption/i, '수면 리듬 흔들림', 'sleep disruption'],
    [/commute_restructure/i, '동선 재설계', 'commute restructure'],
    [/route_recheck/i, '경로 재확인', 'route recheck'],
    [/basecamp_reset/i, '생활 거점 재정비', 'basecamp reset'],
    [/lease_decision/i, '계약 조건 검토', 'lease decision review'],
    [/housing_search/i, '거주 후보지 탐색', 'housing search'],
    [/relocation/i, '이동 결정', 'relocation'],
    [/learning_acceleration/i, '학습/역량 가속', 'learning acceleration'],
    [/deep_partnership_activation/i, '관계 심화 국면', 'deep partnership activation'],
    [/timing_upside/i, '상승 타이밍 집중', 'timing upside cluster'],
    [/timing_risk/i, '타이밍 변동 경계', 'timing risk cluster'],
    [/health_risk/i, '건강 경계 국면', 'health risk cluster'],
  ]

  for (const [pattern, ko, en] of entries) {
    if (pattern.test(value)) return lang === 'ko' ? ko : en
  }

  const normalized = value.replace(/_/g, ' ').trim()
  return lang === 'ko' ? normalized : normalized
}

export function formatCycleLabel(
  ganji: string | undefined,
  element: string | undefined,
  lang: 'ko' | 'en',
  fallback: string
): string {
  const ganjiLabel = String(ganji || '').trim()
  const elementLabel = getElementLabel(element, lang)
  if (ganjiLabel && elementLabel) return `${ganjiLabel} (${elementLabel})`
  if (ganjiLabel) return ganjiLabel
  if (elementLabel) return elementLabel
  return fallback
}

export function normalizeElementKey(element: string | undefined): string {
  const raw = String(element || '')
    .trim()
    .toLowerCase()
  const map: Record<string, string> = {
    wood: 'wood',

    fire: 'fire',

    earth: 'earth',

    metal: 'metal',

    water: 'water',
  }
  return map[raw] || raw
}

export function buildElementMetaphor(
  input: MatrixCalculationInput,
  lang: 'ko' | 'en'
): {
  archetype: string
  environment: string
  edge: string
  risk: string
} {
  const dayMaster = normalizeElementKey(input.dayMasterElement)
  switch (dayMaster) {
    case 'metal':
      return lang === 'ko'
        ? {
            archetype: '잡음을 잘라내는 칼날',
            environment: '복잡한 판에서 군더더기를 걷어내는 장면',
            edge: '정리와 절단력',
            risk: '지나치게 빨리 결론을 내릴 때 날이 무뎌지는 것',
          }
        : {
            archetype: 'a blade that cuts noise away',
            environment: 'a scene where clutter gets stripped from a crowded stage',
            edge: 'clarity and clean cuts',
            risk: 'dulling the edge by deciding too fast',
          }
    case 'wood':
      return lang === 'ko'
        ? {
            archetype: '판을 넓히며 자라는 큰 나무',
            environment: '가지가 퍼지듯 영향권을 넓히는 장면',
            edge: '확장과 성장력',
            risk: '뿌리 정리 없이 가지부터 늘리는 것',
          }
        : {
            archetype: 'a tree that expands by taking more ground',
            environment: 'a scene where influence spreads like branches',
            edge: 'growth and extension',
            risk: 'adding branches before stabilizing the roots',
          }
    case 'water':
      return lang === 'ko'
        ? {
            archetype: '빈틈을 찾아 흐르는 물길',
            environment: '막힌 곳 사이로 길을 만들어내는 장면',
            edge: '유연한 침투력',
            risk: '방향 없이 흘러 판단이 번지는 것',
          }
        : {
            archetype: 'a current that finds the opening',
            environment: 'a scene where a path forms through narrow gaps',
            edge: 'adaptive penetration',
            risk: 'spreading too thin without a fixed direction',
          }
    case 'fire':
      return lang === 'ko'
        ? {
            archetype: '순간에 판을 밝히는 불빛',
            environment: '모두가 망설일 때 장면을 선명하게 드러내는 순간',
            edge: '가시성과 추진력',
            risk: '열이 너무 빨라 번아웃으로 꺼지는 것',
          }
        : {
            archetype: 'a flame that lights the scene at once',
            environment: 'a moment that makes the whole stage visible',
            edge: 'visibility and momentum',
            risk: 'burning too hot and fading early',
          }
    default:
      return lang === 'ko'
        ? {
            archetype: '흔들리는 판을 붙잡는 축대',
            environment: '무너질 장면을 버티게 만드는 버팀목',
            edge: '지속력과 구조',
            risk: '움직일 타이밍까지 지나치게 늦추는 것',
          }
        : {
            archetype: 'a foundation that holds a shifting stage',
            environment: 'a support that keeps collapse from happening',
            edge: 'stability and structure',
            risk: 'delaying movement past the right timing',
          }
  }
}



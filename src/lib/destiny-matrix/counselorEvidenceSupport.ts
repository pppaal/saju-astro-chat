import type { FusionReport, InsightDomain } from '@/lib/destiny-matrix/interpreter/types'
import type { ReportEvidenceRef } from '@/lib/destiny-matrix/ai-report/evidenceRefs'
import type { GraphRAGDomain } from '@/lib/destiny-matrix/ai-report/graphRagEvidence'
import type {
  NormalizedSignal,
  SignalDomain,
  SignalSynthesisResult,
} from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
import type { UnifiedAnchor, UnifiedClaim } from '@/lib/destiny-matrix/ai-report/types'
import type { StrategyEngineResult } from '@/lib/destiny-matrix/ai-report/strategyEngine'
import {
  sanitizeCounselorFreeText,
  formatTransitLabels,
} from '@/lib/destiny-matrix/counselorEvidenceSanitizer'

export function uniq<T>(items: T[]): T[] {
  return [...new Set(items)]
}

export function buildDomainSpecificWhyReasons(input: {
  domain: string
  lang: 'ko' | 'en'
  yongsin?: string
  currentDaeunElement?: string
  geokguk?: string
  activeTransits?: string[]
  aspectsCount?: number
  graphFocusReason?: string
  graphReason?: string
  strategyLine?: string
  answerThesis?: string
}): {
  sajuWhy: string
  astroWhy: string
  crossWhy: string
  graphWhy: string
} {
  const {
    domain,
    lang,
    yongsin,
    currentDaeunElement,
    geokguk,
    activeTransits = [],
    aspectsCount = 0,
    graphFocusReason,
    graphReason,
    strategyLine,
    answerThesis,
  } = input

  if (lang !== 'ko') {
    const genericSaju =
      yongsin && currentDaeunElement
        ? yongsin === currentDaeunElement
          ? `the current 10-year cycle matches the useful element (${yongsin}), so the broader pattern is supportive`
          : `the current 10-year cycle (${currentDaeunElement}) does not fully match the useful element (${yongsin}), so pace control matters`
        : geokguk
          ? `the pattern frame (${geokguk}) sets the baseline temperament of this issue`
          : `the broader pattern sets the baseline direction of the issue`
    const genericAstro =
      activeTransits.length > 0
        ? `active transits like ${activeTransits.slice(0, 2).join(', ')} are changing timing and reaction speed`
        : aspectsCount > 0
          ? `the natal chart geometry explains which scene becomes visible first`
          : `astrology is mainly reinforcing timing and variable management`
    return {
      sajuWhy: genericSaju,
      astroWhy: genericAstro,
      crossWhy:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        'the overlapping signals point to the same decision axis first',
      graphWhy:
        graphReason ||
        'the top evidence bundle is ranked first because its overlap and fit are stronger than the surrounding sets',
    }
  }

  const byDomain: Record<
    string,
    {
      saju: string
      astro: string
      cross: string
      graph: string
    }
  > = {
    relationship: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `사주 쪽에서는 현재 큰 흐름이 관계의 진전 가능성을 받쳐주지만, 속도와 경계를 같이 관리해야 안정적으로 이어집니다.`
            : `사주 쪽에서는 관계 흐름은 열려 있어도 현재 대운과 용신의 결이 완전히 맞지 않아 속도 조절이 중요합니다.`
          : `사주 쪽에서는 관계 이슈가 살아 있지만, 감정 확정보다 기준 정리와 거리 조절이 먼저입니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 신호가 관계 반응 속도를 올리고 있어, 가까워질수록 확인 순서를 더 분명히 잡아야 합니다.`
          : `점성 쪽에서는 끌림은 보이지만, 기대치와 대화 리듬을 맞추지 않으면 오해가 커질 수 있습니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '그래서 관계 판단은 감정 몰입보다 경계와 기대치 조율을 먼저 두는 편이 맞습니다.',
      graph:
        graphReason || '교차 근거도 관계 진전보다 기준 정렬과 속도 조절을 우선하라고 말합니다.',
    },
    career: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `사주 쪽에서는 현재 큰 흐름이 커리어 확장과 역할 확보를 받쳐주므로, 조건만 정리되면 전진 여지가 큽니다.`
            : `사주 쪽에서는 커리어 기회는 살아 있지만, 지금은 속도보다 역할 범위와 책임선을 먼저 잠가야 합니다.`
          : `사주 쪽에서는 일 자체보다 역할 정의와 실행 조건을 먼저 정리하는 편이 맞습니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 신호가 커리어 트리거를 올리고 있어, 제안이 와도 조건 검토를 같이 붙여야 합니다.`
          : `점성 쪽에서는 기회 자체는 보이지만, 직무 범위와 협상력 확보 없이 확정하면 부담이 커질 수 있습니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '그래서 커리어 판단은 속도전보다 역할, 책임, 보상 조건을 함께 정리하는 편이 맞습니다.',
      graph:
        graphReason || '교차 근거도 지금은 커리어 확장을 보되 검토와 협상을 먼저 두라고 모입니다.',
    },
    wealth: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `사주 쪽에서는 현재 흐름이 용신(${yongsin})을 보완해 재정 구조를 다시 짜기 좋은 구간입니다. 다만 기대 수익보다 회수 조건을 먼저 봐야 합니다.`
            : `사주 쪽에서는 현재 대운(${currentDaeunElement})과 용신(${yongsin})의 결이 완전히 맞지 않아, 재정 확장보다 손실 통제가 먼저입니다.`
          : `사주 쪽에서는 돈의 크기보다 현금흐름, 만기, 상환 순서를 먼저 정리하라는 쪽에 가깝습니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 신호가 재정 변동성을 키우고 있어, 금액과 회수 조건을 같이 잠그는 쪽이 안전합니다.`
          : `점성 쪽에서는 확장 욕구는 있어도 만기, 손실 상한, 유동성 관리가 먼저입니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '그래서 재정 판단은 기대 수익보다 손실 상한과 회수 구조부터 닫아두는 편이 맞습니다.',
      graph: graphReason || '교차 근거도 수익 확대보다 변동성 관리와 조건 검토를 먼저 요구합니다.',
    },
    health: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `사주 쪽에서는 회복 여지는 있지만, 지금은 무리해서 성과를 더 내기보다 회복 순서를 먼저 잡아야 버틸 수 있습니다.`
            : `사주 쪽에서는 현재 대운(${currentDaeunElement})과 용신(${yongsin})의 결이 엇갈려, 몸이 버티는 척하다가 한 번에 꺾일 수 있습니다.`
          : `사주 쪽에서는 건강 문제를 의지로 미는 것보다 수면, 식사, 회복 리듬을 다시 세우는 게 먼저입니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 신호가 피로 누적과 과부하를 자극하고 있어, 일정 확장보다 회복 블록 확보가 우선입니다.`
          : `점성 쪽에서는 에너지가 들쭉날쭉해도 회복 루틴이 없으면 한 번에 무너질 가능성이 큽니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '그래서 건강 판단은 버티기보다 회복 순서와 부하 제한을 먼저 두는 편이 맞습니다.',
      graph: graphReason || '교차 근거도 건강 축에서는 회복 리듬 복구가 가장 우선이라고 모입니다.',
    },
    move: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `사주 쪽에서는 이동과 변화의 창이 열려 있어도, 경로와 일정 버퍼를 먼저 고정해야 오차를 줄일 수 있습니다.`
            : `사주 쪽에서는 이동 운은 살아 있지만 현재 대운(${currentDaeunElement})과 용신(${yongsin})의 결이 달라 성급한 결정은 흔들릴 수 있습니다.`
          : `사주 쪽에서는 방향을 바꾸더라도 경로, 비용, 거점 조건부터 다시 맞추는 편이 맞습니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 신호가 이동 결정을 자극하고 있어, 즉시 확정보다 단계와 재확인 지점을 남겨두는 편이 안전합니다.`
          : `점성 쪽에서는 변화 충동은 보이지만, 거점과 이동 비용을 정리하지 않으면 피로가 커질 수 있습니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '그래서 이동 판단은 속도보다 경로, 비용, 재확인 조건을 먼저 닫는 편이 맞습니다.',
      graph: graphReason || '교차 근거도 이동 자체보다 준비와 버퍼 확보를 먼저 두라고 말합니다.',
    },
    timing: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `사주 쪽에서는 현재 흐름이 맞물려 있어 타이밍 창이 열려 있지만, 지금 무엇을 먼저 할지 순서를 잘 잡아야 합니다.`
            : `사주 쪽에서는 시기 신호는 들어오지만 현재 대운(${currentDaeunElement})과 용신(${yongsin})의 결이 달라 한 박자 늦춘 검토가 필요합니다.`
          : `사주 쪽에서는 지금이 완전한 확정 시점이라기보다 창을 확인하고 조건을 닫아두는 시점에 가깝습니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 신호가 시기 압력을 올리고 있어, 빠른 결정보다 재확인 타이밍을 같이 잡는 편이 맞습니다.`
          : `점성 쪽에서는 창은 열려 있어도 타이밍 재검토가 필요한 구간으로 보입니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '그래서 타이밍 판단은 지금 창을 쓰되, 확정 전에 재확인 포인트를 남겨두는 편이 맞습니다.',
      graph: graphReason || '교차 근거도 지금은 시기 활용과 검증을 함께 가져가라고 모입니다.',
    },
    personality: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `사주 쪽에서는 기본 성향이 살아나기 좋은 흐름이라, 기준과 실행 방식이 비교적 선명하게 드러납니다.`
            : `사주 쪽에서는 현재 대운(${currentDaeunElement})과 용신(${yongsin})의 결이 엇갈려, 원래 성향보다 방어 반응이 더 크게 보일 수 있습니다.`
          : `사주 쪽에서는 이 사람의 기본 구조가 속도보다 기준, 감정보다 정렬을 중시하는 쪽에 가깝습니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 신호가 현재 반응 방식을 흔들고 있어, 평소보다 예민하거나 과한 판단이 나올 수 있습니다.`
          : `점성 쪽에서는 독립성은 강하지만, 피로가 쌓이면 거리 두기와 과검토로 기울 수 있습니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '그래서 성향 해석도 단일 성격보다, 기준과 방어 반응이 어떻게 같이 작동하는지로 보는 편이 맞습니다.',
      graph:
        graphReason ||
        '교차 근거도 이 사람을 성향 하나가 아니라 구조와 현재 반응의 조합으로 읽으라고 말합니다.',
    },
    spirituality: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `사주 쪽에서는 장기 방향을 다시 잡기 좋은 흐름이라, 어떤 기준으로 살지를 재정렬하기 좋습니다.`
            : `사주 쪽에서는 장기 방향성은 살아 있지만 현재 대운(${currentDaeunElement})과 용신(${yongsin})의 결이 달라 서두른 확정은 흔들릴 수 있습니다.`
          : `사주 쪽에서는 장기 방향을 정할 때도 외부 기대보다 자신의 기준과 감당 가능한 구조가 더 중요합니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 신호가 삶의 방향 질문을 자극하고 있어, 선택의 의미와 지속 가능성을 같이 봐야 합니다.`
          : `점성 쪽에서는 방향성 전환 욕구는 있어도, 실제 삶의 구조와 맞아야 오래 갑니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '그래서 장기 방향 판단은 감흥보다 지속 가능성과 삶의 구조 적합도를 먼저 보는 편이 맞습니다.',
      graph:
        graphReason || '교차 근거도 장기 방향은 의미와 구조를 함께 맞출 때 안정적이라고 말합니다.',
    },
  }

  const selected = byDomain[domain] || byDomain.personality
  return {
    sajuWhy: selected.saju,
    astroWhy: selected.astro,
    crossWhy: selected.cross,
    graphWhy: selected.graph,
  }
}

export function domainHintsForSection(sectionPath: string, focusDomain: string): string[] {
  switch (sectionPath) {
    case 'overview':
      return uniq([focusDomain, 'personality', 'timing'])
    case 'patterns':
      return uniq([focusDomain, 'personality'])
    case 'timing':
      return uniq(['timing', focusDomain])
    case 'recommendations':
    case 'actionPlan':
      return uniq([focusDomain, 'timing'])
    default:
      return [focusDomain]
  }
}

export function toEvidenceRefs(
  sectionPath: string,
  focusDomain: string,
  signalSynthesis: SignalSynthesisResult
): ReportEvidenceRef[] {
  const domainHints = domainHintsForSection(sectionPath, focusDomain)
  const selected = (signalSynthesis.selectedSignals || [])
    .slice()
    .sort((a, b) => b.rankScore - a.rankScore)
  const prioritized = selected.filter((signal) =>
    signal.domainHints.some((domain) => domainHints.includes(domain))
  )
  const fallback = selected.slice(0, 8)
  const source = (prioritized.length > 0 ? prioritized : fallback).slice(0, 8)

  return source.map((signal) => ({
    id: signal.id,
    domain: signal.domainHints[0],
    layer: signal.layer,
    rowKey: signal.rowKey,
    colKey: signal.colKey,
    keyword: signal.keyword,
    sajuBasis: signal.sajuBasis,
    astroBasis: signal.astroBasis,
    score: signal.score,
  }))
}

export function mergeUniqueSignals(signalSynthesis: SignalSynthesisResult): NormalizedSignal[] {
  const seen = new Set<string>()
  const ordered = [
    ...(signalSynthesis.selectedSignals || []),
    ...(signalSynthesis.normalizedSignals || []),
  ]
  const out: NormalizedSignal[] = []
  for (const signal of ordered) {
    if (!signal?.id || seen.has(signal.id)) continue
    seen.add(signal.id)
    out.push(signal)
  }
  return out
}

export function scoreCounselorSignal(
  signal: NormalizedSignal,
  focusDomain: string,
  sectionPath: string | undefined,
  isSelected: boolean
): number {
  const signalDomains = signal.domainHints || []
  const matchesFocusLead = signalDomains[0] === focusDomain
  const matchesFocusAny = signalDomains.some((domain) => domain === focusDomain)
  const sectionHints = sectionPath
    ? domainHintsForSection(sectionPath, focusDomain as InsightDomain)
    : []
  const matchesSectionLead =
    sectionHints.length > 0 && signalDomains[0] && sectionHints.includes(signalDomains[0])
  const matchesSectionAny = sectionHints.some((hint) =>
    signalDomains.some((domain) => domain === hint)
  )
  return (
    (matchesFocusLead ? 120 : 0) +
    (matchesFocusAny ? 80 : 0) +
    (matchesSectionLead ? 48 : 0) +
    (matchesSectionAny ? 24 : 0) +
    (isSelected ? 12 : 0) +
    signal.rankScore
  )
}

export function rankCounselorSignals(
  signalSynthesis: SignalSynthesisResult,
  focusDomain: string,
  sectionPath?: string
): NormalizedSignal[] {
  const selectedIds = new Set((signalSynthesis.selectedSignals || []).map((signal) => signal.id))
  return mergeUniqueSignals(signalSynthesis)
    .slice()
    .sort((a, b) => {
      const delta =
        scoreCounselorSignal(b, focusDomain, sectionPath, selectedIds.has(b.id)) -
        scoreCounselorSignal(a, focusDomain, sectionPath, selectedIds.has(a.id))
      if (delta !== 0) return delta
      return b.rankScore - a.rankScore
    })
}

export function summarizeAnchor(anchor: UnifiedAnchor): string {
  const normalized = anchor.crossEvidenceSummary.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 180) return normalized
  const candidate = normalized.slice(0, 180)
  const lastBoundary = Math.max(candidate.lastIndexOf(' '), candidate.lastIndexOf('|'))
  return `${candidate.slice(0, lastBoundary > 72 ? lastBoundary : 180).trim()}...`
}

export function summarizeClaim(claim: UnifiedClaim): string {
  return claim.text.replace(/\s+/g, ' ').trim().slice(0, 180)
}

export function compactCounselorNarrative(
  text: string | undefined,
  lang: 'ko' | 'en',
  maxSentences: number
): string {
  const cleaned = sanitizeCounselorFreeText(text, lang).replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (sentences.length === 0) return cleaned
  return sentences.slice(0, maxSentences).join(' ').trim()
}

export function isInsightDomain(domain: string): domain is InsightDomain {
  return (
    domain === 'personality' ||
    domain === 'career' ||
    domain === 'relationship' ||
    domain === 'wealth' ||
    domain === 'health' ||
    domain === 'spirituality' ||
    domain === 'timing'
  )
}

export function getGraphRagFocusDomain(domain: SignalDomain): GraphRAGDomain {
  if (domain === 'move') return 'move'
  return isInsightDomain(domain) ? domain : 'personality'
}

export function getCounselorDomainPriority(domain: SignalDomain): string[] {
  if (domain === 'move') return ['move', 'timing', 'spirituality']
  return [domain]
}

export function inferScenarioSectionHints(scenarioIds: string[]): string[] {
  const hints = new Set<string>()
  for (const id of scenarioIds) {
    const key = String(id || '').toLowerCase()
    if (!key) continue
    if (
      /boundary|distance|commitment|cohabitation|family_acceptance|reconciliation|separation|clarify/.test(
        key
      )
    ) {
      hints.add('relationshipDynamics')
      hints.add('actionPlan')
      hints.add('timing')
    }
    if (/promotion|contract|manager|specialist|authority|entry|restart|role/.test(key)) {
      hints.add('careerPath')
      hints.add('actionPlan')
      hints.add('timing')
    }
    if (/income|asset|capital|debt|expense|cashflow|pricing/.test(key)) {
      hints.add('wealthPotential')
      hints.add('actionPlan')
      hints.add('timing')
    }
    if (/recovery|burnout|sleep|inflammation|routine|load/.test(key)) {
      hints.add('recommendations')
      hints.add('actionPlan')
      hints.add('timing')
    }
    if (/travel|relocation|housing|lease|route|commute|basecamp|cross_border|foreign/.test(key)) {
      hints.add('timing')
      hints.add('actionPlan')
      hints.add('overview')
    }
  }
  return [...hints]
}

export function buildScenarioActionHints(
  scenarioIds: string[],
  lang: 'ko' | 'en',
  options?: {
    questionText?: string | null
  }
): string[] {
  const hints = new Set<string>()
  const questionText = String(options?.questionText || '').toLowerCase()
  const isLeaseQuestion =
    /lease|housing|rent|rental|deposit|contract|apartment|home base|living base|집|주거|계약|임대|전세|월세|보증금/.test(
      questionText
    )
  const isRouteQuestion = /route|commute|path|travel|direction|경로|동선|출퇴근|이동/.test(
    questionText
  )
  const isBaseQuestion = /base|basecamp|living base|settle|relocat|거점|기반|정착|이사/.test(
    questionText
  )

  if (isLeaseQuestion) {
    hints.add(
      lang === 'ko'
        ? '주거 계약 조건을 먼저 재확인하고 필요한 부분을 다시 협의하세요.'
        : 'review the lease terms, cost, and timing first'
    )
  }

  for (const id of scenarioIds) {
    const key = String(id || '').toLowerCase()
    if (!key) continue
    if (/clarify_expectations/.test(key)) {
      hints.add(
        lang === 'ko' ? '기대치와 기준부터 먼저 명확히 하세요.' : 'clarify expectations first'
      )
    }
    if (/distance_tuning/.test(key)) {
      hints.add(lang === 'ko' ? '거리와 속도부터 다시 조절하세요.' : 'tune distance and pace')
    }
    if (/boundary_reset/.test(key)) {
      hints.add(lang === 'ko' ? '경계선부터 다시 세우세요.' : 'reset the boundary')
    }
    if (/commitment_preparation/.test(key)) {
      hints.add(
        lang === 'ko'
          ? '관계 확정보다 준비와 기준 정리가 먼저입니다.'
          : 'prepare before defining commitment'
      )
    }
    if (/route_recheck/.test(key)) {
      hints.add(
        lang === 'ko'
          ? isLeaseQuestion
            ? '계약 전에 이동 경로와 실제 생활 동선을 다시 확인하세요.'
            : '경로와 방향부터 다시 확인하세요.'
          : isLeaseQuestion
            ? 'recheck the route and daily commute before signing'
            : 'recheck the route first'
      )
    }
    if (/commute_restructure/.test(key)) {
      hints.add(lang === 'ko' ? '이동 동선부터 다시 재정비하세요.' : 'restructure the commute')
    }
    if (/basecamp_reset/.test(key)) {
      hints.add(
        lang === 'ko' ? '거점과 생활 기반부터 다시 정리하세요.' : 'reset the base of operations'
      )
    }
    if (/lease_decision/.test(key)) {
      hints.add(
        lang === 'ko' ? '주거 조건과 계약 조항부터 다시 협의하세요.' : 'renegotiate the lease terms'
      )
    }
    if (/promotion_review/.test(key)) {
      hints.add(
        lang === 'ko'
          ? '승진 논의는 근거와 역할 범위부터 검토하세요.'
          : 'review the promotion case first'
      )
    }
    if (/contract_negotiation/.test(key)) {
      hints.add(lang === 'ko' ? '계약 조건부터 다시 협상하세요.' : 'negotiate the terms first')
    }
    if (/debt_restructure/.test(key)) {
      hints.add(
        lang === 'ko'
          ? '확장보다 부채 구조부터 먼저 재정리하세요.'
          : 'restructure the debt before expanding'
      )
    }
    if (/capital_allocation/.test(key)) {
      hints.add(
        lang === 'ko' ? '자금 배분부터 다시 검토하세요.' : 'review capital allocation first'
      )
    }
    if (/recovery_reset|recovery_compliance/.test(key)) {
      hints.add(
        lang === 'ko' ? '회복 루틴부터 다시 복구하세요.' : 'restore the recovery routine first'
      )
    }
  }
  if (isLeaseQuestion) {
    hints.add(
      lang === 'ko'
        ? '조건이 맞지 않으면 계약 확정을 미루고 다시 협상하세요.'
        : 'negotiate the terms before you lock the lease in'
    )
  } else if (isRouteQuestion) {
    hints.add(
      lang === 'ko'
        ? '경로를 비교한 뒤 실제 이동 부담을 다시 점검하세요.'
        : 'recheck the route before committing to the move'
    )
  } else if (isBaseQuestion) {
    hints.add(
      lang === 'ko'
        ? '큰 이동보다 생활 거점과 운영 기준부터 다시 정리하세요.'
        : 'reset the base of operations before the larger relocation'
    )
  }
  return [...hints].slice(0, 3)
}

export function buildPacketGuardrail(
  phase: StrategyEngineResult['overallPhase'],
  lang: 'ko' | 'en',
  focusDomain = 'personality'
): string {
  if (lang === 'ko') {
    if (focusDomain === 'wealth') {
      if (phase === 'expansion') return '수익 기대보다 금액, 회수 시점, 손실 상한을 먼저 잠그세요.'
      if (phase === 'high_tension_expansion')
        return '투자 비중을 늘리기 전에 현금흐름과 계약 문구를 먼저 재확인하세요.'
      if (phase === 'expansion_guarded')
        return '수익 구조가 보여도 누수와 상환 압박부터 먼저 정리하세요.'
      if (phase === 'stabilize') return '새 베팅보다 지출 구조와 상환 순서를 먼저 안정화하세요.'
      return '기대 수익보다 손실 상한, 만기, 회수 조건부터 먼저 닫으세요.'
    }
    if (focusDomain === 'health') {
      if (phase === 'expansion') return '버티기보다 수면, 식사, 회복 블록을 먼저 고정하세요.'
      if (phase === 'high_tension_expansion')
        return '과부하 신호가 있는 동안은 일정 확장보다 회복 리듬 복구를 우선하세요.'
      if (phase === 'expansion_guarded')
        return '컨디션이 올라와도 무리한 반등보다 부하 제한을 먼저 지키세요.'
      if (phase === 'stabilize') return '회복 루틴이 자리잡기 전까지는 새 자극을 늘리지 마세요.'
      return '의지로 버티기보다 과부하 신호와 회복 순서를 먼저 점검하세요.'
    }
    if (focusDomain === 'relationship') {
      if (phase === 'expansion') return '감정 해석보다 속도, 경계, 확인 순서를 먼저 맞추세요.'
      if (phase === 'high_tension_expansion')
        return '가까워질수록 답을 재촉하지 말고 약속 강도와 기대치를 먼저 확인하세요.'
      if (phase === 'expansion_guarded')
        return '진전 신호가 있어도 관계 정의를 서두르지 말고 반응을 더 보세요.'
      if (phase === 'stabilize')
        return '대화 흐름이 안정되기 전까지 감정 단정과 몰아붙이기를 피하세요.'
      return '추측으로 확신하지 말고 대화 순서와 경계를 먼저 다시 맞추세요.'
    }
    if (focusDomain === 'career') {
      if (phase === 'expansion') return '기회가 와도 역할, 책임, 마감 조건을 먼저 문서로 닫으세요.'
      if (phase === 'high_tension_expansion')
        return '속도를 내더라도 조건 협상과 검토 체크리스트는 생략하지 마세요.'
      if (phase === 'expansion_guarded')
        return '좋아 보이는 제안도 권한과 책임선이 흐리면 바로 확정하지 마세요.'
      if (phase === 'stabilize') return '새 기회보다 현재 구조와 우선순위부터 다시 정리하세요.'
      return '기회보다 역할 범위와 검토 순서를 먼저 고정하세요.'
    }
    if (focusDomain === 'move' || focusDomain === 'timing') {
      if (phase === 'expansion') return '결심보다 경로, 일정 버퍼, 확인 포인트를 먼저 확보하세요.'
      if (phase === 'high_tension_expansion')
        return '이동이나 큰 변경은 한 번에 확정하지 말고 단계와 재확인 지점을 남겨두세요.'
      if (phase === 'expansion_guarded')
        return '방향은 보여도 바로 옮기기보다 경로와 비용부터 다시 보세요.'
      if (phase === 'stabilize') return '창이 다시 열릴 때까지 일정과 버퍼를 먼저 정리하세요.'
      return '속도보다 시점, 경로, 재확인 조건을 먼저 맞추세요.'
    }
    if (phase === 'expansion') return '전진해도 되지만, 확정 전에 반드시 한 번 더 검증하세요.'
    if (phase === 'high_tension_expansion')
      return '속도는 유지하되 문서, 돈, 약속을 다시 확인하세요.'
    if (phase === 'expansion_guarded')
      return '기회는 있어도 체크리스트를 닫기 전엔 확정하지 마세요.'
    if (phase === 'stabilize') return '새 확장보다 현재 구조와 기준 정렬을 먼저 끝내세요.'
    return '손실, 혼선, 과속부터 줄인 뒤 다음 행동으로 넘어가세요.'
  }

  if (focusDomain === 'wealth') {
    if (phase === 'expansion')
      return 'Lock the amount, loss cap, and exit timing before leaning into upside.'
    if (phase === 'high_tension_expansion')
      return 'Before increasing exposure, recheck cash flow, contract language, and loss limits.'
    if (phase === 'expansion_guarded')
      return 'Even when upside looks real, close leakage and debt pressure first.'
    if (phase === 'stabilize')
      return 'Stabilize spending structure and repayment order before new bets.'
    return 'Prioritize loss caps, maturity dates, and recovery terms over expected upside.'
  }
  if (focusDomain === 'health') {
    if (phase === 'expansion')
      return 'Protect sleep, meals, and recovery blocks before pushing harder.'
    if (phase === 'high_tension_expansion')
      return 'While overload is active, restore recovery rhythm before adding more demand.'
    if (phase === 'expansion_guarded')
      return 'Even if energy rises, keep load limits in place before pushing.'
    if (phase === 'stabilize')
      return 'Do not add new strain until recovery routines are stable again.'
    return 'Check overload signals and recovery order before relying on willpower.'
  }
  if (focusDomain === 'relationship') {
    if (phase === 'expansion')
      return 'Set pace, boundaries, and confirmation order before escalating closeness.'
    if (phase === 'high_tension_expansion')
      return 'Do not force answers; verify expectations and commitment strength first.'
    if (phase === 'expansion_guarded')
      return 'Even with progress, do not rush the relationship definition yet.'
    if (phase === 'stabilize')
      return 'Avoid emotional certainty until the conversation rhythm stabilizes.'
    return 'Recheck boundaries and conversation order before trusting momentum.'
  }
  if (focusDomain === 'career') {
    if (phase === 'expansion')
      return 'Document role scope, authority, and deadlines before committing.'
    if (phase === 'high_tension_expansion')
      return 'Keep the momentum, but do not skip condition review or negotiation steps.'
    if (phase === 'expansion_guarded')
      return 'Do not finalize offers with vague authority or blurred responsibility.'
    if (phase === 'stabilize') return 'Reorder the current structure before opening a new push.'
    return 'Fix the role scope and review sequence before chasing the opportunity.'
  }
  if (focusDomain === 'move' || focusDomain === 'timing') {
    if (phase === 'expansion')
      return 'Secure route, timing buffer, and verification points before moving.'
    if (phase === 'high_tension_expansion')
      return 'Do not lock the move in one shot; keep stages and recheck points intact.'
    if (phase === 'expansion_guarded')
      return 'The direction is visible, but recheck route and cost before acting.'
    if (phase === 'stabilize') return 'Reset timing buffer and route clarity before the next move.'
    return 'Prioritize timing, route, and recheck conditions over speed.'
  }
  if (phase === 'expansion') return 'Move forward, but force one counter-check before committing.'
  if (phase === 'high_tension_expansion')
    return 'Keep momentum, but double-check documents, money, and commitments first.'
  if (phase === 'expansion_guarded')
    return 'Take the opportunity only after your checklist is complete.'
  if (phase === 'stabilize') return 'Prioritize structural alignment before new expansion.'
  return 'Contain loss, confusion, and overspeed before starting something new.'
}

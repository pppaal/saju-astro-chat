import type { MonthlyOverlapPoint } from '@/lib/destiny-matrix/types'
import type { SignalDomain } from './signalSynthesizer'
import type {
  BuildCoreCanonicalOutputInput,
  CoreDomainTimingWindow,
  CoreDomainVerdict,
} from './types'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
export function resolveTimingConflictProfile(input: {
  lang: 'ko' | 'en'
  readinessScore: number
  triggerScore: number
  convergenceScore: number
  domain: string
}): {
  timingConflictMode: 'aligned' | 'readiness_ahead' | 'trigger_ahead' | 'weak_both'
  timingConflictNarrative: string
} {
  const gap = input.readinessScore - input.triggerScore
  const domainLabel = input.domain

  if (input.readinessScore < 0.32 && input.triggerScore < 0.32) {
    return {
      timingConflictMode: 'weak_both',
      timingConflictNarrative:
        input.lang === 'ko'
          ? `${domainLabel}은 구조 지지와 촉발 신호가 모두 약해, 사건을 좁혀 보기보다 판이 살아나는지부터 관찰하는 편이 맞습니다.`
          : `${domainLabel} has weak structural support and weak triggering pressure, so the right move is to watch for activation before narrowing the timeline.`,
    }
  }

  if (gap >= 0.18) {
    return {
      timingConflictMode: 'readiness_ahead',
      timingConflictNarrative:
        input.lang === 'ko'
          ? `${domainLabel}은 구조 지지는 먼저 열려 있지만 촉발 신호가 아직 좁지 않아, 지금은 실행보다 준비와 검토가 더 맞습니다.`
          : `${domainLabel} has structural readiness before a clean trigger, so preparation and staged review fit better than immediate execution.`,
    }
  }

  if (gap <= -0.18) {
    return {
      timingConflictMode: 'trigger_ahead',
      timingConflictNarrative:
        input.lang === 'ko'
          ? `${domainLabel}은 촉발은 강하지만 구조 지지가 뒤따르지 않아, 사건성은 있어도 지속성은 약할 수 있습니다.`
          : `${domainLabel} has a live trigger before full structural support, so event pressure may be real while long-term sustainability stays weaker.`,
    }
  }

  return {
    timingConflictMode: 'aligned',
    timingConflictNarrative:
      input.lang === 'ko'
        ? `${domainLabel}은 구조 지지와 촉발 신호가 비교적 같은 방향으로 맞물려, 준비와 실행 리듬을 함께 잡을 수 있는 구간입니다.`
        : `${domainLabel} shows structural support and trigger pressure moving in the same direction, so timing can be staged without fighting the underlying trend.`,
  }
}

const TIMING_WINDOW_ORDER: CoreDomainTimingWindow['window'][] = ['now', '1-3m', '3-6m', '6-12m', '12m+']

function shiftTimingWindow(
  window: CoreDomainTimingWindow['window'],
  direction: -1 | 1
): CoreDomainTimingWindow['window'] {
  const currentIndex = TIMING_WINDOW_ORDER.indexOf(window)
  if (currentIndex === -1) return window
  const nextIndex = clamp(currentIndex + direction, 0, TIMING_WINDOW_ORDER.length - 1)
  return TIMING_WINDOW_ORDER[nextIndex] || window
}

export function resolveDomainTimingWindow(input: {
  domain: SignalDomain
  window: CoreDomainTimingWindow['window']
  readinessScore: number
  triggerScore: number
  convergenceScore: number
  hasScenario: boolean
}): CoreDomainTimingWindow['window'] {
  if (input.hasScenario) return input.window

  const { domain, readinessScore, triggerScore, convergenceScore } = input
  let window = input.window

  if (domain === 'career') {
    if (readinessScore >= 0.72 && convergenceScore >= 0.66 && window === '6-12m') {
      window = '3-6m'
    } else if (triggerScore + 0.16 < readinessScore && window === '1-3m') {
      window = '3-6m'
    }
  } else if (domain === 'relationship') {
    if (triggerScore >= 0.68 && convergenceScore >= 0.6 && window === '3-6m') {
      window = '1-3m'
    } else if (readinessScore < 0.38 && window !== '12m+') {
      window = shiftTimingWindow(window, 1)
    }
  } else if (domain === 'wealth') {
    if (triggerScore >= 0.62 && convergenceScore < 0.5) {
      window = shiftTimingWindow(window, 1)
    } else if (readinessScore >= 0.72 && convergenceScore >= 0.66 && window === '6-12m') {
      window = '3-6m'
    }
  } else if (domain === 'health') {
    if ((triggerScore >= 0.58 || readinessScore <= 0.42) && window === '6-12m') {
      window = '3-6m'
    } else if ((triggerScore >= 0.68 || readinessScore <= 0.34) && window === '3-6m') {
      window = '1-3m'
    }
  } else if (domain === 'move') {
    if (window === 'now') {
      window = '1-3m'
    }
    if (convergenceScore < 0.55) {
      window = shiftTimingWindow(window, 1)
    } else if (
      readinessScore >= 0.7 &&
      triggerScore >= 0.62 &&
      convergenceScore >= 0.65 &&
      window === '6-12m'
    ) {
      window = '3-6m'
    }
  }

  return window
}

export function resolveDomainTimingGranularity(input: {
  domain: SignalDomain
  window: CoreDomainTimingWindow['window']
}): CoreDomainTimingWindow['timingGranularity'] {
  const baseByWindow: Record<
    CoreDomainTimingWindow['window'],
    CoreDomainTimingWindow['timingGranularity']
  > = {
    now: 'week',
    '1-3m': 'month',
    '3-6m': 'month',
    '6-12m': 'season',
    '12m+': 'season',
  }

  if (input.domain === 'relationship') {
    if (input.window === 'now' || input.window === '1-3m') return 'fortnight'
  } else if (input.domain === 'career') {
    if (input.window === '1-3m') return 'fortnight'
  } else if (input.domain === 'health') {
    if (input.window === 'now' || input.window === '1-3m') return 'week'
    if (input.window === '3-6m') return 'month'
  } else if (input.domain === 'move') {
    if (input.window === '1-3m') return 'month'
    if (input.window === '3-6m' || input.window === '6-12m' || input.window === '12m+') {
      return 'season'
    }
  }

  return baseByWindow[input.window] || 'season'
}

export function buildDomainTimingWhyNow(input: {
  lang: 'ko' | 'en'
  domain: SignalDomain
  overlapPoint?: MonthlyOverlapPoint | null
  mode?: CoreDomainVerdict['mode'] | null
}): string {
  const { lang, domain, overlapPoint, mode } = input
  const hasOverlap = Boolean(overlapPoint)

  if (lang === 'ko') {
    const month = overlapPoint?.month || '이 구간'
    switch (domain) {
      case 'career':
        return hasOverlap
          ? `커리어는 ${month} 전후로 역할·평가 축이 다시 정렬되며 실행 창이 열립니다.`
          : mode === 'prepare'
            ? '커리어는 지금 당장 확장보다 역할, 기준, 책임선을 먼저 고정해야 타이밍이 살아납니다.'
            : '커리어는 실행 압력보다 승인 구조와 역할 정렬이 먼저 맞아야 속도를 올릴 수 있습니다.'
      case 'relationship':
        return hasOverlap
          ? `관계는 ${month} 전후로 연락 리듬과 기대치가 맞물릴 때 실제 진전 창이 열립니다.`
          : mode === 'prepare'
            ? '관계는 결론을 서두르기보다 속도, 거리, 기대치를 먼저 맞출 때 타이밍이 선명해집니다.'
            : '관계는 감정 강도보다 페이스와 경계가 일치할 때 움직이는 편이 맞습니다.'
      case 'wealth':
        return hasOverlap
          ? `재정은 ${month} 전후로 현금흐름과 조건 정렬이 붙을 때 집행 창이 열립니다.`
          : mode === 'prepare'
            ? '재정은 수익 기대보다 손실 상한과 조건 정리가 먼저 서야 타이밍이 안전해집니다.'
            : '재정은 기회 자체보다 계약 조건과 유입 구조가 같이 맞물릴 때 움직이는 편이 안전합니다.'
      case 'health':
        return hasOverlap
          ? `건강은 ${month} 전후로 회복 리듬과 과부하 신호가 같이 드러나 점검 창이 가까워집니다.`
          : mode === 'prepare'
            ? '건강은 버티는 것보다 회복 슬롯과 과부하 신호를 먼저 잡아야 타이밍 판단이 정확해집니다.'
            : '건강은 큰 결론보다 피로 누적과 회복 반응을 짧은 간격으로 보는 편이 맞습니다.'
      case 'move':
        return hasOverlap
          ? `이동은 ${month} 전후로 경로·거점·생활 동선이 맞아떨어질 때 실제 이동 창이 열립니다.`
          : mode === 'prepare'
            ? '이동은 일정 확정보다 경로, 비용, 생활 거점이 먼저 검증돼야 타이밍이 붙습니다.'
            : '이동은 속도보다 경로 검증과 생활 동선 정리가 먼저 맞을 때 움직여야 손실이 줄어듭니다.'
      default:
        return hasOverlap
          ? `${domain} 영역은 ${month} 전후로 겹침 강도가 올라 timing window가 열립니다.`
          : `${domain} 영역은 현재 국면과 도메인 주도권 기준으로 당장 확정보다 조건 정리가 먼저 필요한 구간입니다.`
    }
  }

  const month = overlapPoint?.month || 'this phase'
  switch (domain) {
    case 'career':
      return hasOverlap
        ? `Career opens around ${month} as role definition and evaluation pressure line up.`
        : mode === 'prepare'
          ? 'Career timing improves after role, standards, and responsibility are locked before expansion.'
          : 'Career moves best when approval structure and role alignment are in place before acceleration.'
    case 'relationship':
      return hasOverlap
        ? `Relationship timing opens around ${month} when cadence and expectations start lining up.`
        : mode === 'prepare'
          ? 'Relationship timing becomes clearer after pace, distance, and expectations are aligned first.'
          : 'Relationship moves best when boundaries and pace line up before commitment pressure rises.'
    case 'wealth':
      return hasOverlap
        ? `Wealth timing opens around ${month} when cash flow and terms start aligning.`
        : mode === 'prepare'
          ? 'Wealth timing becomes safer after downside, terms, and leakage are clarified first.'
          : 'Wealth moves best when contract terms and inflow structure support the opportunity.'
    case 'health':
      return hasOverlap
        ? `Health timing tightens around ${month} as recovery rhythm and overload signals become easier to read.`
        : mode === 'prepare'
          ? 'Health timing gets clearer after recovery slots and overload signals are tracked first.'
          : 'Health is better read through shorter recovery checks than through one big conclusion.'
    case 'move':
      return hasOverlap
        ? `Movement timing opens around ${month} when route, base, and living logistics start lining up.`
        : mode === 'prepare'
          ? 'Movement timing improves after route, cost, and living logistics are verified before commitment.'
          : 'Movement works best when route validation is stronger than urgency.'
    default:
      return hasOverlap
        ? `${domain} is entering a stronger timing window around ${month}.`
        : `${domain} currently needs condition-setting before hard commitment.`
  }
}

export function buildDomainTimingPrecisionReason(input: {
  lang: 'ko' | 'en'
  domain: SignalDomain
  timingGranularity: CoreDomainTimingWindow['timingGranularity']
}): string {
  const { lang, domain, timingGranularity } = input
  if (lang === 'ko') {
    if (domain === 'relationship') {
      if (timingGranularity === 'fortnight') {
        return '관계는 감정보다 페이스 확인이 중요해 2주 단위로 보는 편이 더 안전합니다.'
      }
    } else if (domain === 'career') {
      if (timingGranularity === 'fortnight') {
        return '커리어는 승인과 역할 조정 리듬이 있어 2주 단위 점검이 더 현실적입니다.'
      }
    } else if (domain === 'health') {
      if (timingGranularity === 'week') {
        return '건강은 회복 반응을 짧게 봐야 해서 주 단위 점검 상한으로 두는 편이 맞습니다.'
      }
    } else if (domain === 'move') {
      if (timingGranularity === 'season') {
        return '이동은 경로와 생활 조건 검증이 함께 필요해 계절 단위 상한으로 보는 편이 안전합니다.'
      }
    }

    return timingGranularity === 'week'
      ? '단기 신호는 보이지만, 표현 정밀도는 주 단위 상한으로 제한합니다.'
      : timingGranularity === 'fortnight'
        ? '조건 확인과 실행 리듬이 함께 움직여 2주 단위 상한으로 보는 편이 맞습니다.'
        : timingGranularity === 'month'
          ? '구조 지지가 더 넓어 월 단위 상한으로 해석하는 편이 맞습니다.'
          : '지금은 구조적 흐름을 읽는 구간이라 계절 단위 상한으로 보는 편이 안전합니다.'
  }

  if (domain === 'relationship' && timingGranularity === 'fortnight') {
    return 'Relationship timing is safer at a fortnight cadence because pace alignment matters more than one-off intensity.'
  }
  if (domain === 'career' && timingGranularity === 'fortnight') {
    return 'Career timing works better at a fortnight cadence because approval and role alignment move in stages.'
  }
  if (domain === 'health' && timingGranularity === 'week') {
    return 'Health timing is capped at week-level because recovery response needs tighter observation.'
  }
  if (domain === 'move' && timingGranularity === 'season') {
    return 'Movement timing stays capped at season-level because route and living logistics need broader validation.'
  }

  return timingGranularity === 'week'
    ? 'Short-term signals are visible, but the wording is capped at week-level.'
    : timingGranularity === 'fortnight'
      ? 'The signal is best read in two-week steps rather than through same-day precision.'
      : timingGranularity === 'month'
        ? 'Structural support is broader than the trigger, so month-level is the safe cap.'
        : 'This is treated as a structural window, so the safe cap stays at season-level.'
}

export function buildDomainTimingEntryConditions(input: {
  lang: 'ko' | 'en'
  domain: SignalDomain
}): string[] {
  if (input.lang === 'ko') {
    switch (input.domain) {
      case 'career':
        return [
          '역할, 책임, 평가 기준 중 최소 1개가 문서나 합의로 고정될 때',
          '승인 라인이나 의사결정자가 실제로 열려 있을 때',
          '확장보다 현재 우선순위가 먼저 정리될 때',
        ]
      case 'relationship':
        return ['연락 리듬이 일정할 때', '기대치와 경계가 말로 확인될 때', '감정 표현과 실제 행동 속도가 크게 어긋나지 않을 때']
      case 'wealth':
        return ['손실 상한이 먼저 정해질 때', '기한·금액·취소 조건이 분명할 때', '현금흐름을 흔드는 변수부터 분리했을 때']
      case 'health':
        return ['회복 슬롯이 일정에 실제로 들어갈 때', '피로·통증·수면 같은 경고 신호를 기록할 때', '강도보다 반복 가능성이 먼저 확보될 때']
      case 'move':
        return ['경로와 생활 동선이 먼저 검증될 때', '비용과 계약 조건이 따로 확인될 때', '현재 거점에서 빠져야 할 이유가 명확할 때']
      default:
        return ['핵심 조건 1개를 먼저 문장으로 고정', '바로 확정하지 말고 검증 단계를 먼저 통과', '주도 도메인 기준선과 충돌하는 행동은 제외']
    }
  }

  switch (input.domain) {
    case 'career':
      return [
        'At least one of role, responsibility, or evaluation standard is explicitly fixed',
        'The approval line is actually open',
        'Priorities are cleaned up before expansion pressure takes over',
      ]
    case 'relationship':
      return [
        'Communication cadence stays steady',
        'Expectations and boundaries are spoken out loud',
        'Emotional tone and real behavior are not moving in opposite directions',
      ]
    case 'wealth':
      return [
        'The downside cap is explicit first',
        'Terms, deadline, and cancellation conditions are clear',
        'Cash-flow risks are separated before upside is chased',
      ]
    case 'health':
      return [
        'Recovery blocks are actually on the schedule',
        'Fatigue, pain, or sleep signals are being tracked',
        'Repeatability is stronger than intensity',
      ]
    case 'move':
      return [
        'Route and living logistics are verified first',
        'Cost and contract conditions are checked separately',
        'The reason to leave the current base is explicit',
      ]
    default:
      return [
        'Lock one condition first',
        'Pass a verification step before commitment',
        'Exclude moves that conflict with the lead-domain baseline',
      ]
  }
}

export function buildDomainTimingAbortConditions(input: {
  lang: 'ko' | 'en'
  domain: SignalDomain
}): string[] {
  if (input.lang === 'ko') {
    switch (input.domain) {
      case 'career':
        return ['역할이나 책임 범위가 다시 흔들릴 때', '승인권자나 평가 기준이 바뀔 때', '성과보다 정치 비용이 더 커질 때']
      case 'relationship':
        return ['연락 리듬이 계속 끊길 때', '경계나 기대치가 다시 흐려질 때', '말과 행동의 방향이 반복해서 어긋날 때']
      case 'wealth':
        return ['손실 상한이 다시 열릴 때', '현금흐름이 흔들릴 때', '조건이 갑자기 유리한 말로만 바뀔 때']
      case 'health':
        return ['피로나 통증 신호가 누적될 때', '회복 슬롯이 계속 무너질 때', '단기 버팀이 장기 회복보다 우선될 때']
      case 'move':
        return ['경로나 생활 거점 조건이 다시 바뀔 때', '비용이 예상보다 커질 때', '이동 이유보다 조급함이 더 커질 때']
      default:
        return ['신뢰가 더 낮아질 때', '핵심 조건이 바뀔 때', '반복 경고 신호가 늘어날 때']
    }
  }

  switch (input.domain) {
    case 'career':
      return [
        'Role or responsibility scope starts moving again',
        'Approval owner or evaluation criteria change',
        'Political cost grows faster than real progress',
      ]
    case 'relationship':
      return [
        'Communication cadence keeps breaking',
        'Boundaries or expectations become blurry again',
        'Words and actions keep diverging',
      ]
    case 'wealth':
      return [
        'The downside cap reopens',
        'Cash flow becomes unstable',
        'The terms suddenly improve only in words',
      ]
    case 'health':
      return [
        'Fatigue or pain signals keep stacking',
        'Recovery blocks keep collapsing',
        'Short-term endurance starts beating long-term recovery',
      ]
    case 'move':
      return [
        'Route or living-base conditions change again',
        'Cost rises past the expected range',
        'Urgency becomes stronger than the reason to move',
      ]
    default:
      return [
        'When confidence drops further',
        'When the key condition changes',
        'When repeated caution signals increase',
      ]
  }
}

export function buildTimingHintByDomain(
  input: BuildCoreCanonicalOutputInput,
  focusDomain: string
): string {
  const scenarioWindow =
    (input.scenarios || []).find((scenario) => scenario.domain === focusDomain)?.window ||
    input.scenarios[0]?.window
  if (scenarioWindow) return scenarioWindow

  const overlapMonth = (input.matrixSummary?.overlapTimeline || [])[0]?.month
  return overlapMonth || 'now'
}


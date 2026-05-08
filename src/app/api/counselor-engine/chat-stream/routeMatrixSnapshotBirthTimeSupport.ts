import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'

export function shouldBuildPreciseTiming(theme: string, needsPreciseTiming = false): boolean {
  if (needsPreciseTiming) return true
  return theme === 'today' || theme === 'month' || theme === 'year' || theme === 'life'
}

type BirthTimeCoreCue = {
  directAnswer?: string
  actionDomain?: string
  riskDomain?: string
  bestWindow?: string
  branchSummary?: string
}

export async function enrichBirthTimeCandidatesWithCoreDiff(params: {
  candidates: NonNullable<
    NonNullable<
      NonNullable<MatrixCalculationInput['profileContext']>['birthTimeRectification']
    >['candidates']
  >
  currentBirthTime: string
  currentSnapshot: BirthTimeCoreCue
  fetchCandidateSnapshot: (candidateBirthTime: string) => Promise<BirthTimeCoreCue | null>
  locale: 'ko' | 'en'
}): Promise<
  NonNullable<
    NonNullable<
      NonNullable<MatrixCalculationInput['profileContext']>['birthTimeRectification']
    >['candidates']
  >
> {
  return Promise.all(
    params.candidates.map(async (candidate, index) => {
      const cue =
        candidate.birthTime === params.currentBirthTime
          ? params.currentSnapshot
          : index <= 1
            ? await params.fetchCandidateSnapshot(candidate.birthTime)
            : null
      if (!cue) return candidate

      const actionLine =
        cue.actionDomain && cue.actionDomain !== 'none'
          ? params.locale === 'ko'
            ? `코어 행동축은 ${cue.actionDomain}입니다.`
            : `Core action axis: ${cue.actionDomain}.`
          : ''
      const riskLine =
        cue.riskDomain && cue.riskDomain !== 'none'
          ? params.locale === 'ko'
            ? `리스크축은 ${cue.riskDomain} 쪽이 더 민감합니다.`
            : `Risk axis tilts toward ${cue.riskDomain}.`
          : ''
      const windowLine =
        cue.bestWindow && cue.bestWindow !== 'none'
          ? params.locale === 'ko'
            ? `강한 창은 ${cue.bestWindow}입니다.`
            : `Best window: ${cue.bestWindow}.`
          : ''
      const branchLine =
        cue.branchSummary && cue.branchSummary !== 'none'
          ? params.locale === 'ko'
            ? `주요 분기는 ${cue.branchSummary}`
            : `Lead branch: ${cue.branchSummary}`
          : ''
      const directLine = cue.directAnswer?.trim() || ''

      return {
        ...candidate,
        summary: [candidate.summary, directLine, windowLine].filter(Boolean).join(' '),
        supportSignals: [...(candidate.supportSignals || []), actionLine, branchLine]
          .filter(Boolean)
          .slice(0, 4),
        cautionSignals: [...(candidate.cautionSignals || []), riskLine].filter(Boolean).slice(0, 4),
        coreDiff: {
          directAnswer: cue.directAnswer,
          actionDomain: cue.actionDomain,
          riskDomain: cue.riskDomain,
          bestWindow: cue.bestWindow,
          branchSummary: cue.branchSummary,
        },
      }
    })
  )
}

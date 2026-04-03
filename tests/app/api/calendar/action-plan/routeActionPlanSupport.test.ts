import { describe, expect, it } from 'vitest'

import {
  buildActionPlanInsights,
  buildCanonicalTimingBrief,
  type ActionPlanCalendarContext,
  type TimelineSlot,
} from '@/app/api/calendar/action-plan/routeActionPlanSupport'

const timeline: TimelineSlot[] = [
  { hour: 9, minute: 0, note: 'Start focused work', tone: 'best', confidence: 78 },
  { hour: 14, minute: 0, note: 'Review and validate', tone: 'caution', confidence: 61 },
]

const calendar: ActionPlanCalendarContext = {
  categories: ['career'],
  recommendations: ['Resume cleanup'],
  warnings: ['Overwork warning'],
  canonicalCore: {
    focusDomain: 'career',
    actionFocusDomain: 'career',
    riskAxisLabel: 'health',
    phase: 'activation',
    phaseLabel: 'Activation',
    thesis: 'Career pressure should be converted into concrete action.',
    topDecisionLabel: 'Submit two targeted applications',
    riskControl: 'Keep sleep intact before major commitment.',
    primaryAction: 'Submit two targeted applications',
    primaryCaution: 'Do not overextend.',
    judgmentPolicy: {
      mode: 'execute',
      rationale: 'Execution is allowed with verification.',
      allowedActions: ['apply'],
      allowedActionLabels: ['Submit applications'],
      blockedActions: [],
      blockedActionLabels: [],
      hardStops: ['Sleep collapse'],
      hardStopLabels: ['Sleep collapse'],
      softChecks: ['Check cash runway'],
      softCheckLabels: ['Check cash runway'],
    },
    topTimingWindow: {
      domain: 'career',
      window: '1-3m',
      timingGranularity: 'month',
      precisionReason: 'Career signals are converging.',
      timingConflictNarrative: 'Readiness and trigger are aligned.',
      whyNow: 'The entry window is opening after preparation.',
      entryConditions: ['Role scope is clear'],
      abortConditions: ['Cash pressure spikes'],
    },
    domainTimingWindows: [
      {
        domain: 'career',
        window: '1-3m',
        timingGranularity: 'month',
        precisionReason: 'Career signals are converging.',
        timingConflictNarrative: 'Readiness and trigger are aligned.',
        whyNow: 'The entry window is opening after preparation.',
        entryConditions: ['Role scope is clear'],
        abortConditions: ['Cash pressure spikes'],
      },
    ],
    projections: {
      branches: {
        summary: 'Push only the roles with clear scope.',
        detailLines: ['Push only the roles with clear scope.'],
        reasons: ['Career timing is active.'],
        nextMoves: ['Shortlist two roles first.'],
        counterweights: ['Cash pressure'],
      },
    },
    singleSubjectView: {
      directAnswer: 'This is a career-entry phase, not a wait-and-see phase.',
      actionAxis: {
        domain: 'career',
        label: 'Career',
        nowAction: 'Submit two targeted applications',
        whyThisFirst: 'Action is clearer than more analysis right now.',
      },
      riskAxis: {
        domain: 'health',
        label: 'Health',
        warning: 'Lower overwork risk before making a hard commitment.',
        hardStops: ['Sleep collapse'],
      },
      timingState: {
        bestWindow: '1-3m',
        whyNow: 'The entry window is opening after preparation.',
        whyNotYet: 'Do not force unclear roles this week.',
        windows: [],
      },
      branches: [
        {
          label: 'A-track',
          summary: 'Structured roles open first.',
          entryConditions: ['Role scope is clear'],
          abortConditions: ['Cash pressure spikes'],
          nextMove: 'Shortlist two structured roles.',
        },
      ],
      entryConditions: ['Role scope is clear'],
      abortConditions: ['Cash pressure spikes'],
      nextMove: 'Submit two targeted applications',
    },
    personModel: {
      overview: 'Career structure is moving ahead of other domains.',
      domainStateGraph: [
        {
          domain: 'career',
          label: 'Career',
          currentState: 'expansion',
          currentWindow: '1-3m',
          thesis: 'Career is the domain to convert into visible moves now.',
          supportSignals: [],
          pressureSignals: [],
          alignedWith: [],
          conflictingWith: [],
          nextShift: 'Execution window stabilizes after shortlisting.',
          firstMove: 'Submit two targeted applications',
          holdMove: 'Avoid roles with vague scope.',
          timescales: [],
        },
      ],
      appliedProfile: {
        foodProfile: {
          summary: '',
          thermalBias: '',
          digestionStyle: '',
          helpfulFoods: [],
          cautionFoods: [],
          rhythmGuidance: [],
        },
        lifeRhythmProfile: {
          summary: 'Keep energy stable with fixed recovery blocks.',
          peakWindows: [],
          recoveryWindows: [],
          stressBehaviors: [],
          regulationMoves: ['Lock a 20-minute reset block before evening decisions.'],
        },
        relationshipStyleProfile: {
          summary: 'Be factual before emotional escalation.',
          attractionPatterns: [],
          stabilizers: [],
          ruptureTriggers: [],
          repairMoves: ['State the concern in one sentence first.'],
        },
        workStyleProfile: {
          summary: 'You perform best with tight scope and visible ownership.',
          bestRoles: [],
          bestConditions: [],
          fatigueTriggers: [],
          leverageMoves: ['Shortlist two roles with explicit ownership.'],
        },
        moneyStyleProfile: {
          summary: 'Protect runway before stretching risk.',
          earningPattern: [],
          savingPattern: [],
          leakageRisks: [],
          controlRules: ['Check cash runway before high-risk moves.'],
        },
        environmentProfile: {
          summary: 'Reduce noise before core work blocks.',
          preferredSettings: [],
          drainSignals: [],
          resetActions: [],
        },
      },
      eventOutlook: [
        {
          key: 'careerEntry',
          label: 'Career Entry',
          domain: 'career',
          status: 'open',
          readiness: 78,
          bestWindow: '1-3m',
          summary: 'Entry is open if the role is clearly defined.',
          entryConditions: ['Role scope is clear'],
          abortConditions: ['Cash pressure spikes'],
          nextMove: 'Shortlist two roles first.',
        },
      ],
    },
  } as any,
}

describe('calendar action-plan support', () => {
  it('shapes action-plan insights from single-subject action, branch, and risk data', () => {
    const insights = buildActionPlanInsights({
      locale: 'en',
      timeline,
      calendar,
      isPremiumUser: true,
    })

    expect(insights.ifThenRules.join(' ')).toContain('Submit two targeted applications')
    expect(insights.riskTriggers.join(' ')).toContain('Lower overwork risk')
    expect(insights.actionFramework.do.join(' ')).toContain('Submit two targeted applications')
    expect(insights.actionFramework.do.join(' ')).toContain('Shortlist two roles first')
    expect(insights.actionFramework.dont.join(' ')).toContain('Avoid roles with vague scope')
    expect(insights.actionFramework.alternative.join(' ')).toContain(
      'tight scope and visible ownership'
    )
  })

  it('includes single-subject timing lead in the timing brief', () => {
    const timingBrief = buildCanonicalTimingBrief(calendar, 'en')

    expect(timingBrief).toContain('Best window: 1-3m')
    expect(timingBrief).toContain('entry window is opening')
  })
})

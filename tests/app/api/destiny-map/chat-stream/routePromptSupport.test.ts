import { describe, expect, it } from 'vitest'
import {
  buildMatrixProfileSection,
  type MatrixSnapshot,
} from '@/app/api/destiny-map/chat-stream/routePromptSupport'

function createSnapshot(): MatrixSnapshot {
  return {
    totalScore: 88,
    topLayers: [],
    highlights: ['career focus'],
    synergies: ['career x timing'],
    drivers: ['structure support'],
    cautions: ['document risk'],
    calendarSignals: [],
    overlapTimeline: [],
    domainScores: {
      career: 84,
      money: 62,
      health: 58,
      general: 70,
      love: 54,
    },
    core: {
      coreHash: 'hash',
      overallPhase: 'verify',
      overallPhaseLabel: 'verify-dominant',
      attackPercent: 42,
      defensePercent: 58,
      topClaimIds: [],
      topCautionSignalIds: [],
      counselorEvidence: {
        focusDomain: 'career',
        singleSubjectView: {
          directAnswer: '커리어에서는 역할 범위를 먼저 고정하는 쪽이 유리합니다.',
          structureAxis: {
            domain: 'career',
            label: 'Career',
            thesis: 'Career pressure is leading the current structure.',
            topAxes: ['role clarity', 'timing readiness'],
          },
          actionAxis: {
            domain: 'career',
            label: 'Career',
            nowAction: '역할 범위를 먼저 고정하세요.',
            whyThisFirst: '역할 정의가 먼저 서야 이후 협상과 실행이 흔들리지 않습니다.',
          },
          riskAxis: {
            domain: 'career',
            label: 'Career',
            warning: '조건이 흐리면 타이밍 이점이 오히려 소모로 바뀝니다.',
            hardStops: ['문서 없는 확정은 미루세요.'],
          },
          timingState: {
            bestWindow: '1-3m',
            whyNow: '1~3개월 구간에서 역할 압력과 기회 신호가 함께 올라옵니다.',
            whyNotYet: '문서화가 늦으면 타이밍 이점이 약해집니다.',
            windows: [
              {
                timescale: 'now',
                status: 'mixed',
                agreement: 0.61,
                contradiction: 0.34,
                leadLag: 0.12,
                summary: '지금은 기준 정리가 먼저입니다.',
              },
              {
                timescale: '1-3m',
                status: 'open',
                agreement: 0.82,
                contradiction: 0.18,
                leadLag: 0.3,
                summary: '1~3개월은 실제 진입 창이 열립니다.',
              },
            ],
          },
          competingPressures: [],
          branches: [
            {
              label: 'documented role',
              summary: '문서로 역할을 고정하면 경로가 선명해집니다.',
              entryConditions: ['역할 범위를 합의할 것'],
              abortConditions: ['조건이 문서화되지 않을 것'],
              nextMove: '지원 전에 역할 정의 문장을 먼저 고정하세요.',
            },
          ],
          entryConditions: ['역할 범위를 합의할 것'],
          abortConditions: ['조건이 문서화되지 않을 것'],
          nextMove: '지원 전에 역할 정의 문장을 먼저 고정하세요.',
          confidence: 0.84,
          reliability: {
            crossAgreement: 0.81,
            contradictionFlags: [],
            notes: [],
          },
        },
        personModel: {
          domainStateGraph: [
            {
              domain: 'career',
              label: 'Career',
              currentState: 'expansion',
              thesis: 'Career structure is currently supported.',
              firstMove: 'Lock the position criteria first.',
              holdMove: 'Do not accept vague terms yet.',
              supportSignals: ['role scope clarity', 'written criteria'],
              pressureSignals: ['document risk'],
            },
          ],
          appliedProfile: {
            workStyleProfile: {
              summary: 'Work gets stronger when criteria and staged planning are explicit.',
              bestConditions: ['document the role scope', 'stage-by-stage review'],
              leverageMoves: ['refine the position thesis before editing the resume'],
            },
            relationshipStyleProfile: {},
            foodProfile: {},
            lifeRhythmProfile: {},
            moneyStyleProfile: {},
            environmentProfile: {},
          },
          eventOutlook: [
            {
              key: 'careerEntry',
              label: 'Career entry',
              domain: 'career',
              status: 'open',
              readiness: 0.81,
              bestWindow: '1-3m',
              summary: 'Entry is open, but role definition must come first.',
              entryConditions: ['agree the scope'],
              abortConditions: ['terms are not documented'],
              nextMove: 'Fix the role-definition sentence before applying.',
            },
          ],
          birthTimeHypotheses: [
            {
              label: 'Morning hypothesis',
              birthTime: '06:00',
              status: 'current-best',
              fitScore: 0.78,
              summary: 'Morning execution rhythm fits the career action axis better.',
              supportSignals: ['morning execution block'],
              cautionSignals: ['forced late-night commitments'],
              coreDiff: {
                directAnswer: 'Do not commit before the role is documented.',
                actionDomain: 'career',
                riskDomain: 'health',
                bestWindow: '1-3m',
                branchSummary: 'The documented-role path remains strongest.',
              },
            },
          ],
          crossConflictMap: [
            {
              domain: 'career',
              label: 'Career',
              status: 'astro-leading',
              strongestTimescale: '1-3m',
              summary: 'Trigger arrives first, but structural absorption follows later.',
              sajuView: 'Structure wants role definition first.',
              astroView: 'The trigger opens in the next 1-3 months.',
              resolutionMove: 'Lock the conditions in writing first.',
            },
          ],
          pastEventReconstruction: {
            summary:
              'Past reconstruction focuses on transition windows that explain the current structure.',
            markers: [
              {
                key: 'career-pivot',
                label: 'Career pivot window',
                ageWindow: '24-29',
                status: 'conditional',
                summary: 'This was likely a period of reselecting role and responsibility scope.',
                evidence: ['scope agreement'],
              },
            ],
          },
          uncertaintyEnvelope: {
            summary: 'Career momentum is strong, but contract details remain conditional.',
            conditionalAreas: ['compensation negotiation'],
          },
        },
      },
    },
  }
}

describe('routePromptSupport buildMatrixProfileSection', () => {
  it('adds theme-specific applied and event context for career questions', () => {
    const text = buildMatrixProfileSection(createSnapshot(), 'ko', 'career')

    expect(text).toContain('[Theme Applied Context]')
    expect(text).toContain('[Interpreted Answer Contract]')
    expect(text).toContain('frame=open_counseling')
    expect(text).toContain('theme_domain=career')
    expect(text).toContain('domain_state=expansion')
    expect(text).toContain('[Theme Event Condition Packet]')
    expect(text).toContain('condition_1_entry_1=')
    expect(text).toContain('condition_1_next=')
    expect(text).toContain('birth_hypothesis_1_time=06:00')
    expect(text).toContain('conflict_1_resolve=')
    expect(text).toContain('birth_hypothesis_1_action=career')
    expect(text).toContain('birth_hypothesis_1_branch=')
  })

  it('keeps action, timing, branch, and condition lines even under cost trimming', () => {
    const previous = process.env.COUNSELOR_COST_OPTIMIZED
    process.env.COUNSELOR_COST_OPTIMIZED = 'true'
    try {
      const snapshot = createSnapshot()
      const repeated = Array.from({ length: 60 }, (_, index) => `long filler ${index}`).join(' ')
      snapshot.core!.counselorEvidence!.personModel!.domainStateGraph![0]!.thesis = repeated
      snapshot.core!.counselorEvidence!.personModel!.eventOutlook![0]!.summary = repeated
      snapshot.core!.counselorEvidence!.personModel!.eventOutlook![0]!.entryConditions = [
        repeated,
        'agree the scope',
      ]
      snapshot.core!.counselorEvidence!.personModel!.eventOutlook![0]!.abortConditions = [
        repeated,
        'terms are not documented',
      ]
      ;(snapshot.core!.counselorEvidence! as any).singleSubjectView = {
        directAnswer: 'Do not commit before the role is documented.',
        actionAxis: {
          domain: 'career',
          nowAction: 'Define the role scope first.',
          whyThisFirst: repeated,
        },
        riskAxis: {
          domain: 'career',
          warning: 'Ambiguous terms will distort the timing.',
          hardStops: ['Do not sign vague terms.'],
        },
        timingState: {
          bestWindow: '1-3m',
          whyNow: 'The trigger opens before the structure fully settles.',
          whyNotYet: 'Documentation still lags behind momentum.',
        },
        branches: [
          {
            label: 'documented role',
            summary: 'The path opens if scope is fixed first.',
            entryConditions: ['agree the scope'],
            abortConditions: ['terms are not documented'],
            nextMove: 'Freeze the role-definition sentence.',
          },
        ],
        nextMove: 'Freeze the role-definition sentence.',
      }

      const text = buildMatrixProfileSection(snapshot, 'ko', 'career')

      expect(text).toContain('current_direct=')
      expect(text).toContain('window=')
      expect(text).toContain('branch_1=')
      expect(text).toContain('condition_1_entry_1=')
      expect(text).toContain('condition_1_abort_1=')
      expect(text).toContain('birth_hypothesis_1_time=06:00')
      expect(text).toContain('birth_hypothesis_1_action=career')
      expect(text).toContain('conflict_1_resolve=')
      expect(text).toContain('past_reconstruction=')
    } finally {
      if (previous === undefined) {
        delete process.env.COUNSELOR_COST_OPTIMIZED
      } else {
        process.env.COUNSELOR_COST_OPTIMIZED = previous
      }
    }
  })

  it('shapes a question-frame-specific interpreted contract when analysis is provided', () => {
    const text = buildMatrixProfileSection(createSnapshot(), 'ko', 'career', {
      primaryDomain: 'career',
      secondaryDomains: ['wealth'],
      emotionalTone: 'steady',
      frame: 'career_decision',
      isDecisionQuestion: true,
      needsTimingGuidance: false,
      confidence: 'high',
    })

    expect(text).toContain('[Interpreted Answer Contract]')
    expect(text).toContain('frame=career_decision')
    expect(text).toContain('primary_domain=career')
    expect(text).toContain('direct_answer=커리어에서는 역할 범위를 먼저 고정하는 쪽이 유리합니다.')
    expect(text).toContain('why_1=')
    expect(text).toContain('timing_best=1-3m')
    expect(text).toContain('entry_1=')
    expect(text).toContain('abort_1=')
    expect(text).toContain('path_1=')
    expect(text).toContain('next_move=지원 전에 역할 정의 문장을 먼저 고정하세요.')
  })
})

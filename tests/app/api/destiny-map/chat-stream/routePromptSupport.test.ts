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
    expect(text).toContain('theme_domain=career')
    expect(text).toContain('domain_state=expansion')
    expect(text).toContain('[Theme Event Condition Packet]')
    expect(text).toContain('condition_1_entry_1=')
    expect(text).toContain('condition_1_next=')
    expect(text).toContain('birth_hypothesis_1_time=06:00')
    expect(text).toContain('conflict_1_resolve=')
  })
})

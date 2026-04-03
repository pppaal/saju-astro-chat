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
      overallPhaseLabel: '검토 우위',
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
              label: '커리어',
              currentState: 'expansion',
              thesis: '커리어 축은 지금 구조 지지가 강합니다.',
              firstMove: '포지션 기준표를 먼저 정리하세요.',
              holdMove: '조건 미확정 상태의 성급한 수락은 보류하세요.',
              supportSignals: ['역할 범위 명확화', '문서화된 기준'],
              pressureSignals: ['문서 리스크'],
            },
          ],
          appliedProfile: {
            workStyleProfile: {
              summary: '일은 기준표와 단계 설계가 있을 때 강해집니다.',
              bestConditions: ['역할 범위 문서화', '단계별 점검'],
              leverageMoves: ['이력서보다 포지션 정의를 먼저 다듬기'],
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
              label: '취업/포지션 진입',
              domain: 'career',
              status: 'open',
              readiness: 0.81,
              bestWindow: '1-3m',
              summary: '채용 진입은 열려 있지만 역할 정의가 선행돼야 합니다.',
              entryConditions: ['역할 범위 합의'],
              abortConditions: ['보상과 책임이 문서화되지 않음'],
              nextMove: '지원 전에 역할 정의 문장을 고정하세요.',
            },
          ],
          uncertaintyEnvelope: {
            summary: '커리어는 강하지만 계약 세부는 조건부입니다.',
            conditionalAreas: ['보상 협상'],
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
    expect(text).toContain('profile_1=')
    expect(text).toContain('event_1=취업/포지션 진입')
    expect(text).toContain('event_1_next=지원 전에 역할 정의 문장을 고정하세요.')
    expect(text).toContain('conditional_1=보상 협상')
  })
})

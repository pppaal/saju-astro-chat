import { describe, expect, it } from 'vitest'
import { buildInterpretedAnswerContract } from '@/lib/destiny-matrix/interpretedAnswer'
import type { CounselorEvidencePacketLike } from '@/lib/destiny-matrix/counselorEvidenceTypes'

function buildBasePacket(): CounselorEvidencePacketLike {
  return {
    singleSubjectView: {
      directAnswer: '지금은 기준을 먼저 세워야 합니다.',
      structureAxis: {
        domain: 'career',
        label: 'Career',
        thesis: '커리어 구조가 선행합니다.',
        topAxes: ['career pressure'],
      },
      actionAxis: {
        domain: 'career',
        label: 'Career',
        nowAction: '조건을 먼저 정리하세요.',
        whyThisFirst: '역할 정의가 먼저입니다.',
      },
      riskAxis: {
        domain: 'health',
        label: 'Health',
        warning: '과부하를 먼저 낮추세요.',
        hardStops: ['수면 붕괴'],
      },
      timingState: {
        bestWindow: '1-3m',
        whyNow: '지금은 구조를 정리할 시간입니다.',
        confidence: 0.82,
        windows: [
          {
            timescale: '1-3m',
            status: 'open',
            agreement: 0.8,
            contradiction: 0.2,
            leadLag: 0.1,
            summary: '다음 분기부터 실행이 쉬워집니다.',
          },
        ],
      },
      competingPressures: [],
      branches: [
        {
          label: 'A-track',
          summary: '조건이 맞는 자리로 들어갑니다.',
          entryConditions: ['역할 범위를 정의한다'],
          abortConditions: ['조건이 흐릿하다'],
          nextMove: '포지션 문장을 먼저 정리하세요.',
        },
      ],
      entryConditions: ['역할 범위를 정의한다'],
      abortConditions: ['조건이 흐릿하다'],
      nextMove: '포지션 문장을 먼저 정리하세요.',
      confidence: 0.8,
      reliability: { contradictionFlags: [], notes: [] },
    },
    topTimingWindow: {
      domain: 'career',
      window: '1-3m',
      whyNow: '다음 분기에 창이 강해집니다.',
      entryConditions: ['역할 범위가 분명함'],
      abortConditions: ['현금 압박 급증'],
      timingConflictNarrative: '준비는 됐지만 확정은 늦춰야 합니다.',
    },
    personModel: {
      subject: 'tester',
      overview: '커리어 구조가 우선입니다.',
      structuralCore: {
        focusDomain: 'career',
        actionFocusDomain: 'career',
        riskAxisDomain: 'health',
        gradeLabel: 'strong',
        phaseLabel: 'prepare',
        overview: '커리어 구조가 우선입니다.',
        latentAxes: [],
      },
      formationProfile: {
        summary: '',
        repeatedPatternFamilies: [],
        dominantLatentGroups: [],
        pressureHabits: [],
        supportHabits: [],
      },
      timeProfile: {
        timingNarrative: '',
        confidence: 0.8,
        windows: [],
        activationSources: [],
      },
      layers: [],
      dimensions: [],
      domainStateGraph: [
        {
          domain: 'career',
          label: 'Career',
          currentState: 'mixed',
          currentWindow: '1-3m',
          thesis: '커리어는 실행보다 조건 정의가 먼저입니다.',
          supportSignals: [],
          pressureSignals: [],
          alignedWith: [],
          conflictingWith: [],
          nextShift: '실행이 빨라집니다.',
          firstMove: '지원 전 조건을 문장으로 만드세요.',
          holdMove: '모호한 자리는 보류하세요.',
          timescales: [
            {
              timescale: '1-3m',
              status: 'open',
              thesis: '다음 분기부터 실행이 쉬워집니다.',
              entryConditions: ['직무 범위 명확'],
              abortConditions: ['조건 불명확'],
            },
          ],
        },
      ],
      domainPortraits: [],
      states: [],
      appliedProfile: {
        foodProfile: {
          summary: '',
          thermalBias: '',
          digestionStyle: '',
          helpfulFoods: [],
          cautionFoods: ['공복 카페인'],
          rhythmGuidance: ['식사 시간을 일정하게 유지하세요.'],
        },
        lifeRhythmProfile: {
          summary: '회복 리듬이 먼저입니다.',
          peakWindows: [],
          recoveryWindows: ['밤 회복 블록 확보'],
          stressBehaviors: ['과로 후 무기력'],
          regulationMoves: ['잠드는 시간을 먼저 고정하세요.'],
        },
        relationshipStyleProfile: {
          summary: '속도보다 신뢰가 중요합니다.',
          attractionPatterns: [],
          stabilizers: ['대화 리듬 확인'],
          ruptureTriggers: ['추측으로 확신하기'],
          repairMoves: ['기대치를 먼저 확인하세요.'],
        },
        workStyleProfile: {
          summary: '역할이 분명할수록 강합니다.',
          bestRoles: [],
          bestConditions: ['역할 범위가 명확한 자리'],
          fatigueTriggers: ['애매한 책임선'],
          leverageMoves: ['지원 전 JD를 다시 문장화하세요.'],
        },
        moneyStyleProfile: {
          summary: '누수 관리가 먼저입니다.',
          earningPattern: ['역할 기반 수익화'],
          savingPattern: ['고정지출부터 정리'],
          leakageRisks: ['불명확한 계약 지출'],
          controlRules: ['지출 기준을 먼저 고정하세요.'],
        },
        environmentProfile: {
          summary: '환경 자극에 민감합니다.',
          preferredSettings: ['정착 기준이 분명한 환경'],
          drainSignals: ['과도한 이동과 소음'],
          resetActions: ['거점 기준을 먼저 정리하세요.'],
        },
      },
      relationshipProfile: {
        summary: '느린 신뢰형 관계입니다.',
        partnerArchetypes: ['차분한 상대'],
        inflowPaths: ['일상 접점'],
        commitmentConditions: ['기대치 정렬'],
        breakPatterns: ['과속한 확정'],
      },
      careerProfile: {
        summary: '역할 정의가 강점입니다.',
        suitableLanes: ['운영/기획'],
        executionStyle: ['검토 후 실행'],
        hiringTriggers: ['역할 범위가 분명함'],
        blockers: ['애매한 책임선'],
      },
      futureBranches: [],
      eventOutlook: [
        {
          key: 'careerEntry',
          label: 'Career Entry',
          domain: 'career',
          status: 'open',
          readiness: 0.84,
          bestWindow: '1-3m',
          summary: '역할이 분명한 곳에서 진입이 쉬워집니다.',
          entryConditions: ['역할 범위를 정의한다'],
          abortConditions: ['조건이 흐릿하다'],
          nextMove: '지원 전에 JD를 다시 정리하세요.',
        },
      ],
      birthTimeHypotheses: [],
      crossConflictMap: [],
      pastEventReconstruction: { summary: '', markers: [] },
      uncertaintyEnvelope: {
        summary: '',
        reliableAreas: [],
        conditionalAreas: ['조건 협상 결과에 따라 달라집니다.'],
        unresolvedAreas: [],
      },
      evidenceLedger: {
        topClaimIds: [],
        topSignalIds: [],
        topPatternIds: [],
        topScenarioIds: [],
        topDecisionId: null,
        topDecisionLabel: null,
        coherenceNotes: [],
        contradictionFlags: [],
      },
    },
  }
}

describe('buildInterpretedAnswerContract', () => {
  it('uses career-specific triggers and next move for career decisions', () => {
    const contract = buildInterpretedAnswerContract({
      packet: buildBasePacket(),
      frame: 'career_decision',
      primaryDomain: 'career',
    })

    expect(contract?.why).toContain('검토 후 실행')
    expect(contract?.conditions.entry).toContain('역할 범위가 분명함')
    expect(contract?.conditions.abort).toContain('애매한 책임선')
    expect(contract?.nextMove).toBe('지원 전에 JD를 다시 정리하세요.')
  })

  it('uses relationship-specific conditions and repair moves for relationship questions', () => {
    const contract = buildInterpretedAnswerContract({
      packet: buildBasePacket(),
      frame: 'relationship_repair',
      primaryDomain: 'relationship',
    })

    expect(contract?.why).toContain('대화 리듬 확인')
    expect(contract?.conditions.entry).toContain('기대치 정렬')
    expect(contract?.conditions.abort).toContain('과속한 확정')
    expect(contract?.nextMove).toBe('기대치를 먼저 확인하세요.')
  })

  it('uses environment and reset actions for move-oriented interpretation', () => {
    const contract = buildInterpretedAnswerContract({
      packet: buildBasePacket(),
      frame: 'identity_reflection',
      primaryDomain: 'move',
    })

    expect(contract?.why).toContain('정착 기준이 분명한 환경')
    expect(contract?.conditions.entry).toContain('거점 기준을 먼저 정리하세요.')
    expect(contract?.conditions.abort).toContain('과도한 이동과 소음')
    expect(contract?.nextMove).toBe('거점 기준을 먼저 정리하세요.')
  })
})

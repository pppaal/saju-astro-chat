import { describe, expect, it } from 'vitest'
import {
  buildInterpretedAnswerContract,
  evaluateInterpretedAnswerQuality,
} from '@/lib/destiny-matrix/interpretedAnswer'
import type { CounselorEvidencePacketLike } from '@/lib/destiny-matrix/counselorEvidenceTypes'

function buildBasePacket(): CounselorEvidencePacketLike {
  return {
    singleSubjectView: {
      directAnswer: 'Set the criteria first before you move.',
      structureAxis: {
        domain: 'career',
        label: 'Career',
        thesis: 'Career structure is the leading axis.',
        topAxes: ['career pressure'],
      },
      actionAxis: {
        domain: 'career',
        label: 'Career',
        nowAction: 'Define the role conditions first.',
        whyThisFirst: 'Role clarity has to come before execution.',
      },
      riskAxis: {
        domain: 'health',
        label: 'Health',
        warning: 'Lower the overload before you accelerate.',
        hardStops: ['sleep collapse'],
      },
      timingState: {
        bestWindow: '1-3m',
        whyNow: 'This is the phase to tighten the structure before pushing forward.',
        confidence: 0.82,
        windows: [
          {
            timescale: '1-3m',
            status: 'open',
            agreement: 0.8,
            contradiction: 0.2,
            leadLag: 0.1,
            summary: 'Execution becomes easier over the next quarter.',
          },
        ],
      },
      competingPressures: [],
      branches: [
        {
          label: 'A-track',
          summary: 'Move into the role only when the conditions are clear.',
          entryConditions: ['define the role boundary'],
          abortConditions: ['the role remains vague'],
          nextMove: 'Rewrite the position criteria before you apply.',
        },
      ],
      entryConditions: ['define the role boundary'],
      abortConditions: ['the role remains vague'],
      nextMove: 'Rewrite the position criteria before you apply.',
      confidence: 0.8,
      reliability: { contradictionFlags: [], notes: [] },
    },
    topTimingWindow: {
      domain: 'career',
      window: '1-3m',
      whyNow: 'The next quarter gives the strongest opening.',
      entryConditions: ['the role scope is clear'],
      abortConditions: ['cash pressure rises too quickly'],
      timingConflictNarrative: 'Preparation is ready, but confirmation should still be delayed.',
    },
    personModel: {
      subject: 'tester',
      overview: 'Career structure takes the lead.',
      structuralCore: {
        focusDomain: 'career',
        actionFocusDomain: 'career',
        riskAxisDomain: 'health',
        gradeLabel: 'strong',
        phaseLabel: 'prepare',
        overview: 'Career structure takes the lead.',
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
          thesis: 'Career needs clearer conditions before execution.',
          supportSignals: [],
          pressureSignals: [],
          alignedWith: [],
          conflictingWith: [],
          nextShift: 'Execution speeds up once the structure is defined.',
          firstMove: 'Turn the role criteria into one clean sentence.',
          holdMove: 'Hold any offer that leaves the responsibility line vague.',
          timescales: [
            {
              timescale: '1-3m',
              status: 'open',
              thesis: 'This is the best quarter to move once the role scope is explicit.',
              entryConditions: ['the role scope is explicit'],
              abortConditions: ['the role scope remains vague'],
            },
          ],
        },
        {
          domain: 'wealth',
          label: 'Wealth',
          currentState: 'mixed',
          currentWindow: '1-3m',
          thesis: 'Wealth needs control before expansion.',
          supportSignals: [],
          pressureSignals: [],
          alignedWith: [],
          conflictingWith: [],
          nextShift: 'Cash flow stabilizes once the contract terms are cleaned up.',
          firstMove: 'Review the fixed costs and contract terms first.',
          holdMove: 'Pause vague spending and prepaid commitments.',
          timescales: [
            {
              timescale: '1-3m',
              status: 'open',
              thesis: 'This is the best window to tighten leakage and rebuild control.',
              entryConditions: ['set a spending rule before adding new commitments'],
              abortConditions: ['impulsive spending starts rising again'],
            },
          ],
        },
        {
          domain: 'health',
          label: 'Health',
          currentState: 'blocked',
          currentWindow: '1-3m',
          thesis: 'Health needs recovery rhythm before any expansion of workload.',
          supportSignals: [],
          pressureSignals: [],
          alignedWith: [],
          conflictingWith: [],
          nextShift: 'Recovery improves once sleep and meals stop drifting.',
          firstMove: 'Lock the sleep window and first meal time first.',
          holdMove: 'Stop late-night load and empty-stomach caffeine.',
          timescales: [
            {
              timescale: '1-3m',
              status: 'open',
              thesis: 'This is the best window to rebuild a recovery routine.',
              entryConditions: ['fix the sleep window before increasing workload'],
              abortConditions: ['late-night work keeps breaking the rhythm'],
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
          cautionFoods: ['empty-stomach caffeine'],
          rhythmGuidance: ['keep the meal timing consistent'],
        },
        lifeRhythmProfile: {
          summary: 'Recovery rhythm comes first.',
          peakWindows: [],
          recoveryWindows: ['protect the evening recovery block'],
          stressBehaviors: ['flat shutdown after overload'],
          regulationMoves: ['fix the sleep start time first'],
        },
        relationshipStyleProfile: {
          summary: 'Trust matters more than speed.',
          attractionPatterns: [],
          stabilizers: ['confirm the pace in conversation'],
          ruptureTriggers: ['deciding on assumptions'],
          repairMoves: ['realign the expectations first'],
        },
        workStyleProfile: {
          summary: 'The clearer the role is, the stronger the execution gets.',
          bestRoles: [],
          bestConditions: ['roles with explicit scope and ownership'],
          fatigueTriggers: ['blurred ownership lines'],
          leverageMoves: ['rewrite the JD into one clean role sentence'],
        },
        moneyStyleProfile: {
          summary: 'Leakage control has to come first.',
          earningPattern: ['turn role clarity into repeatable income'],
          savingPattern: ['stabilize fixed costs first'],
          leakageRisks: ['vague contract spending'],
          controlRules: ['set the spending rule before you expand'],
        },
        environmentProfile: {
          summary: 'Environment friction drains more than it looks.',
          preferredSettings: ['a base with clear commute and cost rules'],
          drainSignals: ['too much movement and noise'],
          resetActions: ['reset the base criteria before relocating'],
        },
      },
      relationshipProfile: {
        summary: 'This is a slow-trust relationship pattern.',
        partnerArchetypes: ['steady partner'],
        inflowPaths: ['daily overlap'],
        commitmentConditions: ['align expectations explicitly'],
        breakPatterns: ['forcing early commitment'],
      },
      careerProfile: {
        summary: 'Role definition is the main strength.',
        suitableLanes: ['operations/planning'],
        executionStyle: ['review first, then execute'],
        hiringTriggers: ['role scope is explicit'],
        blockers: ['blurred responsibility lines'],
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
          summary: 'Entry becomes easier when the role is explicit.',
          entryConditions: ['define the role boundary'],
          abortConditions: ['the role remains vague'],
          nextMove: 'Rewrite the JD before you apply.',
        },
        {
          key: 'wealthReset',
          label: 'Wealth Reset',
          domain: 'wealth',
          status: 'mixed',
          readiness: 0.72,
          bestWindow: '1-3m',
          summary: 'Cash flow stabilizes when spending rules and contract terms are tightened.',
          entryConditions: ['set a spending rule before adding new commitments'],
          abortConditions: ['impulsive spending starts rising again'],
          nextMove: 'Review recurring payments and contract terms this week.',
        },
        {
          key: 'healthReset',
          label: 'Health Reset',
          domain: 'health',
          status: 'blocked',
          readiness: 0.68,
          bestWindow: '1-3m',
          summary: 'Recovery returns when sleep rhythm and food timing are restored.',
          entryConditions: ['fix the sleep window before increasing workload'],
          abortConditions: ['late-night work keeps breaking the rhythm'],
          nextMove: 'Lock the sleep window and first meal time this week.',
        },
      ],
      birthTimeHypotheses: [],
      crossConflictMap: [],
      pastEventReconstruction: { summary: '', markers: [] },
      uncertaintyEnvelope: {
        summary: '',
        reliableAreas: [],
        conditionalAreas: ['outcome still depends on the negotiation quality'],
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

    expect(contract?.why).toContain('review first, then execute')
    expect(contract?.conditions.entry).toContain('define the role boundary')
    expect(contract?.conditions.abort).toContain('blurred responsibility lines')
    expect(contract?.timing.next).toBe(
      'This is the best quarter to move once the role scope is explicit.'
    )
    expect(contract?.nextMove).toBe('Rewrite the JD before you apply.')
  })

  it('uses relationship-specific conditions and repair moves for relationship questions', () => {
    const contract = buildInterpretedAnswerContract({
      packet: buildBasePacket(),
      frame: 'relationship_repair',
      primaryDomain: 'relationship',
    })

    expect(contract?.why).toContain('confirm the pace in conversation')
    expect(contract?.conditions.entry).toContain('align expectations explicitly')
    expect(contract?.conditions.abort).toContain('forcing early commitment')
    expect(contract?.nextMove).toBe('realign the expectations first')
  })

  it('uses environment and reset actions for move-oriented interpretation', () => {
    const contract = buildInterpretedAnswerContract({
      packet: buildBasePacket(),
      frame: 'identity_reflection',
      primaryDomain: 'move',
    })

    expect(contract?.why).toContain('a base with clear commute and cost rules')
    expect(contract?.conditions.entry).toContain('reset the base criteria before relocating')
    expect(contract?.conditions.abort).toContain('too much movement and noise')
    expect(contract?.nextMove).toBe('reset the base criteria before relocating')
  })

  it('thickens wealth interpretation with domain state, event outlook, and control rules', () => {
    const contract = buildInterpretedAnswerContract({
      packet: buildBasePacket(),
      frame: 'wealth_planning',
      primaryDomain: 'wealth',
    })

    expect(contract?.why).toContain('Wealth needs control before expansion.')
    expect(contract?.conditions.entry).toContain(
      'set a spending rule before adding new commitments'
    )
    expect(contract?.conditions.abort).toContain('impulsive spending starts rising again')
    expect(contract?.timing.bestWindow).toBe('1-3m')
    expect(contract?.timing.next).toBe(
      'This is the best window to tighten leakage and rebuild control.'
    )
    expect(contract?.branches[0]?.summary).toContain(
      'Cash flow stabilizes when spending rules and contract terms are tightened.'
    )
    expect(contract?.nextMove).toBe('Review recurring payments and contract terms this week.')
  })

  it('thickens health interpretation with recovery timing, stop conditions, and next move', () => {
    const contract = buildInterpretedAnswerContract({
      packet: buildBasePacket(),
      frame: 'health_recovery',
      primaryDomain: 'health',
    })

    expect(contract?.why).toContain(
      'Health needs recovery rhythm before any expansion of workload.'
    )
    expect(contract?.conditions.entry).toContain('fix the sleep window before increasing workload')
    expect(contract?.conditions.abort).toContain('late-night work keeps breaking the rhythm')
    expect(contract?.timing.next).toBe('This is the best window to rebuild a recovery routine.')
    expect(contract?.branches[0]?.summary).toContain(
      'Recovery returns when sleep rhythm and food timing are restored.'
    )
    expect(contract?.nextMove).toBe('Lock the sleep window and first meal time this week.')
  })

  it('passes counselor-facing quality checks when direct answer and next move are clean', () => {
    const contract = buildInterpretedAnswerContract({
      packet: buildBasePacket(),
      frame: 'career_decision',
      primaryDomain: 'career',
    })

    const result = evaluateInterpretedAnswerQuality(contract)
    expect(result.pass).toBe(true)
    expect(result.warnings).toEqual([])
  })

  it('flags internal token leaks in direct answer and branches', () => {
    const result = evaluateInterpretedAnswerQuality({
      questionFrame: 'career_decision',
      primaryDomain: 'career',
      directAnswer: 'action axis says move now.',
      why: ['why_1=scope first'],
      timing: {},
      conditions: { entry: [], abort: [] },
      branches: [{ label: 'A', summary: 'scenario id career_window', nextMove: 'next_move=apply' }],
      uncertainty: [],
      nextMove: 'next_move=apply',
    })

    expect(result.pass).toBe(false)
    expect(result.warnings).toContain('direct_answer_internal_leak')
    expect(result.warnings).toContain('branch_internal_leak')
    expect(result.warnings).toContain('next_move_internal_leak')
  })
})

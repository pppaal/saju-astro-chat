import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ReportResultPage from '@/app/premium-reports/result/[id]/page'

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'report-1' }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: 'authenticated' }),
}))

vi.mock('@/components/analytics/GoogleAnalytics', () => ({
  analytics: {
    matrixPdfDownload: vi.fn(),
  },
}))

describe('premium report result page', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          report: {
            id: 'report-1',
            type: 'themed',
            title: '테마 리포트',
            summary: '요약',
            createdAt: '2026-02-18T00:00:00.000Z',
            sections: [{ title: '분석', content: '내용' }],
            qualityAudit: {
              completenessScore: 90,
              crossEvidenceScore: 85,
              actionabilityScore: 80,
              clarityScore: 88,
              overallQualityScore: 86,
              issues: [],
              strengths: ['good'],
              recommendations: ['add action detail'],
            },
            calculationDetails: {
              inputSnapshot: { saju: { dayMasterElement: '목' }, astrology: { aspects: [] } },
              timingData: { seun: { year: 2026 } },
              matrixSummary: { totalScore: 8.2 },
              layerResults: { layer1: {} },
              topInsightsWithSources: [],
            },
            interpretedAnswer: {
              questionFrame: 'career_decision',
              primaryDomain: 'career',
              directAnswer: '지금은 커리어 결정을 검토 기준 위주로 정리해야 합니다.',
              why: ['역할 범위가 명확할수록 결정력이 올라갑니다.'],
              timing: {
                bestWindow: '1-3m',
                now: '지금은 조건 정리가 우선입니다.',
              },
              conditions: { entry: ['역할 범위 정의'], abort: ['모호한 확정'] },
              branches: [
                {
                  label: 'A-track',
                  summary: '조건이 맞는 자리로 진입합니다.',
                  nextMove: '지원 전 조건 문장을 먼저 정리합니다.',
                },
              ],
              uncertainty: ['상세 조건은 앞으로 조정될 수 있습니다.'],
              nextMove: '지원 전 조건 문장을 먼저 정리합니다.',
            },
            fullData: {},
          },
        }),
      })
    )
  })

  it('renders themed diagnostics controls', async () => {
    render(<ReportResultPage />)

    await waitFor(() => {
      expect(screen.getByText('품질 점검')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: '품질 리포트(.md)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '계산 근거(.json)' })).toBeInTheDocument()
  })

  it('shows the structural focus axis and current action axis together in the hero', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          report: {
            id: 'report-1',
            type: 'comprehensive',
            title: '종합 리포트',
            summary: '요약',
            createdAt: '2026-02-18T00:00:00.000Z',
            sections: [{ title: '분석', content: '내용' }],
            personModel: {
              overview: '배경은 재정, 실행은 커리어입니다.',
              structuralCore: {
                focusDomain: 'wealth',
                actionFocusDomain: 'career',
                riskAxisDomain: 'health',
                gradeLabel: 'strong',
                phaseLabel: '방어/재정렬 국면',
                overview: '배경은 재정, 실행은 커리어입니다.',
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
                currentWindow: 'now',
                timingNarrative: '커리어 창이 먼저 열립니다.',
                confidence: 0.82,
                windows: [],
                activationSources: [],
              },
              layers: [],
              dimensions: [
                {
                  domain: 'wealth',
                  label: 'Money',
                  score: 0.8,
                  pressure: 0.9,
                  support: 0.5,
                  openness: 0.4,
                },
                {
                  domain: 'career',
                  label: 'Career',
                  score: 0.85,
                  pressure: 0.7,
                  support: 0.8,
                  openness: 0.8,
                },
              ],
              domainPortraits: [],
              domainStateGraph: [],
              states: [],
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
                  summary: '',
                  peakWindows: [],
                  recoveryWindows: [],
                  stressBehaviors: [],
                  regulationMoves: [],
                },
                relationshipStyleProfile: {
                  summary: '',
                  attractionPatterns: [],
                  stabilizers: [],
                  ruptureTriggers: [],
                  repairMoves: [],
                },
                workStyleProfile: {
                  summary: '',
                  bestRoles: [],
                  bestConditions: [],
                  fatigueTriggers: [],
                  leverageMoves: [],
                },
                moneyStyleProfile: {
                  summary: '',
                  earningPattern: [],
                  savingPattern: [],
                  leakageRisks: [],
                  controlRules: [],
                },
                environmentProfile: {
                  summary: '',
                  preferredSettings: [],
                  drainSignals: [],
                  resetActions: [],
                },
              },
              relationshipProfile: {
                summary: '',
                partnerArchetypes: [],
                inflowPaths: [],
                commitmentConditions: [],
                breakPatterns: [],
              },
              careerProfile: {
                summary: '',
                suitableLanes: [],
                executionStyle: [],
                hiringTriggers: [],
                blockers: [],
              },
              futureBranches: [],
              eventOutlook: [],
              uncertaintyEnvelope: {
                summary: '',
                reliableAreas: [],
                conditionalAreas: [],
                unresolvedAreas: [],
              },
              birthTimeHypotheses: [],
              crossConflictMap: [],
              pastEventReconstruction: { summary: '', markers: [] },
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
            fullData: {},
          },
        }),
      })
    )

    render(<ReportResultPage />)

    await waitFor(() => {
      expect(screen.getByText('Focus Axis')).toBeInTheDocument()
    })

    expect(screen.getByText('Money')).toBeInTheDocument()
    expect(screen.getByText('Career')).toBeInTheDocument()
    expect(
      screen.getByText('배경 압력축은 Money이고, 지금 먼저 움직여야 할 행동축은 Career입니다.')
    ).toBeInTheDocument()
  })

  it('renders the interpreted answer section when the contract is present', async () => {
    render(<ReportResultPage />)

    await waitFor(() => {
      expect(screen.getByText('질문 해석 계약')).toBeInTheDocument()
    })

    expect(screen.getByText('커리어 판단')).toBeInTheDocument()
    expect(screen.getByText('Entry Conditions')).toBeInTheDocument()
    expect(screen.getByText('Next Move')).toBeInTheDocument()
  })
})

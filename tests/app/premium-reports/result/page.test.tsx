import { describe, it, expect, vi, beforeEach } from 'vitest'
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
})

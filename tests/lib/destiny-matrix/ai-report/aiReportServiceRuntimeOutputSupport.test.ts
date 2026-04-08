import { describe, expect, it } from 'vitest'
import { ensureFinalReportPolish } from '@/lib/destiny-matrix/ai-report/aiReportServiceRuntimeOutputSupport'

describe('aiReportServiceRuntimeOutputSupport.ensureFinalReportPolish', () => {
  it('rewrites generic career action copy into domain-specific language', () => {
    const result = ensureFinalReportPolish(
      {
        actionPlan:
          '지금은 준비와 정보 수집에 집중하세요. 결론보다 검토 기준과 보류 조건을 먼저 정리하세요. 감정 속도보다 확인 질문을 먼저 놓고 해석 오차를 줄이세요.',
        conclusion: 'career conclusion',
      },
      'ko',
      {
        focusDomain: 'career',
        actionFocusDomain: 'career',
        branchSet: [],
        projections: { branches: { detailLines: [] } },
      } as any
    ) as Record<string, string>

    expect(result.actionPlan).toContain('역할 범위')
    expect(result.actionPlan).toContain('협상 조건')
    expect(result.actionPlan).not.toContain('준비와 정보 수집에 집중하세요')
    expect(result.actionPlan).not.toContain('감정 속도보다 확인 질문')
  })

  it('repairs mixed english fatigue copy in health-facing sections', () => {
    const result = ensureFinalReportPolish(
      {
        actionPlan:
          'Pushing through fatigue can degrade judgment quality. 지금은 준비와 정보 수집에 집중하세요.',
        conclusion: 'health conclusion',
      },
      'ko',
      {
        focusDomain: 'health',
        actionFocusDomain: 'health',
        branchSet: [],
        projections: { branches: { detailLines: [] } },
      } as any
    ) as Record<string, string>

    expect(result.actionPlan).toContain('과부하')
    expect(result.actionPlan).toContain('회복 시간')
    expect(result.actionPlan).not.toContain('Pushing through fatigue')
  })
})

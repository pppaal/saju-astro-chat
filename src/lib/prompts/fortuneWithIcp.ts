import { ICP_ARCHETYPE_PROFILES, getAxisInterpretation } from '@/lib/icp/results'
import { resolveHybridArchetype } from '@/lib/icp/hybrid'
import type { CounselingBrief, IcpAxisKey, IcpResult } from '@/lib/icp/test-types'
import type { PersonaAnalysis } from '@/lib/persona/types'

const AXIS_ORDER: IcpAxisKey[] = ['agency', 'warmth', 'boundary', 'resilience']

export function buildCounselingBrief(params: {
  icpResult?: IcpResult | null
  personaResult?: PersonaAnalysis | null
  whatUserWants?: string
}): CounselingBrief | null {
  const { icpResult, personaResult, whatUserWants } = params
  if (!icpResult) {
    return null
  }

  const profile = ICP_ARCHETYPE_PROFILES[icpResult.primaryStyle]
  const hybrid = resolveHybridArchetype(icpResult, personaResult)

  return {
    user_archetype: { id: profile.code, name_ko: profile.nameKo },
    axes: AXIS_ORDER.map((axis) => ({
      name: axis,
      score: icpResult.axes[axis],
      interpretation: getAxisInterpretation(axis, icpResult.axes[axis]),
    })),
    hybrid_archetype: {
      id: hybrid.id,
      name_ko: hybrid.nameKo,
      fallback: hybrid.fallback || undefined,
    },
    confidence: { score: icpResult.confidence, level: icpResult.confidenceLevel },
    key_strengths: profile.strengths.slice(0, 3),
    key_blindspots: profile.blindspots.slice(0, 3),
    what_user_wants: whatUserWants?.trim() || undefined,
    disclaimer:
      '이 요약은 자기이해를 위한 비임상 참고 정보이며, 의료·법률·투자 판단을 대체하지 않습니다.',
  }
}

export function buildEvidenceGroundingGuide(lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    return [
      '[근거 게이트]',
      '- 각 핵심 섹션은 최소 1개 이상 명시 근거를 포함한다.',
      '- 답변 전체 기준 최소 3개 근거 사용: 사주 1 + 점성 1 + 메트릭스/타이밍 1.',
      '- 근거가 약하면 강한 단정과 비가역 행동 권유를 금지한다.',
      '- 커뮤니케이션/문서 리스크가 보이면 서명/확정/발송/결제 즉시 실행을 금지한다.',
      '',
      '[검증 체크리스트]',
      '- recommendation과 caution은 서로 모순되면 안 된다.',
      '- 같은 문장을 재사용하지 않는다.',
      '- 실행 가이드는 검증 가능한 체크포인트 2개 이상 포함한다.',
    ].join('\n')
  }

  return [
    '[Evidence Gate]',
    '- Every core section must include at least one explicit evidence item.',
    '- Use at least 3 evidence points overall: saju 1 + astrology 1 + matrix/timing 1.',
    '- If evidence is weak, avoid strong claims and irreversible action recommendations.',
    '- If communication/document risk exists, block immediate sign/finalize/send/pay actions.',
    '',
    '[Validation Checklist]',
    '- Recommendations must not contradict cautions.',
    '- Do not repeat sentence templates.',
    '- Include at least two verifiable checkpoints in actionable guidance.',
  ].join('\n')
}

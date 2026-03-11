import { ICP_ARCHETYPE_PROFILES, getAxisInterpretation } from '@/lib/icpTest/results'
import { resolveHybridArchetype } from '@/lib/icpTest/hybrid'
import type { CounselingBrief, IcpAxisKey, IcpResult } from '@/lib/icpTest/types'
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

export function buildFortuneWithIcpSection(
  counselingBrief: CounselingBrief | null | undefined,
  lang: 'ko' | 'en'
): string {
  if (!counselingBrief) {
    return ''
  }

  const header =
    lang === 'ko'
      ? '[CounselingBrief: 성향 기반 보조 컨텍스트]'
      : '[CounselingBrief: personality grounding context]'

  return `${header}\n${JSON.stringify(counselingBrief)}`
}

export function buildFortuneWithIcpOutputGuide(lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    return [
      '[출력 가이드]',
      '- 질문에 대한 직접 답을 먼저 제시한다.',
      '- 순서를 지킨다: 한 줄 결론 -> 근거 -> 실행 계획 -> 주의/재확인.',
      '- 근거 없는 단정/예언 금지. 가능성/조건형으로 표현한다.',
      '- 의료/법률/투자 확정 조언은 금지한다.',
      '- 마지막에 다음 행동 1개를 제시한다.',
    ].join('\n')
  }

  return [
    '[Output Guide]',
    '- Answer the question directly first.',
    '- Use this order: direct answer -> evidence -> action plan -> avoid/recheck.',
    '- Use probabilistic wording, not deterministic prediction.',
    '- Do not provide medical/legal/investment certainty.',
    '- End with one immediate next action.',
  ].join('\n')
}

export function buildThemeDepthGuide(theme: string, lang: 'ko' | 'en'): string {
  const normalizedTheme = theme || 'chat'

  if (lang === 'ko') {
    return [
      '[해석 품질 규칙]',
      '- 모든 답변은 "근거 -> 해석 -> 행동" 순서로 연결한다.',
      '- 근거는 최소 3개 사용: 사주 1 + 점성 1 + 메트릭스/타이밍 1.',
      '- 문장 반복 금지. 섹션마다 새 정보만 제공한다.',
      '- 과장 금지: 완벽/무조건/반드시/최적 표현 사용 금지.',
      '- 불확실하면 단정하지 말고 재확인 포인트를 제시한다.',
      '',
      '[테마 초점]',
      normalizedTheme === 'love' || normalizedTheme === 'family'
        ? '- 관계 테마: 감정 신호, 대화 방식, 경계 설정, 복구 행동 중심으로 답한다.'
        : normalizedTheme === 'career' || normalizedTheme === 'wealth'
          ? '- 일/돈 테마: 의사결정 기준, 검토 항목, 실행 시점을 분리해서 답한다.'
          : normalizedTheme === 'health'
            ? '- 건강 테마: 생활 리듬, 회복 루틴, 과부하 신호를 관찰 가능한 지표로 제시한다.'
            : '- 종합 테마: 우선순위 1개를 정하고 행동을 그 기준에 정렬한다.',
    ].join('\n')
  }

  return [
    '[Interpretation Quality Contract]',
    '- Use evidence -> interpretation -> action in every answer.',
    '- Include at least 3 evidence points: saju 1 + astrology 1 + matrix/timing 1.',
    '- No repetition across sections.',
    '- Avoid overclaim words: perfect, guaranteed, must, optimal.',
    '- If uncertain, provide explicit recheck checkpoints.',
    '',
    '[Theme Focus]',
    normalizedTheme === 'love' || normalizedTheme === 'family'
      ? '- Relationship: communication patterns, boundaries, and repair actions.'
      : normalizedTheme === 'career' || normalizedTheme === 'wealth'
        ? '- Work/money: decision criteria, due-diligence checks, and timing by horizon.'
        : normalizedTheme === 'health'
          ? '- Health: daily rhythm, recovery protocol, and overload signals.'
          : '- General: pick one priority and align actions to it.',
  ].join('\n')
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

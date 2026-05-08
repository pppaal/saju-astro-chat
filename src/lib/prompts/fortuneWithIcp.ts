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
      '[출력 가이드 — 한 덩어리 산문]',
      '- 헤딩(##), 섹션 라벨, 불릿 리스트 사용 금지. 한 호흡으로 흐르는 산문으로만 답한다.',
      '- 첫 1~2문장에서 질문에 직접 답하고, 그 안에서 핵심 근거 한 줄을 자연스럽게 흡수한다.',
      '- 이어지는 단락에서 구조·타이밍·다음 행동·재확인을 *문장 안에 녹여서* 풀어낸다.',
      '- 근거 없는 단정/예언 금지. 가능성·조건형으로 표현한다.',
      '- 의료/법률/투자 확정 조언은 금지한다.',
      '- 마지막엔 다음 한 행동을 자연스럽게 제시하되 list-prescription 형식은 쓰지 않는다.',
    ].join('\n')
  }

  return [
    '[Output Guide — single flowing prose]',
    '- No markdown headings, section labels, or bullet lists. Answer in flowing prose only.',
    '- Open with a direct answer in 1-2 sentences, absorbing one core piece of evidence inline.',
    '- Continue with structure / timing / next action / recheck woven into sentences, not labeled.',
    '- Use probabilistic wording, not deterministic prediction.',
    '- Do not provide medical/legal/investment certainty.',
    '- End with one next action mentioned naturally, not as a list-prescription.',
  ].join('\n')
}

export function buildThemeDepthGuide(theme: string, lang: 'ko' | 'en'): string {
  const normalizedTheme = theme || 'chat'

  if (lang === 'ko') {
    return [
      '[해석 품질 규칙]',
      '- 모든 답변은 근거를 의식적으로 인용하면서 해석과 행동을 한 흐름으로 엮는다.',
      '- 근거는 최소 3개 — 사주 1 + 점성 1 + 매트릭스/타이밍 1 — 다른 문장에서 활용한다.',
      '- 같은 정보를 단락마다 반복하지 말고, 단락마다 새 정보를 더한다.',
      '- 과장 금지: 완벽/무조건/반드시/최적 표현 사용 금지.',
      '- 불확실하면 단정하지 말고 재확인 포인트를 자연어로 제시한다.',
      '',
      '[테마 초점]',
      normalizedTheme === 'love' || normalizedTheme === 'family'
        ? '- 관계 테마: 감정 신호, 대화 방식, 경계 설정, 복구 행동 중심으로 답한다.'
        : normalizedTheme === 'career' || normalizedTheme === 'wealth'
          ? '- 일/돈 테마: 의사결정 기준, 검토 항목, 실행 시점을 흐름 안에 녹여 답한다.'
          : normalizedTheme === 'health'
            ? '- 건강 테마: 생활 리듬, 회복 루틴, 과부하 신호를 관찰 가능한 지표로 제시한다.'
            : '- 종합 테마: 우선순위 1개를 정하고 행동을 그 기준에 정렬한다.',
    ].join('\n')
  }

  return [
    '[Interpretation Quality]',
    '- Weave evidence, interpretation, and action together in flowing prose.',
    '- Use at least 3 evidence points — 1 saju + 1 astrology + 1 matrix/timing — across sentences.',
    '- Each paragraph adds new info; do not repeat across paragraphs.',
    '- Avoid overclaim words: perfect, guaranteed, must, optimal.',
    '- If uncertain, name the recheck checkpoints in plain prose.',
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
      '- 답변 전체에 최소 3개 근거를 인용한다 — 사주 1 + 점성 1 + 매트릭스/타이밍 1.',
      '- 근거를 라벨링하지 말고 문장에 녹여 인용한다.',
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
    '- Cite at least 3 evidence points overall: saju 1 + astrology 1 + matrix/timing 1.',
    '- Do not label evidence; weave it into prose.',
    '- If evidence is weak, avoid strong claims and irreversible action recommendations.',
    '- If communication/document risk exists, block immediate sign/finalize/send/pay actions.',
    '',
    '[Validation Checklist]',
    '- Recommendations must not contradict cautions.',
    '- Do not repeat sentence templates.',
    '- Include at least two verifiable checkpoints in actionable guidance.',
  ].join('\n')
}

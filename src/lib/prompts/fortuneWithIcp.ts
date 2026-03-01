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
      '이 요약은 자기이해를 위한 비임상 참고 정보이며, 의료·법률·투자 판단을 대신하지 않습니다.',
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
      '- 아래 순서로 자연스럽게 답하되 번호/목록은 쓰지 않는다.',
      '- (1) 공감 요약 (2) 현재 흐름 (3) 선택지/행동 가이드',
      '- 운세는 단정형 예언이 아니라 가능성/조건형으로 표현한다.',
      '- 의료/법률/투자 확정 조언은 하지 않는다.',
      '- 끝에 반드시 고지 1문장: "이 내용은 엔터테인먼트/자기성찰용 참고이며 결정은 본인의 판단이 우선입니다."',
    ].join('\n')
  }

  return [
    '[Output Guide]',
    '- Keep a natural voice and avoid numbered or bulleted formatting.',
    '- Flow: empathy summary, current momentum, options and practical actions.',
    '- Use probabilistic wording, not deterministic prediction.',
    '- Do not provide medical, legal, or investment certainty.',
    '- End with a disclaimer sentence for entertainment/spiritual reflection use.',
  ].join('\n')
}

export function buildThemeDepthGuide(theme: string, lang: 'ko' | 'en'): string {
  const normalizedTheme = theme || 'chat'

  if (lang === 'ko') {
    return [
      '[해석 품질 규칙]',
      '- 모든 답변은 "근거 -> 해석 -> 행동" 순서로 연결한다.',
      '- 근거는 최소 3개 이상: 사주 1개 + 점성 1개 + 매트릭스/타이밍 1개.',
      '- 같은 말 재진술 금지. 문단마다 새로운 정보만 추가한다.',
      '- 과장 금지: "완벽/무조건/반드시/최적" 표현을 쓰지 않는다.',
      '- 불확실하면 모호하게 단정하지 말고, 확인 포인트를 명확히 제시한다.',
      '',
      '[문단 구성]',
      '- 1문단: 현재 흐름 요약(강점과 리스크를 동시에).',
      '- 2문단: 왜 그런지(교차 근거 2~3개 연결).',
      '- 3문단: 이번 주 실행(실행 가능한 행동 2~3개, 되돌릴 수 있는 행동 우선).',
      '- 4문단: 피해야 할 선택 1~2개 + 재확인 체크포인트.',
      '',
      '[테마 초점]',
      normalizedTheme === 'love' || normalizedTheme === 'family'
        ? '- 관계 테마: 감정 신호/대화 방식/경계 설정을 구체 행동으로 제시.'
        : normalizedTheme === 'career' || normalizedTheme === 'wealth'
          ? '- 일/돈 테마: 의사결정 기준, 검토 항목, 실행 시점(오늘/이번 주/이번 달)을 분리.'
          : normalizedTheme === 'health'
            ? '- 건강 테마: 생활 리듬, 회복 루틴, 과부하 신호를 관찰 가능한 지표로 제시.'
            : '- 종합 테마: 우선순위 1개를 정하고, 해당 우선순위 기준으로 행동을 정렬.',
      '',
      '[출력 깊이]',
      '- 분량은 짧게 끊지 말고, 사용자 맥락과 연결된 충분한 설명을 제공한다.',
      '- 결론은 "지금 당장 할 1가지"로 끝낸다.',
    ].join('\n')
  }

  return [
    '[Interpretation Quality Contract]',
    '- Use "evidence -> interpretation -> action" in every answer.',
    '- Include at least 3 evidence points: 1 saju + 1 astrology + 1 matrix/timing.',
    '- No repetition across paragraphs; each paragraph must add new information.',
    '- Avoid overclaim words such as perfect, guaranteed, must, optimal.',
    '- If uncertain, state verification checkpoints explicitly instead of forcing certainty.',
    '',
    '[Paragraph Structure]',
    '- P1: current momentum with both upside and risk.',
    '- P2: why this pattern appears using 2-3 cross-evidence links.',
    '- P3: actions for this week (2-3 concrete, reversible-first actions).',
    '- P4: 1-2 choices to avoid + recheck checklist.',
    '',
    '[Theme Focus]',
    normalizedTheme === 'love' || normalizedTheme === 'family'
      ? '- Relationship themes: communication patterns, boundaries, and repair actions.'
      : normalizedTheme === 'career' || normalizedTheme === 'wealth'
        ? '- Work/money themes: decision criteria, due-diligence checks, and timing by horizon.'
        : normalizedTheme === 'health'
          ? '- Health themes: daily rhythm, recovery protocol, and overload signals with observable markers.'
          : '- General themes: pick one priority and align all actions to that priority.',
    '',
    '[Depth]',
    '- Keep responses substantial and user-context specific.',
    '- End with one immediate next action.',
  ].join('\n')
}

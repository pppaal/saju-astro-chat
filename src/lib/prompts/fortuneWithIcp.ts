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

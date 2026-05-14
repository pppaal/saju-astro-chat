import type { RelationKey } from './types'

/**
 * Canonical relation list shown to the user in the compatibility form.
 * The `key` is what gets stored in DB / sent to the LLM; `label` is for UI;
 * `tone` is a one-line guidance injected into the system prompt so the AI
 * adjusts its register (e.g. don't talk marriage to a `friend` pairing).
 */
export interface RelationOption {
  key: RelationKey
  label: string
  /** Single-line directive that lands inside the [관계 유형별 상담 톤] block. */
  tone: string
  /** True when the relation invites romantic / marriage framing. */
  romantic: boolean
}

export const RELATION_OPTIONS: readonly RelationOption[] = [
  {
    key: 'partner',
    label: '연인',
    tone: '끌림, 일상의 조화, 갈등 해소, 장기 가능성. 결혼 얘기는 사용자가 꺼내거나 큰 결로 자연스러울 때만.',
    romantic: true,
  },
  {
    key: 'crush',
    label: '썸/관심',
    tone: '다가가는 결, 상대의 마음 흐름, 타이밍. 단정 짓지 않고 가능성으로.',
    romantic: true,
  },
  {
    key: 'spouse',
    label: '부부',
    tone: '오래 함께한 결, 가족·자녀 영향, 위기 회복, 다시 가까워지는 결.',
    romantic: true,
  },
  {
    key: 'engaged',
    label: '예비부부',
    tone: '결혼 전 점검. 부부싸움 패턴, 양가 조율, 시작 시기.',
    romantic: true,
  },
  {
    key: 'ex',
    label: '헤어진 사이',
    tone: '재결합 추천보다는 그 관계에서 배운 것, 다음 관계를 위한 자세. 사용자가 명시적으로 다시 만날지를 물을 때만 가능성 언급.',
    romantic: true,
  },
  {
    key: 'friend',
    label: '친구',
    tone: '우정의 결, 신뢰, 함께 성장. 로맨틱 비유 자제. 금성·화성을 끌림이 아니라 표현 스타일·추진 방식으로 풀이.',
    romantic: false,
  },
  {
    key: 'family',
    label: '가족',
    tone: '세대 차이, 소통 패턴, 거리감 조율. 끌림·결혼 비유 사용 안 함.',
    romantic: false,
  },
  {
    key: 'colleague',
    label: '동료/직장',
    tone: '협업 스타일, 의사결정 방식, 마찰 줄이는 길. 사적 감정·로맨스 다루지 않음.',
    romantic: false,
  },
  {
    key: 'business',
    label: '비즈니스 파트너',
    tone: '이해관계, 신뢰, 의사결정 호흡. 점성·사주의 재물·관운 자리를 중점.',
    romantic: false,
  },
  {
    key: 'other',
    label: '기타',
    tone: '사용자가 자유 텍스트로 적은 맥락을 그대로 존중하고, 거기에 맞춰 톤 조절.',
    romantic: false,
  },
] as const

const RELATION_MAP: Record<RelationKey, RelationOption> = RELATION_OPTIONS.reduce(
  (acc, opt) => {
    acc[opt.key] = opt
    return acc
  },
  {} as Record<RelationKey, RelationOption>
)

export function getRelation(key: RelationKey | string | undefined | null): RelationOption {
  if (key && key in RELATION_MAP) {
    return RELATION_MAP[key as RelationKey]
  }
  return RELATION_MAP.other
}

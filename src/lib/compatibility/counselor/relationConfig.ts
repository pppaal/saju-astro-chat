import type { Relation } from '@/lib/compatibility/relationTypes'

/**
 * 궁합 폼에서 사용자가 고르는 관계 유형의 단일 소스.
 *
 * - `key`   : DB 저장 / LLM 주입에 쓰는 값 (Relation 타입과 lockstep)
 * - `labelKo/labelEn` : 폼 <select> 및 LLM 라벨용
 * - `tone`  : 시스템 프롬프트의 [관계 유형별 상담 톤] 블록에 한 줄로 주입돼,
 *             AI 가 레지스터를 맞추게 한다 (예: friend 페어엔 결혼 얘기 X).
 * - `romantic` : 끌림/결혼 프레이밍이 어울리는 관계인지.
 *
 * 원래 claude/premium-profile-dashboard-zghGG 에서 만들었으나 머지 누락됐던
 * relationConfig 를 현재 main 의 Relation 키 체계(lover·sibling 유지)에 맞춰
 * 복원 + 확장(crush/engaged/ex/business 추가).
 */
export interface RelationOption {
  key: Relation
  labelKo: string
  labelEn: string
  /** [관계 유형별 상담 톤] 블록에 들어가는 한 줄 디렉티브. */
  tone: string
  /** 끌림/결혼 프레이밍이 어울리면 true. */
  romantic: boolean
}

export const RELATION_OPTIONS: readonly RelationOption[] = [
  {
    key: 'lover',
    labelKo: '연인',
    labelEn: 'Partner',
    tone: '끌림, 일상의 조화, 갈등 해소, 장기 가능성. 결혼 얘기는 사용자가 꺼내거나 큰 결로 자연스러울 때만.',
    romantic: true,
  },
  {
    key: 'crush',
    labelKo: '썸/관심',
    labelEn: 'Crush / Talking',
    tone: '다가가는 결, 상대의 마음 흐름, 타이밍. 단정 짓지 않고 가능성으로.',
    romantic: true,
  },
  {
    key: 'spouse',
    labelKo: '부부',
    labelEn: 'Spouse',
    tone: '오래 함께한 결, 가족·자녀 영향, 위기 회복, 다시 가까워지는 결.',
    romantic: true,
  },
  {
    key: 'engaged',
    labelKo: '예비부부',
    labelEn: 'Engaged',
    tone: '결혼 전 점검. 부부싸움 패턴, 양가 조율, 시작 시기.',
    romantic: true,
  },
  {
    key: 'ex',
    labelKo: '헤어진 사이',
    labelEn: 'Ex',
    tone: '재결합 추천보다는 그 관계에서 배운 것, 다음 관계를 위한 자세. 사용자가 명시적으로 다시 만날지를 물을 때만 가능성 언급.',
    romantic: true,
  },
  {
    key: 'friend',
    labelKo: '친구',
    labelEn: 'Friend',
    tone: '우정의 결, 신뢰, 함께 성장. 로맨틱 비유 자제. 금성·화성을 끌림이 아니라 표현 스타일·추진 방식으로 풀이.',
    romantic: false,
  },
  {
    key: 'family',
    labelKo: '가족',
    labelEn: 'Family',
    tone: '세대 차이, 소통 패턴, 거리감 조율. 끌림·결혼 비유 사용 안 함.',
    romantic: false,
  },
  {
    key: 'sibling',
    labelKo: '형제자매',
    labelEn: 'Sibling',
    tone: '함께 자란 결, 성향 차이, 역할·책임 분담, 오래가는 유대. 끌림·결혼 비유 사용 안 함.',
    romantic: false,
  },
  {
    key: 'colleague',
    labelKo: '동료/직장',
    labelEn: 'Colleague',
    tone: '협업 스타일, 의사결정 방식, 마찰 줄이는 길. 사적 감정·로맨스 다루지 않음.',
    romantic: false,
  },
  {
    key: 'business',
    labelKo: '비즈니스 파트너',
    labelEn: 'Business partner',
    tone: '이해관계, 신뢰, 의사결정 호흡. 점성·사주의 재물·관운 자리를 중점.',
    romantic: false,
  },
  {
    key: 'other',
    labelKo: '기타',
    labelEn: 'Other',
    tone: '사용자가 자유 텍스트로 적은 맥락을 그대로 존중하고, 거기에 맞춰 톤 조절.',
    romantic: false,
  },
] as const

const RELATION_MAP: Record<Relation, RelationOption> = RELATION_OPTIONS.reduce(
  (acc, opt) => {
    acc[opt.key] = opt
    return acc
  },
  {} as Record<Relation, RelationOption>
)

/** key 로 관계 옵션 조회. 모르는 값이면 'other' 폴백. */
export function getRelation(key: Relation | string | undefined | null): RelationOption {
  if (key && key in RELATION_MAP) {
    return RELATION_MAP[key as Relation]
  }
  return RELATION_MAP.other
}

/**
 * 시스템 프롬프트에 붙일 [관계 유형별 상담 톤] 블록 생성.
 * relation 이 없거나 anchor 단독이면 빈 문자열(주입 안 함).
 */
export function buildRelationToneBlock(
  relation: Relation | string | undefined | null,
  locale: 'ko' | 'en',
  note?: string
): string {
  if (!relation) return ''
  const opt = getRelation(relation)
  const label = locale === 'ko' ? opt.labelKo : opt.labelEn
  const ctx = opt.key === 'other' && note?.trim() ? `${label} (${note.trim()})` : label
  return locale === 'ko'
    ? `\n[관계 유형별 상담 톤 — ${ctx}]\n- ${opt.tone}`
    : `\n[Relationship-type counseling tone — ${ctx}]\n- ${opt.tone}`
}

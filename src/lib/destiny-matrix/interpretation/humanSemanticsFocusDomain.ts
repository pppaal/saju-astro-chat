/**
 * 추상 "결/기운" 표현을 사용자가 무엇의 결인지 즉시 알 수 있게 매핑하는 9 개
 * 구체 도메인. caller 가 focusDomain 으로 KO 라벨을 넘기면 자연어가
 * "재정/관계/일/건강/배움/사회/창의/감정/결단" 처럼 그 영역을 그대로 노출.
 *
 * conflict / timing 양쪽 자연어 헬퍼가 같은 사전을 보도록 별도 모듈로 둔다 —
 * 그래야 timing → conflict 의 back-edge import 가 생기지 않고 cycle 이 방지된다.
 */

export type FocusDomainLabel =
  | '재정'
  | '관계'
  | '일'
  | '건강'
  | '배움'
  | '사회'
  | '창의'
  | '감정'
  | '결단'

export type FocusDomainCopy = {
  ko: {
    /** "재정 영역", "관계 영역" 처럼 보조사 없이 영역 명사로 쓸 때. */
    noun: string
    /** "미뤘던 돈 결정", "약속" 처럼 구체 행동 명사. */
    action: string
    /** "기대 수익", "감정 추정" 처럼 영역 별 흔한 함정 명사. */
    pitfall: string
  }
  en: {
    /** "finances", "relationships" 처럼 복수/추상 명사. */
    noun: string
    /** "money decision", "follow-up promise" 같은 구체 명사. */
    action: string
    /** Trap noun — "the expected upside", "emotional guesswork". */
    pitfall: string
  }
}

export const FOCUS_DOMAIN_COPY: Record<FocusDomainLabel, FocusDomainCopy> = {
  재정: {
    ko: { noun: '재정', action: '돈 결정 하나', pitfall: '기대 수익' },
    en: {
      noun: 'finances',
      action: 'that one delayed money decision',
      pitfall: 'the expected upside',
    },
  },
  관계: {
    ko: { noun: '관계', action: '한 가지 약속', pitfall: '감정 추정' },
    en: { noun: 'relationships', action: 'one follow-up promise', pitfall: 'emotional guesswork' },
  },
  일: {
    ko: { noun: '일', action: '핵심 과제 하나', pitfall: '범위만 넓히는 욕심' },
    en: { noun: 'work', action: 'one priority deliverable', pitfall: 'unbounded scope' },
  },
  건강: {
    ko: { noun: '건강', action: '수면·식사 루틴 하나', pitfall: '무리한 보강' },
    en: {
      noun: 'health',
      action: 'one sleep or meal routine',
      pitfall: 'pushing harder than your body wants',
    },
  },
  배움: {
    ko: { noun: '배움', action: '학습 계획 하나', pitfall: '재료만 늘리는 욕심' },
    en: {
      noun: 'learning',
      action: 'one study plan',
      pitfall: 'collecting more material than you can absorb',
    },
  },
  사회: {
    ko: { noun: '사회', action: '평판이 걸린 한 마디', pitfall: '즉흥 코멘트' },
    en: {
      noun: 'social standing',
      action: 'one reputation-bearing message',
      pitfall: 'off-the-cuff comments',
    },
  },
  창의: {
    ko: { noun: '창의', action: '작업 한 꼭지', pitfall: '완벽주의' },
    en: { noun: 'creative work', action: 'one creative piece', pitfall: 'over-polishing' },
  },
  감정: {
    ko: { noun: '감정', action: '감정 한 가지 정리', pitfall: '회피' },
    en: { noun: 'inner state', action: 'one feeling to name and place', pitfall: 'avoidance' },
  },
  결단: {
    ko: { noun: '결단', action: '미뤘던 결정 하나', pitfall: '무한 검토' },
    en: {
      noun: 'decisions',
      action: 'one decision you have been deferring',
      pitfall: 'endless re-evaluation',
    },
  },
}

export function resolveFocusDomainCopy(
  label: string | undefined | null
): FocusDomainCopy | null {
  if (!label) return null
  const key = label.trim() as FocusDomainLabel
  return FOCUS_DOMAIN_COPY[key] ?? null
}

/**
 * 마지막 한글 음절의 받침(batchim) 유무로 받침 있을 때 / 없을 때 두 형태 중 하나를
 * 고른다. 한글이 아닌 끝글자(영문, 숫자 등)는 받침 있음으로 처리해 안전한 fallback.
 */
function pickByBatchim(text: string, withBatchim: string, withoutBatchim: string): string {
  if (!text) return withBatchim
  const lastChar = text[text.length - 1]
  const code = lastChar.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return withBatchim
  const hasBatchim = (code - 0xac00) % 28 !== 0
  return hasBatchim ? withBatchim : withoutBatchim
}

/** "을/를" 목적격 조사 — 받침 있으면 "을", 없으면 "를". */
export function withObjectParticle(text: string): string {
  return `${text}${pickByBatchim(text, '을', '를')}`
}

/** "과/와" 접속 조사 — 받침 있으면 "과", 없으면 "와". */
export function withConjunctionParticle(text: string): string {
  return `${text}${pickByBatchim(text, '과', '와')}`
}

/**
 * EventCategory (재정/관계/일/건강/이동 등 destiny-map 캘린더 카테고리)에서
 * focus-domain KO 라벨로 매핑. caller (calendar evidence support) 가
 * date.categories → focusDomain 으로 정규화할 때 사용.
 *
 * 알려진 카테고리 외에는 null 반환 — 자연어는 기존 abstract 흐름 표현으로 fall back.
 */
export function focusDomainFromCategory(category: string | undefined | null): FocusDomainLabel | null {
  if (!category) return null
  const key = String(category).toLowerCase()
  switch (key) {
    case 'wealth':
    case 'money':
    case 'finance':
    case 'finances':
      return '재정'
    case 'love':
    case 'relationship':
    case 'relationships':
      return '관계'
    case 'career':
    case 'work':
      return '일'
    case 'health':
      return '건강'
    case 'study':
    case 'learning':
      return '배움'
    case 'social':
    case 'reputation':
      return '사회'
    case 'creative':
    case 'creativity':
      return '창의'
    case 'emotion':
    case 'emotions':
    case 'inner':
      return '감정'
    case 'decision':
    case 'decisions':
    case 'choice':
      return '결단'
    default:
      return null
  }
}

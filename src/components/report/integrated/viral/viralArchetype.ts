/**
 * 바이럴 "한 장 요약" 콘텐츠 — 무료 리포트 맨 위에서 "헐 완전 나야"를 만드는 카피.
 * 결정론 원칙: 모두 명식에서 도출(일간 10간 별명 / 용신 5오행 궁합)되는 고정 사전.
 * 한자·전문용어 없이 평어로. ko/en 짝. IntegratedReport 의 ViralTopCard 가 소비.
 */
import type { BiLabel } from '../reportTypes'

export interface Archetype {
  emoji: string
  /** 유형 별명 — MBTI "건축가"처럼 스크린샷에 박히는 한 줄 이름. */
  name: BiLabel
  /** 소름 한 줄 — 살짝 띄워주는 정곡. "이거 완전 나" 유발. */
  oneLiner: BiLabel
}

// 일간(천간 10간) → 유형. 한자(甲乙…)·한글(갑을…) 둘 다 키로 받게 정규화는 호출부에서.
export const ARCHETYPE_BY_STEM: Record<string, Archetype> = {
  甲: {
    emoji: '🌳',
    name: { ko: '뻗어나가는 개척자', en: 'The Trailblazer' },
    oneLiner: {
      ko: '한번 정한 방향으로 끝까지 밀고 나가는, 타고난 리더예요.',
      en: 'A born leader — you pick a direction and push it all the way through.',
    },
  },
  乙: {
    emoji: '🌿',
    name: { ko: '유연한 생존가', en: 'The Adapter' },
    oneLiner: {
      ko: '부드러워 보여도 어떤 환경에서든 기어이 살아남는 끈기의 사람이에요.',
      en: 'Soft on the surface, but you bend without breaking and survive any environment.',
    },
  },
  丙: {
    emoji: '☀️',
    name: { ko: '빛나는 분위기메이커', en: 'The Radiator' },
    oneLiner: {
      ko: '있으면 그 자리가 환해지는, 사람을 끌어당기는 에너지가 있어요.',
      en: 'You light up the room — people are drawn to your warmth and energy.',
    },
  },
  丁: {
    emoji: '🕯️',
    name: { ko: '깊게 집중하는 장인', en: 'The Focused Maker' },
    oneLiner: {
      ko: '겉은 조용해도 한 가지에 깊이 파고드는 집중력이 진짜 무기예요.',
      en: 'Quiet outside, but your real weapon is burning deep focus on one thing.',
    },
  },
  戊: {
    emoji: '⛰️',
    name: { ko: '흔들림 없는 버팀목', en: 'The Anchor' },
    oneLiner: {
      ko: '주변이 흔들릴 때 모두가 기대는, 듬직한 중심이 되는 사람이에요.',
      en: 'When everything shakes, you are the steady center everyone leans on.',
    },
  },
  己: {
    emoji: '🌾',
    name: { ko: '묵묵히 키워내는 사람', en: 'The Cultivator' },
    oneLiner: {
      ko: '티 안 나게 챙기고 키워서, 결국 단단한 결실을 만들어내요.',
      en: 'You nurture quietly behind the scenes and end up growing something solid.',
    },
  },
  庚: {
    emoji: '⚔️',
    name: { ko: '결단의 승부사', en: 'The Decider' },
    oneLiner: {
      ko: '결정적 순간엔 누구보다 과감한, 의리 있고 추진력 강한 사람이에요.',
      en: 'In the decisive moment you act bolder than anyone — loyal and driven.',
    },
  },
  辛: {
    emoji: '💎',
    name: { ko: '예리한 완벽주의자', en: 'The Perfectionist' },
    oneLiner: {
      ko: '디테일 하나도 놓치지 않는, 예리하고 빛나는 감각의 소유자예요.',
      en: 'You miss no detail — sharp, refined, and quietly brilliant.',
    },
  },
  壬: {
    emoji: '🌊',
    name: { ko: '거침없는 자유인', en: 'The Free Current' },
    oneLiner: {
      ko: '틀에 갇히지 않고 넓게 흐르는, 자유롭고 지혜로운 사람이에요.',
      en: 'You flow wide and refuse to be boxed in — free-spirited and wise.',
    },
  },
  癸: {
    emoji: '💧',
    name: { ko: '깊이 느끼는 직관가', en: 'The Quiet Seer' },
    oneLiner: {
      ko: '겉은 잔잔한데 속은 누구보다 깊이 느끼고 꿰뚫어 보는 사람이에요.',
      en: 'Calm on the surface, but you feel and see deeper than anyone — quietly intuitive.',
    },
  },
}

// 용신(가장 필요한 기운) 오행 → "이런 사람과 잘 맞아요" 궁합 한 줄. 친구·연인 태그 유발.
export const PARTNER_BY_ELEMENT: Record<string, BiLabel> = {
  wood: {
    ko: '꾸준히 성장하고 따뜻하게 이끌어주는 사람',
    en: 'someone who grows steadily and leads you with warmth',
  },
  fire: {
    ko: '밝고 적극적이고 표현이 풍부한 사람',
    en: 'someone bright, outgoing, and expressive',
  },
  earth: {
    ko: '듬직하고 믿음직해서 안정감을 주는 사람',
    en: 'someone steady and dependable who makes you feel safe',
  },
  metal: {
    ko: '결단력 있고 깔끔하게 정리해주는 사람',
    en: 'someone decisive who brings clarity and order',
  },
  water: {
    ko: '지혜롭고 유연하게 받아주는 사람',
    en: 'someone wise and flexible who flows with you',
  },
}

const STEM_KO_TO_HAN: Record<string, string> = {
  갑: '甲',
  을: '乙',
  병: '丙',
  정: '丁',
  무: '戊',
  기: '己',
  경: '庚',
  신: '辛',
  임: '壬',
  계: '癸',
}

/** 일간 글자(한자 甲 또는 한글 갑)로 유형을 찾는다. 매칭 없으면 null. */
export function getArchetype(dayMaster: string): Archetype | null {
  const key = ARCHETYPE_BY_STEM[dayMaster] ? dayMaster : STEM_KO_TO_HAN[dayMaster]
  return key ? (ARCHETYPE_BY_STEM[key] ?? null) : null
}

// ── 화면/공유 카드가 함께 쓰는 언어-해석 완료 요약 ──────────────────────────
export interface ViralSummary {
  emoji: string
  name: string
  oneLiner: string
  /** 겉모습(상승궁) 한 줄 — 이미 lang 해석됨. 없으면 null. */
  outer: string | null
  /** 강점 → 해시태그(최대 3). */
  hashtags: string[]
  /** 동·서양이 둘 다 가리키는 주제(최대 3) — 우리만의 신뢰 훅. */
  resonant: string[]
  /** 궁합 한 줄(용신 기반) — 이미 lang 해석됨. 없으면 null. */
  partner: string | null
}

/** 명식에서 뽑은 1차 값으로 바이럴 요약을 합성. 순수 함수(테스트 가능). */
export function buildViralSummary(input: {
  dayMaster: string
  ascTrait?: string | null
  strengths: string[]
  resonant: string[]
  yongsinElement?: string | null
  lang: 'ko' | 'en'
}): ViralSummary | null {
  const a = getArchetype(input.dayMaster)
  if (!a) return null
  const lang = input.lang
  return {
    emoji: a.emoji,
    name: a.name[lang],
    oneLiner: a.oneLiner[lang],
    outer: input.ascTrait ?? null,
    hashtags: input.strengths.filter(Boolean).slice(0, 3),
    resonant: input.resonant.filter(Boolean).slice(0, 3),
    partner: input.yongsinElement
      ? (PARTNER_BY_ELEMENT[input.yongsinElement]?.[lang] ?? null)
      : null,
  }
}

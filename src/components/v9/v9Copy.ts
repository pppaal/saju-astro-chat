/**
 * v9 공용 문구 — 홈(/) · 인생 흐름(/destiny) · 캘린더(/calendar) 의 공용 부품이 함께 쓰는
 * 라벨. 모든 문구는 ko/en 한 쌍(Bi, lib/i18n/bi). 영어 문구엔 한글을 넣지 않는다
 * ('Kkachi', '까치' 아님). 화면 고유 문구는 각 화면의 copy 파일(예: home/homeCopy)에 둔다.
 *
 * 판정 문구(같음·서로 도움·두 결·무관)의 긴 꼴은 리포트와 같은 TONE_LABEL(잎 모듈)을
 * 그대로 읽는다 — 같은 판정이 화면마다 다른 말로 나오지 않게.
 */

import { pick, type Bi, type Lang } from '@/lib/i18n/bi'
import { TONE_LABEL, type CrossToneKey } from '@/lib/report/toneLabel'
import { DIAL_LABELS } from '@/lib/v9/ring'
import type { AstroElement } from '@/lib/saju/elementBridge'

export type { Bi, Lang, CrossToneKey }
export { pick }

/** 다이얼 라벨(지금 · 태어난 해 · 인생 전환) — lib/v9/ring(잎 모듈)이 SSOT. */
export { DIAL_LABELS }

/** 출처 표기 — 계산된 블록의 COMPUTED, 샘플 표시, 算 도장의 뜻, 계산·말 줄. */
export const PROVENANCE = {
  computed: { ko: '계산됨', en: 'COMPUTED' },
  sample: { ko: '샘플', en: 'Sample' },
  /** 算 도장의 스크린 리더 이름. */
  seal: { ko: '엔진이 계산함', en: 'Computed by the engine' },
  mathLabel: { ko: '계산', en: 'Math' },
  mathValue: { ko: '우리 엔진', en: 'our engine' },
  wordsLabel: { ko: '상담의 말', en: 'Words in the counselor' },
  wordsValue: { ko: 'AI', en: 'AI' },
} as const satisfies Record<string, Bi>

/** 두 체계의 이름 — 라벨은 SAJU × STARS, 문장은 'Saju × astrology'. */
export const SYSTEMS = {
  saju: { ko: '사주', en: 'Saju' },
  stars: { ko: '별자리', en: 'Stars' },
  pair: { ko: '사주 × 별자리', en: 'Saju × stars' },
} as const satisfies Record<string, Bi>

/** 판정 키 — 집계(tallyCrossRows)·교차 행·카드가 같은 네 칸을 쓴다. */
export type VerdictKey = 'same' | 'supportive' | 'twoPulls' | 'unrelated'

export const TONE_TO_VERDICT: Record<CrossToneKey, VerdictKey> = {
  resonant: 'same',
  complement: 'supportive',
  tension: 'twoPulls',
  neutral: 'unrelated',
}

/** 판정 — mono 짧은 꼴(SAME · SUPPORTIVE · TWO PULLS · UNRELATED)과 리포트와 같은 긴 꼴. */
export const VERDICT: Record<VerdictKey, { short: Bi; long: Bi }> = {
  same: { short: { ko: '같음', en: 'Same' }, long: TONE_LABEL.resonant },
  supportive: { short: { ko: '서로 도움', en: 'Supportive' }, long: TONE_LABEL.complement },
  twoPulls: { short: { ko: '두 결', en: 'Two pulls' }, long: TONE_LABEL.tension },
  unrelated: { short: { ko: '무관', en: 'Unrelated' }, long: TONE_LABEL.neutral },
}

/** 타이밍 범례 — 블록 맨 아래 한 번. ▲ 유리 · ▼ 불리. */
export const LEGEND = {
  timing: {
    ko: '타이밍 신호는 두 체계가 같은 쪽을 가리킬 때만 보여요',
    en: 'Timing signals appear only when both systems agree',
  },
  favorable: { ko: '유리', en: 'Favorable' },
  adverse: { ko: '불리', en: 'Adverse' },
} as const satisfies Record<string, Bi>

/** 오행 — 이름과 한자. */
export type ElementKey = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

export const ELEMENT: Record<ElementKey, { name: Bi; hanja: string }> = {
  wood: { name: { ko: '목', en: 'Wood' }, hanja: '木' },
  fire: { name: { ko: '화', en: 'Fire' }, hanja: '火' },
  earth: { name: { ko: '토', en: 'Earth' }, hanja: '土' },
  metal: { name: { ko: '금', en: 'Metal' }, hanja: '金' },
  water: { name: { ko: '수', en: 'Water' }, hanja: '水' },
}

/**
 * 서양 4원소 — 사주 카드 별 쪽(태양 별자리의 원소). 이름은 리포트 '정체성' 행의 별 칸과 같다
 * (불·흙·물 별자리는 오행 이름 화·토·수, 공기 별자리는 '공기' — report AIR_ELEMENT_LABEL).
 */
export type AstroElementKey = AstroElement

export const ASTRO_ELEMENT: Record<AstroElementKey, { name: Bi }> = {
  fire: { name: { ko: '화', en: 'Fire' } },
  earth: { name: { ko: '토', en: 'Earth' } },
  air: { name: { ko: '공기', en: 'Air' } },
  water: { name: { ko: '수', en: 'Water' } },
}

/** 사주 카드 — 머리말 훅, 기둥 칸 이름, 띠 라벨. */
export const CARD = {
  hook: { ko: '당신의 카드는?', en: 'What’s yours?' },
  hour: { ko: '시', en: 'Hour' },
  day: { ko: '일', en: 'Day' },
  month: { ko: '월', en: 'Month' },
  year: { ko: '연', en: 'Year' },
  you: { ko: '나', en: 'You' },
  hidden: { ko: '숨김', en: 'Hidden' },
  dayMaster: { ko: '일간', en: 'Day master' },
  bigThree: { ko: '빅 쓰리', en: 'Big three' },
  asc: { ko: 'ASC', en: 'ASC' },
  sun: { ko: '태양', en: 'Sun' },
  moon: { ko: '달', en: 'Moon' },
  lifeShape: { ko: '인생 모양', en: 'Life shape' },
  identity: { ko: '정체성', en: 'Identity' },
  /** '{n}' = 맞는 수(같음 + 서로 도움), '{m}' = 전체 축 수. */
  agree: {
    ko: '사주와 별자리가 {m}가지 중 {n}가지에서 맞아요',
    en: 'Saju × stars line up on {n} of {m} traits',
  },
  /** 카드 전체의 스크린 리더 이름. */
  aria: { ko: '사주 카드', en: 'Saju Card' },
} as const satisfies Record<string, Bi>

/** 가격 줄 — '{n}' 크레딧 수, '{price}' 최저가 라벨. */
export const PRICE = {
  fromCredit: { ko: '{n}크레딧부터', en: 'From {n} credit' },
  fromCredits: { ko: '{n}크레딧부터', en: 'From {n} credits' },
  creditsFrom: { ko: '크레딧은 {price}부터', en: 'Credits from {price}' },
  seePricing: { ko: '요금제 보기', en: 'See pricing' },
} as const satisfies Record<string, Bi>

/** 푸터 — 면책 두 줄, 링크(기존 footer.* 키와 같은 이름). ko 'Pricing' = '요금제'. */
export const FOOTER = {
  reflection: { ko: '스스로를 돌아보기 위한 읽을거리예요.', en: 'For self-reflection.' },
  tendencies: {
    ko: '리딩은 경향을 보여 줄 뿐, 약속하지 않아요.',
    en: 'A reading shows tendencies, not promises.',
  },
  pricing: { ko: '요금제', en: 'Pricing' },
  privacy: { ko: '개인정보처리방침', en: 'Privacy' },
  terms: { ko: '이용약관', en: 'Terms' },
  refund: { ko: '환불정책', en: 'Refund' },
  nav: { ko: '정책과 요금', en: 'Policies and pricing' },
} as const satisfies Record<string, Bi>

/** 상단 바·로딩·까치. */
export const CHROME = {
  back: { ko: '뒤로', en: 'Back' },
  loading: { ko: '불러오는 중', en: 'Loading' },
  kkachi: { ko: '까치', en: 'Kkachi' },
  wordmark: { ko: 'destinypal', en: 'destinypal' },
} as const satisfies Record<string, Bi>

/** '{key}' 자리표시자 채우기. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

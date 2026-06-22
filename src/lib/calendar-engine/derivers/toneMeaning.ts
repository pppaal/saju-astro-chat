/**
 * 큰 날 톤 문구 — 좋음/주의/중립 톤별 일상어 한 줄.
 *
 * convergence(엔진)와 MonthTier(클라)가 *같은 풀*을 쓰게 분리한 SSOT.
 * 분리 이유: 달력 셀 색은 일진 등급으로 칠하는데 리스트 의미는 수렴 톤으로 뽑아
 * 같은 날인데 "좋음 문구 + 주의 색"으로 어긋났다. 이제 MonthTier 가 셀 판정으로
 * 톤을 정해 이 풀에서 문구를 뽑으면 색과 글이 항상 일치한다.
 *
 * 풀 길이는 톤별 18+ — 큰 날 간격이 흔히 짝수(12일 등)라 짧은 풀이면 같은 문구가
 * 도배됐다(예: 6·18·30일이 전부 같은 줄). 풀을 키우고 개인 시드로 회전하면 날짜
 * 충돌도 줄고 사람마다 다른 문구가 나온다. (기존 7개는 앞쪽에 고정 — seed=0 호환)
 */

import { pickBySeed } from './personSeed'

export type MeaningTone = 'positive' | 'negative' | 'neutral'

const TONE_POOL_KO: Record<MeaningTone, string[]> = {
  positive: [
    // 기존 7(seed=0 호환 — 순서 고정)
    '일이 풀리는 날',
    '밀어붙이기 좋은 날',
    '기회가 열리는 날',
    '매듭을 짓기 좋은 날',
    '운이 손을 들어주는 날',
    '시작하기 좋은 날',
    '결실이 보이는 날',
    // 확장
    '바람이 등을 미는 날',
    '제안이 통하는 날',
    '길이 트이는 날',
    '손발이 맞는 날',
    '한 걸음 나아갈 날',
    '문이 열리는 날',
    '흐름을 타는 날',
    '뜻이 모이는 날',
    '결단이 빛나는 날',
    '복이 들어오는 날',
    '속도가 붙는 날',
    '인연이 닿는 날',
  ],
  negative: [
    // 기존 7
    '한 박자 늦추는 게 좋은 날',
    '점검이 필요한 날',
    '무리하지 않는 게 나은 날',
    '감정이 무거워질 수 있는 날',
    '결정을 미뤄도 좋은 날',
    '부딪힘을 조심할 날',
    '쉬어가도 되는 날',
    // 확장
    '말을 아끼는 게 좋은 날',
    '서두르면 손해 보는 날',
    '한 발 물러설 날',
    '욕심을 내려놓을 날',
    '지출을 줄이는 게 나은 날',
    '오해가 생기기 쉬운 날',
    '체력을 아껴야 할 날',
    '돌다리도 두드릴 날',
    '약속을 가려 받을 날',
    '마음이 지치기 쉬운 날',
    '판단을 미루는 게 나은 날',
    '한 템포 쉬어갈 날',
  ],
  neutral: [
    // 기존 7
    '흐름이 바뀌는 날',
    '방향을 다시 잡는 날',
    '큰 변화가 시작되는 날',
    '균형이 다시 잡히는 날',
    '한 장이 넘어가는 날',
    '갈림길에 서는 날',
    '판이 새로 짜이는 날',
    // 확장
    '매듭을 다시 푸는 날',
    '시야가 넓어지는 날',
    '리듬이 바뀌는 날',
    '문턱을 넘는 날',
    '계절이 도는 날',
    '국면이 전환되는 날',
    '선택이 갈리는 날',
    '결이 달라지는 날',
    '한 막이 내리는 날',
    '새 장을 여는 날',
    '바람의 방향이 도는 날',
    '저울이 움직이는 날',
  ],
}

const TONE_POOL_EN: Record<MeaningTone, string[]> = {
  positive: [
    // existing 7 (seed=0 compatible — keep order)
    'things fall into place',
    'a good day to push',
    'a window opens',
    'a good day to close a deal',
    'luck leans your way',
    'a good day to start',
    'results come into view',
    // expansion
    'the wind is at your back',
    'a day to say yes',
    'doors swing open',
    'momentum builds',
    'a day to make your move',
    'the pieces line up',
    'a day to ride the wave',
    'good news finds you',
    'a day to plant seeds',
    'effort pays off',
    'a day to ask boldly',
    'the path clears',
  ],
  negative: [
    // existing 7
    'better to slow down',
    'a day for review',
    'don’t overreach',
    'feelings may run heavy',
    'fine to postpone the call',
    'mind the friction',
    'a day to rest',
    // expansion
    'keep your words light',
    'haste will cost you',
    'a day to step back',
    'let go of the urge',
    'guard your spending',
    'misreadings come easy',
    'save your energy',
    'double-check before you act',
    'pick your battles',
    'a day to hold steady',
    'avoid the hard call',
    'mind your patience',
  ],
  neutral: [
    // existing 7
    'the current shifts',
    'reset your direction',
    'a big change begins',
    'things rebalance',
    'a chapter turns',
    'a fork in the road',
    'the board is reset',
    // expansion
    'the season turns',
    'your view widens',
    'the rhythm changes',
    'a threshold appears',
    'the page flips over',
    'the phase shifts',
    'a choice splits the path',
    'the grain runs anew',
    'one act ends',
    'a new scene opens',
    'the wind changes course',
    'the scales tip over',
  ],
}

/**
 * 톤 + 날짜(일) + 개인 시드 → 그 톤 풀에서 한 줄.
 * seed(본명 고정)를 함께 회전 키로 써서 **같은 날·같은 톤이라도 사람마다 다른 문구**
 * 가 나온다(seed 0/미지정이면 날짜만으로 회전 — 옛 동작과 호환).
 */
export function toneMeaningFor(
  tone: MeaningTone,
  dayNum: number,
  lang: 'ko' | 'en' = 'ko',
  seed = 0
): string {
  const pool = lang === 'en' ? TONE_POOL_EN : TONE_POOL_KO
  return pickBySeed(pool[tone], seed, Number.isFinite(dayNum) ? dayNum : 0)
}

/**
 * 큰 날 톤 문구 — 좋음/주의/중립 톤별 일상어 한 줄.
 *
 * convergence(엔진)와 MonthTier(클라)가 *같은 풀*을 쓰게 분리한 SSOT.
 * 분리 이유: 달력 셀 색은 일진 등급으로 칠하는데 리스트 의미는 수렴 톤으로 뽑아
 * 같은 날인데 "좋음 문구 + 주의 색"으로 어긋났다. 이제 MonthTier 가 셀 판정으로
 * 톤을 정해 이 풀에서 문구를 뽑으면 색과 글이 항상 일치한다.
 *
 * 풀 길이 7(소수) — 큰 날 간격이 흔히 짝수(12일 등)라 mod 4·6 이면 같은 문구가
 * 도배됐다(예: 6·18·30일이 전부 같은 줄). 7 로 두고 날짜로 회전하면 충돌이 준다.
 */

import { pickBySeed } from './personSeed'

export type MeaningTone = 'positive' | 'negative' | 'neutral'

const TONE_POOL_KO: Record<MeaningTone, string[]> = {
  positive: [
    '일이 풀리는 날',
    '밀어붙이기 좋은 날',
    '기회가 열리는 날',
    '매듭을 짓기 좋은 날',
    '운이 손을 들어주는 날',
    '시작하기 좋은 날',
    '결실이 보이는 날',
  ],
  negative: [
    '한 박자 늦추는 게 좋은 날',
    '점검이 필요한 날',
    '무리하지 않는 게 나은 날',
    '감정이 무거워질 수 있는 날',
    '결정을 미뤄도 좋은 날',
    '부딪힘을 조심할 날',
    '쉬어가도 되는 날',
  ],
  neutral: [
    '흐름이 바뀌는 날',
    '방향을 다시 잡는 날',
    '큰 변화가 시작되는 날',
    '균형이 다시 잡히는 날',
    '한 장이 넘어가는 날',
    '갈림길에 서는 날',
    '판이 새로 짜이는 날',
  ],
}

const TONE_POOL_EN: Record<MeaningTone, string[]> = {
  positive: [
    'things fall into place',
    'a good day to push',
    'a window opens',
    'a good day to close a deal',
    'luck leans your way',
    'a good day to start',
    'results come into view',
  ],
  negative: [
    'better to slow down',
    'a day for review',
    'don’t overreach',
    'feelings may run heavy',
    'fine to postpone the call',
    'mind the friction',
    'a day to rest',
  ],
  neutral: [
    'the current shifts',
    'reset your direction',
    'a big change begins',
    'things rebalance',
    'a chapter turns',
    'a fork in the road',
    'the board is reset',
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

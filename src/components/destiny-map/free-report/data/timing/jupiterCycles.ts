/**
 * 목성 12년 주기 해석. 목성 회귀는 약 12세, 24세, 36세, 48세, 60세 주기.
 */

import type { BilingualText } from '../../types/core';

export interface JupiterCycleEntry {
  age: string;
  meaning: BilingualText;
  bestUse: BilingualText;
}

export const JUPITER_CYCLES: Record<string, JupiterCycleEntry> = {
  twelve: {
    age: '11~12',
    meaning: { ko: '첫 정체성의 씨앗 — 또래 그룹과 관심사가 정해져요.', en: 'First identity seed — peer group and interests form.' },
    bestUse: { ko: '재능과 흥미의 첫 단서를 기록해두면 평생 자산.', en: 'Record first clues of talent and interest — lifelong asset.' },
  },
  twentyFour: {
    age: '23~25',
    meaning: { ko: '첫 어른 챕터 — 직업·연애·정체성 첫 정착.', en: 'First adult chapter — first settling of career, love, identity.' },
    bestUse: { ko: '큰 도약을 두려워하지 말고 시도하세요.', en: 'Do not fear big leaps — try.' },
  },
  thirtySix: {
    age: '35~37',
    meaning: { ko: '인생 후반 비전 정립의 적기.', en: 'Optimal time to establish second-half vision.' },
    bestUse: { ko: '인생의 진짜 방향을 다시 적어보세요.', en: 'Rewrite your life\'s true direction.' },
  },
  fortyEight: {
    age: '47~49',
    meaning: { ko: '성숙한 의미 추구 — 지위보다 의미가 중요해지는 시기.', en: 'Mature meaning-seeking — meaning over status.' },
    bestUse: { ko: '커리어를 의미 중심으로 재정비하세요.', en: 'Realign career around meaning.' },
  },
  sixty: {
    age: '59~61',
    meaning: { ko: '인생 정수의 정리와 환원의 시기.', en: 'Distilling and giving back the essence of life.' },
    bestUse: { ko: '자기 경험을 사회에 환원하는 방법을 찾으세요.', en: 'Find ways to give your experience back to society.' },
  },
};

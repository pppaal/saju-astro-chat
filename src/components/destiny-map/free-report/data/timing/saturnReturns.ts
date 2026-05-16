/**
 * 토성 회귀(Saturn Return) 해석.
 * 약 29.5세, 58.5세, 88세 무렵 — 인생의 큰 책임 시험대.
 */

import type { BilingualText } from '../../types/core';

export interface SaturnReturnEntry {
  ageWindow: string;
  theme: BilingualText;
  challenge: BilingualText;
  reward: BilingualText;
  advice: BilingualText;
}

export const SATURN_RETURNS: Record<'first' | 'second' | 'third', SaturnReturnEntry> = {
  first: {
    ageWindow: '27~31',
    theme: { ko: '어른 되기 — 자기 인생의 책임을 처음으로 짊어지는 시기.', en: 'Becoming adult — first time shouldering life\'s responsibility.' },
    challenge: {
      ko: '직업·결혼·정착 등 큰 결정이 한꺼번에 몰려오고, 부모로부터의 진짜 독립을 시험받아요.',
      en: 'Career, marriage, settling decisions pile up — true separation from parents is tested.',
    },
    reward: {
      ko: '통과하면 진짜 자기 인생의 주인이 되는 자기 정체성을 갖게 돼요.',
      en: 'Passing gives you the identity of a true owner of your own life.',
    },
    advice: {
      ko: '도망치지 말고, 한 번에 하나씩 책임을 받아들이세요.',
      en: 'Do not flee — accept responsibility one at a time.',
    },
  },
  second: {
    ageWindow: '57~60',
    theme: { ko: '인생 결산 — 지금까지의 길이 맞았는지 다시 검토.', en: 'Life audit — re-examining whether the path so far was right.' },
    challenge: {
      ko: '커리어 마무리·은퇴·자녀 독립·부모 부양 등 동시 다발 결정.',
      en: 'Simultaneous decisions: career wrap-up, retirement, children\'s independence, elder care.',
    },
    reward: {
      ko: '진짜 자기 사명에 맞는 인생 후반전을 설계할 수 있어요.',
      en: 'Can design the second half of life aligned with your true mission.',
    },
    advice: {
      ko: '쌓아온 것을 일부 내려놓을 용기가 필요해요.',
      en: 'Need the courage to let go of part of what you have built.',
    },
  },
  third: {
    ageWindow: '86~90',
    theme: { ko: '인생 통합 — 모든 경험이 지혜로 통합되는 시기.', en: 'Life integration — all experience converges to wisdom.' },
    challenge: {
      ko: '건강·이별·정리 등 끝맺음의 과제가 자주 와요.',
      en: 'Tasks of closure recur: health, loss, sorting through possessions.',
    },
    reward: {
      ko: '다음 세대에 전수할 깊은 지혜를 가진 어른이 돼요.',
      en: 'Becomes an elder with deep wisdom to pass on.',
    },
    advice: {
      ko: '경험을 글·녹음·대화로 남겨두세요.', en: 'Leave your experience as writing, recordings, conversations.',
    },
  },
};

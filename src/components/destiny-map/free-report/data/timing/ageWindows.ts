/**
 * 인생 시기별 일반 운 — 사주 12운성과 무관한 점성 기준의 큰 windows.
 */

import type { BilingualText } from '../../types/core';

export interface AgeWindowEntry {
  range: string;
  archetype: BilingualText;
  focus: BilingualText;
  caution: BilingualText;
}

export const LIFE_WINDOWS: Record<'childhood' | 'youth' | 'earlyAdult' | 'mid' | 'middleAge' | 'lateMid' | 'elder', AgeWindowEntry> = {
  childhood: {
    range: '0~12',
    archetype: { ko: '뿌리내림 — 가정의 색이 평생을 좌우.', en: 'Rooting — family color shapes a lifetime.' },
    focus: { ko: '부모·환경·기초 학습.', en: 'Parents, environment, basic learning.' },
    caution: { ko: '아동기 결핍은 평생 패턴이 되니 따뜻한 환경이 핵심.', en: 'Childhood deficits become lifelong patterns — warmth is key.' },
  },
  youth: {
    range: '13~22',
    archetype: { ko: '자기 탐색 — 정체성과 또래 그룹 형성.', en: 'Self-exploration — identity and peer group form.' },
    focus: { ko: '학습·관심사 발굴·첫 사회 경험.', en: 'Learning, discovering interests, first social experience.' },
    caution: { ko: '비교에 자기를 잃지 말고 자기 색을 찾아요.', en: 'Do not lose self in comparison — find your color.' },
  },
  earlyAdult: {
    range: '23~35',
    archetype: { ko: '도약기 — 자기 길을 만들어가는 폭발기.', en: 'Leap period — explosive making of own path.' },
    focus: { ko: '커리어 정착·결혼 결정·자기 자산 형성.', en: 'Career settling, marriage decisions, asset formation.' },
    caution: { ko: '큰 결정이 몰려오니 신중함과 과감함의 균형이 필요해요.', en: 'Big decisions stack — balance care and boldness.' },
  },
  mid: {
    range: '36~45',
    archetype: { ko: '성숙기 — 결과가 누적되는 시기.', en: 'Maturation — results accumulate.' },
    focus: { ko: '본업 정점·전문성 심화·가정 안정.', en: 'Career peak, deepening expertise, family stability.' },
    caution: { ko: '번아웃과 가족 무관심을 동시에 경계.', en: 'Beware burnout and family neglect together.' },
  },
  middleAge: {
    range: '46~55',
    archetype: { ko: '재정의기 — 의미와 사명이 다시 묻는 시기.', en: 'Redefinition — meaning and mission ask again.' },
    focus: { ko: '진짜 사명 찾기·자녀 독립 준비·자기 돌봄.', en: 'Finding true mission, preparing for kids\' independence, self-care.' },
    caution: { ko: '중년 위기를 직시하지 않으면 우울이 깊어져요.', en: 'Facing midlife crisis head-on prevents deeper depression.' },
  },
  lateMid: {
    range: '56~65',
    archetype: { ko: '환원기 — 쌓은 것을 다시 사회에 돌리는 시기.', en: 'Giving back — returning what was built to society.' },
    focus: { ko: '멘토링·은퇴 설계·건강 재정비.', en: 'Mentoring, retirement design, health realignment.' },
    caution: { ko: '욕망보다 의미를 따라 살기 시작할 때.', en: 'Time to live by meaning rather than desire.' },
  },
  elder: {
    range: '66+',
    archetype: { ko: '지혜기 — 경험이 지혜가 되는 시기.', en: 'Wisdom — experience becomes wisdom.' },
    focus: { ko: '다음 세대 전수·자기 정리·영성.', en: 'Passing to the next generation, sorting self, spirituality.' },
    caution: { ko: '관계에서 떠나지 말고 한 가지 활동을 끝까지.', en: 'Do not retreat from relationships — keep one activity to the end.' },
  },
};

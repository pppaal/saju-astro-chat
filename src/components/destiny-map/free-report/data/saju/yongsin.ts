/**
 * 용신(用神) 해석 — 일간의 강약에 따라 사주를 균형 잡아주는 핵심 오행.
 *
 * /lib/saju/yongsin.ts 의 출력 형태:
 *   { type, strength, kibsin, luckyColors[], luckyNumbers[] }
 *
 * `type` 은 용신의 오행(wood/fire/earth/metal/water) 또는 십신 카테고리이며,
 * 본 파일은 두 형태 모두에 매핑할 수 있는 해석 사전을 제공한다.
 */

import type { BilingualText, FiveElement, SibsinCategory } from '../../types/core';

export interface YongsinEntry {
  name: BilingualText;
  meaning: BilingualText;
  luckyDomains: BilingualText;
  career: BilingualText;
  relationships: BilingualText;
  dailyPractice: BilingualText;
}

/** 오행 단위 용신 해석. */
export const YONGSIN_BY_ELEMENT: Record<FiveElement, YongsinEntry> = {
  wood: {
    name: { ko: '목 용신', en: 'Wood Yongsin' },
    meaning: {
      ko: '성장·확장·새 시작이 당신을 살리는 핵심 에너지예요.',
      en: 'Growth, expansion, fresh starts are the energy that saves you.',
    },
    luckyDomains: {
      ko: '교육·환경·창업·식물·인테리어·자기계발 분야가 호운을 부릅니다.',
      en: 'Education, environment, startups, plants, interior, self-development bring luck.',
    },
    career: {
      ko: '리더 역할, 새 프로젝트 개척, 기획 분야에서 빛나요.',
      en: 'Shines in leadership, pioneering new projects, planning roles.',
    },
    relationships: {
      ko: '곁에 두면 좋은 사람: 따뜻하고 성장 지향적인 사람.',
      en: 'Keep close: warm, growth-oriented people.',
    },
    dailyPractice: {
      ko: '아침 햇빛·산책·식물 가꾸기·동쪽 방향 자주 사용.',
      en: 'Morning sunlight, walks, tending plants, frequent use of east direction.',
    },
  },
  fire: {
    name: { ko: '화 용신', en: 'Fire Yongsin' },
    meaning: {
      ko: '열정·표현·관계가 당신을 살리는 핵심 에너지예요.',
      en: 'Passion, expression, connection are the energy that saves you.',
    },
    luckyDomains: {
      ko: '엔터테인먼트·미디어·교육·마케팅·요식·뷰티 분야가 잘 맞아요.',
      en: 'Entertainment, media, education, marketing, food, beauty suit you.',
    },
    career: {
      ko: '대중 앞 무대, 발표, 영업, 콘텐츠 영역에서 두각을 보여요.',
      en: 'Stands out on stages, presentations, sales, content domains.',
    },
    relationships: {
      ko: '곁에 두면 좋은 사람: 밝고 솔직하게 표현하는 사람.',
      en: 'Keep close: bright, openly expressive people.',
    },
    dailyPractice: {
      ko: '햇빛·붉은 색·따뜻한 음료·표현하는 활동(노래·말하기) 자주.',
      en: 'Sun, red colors, warm drinks, frequent expressive activities (singing, speaking).',
    },
  },
  earth: {
    name: { ko: '토 용신', en: 'Earth Yongsin' },
    meaning: {
      ko: '안정·중심·신뢰가 당신을 살리는 핵심 에너지예요.',
      en: 'Stability, center, trust are the energy that saves you.',
    },
    luckyDomains: {
      ko: '부동산·건설·요식·금융·교육·중개 분야가 호운을 부릅니다.',
      en: 'Real estate, construction, food, finance, education, brokerage bring luck.',
    },
    career: {
      ko: '관리·중재·기획·교육·전통 산업에서 신뢰를 자산으로 키워요.',
      en: 'Management, mediation, planning, education, traditional industries — trust as asset.',
    },
    relationships: {
      ko: '곁에 두면 좋은 사람: 묵직하고 약속을 지키는 사람.',
      en: 'Keep close: weighty, promise-keeping people.',
    },
    dailyPractice: {
      ko: '규칙적인 식사·요리·정원 가꾸기·황토색 사용·중앙 거주.',
      en: 'Regular meals, cooking, gardening, ocher colors, central living spaces.',
    },
  },
  metal: {
    name: { ko: '금 용신', en: 'Metal Yongsin' },
    meaning: {
      ko: '결단·정리·정련이 당신을 살리는 핵심 에너지예요.',
      en: 'Decision, refining, cleaning up are the energy that saves you.',
    },
    luckyDomains: {
      ko: '법·금융·IT·디자인·뷰티·의료(외과)·기계 분야가 호운을 부릅니다.',
      en: 'Law, finance, IT, design, beauty, surgery, machinery bring luck.',
    },
    career: {
      ko: '정밀함과 결단력이 필요한 자리에서 빛나요.',
      en: 'Shines in roles needing precision and decisiveness.',
    },
    relationships: {
      ko: '곁에 두면 좋은 사람: 솔직하고 시원하게 잘라주는 사람.',
      en: 'Keep close: people who speak honestly and cut clean.',
    },
    dailyPractice: {
      ko: '환기·정리정돈·기상 후 운동·하얀색·서쪽 방향 사용.',
      en: 'Ventilation, tidying, morning exercise, white colors, west direction.',
    },
  },
  water: {
    name: { ko: '수 용신', en: 'Water Yongsin' },
    meaning: {
      ko: '지혜·흐름·고요가 당신을 살리는 핵심 에너지예요.',
      en: 'Wisdom, flow, stillness are the energy that saves you.',
    },
    luckyDomains: {
      ko: '연구·IT·금융·예술·치유·물 관련 산업이 잘 맞아요.',
      en: 'Research, IT, finance, art, healing, water-related industries suit you.',
    },
    career: {
      ko: '깊이 파고드는 일, 분석, 콘텐츠 기획, 멘토링에 강해요.',
      en: 'Strong in deep-diving work, analysis, content planning, mentoring.',
    },
    relationships: {
      ko: '곁에 두면 좋은 사람: 차분하고 지혜로운 사람.',
      en: 'Keep close: calm, wise people.',
    },
    dailyPractice: {
      ko: '수분 섭취·수영·명상·검정/파랑 색 사용·북쪽 방향 활용.',
      en: 'Hydration, swimming, meditation, black/blue colors, north direction.',
    },
  },
};

/** 십신 카테고리 단위 용신 해석. */
export const YONGSIN_BY_SIBSIN: Record<SibsinCategory, BilingualText> = {
  비겁: {
    ko: '자기 힘으로 일어서는 시기 — 동료를 찾고 자기 색을 분명히 하세요.',
    en: 'Time to stand on your own — find peers and clarify your color.',
  },
  식상: {
    ko: '재능을 세상에 푸는 시기 — 표현하고 가르치고 만드세요.',
    en: 'Time to release talent — express, teach, create.',
  },
  재성: {
    ko: '현실의 수확기 — 돈·관계·결과로 자기를 증명하세요.',
    en: 'Time of real-world harvest — prove yourself in money, relationships, outcomes.',
  },
  관성: {
    ko: '책임을 받아들이는 시기 — 직위·역할·약속으로 신뢰를 쌓으세요.',
    en: 'Time to take responsibility — build trust through position, role, promises.',
  },
  인성: {
    ko: '배우고 회복하는 시기 — 책·스승·내면으로 돌아가세요.',
    en: 'Time to learn and recover — return to books, teachers, your inner world.',
  },
};

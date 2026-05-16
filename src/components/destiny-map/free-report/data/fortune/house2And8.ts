/**
 * 2하우스(자기 자원) / 8하우스(공동·숨겨진 자원) × 별자리 해석.
 * 점성에서 재물 운을 보는 핵심 두 하우스.
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export interface FortuneHouseEntry {
  house2: BilingualText;
  house8: BilingualText;
}

export const FORTUNE_HOUSES: Record<ZodiacSign, FortuneHouseEntry> = {
  aries: {
    house2: { ko: '자기 추진력이 곧 수입으로 — 개척에서 부가 나와요.', en: 'Own drive becomes income — wealth from pioneering.' },
    house8: { ko: '공동 자원에서도 주도권을 가져야 운이 풀려요.', en: 'Take initiative in shared resources to unlock luck.' },
  },
  taurus: {
    house2: { ko: '감각·예술·실물 자산에서 부가 자라요.', en: 'Wealth grows from senses, art, tangible assets.' },
    house8: { ko: '공동 투자·유산에서 안정적 흐름.', en: 'Stable flow from joint investments and inheritance.' },
  },
  gemini: {
    house2: { ko: '글·말·정보·소통에서 부가 나와요.', en: 'Wealth from writing, speech, info, communication.' },
    house8: { ko: '계약·정보 격차 활용이 핵심.', en: 'Key: leverage contracts and info gaps.' },
  },
  cancer: {
    house2: { ko: '돌봄·식·가족 관련 일에서 부가 나와요.', en: 'Wealth from caring, food, family-related work.' },
    house8: { ko: '가족·유산에서 운명적 흐름이 옵니다.', en: 'Fated flow from family and inheritance.' },
  },
  leo: {
    house2: { ko: '자기 표현·브랜드·창작이 곧 수입.', en: 'Self-expression, brand, creation are income.' },
    house8: { ko: '드라마틱한 변환의 사이클이 부와 연결돼요.', en: 'Dramatic transformation cycles link to wealth.' },
  },
  virgo: {
    house2: { ko: '정밀함·전문성·디테일이 자기 자산.', en: 'Precision, expertise, detail are assets.' },
    house8: { ko: '시스템 정비와 데이터로 큰돈을 다뤄요.', en: 'Handle big money through systems and data.' },
  },
  libra: {
    house2: { ko: '관계·미·외교가 부의 통로.', en: 'Relations, beauty, diplomacy channel wealth.' },
    house8: { ko: '결혼·동업 자산에서 큰 변화가 와요.', en: 'Big shifts come from marriage and partnership assets.' },
  },
  scorpio: {
    house2: { ko: '깊이 파고드는 전문성에서 부가 나와요.', en: 'Wealth from deep, penetrating expertise.' },
    house8: { ko: '본진 — 유산·금융·심리에서 큰 운.', en: 'Home turf — big luck in inheritance, finance, psyche.' },
  },
  sagittarius: {
    house2: { ko: '교육·해외·확장된 비전에서 부가 옵니다.', en: 'Wealth from education, abroad, expanded vision.' },
    house8: { ko: '해외 자산·신탁·종교 기금이 흐름과 연결.', en: 'Overseas assets, trusts, religious funds connect to flow.' },
  },
  capricorn: {
    house2: { ko: '꾸준한 축적과 책임이 자기 자산.', en: 'Steady accumulation and responsibility are assets.' },
    house8: { ko: '권력·자산 구조를 직접 다루는 운.', en: 'Hands-on with power and asset structures.' },
  },
  aquarius: {
    house2: { ko: '혁신·기술·공동체가 부의 통로.', en: 'Innovation, tech, community channel wealth.' },
    house8: { ko: '크라우드·집단 자산·미래 모델에서 흐름.', en: 'Flow from crowd, collective, future models.' },
  },
  pisces: {
    house2: { ko: '예술·치유·영성이 자기 자산.', en: 'Art, healing, spirituality are assets.' },
    house8: { ko: '꿈·환상·자선에서 부가 들어와요.', en: 'Wealth from dreams, fantasy, charity.' },
  },
};

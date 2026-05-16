/**
 * 십신 카테고리별 재물 흐름 해석.
 */

import type { BilingualText, SibsinCategory } from '../../types/core';

export interface SibsinWealthEntry {
  flow: BilingualText;
  bestApproach: BilingualText;
  warning: BilingualText;
}

export const SIBSIN_WEALTH: Record<SibsinCategory, SibsinWealthEntry> = {
  비겁: {
    flow: { ko: '자기 손으로 버는 흐름 — 동료와 함께할 때 시너지가 나요.', en: 'Earned by own hand — synergy with peers.' },
    bestApproach: { ko: '동업·전문직·1인 사업이 잘 맞아요.', en: 'Partnership, profession, solo business fit.' },
    warning: { ko: '친구·동료와 돈이 얽히면 다툼이 잦아요.', en: 'Money tangled with friends invites conflict.' },
  },
  식상: {
    flow: { ko: '재능과 표현이 직접 부로 전환되는 흐름.', en: 'Talent and expression convert directly to wealth.' },
    bestApproach: { ko: '창작·교육·콘텐츠·서비스가 잘 맞아요.', en: 'Creation, education, content, service fit.' },
    warning: { ko: '들어온 만큼 쓰는 성향이 강해 저축 시스템 필수.', en: 'Spend-as-you-earn — savings system essential.' },
  },
  재성: {
    flow: { ko: '재물 자체를 다루는 운 — 인생 가장 큰 부의 흐름.', en: 'Handling money itself — largest wealth flow of life.' },
    bestApproach: { ko: '사업·투자·영업·부동산이 잘 맞아요.', en: 'Business, investment, sales, real estate fit.' },
    warning: { ko: '돈에 사람이 따라붙는 사기 위험.', en: 'Risk of fraud — people follow the money.' },
  },
  관성: {
    flow: { ko: '직위·역할에 연동된 안정 수입.', en: 'Stable income tied to position and role.' },
    bestApproach: { ko: '공직·관리·전문직·교육이 잘 맞아요.', en: 'Public service, management, professions, education fit.' },
    warning: { ko: '책임의 무게로 인한 건강 부담.', en: 'Health load from the weight of duty.' },
  },
  인성: {
    flow: { ko: '지식·신뢰가 쌓이며 따라오는 부.', en: 'Wealth following accumulated knowledge and trust.' },
    bestApproach: { ko: '연구·교육·자격증·전문직이 잘 맞아요.', en: 'Research, education, credentials, professions fit.' },
    warning: { ko: '결정 미루기로 기회가 흘러가요.', en: 'Indecision lets opportunities slip.' },
  },
};

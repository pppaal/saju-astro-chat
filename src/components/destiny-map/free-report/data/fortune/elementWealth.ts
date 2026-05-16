/**
 * 오행별 재물 흐름 해석.
 * 사주에서 가장 강한 오행이 재물 운에 미치는 영향을 정리한다.
 */

import type { BilingualText, FiveElement } from '../../types/core';

export interface ElementWealthEntry {
  style: BilingualText;
  bestStream: BilingualText;
  risk: BilingualText;
  practical: BilingualText;
}

export const ELEMENT_WEALTH: Record<FiveElement, ElementWealthEntry> = {
  wood: {
    style: { ko: '성장형 부 — 시간과 함께 가지를 뻗는 구조.', en: 'Growth wealth — structure that branches over time.' },
    bestStream: { ko: '교육·창업·콘텐츠·환경·자기계발', en: 'Education, founding, content, environment, self-development' },
    risk: { ko: '한 분야에만 매몰돼 다양화 실패.', en: 'Tunnel vision in one field — diversification fails.' },
    practical: { ko: '본업의 가지를 매년 한 개씩 늘려가세요.', en: 'Grow one new branch off your main work each year.' },
  },
  fire: {
    style: { ko: '폭발형 부 — 무대에서 빠르게 들어오는 흐름.', en: 'Burst wealth — flows in fast from the stage.' },
    bestStream: { ko: '엔터테인먼트·미디어·강연·콘텐츠 크리에이션', en: 'Entertainment, media, speaking, content creation' },
    risk: { ko: '쉽게 들어온 만큼 쉽게 사라져요.', en: 'Comes easily — leaves easily.' },
    practical: { ko: '들어온 돈의 30%는 자동으로 묶어두세요.', en: 'Lock 30% of incoming cash automatically.' },
  },
  earth: {
    style: { ko: '축적형 부 — 한 번 쌓이면 무너지지 않는 구조.', en: 'Accumulation wealth — once stacked, unshakable.' },
    bestStream: { ko: '부동산·중개·전통 산업·식·금융 관리', en: 'Real estate, brokerage, traditional industries, food, financial management' },
    risk: { ko: '변화 기회를 놓쳐 자산이 굳어버려요.', en: 'Misses change opportunities — assets stiffen.' },
    practical: { ko: '연 1회 자산 구성을 재평가하세요.', en: 'Reassess asset mix once a year.' },
  },
  metal: {
    style: { ko: '정련형 부 — 정밀함이 자산이 되는 구조.', en: 'Refined wealth — precision becomes asset.' },
    bestStream: { ko: '법·금융·IT·디자인·뷰티·의료', en: 'Law, finance, IT, design, beauty, medicine' },
    risk: { ko: '과도한 완벽주의로 시기를 놓쳐요.', en: 'Excess perfectionism misses the timing.' },
    practical: { ko: '80% 완성도에 출시하는 연습을 들이세요.', en: 'Practice shipping at 80% completion.' },
  },
  water: {
    style: { ko: '흐름형 부 — 지혜·정보가 부로 전환되는 구조.', en: 'Flow wealth — wisdom and info convert to wealth.' },
    bestStream: { ko: '연구·IT·금융 분석·콘텐츠 기획·치유', en: 'Research, IT, financial analysis, content planning, healing' },
    risk: { ko: '결정을 미뤄 기회가 흘러가요.', en: 'Postpones decisions — opportunities slip past.' },
    practical: { ko: '결정 기한을 미리 캘린더에 박아두세요.', en: 'Pin decision deadlines to the calendar in advance.' },
  },
};

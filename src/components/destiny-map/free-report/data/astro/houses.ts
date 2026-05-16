/**
 * 12 하우스 자체의 의미와 해석.
 *
 * /lib/astrology/foundation 의 `House[]` 출력 — 각 하우스 cusp 의 별자리/지배 영역.
 * 하우스 = 인생 영역, 별자리 = 그 영역을 다루는 색깔/방식.
 */

import type { BilingualText, HouseNumber } from '../../types/core';

export interface HouseEntry {
  hanja: string;
  domain: BilingualText;
  rulesOver: BilingualText;
  ifPlanetsHere: BilingualText;
  ifEmpty: BilingualText;
}

export const HOUSES: Record<HouseNumber, HouseEntry> = {
  1: {
    hanja: '1宮',
    domain: { ko: '자아·외모·첫인상·인생 무대', en: 'Self, appearance, first impression, life stage' },
    rulesOver: { ko: '내가 세상에 나서는 방식, 몸, 페르소나.', en: 'How you step into the world, your body, persona.' },
    ifPlanetsHere: { ko: '강한 자기 정체성과 존재감이 두드러져요.', en: 'Strong self-identity and presence.' },
    ifEmpty: { ko: '자기 색을 잡는 데 시간이 필요해요.', en: 'Needs time to find own color.' },
  },
  2: {
    hanja: '2宮',
    domain: { ko: '돈·자기 가치·소유·재능', en: 'Money, self-worth, possessions, talent' },
    rulesOver: { ko: '나의 자원·재능·번 돈·내가 가치 있다고 느끼는 것.', en: 'Your resources, talents, earned money, what you feel worthy.' },
    ifPlanetsHere: { ko: '자력 수입과 자기 가치감이 강해요.', en: 'Strong self-earned income and worth-feeling.' },
    ifEmpty: { ko: '돈의 흐름은 다른 영역에서 더 활발해요.', en: 'Money flow is more active in other areas.' },
  },
  3: {
    hanja: '3宮',
    domain: { ko: '소통·형제·이동·기초 학습', en: 'Communication, siblings, short trips, basic learning' },
    rulesOver: { ko: '말·글·짧은 이동·일상의 학습.', en: 'Speech, writing, short travel, daily learning.' },
    ifPlanetsHere: { ko: '소통·글·이동에 관련된 운이 강해요.', en: 'Strong fortune in speech, writing, mobility.' },
    ifEmpty: { ko: '큰 동선 변화 없는 정착형이에요.', en: 'Settled type without major mobility.' },
  },
  4: {
    hanja: '4宮',
    domain: { ko: '가정·뿌리·부모(엄마)·정서 기반', en: 'Home, roots, parents (mother), emotional foundation' },
    rulesOver: { ko: '뿌리·고향·집·정서적 안전기지.', en: 'Roots, hometown, home, emotional base.' },
    ifPlanetsHere: { ko: '가정과 뿌리의 영향이 인생 전반에 깊어요.', en: 'Home and roots deeply influence the whole life.' },
    ifEmpty: { ko: '뿌리에 매이지 않고 자유롭게 움직여요.', en: 'Moves freely without root-attachment.' },
  },
  5: {
    hanja: '5宮',
    domain: { ko: '연애·창작·자녀·놀이', en: 'Love, creation, children, play' },
    rulesOver: { ko: '낭만·연애 시작·창작·즐거움·자녀.', en: 'Romance, love beginnings, creation, joy, children.' },
    ifPlanetsHere: { ko: '연애와 표현, 창작 운이 강해요.', en: 'Strong love, expression, creative luck.' },
    ifEmpty: { ko: '즐거움보다 의무가 우선이 되기 쉬워요.', en: 'Duty easily comes before enjoyment.' },
  },
  6: {
    hanja: '6宮',
    domain: { ko: '일·건강·일상·봉사', en: 'Work, health, routine, service' },
    rulesOver: { ko: '직장 생활·일상 루틴·건강 관리·봉사.', en: 'Work life, daily routine, health management, service.' },
    ifPlanetsHere: { ko: '일·건강에 인생의 무게 중심이 있어요.', en: 'Life weight centers on work and health.' },
    ifEmpty: { ko: '루틴 관리에는 의도적 노력이 필요해요.', en: 'Routine needs intentional effort.' },
  },
  7: {
    hanja: '7宮',
    domain: { ko: '결혼·파트너십·공식 계약', en: 'Marriage, partnership, formal contracts' },
    rulesOver: { ko: '1:1 파트너 — 배우자·동업자·공식 라이벌.', en: '1-to-1 partner — spouse, business partner, open rival.' },
    ifPlanetsHere: { ko: '관계가 인생 학습의 핵심 무대예요.', en: 'Relationships are the main stage for life-learning.' },
    ifEmpty: { ko: '결혼·동업 외 다른 영역에서 자기 길이 나요.', en: 'Path emerges outside marriage/partnership.' },
  },
  8: {
    hanja: '8宮',
    domain: { ko: '깊은 변환·공동 자산·금기·심리', en: 'Deep transformation, shared resources, taboos, psyche' },
    rulesOver: { ko: '죽음과 재생·유산·세금·성·심리.', en: 'Death and rebirth, inheritance, taxes, sex, psyche.' },
    ifPlanetsHere: { ko: '인생에 깊은 위기와 변환의 사이클이 반복돼요.', en: 'Cycle of deep crisis and transformation recurs.' },
    ifEmpty: { ko: '극단적 변환보다는 점진적 흐름이 우세해요.', en: 'Gradual flow over extreme transformations.' },
  },
  9: {
    hanja: '9宮',
    domain: { ko: '고등 학습·해외·신념·철학', en: 'Higher learning, abroad, belief, philosophy' },
    rulesOver: { ko: '대학·종교·여행·세계관·법.', en: 'University, religion, travel, worldview, law.' },
    ifPlanetsHere: { ko: '학문·해외·확장된 비전이 운명을 키워요.', en: 'Scholarship, abroad, expanded vision grow destiny.' },
    ifEmpty: { ko: '국내·일상에 집중하는 안정형이에요.', en: 'Focuses on domestic and daily life — settled type.' },
  },
  10: {
    hanja: '10宮',
    domain: { ko: '사회적 명예·커리어·아버지', en: 'Social honor, career, father' },
    rulesOver: { ko: '직업·사회적 위치·공식 명예·아버지.', en: 'Career, social position, public honor, father.' },
    ifPlanetsHere: { ko: '커리어와 사회적 명예가 인생의 큰 축이에요.', en: 'Career and social honor are major life axes.' },
    ifEmpty: { ko: '공식 직함보다 다른 가치로 자기 격을 세워요.', en: 'Sets standing through values beyond official titles.' },
  },
  11: {
    hanja: '11宮',
    domain: { ko: '친구·공동체·이상·미래', en: 'Friends, community, ideals, future' },
    rulesOver: { ko: '동료 그룹·공동체·꿈·미래 비전.', en: 'Peer groups, community, dreams, future vision.' },
    ifPlanetsHere: { ko: '집단·네트워크·미래 비전이 운을 키워요.', en: 'Groups, networks, future vision grow fortune.' },
    ifEmpty: { ko: '소수의 깊은 인연이 더 의미 있어요.', en: 'A few deep bonds matter more.' },
  },
  12: {
    hanja: '12宮',
    domain: { ko: '무의식·고독·영성·숨겨진 것', en: 'Unconscious, solitude, spirituality, hidden things' },
    rulesOver: { ko: '꿈·잠재의식·고립·영성·자선.', en: 'Dreams, subconscious, isolation, spirituality, charity.' },
    ifPlanetsHere: { ko: '겉으로 드러나지 않는 깊은 차원이 인생을 지배해요.', en: 'A hidden deep dimension governs life.' },
    ifEmpty: { ko: '내면보다 외부 활동에서 자기 길을 찾아요.', en: 'Finds path more through outer activity than inner.' },
  },
};

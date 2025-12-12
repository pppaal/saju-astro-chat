// src/lib/Saju/yongsin.ts
// 용신(用神) 선정 모듈 - 사주명리학 핵심 기능

import { FiveElement, YinYang, SajuPillars, PillarData } from './types';
import { STEMS, BRANCHES, JIJANGGAN, FIVE_ELEMENT_RELATIONS } from './constants';

/**
 * 용신 유형
 * - 억부용신: 일간의 강약을 조절하는 용신
 * - 조후용신: 출생월의 한난조습을 조절하는 용신
 * - 통관용신: 충돌하는 오행 사이를 중재하는 용신
 * - 병약용신: 사주의 병(病)을 치료하는 약(藥) 역할의 용신
 */
export type YongsinType = '억부용신' | '조후용신' | '통관용신' | '병약용신';

/**
 * 일간 강약 상태
 */
export type DaymasterStrength = '극신강' | '신강' | '중화' | '신약' | '극신약';

/**
 * 월령 계절/기후 유형
 */
export type SeasonClimate = '한습' | '온화' | '조열';

/**
 * 용신 선정 결과
 */
export interface YongsinResult {
  primaryYongsin: FiveElement;           // 주용신
  secondaryYongsin?: FiveElement;        // 보조용신(희신)
  yongsinType: YongsinType;              // 용신 유형
  daymasterStrength: DaymasterStrength;  // 일간 강약
  reasoning: string;                     // 용신 선정 이유
  kibsin?: FiveElement;                  // 기신(忌神) - 피해야 할 오행
  gusin?: FiveElement;                   // 구신(仇神) - 기신을 돕는 오행
}

/**
 * 오행 개수 통계
 */
export interface ElementStats {
  목: number;
  화: number;
  토: number;
  금: number;
  수: number;
}

/**
 * 사주 입력 타입 (간소화)
 */
export interface SajuPillarsInput {
  year: { stem: string; branch: string };
  month: { stem: string; branch: string };
  day: { stem: string; branch: string };
  time: { stem: string; branch: string };
}

// ============ 헬퍼 함수들 ============

/**
 * 천간/지지에서 오행 가져오기
 */
function getElement(char: string): FiveElement | null {
  const stem = STEMS.find(s => s.name === char);
  if (stem) return stem.element;

  const branch = BRANCHES.find(b => b.name === char);
  if (branch) return branch.element;

  return null;
}

/**
 * 천간에서 음양 가져오기
 */
function getYinYang(stem: string): YinYang | null {
  const found = STEMS.find(s => s.name === stem);
  return found ? found.yin_yang : null;
}

/**
 * 월지에서 계절 파악
 */
function getSeasonFromMonthBranch(monthBranch: string): SeasonClimate {
  // 寅卯辰(봄), 巳午未(여름), 申酉戌(가을), 亥子丑(겨울)
  const spring = ['寅', '卯', '辰'];
  const summer = ['巳', '午', '未'];
  const autumn = ['申', '酉', '戌'];
  const winter = ['亥', '子', '丑'];

  if (winter.includes(monthBranch) || spring.includes(monthBranch)) {
    // 겨울, 초봄은 한습
    if (winter.includes(monthBranch) || monthBranch === '寅') {
      return '한습';
    }
  }
  if (summer.includes(monthBranch)) {
    return '조열';
  }
  return '온화';
}

/**
 * 사주 전체의 오행 개수 계산 (천간 + 지지 + 지장간 정기)
 */
function countElements(pillars: SajuPillarsInput): ElementStats {
  const stats: ElementStats = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  const allPillars = [pillars.year, pillars.month, pillars.day, pillars.time];

  for (const pillar of allPillars) {
    // 천간 오행
    const stemElement = getElement(pillar.stem);
    if (stemElement) stats[stemElement]++;

    // 지지 오행
    const branchElement = getElement(pillar.branch);
    if (branchElement) stats[branchElement]++;

    // 지장간 정기 오행 (가장 중요한 기운)
    const jijanggan = JIJANGGAN[pillar.branch];
    if (jijanggan?.정기) {
      const jeonggiElement = getElement(jijanggan.정기);
      if (jeonggiElement) stats[jeonggiElement] += 0.5; // 가중치 0.5
    }
  }

  return stats;
}

/**
 * 일간 강약 판단
 */
function assessDaymasterStrength(
  daymaster: string,
  pillars: SajuPillarsInput
): DaymasterStrength {
  const daymasterElement = getElement(daymaster);
  if (!daymasterElement) return '중화';

  const stats = countElements(pillars);

  // 일간을 생하거나 같은 오행(비겁, 인성)의 힘
  const supportingElement = FIVE_ELEMENT_RELATIONS.생받는관계[daymasterElement];
  const selfPower = stats[daymasterElement];
  const supportPower = supportingElement ? stats[supportingElement] : 0;
  const totalSupport = selfPower + supportPower;

  // 일간을 극하거나 설기하는 오행(관살, 식상, 재성)의 힘
  const controlElement = FIVE_ELEMENT_RELATIONS.극받는관계[daymasterElement];
  const drainElement = FIVE_ELEMENT_RELATIONS.생하는관계[daymasterElement];
  const wealthElement = FIVE_ELEMENT_RELATIONS.극하는관계[daymasterElement];

  const controlPower = controlElement ? stats[controlElement] : 0;
  const drainPower = drainElement ? stats[drainElement] : 0;
  const wealthPower = wealthElement ? stats[wealthElement] : 0;
  const totalWeaken = controlPower + drainPower + wealthPower;

  // 월령 득령 여부 체크
  const monthBranchElement = getElement(pillars.month.branch);
  const hasMonthSupport = monthBranchElement === daymasterElement ||
                          monthBranchElement === supportingElement;

  // 강약 판단
  const ratio = totalSupport / (totalWeaken + 0.1);

  if (ratio > 2.5 || (ratio > 1.8 && hasMonthSupport)) return '극신강';
  if (ratio > 1.5 || (ratio > 1.2 && hasMonthSupport)) return '신강';
  if (ratio < 0.4 || (ratio < 0.6 && !hasMonthSupport)) return '극신약';
  if (ratio < 0.8 || (ratio < 0.9 && !hasMonthSupport)) return '신약';

  return '중화';
}

/**
 * 억부용신 선정
 * 일간이 강하면 설기/극하는 오행, 약하면 생하는 오행
 */
function selectEokbuYongsin(
  daymaster: string,
  strength: DaymasterStrength
): { yongsin: FiveElement; gusin?: FiveElement; kibsin?: FiveElement; reasoning: string } {
  const daymasterElement = getElement(daymaster);
  if (!daymasterElement) {
    return { yongsin: '토', reasoning: '일간 정보 부족' };
  }

  const supportingElement = FIVE_ELEMENT_RELATIONS.생받는관계[daymasterElement]; // 인성
  const drainElement = FIVE_ELEMENT_RELATIONS.생하는관계[daymasterElement]; // 식상
  const wealthElement = FIVE_ELEMENT_RELATIONS.극하는관계[daymasterElement]; // 재성
  const controlElement = FIVE_ELEMENT_RELATIONS.극받는관계[daymasterElement]; // 관살

  if (strength === '극신강' || strength === '신강') {
    // 신강: 식상(설기) > 재성 > 관살로 억제
    return {
      yongsin: drainElement,
      gusin: wealthElement,
      kibsin: supportingElement, // 인성이 기신 (더 강하게 만듦)
      reasoning: `일간이 ${strength}하므로 ${drainElement}(식상)으로 설기하여 조절`
    };
  } else if (strength === '극신약' || strength === '신약') {
    // 신약: 인성(생) > 비겁으로 보강
    return {
      yongsin: supportingElement,
      gusin: daymasterElement, // 비겁
      kibsin: controlElement, // 관살이 기신
      reasoning: `일간이 ${strength}하므로 ${supportingElement}(인성)으로 생조하여 보강`
    };
  }

  // 중화: 가장 부족한 오행 보충
  return {
    yongsin: supportingElement,
    reasoning: '일간이 중화하여 균형 유지에 주력'
  };
}

/**
 * 조후용신 선정
 * 출생월의 한난조습에 따라 조절하는 오행 선정
 */
function selectJohuYongsin(
  monthBranch: string,
  daymaster: string
): { yongsin: FiveElement; reasoning: string } | null {
  const climate = getSeasonFromMonthBranch(monthBranch);
  const daymasterElement = getElement(daymaster);

  if (climate === '한습') {
    // 한습: 화(火)로 따뜻하게, 목(木)으로 보조
    return {
      yongsin: '화',
      reasoning: `${monthBranch}월 출생으로 한습하여 화(火)가 조후용신`
    };
  } else if (climate === '조열') {
    // 조열: 수(水)로 식히고, 금(金)으로 보조
    return {
      yongsin: '수',
      reasoning: `${monthBranch}월 출생으로 조열하여 수(水)가 조후용신`
    };
  }

  return null; // 온화한 계절은 조후용신 불필요
}

/**
 * 통관용신 선정
 * 충돌하는 두 오행 사이를 중재하는 오행 찾기
 */
function selectTonggwanYongsin(
  pillars: SajuPillarsInput
): { yongsin: FiveElement; reasoning: string } | null {
  const stats = countElements(pillars);

  // 목-금 충돌 체크 (금극목)
  if (stats.목 >= 2 && stats.금 >= 2) {
    return {
      yongsin: '수',
      reasoning: '목과 금이 충돌하여 수(水)가 통관용신 (금생수, 수생목)'
    };
  }

  // 화-수 충돌 체크 (수극화)
  if (stats.화 >= 2 && stats.수 >= 2) {
    return {
      yongsin: '목',
      reasoning: '화와 수가 충돌하여 목(木)이 통관용신 (수생목, 목생화)'
    };
  }

  // 토-목 충돌 체크 (목극토)
  if (stats.토 >= 2 && stats.목 >= 2) {
    return {
      yongsin: '화',
      reasoning: '토와 목이 충돌하여 화(火)가 통관용신 (목생화, 화생토)'
    };
  }

  // 금-화 충돌 체크 (화극금)
  if (stats.금 >= 2 && stats.화 >= 2) {
    return {
      yongsin: '토',
      reasoning: '금과 화가 충돌하여 토(土)가 통관용신 (화생토, 토생금)'
    };
  }

  // 수-토 충돌 체크 (토극수)
  if (stats.수 >= 2 && stats.토 >= 2) {
    return {
      yongsin: '금',
      reasoning: '수와 토가 충돌하여 금(金)이 통관용신 (토생금, 금생수)'
    };
  }

  return null;
}

/**
 * 병약용신 선정
 * 사주에서 과다한 오행(병)을 억제하는 오행(약) 찾기
 */
function selectByeongYakYongsin(
  pillars: SajuPillarsInput
): { yongsin: FiveElement; kibsin: FiveElement; reasoning: string } | null {
  const stats = countElements(pillars);

  // 가장 과다한 오행 찾기
  let maxElement: FiveElement = '목';
  let maxCount = 0;

  for (const [element, count] of Object.entries(stats) as [FiveElement, number][]) {
    if (count > maxCount) {
      maxCount = count;
      maxElement = element;
    }
  }

  // 과다(3개 이상)할 경우 병약용신 필요
  if (maxCount >= 3) {
    const controllingElement = FIVE_ELEMENT_RELATIONS.극받는관계[maxElement];
    return {
      yongsin: controllingElement,
      kibsin: maxElement,
      reasoning: `${maxElement}이 과다(병)하여 ${controllingElement}(약)으로 조절`
    };
  }

  return null;
}

// ============ 메인 함수 ============

/**
 * 용신 선정 메인 함수
 *
 * @param pillars 사주 4주
 * @returns 용신 선정 결과
 *
 * 용신 선정 우선순위:
 * 1. 조후용신 (한습/조열 계절 출생시 최우선)
 * 2. 병약용신 (특정 오행 과다시)
 * 3. 통관용신 (오행 충돌시)
 * 4. 억부용신 (기본)
 */
export function determineYongsin(pillars: SajuPillarsInput): YongsinResult {
  const daymaster = pillars.day.stem;
  const daymasterElement = getElement(daymaster);
  const strength = assessDaymasterStrength(daymaster, pillars);

  // 1. 조후용신 체크 (한습/조열 계절)
  const johuResult = selectJohuYongsin(pillars.month.branch, daymaster);
  if (johuResult) {
    const eokbuResult = selectEokbuYongsin(daymaster, strength);
    return {
      primaryYongsin: johuResult.yongsin,
      secondaryYongsin: eokbuResult.yongsin !== johuResult.yongsin ? eokbuResult.yongsin : undefined,
      yongsinType: '조후용신',
      daymasterStrength: strength,
      reasoning: johuResult.reasoning,
      kibsin: eokbuResult.kibsin,
      gusin: eokbuResult.gusin
    };
  }

  // 2. 병약용신 체크
  const byeongYakResult = selectByeongYakYongsin(pillars);
  if (byeongYakResult) {
    const eokbuResult = selectEokbuYongsin(daymaster, strength);
    return {
      primaryYongsin: byeongYakResult.yongsin,
      secondaryYongsin: eokbuResult.yongsin !== byeongYakResult.yongsin ? eokbuResult.yongsin : undefined,
      yongsinType: '병약용신',
      daymasterStrength: strength,
      reasoning: byeongYakResult.reasoning,
      kibsin: byeongYakResult.kibsin
    };
  }

  // 3. 통관용신 체크
  const tonggwanResult = selectTonggwanYongsin(pillars);
  if (tonggwanResult) {
    const eokbuResult = selectEokbuYongsin(daymaster, strength);
    return {
      primaryYongsin: tonggwanResult.yongsin,
      secondaryYongsin: eokbuResult.yongsin !== tonggwanResult.yongsin ? eokbuResult.yongsin : undefined,
      yongsinType: '통관용신',
      daymasterStrength: strength,
      reasoning: tonggwanResult.reasoning,
      kibsin: eokbuResult.kibsin,
      gusin: eokbuResult.gusin
    };
  }

  // 4. 억부용신 (기본)
  const eokbuResult = selectEokbuYongsin(daymaster, strength);
  return {
    primaryYongsin: eokbuResult.yongsin,
    secondaryYongsin: eokbuResult.gusin,
    yongsinType: '억부용신',
    daymasterStrength: strength,
    reasoning: eokbuResult.reasoning,
    kibsin: eokbuResult.kibsin,
    gusin: eokbuResult.gusin
  };
}

/**
 * 용신 설명 조회
 */
export function getYongsinDescription(yongsin: FiveElement): string {
  const descriptions: Record<FiveElement, string> = {
    목: '목(木) 용신: 성장, 발전, 인자함을 상징. 교육, 문화, 의류, 목재업 분야 유리.',
    화: '화(火) 용신: 열정, 명예, 표현력을 상징. 예술, 조명, 요식업, 전자업 분야 유리.',
    토: '토(土) 용신: 안정, 신뢰, 중재력을 상징. 부동산, 농업, 건설업 분야 유리.',
    금: '금(金) 용신: 결단, 정의, 실행력을 상징. 금융, 기계, 법조, 군경 분야 유리.',
    수: '수(水) 용신: 지혜, 유연, 소통력을 상징. IT, 유통, 무역, 수산업 분야 유리.'
  };

  return descriptions[yongsin];
}

/**
 * 일간 강약 설명 조회
 */
export function getStrengthDescription(strength: DaymasterStrength): string {
  const descriptions: Record<DaymasterStrength, string> = {
    극신강: '일간이 매우 강함. 자기주장이 강하고 독립적. 식상/재성으로 발산 필요.',
    신강: '일간이 강함. 리더십이 있고 추진력 좋음. 적절한 극제로 균형 유지.',
    중화: '일간이 균형됨. 안정적이고 조화로움. 현상 유지에 강점.',
    신약: '일간이 약함. 협력적이고 겸손함. 인성/비겁의 도움 필요.',
    극신약: '일간이 매우 약함. 순응적이고 유연함. 강한 보조 운이 필요.'
  };

  return descriptions[strength];
}

/**
 * 기신 설명 조회
 */
export function getKibsinDescription(kibsin: FiveElement): string {
  return `${kibsin}(${kibsin}) 기신: 이 오행이 강해지는 시기나 방향을 피하는 것이 좋습니다. 관련 직업이나 색상도 주의가 필요합니다.`;
}

/**
 * 오행별 개운 색상
 */
export function getLuckyColors(yongsin: FiveElement): string[] {
  const colors: Record<FiveElement, string[]> = {
    목: ['초록', '청록', '연두'],
    화: ['빨강', '주황', '보라'],
    토: ['노랑', '갈색', '베이지'],
    금: ['흰색', '은색', '금색'],
    수: ['검정', '파랑', '남색']
  };

  return colors[yongsin];
}

/**
 * 오행별 개운 방향
 */
export function getLuckyDirection(yongsin: FiveElement): string {
  const directions: Record<FiveElement, string> = {
    목: '동쪽',
    화: '남쪽',
    토: '중앙',
    금: '서쪽',
    수: '북쪽'
  };

  return directions[yongsin];
}

/**
 * 오행별 개운 숫자
 */
export function getLuckyNumbers(yongsin: FiveElement): number[] {
  const numbers: Record<FiveElement, number[]> = {
    목: [3, 8],
    화: [2, 7],
    토: [5, 10],
    금: [4, 9],
    수: [1, 6]
  };

  return numbers[yongsin];
}

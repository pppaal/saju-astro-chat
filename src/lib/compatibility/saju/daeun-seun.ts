/**
 * @file Daeun (대운) & Seun (세운) Compatibility Analysis
 * 대운/세운 흐름 비교 분석
 */

import type { SajuProfile } from '../cosmicCompatibility';
import type { DaeunCompatibility, DaeunPeriod, SeunCompatibility } from './types';
import { normalizeElement, getElementKorean, areElementsHarmonious, areElementsClashing } from './element-utils';
import { calculateYongsin, calculateHuisin } from './yongsin';

// ============================================================
// 대운 (Daeun/Major Fortune) 흐름 비교
// ============================================================

export function analyzeDaeunCompatibility(
  p1: SajuProfile,
  p2: SajuProfile,
  p1Age: number,
  p2Age: number
): DaeunCompatibility {
  // 현재 대운 계산
  const p1CurrentDaeun = getCurrentDaeun(p1, p1Age);
  const p2CurrentDaeun = getCurrentDaeun(p2, p2Age);

  const harmonicPeriods: string[] = [];
  const challengingPeriods: string[] = [];

  // 현재 대운의 오행 비교
  const p1El = p1CurrentDaeun.element;
  const p2El = p2CurrentDaeun.element;

  let currentSynergy = 50;

  // 오행 조화 검사
  const p1ElKo = getElementKorean(p1El)
  const p2ElKo = getElementKorean(p2El)
  if (p1El === p2El) {
    currentSynergy = 75;
    harmonicPeriods.push(`현재: 두 사람 모두 ${p1ElKo}의 시기로 공감대 형성`);
  } else if (areElementsHarmonious(p1El, p2El)) {
    currentSynergy = 85;
    harmonicPeriods.push(`현재: ${p1ElKo}↔${p2ElKo} 상생하여 서로 도움`);
  } else if (areElementsClashing(p1El, p2El)) {
    currentSynergy = 35;
    challengingPeriods.push(`현재: ${p1ElKo}↔${p2ElKo} 상극하여 마찰 가능`);
  }

  // 용신과 대운 비교
  const p1Yongsin = calculateYongsin(p1);
  const p2Yongsin = calculateYongsin(p2);
  const p1DayMaster = p1.dayMaster.name || p1.pillars.day.stem;
  const p2DayMaster = p2.dayMaster.name || p2.pillars.day.stem;

  if (p2CurrentDaeun.element === p1Yongsin) {
    currentSynergy += 15;
    harmonicPeriods.push(`${p2DayMaster}일간의 대운이 ${p1DayMaster}일간의 용신(${getElementKorean(p1Yongsin)})을 충족`);
  }
  if (p1CurrentDaeun.element === p2Yongsin) {
    currentSynergy += 15;
    harmonicPeriods.push(`${p1DayMaster}일간의 대운이 ${p2DayMaster}일간의 용신(${getElementKorean(p2Yongsin)})을 충족`);
  }

  // 미래 전망 - 더 구체적이고 매력적으로
  let futureOutlook = '';
  if (currentSynergy >= 80) {
    futureOutlook = `🚀 와! 지금이 황금기예요! 두 분의 대운이 같은 방향으로 흐르고 있어서, 함께 무언가를 시작하기에 최고의 타이밍이에요. 새로운 도전, 중요한 결정, 함께하는 프로젝트... 지금 시작하면 두 배의 속도로 성장할 수 있어요!`;
  } else if (currentSynergy >= 60) {
    futureOutlook = `🌤️ 안정적으로 좋은 시기예요! 대운이 서로를 방해하지 않고 자연스럽게 흐르고 있어요. 큰 파도 없이 꾸준히 함께 나아갈 수 있는 시기예요. 매일매일 쌓이는 작은 행복들이 나중에 큰 결실이 될 거예요!`;
  } else if (currentSynergy >= 40) {
    futureOutlook = `⛅ 대운이 살짝 다른 방향을 가리키고 있어요. 하지만 걱정 마세요 - 이건 서로의 다른 면을 발견하고 이해할 수 있는 기회예요! 각자의 성장을 응원하면서도 '우리'라는 공동의 목표를 잊지 않는 게 핵심이에요.`;
  } else {
    futureOutlook = `🌈 지금은 각자의 여정에 집중해야 할 때예요. 대운이 다른 방향을 가리키고 있지만, 이건 헤어지라는 뜻이 아니에요! 각자가 자신의 길에서 성장한 후 다시 만나면, 더 성숙하고 풍요로운 관계가 될 거예요. 서로의 성장을 진심으로 응원해주세요!`;
  }

  return {
    person1CurrentDaeun: p1CurrentDaeun,
    person2CurrentDaeun: p2CurrentDaeun,
    harmonicPeriods,
    challengingPeriods,
    currentSynergy: Math.min(100, currentSynergy),
    futureOutlook,
  };
}

function getCurrentDaeun(profile: SajuProfile, age: number): DaeunPeriod {
  // 대운 시작 나이 계산 (간략화)
  const startAge = Math.floor(age / 10) * 10;
  const stemIndex = Math.floor(age / 10) % 10;
  const branchIndex = Math.floor(age / 10) % 12;

  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  const stem = stems[stemIndex];
  const branch = branches[branchIndex];

  // 천간의 오행
  const stemElements: Record<string, string> = {
    '甲': 'wood', '乙': 'wood',
    '丙': 'fire', '丁': 'fire',
    '戊': 'earth', '己': 'earth',
    '庚': 'metal', '辛': 'metal',
    '壬': 'water', '癸': 'water',
  };

  const element = stemElements[stem] || 'earth';

  const themes: Record<string, string> = {
    wood: '성장과 발전의 시기',
    fire: '열정과 표현의 시기',
    earth: '안정과 수확의 시기',
    metal: '결실과 정리의 시기',
    water: '지혜와 준비의 시기',
  };

  return {
    stem,
    branch,
    element,
    startAge,
    endAge: startAge + 10,
    theme: themes[element] || '변화의 시기',
  };
}

// ============================================================
// 세운 (Seun/Annual Fortune) 비교
// ============================================================

export function analyzeSeunCompatibility(
  p1: SajuProfile,
  p2: SajuProfile,
  year: number
): SeunCompatibility {
  // 해당 연도의 천간지지 계산
  const yearData = getYearStemBranch(year);

  const p1Impact = calculateYearImpact(p1, yearData.element);
  const p2Impact = calculateYearImpact(p2, yearData.element);

  const advice: string[] = [];

  // 올해 궁합 영향
  let combinedOutlook = '';

  const impactScore = (impact: string): number => {
    const scores: Record<string, number> = {
      very_favorable: 5,
      favorable: 4,
      neutral: 3,
      challenging: 2,
      very_challenging: 1,
    };
    return scores[impact] || 3;
  };

  const avgScore = (impactScore(p1Impact) + impactScore(p2Impact)) / 2;

  if (avgScore >= 4.5) {
    combinedOutlook = `🎆 ${year}년은 두 분에게 축복받은 해예요! 우주가 두 분의 손을 들어주고 있어요. 함께 시작하는 일마다 순풍에 돛 단 듯 술술 풀릴 거예요. 새로운 도전, 중요한 결정, 함께 떠나는 여행... 뭘 해도 좋은 추억이 될 황금 같은 한 해예요!`;
    advice.push('💫 새로운 시작, 중요한 결정, 함께하는 도전에 최적의 해! 지금 망설이던 일이 있다면 올해가 기회예요.');
    advice.push('🚀 함께하는 활동에서 시너지가 폭발해요! 공동 프로젝트, 여행, 새로운 취미를 함께 시작해보세요.');
  } else if (avgScore >= 3.5) {
    combinedOutlook = `🌟 ${year}년은 편안하고 안정적인 해예요. 드라마틱한 변화보다는 차곡차곡 쌓아가는 시간이에요. 매일 조금씩 함께 노력하면 연말에 뒤돌아봤을 때 '와, 우리 이만큼이나 왔네!' 하고 놀랄 거예요.`;
    advice.push('📈 안정적인 계획 실행에 딱 좋아요. 급하게 서두르지 말고 꾸준히 나아가세요.');
    advice.push('🎯 작은 목표들을 함께 세우고 하나씩 달성해보세요. 성취감이 관계를 더 끈끈하게 만들어요.');
  } else if (avgScore >= 2.5) {
    combinedOutlook = `⚓ ${year}년은 약간의 파도가 있는 해예요. 하지만 걱정 마세요 - 파도를 함께 넘으면 더 노련한 선원이 되는 거잖아요? 서로를 더 깊이 이해하게 되는 소중한 시간이 될 수 있어요.`;
    advice.push('🛡️ 큰 변화보다는 현재의 것을 지키는 데 집중하세요. 안정이 최우선이에요.');
    advice.push('💬 서로에 대한 이해와 인내가 필요해요. 대화를 많이 나누고, 상대방의 입장에서 생각해보세요.');
  } else {
    combinedOutlook = `🌧️ ${year}년은 함께 우산을 써야 할 시간이에요. 비가 오면 땅이 굳어지듯, 지금의 어려움이 두 분의 관계를 더 단단하게 만들어 줄 거예요. 힘든 시간을 함께 버텨낸 사이는 그 어떤 것보다 강해져요.`;
    advice.push('⏰ 중요한 결정은 조금 미루는 것도 지혜예요. 올해는 준비하고 내년에 실행하는 전략으로!');
    advice.push('💪 건강과 안전을 최우선으로! 서로의 안녕을 챙기면서 이 시간을 함께 버텨내세요.');
  }

  return {
    year,
    yearStem: yearData.stem,
    yearBranch: yearData.branch,
    yearElement: yearData.element,
    person1Impact: p1Impact,
    person2Impact: p2Impact,
    combinedOutlook,
    advice,
  };
}

function getYearStemBranch(year: number): { stem: string; branch: string; element: string } {
  const stems = ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'];
  const branches = ['申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未'];

  const stemIndex = (year - 4) % 10;
  const branchIndex = (year - 4) % 12;

  const stemElements: Record<string, string> = {
    '甲': 'wood', '乙': 'wood',
    '丙': 'fire', '丁': 'fire',
    '戊': 'earth', '己': 'earth',
    '庚': 'metal', '辛': 'metal',
    '壬': 'water', '癸': 'water',
  };

  const stem = stems[stemIndex];

  return {
    stem,
    branch: branches[branchIndex],
    element: stemElements[stem] || 'earth',
  };
}

function calculateYearImpact(
  profile: SajuProfile,
  yearElement: string
): 'very_favorable' | 'favorable' | 'neutral' | 'challenging' | 'very_challenging' {
  const yongsin = calculateYongsin(profile);
  const huisin = calculateHuisin(profile, yongsin);
  const dm = normalizeElement(profile.dayMaster.element);

  if (yearElement === yongsin) {return 'very_favorable';}
  if (yearElement === huisin) {return 'favorable';}
  if (areElementsHarmonious(yearElement, dm)) {return 'favorable';}
  if (areElementsClashing(yearElement, dm)) {return 'challenging';}
  if (yearElement === dm) {return 'neutral';}

  return 'neutral';
}

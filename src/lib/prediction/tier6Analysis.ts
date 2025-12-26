// src/lib/prediction/tier6Analysis.ts
// TIER 6: 고급 분석 모듈 - 프로그레션, 신살, 일주론

import {
  calculateYearlyGanji,
  calculateMonthlyGanji,
  calculatePreciseTwelveStage,
  calculateSibsin,
  type FiveElement,
} from './advancedTimingEngine';

import { calculateDailyPillar } from './ultraPrecisionEngine';

// ============================================================
// 타입 정의
// ============================================================

export type EventType = 'marriage' | 'career' | 'investment' | 'move' | 'study' | 'health' | 'relationship';

export interface Tier6Input {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  dayStem: string;
  dayBranch: string;
  monthBranch: string;
  yearBranch: string;
  yongsin?: FiveElement[];
  kisin?: FiveElement[];
  advancedAstro?: {
    progressions?: { secondary?: { moonPhase?: string } };
  };
}

export interface Tier6Bonus {
  bonus: number;
  reasons: string[];
  penalties: string[];
}

// ============================================================
// 이벤트별 유리 조건 (간략화)
// ============================================================

const EVENT_FAVORABLE_CONDITIONS: Record<EventType, {
  favorableSibsin: string[];
  avoidSibsin: string[];
  favorableElements: FiveElement[];
}> = {
  marriage: {
    favorableSibsin: ['정재', '정관', '편재', '편관'],
    avoidSibsin: ['겁재', '상관'],
    favorableElements: ['목', '화'],
  },
  career: {
    favorableSibsin: ['정관', '편관', '정인', '식신'],
    avoidSibsin: ['겁재', '편인'],
    favorableElements: ['금', '수'],
  },
  investment: {
    favorableSibsin: ['정재', '편재', '식신'],
    avoidSibsin: ['겁재', '비견', '상관'],
    favorableElements: ['금', '토'],
  },
  move: {
    favorableSibsin: ['편관', '식신', '상관'],
    avoidSibsin: ['정인'],
    favorableElements: ['목', '화'],
  },
  study: {
    favorableSibsin: ['정인', '편인', '식신'],
    avoidSibsin: ['편재', '정재'],
    favorableElements: ['수', '목'],
  },
  health: {
    favorableSibsin: ['비견', '정인', '식신'],
    avoidSibsin: ['편관', '상관'],
    favorableElements: ['토', '금'],
  },
  relationship: {
    favorableSibsin: ['정재', '편재', '식신', '정관'],
    avoidSibsin: ['겁재', '편인'],
    favorableElements: ['화', '토'],
  },
};

// ============================================================
// 지지 관계 분석 (간단 버전)
// ============================================================

function analyzeBranchRelation(branch1: string, branch2: string): string {
  const sixCombos: Record<string, string> = {
    '子丑': '육합', '丑子': '육합', '寅亥': '육합', '亥寅': '육합',
    '卯戌': '육합', '戌卯': '육합', '辰酉': '육합', '酉辰': '육합',
    '巳申': '육합', '申巳': '육합', '午未': '육합', '未午': '육합',
  };

  const partialTrines: Record<string, string> = {
    '寅午': '삼합', '午戌': '삼합', '寅戌': '삼합',
    '申子': '삼합', '子辰': '삼합', '申辰': '삼합',
    '巳酉': '삼합', '酉丑': '삼합', '巳丑': '삼합',
    '亥卯': '삼합', '卯未': '삼합', '亥未': '삼합',
  };

  const clashes: Record<string, string> = {
    '子午': '충', '午子': '충', '丑未': '충', '未丑': '충',
    '寅申': '충', '申寅': '충', '卯酉': '충', '酉卯': '충',
    '辰戌': '충', '戌辰': '충', '巳亥': '충', '亥巳': '충',
  };

  const punishments: Record<string, string> = {
    '寅巳': '형', '巳寅': '형', '巳申': '형', '申巳': '형',
    '丑戌': '형', '戌丑': '형', '戌未': '형', '未戌': '형',
    '子卯': '형', '卯子': '형',
  };

  const combo = branch1 + branch2;
  const reverseCombo = branch2 + branch1;

  if (sixCombos[combo] || sixCombos[reverseCombo]) return '육합';
  if (partialTrines[combo] || partialTrines[reverseCombo]) return '삼합';
  if (clashes[combo] || clashes[reverseCombo]) return '충';
  if (punishments[combo] || punishments[reverseCombo]) return '형';

  return '무관';
}

// ============================================================
// TIER 6-1: 세컨더리 프로그레션 정밀 분석
// ============================================================

export function calculateProgressionBonus(
  input: Tier6Input,
  eventType: EventType,
  targetYear: number,
  targetMonth: number
): Tier6Bonus {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const birthDate = new Date(input.birthYear, (input.birthMonth || 1) - 1, input.birthDay || 1);
  const targetDate = new Date(targetYear, targetMonth - 1, 15);

  // 진행 일수 계산 (1일 = 1년)
  const ageInDays = Math.floor((targetDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  const progressedDate = new Date(birthDate.getTime() + (ageInDays * 24 * 60 * 60 * 1000));

  // 진행 차트의 일주 계산
  const progressedDayPillar = calculateDailyPillar(progressedDate);
  const progressedDayStem = progressedDayPillar.stem;
  const progressedDayBranch = progressedDayPillar.branch;

  // 1. 진행 일간과 네이탈 일간의 십신 관계
  const progressedSibsin = calculateSibsin(input.dayStem, progressedDayStem);
  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];

  if (conditions.favorableSibsin.includes(progressedSibsin)) {
    bonus += 8;
    reasons.push(`진행 일간 ${progressedSibsin} - ${eventType} 유리`);
  } else if (conditions.avoidSibsin.includes(progressedSibsin)) {
    bonus -= 6;
    penalties.push(`진행 일간 ${progressedSibsin} - 주의 필요`);
  }

  // 2. 진행 일지와 네이탈 일지의 합충 관계
  const progressedBranchRelation = analyzeBranchRelation(input.dayBranch, progressedDayBranch);
  if (progressedBranchRelation === '육합' || progressedBranchRelation === '삼합') {
    bonus += 10;
    reasons.push(`진행 일지-네이탈 ${progressedBranchRelation}`);
  } else if (progressedBranchRelation === '충') {
    bonus -= 8;
    penalties.push('진행-네이탈 일지 충');
  } else if (progressedBranchRelation === '형') {
    bonus -= 5;
    penalties.push('진행-네이탈 일지 형');
  }

  // 3. 진행 일주의 12운성 분석
  const progressedTwelveStage = calculatePreciseTwelveStage(input.dayStem, progressedDayBranch);
  if (progressedTwelveStage.energy === 'peak') {
    bonus += 10;
    reasons.push(`진행 ${progressedTwelveStage.stage} - 전성기`);
  } else if (progressedTwelveStage.energy === 'rising') {
    bonus += 6;
    reasons.push(`진행 ${progressedTwelveStage.stage} - 상승세`);
  } else if (progressedTwelveStage.energy === 'dormant') {
    bonus -= 5;
    penalties.push(`진행 ${progressedTwelveStage.stage} - 휴식기`);
  }

  // 4. 점성술 프로그레션 데이터 활용
  const astroProgressions = input.advancedAstro?.progressions;
  if (astroProgressions?.secondary?.moonPhase) {
    const moonPhase = astroProgressions.secondary.moonPhase;
    if (moonPhase === 'Full' || moonPhase === '보름달') {
      bonus += 8;
      reasons.push('진행 달 보름 - 결실기');
    } else if (moonPhase === 'New' || moonPhase === '초승달') {
      if (eventType === 'career' || eventType === 'study') {
        bonus += 6;
        reasons.push('진행 달 초승 - 새 시작');
      }
    }
  }

  return {
    bonus: Math.max(-20, Math.min(20, bonus)),
    reasons: reasons.slice(0, 3),
    penalties: penalties.slice(0, 2),
  };
}

// ============================================================
// TIER 6-2: 신살(神煞) 연동 분석
// ============================================================

export function calculateShinsalBonus(
  input: Tier6Input,
  eventType: EventType,
  targetYear: number,
  targetMonth: number
): Tier6Bonus {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const yearGanji = calculateYearlyGanji(targetYear);
  const monthGanji = calculateMonthlyGanji(targetYear, targetMonth);

  // 역마살 체크 (寅申巳亥 기준)
  const yeokmaGroup: Record<string, string> = {
    '寅午戌': '申', '申子辰': '寅', '巳酉丑': '亥', '亥卯未': '巳',
  };
  for (const [group, yeokma] of Object.entries(yeokmaGroup)) {
    if (group.includes(input.dayBranch)) {
      if (yearGanji.branch === yeokma || monthGanji.branch === yeokma) {
        if (eventType === 'move' || eventType === 'career') {
          bonus += 8;
          reasons.push('역마 발동 - 이동/변화 유리');
        } else if (eventType === 'marriage' || eventType === 'investment') {
          bonus -= 5;
          penalties.push('역마 발동 - 안정 필요');
        }
      }
      break;
    }
  }

  // 도화살 체크 (子午卯酉 기준)
  const dohwaGroup: Record<string, string> = {
    '寅午戌': '卯', '申子辰': '酉', '巳酉丑': '午', '亥卯未': '子',
  };
  for (const [group, dohwa] of Object.entries(dohwaGroup)) {
    if (group.includes(input.dayBranch)) {
      if (yearGanji.branch === dohwa || monthGanji.branch === dohwa) {
        if (eventType === 'relationship' || eventType === 'marriage') {
          bonus += 10;
          reasons.push('도화 발동 - 인연/매력 상승');
        }
      }
      break;
    }
  }

  // 화개살 체크 (辰戌丑未 기준) - 학문/예술에 유리
  const hwagaeGroup: Record<string, string> = {
    '寅午戌': '戌', '申子辰': '辰', '巳酉丑': '丑', '亥卯未': '未',
  };
  for (const [group, hwagae] of Object.entries(hwagaeGroup)) {
    if (group.includes(input.dayBranch)) {
      if (yearGanji.branch === hwagae || monthGanji.branch === hwagae) {
        if (eventType === 'study') {
          bonus += 12;
          reasons.push('화개 발동 - 학문/수련 최적기');
        } else if (eventType === 'relationship') {
          bonus -= 3;
          penalties.push('화개 발동 - 고독 경향');
        }
      }
      break;
    }
  }

  // 천을귀인 체크 (일간 기준)
  const cheonelGroup: Record<string, string[]> = {
    '甲': ['丑', '未'], '乙': ['子', '申'], '丙': ['亥', '酉'], '丁': ['亥', '酉'],
    '戊': ['丑', '未'], '己': ['子', '申'], '庚': ['丑', '未'], '辛': ['寅', '午'],
    '壬': ['卯', '巳'], '癸': ['卯', '巳'],
  };
  const cheonelBranches = cheonelGroup[input.dayStem] || [];
  if (cheonelBranches.includes(yearGanji.branch) || cheonelBranches.includes(monthGanji.branch)) {
    bonus += 10;
    reasons.push('천을귀인 발동 - 귀인 도움');
  }

  // 삼재 체크
  const samjaeGroup: Record<string, string[]> = {
    '申子辰': ['寅', '卯', '辰'], // 인묘진년이 삼재
    '寅午戌': ['申', '酉', '戌'], // 신유술년이 삼재
    '亥卯未': ['巳', '午', '未'], // 사오미년이 삼재
    '巳酉丑': ['亥', '子', '丑'], // 해자축년이 삼재
  };
  for (const [group, samjaeYears] of Object.entries(samjaeGroup)) {
    if (group.includes(input.yearBranch) && samjaeYears.includes(yearGanji.branch)) {
      const idx = samjaeYears.indexOf(yearGanji.branch);
      const samjaeNames = ['들삼재 - 신중 필요', '눌삼재 - 최대 주의', '날삼재 - 조심'];
      const samjaePenalties = [5, 8, 4];
      bonus -= samjaePenalties[idx];
      penalties.push(samjaeNames[idx]);
      break;
    }
  }

  // 공망 체크 (일주 기준)
  const gongmangByJiazi: Record<string, string[]> = {
    // 갑자순
    '甲子': ['戌', '亥'], '乙丑': ['戌', '亥'], '丙寅': ['戌', '亥'], '丁卯': ['戌', '亥'], '戊辰': ['戌', '亥'],
    '己巳': ['戌', '亥'], '庚午': ['戌', '亥'], '辛未': ['戌', '亥'], '壬申': ['戌', '亥'], '癸酉': ['戌', '亥'],
    // 갑술순
    '甲戌': ['申', '酉'], '乙亥': ['申', '酉'], '丙子': ['申', '酉'], '丁丑': ['申', '酉'], '戊寅': ['申', '酉'],
    '己卯': ['申', '酉'], '庚辰': ['申', '酉'], '辛巳': ['申', '酉'], '壬午': ['申', '酉'], '癸未': ['申', '酉'],
    // 갑신순
    '甲申': ['午', '未'], '乙酉': ['午', '未'], '丙戌': ['午', '未'], '丁亥': ['午', '未'], '戊子': ['午', '未'],
    '己丑': ['午', '未'], '庚寅': ['午', '未'], '辛卯': ['午', '未'], '壬辰': ['午', '未'], '癸巳': ['午', '未'],
    // 갑오순
    '甲午': ['辰', '巳'], '乙未': ['辰', '巳'], '丙申': ['辰', '巳'], '丁酉': ['辰', '巳'], '戊戌': ['辰', '巳'],
    '己亥': ['辰', '巳'], '庚子': ['辰', '巳'], '辛丑': ['辰', '巳'], '壬寅': ['辰', '巳'], '癸卯': ['辰', '巳'],
    // 갑진순
    '甲辰': ['寅', '卯'], '乙巳': ['寅', '卯'], '丙午': ['寅', '卯'], '丁未': ['寅', '卯'], '戊申': ['寅', '卯'],
    '己酉': ['寅', '卯'], '庚戌': ['寅', '卯'], '辛亥': ['寅', '卯'], '壬子': ['寅', '卯'], '癸丑': ['寅', '卯'],
    // 갑인순
    '甲寅': ['子', '丑'], '乙卯': ['子', '丑'], '丙辰': ['子', '丑'], '丁巳': ['子', '丑'], '戊午': ['子', '丑'],
    '己未': ['子', '丑'], '庚申': ['子', '丑'], '辛酉': ['子', '丑'], '壬戌': ['子', '丑'], '癸亥': ['子', '丑'],
  };

  const dayPillar = input.dayStem + input.dayBranch;
  const gongmangBranches = gongmangByJiazi[dayPillar] || [];
  if (gongmangBranches.includes(yearGanji.branch)) {
    bonus -= 6;
    penalties.push('세운 공망 - 결실 지연');
  }

  return {
    bonus: Math.max(-20, Math.min(20, bonus)),
    reasons: reasons.slice(0, 3),
    penalties: penalties.slice(0, 2),
  };
}

// ============================================================
// TIER 6-3: 일주론(日柱論) 심층 분석
// ============================================================

type DayPillarTrait = {
  strength: 'strong' | 'moderate' | 'weak';
  nature: string[];
  goodFor: EventType[];
  cautionFor: EventType[];
};

const DAY_PILLAR_TRAITS: Record<string, DayPillarTrait> = {
  // 갑목 일주
  '甲子': { strength: 'strong', nature: ['창의', '리더십'], goodFor: ['career', 'study'], cautionFor: ['relationship'] },
  '甲寅': { strength: 'strong', nature: ['진취', '독립'], goodFor: ['career', 'move'], cautionFor: ['marriage'] },
  '甲辰': { strength: 'strong', nature: ['야망', '변화'], goodFor: ['career', 'investment'], cautionFor: [] },
  '甲午': { strength: 'moderate', nature: ['명예', '표현'], goodFor: ['career', 'relationship'], cautionFor: ['investment'] },
  '甲申': { strength: 'weak', nature: ['유연', '적응'], goodFor: ['study', 'move'], cautionFor: ['career'] },
  '甲戌': { strength: 'moderate', nature: ['신뢰', '책임'], goodFor: ['marriage', 'career'], cautionFor: [] },
  // 을목 일주
  '乙丑': { strength: 'weak', nature: ['인내', '실용'], goodFor: ['investment', 'study'], cautionFor: ['move'] },
  '乙卯': { strength: 'strong', nature: ['예술', '감성'], goodFor: ['relationship', 'study'], cautionFor: ['investment'] },
  '乙巳': { strength: 'moderate', nature: ['지혜', '처세'], goodFor: ['career', 'relationship'], cautionFor: [] },
  '乙未': { strength: 'moderate', nature: ['온화', '협력'], goodFor: ['marriage', 'relationship'], cautionFor: [] },
  '乙酉': { strength: 'weak', nature: ['섬세', '분석'], goodFor: ['study', 'health'], cautionFor: ['career'] },
  '乙亥': { strength: 'strong', nature: ['성장', '확장'], goodFor: ['study', 'career'], cautionFor: [] },
  // 병화 일주
  '丙子': { strength: 'weak', nature: ['직관', '통찰'], goodFor: ['study', 'relationship'], cautionFor: ['investment'] },
  '丙寅': { strength: 'strong', nature: ['열정', '리더십'], goodFor: ['career', 'move'], cautionFor: [] },
  '丙辰': { strength: 'strong', nature: ['매력', '영향력'], goodFor: ['career', 'relationship'], cautionFor: [] },
  '丙午': { strength: 'strong', nature: ['활력', '명예'], goodFor: ['career', 'study'], cautionFor: ['health'] },
  '丙申': { strength: 'moderate', nature: ['변화', '혁신'], goodFor: ['move', 'career'], cautionFor: ['marriage'] },
  '丙戌': { strength: 'strong', nature: ['따뜻함', '리더십'], goodFor: ['career', 'marriage'], cautionFor: [] },
  // 정화 일주
  '丁丑': { strength: 'weak', nature: ['섬세', '내면'], goodFor: ['study', 'health'], cautionFor: ['career'] },
  '丁卯': { strength: 'strong', nature: ['따뜻함', '예술'], goodFor: ['relationship', 'study'], cautionFor: [] },
  '丁巳': { strength: 'strong', nature: ['지혜', '분석'], goodFor: ['study', 'career'], cautionFor: [] },
  '丁未': { strength: 'moderate', nature: ['온화', '배려'], goodFor: ['marriage', 'relationship'], cautionFor: ['investment'] },
  '丁酉': { strength: 'weak', nature: ['섬세', '예민'], goodFor: ['study', 'health'], cautionFor: ['career'] },
  '丁亥': { strength: 'moderate', nature: ['지혜', '깊이'], goodFor: ['study', 'relationship'], cautionFor: [] },
  // 무토 일주
  '戊子': { strength: 'moderate', nature: ['안정', '지혜'], goodFor: ['investment', 'career'], cautionFor: [] },
  '戊寅': { strength: 'strong', nature: ['진취', '실행'], goodFor: ['career', 'move'], cautionFor: [] },
  '戊辰': { strength: 'strong', nature: ['권위', '포용'], goodFor: ['career', 'marriage'], cautionFor: [] },
  '戊午': { strength: 'strong', nature: ['열정', '중심'], goodFor: ['career', 'relationship'], cautionFor: [] },
  '戊申': { strength: 'moderate', nature: ['실용', '능력'], goodFor: ['career', 'investment'], cautionFor: [] },
  '戊戌': { strength: 'strong', nature: ['신뢰', '고집'], goodFor: ['career', 'investment'], cautionFor: ['relationship'] },
  // 기토 일주
  '己丑': { strength: 'strong', nature: ['안정', '축적'], goodFor: ['investment', 'career'], cautionFor: ['move'] },
  '己卯': { strength: 'weak', nature: ['온화', '협조'], goodFor: ['relationship', 'study'], cautionFor: ['career'] },
  '己巳': { strength: 'moderate', nature: ['영리', '적응'], goodFor: ['career', 'study'], cautionFor: [] },
  '己未': { strength: 'strong', nature: ['포용', '안정'], goodFor: ['marriage', 'investment'], cautionFor: [] },
  '己酉': { strength: 'moderate', nature: ['세련', '분석'], goodFor: ['study', 'career'], cautionFor: [] },
  '己亥': { strength: 'weak', nature: ['지혜', '포용'], goodFor: ['study', 'relationship'], cautionFor: ['investment'] },
  // 경금 일주
  '庚子': { strength: 'moderate', nature: ['지혜', '결단'], goodFor: ['career', 'study'], cautionFor: [] },
  '庚寅': { strength: 'weak', nature: ['유연', '적응'], goodFor: ['move', 'study'], cautionFor: ['career'] },
  '庚辰': { strength: 'strong', nature: ['권위', '추진'], goodFor: ['career', 'investment'], cautionFor: [] },
  '庚午': { strength: 'weak', nature: ['예민', '변화'], goodFor: ['move', 'relationship'], cautionFor: ['career'] },
  '庚申': { strength: 'strong', nature: ['결단', '독립'], goodFor: ['career', 'investment'], cautionFor: ['relationship'] },
  '庚戌': { strength: 'strong', nature: ['의지', '신뢰'], goodFor: ['career', 'marriage'], cautionFor: [] },
  // 신금 일주
  '辛丑': { strength: 'strong', nature: ['축적', '인내'], goodFor: ['investment', 'study'], cautionFor: [] },
  '辛卯': { strength: 'weak', nature: ['섬세', '예술'], goodFor: ['study', 'relationship'], cautionFor: ['career'] },
  '辛巳': { strength: 'moderate', nature: ['지혜', '세련'], goodFor: ['career', 'study'], cautionFor: [] },
  '辛未': { strength: 'moderate', nature: ['온화', '배려'], goodFor: ['marriage', 'relationship'], cautionFor: [] },
  '辛酉': { strength: 'strong', nature: ['예리', '완벽'], goodFor: ['career', 'study'], cautionFor: ['relationship'] },
  '辛亥': { strength: 'moderate', nature: ['지혜', '성장'], goodFor: ['study', 'career'], cautionFor: [] },
  // 임수 일주
  '壬子': { strength: 'strong', nature: ['지혜', '유연'], goodFor: ['study', 'career'], cautionFor: [] },
  '壬寅': { strength: 'strong', nature: ['진취', '창의'], goodFor: ['career', 'move'], cautionFor: [] },
  '壬辰': { strength: 'strong', nature: ['권위', '지혜'], goodFor: ['career', 'investment'], cautionFor: [] },
  '壬午': { strength: 'weak', nature: ['열정', '변화'], goodFor: ['relationship', 'move'], cautionFor: ['career'] },
  '壬申': { strength: 'strong', nature: ['지혜', '실행'], goodFor: ['career', 'study'], cautionFor: [] },
  '壬戌': { strength: 'moderate', nature: ['안정', '신뢰'], goodFor: ['career', 'marriage'], cautionFor: [] },
  // 계수 일주
  '癸丑': { strength: 'moderate', nature: ['인내', '축적'], goodFor: ['investment', 'study'], cautionFor: [] },
  '癸卯': { strength: 'strong', nature: ['감성', '성장'], goodFor: ['study', 'relationship'], cautionFor: [] },
  '癸巳': { strength: 'weak', nature: ['지혜', '변화'], goodFor: ['study', 'move'], cautionFor: ['career'] },
  '癸未': { strength: 'weak', nature: ['온화', '배려'], goodFor: ['relationship', 'study'], cautionFor: ['career'] },
  '癸酉': { strength: 'moderate', nature: ['세련', '지혜'], goodFor: ['study', 'career'], cautionFor: [] },
  '癸亥': { strength: 'strong', nature: ['직관', '깊이'], goodFor: ['study', 'relationship'], cautionFor: [] },
};

// 납음(納音) 오행 매핑
const NAPUM_MAP: Record<string, FiveElement> = {
  // 해중금
  '甲子': '금', '乙丑': '금',
  // 노중화
  '丙寅': '화', '丁卯': '화',
  // 대림목
  '戊辰': '목', '己巳': '목',
  // 노방토
  '庚午': '토', '辛未': '토',
  // 검봉금
  '壬申': '금', '癸酉': '금',
  // 산두화
  '甲戌': '화', '乙亥': '화',
  // 간하수
  '丙子': '수', '丁丑': '수',
  // 성두토
  '戊寅': '토', '己卯': '토',
  // 백납금
  '庚辰': '금', '辛巳': '금',
  // 양류목
  '壬午': '목', '癸未': '목',
  // 정천하수
  '甲申': '수', '乙酉': '수',
  // 천상화
  '甲午': '화', '乙未': '화',
  // 석류목
  '庚申': '목', '辛酉': '목',
  // 대해수
  '壬戌': '수', '癸亥': '수',
};

export function calculateDayPillarCompatibility(
  input: Tier6Input,
  eventType: EventType
): { bonus: number; reasons: string[]; warnings: string[] } {
  let bonus = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];

  const dayPillar = input.dayStem + input.dayBranch;
  const traits = DAY_PILLAR_TRAITS[dayPillar];

  if (traits) {
    // 일주 강약에 따른 기본 보정
    if (traits.strength === 'strong') {
      if (eventType === 'career' || eventType === 'investment') {
        bonus += 5;
      }
    } else if (traits.strength === 'weak') {
      if (eventType === 'career') {
        bonus -= 3;
        warnings.push(`${dayPillar} 일주 - 신강 보완 필요`);
      }
    }

    // 일주와 이벤트 궁합
    if (traits.goodFor.includes(eventType)) {
      bonus += 10;
      reasons.push(`${dayPillar} 일주 - ${eventType} 적합 (${traits.nature.join(', ')})`);
    }

    if (traits.cautionFor.includes(eventType)) {
      bonus -= 6;
      warnings.push(`${dayPillar} 일주 - ${eventType} 신중 필요`);
    }
  }

  // 납음 오행 분석
  const napumElement = NAPUM_MAP[dayPillar];
  if (napumElement) {
    const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
    if (conditions.favorableElements.includes(napumElement)) {
      bonus += 5;
      reasons.push(`납음 ${napumElement} - ${eventType} 조화`);
    }
  }

  return {
    bonus: Math.max(-15, Math.min(15, bonus)),
    reasons: reasons.slice(0, 2),
    warnings: warnings.slice(0, 2),
  };
}

// ============================================================
// 통합 TIER 6 분석 함수
// ============================================================

export function calculateTier6Bonus(
  input: Tier6Input,
  eventType: EventType,
  targetYear: number,
  targetMonth: number
): {
  total: number;
  progression: Tier6Bonus;
  shinsal: Tier6Bonus;
  dayPillar: { bonus: number; reasons: string[]; warnings: string[] };
} {
  const progression = calculateProgressionBonus(input, eventType, targetYear, targetMonth);
  const shinsal = calculateShinsalBonus(input, eventType, targetYear, targetMonth);
  const dayPillar = calculateDayPillarCompatibility(input, eventType);

  const total = progression.bonus + shinsal.bonus + dayPillar.bonus;

  return {
    total: Math.max(-40, Math.min(40, total)),
    progression,
    shinsal,
    dayPillar,
  };
}

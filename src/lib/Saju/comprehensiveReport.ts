// src/lib/Saju/comprehensiveReport.ts
// 사주 종합 해석 리포트 생성 모듈

import type { FiveElement, SibsinKind } from './types';
import { getIljuInfo, getPillarInfo, getGongmang } from './pillarLookup';
import { getJohuYongsin, evaluateJohuNeed } from './johuYongsin';
import { analyzeHyeongchung, calculateInteractionScore } from './hyeongchung';
import {
  TWELVE_STAGE_INTERPRETATIONS,
  SIBSIN_INTERPRETATIONS,
  SHINSAL_INTERPRETATIONS,
  ELEMENT_INTERPRETATIONS,
  analyzeElementBalance,
  type TwelveStageType
} from './interpretations';
import { getStemElement, getBranchElement } from './stemBranchUtils';

// ============ 타입 정의 ============

interface SimplePillar {
  stem: string;
  branch: string;
}

interface SajuInput {
  year: SimplePillar;
  month: SimplePillar;
  day: SimplePillar;
  hour: SimplePillar;
}

interface ElementCount {
  목: number;
  화: number;
  토: number;
  금: number;
  수: number;
}

export interface ComprehensiveReportSection {
  title: string;
  content: string;
  details?: string[];
  rating?: number;  // 1-5 점수
}

export interface ComprehensiveReport {
  summary: string;
  dayMaster: ComprehensiveReportSection;
  ilju: ComprehensiveReportSection;
  geokguk: ComprehensiveReportSection;
  yongsin: ComprehensiveReportSection;
  elementBalance: ComprehensiveReportSection;
  interactions: ComprehensiveReportSection;
  shinsal: ComprehensiveReportSection;
  twelveStages: ComprehensiveReportSection;
  overall: ComprehensiveReportSection;
  luckyElements: FiveElement[];
  unluckyElements: FiveElement[];
}

// ============ 유틸리티 함수 ============

const STEM_KOREAN: Record<string, string> = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계'
};

const BRANCH_KOREAN: Record<string, string> = {
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
  '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해'
};

function countElements(pillars: SajuInput): ElementCount {
  const count: ElementCount = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  const allStems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem];
  const allBranches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch];

  for (const stem of allStems) {
    const el = getStemElement(stem);
    count[el]++;
  }

  for (const branch of allBranches) {
    const el = getBranchElement(branch);
    count[el]++;
  }

  return count;
}

function getKoreanPillar(pillar: SimplePillar): string {
  return `${STEM_KOREAN[pillar.stem] || pillar.stem}${BRANCH_KOREAN[pillar.branch] || pillar.branch}`;
}

// ============ 일간 분석 ============

function analyzeDayMaster(dayMaster: string): ComprehensiveReportSection {
  const element = getStemElement(dayMaster);
  const korean = STEM_KOREAN[dayMaster] || dayMaster;
  const elementInfo = ELEMENT_INTERPRETATIONS[element];

  const content = `일간 ${dayMaster}(${korean})은 ${element}(${elementInfo.hanja}) 오행입니다. ${elementInfo.personality}`;

  return {
    title: '일간(日干) 분석',
    content,
    details: [
      `오행 특성: ${elementInfo.nature}`,
      `성격: ${elementInfo.personality}`,
      `건강 유의점: ${elementInfo.health}`,
      `적합 분야: ${elementInfo.career}`
    ],
    rating: 4
  };
}

// ============ 일주 분석 ============

function analyzeIlju(dayPillar: SimplePillar): ComprehensiveReportSection {
  const pillar = `${dayPillar.stem}${dayPillar.branch}`;
  const iljuInfo = getIljuInfo(pillar);
  const pillarInfo = getPillarInfo(pillar);

  if (iljuInfo) {
    return {
      title: '일주(日柱) 분석',
      content: `${pillar}(${pillarInfo?.koreanName}) 일주: ${iljuInfo.personality}`,
      details: [
        `성격: ${iljuInfo.personality}`,
        `직업: ${iljuInfo.career}`,
        `연애: ${iljuInfo.love}`,
        `재물: ${iljuInfo.wealth}`,
        `건강: ${iljuInfo.health}`,
        iljuInfo.famousPeople ? `유명인: ${iljuInfo.famousPeople}` : ''
      ].filter(Boolean),
      rating: 4
    };
  }

  return {
    title: '일주(日柱) 분석',
    content: `${pillar} 일주입니다.`,
    rating: 3
  };
}

// ============ 오행 균형 분석 ============

function analyzeElements(pillars: SajuInput): ComprehensiveReportSection {
  const counts = countElements(pillars);
  const analysis = analyzeElementBalance(counts);

  const details = [
    `목(木): ${counts.목}개`,
    `화(火): ${counts.화}개`,
    `토(土): ${counts.토}개`,
    `금(金): ${counts.금}개`,
    `수(水): ${counts.수}개`,
    `상태: ${analysis.balance}`,
    analysis.interpretation
  ];

  return {
    title: '오행 균형 분석',
    content: analysis.interpretation,
    details,
    rating: analysis.balance === '균형' ? 5 : analysis.balance === '편중' ? 3 : 2
  };
}

// ============ 형충회합 분석 ============

function analyzeInteractions(pillars: SajuInput): ComprehensiveReportSection {
  const analysis = analyzeHyeongchung(pillars);
  const score = calculateInteractionScore(analysis);

  const details: string[] = [];

  // 합(吉) 정리
  const positiveInteractions = analysis.interactions.filter(i => i.effect === '길');
  if (positiveInteractions.length > 0) {
    details.push('길한 작용:');
    positiveInteractions.forEach(i => {
      details.push(`  - ${i.description}`);
    });
  }

  // 충형(凶) 정리
  const negativeInteractions = analysis.interactions.filter(i => i.effect === '흉');
  if (negativeInteractions.length > 0) {
    details.push('흉한 작용:');
    negativeInteractions.forEach(i => {
      details.push(`  - ${i.description}`);
    });
  }

  // 경고
  if (analysis.warnings.length > 0) {
    details.push('주의사항:');
    analysis.warnings.forEach(w => details.push(`  - ${w}`));
  }

  return {
    title: '형충회합 분석',
    content: score.interpretation,
    details,
    rating: score.grade === 'A' ? 5 : score.grade === 'B' ? 4 : score.grade === 'C' ? 3 : score.grade === 'D' ? 2 : 1
  };
}

// ============ 조후용신 분석 ============

function analyzeJohu(dayMaster: string, monthBranch: string): ComprehensiveReportSection {
  const johuInfo = getJohuYongsin(dayMaster, monthBranch);
  const johuNeed = evaluateJohuNeed(dayMaster, monthBranch);

  if (johuInfo) {
    return {
      title: '조후용신 분석',
      content: johuInfo.reasoning,
      details: [
        `기후 특성: ${johuInfo.climate}`,
        `주 조후용신: ${johuInfo.primaryYongsin}`,
        johuInfo.secondaryYongsin ? `보조 용신: ${johuInfo.secondaryYongsin}` : '',
        `조후 필요도: ${johuNeed.description}`,
        johuInfo.caution ? `주의: ${johuInfo.caution}` : ''
      ].filter(Boolean),
      rating: 6 - johuInfo.rating  // 급할수록 낮은 점수 (문제가 있다는 의미)
    };
  }

  return {
    title: '조후용신 분석',
    content: '조후용신 정보가 없습니다.',
    rating: 3
  };
}

// ============ 공망 분석 ============

function analyzeGongmang(dayPillar: SimplePillar, pillars: SajuInput): string[] {
  const pillar = `${dayPillar.stem}${dayPillar.branch}`;
  const gongmang = getGongmang(pillar);

  if (!gongmang) return [];

  const details: string[] = [`공망: ${gongmang[0]}${gongmang[1]}`];

  // 공망에 걸리는 지지 체크
  const branches = [
    { name: '년지', branch: pillars.year.branch },
    { name: '월지', branch: pillars.month.branch },
    { name: '시지', branch: pillars.hour.branch }
  ];

  for (const { name, branch } of branches) {
    if (gongmang.includes(branch)) {
      details.push(`${name}(${branch})가 공망에 해당 - 해당 영역의 공허함 가능`);
    }
  }

  return details;
}

// ============ 종합 리포트 생성 ============

/**
 * 사주 종합 해석 리포트 생성
 */
export function generateComprehensiveReport(
  pillars: SajuInput,
  options?: {
    includeGeokguk?: { type: string; description: string };
    includeYongsin?: { type: string; description: string };
    includeShinsal?: string[];
    includeTwelveStages?: { pillar: string; stage: TwelveStageType }[];
  }
): ComprehensiveReport {
  const dayMaster = pillars.day.stem;
  const monthBranch = pillars.month.branch;

  // 각 섹션 분석
  const dayMasterSection = analyzeDayMaster(dayMaster);
  const iljuSection = analyzeIlju(pillars.day);
  const elementSection = analyzeElements(pillars);
  const interactionSection = analyzeInteractions(pillars);
  const johuSection = analyzeJohu(dayMaster, monthBranch);

  // 격국 섹션
  const geokgukSection: ComprehensiveReportSection = options?.includeGeokguk
    ? {
        title: '격국(格局) 분석',
        content: options.includeGeokguk.description,
        details: [`격국: ${options.includeGeokguk.type}`],
        rating: 4
      }
    : {
        title: '격국(格局) 분석',
        content: '격국 정보가 제공되지 않았습니다.',
        rating: 3
      };

  // 용신 섹션
  const yongsinSection: ComprehensiveReportSection = options?.includeYongsin
    ? {
        title: '용신(用神) 분석',
        content: options.includeYongsin.description,
        details: [`용신: ${options.includeYongsin.type}`],
        rating: 4
      }
    : {
        title: '용신(用神) 분석',
        content: johuSection.details?.[1] || '용신 정보가 제공되지 않았습니다.',
        rating: 3
      };

  // 신살 섹션
  const shinsalDetails: string[] = [];
  if (options?.includeShinsal) {
    for (const name of options.includeShinsal) {
      const interp = SHINSAL_INTERPRETATIONS[name];
      if (interp) {
        shinsalDetails.push(`${name}(${interp.hanja}): ${interp.meaning}`);
      }
    }
  }
  const gongmangDetails = analyzeGongmang(pillars.day, pillars);
  shinsalDetails.push(...gongmangDetails);

  const shinsalSection: ComprehensiveReportSection = {
    title: '신살(神煞) 분석',
    content: shinsalDetails.length > 0 ? '신살 정보가 있습니다.' : '특이 신살이 없습니다.',
    details: shinsalDetails,
    rating: shinsalDetails.some(d => d.includes('귀인')) ? 5 : 3
  };

  // 12운성 섹션
  const twelveStageDetails: string[] = [];
  if (options?.includeTwelveStages) {
    for (const { pillar, stage } of options.includeTwelveStages) {
      const interp = TWELVE_STAGE_INTERPRETATIONS[stage];
      if (interp) {
        const fortune = interp.fortune === '길' ? '(吉)' : interp.fortune === '흉' ? '(凶)' : '';
        twelveStageDetails.push(`${pillar}: ${stage}${fortune} - ${interp.meaning}`);
      }
    }
  }

  const twelveStagesSection: ComprehensiveReportSection = {
    title: '12운성 분석',
    content: twelveStageDetails.length > 0
      ? twelveStageDetails.join(' | ')
      : '12운성 정보가 제공되지 않았습니다.',
    details: twelveStageDetails,
    rating: 4
  };

  // 종합 평가
  const allRatings = [
    dayMasterSection.rating || 3,
    iljuSection.rating || 3,
    elementSection.rating || 3,
    interactionSection.rating || 3
  ];
  const avgRating = Math.round(allRatings.reduce((a, b) => a + b, 0) / allRatings.length);

  const overallSection: ComprehensiveReportSection = {
    title: '종합 평가',
    content: generateOverallSummary(avgRating, elementSection, interactionSection),
    rating: avgRating
  };

  // 행운/불운 오행 결정
  const johuInfo = getJohuYongsin(dayMaster, monthBranch);
  const luckyElements: FiveElement[] = johuInfo
    ? [johuInfo.primaryYongsin, ...(johuInfo.secondaryYongsin ? [johuInfo.secondaryYongsin] : [])]
    : [getStemElement(dayMaster)];

  const elementAnalysis = analyzeElementBalance(countElements(pillars));
  const unluckyElements: FiveElement[] = elementAnalysis.dominant
    ? [elementAnalysis.dominant]
    : [];

  // 요약문 생성
  const summary = `${getKoreanPillar(pillars.day)} 일주, 일간 ${dayMaster}(${getStemElement(dayMaster)}). ` +
    `${iljuSection.content.substring(0, 50)}... ` +
    `오행 ${elementAnalysis.balance}. 형충회합 ${interactionSection.rating}/5.`;

  return {
    summary,
    dayMaster: dayMasterSection,
    ilju: iljuSection,
    geokguk: geokgukSection,
    yongsin: yongsinSection,
    elementBalance: elementSection,
    interactions: interactionSection,
    shinsal: shinsalSection,
    twelveStages: twelveStagesSection,
    overall: overallSection,
    luckyElements,
    unluckyElements
  };
}

function generateOverallSummary(
  avgRating: number,
  elementSection: ComprehensiveReportSection,
  interactionSection: ComprehensiveReportSection
): string {
  if (avgRating >= 4) {
    return '전반적으로 균형 잡힌 좋은 사주입니다. 오행의 조화가 좋고 지지 간 작용도 원만합니다.';
  } else if (avgRating >= 3) {
    return '보통 수준의 사주입니다. 장점을 살리고 단점을 보완하면 발전 가능성이 있습니다.';
  } else {
    return '일부 불균형이 있으나, 용신을 잘 활용하면 극복할 수 있습니다. 지속적인 노력이 필요합니다.';
  }
}

/**
 * 간단 요약 리포트 생성
 */
export function generateQuickSummary(pillars: SajuInput): string {
  const dayMaster = pillars.day.stem;
  const dayPillar = `${pillars.day.stem}${pillars.day.branch}`;
  const iljuInfo = getIljuInfo(dayPillar);
  const pillarInfo = getPillarInfo(dayPillar);

  const elementCounts = countElements(pillars);
  const elementAnalysis = analyzeElementBalance(elementCounts);

  const interactionAnalysis = analyzeHyeongchung(pillars);
  const interactionScore = calculateInteractionScore(interactionAnalysis);

  let summary = `## ${dayPillar}(${pillarInfo?.koreanName}) 일주 요약\n\n`;

  summary += `**일간**: ${dayMaster}(${getStemElement(dayMaster)})\n`;

  if (iljuInfo) {
    summary += `**성격**: ${iljuInfo.personality}\n`;
    summary += `**직업**: ${iljuInfo.career}\n`;
  }

  summary += `\n**오행 분포**: ${Object.entries(elementCounts).map(([k, v]) => `${k}${v}`).join(' ')}\n`;
  summary += `**오행 상태**: ${elementAnalysis.interpretation}\n`;

  summary += `\n**형충회합**: ${interactionScore.grade}등급 - ${interactionScore.interpretation}\n`;

  return summary;
}

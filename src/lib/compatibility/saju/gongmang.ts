/**
 * @file Gongmang (공망) Analysis
 * 공망(空亡) 분석 - 비어있는 지지 분석
 */

import type { SajuProfile } from '../cosmicCompatibility';
import type { GongmangAnalysis } from './types';

export function analyzeGongmang(p1: SajuProfile, p2: SajuProfile): GongmangAnalysis {
  const p1Gongmang = calculateGongmang(p1.pillars.day.stem, p1.pillars.day.branch);
  const p2Gongmang = calculateGongmang(p2.pillars.day.stem, p2.pillars.day.branch);

  const p1DayBranch = p1.pillars.day.branch;
  const p2DayBranch = p2.pillars.day.branch;
  const p1DayMaster = p1.dayMaster.name || p1.pillars.day.stem;
  const p2DayMaster = p2.dayMaster.name || p2.pillars.day.stem;

  const person1InP2Gongmang = p2Gongmang.includes(p1DayBranch);
  const person2InP1Gongmang = p1Gongmang.includes(p2DayBranch);

  const interpretation: string[] = [];
  let impact: GongmangAnalysis['impact'] = 'neutral';

  if (person1InP2Gongmang && person2InP1Gongmang) {
    impact = 'negative';
    interpretation.push(`🌫️ 신비로운 공망의 베일이 두 분 사이에 드리워져 있어요. 서로에게 '뭔가 아쉬운 느낌'이 들 수 있고, 마치 안개 속에서 서로를 찾는 것 같은 느낌이 들 때가 있을 거예요.`);
    interpretation.push(`💡 하지만 이건 오히려 특별한 의미가 있어요! 공망 관계는 '전생에서 못 다한 인연'이라고도 해요. 의식적으로 서로를 향한 노력을 기울이면, 그 어떤 관계보다 깊고 신비로운 연결이 될 수 있어요.`);
    interpretation.push(`🔮 공망을 극복하는 비밀: 서로에게 자주 표현하세요! "보고 싶어", "고마워", "사랑해" - 말로 하지 않으면 안개 속에 사라지지만, 말로 하면 빛이 되어 서로를 비춰줘요.`);
  } else if (person1InP2Gongmang || person2InP1Gongmang) {
    impact = 'neutral';
    if (person1InP2Gongmang) {
      interpretation.push(`👻 ${p2DayMaster}일간이 ${p1DayMaster}일간을 볼 때, 가끔 '얘가 옆에 있었나?' 하고 존재감이 희미하게 느껴질 때가 있을 수 있어요. 이건 ${p1DayMaster}일간의 문제가 아니라 공망의 안개 때문이에요!`);
    }
    if (person2InP1Gongmang) {
      interpretation.push(`👻 ${p1DayMaster}일간이 ${p2DayMaster}일간을 볼 때, 때때로 '얘 뭐하고 있지?' 하고 상대가 멀게 느껴질 때가 있을 수 있어요. 이건 ${p2DayMaster}일간의 문제가 아니라 공망의 안개 때문이에요!`);
    }
    interpretation.push(`✨ 걱정 마세요! 의식적인 관심과 꾸준한 소통으로 충분히 극복할 수 있어요. 서로에게 적극적으로 존재감을 표현하면, 오히려 더 특별한 관계가 될 수 있답니다.`);
  } else {
    impact = 'positive';
    interpretation.push(`🎯 공망 충돌이 없어요! 서로의 존재가 또렷하게 인식되는 관계예요.`);
    interpretation.push(`💖 두 분은 서로에게 자연스럽게 기억에 남는 사람이에요. '그 사람 생각이 나네...' 하고 문득문득 떠오르는 존재감 있는 관계! 안개 없이 맑은 하늘 아래서 서로를 바라보는 것 같은 인연이에요.`);
  }

  return {
    person1Gongmang: p1Gongmang,
    person2Gongmang: p2Gongmang,
    person1InP2Gongmang,
    person2InP1Gongmang,
    impact,
    interpretation,
  };
}

function calculateGongmang(stem: string, branch: string): string[] {
  // 일주 기준 공망 계산
  // 10개 천간과 12개 지지에서 남는 2개 지지가 공망
  const gongmangTable: Record<string, string[]> = {
    '甲子': ['戌', '亥'], '乙丑': ['戌', '亥'], '丙寅': ['戌', '亥'], '丁卯': ['戌', '亥'], '戊辰': ['戌', '亥'],
    '己巳': ['戌', '亥'], '庚午': ['申', '酉'], '辛未': ['申', '酉'], '壬申': ['申', '酉'], '癸酉': ['申', '酉'],
    '甲戌': ['申', '酉'], '乙亥': ['申', '酉'], '丙子': ['午', '未'], '丁丑': ['午', '未'], '戊寅': ['午', '未'],
    '己卯': ['午', '未'], '庚辰': ['午', '未'], '辛巳': ['午', '未'], '壬午': ['辰', '巳'], '癸未': ['辰', '巳'],
    '甲申': ['辰', '巳'], '乙酉': ['辰', '巳'], '丙戌': ['辰', '巳'], '丁亥': ['辰', '巳'], '戊子': ['寅', '卯'],
    '己丑': ['寅', '卯'], '庚寅': ['寅', '卯'], '辛卯': ['寅', '卯'], '壬辰': ['寅', '卯'], '癸巳': ['寅', '卯'],
    '甲午': ['子', '丑'], '乙未': ['子', '丑'], '丙申': ['子', '丑'], '丁酉': ['子', '丑'], '戊戌': ['子', '丑'],
    '己亥': ['子', '丑'], '庚子': ['戌', '亥'], '辛丑': ['戌', '亥'], '壬寅': ['戌', '亥'], '癸卯': ['戌', '亥'],
  };

  const key = `${stem}${branch}`;
  return gongmangTable[key] || ['戌', '亥'];
}

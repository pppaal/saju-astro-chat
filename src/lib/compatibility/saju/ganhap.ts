/**
 * @file GanHap (천간합) Analysis
 * 천간합(天干合) 분석 - 甲己合土, 乙庚合金, 丙辛合水, 丁壬合木, 戊癸合火
 */

import type { SajuProfile } from '../cosmicCompatibility';
import type { GanHapAnalysis, GanHapCombination } from './types';

export function analyzeGanHap(p1: SajuProfile, p2: SajuProfile): GanHapAnalysis {
  const combinations: GanHapCombination[] = [];

  // 천간합 관계: 甲己合土, 乙庚合金, 丙辛合水, 丁壬合木, 戊癸合火
  const ganHapPairs: Record<string, { partner: string; result: string }> = {
    '甲': { partner: '己', result: 'earth' },
    '己': { partner: '甲', result: 'earth' },
    '乙': { partner: '庚', result: 'metal' },
    '庚': { partner: '乙', result: 'metal' },
    '丙': { partner: '辛', result: 'water' },
    '辛': { partner: '丙', result: 'water' },
    '丁': { partner: '壬', result: 'wood' },
    '壬': { partner: '丁', result: 'wood' },
    '戊': { partner: '癸', result: 'fire' },
    '癸': { partner: '戊', result: 'fire' },
  };

  const pillars = ['year', 'month', 'day', 'time'] as const;

  for (const p1Pillar of pillars) {
    const p1Stem = p1.pillars[p1Pillar].stem;
    const hapInfo = ganHapPairs[p1Stem];

    if (hapInfo) {
      for (const p2Pillar of pillars) {
        const p2Stem = p2.pillars[p2Pillar].stem;

        if (p2Stem === hapInfo.partner) {
          combinations.push({
            stem1: p1Stem,
            stem2: p2Stem,
            pillar1: p1Pillar,
            pillar2: p2Pillar,
            resultElement: hapInfo.result,
            description: `${p1Pillar} ${p1Stem}와 ${p2Pillar} ${p2Stem}가 합하여 ${hapInfo.result} 생성`,
          });
        }
      }
    }
  }

  // 일간 합은 특별히 의미가 큼
  const dayHap = combinations.find(c => c.pillar1 === 'day' || c.pillar2 === 'day');

  let totalHarmony = combinations.length * 20;
  let significance = '';

  if (dayHap) {
    totalHarmony += 30;
    significance = `💕 와! 일간 천간합이에요! 이건 사주에서 가장 로맨틱한 인연 중 하나예요. 마치 자석의 N극과 S극처럼 서로에게 자연스럽게 끌리는 관계! 처음 만났을 때 '이 사람 어디서 봤나?' 하는 묘한 익숙함을 느꼈을 수도 있어요. 운명이 두 분을 연결해놓은 거예요.`;
  } else if (combinations.length >= 2) {
    significance = `🔗 천간합이 ${combinations.length}개나 있어요! 여러 방면에서 척척 맞는 관계예요. 마치 여러 개의 다리로 연결된 두 섬처럼, 어떤 상황에서도 서로를 이해하고 연결될 수 있는 통로가 많아요. 함께하면 시너지가 폭발하는 조합!`;
  } else if (combinations.length === 1) {
    significance = `✨ 천간합이 하나 있어요! 특정 영역에서 찰떡궁합을 보여주는 관계예요. 이 합이 작용하는 분야(일, 감정, 가정 등)에서는 마치 오랜 파트너처럼 자연스럽게 협력할 수 있어요. 작지만 확실한 연결고리가 두 분을 이어주고 있어요.`;
  } else {
    significance = `🌈 천간합은 없지만 걱정 마세요! 천간합만이 인연의 전부가 아니에요. 오히려 다른 방식의 깊은 연결이 있을 수 있어요. 지지합, 오행의 조화, 십성의 관계 등 다양한 요소들이 두 분의 특별한 케미를 만들어내고 있을 거예요!`;
  }

  return {
    combinations,
    totalHarmony: Math.min(100, totalHarmony),
    significance,
  };
}

/**
 * multiLayer.ts - 다층 레이어 분석
 */

import type { FiveElement, MultiLayerInput, LayerAnalysis, LayerInteraction, BranchInteraction } from './types';
import { STEMS } from './constants/stemData';
import { calculatePreciseTwelveStage } from './twelveStage';
import { calculateSibsin } from './sibsin';
import { analyzeBranchInteractions } from './branchInteractions';

/**
 * 오행 상생상극 체크
 */
function checkElementSynergy(e1: FiveElement, e2: FiveElement): { type: 'synergy' | 'conflict' | 'neutral'; description: string; score: number } {
  // 상생 관계
  const generating: Record<FiveElement, FiveElement> = {
    '목': '화', '화': '토', '토': '금', '금': '수', '수': '목',
  };

  // 상극 관계
  const controlling: Record<FiveElement, FiveElement> = {
    '목': '토', '토': '수', '수': '화', '화': '금', '금': '목',
  };

  if (e1 === e2) {
    return { type: 'synergy', description: `${e1}-${e2} 비화 (같은 오행)`, score: 10 };
  }

  if (generating[e1] === e2) {
    return { type: 'synergy', description: `${e1}생${e2} (상생)`, score: 15 };
  }

  if (generating[e2] === e1) {
    return { type: 'synergy', description: `${e2}생${e1} (상생)`, score: 12 };
  }

  if (controlling[e1] === e2) {
    return { type: 'conflict', description: `${e1}극${e2} (상극)`, score: -10 };
  }

  if (controlling[e2] === e1) {
    return { type: 'conflict', description: `${e2}극${e1} (상극)`, score: -8 };
  }

  return { type: 'neutral', description: `${e1}-${e2} 중립`, score: 0 };
}

export function analyzeMultiLayer(input: MultiLayerInput): {
  layers: LayerAnalysis[];
  interactions: LayerInteraction[];
  branchInteractions: BranchInteraction[];
} {
  const { dayStem, dayBranch, daeun, saeun, wolun } = input;
  const layers: LayerAnalysis[] = [];

  // 대운 레이어
  if (daeun) {
    const stage = calculatePreciseTwelveStage(dayStem, daeun.branch);
    layers.push({
      stem: daeun.stem,
      branch: daeun.branch,
      element: STEMS[daeun.stem]?.element || '토',
      sibsin: calculateSibsin(dayStem, daeun.stem),
      twelveStage: stage.stage,
      stageEnergy: stage.energy,
      score: stage.score,
      weight: 0.5,  // 대운 가중치 50%
    });
  }

  // 세운 레이어
  {
    const stage = calculatePreciseTwelveStage(dayStem, saeun.branch);
    layers.push({
      stem: saeun.stem,
      branch: saeun.branch,
      element: STEMS[saeun.stem]?.element || '토',
      sibsin: calculateSibsin(dayStem, saeun.stem),
      twelveStage: stage.stage,
      stageEnergy: stage.energy,
      score: stage.score,
      weight: 0.3,  // 세운 가중치 30%
    });
  }

  // 월운 레이어
  {
    const stage = calculatePreciseTwelveStage(dayStem, wolun.branch);
    layers.push({
      stem: wolun.stem,
      branch: wolun.branch,
      element: STEMS[wolun.stem]?.element || '토',
      sibsin: calculateSibsin(dayStem, wolun.stem),
      twelveStage: stage.stage,
      stageEnergy: stage.energy,
      score: stage.score,
      weight: 0.2,  // 월운 가중치 20%
    });
  }

  // 레이어 간 상호작용
  const layerInteractions: LayerInteraction[] = [];

  // 대운-세운 상호작용
  if (daeun) {
    const daeunElement = STEMS[daeun.stem]?.element;
    const saeunElement = STEMS[saeun.stem]?.element;

    if (daeunElement && saeunElement) {
      const synergy = checkElementSynergy(daeunElement, saeunElement);
      layerInteractions.push({
        layers: ['대운', '세운'],
        type: synergy.type,
        description: synergy.description,
        scoreModifier: synergy.score,
      });
    }
  }

  // 세운-월운 상호작용
  {
    const saeunElement = STEMS[saeun.stem]?.element;
    const wolunElement = STEMS[wolun.stem]?.element;

    if (saeunElement && wolunElement) {
      const synergy = checkElementSynergy(saeunElement, wolunElement);
      layerInteractions.push({
        layers: ['세운', '월운'],
        type: synergy.type,
        description: synergy.description,
        scoreModifier: synergy.score,
      });
    }
  }

  // 모든 지지 상호작용
  const allBranches = [dayBranch];
  if (daeun) { allBranches.push(daeun.branch); }
  allBranches.push(saeun.branch, wolun.branch);

  const branchInters = analyzeBranchInteractions(allBranches);

  return { layers, interactions: layerInteractions, branchInteractions: branchInters };
}

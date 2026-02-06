/**
 * twelveStage.ts - 정밀 12운성 계산
 */

import type { PreciseTwelveStage } from './types';
import { STEMS } from './constants/stemData';
import { BRANCH_ORDER } from './constants/branchData';
import { TWELVE_STAGE_START, TWELVE_STAGES_ORDER, STAGE_METADATA, STAGE_ADVICE_MAP } from './constants/twelveStageData';

/**
 * 정밀 12운성 계산
 * @param dayStem 일간 (예: '甲')
 * @param targetBranch 대상 지지 (예: '子')
 */
export function calculatePreciseTwelveStage(dayStem: string, targetBranch: string): PreciseTwelveStage {
  const startBranch = TWELVE_STAGE_START[dayStem];
  if (!startBranch) {
    return {
      stage: '장생',
      description: '알 수 없음',
      energy: 'rising',
      score: 50,
      lifePhase: '정보 부족',
      advice: '정확한 분석을 위해 생년월일시를 확인하세요.',
    };
  }

  const startIdx = BRANCH_ORDER.indexOf(startBranch);
  const targetIdx = BRANCH_ORDER.indexOf(targetBranch);

  if (startIdx === -1 || targetIdx === -1) {
    return {
      stage: '장생',
      description: '알 수 없음',
      energy: 'rising',
      score: 50,
      lifePhase: '정보 부족',
      advice: '정확한 분석을 위해 생년월일시를 확인하세요.',
    };
  }

  // 양간은 순행, 음간은 역행
  const stemInfo = STEMS[dayStem];
  let stageIdx: number;

  if (stemInfo?.yinYang === '양') {
    stageIdx = (targetIdx - startIdx + 12) % 12;
  } else {
    stageIdx = (startIdx - targetIdx + 12) % 12;
  }

  const stage = TWELVE_STAGES_ORDER[stageIdx];
  const meta = STAGE_METADATA[stage];

  return {
    stage,
    description: `${dayStem}일간 ${targetBranch}월 - ${stage}`,
    energy: meta.energy,
    score: meta.score,
    lifePhase: meta.lifePhase,
    advice: STAGE_ADVICE_MAP[stage],
  };
}

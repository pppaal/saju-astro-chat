// src/lib/Saju/compatibility/dayMasterAnalysis.ts
// 일간 관계 분석 모듈

import { SajuPillars, SibsinKind } from '../types';
import { FIVE_ELEMENT_RELATIONS } from '../constants';
import { getStemElement, getStemYinYang } from '../stemBranchUtils';
import { DAY_MASTER_RELATION_SCORES } from './constants';
import type { DayMasterRelation } from './types';

/**
 * 일간 관계 역학 설명 생성
 */
function generateDynamicsDescription(relation: string): string {
  const descriptions: Record<string, string> = {
    '비화': '서로 동등한 위치에서 경쟁하거나 협력하는 관계입니다. 비슷한 성향으로 이해가 쉽지만 충돌도 있을 수 있습니다.',
    '생조': '상대방이 나를 도와주는 관계입니다. 정서적 지지와 도움을 받을 수 있습니다.',
    '설기': '내가 상대방에게 에너지를 주는 관계입니다. 베푸는 입장이 될 수 있습니다.',
    '극출': '내가 상대방을 컨트롤하는 관계입니다. 주도권을 갖지만 부담도 있습니다.',
    '극입': '상대방이 나를 압도하는 관계입니다. 자극이 되지만 스트레스도 받을 수 있습니다.',
  };

  return descriptions[relation] || '평범한 관계입니다.';
}

/**
 * 일간 관계 분석
 */
export function analyzeDayMasterRelation(
  person1: SajuPillars,
  person2: SajuPillars
): DayMasterRelation {
  const dm1 = person1.day.heavenlyStem.name;
  const dm2 = person2.day.heavenlyStem.name;
  const element1 = getStemElement(dm1);
  const element2 = getStemElement(dm2);
  const yinYang1 = getStemYinYang(dm1);
  const yinYang2 = getStemYinYang(dm2);

  let relation: string;
  let sibsin: SibsinKind;
  let reverseSibsin: SibsinKind;

  if (element1 === element2) {
    relation = '비화';
    sibsin = yinYang1 === yinYang2 ? '비견' : '겁재';
    reverseSibsin = sibsin;
  } else if (FIVE_ELEMENT_RELATIONS['생하는관계'][element1] === element2) {
    relation = '설기';
    sibsin = yinYang1 === yinYang2 ? '식신' : '상관';
    reverseSibsin = yinYang1 === yinYang2 ? '편인' : '정인';
  } else if (FIVE_ELEMENT_RELATIONS['생받는관계'][element1] === element2) {
    relation = '생조';
    sibsin = yinYang1 === yinYang2 ? '편인' : '정인';
    reverseSibsin = yinYang1 === yinYang2 ? '식신' : '상관';
  } else if (FIVE_ELEMENT_RELATIONS['극하는관계'][element1] === element2) {
    relation = '극출';
    sibsin = yinYang1 === yinYang2 ? '편재' : '정재';
    reverseSibsin = yinYang1 === yinYang2 ? '편관' : '정관';
  } else {
    relation = '극입';
    sibsin = yinYang1 === yinYang2 ? '편관' : '정관';
    reverseSibsin = yinYang1 === yinYang2 ? '편재' : '정재';
  }

  const dynamics = generateDynamicsDescription(relation);
  const score = DAY_MASTER_RELATION_SCORES[relation] || 50;

  return {
    person1DayMaster: dm1,
    person2DayMaster: dm2,
    relation,
    sibsin,
    reverseSibsin,
    dynamics,
    score,
  };
}

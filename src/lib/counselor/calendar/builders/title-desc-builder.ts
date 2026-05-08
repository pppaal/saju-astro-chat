/**
 * Title & Description Builder - 타이틀 및 설명 키 생성 모듈
 *
 * 분석 결과를 바탕으로 타이틀 및 설명 키를 생성합니다.
 */

import { SAMHAP, YUKHAP, CHUNG } from '../constants';

export interface TitleDescBuilderInput {
  ganzhi: { stem: string; branch: string; stemElement: string };
  dayMasterElement: string;
  dayBranch: string;
  relations: {
    generates: string;
    generatedBy: string;
    controls: string;
    controlledBy: string;
  };
  specialFlags: {
    hasCheoneulGwiin: boolean;
  };
}

export interface TitleDescBuilderResult {
  titleKey: string;
  descKey: string;
}

/**
 * 타이틀 및 설명 키 생성
 */
export function buildTitleDescKeys(input: TitleDescBuilderInput): TitleDescBuilderResult {
  const { ganzhi, dayMasterElement, dayBranch, relations, specialFlags } = input;

  let titleKey = '';
  let descKey = '';

  // 천을귀인 최우선
  if (specialFlags.hasCheoneulGwiin) {
    titleKey = 'calendar.cheoneulGwiin';
    descKey = 'calendar.cheoneulGwiinDesc';
    return { titleKey, descKey };
  }

  // 삼합
  if (dayBranch) {
    for (const [element, branches] of Object.entries(SAMHAP)) {
      if (branches.includes(dayBranch) && branches.includes(ganzhi.branch)) {
        if (element === dayMasterElement || element === relations.generatedBy) {
          titleKey = 'calendar.samhap';
          descKey = 'calendar.samhapDesc';
          return { titleKey, descKey };
        }
      }
    }
  }

  // 육합
  if (dayBranch && YUKHAP[dayBranch] === ganzhi.branch) {
    titleKey = 'calendar.yukhap';
    descKey = 'calendar.yukhapDesc';
    return { titleKey, descKey };
  }

  // 충
  if (dayBranch && CHUNG[dayBranch] === ganzhi.branch) {
    titleKey = 'calendar.chung';
    descKey = 'calendar.chungDesc';
    return { titleKey, descKey };
  }

  // 천간 관계
  if (ganzhi.stemElement === dayMasterElement) {
    titleKey = 'calendar.bijeon';
    descKey = 'calendar.bijeonDesc';
  } else if (ganzhi.stemElement === relations.generatedBy) {
    titleKey = 'calendar.inseong';
    descKey = 'calendar.inseongDesc';
  } else if (ganzhi.stemElement === relations.controls) {
    titleKey = 'calendar.jaeseong';
    descKey = 'calendar.jaeseongDesc';
  } else if (ganzhi.stemElement === relations.generates) {
    titleKey = 'calendar.siksang';
    descKey = 'calendar.siksangDesc';
  } else if (ganzhi.stemElement === relations.controlledBy) {
    titleKey = 'calendar.gwansal';
    descKey = 'calendar.gwansalDesc';
  }

  return { titleKey, descKey };
}

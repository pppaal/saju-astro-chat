/**
 * 운(대운/세운/월운/일운) 갑자 조립 + 십신 — 엔진 공용.
 *
 * 캘린더 v3(yearlyDates)에서 추출. 점수 로직과 무관한 순수 사주 갑자 math라
 * v3·v2 어느 엔진에서든 같은 결과로 재사용한다. DailyFlowCard의 "대운/세운/
 * 월운/일진 흐름" 십신 칩이 이 모듈에서 나온다.
 */

import { getSibseong } from './core/sibsin'
import { STEM_ELEMENT_KO } from './constants'

// ── 천간 음양/오행 (십신 계산용) ──
const STEM_YIN: Record<string, boolean> = {
  甲: false,
  乙: true,
  丙: false,
  丁: true,
  戊: false,
  己: true,
  庚: false,
  辛: true,
  壬: false,
  癸: true,
}
// 천간 → 오행은 정본 파생 표(constants.STEM_ELEMENT_KO)를 쓴다 — 리터럴 복사본 금지(plan D8).

// ── 십신 (본명 일간 기준 상대 십신) ──
// SSOT: 정본 getSibseong(core/sibsin) 에 위임. 이전엔 인덱스 연산으로 직접 구현했으나
// 전 100조합 대조 결과 정본과 동일 — 출처 둘로 갈리지 않게 위임으로 통일.
// (이 함수는 천간 한자를 받으므로 stem→{element,yin_yang} 매핑만 여기서 한다.)
export function getSibsinKo(dayStem: string, targetStem: string): string {
  const dayEl = STEM_ELEMENT_KO[dayStem]
  const tEl = STEM_ELEMENT_KO[targetStem]
  if (!dayEl || !tEl) return ''
  return getSibseong(
    { element: dayEl, yin_yang: STEM_YIN[dayStem] ? '음' : '양' },
    { element: tEl, yin_yang: STEM_YIN[targetStem] ? '음' : '양' }
  )
}

// ── 운별 갑자 컨텍스트 ──
export interface GanjiSibsin {
  ganji: string
  sibsinStem: string
}

/** 월운 — 절기 기반 월주(stem/branch)에서 조립. */
export function wolwoonFromPillar(
  monthStem: string,
  monthBranch: string,
  natalDayMaster: string
): GanjiSibsin {
  const sibsinStem = natalDayMaster && monthStem ? getSibsinKo(natalDayMaster, monthStem) : ''
  return { ganji: `${monthStem}${monthBranch}`, sibsinStem }
}

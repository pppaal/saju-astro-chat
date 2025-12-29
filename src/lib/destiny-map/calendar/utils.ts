/**
 * Destiny Calendar Utilities
 * 운명 캘린더 유틸리티 함수
 */

import {
  CHEONEUL_GWIIN_MAP,
  JIJANGGAN,
  STEMS,
  BRANCHES,
  STEM_TO_ELEMENT,
  BRANCH_TO_ELEMENT,
  SIPSIN_RELATIONS,
  SAMJAE_BY_YEAR_BRANCH,
  YEOKMA_BY_YEAR_BRANCH,
  DOHWA_BY_YEAR_BRANCH,
  GEONROK_BY_DAY_STEM,
  YUKHAP,
  CHUNG,
  XING,
  SAMHAP,
} from './constants';

// ============================================================
// 천을귀인 체크
// ============================================================
export function isCheoneulGwiin(dayMasterStem: string, targetBranch: string): boolean {
  return CHEONEUL_GWIIN_MAP[dayMasterStem]?.includes(targetBranch) ?? false;
}

// ============================================================
// 십신 조회
// ============================================================
export function getSipsin(dayMasterStem: string, targetStem: string): string {
  return SIPSIN_RELATIONS[dayMasterStem]?.[targetStem] ?? "";
}

// ============================================================
// 삼재년 체크
// ============================================================
export function isSamjaeYear(birthYearBranch: string, currentYearBranch: string): boolean {
  const samjaeBranches = SAMJAE_BY_YEAR_BRANCH[birthYearBranch];
  return samjaeBranches?.includes(currentYearBranch) ?? false;
}

// ============================================================
// 역마살 체크
// ============================================================
export function isYeokmaDay(birthYearBranch: string, dayBranch: string): boolean {
  return YEOKMA_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

// ============================================================
// 도화살 체크
// ============================================================
export function isDohwaDay(birthYearBranch: string, dayBranch: string): boolean {
  return DOHWA_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

// ============================================================
// 건록 체크
// ============================================================
export function isGeonrokDay(dayMasterStem: string, dayBranch: string): boolean {
  return GEONROK_BY_DAY_STEM[dayMasterStem] === dayBranch;
}

// ============================================================
// 손없는 날 체크
// ============================================================
export function isSonEomneunDay(lunarDay: number): boolean {
  const dayInCycle = lunarDay % 10;
  return dayInCycle === 9 || dayInCycle === 0;
}

// ============================================================
// 양력→음력 근사 변환
// ============================================================
export function approximateLunarDay(date: Date): number {
  const baseUtc = Date.UTC(2000, 0, 6);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dateUtc - baseUtc) / (1000 * 60 * 60 * 24));
  const lunarMonthDays = 29.53;
  const dayInMonth = ((diffDays % lunarMonthDays) + lunarMonthDays) % lunarMonthDays;
  return Math.floor(dayInMonth) + 1;
}

// ============================================================
// air를 metal로 매핑
// ============================================================
export function normalizeElement(el: string): string {
  return el === "air" ? "metal" : el;
}

// ============================================================
// 일진 계산 (甲子 기준)
// ============================================================
export function calculateDailyGanji(date: Date): { stem: string; branch: string } {
  const baseDate = new Date(Date.UTC(1900, 0, 31));
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dateUtc - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const cycle = ((diffDays % 60) + 60) % 60;
  return {
    stem: STEMS[cycle % 10],
    branch: BRANCHES[cycle % 12],
  };
}

// ============================================================
// 연간 간지 계산
// ============================================================
export function calculateYearlyGanjiSimple(year: number): { stem: string; branch: string } {
  const stemIndex = (year - 4) % 10;
  const branchIndex = (year - 4) % 12;
  return {
    stem: STEMS[(stemIndex + 10) % 10],
    branch: BRANCHES[(branchIndex + 12) % 12],
  };
}

// ============================================================
// 월간 간지 계산 (간단 버전)
// ============================================================
export function calculateMonthlyGanjiSimple(year: number, month: number): { stem: string; branch: string } {
  // 월지는 입절일 기준이지만, 간단히 양력 월 기준
  // 인(寅)월 = 2월부터 시작
  const branchIndex = (month + 1) % 12; // 2월=寅(2)
  const monthBranch = BRANCHES[branchIndex];

  // 월간은 년간에 따라 결정 (년상월법)
  const yearStem = calculateYearlyGanjiSimple(year).stem;
  const yearStemIndex = STEMS.indexOf(yearStem);
  // 갑己년 丙寅월, 乙庚년 戊寅월, 丙辛년 庚寅월, 丁壬년 壬寅월, 戊癸년 甲寅월
  const monthStemBase = [2, 4, 6, 8, 0][yearStemIndex % 5]; // 寅월 천간 시작
  const monthStemIndex = (monthStemBase + month - 1) % 10;

  return {
    stem: STEMS[monthStemIndex],
    branch: monthBranch,
  };
}

// ============================================================
// 육합 체크
// ============================================================
export function isYukhap(branch1: string, branch2: string): boolean {
  return YUKHAP[branch1] === branch2;
}

// ============================================================
// 삼합 체크
// ============================================================
export function isSamhapPartial(branches: string[]): boolean {
  for (const element of Object.values(SAMHAP)) {
    const count = branches.filter(b => element.includes(b)).length;
    if (count >= 2) return true;
  }
  return false;
}

export function isSamhapFull(branches: string[]): string | null {
  for (const [element, samhapBranches] of Object.entries(SAMHAP)) {
    if (samhapBranches.every(b => branches.includes(b))) {
      return element;
    }
  }
  return null;
}

// ============================================================
// 충 체크
// ============================================================
export function isChung(branch1: string, branch2: string): boolean {
  return CHUNG[branch1] === branch2;
}

// ============================================================
// 형 체크
// ============================================================
export function isXing(branch1: string, branch2: string): boolean {
  return XING[branch1]?.includes(branch2) ?? false;
}

// ============================================================
// 지장간 가져오기
// ============================================================
export function getJijanggan(branch: string): string[] {
  const jj = JIJANGGAN[branch];
  if (!jj) return [];
  const result: string[] = [];
  if (jj.여기) result.push(jj.여기);
  if (jj.중기) result.push(jj.중기);
  result.push(jj.정기);
  return result;
}

// ============================================================
// 오행 가져오기
// ============================================================
export function getStemElement(stem: string): string {
  return STEM_TO_ELEMENT[stem] ?? '';
}

export function getBranchElement(branch: string): string {
  return BRANCH_TO_ELEMENT[branch] ?? '';
}

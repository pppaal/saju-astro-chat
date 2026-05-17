/**
 * ganji.ts - 간지 계산 (월운/세운)
 */

/**
 * 월운 간지 계산 (절기 기준)
 */
export function calculateMonthlyGanji(year: number, month: number): { stem: string; branch: string } {
  // 월지 (절기 기준, 1월=인월 시작)
  const monthBranches = ['丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子'];
  const branch = monthBranches[(month - 1) % 12];

  // 월간 계산 (연간에 따라 결정)
  // 갑기년 → 병인월 시작, 을경년 → 무인월 시작, ...
  const yearStemIdx = (year - 4) % 10;
  const monthStemStart = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]; // 각 연간별 인월 천간 인덱스
  const stemIdx = (monthStemStart[yearStemIdx] + (month - 1)) % 10;
  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const stem = stems[stemIdx];

  return { stem, branch };
}

/**
 * 세운 간지 계산
 */
export function calculateYearlyGanji(year: number): { stem: string; branch: string } {
  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  const stemIdx = (year - 4) % 10;
  const branchIdx = (year - 4) % 12;

  return {
    stem: stems[stemIdx],
    branch: branches[branchIdx],
  };
}

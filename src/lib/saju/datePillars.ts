// Shared "what 4-pillar values does this date sit on?" helpers backed by
// the same KASI 절기 table the main saju engine (saju.ts) uses. Pulled
// out of `yearlyDates.ts` so the calendar generator and the saju
// engine stop carrying parallel implementations of solar-term boundary
// logic — the user kept seeing wrong month branches whenever the
// version diverged.
//
// All functions are pure: no side effects, no profile/birth dependency,
// just (date) → pillar values. The caller can layer profile-specific
// computations (sibsin, sinsals, johu, yongsin alignment) on top.

import { getSolarTermKST, MONTH_STEM_LOOKUP } from './constants'

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// Solar-term index 1=소한, 2=입춘, 3=경칩, 4=청명, 5=입하, 6=망종, 7=소서,
// 8=입추, 9=백로, 10=한로, 11=입동, 12=대설.
// MONTH_BRANCHES_BY_TERM[k] is the branch of the period that *starts*
// at solar term k (소한→丑, 입춘→寅, …).
const MONTH_BRANCHES_BY_TERM: Record<number, string> = {
  1: '丑', 2: '寅', 3: '卯', 4: '辰', 5: '巳', 6: '午',
  7: '未', 8: '申', 9: '酉', 10: '戌', 11: '亥', 12: '子',
}

export interface SajuMonthRef {
  branch: string
  sajuYear: number
  /** 1=寅(after 입춘) … 12=丑(before 입춘 of next yr) */
  sajuMonthIndex: number
  /** Calendar-term index that opened this period (1=소한 … 12=대설) */
  termIndex: number
}

/**
 * Walk solar terms backwards to find the latest 節 ≤ date and emit the
 * matching saju month branch + saju year. Mirrors the logic the main
 * engine uses in saju.ts (`ipchunUTC` boundary + `sajuMonth` adjust).
 */
export function getMonthRefForDate(date: Date): SajuMonthRef {
  const y = date.getFullYear()
  for (const candidateYear of [y, y - 1]) {
    for (let term = 12; term >= 1; term--) {
      const t = getSolarTermKST(candidateYear, term)
      if (t && t.getTime() <= date.getTime()) {
        // Saju year flips at 입춘 (term 2). Anything before 입춘 still
        // belongs to last year's 寅 cycle.
        const sajuYear = term >= 2 ? candidateYear : candidateYear - 1
        const sajuMonthIndex = term === 1 ? 12 : term - 1
        return {
          branch: MONTH_BRANCHES_BY_TERM[term],
          sajuYear,
          sajuMonthIndex,
          termIndex: term,
        }
      }
    }
  }
  // Out of KASI table range. Fall back to a Gregorian approximation so
  // callers don't crash; they'll get slightly off boundaries but not
  // wildly wrong values.
  const fallbackBranch = BRANCHES[(date.getMonth() + 2) % 12]
  return {
    branch: fallbackBranch,
    sajuYear: date.getFullYear(),
    sajuMonthIndex: ((date.getMonth() + 12) % 12) + 1,
    termIndex: ((date.getMonth() + 11) % 12) + 1,
  }
}

/**
 * The year-pillar stem for the saju year `date` falls in.
 * 60갑자: idx = (sajuYear - 4) mod 10 / 12.
 */
export function getYearPillarForDate(date: Date): { stem: string; branch: string } {
  const { sajuYear } = getMonthRefForDate(date)
  const idx60 = (sajuYear - 4 + 6000) % 60
  return { stem: STEMS[idx60 % 10], branch: BRANCHES[idx60 % 12] }
}

/**
 * The month-pillar (stem + branch) for `date`, computed via the same
 * MONTH_STEM_LOOKUP table the main engine uses. The 寅月 stem depends on
 * the year stem; subsequent months walk forward 1 stem per branch.
 */
export function getMonthPillarForDate(date: Date): { stem: string; branch: string } {
  const ref = getMonthRefForDate(date)
  const yearPillar = getYearPillarForDate(date)
  const firstMonthStem = MONTH_STEM_LOOKUP[yearPillar.stem]
  const firstStemIdx = STEMS.indexOf(firstMonthStem)
  // sajuMonthIndex 1=寅 → offset 0; 2=卯 → offset 1; … 12=丑 → offset 11.
  const offsetFromTiger = ref.sajuMonthIndex - 1
  const monthStemIdx = (firstStemIdx + offsetFromTiger + 10) % 10
  return { stem: STEMS[monthStemIdx], branch: ref.branch }
}

/**
 * Branch → 오행. 寅卯=목, 巳午=화, 申酉=금, 亥子=수, 辰未戌丑=토.
 * Avoids the Gregorian-month aliasing where May 1 (still 辰月/봄/목)
 * and May 31 (巳月/초여름/화) were both treated as 'wood' by month-based
 * mapping.
 */
const BRANCH_TO_ELEMENT: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  寅: 'wood', 卯: 'wood',
  巳: 'fire', 午: 'fire',
  申: 'metal', 酉: 'metal',
  亥: 'water', 子: 'water',
  辰: 'earth', 未: 'earth', 戌: 'earth', 丑: 'earth',
}

export function elementOfBranch(
  branch: string
): 'wood' | 'fire' | 'earth' | 'metal' | 'water' {
  return BRANCH_TO_ELEMENT[branch] || 'earth'
}

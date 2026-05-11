/**
 * Destiny Match Synergy Highlight Extractor
 *
 * Surfaces a single "headline" pair from a comprehensive compatibility result
 * (Saju 천간합/육합/삼합) and from sun-sign positions (점성 aspect),
 * for compact display on profile cards.
 */

import type { ComprehensiveCompatibility } from '@/lib/saju/compatibility'

export type SajuSynergyKind =
  | 'stem-hap' // 천간합
  | 'branch-yukhap' // 지지육합
  | 'branch-samhap' // 지지삼합
  | 'day-master' // 일간 관계 (fallback)
  | 'none'

export interface SajuSynergyHighlight {
  kind: SajuSynergyKind
  /** Korean shorthand label e.g. "정임합", "인해합" */
  label: string
  /** Hanja characters involved e.g. ["丁", "壬"] */
  chars: string[]
  /** Resulting element of the harmony (e.g. "목", "화") if applicable */
  result?: string
}

export type AstroAspectKind = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition' | 'none'

export interface AstroSynergyHighlight {
  kind: AstroAspectKind
  /** English aspect name e.g. "Trine" */
  label: string
  /** Aspect angle in degrees */
  angle: number
  harmony: 'harmonious' | 'challenging' | 'neutral'
  signs: [string, string]
}

export interface SynergyHighlight {
  saju: SajuSynergyHighlight | null
  astro: AstroSynergyHighlight | null
}

// 천간 한자 → 한글
const STEM_KO: Record<string, string> = {
  甲: '갑',
  乙: '을',
  丙: '병',
  丁: '정',
  戊: '무',
  己: '기',
  庚: '경',
  辛: '신',
  壬: '임',
  癸: '계',
}

// 지지 한자 → 한글
const BRANCH_KO: Record<string, string> = {
  子: '자',
  丑: '축',
  寅: '인',
  卯: '묘',
  辰: '진',
  巳: '사',
  午: '오',
  未: '미',
  申: '신',
  酉: '유',
  戌: '술',
  亥: '해',
}

function toStemKo(c: string): string {
  return STEM_KO[c] ?? c
}
function toBranchKo(c: string): string {
  return BRANCH_KO[c] ?? c
}

/**
 * Extracts the headline saju harmony from a comprehensive compatibility
 * analysis. Priority: 천간합 → 지지육합 → 지지삼합 → 일간관계 → null.
 */
export function extractSajuSynergy(
  result:
    | Pick<
        ComprehensiveCompatibility,
        'stemCompatibility' | 'branchCompatibility' | 'dayMasterRelation'
      >
    | null
    | undefined
): SajuSynergyHighlight | null {
  if (!result) {
    return null
  }

  const stemHap = result.stemCompatibility?.hapPairs?.[0]
  if (stemHap?.stem1 && stemHap?.stem2) {
    const a = toStemKo(stemHap.stem1)
    const b = toStemKo(stemHap.stem2)
    return {
      kind: 'stem-hap',
      label: `${a}${b}합`,
      chars: [stemHap.stem1, stemHap.stem2],
      result: extractElementFromHapResult(stemHap.result),
    }
  }

  const yukhap = result.branchCompatibility?.yukhapPairs?.[0]
  if (yukhap?.branch1 && yukhap?.branch2) {
    const a = toBranchKo(yukhap.branch1)
    const b = toBranchKo(yukhap.branch2)
    return {
      kind: 'branch-yukhap',
      label: `${a}${b}합`,
      chars: [yukhap.branch1, yukhap.branch2],
      result: yukhap.result,
    }
  }

  const samhap = result.branchCompatibility?.samhapGroups?.[0]
  if (samhap?.branches && samhap.branches.length >= 2) {
    const koBranches = samhap.branches.map(toBranchKo).join('')
    return {
      kind: 'branch-samhap',
      label: `${koBranches} 삼합`,
      chars: [...samhap.branches],
      result: samhap.result,
    }
  }

  // Fallback: surface day-master relation as a low-priority highlight only if it has data
  const dm = result.dayMasterRelation
  if (dm?.person1DayMaster && dm?.person2DayMaster) {
    return {
      kind: 'day-master',
      label: dm.relation || '일간관계',
      chars: [dm.person1DayMaster, dm.person2DayMaster],
    }
  }

  return null
}

/** Extract the element character from strings like "목으로 합화". */
function extractElementFromHapResult(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined
  }
  // engine produces "{element}으로 합화"; first char is the element
  return raw.charAt(0) || undefined
}

// ───────────────── Astrology (sun-sign aspects) ─────────────────

const ZODIAC_ORDER = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const

type ZodiacName = (typeof ZODIAC_ORDER)[number]

function zodiacIndex(name: string | null | undefined): number {
  if (!name) {
    return -1
  }
  return ZODIAC_ORDER.indexOf(name as ZodiacName)
}

/**
 * Computes the major aspect between two sun signs, ignoring orb/degree.
 * Pure sign-to-sign distance, suitable for compact card display.
 *
 * 0 signs apart  →  Conjunction (neutral)
 * 2 signs apart  →  Sextile     (harmonious)
 * 3 signs apart  →  Square      (challenging)
 * 4 signs apart  →  Trine       (harmonious)
 * 6 signs apart  →  Opposition  (challenging)
 * else           →  null
 */
export function extractAstroSynergy(
  sign1: string | null | undefined,
  sign2: string | null | undefined
): AstroSynergyHighlight | null {
  const i = zodiacIndex(sign1)
  const j = zodiacIndex(sign2)
  if (i < 0 || j < 0) {
    return null
  }

  const raw = Math.abs(i - j) % 12
  const distance = Math.min(raw, 12 - raw) // 0..6

  switch (distance) {
    case 0:
      return {
        kind: 'conjunction',
        label: 'Conjunction',
        angle: 0,
        harmony: 'neutral',
        signs: [sign1 as string, sign2 as string],
      }
    case 2:
      return {
        kind: 'sextile',
        label: 'Sextile',
        angle: 60,
        harmony: 'harmonious',
        signs: [sign1 as string, sign2 as string],
      }
    case 3:
      return {
        kind: 'square',
        label: 'Square',
        angle: 90,
        harmony: 'challenging',
        signs: [sign1 as string, sign2 as string],
      }
    case 4:
      return {
        kind: 'trine',
        label: 'Trine',
        angle: 120,
        harmony: 'harmonious',
        signs: [sign1 as string, sign2 as string],
      }
    case 6:
      return {
        kind: 'opposition',
        label: 'Opposition',
        angle: 180,
        harmony: 'challenging',
        signs: [sign1 as string, sign2 as string],
      }
    default:
      return null
  }
}

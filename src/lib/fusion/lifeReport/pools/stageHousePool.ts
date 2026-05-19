// src/lib/fusion/lifeReport/pools/stageHousePool.ts
//
// 12운성 × 12궁 cross pool — bridges saju 일지 12-stage to astrology
// natal house.
//
// Source: src/lib/destiny-matrix/data/layer6-stage-house.ts
//   TWELVE_STAGE_HOUSE_MATRIX — 12 stages × 12 houses × { keyword, advice }
//   = 144 entries. Until now only consumed inside destiny-matrix/engine.
//
// LifeReport surface gains one extra cross line: "the user's natal
// 12-stage signature anchored at the house their Sun (or Moon) sits in."

import { TWELVE_STAGE_HOUSE_MATRIX } from '@/lib/destiny-matrix/data/layer6-stage-house'
import type { TwelveStageStandard } from '@/lib/saju/types'

type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

const STAGE_STANDARD: TwelveStageStandard[] = [
  '장생',
  '목욕',
  '관대',
  '임관',
  '왕지',
  '쇠',
  '병',
  '사',
  '묘',
  '절',
  '태',
  '양',
]
const STAGE_STANDARD_SET = new Set<string>(STAGE_STANDARD)

function asStandardStage(raw: string | undefined): TwelveStageStandard | undefined {
  if (!raw) return undefined
  // 건록 → 임관, 제왕 → 왕지 (별칭 normalise — saju/types.ts 정의).
  const normalised = raw === '건록' ? '임관' : raw === '제왕' ? '왕지' : raw
  return STAGE_STANDARD_SET.has(normalised) ? (normalised as TwelveStageStandard) : undefined
}

const HOUSE_LABEL_KO: Record<HouseNumber, string> = {
  1: '자아',
  2: '자원',
  3: '학습',
  4: '뿌리',
  5: '창조',
  6: '일상',
  7: '관계',
  8: '심층',
  9: '확장',
  10: '사회',
  11: '동료',
  12: '내면',
}

const HOUSE_LABEL_EN: Record<HouseNumber, string> = {
  1: 'identity',
  2: 'resources',
  3: 'learning',
  4: 'roots',
  5: 'creation',
  6: 'daily',
  7: 'relationships',
  8: 'depth',
  9: 'expansion',
  10: 'social arena',
  11: 'allies',
  12: 'inner world',
}

/**
 * Return a one-line bilingual narrative for the (12-stage, house) pair.
 * Empty when stage or house is unknown.
 */
export function stageHouseLine(
  stage: string | undefined,
  house: number | undefined,
  lang: 'ko' | 'en'
): string {
  const normalised = asStandardStage(stage)
  if (!normalised || !house) return ''
  if (house < 1 || house > 12) return ''
  const houseN = house as HouseNumber
  const stageRow = TWELVE_STAGE_HOUSE_MATRIX[normalised]
  if (!stageRow) return ''
  const entry = stageRow[houseN]
  if (!entry) return ''
  const keyword = lang === 'ko' ? entry.keyword : entry.keywordEn
  const houseLabel = lang === 'ko' ? HOUSE_LABEL_KO[houseN] : HOUSE_LABEL_EN[houseN]
  if (lang === 'ko') {
    return `12운성 ${normalised} × ${houseLabel} 영역 — ${keyword}. ${
      'advice' in entry && typeof entry.advice === 'string' ? entry.advice : ''
    }`.trim()
  }
  return `12-stage ${normalised} × ${houseLabel} — ${keyword}.`
}

/**
 * Pull the matrix entry directly when the caller needs more than the
 * one-line summary (e.g. score, color code).
 */
export function getStageHouseEntry(stage: string | undefined, house: number | undefined) {
  const normalised = asStandardStage(stage)
  if (!normalised || !house) return undefined
  if (house < 1 || house > 12) return undefined
  return TWELVE_STAGE_HOUSE_MATRIX[normalised]?.[house as HouseNumber]
}

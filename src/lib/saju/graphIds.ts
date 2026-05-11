// src/lib/Saju/graphIds.ts
import type { FiveElement } from './types'

const ELEMENT_ALIASES: Record<string, FiveElement> = {
  목: '목',
  木: '목',
  WOOD: '목',
  화: '화',
  火: '화',
  FIRE: '화',
  토: '토',
  土: '토',
  EARTH: '토',
  금: '금',
  金: '금',
  METAL: '금',
  수: '수',
  水: '수',
  WATER: '수',
}

const STEM_HANJA_TO_HANGUL: Record<string, string> = {
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
  갑: '갑',
  을: '을',
  병: '병',
  정: '정',
  무: '무',
  기: '기',
  경: '경',
  신: '신',
  임: '임',
  계: '계',
}

const BRANCH_HANJA_TO_HANGUL: Record<string, string> = {
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
  자: '자',
  축: '축',
  인: '인',
  묘: '묘',
  진: '진',
  사: '사',
  오: '오',
  미: '미',
  신: '신',
  유: '유',
  술: '술',
  해: '해',
}

function normalizeElement(value?: string | null): FiveElement | null {
  if (!value) return null
  const raw = value.split('(', 1)[0].trim()
  if (raw in ELEMENT_ALIASES) return ELEMENT_ALIASES[raw]
  const upper = raw.toUpperCase()
  return ELEMENT_ALIASES[upper] ?? null
}

function normalizeStem(value?: string | null): string | null {
  if (!value) return null
  return STEM_HANJA_TO_HANGUL[value] ?? null
}

function normalizeBranch(value?: string | null): string | null {
  if (!value) return null
  return BRANCH_HANJA_TO_HANGUL[value] ?? null
}

export function toSajuElementId(value?: string | null): string | null {
  const element = normalizeElement(value)
  if (!element) return null
  return `EL_${element}`
}

export function toStemId(value?: string | null): string | null {
  if (!value) return null
  if (value.startsWith('GAN_')) return value
  const stem = normalizeStem(value.trim())
  return stem ? `GAN_${stem}` : null
}

export function toBranchId(value?: string | null): string | null {
  if (!value) return null
  if (value.startsWith('BR_')) return value
  const branch = normalizeBranch(value.trim())
  return branch ? `BR_${branch}` : null
}

export function toGanjiId(value?: string | null): string | null {
  if (!value) return null
  if (value.startsWith('GAN_')) return value
  const raw = value.trim()
  if (raw.length !== 2) return null
  const stem = normalizeStem(raw[0])
  const branch = normalizeBranch(raw[1])
  if (!stem || !branch) return null
  return `GAN_${stem}${branch}`
}

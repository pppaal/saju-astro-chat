import { getPathText } from './rewriteGuards'

const SAJU_REGEX = /사주|오행|십신|대운|일간|격국|용신|신살|saju|five element|sibsin|daeun/i
const ASTRO_REGEX =
  /점성|행성|하우스|트랜짓|별자리|상승궁|천궁도|astrology|planet|house|transit|zodiac/i
const CROSS_REGEX = /교차|융합|통합|cross|integrat|synthesize/i
const ACTION_REGEX =
  /해야|하세요|실행|점검|정리|기록|실천|계획|오늘|이번주|이번 달|today|this week|this month|action|plan|step|execute|schedule/i
const TIMING_REGEX =
  /대운|세운|월운|일진|타이밍|시기|전환점|transit|timing|window|period|daeun|seun|wolun|iljin/i

const LIST_LINE_REGEX = /^\s*(?:[-*•]|\d+[.)]|[A-Za-z][.)]|[가-힣][.)])\s+/m

export function hasCrossInText(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return SAJU_REGEX.test(text) && ASTRO_REGEX.test(text)
}

export function hasActionInText(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return ACTION_REGEX.test(text)
}

export function hasEvidenceTriplet(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return SAJU_REGEX.test(text) && ASTRO_REGEX.test(text) && CROSS_REGEX.test(text)
}

export function hasTimingInText(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return TIMING_REGEX.test(text)
}

export function hasRepetitiveSentences(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length >= 2) {
    const lineCounts = new Map<string, number>()
    for (const line of lines) {
      const key = line.replace(/\s+/g, ' ')
      lineCounts.set(key, (lineCounts.get(key) || 0) + 1)
    }
    if ([...lineCounts.values()].some((count) => count >= 2)) return true
  }

  const sentenceSplit = text
    .split(/(?<=다\.)\s+|(?<=[.!?])\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 24)
  if (sentenceSplit.length < 3) return false
  const sentenceCounts = new Map<string, number>()
  for (const sentence of sentenceSplit) {
    const key = sentence.replace(/\s+/g, '').replace(/[^\p{L}\p{N}]/gu, '')
    if (!key) continue
    sentenceCounts.set(key, (sentenceCounts.get(key) || 0) + 1)
  }
  return [...sentenceCounts.values()].some((count) => count >= 2)
}

export function hasListLikeStyle(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  const lines = text.split(/\r?\n/).map((line) => line.trim())
  const nonEmpty = lines.filter(Boolean)
  if (nonEmpty.length === 0) return false
  const listLike = nonEmpty.filter((line) => LIST_LINE_REGEX.test(line)).length
  return listLike / nonEmpty.length >= 0.25 || listLike >= 3
}

export function getShortSectionPaths(
  sections: Record<string, unknown>,
  paths: string[],
  minCharsPerSection: number
): string[] {
  const short: string[] = []
  for (const path of paths) {
    const text = getPathText(sections, path)
    if (text && text.length < minCharsPerSection) short.push(path)
  }
  return short
}

export function getMissingCrossPaths(
  sections: Record<string, unknown>,
  crossPaths: string[]
): string[] {
  return crossPaths.filter((path) => {
    const text = getPathText(sections, path)
    return !!text && !hasCrossInText(text)
  })
}

export function getCrossCoverageRatio(
  sections: Record<string, unknown>,
  crossPaths: string[]
): number {
  const texts = crossPaths.map((path) => getPathText(sections, path)).filter((t) => t.length > 0)
  if (texts.length === 0) return 0
  const hit = texts.filter((t) => hasCrossInText(t)).length
  return hit / texts.length
}

export function getCoverageRatioByPredicate(
  sections: Record<string, unknown>,
  paths: string[],
  predicate: (text: string) => boolean
): number {
  const texts = paths.map((path) => getPathText(sections, path)).filter((t) => t.length > 0)
  if (texts.length === 0) return 0
  const hit = texts.filter((t) => predicate(t)).length
  return hit / texts.length
}

export function getMissingPathsByPredicate(
  sections: Record<string, unknown>,
  paths: string[],
  predicate: (text: string) => boolean
): string[] {
  return paths.filter((path) => {
    const text = getPathText(sections, path)
    return !!text && !predicate(text)
  })
}

export function getListStylePaths(sections: Record<string, unknown>, paths: string[]): string[] {
  return paths.filter((path) => {
    const text = getPathText(sections, path)
    return !!text && hasListLikeStyle(text)
  })
}

export function getRepetitivePaths(sections: Record<string, unknown>, paths: string[]): string[] {
  return paths.filter((path) => {
    const text = getPathText(sections, path)
    return !!text && hasRepetitiveSentences(text)
  })
}

// @ts-nocheck
/**
 * 단락 구분(\n\n) 보존 검증 — synthesizeExpertNarrationKo 결과가
 * formatNarrativeParagraphs / sanitizeUserFacingNarrative / buildNarrativeSectionFromCore를
 * 거치고도 \n\n이 보존되는지 확인.
 */

import { synthesizeExpertNarrationKo } from '../src/lib/destiny-matrix/ai-report/sajuNarrationBridge'
import { formatNarrativeParagraphs } from '../src/lib/destiny-matrix/ai-report/reportNarrativeFormatting'
import { sanitizeUserFacingNarrative } from '../src/lib/destiny-matrix/ai-report/reportNarrativeSanitizer'

const SAMPLE_INPUT: any = {
  geokguk: '정인격',
  twelveStages: { 쇠: 1, 목욕: 1, 태: 1, 절: 1 },
  sibsinDistribution: { 편재: 2, 상관: 1, 정인: 1, 정재: 1, 비견: 2, 편인: 1 },
  shinsalList: ['지살', '망신', '화개', '천을귀인'],
  relations: [],
  dayMasterElement: '금',
  currentDaeunElement: '목',
  currentSaeunElement: '화',
  planetSigns: { Sun: 'Aquarius', Moon: 'Gemini', Venus: 'Capricorn', Mars: 'Sagittarius' },
  planetHouses: { Saturn: 1, Jupiter: 9 },
  aspects: [],
  dominantWesternElement: 'fire',
  activeTransits: ['saturnReturn', 'mercuryRetrograde'],
  currentDateIso: '2026-04-30',
  yongsin: '토',
  sajuSnapshot: {
    pillars: {
      day: { heavenlyStem: { name: '辛' }, earthlyBranch: { name: '未' } },
    },
    daeWoon: {
      current: { age: 22, heavenlyStem: '乙', earthlyBranch: '亥' },
      list: [
        { age: 12, heavenlyStem: '丙', earthlyBranch: '子' },
        { age: 22, heavenlyStem: '乙', earthlyBranch: '亥' },
        { age: 32, heavenlyStem: '甲', earthlyBranch: '戌' },
      ],
    },
    unse: {
      annual: [
        { year: 2025, ganji: '乙巳' },
        { year: 2026, ganji: '丙午' },
        { year: 2027, ganji: '丁未' },
      ],
    },
    birthYear: 1995,
  },
}

function countParagraphs(text: string): number {
  return text.split(/\n\s*\n/).length
}

function main() {
  const raw = synthesizeExpertNarrationKo(SAMPLE_INPUT)
  console.log('━━━ Stage 1: synthesizeExpertNarrationKo raw 출력 ━━━')
  console.log(`paragraphs: ${countParagraphs(raw)}, length: ${raw.length}`)
  console.log(`첫 100자: ${raw.slice(0, 100)}…`)
  console.log()

  const afterFormat = formatNarrativeParagraphs(raw, 'ko')
  console.log('━━━ Stage 2: formatNarrativeParagraphs 통과 후 ━━━')
  console.log(`paragraphs: ${countParagraphs(afterFormat)}, length: ${afterFormat.length}`)
  console.log()

  const afterSanitize = sanitizeUserFacingNarrative(raw)
  console.log('━━━ Stage 3: sanitizeUserFacingNarrative 통과 후 ━━━')
  console.log(`paragraphs: ${countParagraphs(afterSanitize)}, length: ${afterSanitize.length}`)
  console.log()

  const afterBoth = formatNarrativeParagraphs(sanitizeUserFacingNarrative(raw), 'ko')
  console.log('━━━ Stage 4: 둘 다 통과 후 ━━━')
  console.log(`paragraphs: ${countParagraphs(afterBoth)}, length: ${afterBoth.length}`)
  console.log()

  // 회귀 검증
  const initialParagraphs = countParagraphs(raw)
  const finalParagraphs = countParagraphs(afterBoth)
  if (finalParagraphs === initialParagraphs) {
    console.log(`✓ 단락 ${initialParagraphs}개 보존 확인`)
  } else {
    console.log(`✗ 단락 손실: ${initialParagraphs} → ${finalParagraphs}`)
    process.exit(1)
  }
}

main()

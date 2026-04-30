/**
 * Saju 라이브러리(`src/lib/Saju/*`) 한국어 풀이 함수들을 ai-report 섹션에
 * 끌어와 본명 narration을 합성합니다.
 *
 * 라이브러리는 18,924줄 다 만들어져 있는데 ai-report 파이프가 호출 안 하던
 * 갭을 메우는 wiring 모듈. 새 narrator를 만들지 않고 기존 함수만 호출.
 *
 * 호출 함수:
 *   - getGeokgukDescription(geokguk)       : 격국 17종 한국어 풀이
 *   - generateSibsinText(sibsin)            : 십신 풀이 (정관/식신/...)
 *   - generateTwelveStageText(stage)        : 12운성 풀이 (장생/관대/...)
 */

import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import { getGeokgukDescription } from '@/lib/Saju/geokguk'
import {
  generateSibsinText,
  generateTwelveStageText,
} from '@/lib/Saju/textGenerator'
import type { GeokgukType } from '@/lib/Saju/geokguk'
import type { SibsinKind } from '@/lib/Saju/types'

const KO_SHINSAL_BLURB: Record<string, string> = {
  역마: '이동·출장·전직 같은 환경 변동이 잘 일어나고',
  도화: '관계 끌림과 매력이 살아나며 공개적인 자리에 서기 좋고',
  화개: '내적 정리·예술·고독한 시간이 깊어지고',
  망신: '체면 흔들림이나 실수 노출에 조심해야 하고',
  천을귀인: '귀인의 도움이 들어오고 위기에서 풀리는 길이 잘 열리고',
  태극귀인: '학문·종교·영적 통찰이 강해지고',
  문창: '학습·시험·문서 운이 강해지고',
  문곡: '문장·예술·표현 능력이 빛나고',
  월덕귀인: '한 달 단위 흐름에서 보호와 안정이 들어오고',
  천덕귀인: '하늘의 덕이 보호처럼 작용해 큰 흉운을 막아주고',
  괴강: '강한 추진력과 카리스마가 있되 극단으로 치우치기 쉽고',
  양인: '결단과 칼날같은 추진이 있는 대신 충돌·사고에 조심해야 하고',
  백호: '강력한 사건성·충돌이 있을 수 있어 조심해야 하고',
  금여성: '주변에서 도움과 인덕이 들어오고',
  천문성: '학문·종교·영성에 인연이 깊고',
  귀문관: '예민한 직관과 영적 감수성이 강하고',
  현침: '뾰족한 결단이나 직설 표현이 강한 패턴이 있고',
  고신: '외로움·고립·독립적 성향이 강하고',
  삼재: '3년 단위의 큰 정리·리셋 시기가 있어 무리한 확장은 자제하고',
}

function topEntry<T extends string>(
  dist: Partial<Record<T, number>> | undefined
): T | null {
  if (!dist) return null
  const entries = Object.entries(dist) as Array<[T, number]>
  if (entries.length === 0) return null
  let bestKey: T | null = null
  let bestVal = -Infinity
  for (const [k, v] of entries) {
    if (typeof v === 'number' && v > bestVal) {
      bestVal = v
      bestKey = k
    }
  }
  return bestKey
}

/**
 * 본명 사주 narration 한국어 라인 묶음 — deepAnalysis에 prepend하기 좋도록 한 단락 합성.
 * matrixInput에 격국·12운성·십신·신살이 이미 채워져 있어서 그대로 재해석.
 */
export function buildSajuNarrationKo(input: MatrixCalculationInput): string {
  const lines: string[] = []

  // 1) 격국 — 본명의 큰 성격 한 줄
  if (input.geokguk) {
    const desc = getGeokgukDescription(input.geokguk as GeokgukType)
    if (desc) {
      lines.push(`본명이 ${input.geokguk}이라 ${desc} 분이에요.`)
    }
  }

  // 2) 12운성 — 일간 기준 가장 두드러진 단계 한 줄
  const topStage = topEntry(input.twelveStages)
  if (topStage) {
    const stageText = generateTwelveStageText(topStage, { style: 'casual' })
    if (stageText?.main) {
      lines.push(`본명 일간이 12운성 흐름에서 ${stageText.main}`)
    }
  }

  // 3) 십신 — 가장 강한 십신 한 줄
  // generateSibsinText는 SIBSIN_INTERPRETATIONS에 없는 키엔 throw하므로 방어적으로 wrap
  const topSibsin = topEntry<SibsinKind>(input.sibsinDistribution)
  if (topSibsin) {
    try {
      const sibsinText = generateSibsinText(topSibsin, { style: 'casual' })
      if (sibsinText?.main) {
        lines.push(sibsinText.main)
      }
    } catch {
      // 데이터 사전에 없는 십신이면 라이브러리가 throw — 조용히 스킵
    }
  }

  // 4) 신살 — 활성 신살 중 위 사전에 있는 항목들을 자연어로 묶음
  if (input.shinsalList && input.shinsalList.length > 0) {
    const blurbs = input.shinsalList
      .map((k) => KO_SHINSAL_BLURB[k as string])
      .filter(Boolean)
      .slice(0, 3)
    if (blurbs.length > 0) {
      lines.push(`본명에 ${input.shinsalList.slice(0, 3).join('·')}이 활성화돼 ${blurbs.join(', ')} 합니다.`)
    }
  }

  return lines.join(' ')
}

/**
 * 도메인별 narration suffix — 테마 리포트에서 deepAnalysis 뒤에 덧붙이기.
 * 격국이 그 도메인에서 어떻게 발현되는지 짧게 한 줄.
 */
export function buildDomainSajuLensKo(
  input: MatrixCalculationInput,
  theme: 'love' | 'career' | 'wealth' | 'health' | 'family' | 'move'
): string {
  if (!input.geokguk) return ''
  const lensByTheme: Record<typeof theme, string> = {
    career: `${input.geokguk}이라 직업·역할에서 그 격국 색이 그대로 드러나요.`,
    love: `${input.geokguk} 흐름이 관계에서 어떻게 표현되는지가 핵심 포인트예요.`,
    wealth: `${input.geokguk} 흐름이 돈을 다루는 방식과 직결돼요.`,
    health: `${input.geokguk} 흐름이 컨디션 관리와 회복 패턴에도 똑같이 비춰요.`,
    family: `${input.geokguk} 흐름이 가족 안에서의 역할과 책임 분배로 나타나요.`,
    move: `${input.geokguk} 흐름이 이동·환경 변동을 다루는 태도에 그대로 반영돼요.`,
  }
  return lensByTheme[theme]
}

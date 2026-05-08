/**
 * 삼기 cycle 발현 — cycle 천간이 본명 천간들과 함께 삼기 (三奇) 를
 * 완성시키는지 판정.
 *
 * 정통 삼기:
 *   천상삼기 (天上三奇): 甲 戊 庚 — 리더십·권위·사회적 성공
 *   지하삼기 (地下三奇): 乙 丙 丁 — 재물복·실물운
 *   인중삼기 (人中三奇): 壬 癸 辛 — 인복·학문·예술
 *
 * 발현 패턴:
 *   - 본명에 이미 3글자 다 있음 → cycle 들어와도 별 변화 (이미 발현)
 *   - 본명에 2글자, cycle 천간이 마지막 글자 → "완성" (큰 길운)
 *   - 본명에 1글자, cycle 들어와도 부족 → 미완성
 */

const SAMGI_GROUPS: Array<{ type: '천상삼기' | '지하삼기' | '인중삼기'; stems: string[]; blessing: string }> = [
  { type: '천상삼기', stems: ['甲', '戊', '庚'], blessing: '리더십·권위' },
  { type: '지하삼기', stems: ['乙', '丙', '丁'], blessing: '재물·실물운' },
  { type: '인중삼기', stems: ['壬', '癸', '辛'], blessing: '인복·학문·예술' },
]

export type SamgiCompletionState = 'already_complete' | 'cycle_completes' | 'partial' | 'none'

export interface SamgiCycleAnalysis {
  state: SamgiCompletionState
  /** 발현된/예정된 삼기 타입 */
  type?: '천상삼기' | '지하삼기' | '인중삼기'
  /** cycle 이 채운 글자 (cycle_completes 일 때) */
  completingStem?: string
  /** 본명에 있던 글자들 */
  natalStems?: string[]
  /** 한 줄 요약 */
  summary: string
}

interface SamgiInput {
  cycleStem: string
  natalStems: string[] // year/month/day/time 천간 4개
}

export function analyzeCycleSamgi(input: SamgiInput): SamgiCycleAnalysis {
  let bestState: SamgiCompletionState = 'none'
  let bestType: SamgiCycleAnalysis['type']
  let bestNatal: string[] | undefined
  let completing: string | undefined

  for (const group of SAMGI_GROUPS) {
    const inNatal = group.stems.filter((s) => input.natalStems.includes(s))
    const inCycle = group.stems.includes(input.cycleStem)

    // 1) 이미 본명만으로 다 갖춤
    if (inNatal.length === 3) {
      bestState = 'already_complete'
      bestType = group.type
      bestNatal = inNatal
      continue
    }

    // 2) 본명 2글자 + cycle 1글자 (마지막 채움)
    if (inNatal.length === 2 && inCycle && !inNatal.includes(input.cycleStem)) {
      // cycle 이 마지막 한 글자
      bestState = 'cycle_completes'
      bestType = group.type
      bestNatal = inNatal
      completing = input.cycleStem
      // 이게 가장 강한 시그널이라 즉시 break 가능
      return {
        state: bestState,
        type: bestType,
        completingStem: completing,
        natalStems: bestNatal,
        summary: `${bestType} 완성 — cycle ${completing} 가 본명 ${inNatal.join('·')} 에 합류 (${group.blessing})`,
      }
    }

    // 3) 본명 1-2글자 (cycle 도움 안 됨) — partial
    if ((inNatal.length === 1 || inNatal.length === 2) && bestState === 'none') {
      bestState = 'partial'
      bestType = group.type
      bestNatal = inNatal
    }
  }

  return {
    state: bestState,
    type: bestType,
    natalStems: bestNatal,
    summary: buildSummary(bestState, bestType, bestNatal),
  }
}

function buildSummary(state: SamgiCompletionState, type?: string, natal?: string[]): string {
  if (state === 'none') return '삼기 무관'
  if (state === 'already_complete') return `${type} 본명 갖춤 (cycle 영향 없음)`
  if (state === 'partial') return `${type} 부분 (${natal?.join('·')}) — cycle 채움 없음`
  return '삼기 무관'
}

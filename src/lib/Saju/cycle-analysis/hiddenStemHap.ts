/**
 * 지장간 합 (隱合) — cycle 지지의 지장간(여기/중기/정기)이 본명 지지의 지장간과
 * 천간합으로 작용하는지 검출. 표면 천간합이 아니라 지지 안에서 일어나는 숨은 합.
 *
 * 정통: 지장간 안에서의 합도 통근/투간 못지않게 중요. 표면이 아니라 내부에서 일어나는
 * 변화는 무의식·잠재 영역의 시그널.
 */
import { JIJANGGAN } from '../constants'

const STEM_HAP: Record<string, string> = {
  甲: '己', 己: '甲',
  乙: '庚', 庚: '乙',
  丙: '辛', 辛: '丙',
  丁: '壬', 壬: '丁',
  戊: '癸', 癸: '戊',
}

const HAP_ELEMENT: Record<string, string> = {
  甲己: '토', 乙庚: '금', 丙辛: '수', 丁壬: '목', 戊癸: '화',
}

function pairKey(a: string, b: string): string {
  // STEM_HAP 가 양방향이라 set 으로 검사
  const ab = `${a}${b}`
  const ba = `${b}${a}`
  const canonical = ['甲己', '乙庚', '丙辛', '丁壬', '戊癸']
  for (const c of canonical) {
    if (c === ab || c === ba) return c
  }
  return ''
}

export interface HiddenHapHit {
  natalPillar: 'year' | 'month' | 'day' | 'time'
  natalBranch: string
  cycleBranch: string
  /** 본명 지장간 층 */
  natalLayer: '여기' | '중기' | '정기'
  /** cycle 지장간 층 */
  cycleLayer: '여기' | '중기' | '정기'
  /** 본명측 지장간 천간 */
  natalStem: string
  /** cycle측 지장간 천간 */
  cycleStem: string
  /** 합 천간 쌍 (canonical, 예: "甲己") */
  hapPair: string
  /** 化한 오행 */
  hapElement: string
  /** 강도 (정기끼리=1.0, 정기-중기=0.5, 그 외=0.3) */
  strength: number
}

export interface HiddenStemHapAnalysis {
  hits: HiddenHapHit[]
  totalStrength: number
  summary: string
}

interface NatalPillars {
  year: { branch: string }
  month: { branch: string }
  day: { branch: string }
  time: { branch: string }
}

const LAYERS: Array<'여기' | '중기' | '정기'> = ['여기', '중기', '정기']
const LAYER_WEIGHT: Record<string, number> = { 정기: 1.0, 중기: 0.5, 여기: 0.3 }

export function analyzeHiddenStemHap(
  cycleBranch: string,
  natal: NatalPillars,
): HiddenStemHapAnalysis {
  const hits: HiddenHapHit[] = []
  const cycleLayers = JIJANGGAN[cycleBranch as keyof typeof JIJANGGAN]
  if (!cycleLayers) {
    return { hits: [], totalStrength: 0, summary: '지장간 합 없음' }
  }

  for (const pillar of ['year', 'month', 'day', 'time'] as const) {
    const natalBranch = natal[pillar].branch
    const natalLayers = JIJANGGAN[natalBranch as keyof typeof JIJANGGAN]
    if (!natalLayers) continue

    for (const cl of LAYERS) {
      const cycleStem = cycleLayers[cl]
      if (!cycleStem) continue
      for (const nl of LAYERS) {
        const natalStem = natalLayers[nl]
        if (!natalStem) continue
        if (STEM_HAP[cycleStem] !== natalStem) continue
        const key = pairKey(cycleStem, natalStem)
        const element = HAP_ELEMENT[key] || '?'
        const strength = (LAYER_WEIGHT[cl] + LAYER_WEIGHT[nl]) / 2
        hits.push({
          natalPillar: pillar,
          natalBranch,
          cycleBranch,
          natalLayer: nl,
          cycleLayer: cl,
          natalStem,
          cycleStem,
          hapPair: key,
          hapElement: element,
          strength: Math.round(strength * 100) / 100,
        })
      }
    }
  }

  hits.sort((a, b) => b.strength - a.strength)
  const totalStrength = Math.round(hits.reduce((s, h) => s + h.strength, 0) * 100) / 100

  return {
    hits,
    totalStrength,
    summary: buildSummary(hits, totalStrength),
  }
}

function buildSummary(hits: HiddenHapHit[], total: number): string {
  if (hits.length === 0) return '지장간 합 없음'
  const top = hits[0]
  return `지장간 합 ${hits.length}건 (총 강도 ${total}). 대표: ${top.cycleBranch}의 ${top.cycleLayer}(${top.cycleStem}) + ${top.natalPillar}(${top.natalBranch}) ${top.natalLayer}(${top.natalStem}) → 化${top.hapElement} 잠재.`
}

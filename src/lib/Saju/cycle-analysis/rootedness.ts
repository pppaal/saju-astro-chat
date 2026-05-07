/**
 * 통근 (通根) / 투간 (透干) — cycle 천간/지지의 본명 4기둥에 대한 뿌리 분석.
 *
 * **통근**: 천간이 자기 오행과 같은 지장간을 가진 지지에 뿌리내림.
 *   - 정기 통근: 가장 강함 (예: 甲 → 寅 정기 甲)
 *   - 중기 통근: 중간
 *   - 여기 통근: 약함
 *
 * **투간**: 지지의 지장간이 천간에 노출됨.
 *   cycle 지지의 지장간(여기/중기/정기) 중 본명 4기둥 천간에 같은 천간이
 *   존재하면 그 지장간 에너지가 표면화됨 (잠재 → 현실).
 *
 * 무근 천간은 영향력 약함. 통근+투간 강하면 cycle 효과 강력.
 */
import { JIJANGGAN, STEM_TO_ELEMENT } from '../constants'

type Branch = keyof typeof JIJANGGAN
type JijangganLayer = '정기' | '중기' | '여기'

const LAYER_STRENGTH: Record<JijangganLayer, number> = {
  정기: 1.0,
  중기: 0.5,
  여기: 0.3,
}

export interface RootHit {
  /** 본명 어느 기둥의 지지에 뿌리내렸는지 */
  pillar: 'year' | 'month' | 'day' | 'time' | 'cycle'
  branch: string
  /** 어느 층(여기/중기/정기) */
  layer: JijangganLayer
  /** 강도 (0.3 ~ 1.0) */
  strength: number
}

export interface TugganHit {
  /** cycle 지지의 어느 층이 투간했는지 */
  cycleLayer: JijangganLayer
  /** 투간된 천간 */
  stem: string
  /** 투간된 위치 (본명 어느 기둥 천간 또는 cycle 자체) */
  pillar: 'year' | 'month' | 'day' | 'time' | 'cycle'
  /** 강도 */
  strength: number
}

export interface RootednessAnalysis {
  /** cycle 천간이 자기 오행으로 본명/cycle 지지에 통근한 결과 (강도 큰 순) */
  cycleStemRoots: RootHit[]
  /** 통근 총합 강도 (무근=0, 정기 한 번이면 1.0+) */
  rootStrengthTotal: number
  /** 무근 여부 */
  isRootless: boolean
  /** cycle 지지의 지장간 중 본명 천간에 투간된 것들 */
  cycleBranchTuggan: TugganHit[]
  /** 한 줄 요약 */
  summary: string
}

interface NatalPillars {
  year: { stem: string; branch: string }
  month: { stem: string; branch: string }
  day: { stem: string; branch: string }
  time: { stem: string; branch: string }
}

const PILLAR_KINDS = ['year', 'month', 'day', 'time'] as const

/**
 * cycle 천간 + cycle 지지 + 본명 4기둥 → 통근/투간 분석.
 */
export function analyzeRootedness(
  cycleStem: string,
  cycleBranch: string,
  natal: NatalPillars,
): RootednessAnalysis {
  const cycleElement = STEM_TO_ELEMENT[cycleStem as keyof typeof STEM_TO_ELEMENT]

  // ── 통근: cycle 천간 오행 == 어느 지지의 지장간 오행
  const roots: RootHit[] = []
  if (cycleElement) {
    // cycle 자기 지지도 후보
    for (const [pillarKind, branch] of [
      ['cycle', cycleBranch] as const,
      ...PILLAR_KINDS.map((k) => [k, natal[k].branch] as const),
    ]) {
      const layers = JIJANGGAN[branch as Branch]
      if (!layers) continue
      for (const layer of ['정기', '중기', '여기'] as JijangganLayer[]) {
        const stemInLayer = layers[layer]
        if (!stemInLayer) continue
        const layerEl = STEM_TO_ELEMENT[stemInLayer as keyof typeof STEM_TO_ELEMENT]
        if (layerEl === cycleElement) {
          roots.push({
            pillar: pillarKind,
            branch,
            layer,
            strength: LAYER_STRENGTH[layer],
          })
        }
      }
    }
  }
  roots.sort((a, b) => b.strength - a.strength)
  const rootStrengthTotal = roots.reduce((sum, r) => sum + r.strength, 0)
  const isRootless = roots.length === 0

  // ── 투간: cycle 지지의 지장간이 cycle 천간 또는 본명 천간에 같은 글자로 노출
  const tuggans: TugganHit[] = []
  const cycleBranchLayers = JIJANGGAN[cycleBranch as Branch]
  if (cycleBranchLayers) {
    const exposedStems: Record<string, { pillar: TugganHit['pillar']; stem: string }[]> = {}
    const collect = (pillar: TugganHit['pillar'], stem: string) => {
      if (!exposedStems[stem]) exposedStems[stem] = []
      exposedStems[stem].push({ pillar, stem })
    }
    collect('cycle', cycleStem)
    for (const k of PILLAR_KINDS) collect(k, natal[k].stem)

    for (const layer of ['정기', '중기', '여기'] as JijangganLayer[]) {
      const hiddenStem = cycleBranchLayers[layer]
      if (!hiddenStem) continue
      const exposures = exposedStems[hiddenStem] || []
      for (const ex of exposures) {
        tuggans.push({
          cycleLayer: layer,
          stem: hiddenStem,
          pillar: ex.pillar,
          strength: LAYER_STRENGTH[layer],
        })
      }
    }
  }

  return {
    cycleStemRoots: roots,
    rootStrengthTotal: Math.round(rootStrengthTotal * 100) / 100,
    isRootless,
    cycleBranchTuggan: tuggans,
    summary: buildSummary(roots, tuggans, isRootless, rootStrengthTotal),
  }
}

function buildSummary(
  roots: RootHit[],
  tuggans: TugganHit[],
  rootless: boolean,
  total: number,
): string {
  if (rootless) {
    return '무근 — cycle 천간 영향력 약함 (실제 발현 제한적)'
  }
  const strongRoot = roots[0]
  const rootDesc = `${strongRoot.pillar} ${strongRoot.branch} ${strongRoot.layer} (강도 ${total.toFixed(2)})`
  if (tuggans.length === 0) {
    return `통근 ${rootDesc}, 투간 없음`
  }
  const tugDesc = tuggans
    .slice(0, 3)
    .map((t) => `${t.pillar}.${t.stem}(${t.cycleLayer})`)
    .join(', ')
  return `통근 ${rootDesc} / 투간 ${tugDesc}`
}

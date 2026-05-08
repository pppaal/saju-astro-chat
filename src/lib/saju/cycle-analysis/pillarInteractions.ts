/**
 * cycle 4기둥 상호작용 — cycle (대운/세운/월운/일진) ganji가
 * 본명 4기둥 (年/月/日/時) 각각과 가지는 정통 상호작용 추출.
 *
 * 천간: 합(천간오합)
 * 지지: 육합 / 충 / 형 / 해 / 파 / 원진 / 삼합
 *
 * 기존 엔진은 일지만 봤지만 정통은 4기둥 모두 본다.
 * 특히 충은 어느 기둥과 부딪히는지가 핵심 (年=조상/사회운, 月=직업/형제,
 * 日=배우자/자기, 時=자녀/말년).
 */
import { YUKHAP, CHUNG, SAMHAP, XING, HAI, PA } from '../constants'

/** 영역 매핑 — 어느 기둥과 부딪히는지가 곧 어느 영역에 영향이 가는지. */
export const PILLAR_DOMAIN: Record<PillarKind, string> = {
  year: '조상·사회·초년',
  month: '직업·형제·청년',
  day: '배우자·자기·중년',
  time: '자녀·말년',
}

export type PillarKind = 'year' | 'month' | 'day' | 'time'

export type StemRelation = '천간합' | null
export type BranchRelation = '육합' | '삼합' | '충' | '형' | '해' | '파' | '원진' | null

/** 천간오합 — 양간 5개로 정규화된 표 */
const STEM_HAP: Record<string, string> = {
  甲: '己', 己: '甲',
  乙: '庚', 庚: '乙',
  丙: '辛', 辛: '丙',
  丁: '壬', 壬: '丁',
  戊: '癸', 癸: '戊',
}

const WONJIN: Record<string, string> = {
  子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅',
  卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉',
}

function getStemRelation(a: string, b: string): StemRelation {
  if (STEM_HAP[a] === b) return '천간합'
  return null
}

function getBranchRelation(a: string, b: string): BranchRelation {
  if (a === b) return null // 동주는 별도로 처리 (자형 제외)

  // 우선순위: 충 > 삼합 > 육합 > 형 > 해 > 원진 > 파
  if (CHUNG[a] === b) return '충'

  for (const [, group] of Object.entries(SAMHAP)) {
    if (group.includes(a) && group.includes(b)) return '삼합'
  }
  if (YUKHAP[a] === b) return '육합'

  if ((XING[a] || []).includes(b)) return '형'
  if (HAI[a] === b) return '해'
  if (WONJIN[a] === b) return '원진'
  if (PA[a] === b) return '파'

  return null
}

const RELATION_TONE: Record<NonNullable<BranchRelation> | NonNullable<StemRelation>, 'positive' | 'negative'> = {
  육합: 'positive',
  삼합: 'positive',
  천간합: 'positive',
  충: 'negative',
  형: 'negative',
  해: 'negative',
  원진: 'negative',
  파: 'negative',
}

export interface PillarInteraction {
  pillar: PillarKind
  /** 영역 (年=조상/사회, 月=직업, 日=배우자/자기, 時=자녀/말년) */
  domain: string
  stemRelation: StemRelation
  branchRelation: BranchRelation
  /** 종합 톤 (positive / negative / mixed / neutral) */
  tone: 'positive' | 'negative' | 'mixed' | 'neutral'
  /** 한 줄 요약 */
  summary: string
}

export interface PillarInteractionsAnalysis {
  /** 4기둥별 상세 */
  pillars: PillarInteraction[]
  /** 가장 강한 시그널 (충이 있으면 충, 합이 있으면 합) */
  dominantSignal?: {
    pillar: PillarKind
    domain: string
    relation: NonNullable<BranchRelation> | NonNullable<StemRelation>
    tone: 'positive' | 'negative'
  }
  /** 종합 한 줄 */
  summary: string
}

interface NatalPillars {
  year: { stem: string; branch: string }
  month: { stem: string; branch: string }
  day: { stem: string; branch: string }
  time: { stem: string; branch: string }
}

const PILLAR_KINDS: PillarKind[] = ['year', 'month', 'day', 'time']

export function analyzePillarInteractions(
  cycleStem: string,
  cycleBranch: string,
  natal: NatalPillars,
): PillarInteractionsAnalysis {
  const pillars: PillarInteraction[] = []

  for (const kind of PILLAR_KINDS) {
    const np = natal[kind]
    const stemRel = getStemRelation(cycleStem, np.stem)
    const branchRel = getBranchRelation(cycleBranch, np.branch)
    pillars.push({
      pillar: kind,
      domain: PILLAR_DOMAIN[kind],
      stemRelation: stemRel,
      branchRelation: branchRel,
      tone: combineTones(stemRel, branchRel),
      summary: buildPillarSummary(kind, stemRel, branchRel),
    })
  }

  // dominant: 가장 강한 시그널 — 충 > 삼합 > 천간합 > 육합 > 형 > 원진 > 해 > 파
  const dominant = pickDominant(pillars)

  return {
    pillars,
    dominantSignal: dominant,
    summary: buildOverallSummary(pillars, dominant),
  }
}

function combineTones(s: StemRelation, b: BranchRelation): PillarInteraction['tone'] {
  const tones: Array<'positive' | 'negative'> = []
  if (s) tones.push(RELATION_TONE[s])
  if (b) tones.push(RELATION_TONE[b])
  if (tones.length === 0) return 'neutral'
  const allPositive = tones.every((t) => t === 'positive')
  const allNegative = tones.every((t) => t === 'negative')
  if (allPositive) return 'positive'
  if (allNegative) return 'negative'
  return 'mixed'
}

function buildPillarSummary(kind: PillarKind, s: StemRelation, b: BranchRelation): string {
  const parts: string[] = []
  if (s) parts.push(s)
  if (b) parts.push(b)
  if (parts.length === 0) return `${kind}: —`
  return `${kind}: ${parts.join(' + ')} (${PILLAR_DOMAIN[kind]})`
}

const RELATION_PRIORITY: Record<NonNullable<BranchRelation> | NonNullable<StemRelation>, number> = {
  충: 10, 삼합: 9, 천간합: 8, 육합: 7, 형: 6, 원진: 5, 해: 4, 파: 3,
}

function pickDominant(pillars: PillarInteraction[]): PillarInteractionsAnalysis['dominantSignal'] {
  let best: { pillar: PillarKind; domain: string; relation: NonNullable<BranchRelation> | NonNullable<StemRelation>; tone: 'positive' | 'negative' } | undefined
  let bestPriority = -1

  for (const p of pillars) {
    for (const rel of [p.branchRelation, p.stemRelation]) {
      if (!rel) continue
      const pri = RELATION_PRIORITY[rel] ?? 0
      if (pri > bestPriority) {
        bestPriority = pri
        best = {
          pillar: p.pillar,
          domain: p.domain,
          relation: rel,
          tone: RELATION_TONE[rel],
        }
      }
    }
  }
  return best
}

function buildOverallSummary(
  pillars: PillarInteraction[],
  dominant: PillarInteractionsAnalysis['dominantSignal'],
): string {
  const active = pillars.filter((p) => p.tone !== 'neutral')
  if (active.length === 0) return '본명 4기둥과 특별한 합/충 없음 (조용한 흐름)'
  if (dominant) {
    return `${dominant.pillar} ${dominant.relation} (${dominant.domain}) 중심 — ${active.length}개 기둥 활성`
  }
  return `${active.length}개 기둥 활성`
}

/**
 * 신살 활성화 — cycle (대운/세운/월운/일진) 지지가 본명 일주(일간 + 일지)
 * 기준 어떤 신살을 활성화시키는지.
 *
 * 정통: 일간 또는 일지를 축으로 cycle 지지가 들어왔을 때 발현되는 신살.
 *   길성 — 천을귀인, 천덕귀인, 월덕귀인, 건록, 천을·천덕 등
 *   흉성 — 양인, 공망, 백호, 괴강, 도화(과다 시 흉)
 *   중립 — 역마(이동/변화), 화개(예술·종교), 도화(인연)
 *
 * cycle 천간/지지에 적용 가능한 것만 골라낸다.
 */
import { CHEONEUL_GWIIN_MAP } from '../constants'

export type ShinsalKind =
  | '천을귀인' | '천덕귀인' | '월덕귀인' | '건록' | '암록'
  | '역마' | '도화' | '화개'
  | '양인' | '공망' | '귀문관' | '원진'
  | '문창' | '문곡' | '학당귀인'

export type ShinsalTone = 'lucky' | 'neutral' | 'unlucky'

const SHINSAL_TONE: Record<ShinsalKind, ShinsalTone> = {
  천을귀인: 'lucky', 천덕귀인: 'lucky', 월덕귀인: 'lucky',
  건록: 'lucky', 암록: 'lucky',
  학당귀인: 'lucky', 문창: 'lucky', 문곡: 'lucky',
  역마: 'neutral', 도화: 'neutral', 화개: 'neutral',
  양인: 'unlucky', 공망: 'unlucky', 귀문관: 'unlucky', 원진: 'unlucky',
}

// 일지 삼합 그룹별 — 역마(첫칸 충), 도화(두번째 충), 화개(마지막 충)
// 三合 그룹: 寅午戌 / 巳酉丑 / 申子辰 / 亥卯未
const SAMHAP_GROUP_BY_BRANCH: Record<string, [string, string, string]> = {
  寅: ['寅', '午', '戌'], 午: ['寅', '午', '戌'], 戌: ['寅', '午', '戌'],
  巳: ['巳', '酉', '丑'], 酉: ['巳', '酉', '丑'], 丑: ['巳', '酉', '丑'],
  申: ['申', '子', '辰'], 子: ['申', '子', '辰'], 辰: ['申', '子', '辰'],
  亥: ['亥', '卯', '未'], 卯: ['亥', '卯', '未'], 未: ['亥', '卯', '未'],
}

const CHUNG_PAIR: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑',
  寅: '申', 申: '寅', 卯: '酉', 酉: '卯',
  辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}

/** 일지 → 역마 (삼합 첫칸의 충) */
function getYeokmaBranch(dayBranch: string): string | undefined {
  const group = SAMHAP_GROUP_BY_BRANCH[dayBranch]
  if (!group) return undefined
  return CHUNG_PAIR[group[0]]
}
/** 일지 → 도화 (삼합 두번째의 충) */
function getDohwaBranch(dayBranch: string): string | undefined {
  const group = SAMHAP_GROUP_BY_BRANCH[dayBranch]
  if (!group) return undefined
  return CHUNG_PAIR[group[1]]
}
/** 일지 → 화개 (삼합 마지막) */
function getHwagaeBranch(dayBranch: string): string | undefined {
  const group = SAMHAP_GROUP_BY_BRANCH[dayBranch]
  if (!group) return undefined
  return group[2]
}

/** 일간 → 양인 */
const YANGIN_BY_STEM: Record<string, string> = {
  甲: '卯', 乙: '辰', 丙: '午', 丁: '未', 戊: '午',
  己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑',
}

/** 일간 → 건록 (임관 자리) */
const GEONROK_BY_STEM: Record<string, string> = {
  甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳',
  己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',
}

/** 일간 → 암록 (건록의 육합) */
const AMNOK_BY_STEM: Record<string, string> = {
  甲: '亥', 乙: '戌', 丙: '申', 丁: '未', 戊: '申',
  己: '未', 庚: '巳', 辛: '辰', 壬: '寅', 癸: '丑',
}

/** 일간 → 문창 */
const MUNCHANG_BY_STEM: Record<string, string> = {
  甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申',
  己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯',
}

/** 일간 → 학당귀인 */
const HAKDANG_BY_STEM: Record<string, string> = {
  甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅',
  己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯',
}

/** 월지 → 천덕귀인 (천간/지지 둘 다 가능) */
const CHEONDEOK_BY_MONTH: Record<string, string> = {
  寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲',
  申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚',
}

/** 월지 → 월덕귀인 (천간만) */
const WOLDEOK_BY_MONTH: Record<string, string> = {
  寅: '丙', 午: '丙', 戌: '丙',
  亥: '甲', 卯: '甲', 未: '甲',
  申: '壬', 子: '壬', 辰: '壬',
  巳: '庚', 酉: '庚', 丑: '庚',
}

/** 60갑자 → 공망 지지 2개 */
function getGongmang(dayStem: string, dayBranch: string): string[] {
  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  const stemIdx = stems.indexOf(dayStem)
  const branchIdx = branches.indexOf(dayBranch)
  if (stemIdx < 0 || branchIdx < 0) return []
  // 60갑자 인덱스: stem*6 + ((branch-stem) mod 12)/2 grouping. 단순히 같은 旬 안에서 빠진 2지지.
  // sequence: stem 0~9, branch 0~11. (branch - stem) mod 12 should be 0..11 with even.
  const offset = ((branchIdx - stemIdx) + 12) % 12
  // 같은 旬: 起 stem 0 → 6번 진행 (60甲子 / 10 = 6 旬, 旬마다 빠진 2지지)
  // 旬首 — stem 0 인 경우 branch 0(子)부터. So 旬首 branch index = ((stemIdx) sequence start)
  // 旬 = stemIdx pair direction
  // 간단한 방법: 旬 시작은 (10간이 6번 도는데 매 10간마다 旬 변경). 60甲子 sequencce:
  //   甲子(0,0) ~ 癸酉(9,9), 甲戌(0,10) ~ 癸未(9,7), 甲申(0,8) ~ 癸巳(9,5), 甲午(0,6) ~ 癸卯(9,3), 甲辰(0,4) ~ 癸丑(9,1), 甲寅(0,2) ~ 癸亥(9,11)
  // 旬首 branch 별 공망:
  //   甲子旬 → 戌 亥 (10,11)
  //   甲戌旬 → 申 酉 (8,9)
  //   甲申旬 → 午 未 (6,7)
  //   甲午旬 → 辰 巳 (4,5)
  //   甲辰旬 → 寅 卯 (2,3)
  //   甲寅旬 → 子 丑 (0,1)
  // 같은 旬 안에 있는지 = (branchIdx - stemIdx) % 12 의 짝수 offset (0,2,4,6,8,10) 그룹.
  // 旬首 branch index = (branchIdx - stemIdx + 12) % 12 정확히 0이면 甲子旬. offset == stemIdx*0?
  // 좀 더 단순한 방법: 60갑자 공망표 직접:
  const xunBranchPairs: Record<string, [string, string]> = {
    甲子: ['戌', '亥'], 甲戌: ['申', '酉'], 甲申: ['午', '未'],
    甲午: ['辰', '巳'], 甲辰: ['寅', '卯'], 甲寅: ['子', '丑'],
  }
  // find xun head: stem 甲 + branch (branchIdx - stemIdx + 12) % 12
  // actually xun head 은 dayStem이 甲에서 시작한 旬. so xunHeadBranchIdx = (branchIdx - stemIdx + 12) % 12
  const headBranchIdx = (branchIdx - stemIdx + 12) % 12
  const headBranch = branches[headBranchIdx]
  const key = `甲${headBranch}`
  return xunBranchPairs[key] || []
}

const GWIMUN_PAIRS: Record<string, string[]> = {
  // 귀문관 — 12쌍 (子-酉, 丑-午, 寅-未, 卯-申, 辰-亥, 巳-戌)
  子: ['酉'], 酉: ['子'], 丑: ['午'], 午: ['丑'], 寅: ['未'], 未: ['寅'],
  卯: ['申'], 申: ['卯'], 辰: ['亥'], 亥: ['辰'], 巳: ['戌'], 戌: ['巳'],
}

const WONJIN_PAIRS: Record<string, string> = {
  子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅',
  卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉',
}

export interface ShinsalHit {
  kind: ShinsalKind
  tone: ShinsalTone
  /** 매칭 기준 (일간/일지/월지) */
  basis: string
  /** 매칭된 위치 (cycle 지지 또는 천간) */
  on: 'stem' | 'branch'
}

export interface ShinsalActivationAnalysis {
  hits: ShinsalHit[]
  luckyCount: number
  unluckyCount: number
  neutralCount: number
  /** 한 줄 요약 */
  summary: string
}

interface NatalCore {
  dayStem: string
  dayBranch: string
  monthBranch: string
}

export function analyzeShinsalActivation(
  cycleStem: string,
  cycleBranch: string,
  natal: NatalCore,
): ShinsalActivationAnalysis {
  const hits: ShinsalHit[] = []
  const push = (kind: ShinsalKind, basis: string, on: 'stem' | 'branch') => {
    hits.push({ kind, tone: SHINSAL_TONE[kind], basis, on })
  }

  // ── 천을귀인: 일간 기준 지지 (지지에 옴)
  const cheoneul = CHEONEUL_GWIIN_MAP[natal.dayStem] || []
  if (cheoneul.includes(cycleBranch)) {
    push('천을귀인', `일간(${natal.dayStem})`, 'branch')
  }

  // ── 12신살 셋트: 역마/도화/화개 (일지 기준)
  if (getYeokmaBranch(natal.dayBranch) === cycleBranch) {
    push('역마', `일지(${natal.dayBranch})`, 'branch')
  }
  if (getDohwaBranch(natal.dayBranch) === cycleBranch) {
    push('도화', `일지(${natal.dayBranch})`, 'branch')
  }
  if (getHwagaeBranch(natal.dayBranch) === cycleBranch) {
    push('화개', `일지(${natal.dayBranch})`, 'branch')
  }

  // ── 양인 / 건록 / 암록 / 문창 / 학당귀인 (일간 기준)
  if (YANGIN_BY_STEM[natal.dayStem] === cycleBranch) {
    push('양인', `일간(${natal.dayStem})`, 'branch')
  }
  if (GEONROK_BY_STEM[natal.dayStem] === cycleBranch) {
    push('건록', `일간(${natal.dayStem})`, 'branch')
  }
  if (AMNOK_BY_STEM[natal.dayStem] === cycleBranch) {
    push('암록', `일간(${natal.dayStem})`, 'branch')
  }
  if (MUNCHANG_BY_STEM[natal.dayStem] === cycleBranch) {
    push('문창', `일간(${natal.dayStem})`, 'branch')
  }
  if (HAKDANG_BY_STEM[natal.dayStem] === cycleBranch) {
    push('학당귀인', `일간(${natal.dayStem})`, 'branch')
  }

  // ── 천덕귀인: 월지 기준, cycle 천간 OR 지지 둘 다 매칭
  const cheondeok = CHEONDEOK_BY_MONTH[natal.monthBranch]
  if (cheondeok) {
    if (cheondeok === cycleStem) push('천덕귀인', `월지(${natal.monthBranch})`, 'stem')
    if (cheondeok === cycleBranch) push('천덕귀인', `월지(${natal.monthBranch})`, 'branch')
  }
  // ── 월덕귀인: 월지 기준, 천간만
  const woldeok = WOLDEOK_BY_MONTH[natal.monthBranch]
  if (woldeok && woldeok === cycleStem) {
    push('월덕귀인', `월지(${natal.monthBranch})`, 'stem')
  }

  // ── 공망 (일주 기준, cycle 지지가 본명 旬에서 빠진 2지지에 해당)
  const gongmangList = getGongmang(natal.dayStem, natal.dayBranch)
  if (gongmangList.includes(cycleBranch)) {
    push('공망', `일주(${natal.dayStem}${natal.dayBranch})`, 'branch')
  }

  // ── 귀문관 (일지 기준)
  if ((GWIMUN_PAIRS[natal.dayBranch] || []).includes(cycleBranch)) {
    push('귀문관', `일지(${natal.dayBranch})`, 'branch')
  }
  // ── 원진 (일지 기준)
  if (WONJIN_PAIRS[natal.dayBranch] === cycleBranch) {
    push('원진', `일지(${natal.dayBranch})`, 'branch')
  }

  const luckyCount = hits.filter((h) => h.tone === 'lucky').length
  const unluckyCount = hits.filter((h) => h.tone === 'unlucky').length
  const neutralCount = hits.filter((h) => h.tone === 'neutral').length

  return {
    hits,
    luckyCount,
    unluckyCount,
    neutralCount,
    summary: buildSummary(hits, luckyCount, unluckyCount, neutralCount),
  }
}

function buildSummary(
  hits: ShinsalHit[],
  lucky: number,
  unlucky: number,
  neutral: number,
): string {
  if (hits.length === 0) return '활성 신살 없음'
  const labels = hits.map((h) => h.kind).join('·')
  const counts = `(길${lucky}/흉${unlucky}/중${neutral})`
  return `${labels} ${counts}`
}

import { computeDayBranch, computeDayStem } from './saju-shinsal'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../../types'
import type { PillarKind } from '@/lib/saju/types'
import { getRelationMeaning, type RelationCategory } from '@/lib/chart-dictionary'

/**
 * 형충회합 (刑沖會合) 추출기 — 현재 일주(日柱) vs 본명 4기둥.
 *
 * 매일 일진의 천간/지지가 본명 4기둥의 천간/지지와 어떤 관계를 맺는지 검사.
 * - 천간합/충
 * - 지지 육합/삼합/방합/충/형/파/해/원진
 *
 * 활성 윈도우: 해당 1일.
 */

// ─── 천간합 (5쌍) ───
const STEM_HAPS: Array<[string, string, string]> = [
  ['甲', '己', '토'], // 갑기합화토
  ['乙', '庚', '금'], // 을경합화금
  ['丙', '辛', '수'], // 병신합화수
  ['丁', '壬', '목'], // 정임합화목
  ['戊', '癸', '화'], // 무계합화화
]

// ─── 천간충 (4쌍) ───
const STEM_CHUNGS: Array<[string, string]> = [
  ['甲', '庚'],
  ['乙', '辛'],
  ['丙', '壬'],
  ['丁', '癸'],
]

// ─── 지지 육합 (6쌍) ───
const BRANCH_YUKHAP: Array<[string, string]> = [
  ['子', '丑'],
  ['寅', '亥'],
  ['卯', '戌'],
  ['辰', '酉'],
  ['巳', '申'],
  ['午', '未'],
]

// ─── 지지 삼합 (4그룹) — 펼쳐서 페어 ───
const BRANCH_SAMHAP_GROUPS = [
  ['申', '子', '辰'], // 수국
  ['亥', '卯', '未'], // 목국
  ['寅', '午', '戌'], // 화국
  ['巳', '酉', '丑'], // 금국
]

// ─── 지지충 (6쌍) ───
const BRANCH_CHUNG: Array<[string, string]> = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
]

// ─── 지지형 (간략) ───
const BRANCH_HYUNG: Array<[string, string]> = [
  ['寅', '巳'],
  ['巳', '申'],
  ['申', '寅'], // 寅巳申 삼형
  ['丑', '戌'],
  ['戌', '未'],
  ['未', '丑'], // 丑戌未 삼형
  ['子', '卯'], // 자묘 무례지형
  ['辰', '辰'],
  ['午', '午'],
  ['酉', '酉'],
  ['亥', '亥'], // 자형
]

// ─── 원진 ───
const BRANCH_WONJIN: Array<[string, string]> = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '酉'],
  ['卯', '申'],
  ['辰', '亥'],
  ['巳', '戌'],
]

// ─── 지지 방합 (4그룹 — 계절 결의 모임) — 펼쳐서 페어 ───
// 寅卯辰 봄(목), 巳午未 여름(화), 申酉戌 가을(금), 亥子丑 겨울(수)
const BRANCH_BANGHAP_GROUPS: Array<{ branches: string[]; season: string; element: string }> = [
  { branches: ['寅', '卯', '辰'], season: '봄', element: '목' },
  { branches: ['巳', '午', '未'], season: '여름', element: '화' },
  { branches: ['申', '酉', '戌'], season: '가을', element: '금' },
  { branches: ['亥', '子', '丑'], season: '겨울', element: '수' },
]

// ─── 지지 파 (破 — 6쌍, 작은 깨짐) ───
// 자유(子酉)·축진(丑辰)·인해(寅亥)·묘오(卯午)·진미(辰未)·사신(巳申)
// 주의: 전통 파는 자유/축진/인해/묘오/진미/사신 — 위의 user 작업서 표기는
// "자유·축술·인해·묘오·진미·사신"이지만, 정통 명리학에 일관되게 자유/축진/인해/묘오/진미/사신을 사용.
// (축술은 형刑의 일종이며 별도 처리됨 — BRANCH_HYUNG에서 이미 잡힘)
// 정통 六破: 子酉·卯午·辰丑·戌未·寅亥·巳申. (이전 辰未는 오기 — 辰은 丑과
// 파를 이루고, 未는 戌과 파를 이룬다.)
const BRANCH_PA: Array<[string, string]> = [
  ['子', '酉'],
  ['丑', '辰'],
  ['寅', '亥'],
  ['卯', '午'],
  ['戌', '未'],
  ['巳', '申'],
]

// ─── 지지 해 (害 — 6쌍, 미세한 어긋남·방해) ───
// 자미(子未)·축오(丑午)·인사(寅巳)·묘진(卯辰)·신해(申亥)·유술(酉戌)
const BRANCH_HAE: Array<[string, string]> = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
]

const PILLAR_NAMES: Record<PillarKind, string> = {
  year: '년주',
  month: '월주',
  day: '일주',
  time: '시주',
}

const sajuHyeongchungExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'hyeongchung',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const p = natal.saju.pillars
    const natalPillars: Array<{ kind: PillarKind; stem: string; branch: string }> = [
      { kind: 'year', stem: p.year.heavenlyStem.name, branch: p.year.earthlyBranch.name },
      { kind: 'month', stem: p.month.heavenlyStem.name, branch: p.month.earthlyBranch.name },
      { kind: 'day', stem: p.day.heavenlyStem.name, branch: p.day.earthlyBranch.name },
      { kind: 'time', stem: p.time.heavenlyStem.name, branch: p.time.earthlyBranch.name },
    ]

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const targetStem = computeDayStem(date)
      const targetBranch = computeDayBranch(date)
      if (!targetStem || !targetBranch) continue

      const dayIso = date.toISOString().slice(0, 10)
      const startIso = `${dayIso}T00:00:00.000Z`
      const endIso = `${dayIso}T23:59:59.999Z`
      const peakIso = `${dayIso}T12:00:00.000Z`

      for (const np of natalPillars) {
        // 천간합
        for (const [a, b, transformed] of STEM_HAPS) {
          if ((targetStem === a && np.stem === b) || (targetStem === b && np.stem === a)) {
            signals.push(
              makeSignal({
                dayIso,
                startIso,
                peakIso,
                endIso,
                kindLabel: '천간합',
                polarity: 2,
                weight: 0.65,
                name: `천간합 ${targetStem}-${np.stem} (화${transformed})`,
                detail: { targetStem, natalStem: np.stem, natalPillar: np.kind, transformed },
              })
            )
          }
        }
        // 천간충
        for (const [a, b] of STEM_CHUNGS) {
          if ((targetStem === a && np.stem === b) || (targetStem === b && np.stem === a)) {
            signals.push(
              makeSignal({
                dayIso,
                startIso,
                peakIso,
                endIso,
                kindLabel: '천간충',
                polarity: -2,
                weight: 0.7,
                name: `천간충 ${targetStem}↔${np.stem} (${PILLAR_NAMES[np.kind]})`,
                detail: { targetStem, natalStem: np.stem, natalPillar: np.kind },
              })
            )
          }
        }
        // 지지 육합
        for (const [a, b] of BRANCH_YUKHAP) {
          if ((targetBranch === a && np.branch === b) || (targetBranch === b && np.branch === a)) {
            signals.push(
              makeSignal({
                dayIso,
                startIso,
                peakIso,
                endIso,
                kindLabel: '육합',
                polarity: 2,
                weight: 0.65,
                name: `육합 ${targetBranch}-${np.branch} (${PILLAR_NAMES[np.kind]})`,
                detail: { targetBranch, natalBranch: np.branch, natalPillar: np.kind },
              })
            )
          }
        }
        // 지지 삼합 (target과 natal이 같은 삼합국에 속하면)
        for (const group of BRANCH_SAMHAP_GROUPS) {
          if (
            group.includes(targetBranch) &&
            group.includes(np.branch) &&
            targetBranch !== np.branch
          ) {
            signals.push(
              makeSignal({
                dayIso,
                startIso,
                peakIso,
                endIso,
                kindLabel: '삼합',
                polarity: 3,
                weight: 0.7,
                name: `삼합 ${targetBranch}-${np.branch} (${group.join('')})`,
                detail: {
                  targetBranch,
                  natalBranch: np.branch,
                  natalPillar: np.kind,
                  samhapGroup: group,
                },
              })
            )
          }
        }
        // 지지충
        for (const [a, b] of BRANCH_CHUNG) {
          if ((targetBranch === a && np.branch === b) || (targetBranch === b && np.branch === a)) {
            signals.push(
              makeSignal({
                dayIso,
                startIso,
                peakIso,
                endIso,
                kindLabel: '지지충',
                polarity: -3,
                weight: 0.85,
                name: `지지충 ${targetBranch}↔${np.branch} (${PILLAR_NAMES[np.kind]})`,
                detail: { targetBranch, natalBranch: np.branch, natalPillar: np.kind },
              })
            )
          }
        }
        // 지지형
        for (const [a, b] of BRANCH_HYUNG) {
          if ((targetBranch === a && np.branch === b) || (targetBranch === b && np.branch === a)) {
            signals.push(
              makeSignal({
                dayIso,
                startIso,
                peakIso,
                endIso,
                kindLabel: '지지형',
                polarity: -2,
                weight: 0.6,
                name: `지지형 ${targetBranch}-${np.branch} (${PILLAR_NAMES[np.kind]})`,
                detail: { targetBranch, natalBranch: np.branch, natalPillar: np.kind },
              })
            )
          }
        }
        // 원진
        for (const [a, b] of BRANCH_WONJIN) {
          if ((targetBranch === a && np.branch === b) || (targetBranch === b && np.branch === a)) {
            signals.push(
              makeSignal({
                dayIso,
                startIso,
                peakIso,
                endIso,
                kindLabel: '원진',
                polarity: -2,
                weight: 0.55,
                name: `원진 ${targetBranch}-${np.branch} (${PILLAR_NAMES[np.kind]})`,
                detail: { targetBranch, natalBranch: np.branch, natalPillar: np.kind },
              })
            )
          }
        }
        // 방합 (같은 계절 결의 모임) — target과 natal이 같은 방합국에 속하면
        for (const group of BRANCH_BANGHAP_GROUPS) {
          if (
            group.branches.includes(targetBranch) &&
            group.branches.includes(np.branch) &&
            targetBranch !== np.branch
          ) {
            signals.push(
              makeSignal({
                dayIso,
                startIso,
                peakIso,
                endIso,
                kindLabel: '방합',
                polarity: 1,
                weight: 0.55,
                name: `방합 ${targetBranch}-${np.branch} (${group.branches.join('')} ${group.season})`,
                detail: {
                  targetBranch,
                  natalBranch: np.branch,
                  natalPillar: np.kind,
                  banghapGroup: group.branches,
                  season: group.season,
                  element: group.element,
                },
              })
            )
          }
        }
        // 파 (작은 깨짐)
        for (const [a, b] of BRANCH_PA) {
          if ((targetBranch === a && np.branch === b) || (targetBranch === b && np.branch === a)) {
            signals.push(
              makeSignal({
                dayIso,
                startIso,
                peakIso,
                endIso,
                kindLabel: '파',
                polarity: -1,
                weight: 0.45,
                name: `파 ${targetBranch}-${np.branch} (${PILLAR_NAMES[np.kind]})`,
                detail: { targetBranch, natalBranch: np.branch, natalPillar: np.kind },
              })
            )
          }
        }
        // 해 (미세한 어긋남·방해)
        for (const [a, b] of BRANCH_HAE) {
          if ((targetBranch === a && np.branch === b) || (targetBranch === b && np.branch === a)) {
            signals.push(
              makeSignal({
                dayIso,
                startIso,
                peakIso,
                endIso,
                kindLabel: '해',
                polarity: -1,
                weight: 0.5,
                name: `해 ${targetBranch}-${np.branch} (${PILLAR_NAMES[np.kind]})`,
                detail: { targetBranch, natalBranch: np.branch, natalPillar: np.kind },
              })
            )
          }
        }
      }
    }

    return signals
  },
}

interface MakeSignalArgs {
  dayIso: string
  startIso: string
  peakIso: string
  endIso: string
  kindLabel: string
  polarity: Polarity
  weight: number
  name: string
  detail: Record<string, unknown>
}

// 삼형(三刑) 페어 → 트리오 키. 지지형 사전 키는 trio(寅巳申·丑戌未)라
// 일진-본명 2원소 페어로는 매치 안 됨 — 페어를 소속 트리오로 환원.
const HYUNG_TRIO_KEY: Record<string, string> = {
  寅巳: '寅巳申',
  巳寅: '寅巳申',
  巳申: '寅巳申',
  申巳: '寅巳申',
  寅申: '寅巳申',
  申寅: '寅巳申',
  丑戌: '丑戌未',
  戌丑: '丑戌未',
  戌未: '丑戌未',
  未戌: '丑戌未',
  丑未: '丑戌未',
  未丑: '丑戌未',
}

// 추출기 kindLabel → chart-dictionary 의 RelationCategory 매핑.
const REL_CATEGORY: Record<string, RelationCategory> = {
  천간합: '천간합',
  천간충: '천간충',
  육합: '지지육합',
  삼합: '지지삼합',
  방합: '지지방합',
  지지충: '지지충',
  지지형: '지지형',
  파: '지지파',
  해: '지지해',
  원진: '원진',
}

/**
 * 형충회합 신호에 chart-dictionary(relations-pairs) 의 정통 해석문을 붙인다.
 * 사전 키는 정규 순서(子午·寅申…)라 두 순서 모두 시도. 삼형(寅巳申) 트리오 키는
 * 2원소 일진-본명 페어와 안 맞을 수 있어 매칭 실패 시 undefined(라벨 폴백).
 */
function relationMeaning(
  kindLabel: string,
  a?: string,
  b?: string,
  groupKey?: string,
  lang: 'ko' | 'en' = 'ko'
): string | undefined {
  const cat = REL_CATEGORY[kindLabel]
  if (!cat) return undefined
  // 삼합·방합은 사전 키가 trio(亥卯未) — 페어가 아닌 그룹 키로 직접 조회.
  if (groupKey) {
    const entry = getRelationMeaning(cat, groupKey, lang)
    if (entry) return entry.meaning
  }
  if (!a || !b) return undefined
  for (const key of [`${a}${b}`, `${b}${a}`]) {
    const entry = getRelationMeaning(cat, key, lang)
    if (entry) return entry.meaning
  }
  return undefined
}

function makeSignal(args: MakeSignalArgs): ActiveSignal {
  const a = (args.detail.targetBranch ?? args.detail.targetStem) as string | undefined
  const b = (args.detail.natalBranch ?? args.detail.natalStem) as string | undefined
  // 삼합/방합 그룹 트리오 키 (있으면 사전 trio 조회에 사용).
  const samhap = args.detail.samhapGroup as string[] | undefined
  const banghap = args.detail.banghapGroup as string[] | undefined
  const groupKey =
    samhap?.join('') ??
    banghap?.join('') ??
    (args.kindLabel === '지지형' && a && b ? HYUNG_TRIO_KEY[`${a}${b}`] : undefined)
  const korean = relationMeaning(args.kindLabel, a, b, groupKey, 'ko')
  const english = relationMeaning(args.kindLabel, a, b, groupKey, 'en')
  return {
    id: `saju.hyeongchung.${args.kindLabel}.${args.dayIso}.${args.detail.natalPillar}.${args.detail.targetBranch ?? args.detail.targetStem}`,
    source: 'saju',
    kind: 'hyeongchung',
    name: args.name,
    ...(korean ? { korean } : {}),
    ...(english ? { english } : {}),
    polarity: args.polarity,
    layer: 'daily',
    active: { start: args.startIso, peak: args.peakIso, end: args.endIso },
    weight: args.weight,
    evidence: {
      module: 'saju-hyeongchung',
      detail: { ...args.detail, kindLabel: args.kindLabel },
    },
  }
}

export default sajuHyeongchungExtractor

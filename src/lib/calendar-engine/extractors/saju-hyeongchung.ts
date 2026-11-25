import { computeDayBranch, computeDayStem } from './saju-shinsal'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import type { PillarKind } from '@/lib/saju/types'
import { getRelationMeaning, type RelationCategory } from '@/lib/chart-dictionary'
import {
  STEM_COMBINE,
  STEM_CLASH,
  SIX_HARMONY,
  THREE_HARMONY,
  DIRECTIONAL_HARMONY,
  BRANCH_CLASH,
  RESENTMENT_PAIRS,
  BREAK_PAIRS,
  HARM_PAIRS,
  PUNISHMENT_TRIOS,
  type Pair,
} from '@/lib/saju/relationTables'
import { isHyeong } from '@/lib/saju/hyeong'

/**
 * 형충회합 (刑沖會合) 추출기 — 현재 일주(日柱) vs 본명 4기둥.
 *
 * 매일 일진의 천간/지지가 본명 4기둥의 천간/지지와 어떤 관계를 맺는지 검사.
 * - 천간합/충
 * - 지지 육합/삼합/방합/충/형/파/해/원진
 *
 * 활성 윈도우: 해당 1일.
 */

// 관계표는 전부 relationTables(SSOT)에서 파생한다 — 로컬 복제 금지. 예전 이 파일의
// 천간합·육합·삼합·충·원진·방합·파·해 복제본은 canon 과 같은 값이었지만(F2 에서 출력
// 동일성 확인) 한 곳만 고치면 갈라질 수 있었다. relationTables.consistency.test 가
// 144 지지쌍·100 천간쌍 출력으로 잠근다.

// ─── 천간합 (5쌍) — [a, b, 합화 오행] ───
const STEM_HAPS: ReadonlyArray<readonly [string, string, string]> = STEM_COMBINE.map(
  ({ pair: [a, b], element }) => [a, b, element] as const
)

// ─── 천간충 — 엔진 공통 모드(STEM_CLASH, 4쌍) ───
// 본명 relations·운·궁합과 같은 쌍만 충으로 본다(SD-11).
const STEM_CHUNGS: ReadonlyArray<Pair> = STEM_CLASH

// ─── 지지 육합 (6쌍) ───
const BRANCH_YUKHAP: ReadonlyArray<Pair> = SIX_HARMONY.map((h) => h.pair)

// ─── 지지 삼합 (4그룹: 申子辰 수 · 亥卯未 목 · 寅午戌 화 · 巳酉丑 금) ───
const BRANCH_SAMHAP_GROUPS: ReadonlyArray<string[]> = THREE_HARMONY.map((t) => [...t.members])

// ─── 지지충 (6쌍) ───
const BRANCH_CHUNG: ReadonlyArray<Pair> = BRANCH_CLASH

// ─── 지지형 — hyeong.isHyeong 단일 교리(SD-07) ───
// 寅巳·巳申·丑戌·戌未(삼형), 子卯(상형), 辰午酉亥 자형. 삼형 세트 안의 寅申·丑未 는
// 충이지 형이 아니다 — 옛 로컬 표는 이 둘을 형으로 잡아 본명·상담사와 어긋났다.

// ─── 원진 (6쌍: 子未 丑午 寅酉 卯申 辰亥 巳戌) ───
const BRANCH_WONJIN: ReadonlyArray<Pair> = RESENTMENT_PAIRS

// ─── 지지 방합 (4그룹 — 계절 결의 모임) ───
// 寅卯辰 봄(목), 巳午未 여름(화), 申酉戌 가을(금), 亥子丑 겨울(수). 계절 이름만 표시용 라벨.
const SEASON_BY_DIRECTION: Record<(typeof DIRECTIONAL_HARMONY)[number]['direction'], string> = {
  동방: '봄',
  남방: '여름',
  서방: '가을',
  북방: '겨울',
}
const BRANCH_BANGHAP_GROUPS: ReadonlyArray<{
  branches: string[]
  season: string
  element: string
}> = DIRECTIONAL_HARMONY.map((d) => ({
  branches: [...d.members],
  season: SEASON_BY_DIRECTION[d.direction],
  element: d.element,
}))

// ─── 지지 파 (破 — 정통 六破: 子酉 丑辰 寅亥 卯午 巳申 未戌, 작은 깨짐) ───
const BRANCH_PA: ReadonlyArray<Pair> = BREAK_PAIRS

// ─── 지지 해 (害 — 子未 丑午 寅巳 卯辰 申亥 酉戌, 미세한 어긋남·방해) ───
const BRANCH_HAE: ReadonlyArray<Pair> = HARM_PAIRS

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
    ]
    // 출생시각 미상이면 시주가 없다(삼주, CONVENTIONS §5) — 시주와의 형충회합은 만들지 않는다.
    if (p.time) {
      natalPillars.push({
        kind: 'time',
        stem: p.time.heavenlyStem.name,
        branch: p.time.earthlyBranch.name,
      })
    }

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
        if (isHyeong(targetBranch, np.branch)) {
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
// 일진-본명 2원소 페어로는 매치 안 됨 — 페어를 소속 트리오로 환원. canon(PUNISHMENT_TRIOS
// × isHyeong)에서 파생: 寅申·丑未 는 형이 아니라 지지형 신호가 나지 않으므로 키가 없다.
const HYUNG_TRIO_KEY: Record<string, string> = Object.fromEntries(
  PUNISHMENT_TRIOS.flatMap((trio) =>
    trio.flatMap((x) =>
      trio.filter((y) => y !== x && isHyeong(x, y)).map((y) => [`${x}${y}`, trio.join('')])
    )
  )
)

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

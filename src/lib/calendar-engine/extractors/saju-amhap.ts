import { computeDayBranch } from './saju-shinsal'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import type { PillarKind } from '@/lib/saju/types'

/**
 * 암합 (暗合) 추출기 — 지지 안에 숨어 있는 천간끼리의 합.
 *
 * 지장간(地藏干): 각 지지에는 천간이 숨어 있고, 두 지지의 숨은 천간이
 * 천간합을 이루면 "암합" 이라 부른다. 겉으로 드러나지 않은 인연·이끌림의
 * 신호로 해석된다 (전통 명리).
 *
 * 표준 4쌍 (본기 정기 위주, 보수적 채택):
 *  - 子(癸) - 巳(戊)  → 戊癸합화
 *  - 寅(甲) - 午(己)  → 甲己합토 (甲 본기·己 중기)
 *  - 卯(乙) - 申(庚)  → 乙庚합금
 *  - 午(丁) - 亥(壬)  → 丁壬합목
 *
 * 활성 윈도우: 해당 1일. polarity +1 (약한 인연 신호), weight ~0.5.
 */

interface AmhapPair {
  branchA: string
  branchB: string
  stemA: string
  stemB: string
  /** 합화 오행 (참고용) */
  transformed: string
}

// 표준 암합 4쌍 (지지 본기/정기 천간합 위주, 보수적 채택)
const AMHAP_PAIRS: AmhapPair[] = [
  { branchA: '子', branchB: '巳', stemA: '癸', stemB: '戊', transformed: '화' },
  { branchA: '寅', branchB: '午', stemA: '甲', stemB: '己', transformed: '토' },
  { branchA: '卯', branchB: '申', stemA: '乙', stemB: '庚', transformed: '금' },
  { branchA: '午', branchB: '亥', stemA: '丁', stemB: '壬', transformed: '목' },
]

const PILLAR_NAMES: Record<PillarKind, string> = {
  year: '년주', month: '월주', day: '일주', time: '시주',
}

const sajuAmhapExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'amhap',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const p = natal.saju.pillars
    const natalPillars: Array<{ kind: PillarKind; branch: string }> = [
      { kind: 'year',  branch: p.year.earthlyBranch.name },
      { kind: 'month', branch: p.month.earthlyBranch.name },
      { kind: 'day',   branch: p.day.earthlyBranch.name },
      { kind: 'time',  branch: p.time.earthlyBranch.name },
    ]

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const targetBranch = computeDayBranch(date)
      if (!targetBranch) continue

      const dayIso = date.toISOString().slice(0, 10)
      const startIso = `${dayIso}T00:00:00.000Z`
      const endIso = `${dayIso}T23:59:59.999Z`
      const peakIso = `${dayIso}T12:00:00.000Z`

      for (const np of natalPillars) {
        for (const pair of AMHAP_PAIRS) {
          const hit =
            (targetBranch === pair.branchA && np.branch === pair.branchB) ||
            (targetBranch === pair.branchB && np.branch === pair.branchA)
          if (!hit) continue

          signals.push(makeSignal({
            dayIso, startIso, peakIso, endIso,
            polarity: 1, weight: 0.5,
            name: `암합 ${targetBranch}-${np.branch} (${pair.stemA}${pair.stemB}합화${pair.transformed} · ${PILLAR_NAMES[np.kind]})`,
            detail: {
              targetBranch,
              natalBranch: np.branch,
              natalPillar: np.kind,
              hiddenStems: [pair.stemA, pair.stemB],
              transformed: pair.transformed,
            },
          }))
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
  polarity: Polarity
  weight: number
  name: string
  detail: Record<string, unknown>
}

function makeSignal(args: MakeSignalArgs): ActiveSignal {
  return {
    id: `saju.amhap.${args.dayIso}.${args.detail.natalPillar}.${args.detail.targetBranch}-${args.detail.natalBranch}`,
    source: 'saju',
    kind: 'amhap',
    name: args.name,
    themes: [],   // tagger가 featureMap을 보고 부여
    polarity: args.polarity,
    layer: 'daily',
    active: { start: args.startIso, peak: args.peakIso, end: args.endIso },
    weight: args.weight,
    evidence: {
      module: 'saju-amhap',
      detail: { ...args.detail, kindLabel: '암합' },
    },
  }
}

export default sajuAmhapExtractor

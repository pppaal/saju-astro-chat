import { STEMS, BRANCHES, JIJANGGAN, getSolarTermKST } from '@/lib/saju/constants'
import { getYearPillarForDate, getMonthPillarForDate } from '@/lib/saju/datePillars'
import { computeDayBranch, computeDayStem } from './saju-shinsal'
import { getSibsinFromStemInfo as getSibsin } from './shared/sibsin'
import type {
  ActiveSignal,
  ExtractorContext,
  SignalExtractor,
  SignalLayer,
  Polarity,
} from '../types'
import type { FiveElement, SibsinKind, YinYang } from '@/lib/saju/types'

/**
 * 지장간(地藏干) 3층 활성 추출기.
 *
 * 정통 자평명리(子平命理)의 가장 큰 손실 지점이 시기(時期) 지지의 지장간이었다.
 * 한 지지 안에 여기(餘氣)·중기(中氣)·정기(正氣) 세 천간이 잠겨 있어, 그 시기에
 * 본명 일간이 어느 층의 지장간과 만나는지에 따라 통근(通根) 강약·암합(暗合)·암충이
 * 달라진다. 기존 추출기들은 시기 지지의 본기(정기) 오행만 한 신호로 잡고 끝나
 * 중기·여기와 본명 일지(日支) 지장간 간의 미세한 상호작용을 통째로 놓쳤다.
 *
 * 본 추출기는 시기 지지(대운 지지 / 세운 지지 / 월운 지지 / 일진 지지)의
 * 지장간 3층 각각에 대해 다음 3종 신호를 emit:
 *
 *  1) 통근 강화 (jijanggan-tonggeun) : 시기 지장간이 본명 일간과 같은 오행
 *  2) 암합 활성 (jijanggan-amhap)     : 시기 지장간과 본명 천간 사이 천간합 페어
 *  3) 지장간 충 (jijanggan-chung)     : 시기 지장간과 본명 일지 지장간 사이 천간충 오행
 *
 * 층 별 weight (자평명리 표준 — 본기 > 중기 > 여기):
 *   정기(본기) 0.70  ·  중기 0.50  ·  여기(초기) 0.35
 *
 * layer 매핑:
 *   대운 지지 → 'decadal' (대운 후반 5년)
 *   세운 지지 → 'yearly'
 *   월운 지지 → 'monthly'
 *   일진 지지 → 'daily'
 *
 * polarity 결정:
 *   통근 : 본명 강약 따라 — 신약자에 +2, 신강자에 -1 (과강 우려)
 *   암합 : 본명 천간과 합화 — 보통 +1, 합화 오행이 용신과 같으면 +2
 *   충   : -2 (강도 평탄, 본기충은 -3)
 *
 * 이 신호들은 십신(pillar-sibsin)과 별개의 결로 작동 — pillar-sibsin 은 시기
 * 천간 1개의 십신 1개만 보지만, 이쪽은 지지 1개의 지장간 3개와 본명 천간 4개·
 * 본명 일지 지장간 3개를 모두 교차해 본명-시기 매트릭스를 채운다.
 */

const JIJANGGAN_LAYER_WEIGHT: Record<string, number> = {
  정기: 0.70,
  중기: 0.50,
  여기: 0.35,
}

const JIJANGGAN_LABEL: Record<string, string> = {
  정기: '본기',
  중기: '중기',
  여기: '여기',
}

// 천간합 페어 — 본명 천간과 시기 지장간이 만나면 암합(暗合) 활성.
// 합화 오행은 polarity 조정에 사용 (합화가 용신이면 길).
const STEM_COMBINE: Record<string, { pair: string; transform: FiveElement }> = {
  甲: { pair: '己', transform: '토' },
  己: { pair: '甲', transform: '토' },
  乙: { pair: '庚', transform: '금' },
  庚: { pair: '乙', transform: '금' },
  丙: { pair: '辛', transform: '수' },
  辛: { pair: '丙', transform: '수' },
  丁: { pair: '壬', transform: '목' },
  壬: { pair: '丁', transform: '목' },
  戊: { pair: '癸', transform: '화' },
  癸: { pair: '戊', transform: '화' },
}

// 천간충 — 본기끼리 상충하면 지장간 충.
const STEM_CLASH: Set<string> = new Set([
  '甲-庚', '庚-甲', '乙-辛', '辛-乙',
  '丙-壬', '壬-丙', '丁-癸', '癸-丁',
])

interface StemInfoLite {
  name: string
  element: FiveElement
  yin_yang: YinYang
}

const sajuJijangganExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'jijanggan',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const dayPillar = natal.saju.pillars.day
    const dayMasterName = dayPillar.heavenlyStem?.name
    const dayMaster = STEMS.find((s) => s.name === dayMasterName) as StemInfoLite | undefined
    if (!dayMaster) return []

    const dayElement = dayMaster.element
    const strength = natal.saju.strength
    const yongsin = natal.saju.yongsin

    // 본명 천간 — 암합 페어 검출용.
    const natalStems = collectNatalStems(natal)
    // 본명 일지(日支)의 지장간 — 충 검출용 (정통은 일지 지장간이 충 기준).
    const natalDayBranchJijanggan = JIJANGGAN[dayPillar.earthlyBranch?.name ?? ''] ?? {}

    const signals: ActiveSignal[] = []

    // 입춘 helper — 세운 경계.
    const ipchun = (y: number): Date => getSolarTermKST(y, 2) ?? new Date(Date.UTC(y, 1, 4))
    const bMonth = natal.input.month - 1
    const bDate = natal.input.date
    const rangeStart = new Date(range.start)
    const rangeEnd = new Date(range.end)

    // ─── 1) 대운 지지 — 후반 5년 ───
    for (const d of natal.saju.daeun) {
      const branch = d.branch
      const jijanggan = JIJANGGAN[branch]
      if (!jijanggan) continue

      const midPoint = Date.UTC(d.startYear + 5, bMonth, bDate)
      const endPoint = Date.UTC(d.startYear + 10, bMonth, bDate) - 1
      if (new Date(endPoint) < rangeStart || new Date(midPoint) > rangeEnd) continue

      const active = {
        start: new Date(midPoint).toISOString(),
        peak: new Date(Date.UTC(d.startYear + 7, bMonth, Math.max(1, bDate))).toISOString(),
        end: new Date(endPoint).toISOString(),
      }
      emitJijangganSignals(signals, {
        idPrefix: `saju.jijanggan.daeun.${d.startYear}.${branch}`,
        layer: 'decadal',
        branchName: branch,
        jijanggan,
        dayMaster,
        dayElement,
        strength,
        yongsin,
        natalStems,
        natalDayBranchJijanggan,
        active,
        baseWeight: 1.0,
      })
    }

    // ─── 2) 세운 지지 (yearly) ───
    const startYear = rangeStart.getUTCFullYear()
    const endYear = rangeEnd.getUTCFullYear()
    for (let year = startYear - 1; year <= endYear; year++) {
      const yStartDate = ipchun(year)
      const yEndDate = new Date(ipchun(year + 1).getTime() - 1)
      if (yEndDate < rangeStart || yStartDate > rangeEnd) continue
      const refDate = new Date(yStartDate.getTime() + 86_400_000)
      const yp = getYearPillarForDate(refDate)
      const jijanggan = JIJANGGAN[yp.branch]
      if (!jijanggan) continue

      const active = {
        start: yStartDate.toISOString(),
        peak: new Date((yStartDate.getTime() + yEndDate.getTime()) / 2).toISOString(),
        end: yEndDate.toISOString(),
      }
      emitJijangganSignals(signals, {
        idPrefix: `saju.jijanggan.seun.${year}.${yp.branch}`,
        layer: 'yearly',
        branchName: yp.branch,
        jijanggan,
        dayMaster,
        dayElement,
        strength,
        yongsin,
        natalStems,
        natalDayBranchJijanggan,
        active,
        baseWeight: 0.85,
      })
    }

    // ─── 3) 월운 지지 (monthly) ───
    const monthCursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1))
    while (monthCursor <= rangeEnd) {
      const mp = getMonthPillarForDate(monthCursor)
      const jijanggan = JIJANGGAN[mp.branch]
      if (jijanggan) {
        const mStart = new Date(monthCursor).toISOString()
        const mEnd = new Date(
          Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() + 1, 0, 23, 59, 59)
        ).toISOString()
        const mPeak = new Date(
          Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth(), 15)
        ).toISOString()
        emitJijangganSignals(signals, {
          idPrefix: `saju.jijanggan.wolun.${monthCursor.getUTCFullYear()}-${monthCursor.getUTCMonth() + 1}.${mp.branch}`,
          layer: 'monthly',
          branchName: mp.branch,
          jijanggan,
          dayMaster,
          dayElement,
          strength,
          yongsin,
          natalStems,
          natalDayBranchJijanggan,
          active: { start: mStart, peak: mPeak, end: mEnd },
          baseWeight: 0.70,
        })
      }
      monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1)
    }

    // ─── 4) 일진 지지 (daily) — 비용 큼, range 가 day 단위일 때만 ───
    for (let t = rangeStart.getTime(); t <= rangeEnd.getTime(); t += 86_400_000) {
      const d = new Date(t)
      const branchName = computeDayBranch(d)
      if (!branchName) continue
      const jijanggan = JIJANGGAN[branchName]
      if (!jijanggan) continue
      const dayIso = d.toISOString().slice(0, 10)
      emitJijangganSignals(signals, {
        idPrefix: `saju.jijanggan.iljin.${dayIso}.${branchName}`,
        layer: 'daily',
        branchName,
        jijanggan,
        dayMaster,
        dayElement,
        strength,
        yongsin,
        natalStems,
        natalDayBranchJijanggan,
        active: {
          start: `${dayIso}T00:00:00.000Z`,
          peak: `${dayIso}T12:00:00.000Z`,
          end: `${dayIso}T23:59:59.999Z`,
        },
        baseWeight: 0.55,
      })
    }

    return signals
  },
}

interface EmitArgs {
  idPrefix: string
  layer: SignalLayer
  branchName: string
  jijanggan: { [key: string]: string }
  dayMaster: StemInfoLite
  dayElement: FiveElement
  strength: 'strong' | 'medium' | 'weak'
  yongsin: { primary: FiveElement; secondary?: FiveElement; avoid: FiveElement[] }
  natalStems: Array<{ pos: string; name: string; info: StemInfoLite }>
  natalDayBranchJijanggan: { [key: string]: string }
  active: { start: string; peak: string; end: string }
  baseWeight: number
}

function emitJijangganSignals(out: ActiveSignal[], args: EmitArgs): void {
  for (const [layer, stemName] of Object.entries(args.jijanggan)) {
    // layer = '정기' | '중기' | '여기' / stemName = 천간 한 글자.
    const stemInfo = STEMS.find((s) => s.name === stemName) as StemInfoLite | undefined
    if (!stemInfo) continue
    const layerWeight = JIJANGGAN_LAYER_WEIGHT[layer] ?? 0.35
    const layerLabel = JIJANGGAN_LABEL[layer] ?? layer

    // ── 1) 통근 강화 — 시기 지장간 오행 = 본명 일간 오행 ──
    if (stemInfo.element === args.dayElement) {
      const sibsin: SibsinKind | null = getSibsin(args.dayMaster, stemInfo)
      const polarity: Polarity = polarityForTonggeun(layer, args.strength)
      out.push({
        id: `${args.idPrefix}.tonggeun.${layer}.${stemName}`,
        source: 'saju',
        kind: 'jijanggan',
        name: `${args.branchName} 지장간 ${layerLabel}(${stemName}) 통근`,
        themes: [],
        polarity,
        layer: args.layer,
        active: args.active,
        weight: args.baseWeight * layerWeight,
        evidence: {
          module: 'saju-jijanggan',
          element: stemInfo.element,
          sibsin: sibsin ?? undefined,
          pillars: [args.branchName],
          detail: {
            mode: 'tonggeun',
            jijangganLayer: layer,
            jijangganStem: stemName,
            natalDayMaster: args.dayMaster.name,
            natalStrength: args.strength,
            branch: args.branchName,
          },
        },
      })
    }

    // ── 2) 암합 활성 — 시기 지장간 ↔ 본명 천간 합 ──
    const combineDef = STEM_COMBINE[stemName]
    if (combineDef) {
      for (const ns of args.natalStems) {
        if (ns.name === combineDef.pair) {
          const polarity: Polarity = polarityForAmhap(combineDef.transform, args.yongsin)
          out.push({
            id: `${args.idPrefix}.amhap.${layer}.${stemName}-${ns.name}`,
            source: 'saju',
            kind: 'jijanggan',
            name: `${args.branchName} 지장간 ${layerLabel}(${stemName}) ↔ 본명 ${ns.pos} ${ns.name} 암합`,
            themes: [],
            polarity,
            layer: args.layer,
            active: args.active,
            weight: args.baseWeight * layerWeight * 0.9,
            evidence: {
              module: 'saju-jijanggan',
              element: combineDef.transform,
              pillars: [args.branchName, ns.pos],
              detail: {
                mode: 'amhap',
                jijangganLayer: layer,
                jijangganStem: stemName,
                natalStem: ns.name,
                natalStemPos: ns.pos,
                transform: combineDef.transform,
                branch: args.branchName,
              },
            },
          })
        }
      }
    }

    // ── 3) 지장간 충 — 시기 지장간 ↔ 본명 일지 지장간 ──
    for (const [natalLayer, natalStem] of Object.entries(args.natalDayBranchJijanggan)) {
      if (STEM_CLASH.has(`${stemName}-${natalStem}`)) {
        const isBothJeonggi = layer === '정기' && natalLayer === '정기'
        const polarity: Polarity = isBothJeonggi ? -3 : -2
        out.push({
          id: `${args.idPrefix}.chung.${layer}.${stemName}-${natalLayer}.${natalStem}`,
          source: 'saju',
          kind: 'jijanggan',
          name: `${args.branchName} 지장간 ${layerLabel}(${stemName}) ↔ 본명 일지 ${JIJANGGAN_LABEL[natalLayer] ?? natalLayer}(${natalStem}) 충`,
          themes: [],
          polarity,
          layer: args.layer,
          active: args.active,
          weight: args.baseWeight * layerWeight * (isBothJeonggi ? 1.0 : 0.8),
          evidence: {
            module: 'saju-jijanggan',
            element: stemInfo.element,
            pillars: [args.branchName, 'day'],
            detail: {
              mode: 'chung',
              jijangganLayer: layer,
              jijangganStem: stemName,
              natalDayLayer: natalLayer,
              natalDayStem: natalStem,
              branch: args.branchName,
            },
          },
        })
      }
    }
  }
}

function polarityForTonggeun(
  jijangganLayer: string,
  strength: 'strong' | 'medium' | 'weak'
): Polarity {
  // 본기 통근은 강력, 중기·여기는 약함.
  if (jijangganLayer === '정기') {
    return strength === 'weak' ? 3 : strength === 'medium' ? 1 : -1
  }
  if (jijangganLayer === '중기') {
    return strength === 'weak' ? 2 : strength === 'medium' ? 1 : 0
  }
  // 여기
  return strength === 'weak' ? 1 : 0
}

function polarityForAmhap(
  transform: FiveElement,
  yongsin: { primary: FiveElement; secondary?: FiveElement; avoid: FiveElement[] }
): Polarity {
  // 합화 오행이 용신이면 길, 기신·구신이면 흉.
  if (transform === yongsin.primary) return 2
  if (transform === yongsin.secondary) return 1
  if (yongsin.avoid.includes(transform)) return -1
  return 1 // 합 자체는 약한 길
}

/**
 * 본명 4기둥의 천간 4개 + 일주·시주 등 위치 정보를 수집.
 * 암합 페어 매칭에 사용 — 어느 위치의 천간이 시기 지장간과 합되는지 추적.
 */
function collectNatalStems(
  natal: { saju: { pillars: { year: { heavenlyStem?: { name: string } }; month: { heavenlyStem?: { name: string } }; day: { heavenlyStem?: { name: string } }; time: { heavenlyStem?: { name: string } } } } }
): Array<{ pos: string; name: string; info: StemInfoLite }> {
  const out: Array<{ pos: string; name: string; info: StemInfoLite }> = []
  const positions: Array<{ pos: string; stem?: string }> = [
    { pos: 'year', stem: natal.saju.pillars.year.heavenlyStem?.name },
    { pos: 'month', stem: natal.saju.pillars.month.heavenlyStem?.name },
    { pos: 'day', stem: natal.saju.pillars.day.heavenlyStem?.name },
    { pos: 'time', stem: natal.saju.pillars.time.heavenlyStem?.name },
  ]
  for (const p of positions) {
    if (!p.stem) continue
    const info = STEMS.find((s) => s.name === p.stem) as StemInfoLite | undefined
    if (!info) continue
    out.push({ pos: p.pos, name: p.stem, info })
  }
  return out
}

// BRANCHES 단순 참조 (현재 미사용 — 추후 확장용).
void BRANCHES

export default sajuJijangganExtractor

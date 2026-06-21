import { STEMS, BRANCHES, JIJANGGAN, getSolarTermKST } from '@/lib/saju/constants'
import { getYearPillarForDate, getMonthPillarForDate } from '@/lib/saju/datePillars'
import { computeDayBranch, computeDayStem } from './saju-shinsal'
import { getSibsinFromStemInfo as getSibsin } from './shared/sibsin'
import { iga, eulReul, waGwa } from '@/lib/i18n/koParticle'
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
 *   암합 : 합화 오행 vs 용신 체계 4-way 비교
 *           용신=+2, 희신=+1, 한신=0, 합반=-1, 합거(1차 기신)=-2
 *   충   : 층 조합별 3-tier ladder — 정기↔정기 -3, 정기↔중기 -2, 그 외 -1
 *
 * 이 신호들은 십신(pillar-sibsin)과 별개의 결로 작동 — pillar-sibsin 은 시기
 * 천간 1개의 십신 1개만 보지만, 이쪽은 지지 1개의 지장간 3개와 본명 천간 4개·
 * 본명 일지 지장간 3개를 모두 교차해 본명-시기 매트릭스를 채운다.
 */

const JIJANGGAN_LAYER_WEIGHT: Record<string, number> = {
  정기: 0.7,
  중기: 0.5,
  여기: 0.35,
}

const JIJANGGAN_LABEL: Record<string, string> = {
  정기: '본기',
  중기: '중기',
  여기: '여기',
}

// 본명 기둥 위치 영문 키 → 한글(사용자 노출 라벨 일관).
const POS_KO: Record<string, string> = {
  year: '년주',
  month: '월주',
  day: '일주',
  time: '시주',
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

// 천간충 — 본명·시기 지장간 사이 천간충 페어.
// 4쌍의 천간충(甲庚/乙辛/丙壬/丁癸)으로 지지충 6쌍(子↔午, 寅↔申, 巳↔亥) 본기
// 페어가 모두 동일 구조로 환원된다:
//   子 본기 癸 ↔ 午 본기 丁 = 癸-丁
//   寅 본기 甲 ↔ 申 본기 庚 = 甲-庚
//   巳 본기 丙 ↔ 亥 본기 壬 = 丙-壬
// 丑-未, 辰-戌 본기는 동일 戊·己 (충 아님). 따라서 별도 지지충 테이블을 두지
// 않고 본명 일지·시기 지지의 지장간 3층 매트릭스만 돌리면 정통 지지충 본기
// 페어가 모두 자동 검출된다.
const STEM_CLASH: Set<string> = new Set([
  '甲-庚',
  '庚-甲',
  '乙-辛',
  '辛-乙',
  '丙-壬',
  '壬-丙',
  '丁-癸',
  '癸-丁',
])

interface StemInfoLite {
  name: string
  element: FiveElement
  yin_yang: YinYang
}

// ── 지장간 신호 흐름(flow) 한 줄 ── 기술적 name(통근/암합/충)을 사용자 voice 로.
const ELEMENT_EN: Record<FiveElement, string> = {
  목: 'Wood',
  화: 'Fire',
  토: 'Earth',
  금: 'Metal',
  수: 'Water',
}
// 지장간 층 EN — raw 키(정기/중기/여기) 기준.
const LAYER_LABEL_EN: Record<string, string> = {
  정기: 'primary qi',
  중기: 'middle qi',
  여기: 'residual qi',
}
const POS_EN: Record<string, string> = {
  year: 'year pillar',
  month: 'month pillar',
  day: 'day pillar',
  time: 'hour pillar',
}

function tonggeunFlowLine(branchName: string, layerLabel: string, positive: boolean): string {
  const j = iga(layerLabel)
  return positive
    ? `${branchName}의 지장간 ${layerLabel}${j} 본명 일간의 뿌리를 단단히 받쳐주는 흐름이에요`
    : `${branchName}의 지장간 ${layerLabel}${j} 이미 강한 기운에 더해져 과해지기 쉬운 흐름이에요`
}
function tonggeunFlowLineEn(branchName: string, layerEn: string, positive: boolean): string {
  return positive
    ? `the ${layerEn} hidden in ${branchName} firmly roots your day master — a strengthening flow`
    : `the ${layerEn} hidden in ${branchName} piles onto an already-strong force — easy to overdo`
}

function amhapFlowLine(
  branchName: string,
  posKo: string,
  transform: FiveElement,
  polarity: Polarity
): string {
  if (polarity > 0)
    return `${branchName}의 숨은 지장간이 본명 ${posKo}${waGwa(posKo)} 몰래 어울려(암합) ${transform} 기운을 도움으로 끌어오는 흐름이에요`
  if (polarity < 0)
    return `${branchName}의 숨은 지장간이 본명 ${posKo}${eulReul(posKo)} 묶어(암합) ${transform} 기운이 발목을 잡는 흐름이에요`
  return `${branchName}의 숨은 지장간이 본명 ${posKo}${waGwa(posKo)} 약하게 얽히는(암합) 흐름이에요`
}
function amhapFlowLineEn(
  branchName: string,
  posEn: string,
  transform: FiveElement,
  polarity: Polarity
): string {
  const el = ELEMENT_EN[transform]
  if (polarity > 0)
    return `the hidden stem in ${branchName} secretly combines with your natal ${posEn} — drawing ${el} energy in as support`
  if (polarity < 0)
    return `the hidden stem in ${branchName} binds your natal ${posEn} — ${el} energy holds you back`
  return `the hidden stem in ${branchName} lightly entangles your natal ${posEn} (hidden combine)`
}

function chungFlowLine(branchName: string, layerLabel: string, strong: boolean): string {
  const j = iga(layerLabel)
  return strong
    ? `${branchName}의 지장간 ${layerLabel}${j} 본명 일지와 정면으로 부딪쳐(충) 뿌리가 크게 흔들리는 흐름이에요`
    : `${branchName}의 지장간 ${layerLabel}${j} 본명 일지와 부딪쳐(충) 뿌리가 흔들리는 흐름이에요`
}
function chungFlowLineEn(branchName: string, layerEn: string, strong: boolean): string {
  return strong
    ? `the ${layerEn} in ${branchName} clashes head-on with your natal day branch — roots shaken hard`
    : `the ${layerEn} in ${branchName} clashes with your natal day branch — roots wobble`
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
    // 합화(化氣) 게이트 입력 — 월령 지지 오행 / 본명 천간 집합 (파합자 검출용).
    const monthBranchName = natal.saju.pillars.month?.earthlyBranch?.name ?? ''
    const monthBranchInfo = BRANCHES.find((b) => b.name === monthBranchName)
    const monthElement: FiveElement | undefined = monthBranchInfo?.element
    const natalStemNames = natalStems.map((s) => s.name)

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
        natalStemNames,
        natalDayBranchJijanggan,
        monthElement,
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
        natalStemNames,
        natalDayBranchJijanggan,
        monthElement,
        active,
        baseWeight: 0.85,
      })
    }

    // ─── 3) 월운 지지 (monthly) ───
    const monthCursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1))
    while (monthCursor <= rangeEnd) {
      // 월주는 그 달 중순(15일) 기준 — 1일은 절입 직전이라 전월 절기달이 잡힌다.
      const midMonth = new Date(
        Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth(), 15)
      )
      const mp = getMonthPillarForDate(midMonth)
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
          natalStemNames,
          natalDayBranchJijanggan,
          monthElement,
          active: { start: mStart, peak: mPeak, end: mEnd },
          baseWeight: 0.7,
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
        natalStemNames,
        natalDayBranchJijanggan,
        monthElement,
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
  natalStemNames: string[]
  natalDayBranchJijanggan: { [key: string]: string }
  monthElement?: FiveElement
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
        korean: tonggeunFlowLine(args.branchName, layerLabel, polarity > 0),
        english: tonggeunFlowLineEn(args.branchName, LAYER_LABEL_EN[layer] ?? layer, polarity > 0),
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
    // 정통(자평진전·적천수): 합화(化氣) 성립 게이트 적용.
    //   1) 월령 지지 오행이 합화 오행과 같으면 'full' — polarity 그대로
    //   2) 월령 지지가 합화 오행을 생하면 'partial' — polarity weight × 0.7
    //   3) 월령이 합화를 극하거나 사주에 파합자(破合者) 존재 → 'failed'
    //      → polarity 0, weight × 0.30 으로 약화 (signal 자체는 emit; evidence 보존)
    //   4) 인접도(adjacency) — 본명에서 합 페어 천간이 月-日 또는 日-時 위치면
    //      인접 보너스로 partial → full 승격, full 은 weight × 1.10
    const combineDef = STEM_COMBINE[stemName]
    if (combineDef) {
      for (const ns of args.natalStems) {
        if (ns.name === combineDef.pair) {
          const gate = isHwagiEstablished(
            combineDef.transform,
            args.monthElement,
            args.natalStemNames,
            ns.pos
          )
          const basePolarity = polarityForAmhap(combineDef.transform, args.yongsin)
          let polarity: Polarity = basePolarity
          let weightMul = 0.9
          if (gate.status === 'full') {
            weightMul = 0.9 * (gate.adjacencyBonus ? 1.1 : 1.0)
          } else if (gate.status === 'partial') {
            // 극성 그대로 두되 강도만 절감.
            weightMul = 0.9 * 0.7 * (gate.adjacencyBonus ? 1.1 : 1.0)
          } else {
            // failed — 합반 같은 무력 상태. polarity 중립화 + 강도 대폭 절감.
            polarity = 0
            weightMul = 0.9 * 0.3
          }
          out.push({
            id: `${args.idPrefix}.amhap.${layer}.${stemName}-${ns.name}`,
            source: 'saju',
            kind: 'jijanggan',
            name: `${args.branchName} 지장간 ${layerLabel}(${stemName}) ↔ 본명 ${POS_KO[ns.pos] ?? ns.pos}(${ns.name}) 암합`,
            korean: amhapFlowLine(
              args.branchName,
              POS_KO[ns.pos] ?? ns.pos,
              combineDef.transform,
              polarity
            ),
            english: amhapFlowLineEn(
              args.branchName,
              POS_EN[ns.pos] ?? ns.pos,
              combineDef.transform,
              polarity
            ),
            polarity,
            layer: args.layer,
            active: args.active,
            weight: args.baseWeight * layerWeight * weightMul,
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
                hwagiStatus: gate.status,
                hwagiReasons: gate.reasons,
                hwagiAdjacencyBonus: gate.adjacencyBonus,
                monthElement: args.monthElement,
                basePolarity,
              },
            },
          })
        }
      }
    }

    // ── 3) 지장간 충 — 시기 지장간 ↔ 본명 일지 지장간 ──
    // 층 조합별 3-tier ladder (정통 본기/중기/여기 강도 차):
    //   정기↔정기 : polarity -3, weight 1.00 — 본기 정충(正沖)
    //   정기↔중기 또는 중기↔정기 : -2, 0.80 — 한쪽이 본기인 비대칭 충
    //   중기↔중기 / 여기 포함 페어 : -1, 0.60 — 미세 잠재 충 (암충 餘衝)
    for (const [natalLayer, natalStem] of Object.entries(args.natalDayBranchJijanggan)) {
      if (STEM_CLASH.has(`${stemName}-${natalStem}`)) {
        const ladder = chungLadder(layer, natalLayer)
        out.push({
          id: `${args.idPrefix}.chung.${layer}.${stemName}-${natalLayer}.${natalStem}`,
          source: 'saju',
          kind: 'jijanggan',
          name: `${args.branchName} 지장간 ${layerLabel}(${stemName}) ↔ 본명 일지 ${JIJANGGAN_LABEL[natalLayer] ?? natalLayer}(${natalStem}) 충`,
          korean: chungFlowLine(args.branchName, layerLabel, ladder.tier === 'jeonggi-jeonggi'),
          english: chungFlowLineEn(
            args.branchName,
            LAYER_LABEL_EN[layer] ?? layer,
            ladder.tier === 'jeonggi-jeonggi'
          ),
          polarity: ladder.polarity,
          layer: args.layer,
          active: args.active,
          weight: args.baseWeight * layerWeight * ladder.weightFactor,
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
              chungTier: ladder.tier,
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

/**
 * 암합(暗合) polarity — 합화 오행을 용신 체계와 4-way 비교.
 *
 * 정통(자평·적천수)에서 암합은 단순히 "합" 자체가 길흉 중립이 아니라, 합화
 * 결과 오행이 본명에서 어떤 역할(용신·희신·기신·한신)인지에 따라 부작용이
 * 크게 갈린다:
 *
 *  - 합화 = primary 용신     : +2  (희사 — 합으로 길성을 끌어옴)
 *  - 합화 = secondary 희신   : +1  (보조 길)
 *  - 합화 = avoid[0] 1차 기신 : -2  (합거 合去 — 합으로 기신이 도드라짐, 가장 흉)
 *  - 합화 = avoid[1+] 2차 기신: -1  (합반 合絆 — 본명 십신이 묶이는 약한 흉)
 *  - 그 외 한신                : 0  (합 자체는 무해)
 *
 * 합거(合去)는 일간을 극하거나 길성을 묶어 무력화시키는 합으로, 1차 기신과
 * 합화될 때 가장 또렷이 드러난다. 합반(合絆)은 그보다 약한 부작용으로,
 * 본명 십신이 시기 천간과 묶여 제 역할을 못하는 상태.
 */
function polarityForAmhap(
  transform: FiveElement,
  yongsin: { primary: FiveElement; secondary?: FiveElement; avoid: FiveElement[] }
): Polarity {
  if (transform === yongsin.primary) return 2
  if (transform === yongsin.secondary) return 1
  if (yongsin.avoid.length > 0 && yongsin.avoid[0] === transform) return -2 // 합거
  if (yongsin.avoid.includes(transform)) return -1 // 합반
  return 0 // 한신 — 합 자체는 중립
}

/**
 * 합화(化氣) 성립 조건 게이트 — 자평진전·적천수 정통.
 *
 * 천간합 페어(甲己/乙庚/丙辛/丁壬/戊癸)가 발생해도 실제로 합화 오행이
 * 사주에 작용하려면 다음 조건이 만족해야 한다:
 *
 *  1) 월령(月令) 조건 — 합화 오행이 월령 지지의 오행과 같거나 생을 받아야 한다.
 *     - 월령 = 합화: 'full' (가장 확실한 화기)
 *     - 월령이 합화를 생함: 'partial' (화기 약하나 성립)
 *     - 월령이 합화에게 극을 받음(합화 → 월령): 'partial' (반대 방향, 화기 약함)
 *     - 월령이 합화를 극함: 'failed' (월령이 화기를 누름 — 합반)
 *     - 월령이 합화에게 생을 받음: 약한 partial (역방향 생)
 *  2) 파합자(破合者) — 사주 4기둥 천간에 합화 오행을 극하는 천간이 있으면 합반.
 *     - 합화 토 → 파합자: 甲乙 (木克土)
 *     - 합화 금 → 파합자: 丙丁 (火克金)
 *     - 합화 수 → 파합자: 戊己 (土克水)
 *     - 합화 목 → 파합자: 庚辛 (金克木)
 *     - 합화 화 → 파합자: 壬癸 (水克火)
 *     단, 그 파합자가 합 페어 본인(시기 지장간 또는 본명 합 페어 천간)이면 자체
 *     소거 → 카운트 제외 (실제 합에 묶여 파합 못함).
 *  3) 인접도(adjacency) — 본명 합 페어 천간 위치가 月柱-日柱 또는 日柱-時柱
 *     인접이면 강합. 본 함수는 ns.pos 가 month/day/time 중 어느 것인지 판단해
 *     인접 보너스 부여 (full → weight × 1.10; partial → full 승격 후 보너스).
 */
interface HwagiGate {
  status: 'full' | 'partial' | 'failed'
  reasons: string[]
  adjacencyBonus: boolean
}
function isHwagiEstablished(
  transform: FiveElement,
  monthElement: FiveElement | undefined,
  natalStemNames: string[],
  natalPairPos: string
): HwagiGate {
  const reasons: string[] = []
  let status: 'full' | 'partial' | 'failed' = 'partial'

  // 1) 월령 조건.
  if (monthElement) {
    if (monthElement === transform) {
      status = 'full'
      reasons.push(`month-${monthElement}=transform`)
    } else if (FIVE_SHENG[monthElement] === transform) {
      // 월령이 합화를 생함 — 화기 약하지만 성립.
      status = 'partial'
      reasons.push(`month-${monthElement}-shengs-${transform}`)
    } else if (FIVE_KE[monthElement] === transform) {
      // 월령이 합화를 극함 — 화기 깨짐.
      status = 'failed'
      reasons.push(`month-${monthElement}-kes-${transform}`)
    } else if (FIVE_SHENG[transform] === monthElement) {
      // 합화가 월령을 생함 — 역방향, 약 partial.
      status = 'partial'
      reasons.push(`transform-${transform}-shengs-month-${monthElement}`)
    } else if (FIVE_KE[transform] === monthElement) {
      // 합화가 월령을 극함 — 화기 강하지만 월령과 충돌. partial.
      status = 'partial'
      reasons.push(`transform-${transform}-kes-month-${monthElement}`)
    } else {
      status = 'partial'
      reasons.push(`month-${monthElement}-neutral`)
    }
  } else {
    reasons.push('month-unknown')
  }

  // 2) 파합자 검출 — 합 페어 본인은 제외.
  const breakerStems = HWAGI_BREAKERS[transform] ?? []
  const pairSelfNames = new Set<string>() // 합 페어 본인 (본명 천간) — 시기 지장간은 본명 천간 set 에 없으니 굳이 안 빼도 됨.
  // natalPairPos 의 천간이 breaker 후보에 있으면 자체 소거 (합에 묶여서 파합 못함).
  for (const breaker of breakerStems) {
    if (natalStemNames.includes(breaker)) {
      // 파합자 발견 — 단, 그 파합자가 본명에서 합 페어 천간 본인이면 합에 묶여 무력.
      if (!pairSelfNames.has(breaker)) {
        reasons.push(`breaker=${breaker}`)
        if (status === 'full') {
          status = 'partial' // full → partial 강등
        } else if (status === 'partial') {
          status = 'failed' // partial + 파합자 = 실패
        }
        break
      }
    }
  }

  // 3) 인접도 — month/day 또는 day/time 페어면 보너스.
  const adjacencyBonus =
    natalPairPos === 'month' || natalPairPos === 'day' || natalPairPos === 'time'
  // 실제 인접 페어 검증: 시기 지장간은 시기 지지 안에 있어 본명 4기둥 천간과의
  // 인접 정의가 모호하지만, 본명 천간이 月·日·時 중 月-日, 日-時 인접 위치면
  // 본명 내 합 페어 응답성이 강함을 인정해 보너스 부여.

  return { status, reasons, adjacencyBonus }
}

// 오행 생(生) 관계 — A 가 B 를 생함.
const FIVE_SHENG: Record<FiveElement, FiveElement> = {
  목: '화',
  화: '토',
  토: '금',
  금: '수',
  수: '목',
}
// 오행 극(克) 관계 — A 가 B 를 극함.
const FIVE_KE: Record<FiveElement, FiveElement> = {
  목: '토',
  토: '수',
  수: '화',
  화: '금',
  금: '목',
}
// 합화 오행별 파합자 천간 (합화 오행을 극하는 천간들).
const HWAGI_BREAKERS: Record<FiveElement, string[]> = {
  토: ['甲', '乙'], // 木克土
  금: ['丙', '丁'], // 火克金
  수: ['戊', '己'], // 土克水
  목: ['庚', '辛'], // 金克木
  화: ['壬', '癸'], // 水克火
}

/**
 * 지장간 충의 층 조합별 강도 ladder.
 *
 *   정기↔정기  : tier 'jeonggi-jeonggi', polarity -3, weight 1.00
 *   정기↔중기  : tier 'jeonggi-junggi',  polarity -2, weight 0.80
 *   중기↔중기  : tier 'junggi-junggi',   polarity -1, weight 0.60
 *   여기 포함  : tier 'yeogi-mixed',     polarity -1, weight 0.60
 */
function chungLadder(
  periodLayer: string,
  natalLayer: string
): { polarity: Polarity; weightFactor: number; tier: string } {
  if (periodLayer === '정기' && natalLayer === '정기') {
    return { polarity: -3, weightFactor: 1.0, tier: 'jeonggi-jeonggi' }
  }
  // 한쪽이 정기인 비대칭 (정기↔중기 또는 중기↔정기).
  if (
    (periodLayer === '정기' && natalLayer === '중기') ||
    (periodLayer === '중기' && natalLayer === '정기')
  ) {
    return { polarity: -2, weightFactor: 0.8, tier: 'jeonggi-junggi' }
  }
  // 중기↔중기.
  if (periodLayer === '중기' && natalLayer === '중기') {
    return { polarity: -1, weightFactor: 0.6, tier: 'junggi-junggi' }
  }
  // 여기 포함 (정기↔여기, 중기↔여기, 여기↔여기) — 가장 미세.
  return { polarity: -1, weightFactor: 0.6, tier: 'yeogi-mixed' }
}

/**
 * 본명 4기둥의 천간 4개 + 일주·시주 등 위치 정보를 수집.
 * 암합 페어 매칭에 사용 — 어느 위치의 천간이 시기 지장간과 합되는지 추적.
 */
function collectNatalStems(natal: {
  saju: {
    pillars: {
      year: { heavenlyStem?: { name: string } }
      month: { heavenlyStem?: { name: string } }
      day: { heavenlyStem?: { name: string } }
      time: { heavenlyStem?: { name: string } }
    }
  }
}): Array<{ pos: string; name: string; info: StemInfoLite }> {
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

import { STEMS, BRANCHES, JIJANGGAN, getSolarTermKST } from '@/lib/saju/constants'
import { getYearPillarForDate, getMonthPillarForDate } from '@/lib/saju/datePillars'
import { computeDayStem } from './saju-shinsal'
import { getSibsinFromStemInfo as getSibsin } from './shared/sibsin'
import type {
  ActiveSignal,
  ExtractorContext,
  SignalExtractor,
  Polarity,
  SignalKind,
} from '../types'
import type { FiveElement, SibsinKind, YinYang } from '@/lib/saju/types'

/**
 * 정통 자평명리 응용 격국 동적 매칭 — saju-applied-pattern.
 *
 * 본명 격국·신강약·십신 분포(natal fact-layer)와 시기 십신(대운 천간/지지·세운·월운·일진)
 * 사이의 학파적 의미 페어를 매일 신호화한다. 본명 + 시기의 결합만 평가하므로
 * (a) 격국명 단순 라벨(saju-pattern), (b) 격국 성패(saju-geokguk),
 * (c) 통근/조후/원국오행(saju-tonggeun · saju-johu-yongsin · saju-element-balance)
 * 와 영역이 겹치지 않는다.
 *
 * 검출 8 응용 패턴 (학파 핵심):
 *  1. 傷官見官 (상관견관) — 본명 정관 + 시기 상관 활성. 흉.
 *  2. 食神制殺 (식신제살) — 본명 칠살(편관) + 시기 식신. 길.
 *  3. 官印相生 (관인상생) — 시기 정관 + 정인 동시. 길.
 *  4. 財生官 (재생관)   — 시기 정재 + 정관 동시. 길.
 *  5. 印生比劫 (인생비겁) — 본명 신약 + 시기 정인 + 비겁 동시. 길.
 *  6. 比劫奪財 (비겁탈재) — 본명 재성 약 + 시기 비겁(겁재/비견). 흉.
 *  7. 官殺混雜 (관살혼잡) — 시기 정관 + 칠살 동시. 흉.
 *  8. 梟食奪 (효식탈)   — 시기 편인 + 식신 동시. 흉 (편인이 식신을 빼앗는 형).
 *
 * 시기 십신 수집:
 *  - 대운 천간 5년 / 대운 지지(본기) 5년: 신강 발현의 거시 흐름
 *  - 세운 천간: 입춘 경계 (yearly)
 *  - 월운 천간: 절기 절입 (monthly — datePillars 가 처리)
 *  - 일진 천간: 일주 (daily)
 *  → 정통 4축(年·月·日·時) 중 일진 천간을 ‘오늘’ 십신으로 잡고,
 *    그 위에 활성 대운/세운/월운 stem 십신을 슈퍼셋으로 둔다.
 *    (時 일진은 별도 hour extractor가 담당)
 *
 * 본명 조건 sourcing:
 *  - sibsinCount: natal.saju.analyses.sibsin.count → 정관/편관/정재/편재/비견/겁재 카운트
 *  - 본명 정관 보유 / 본명 칠살 보유 / 본명 재성 약(0~1) 여부 판정
 *  - 신약: natal.saju.strength === 'weak'
 *
 * polarity / weight (사용자 지정):
 *  1 상관견관: −2 (본명 정관 2+ 면 −3), weight 0.65 — 흉
 *  2 식신제살: +2, weight 0.65 — 길
 *  3 관인상생: +2, weight 0.60 — 길
 *  4 재생관   : +2, weight 0.60 — 길
 *  5 인생비겁: +2, weight 0.65 — 길 (신약자만)
 *  6 비겁탈재: −2, weight 0.55 — 흉 (재성 약자만)
 *  7 관살혼잡: −1, weight 0.55 — 흉
 *  8 효식탈   : −2, weight 0.55 — 흉
 *
 * 모두 daily layer (오늘 1셀 1회). 한 셀에 여러 패턴 동시 매칭 가능
 * (예: 상관견관 + 관살혼잡) — 그게 정상.
 */

interface StemInfo {
  name: string
  element: FiveElement
  yin_yang: YinYang
}

interface ActiveSibsinSnapshot {
  /** 대운 천간 십신 (현재 대운 천간 5년 phase 인 경우) */
  daeunStem?: SibsinKind
  /** 대운 지지 본기 십신 (현재 대운 지지 5년 phase 인 경우) */
  daeunBranch?: SibsinKind
  /** 세운 천간 십신 */
  seunStem?: SibsinKind
  /** 월운 천간 십신 */
  wolunStem?: SibsinKind
  /** 일진 천간 십신 */
  iljinStem?: SibsinKind
}

/**
 * 한 날짜의 활성 사주 십신 스냅샷.
 * "오늘 활성된 십신 집합" 으로 응용 패턴 트리거를 평가한다.
 */
function activeSibsinForDay(
  date: Date,
  dayMaster: StemInfo,
  daeunList: Array<{ startYear: number; stem: string; branch: string }>,
  bMonth: number,
  bDate: number,
  cache: Map<string, ActiveSibsinSnapshot>
): ActiveSibsinSnapshot {
  // 월/일 단위 캐시 — 일진은 매일 다르지만 대운/세운/월운은 정적이라
  // 셀 N 일 만큼 lookup 만 발생.
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
  const cached = cache.get(key)
  if (cached) return cached

  const snap: ActiveSibsinSnapshot = {}

  // ── 대운 (천간 5년 / 지지 5년) ──
  const t = date.getTime()
  for (const d of daeunList) {
    const baseStart = Date.UTC(d.startYear, bMonth, bDate)
    const midPoint = Date.UTC(d.startYear + 5, bMonth, bDate)
    const endPoint = Date.UTC(d.startYear + 10, bMonth, bDate) - 1
    if (t < baseStart || t > endPoint) continue

    if (t < midPoint) {
      // 천간 5년
      const stemInfo = STEMS.find((s) => s.name === d.stem)
      if (stemInfo) {
        const sibsin = getSibsin(dayMaster, stemInfo as StemInfo)
        if (sibsin) snap.daeunStem = sibsin
      }
    } else {
      // 지지 5년 — 본기 십신
      const jeonggiStem = JIJANGGAN[d.branch]?.['정기']
      const jeonggiInfo = jeonggiStem ? STEMS.find((s) => s.name === jeonggiStem) : null
      if (jeonggiInfo) {
        const sibsin = getSibsin(dayMaster, jeonggiInfo as StemInfo)
        if (sibsin) snap.daeunBranch = sibsin
      }
    }
    break
  }

  // ── 세운 천간 ──
  const yp = getYearPillarForDate(date)
  const yStem = STEMS.find((s) => s.name === yp.stem)
  if (yStem) {
    const sibsin = getSibsin(dayMaster, yStem as StemInfo)
    if (sibsin) snap.seunStem = sibsin
  }

  // ── 월운 천간 ──
  const mp = getMonthPillarForDate(date)
  const mStem = STEMS.find((s) => s.name === mp.stem)
  if (mStem) {
    const sibsin = getSibsin(dayMaster, mStem as StemInfo)
    if (sibsin) snap.wolunStem = sibsin
  }

  // ── 일진 천간 ──
  const dayStemName = computeDayStem(date)
  if (dayStemName) {
    const dStem = STEMS.find((s) => s.name === dayStemName)
    if (dStem) {
      const sibsin = getSibsin(dayMaster, dStem as StemInfo)
      if (sibsin) snap.iljinStem = sibsin
    }
  }

  cache.set(key, snap)
  return snap
}

/** 스냅샷의 모든 활성 십신을 set 으로. 패턴 매칭 편의용. */
function snapshotSet(snap: ActiveSibsinSnapshot): Set<SibsinKind> {
  const s = new Set<SibsinKind>()
  if (snap.daeunStem) s.add(snap.daeunStem)
  if (snap.daeunBranch) s.add(snap.daeunBranch)
  if (snap.seunStem) s.add(snap.seunStem)
  if (snap.wolunStem) s.add(snap.wolunStem)
  if (snap.iljinStem) s.add(snap.iljinStem)
  return s
}

/** 스냅샷에서 어느 축(들)에 해당 십신이 활성됐는지 라벨. evidence 용. */
function activeAxesFor(snap: ActiveSibsinSnapshot, target: SibsinKind): string[] {
  const axes: string[] = []
  if (snap.daeunStem === target) axes.push('대운천간')
  if (snap.daeunBranch === target) axes.push('대운지지')
  if (snap.seunStem === target) axes.push('세운')
  if (snap.wolunStem === target) axes.push('월운')
  if (snap.iljinStem === target) axes.push('일진')
  return axes
}

interface AppliedPattern {
  id: string
  korean: string
  name: string // 한자 라벨
  polarity: Polarity
  weight: number
  /**
   * 본명 + 시기 조건을 모두 만족하면 evidence detail 객체 반환, 아니면 null.
   * detail 에는 트리거된 axis/카운트 등을 담아 디버깅·내러티브에 사용.
   */
  evaluate: (
    natalSibsinCount: Record<SibsinKind, number>,
    natalStrength: 'strong' | 'medium' | 'weak',
    activeSet: Set<SibsinKind>,
    snap: ActiveSibsinSnapshot
  ) => Record<string, unknown> | null
}

/**
 * 8 응용 패턴 정의.
 * 본명 조건은 sibsinCount / strength 로 표현. 시기 조건은 activeSet 으로 표현.
 *
 * polarity 는 사용자 스펙 그대로:
 *  - 상관견관 −2 (본명 정관 2+ 면 −3 으로 격상)
 *  - 식신제살 +2 / 관인상생 +2 / 재생관 +2 / 인생비겁 +2
 *  - 비겁탈재 −2 / 관살혼잡 −1 / 효식탈 −2
 */
// 응용 패턴 id → 흐름(flow) 한 줄. 이름(상관견관…)만으론 안 와닿아 의미를 풀어씀.
const APPLIED_FLOW: Record<string, string> = {
  'sanggwan-gyeon-gwan': '튀는 끼가 규율·자리와 부딪치는 흐름 — 말·행동이 윗선과 충돌하기 쉬워요',
  'siksin-jesal': '표현력으로 압박을 다스리는 흐름 — 위기를 솜씨로 돌파하기 좋아요',
  'gwan-in-sangsaeng': '책임이 배움·문서로 이어지는 흐름 — 자리와 실력이 함께 자라요',
  'jae-saeng-gwan': '재물이 자리를 밀어주는 흐름 — 일과 돈이 서로를 키워요',
  'in-saeng-bigeop': '배움·후원이 나와 동료의 힘이 되는 흐름 — 기반을 다지기 좋아요',
  'bigeop-talchae': '경쟁·동료가 재물을 흔드는 흐름 — 돈·동업에 마찰이 생기기 쉬워요',
  'gwan-sal-honjap': '관과 살이 뒤섞여 압박이 어지러운 흐름 — 책임이 갈피를 잃기 쉬워요',
  'hyo-sik-tal': '편인이 식신을 눌러 표현·결실이 막히는 흐름 — 추진보다 정비가 나아요',
}

const APPLIED_FLOW_EN: Record<string, string> = {
  'sanggwan-gyeon-gwan':
    'flair collides with rules and rank — words and actions clash with those above',
  'siksin-jesal': 'expression tames pressure — a good flow to break through a crisis with skill',
  'gwan-in-sangsaeng':
    'responsibility feeds learning and credentials — position and skill grow together',
  'jae-saeng-gwan': 'wealth props up your standing — work and money lift each other',
  'in-saeng-bigeop':
    'learning and backing become your and your peers’ strength — good for building a base',
  'bigeop-talchae': 'rivals and peers shake your wealth — friction over money and partnerships',
  'gwan-sal-honjap': 'officer and killer mix into messy pressure — duty loses its thread',
  'hyo-sik-tal': 'indirect resource smothers expression — repair over push',
}

const APPLIED_PATTERNS: AppliedPattern[] = [
  // ── 1. 상관견관 ──
  {
    id: 'sanggwan-gyeon-gwan',
    korean: '상관견관',
    name: '傷官見官',
    polarity: -2,
    weight: 0.65,
    evaluate(count, _strength, active, snap) {
      const natalJeonggwan = count['정관'] ?? 0
      if (natalJeonggwan < 1) return null
      if (!active.has('상관')) return null
      const polarityAdjusted: Polarity = natalJeonggwan >= 2 ? -3 : -2
      return {
        natalJeonggwan,
        activeAxes: activeAxesFor(snap, '상관'),
        polarityAdjusted,
        rule: '본명 정관 + 시기 상관 → 정관 피상.',
      }
    },
  },
  // ── 2. 식신제살 ──
  {
    id: 'siksin-jesal',
    korean: '식신제살',
    name: '食神制殺',
    polarity: 2,
    weight: 0.65,
    evaluate(count, _strength, active, snap) {
      const natalChilsal = count['편관'] ?? 0
      if (natalChilsal < 1) return null
      if (!active.has('식신')) return null
      return {
        natalChilsal,
        activeAxes: activeAxesFor(snap, '식신'),
        rule: '본명 칠살(편관) + 시기 식신 → 식신이 칠살을 제압.',
      }
    },
  },
  // ── 3. 관인상생 ──
  {
    id: 'gwan-in-sangsaeng',
    korean: '관인상생',
    name: '官印相生',
    polarity: 2,
    weight: 0.6,
    evaluate(_count, _strength, active, snap) {
      if (!active.has('정관') || !active.has('정인')) return null
      return {
        activeJeonggwan: activeAxesFor(snap, '정관'),
        activeJeongin: activeAxesFor(snap, '정인'),
        rule: '시기 정관 + 정인 동시 → 관이 인을 생하는 정통 길로.',
      }
    },
  },
  // ── 4. 재생관 ──
  {
    id: 'jae-saeng-gwan',
    korean: '재생관',
    name: '財生官',
    polarity: 2,
    weight: 0.6,
    evaluate(_count, _strength, active, snap) {
      if (!active.has('정재') || !active.has('정관')) return null
      return {
        activeJeongjae: activeAxesFor(snap, '정재'),
        activeJeonggwan: activeAxesFor(snap, '정관'),
        rule: '시기 정재 + 정관 동시 → 재가 관을 생하는 길로.',
      }
    },
  },
  // ── 5. 인생비겁 (신약자만) ──
  {
    id: 'in-saeng-bigeop',
    korean: '인생비겁',
    name: '印生比劫',
    polarity: 2,
    weight: 0.65,
    evaluate(_count, strength, active, snap) {
      if (strength !== 'weak') return null
      if (!active.has('정인')) return null
      const hasBigeop = active.has('비견') || active.has('겁재')
      if (!hasBigeop) return null
      return {
        natalStrength: strength,
        activeJeongin: activeAxesFor(snap, '정인'),
        activeBigeon: activeAxesFor(snap, '비견'),
        activeGyeopjae: activeAxesFor(snap, '겁재'),
        rule: '신약 + 시기 정인+비겁 → 인이 비겁을 생해 일간 보강.',
      }
    },
  },
  // ── 6. 비겁탈재 (재성 약자만) ──
  {
    id: 'bigeop-talchae',
    korean: '비겁탈재',
    name: '比劫奪財',
    polarity: -2,
    weight: 0.55,
    evaluate(count, _strength, active, snap) {
      const jaeCount = (count['정재'] ?? 0) + (count['편재'] ?? 0)
      // 재성 약 = 0~1개
      if (jaeCount >= 2) return null
      const hasBigeop = active.has('비견') || active.has('겁재')
      if (!hasBigeop) return null
      return {
        natalJaeCount: jaeCount,
        activeBigeon: activeAxesFor(snap, '비견'),
        activeGyeopjae: activeAxesFor(snap, '겁재'),
        rule: '본명 재성 약(≤1) + 시기 비겁 → 비겁이 재를 탈취.',
      }
    },
  },
  // ── 7. 관살혼잡 ──
  {
    id: 'gwan-sal-honjap',
    korean: '관살혼잡',
    name: '官殺混雜',
    polarity: -1,
    weight: 0.55,
    evaluate(_count, _strength, active, snap) {
      if (!active.has('정관') || !active.has('편관')) return null
      return {
        activeJeonggwan: activeAxesFor(snap, '정관'),
        activeChilsal: activeAxesFor(snap, '편관'),
        rule: '시기 정관 + 칠살 동시 → 관살혼잡, 진로 혼란.',
      }
    },
  },
  // ── 8. 효식탈 ──
  {
    id: 'hyo-sik-tal',
    korean: '효식탈',
    name: '梟食奪',
    polarity: -2,
    weight: 0.55,
    evaluate(_count, _strength, active, snap) {
      if (!active.has('편인') || !active.has('식신')) return null
      return {
        activePyeonin: activeAxesFor(snap, '편인'),
        activeSiksin: activeAxesFor(snap, '식신'),
        rule: '시기 편인 + 식신 동시 → 효신(편인)이 식신을 빼앗음.',
      }
    },
  },
]

const sajuAppliedPatternExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'applied-pattern' as SignalKind,
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const signals: ActiveSignal[] = []

    const dayMasterRaw = natal.saju.pillars.day.heavenlyStem.name
    const dayMaster = STEMS.find((s) => s.name === dayMasterRaw) as StemInfo | undefined
    if (!dayMaster) return signals

    // 본명 sibsin 카운트 — advancedAnalysis.sibsin.count 가 SSOT.
    // 없으면 (advancedAnalysis 실패 시) 빈 카운트로 안전 폴백 → natal-조건
    // 패턴(상관견관/식신제살/비겁탈재) 은 매칭되지 않고 시기-only 4종만 작동.
    const sibsinCount = natal.saju.analyses?.sibsin?.count
    const count: Record<SibsinKind, number> = {
      비견: sibsinCount?.['비견'] ?? 0,
      겁재: sibsinCount?.['겁재'] ?? 0,
      식신: sibsinCount?.['식신'] ?? 0,
      상관: sibsinCount?.['상관'] ?? 0,
      편재: sibsinCount?.['편재'] ?? 0,
      정재: sibsinCount?.['정재'] ?? 0,
      편관: sibsinCount?.['편관'] ?? 0,
      정관: sibsinCount?.['정관'] ?? 0,
      편인: sibsinCount?.['편인'] ?? 0,
      정인: sibsinCount?.['정인'] ?? 0,
    }
    const strength = natal.saju.strength

    const bMonth = natal.input.month - 1
    const bDate = natal.input.date

    const snapCache = new Map<string, ActiveSibsinSnapshot>()
    const start = new Date(range.start)
    const end = new Date(range.end)

    // 입춘 보장 — 세운/datePillars 는 내부적으로 처리하지만 폴백 보호.
    // (직접 사용은 안 하지만 import 일관성 유지)
    void getSolarTermKST
    void BRANCHES

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const snap = activeSibsinForDay(date, dayMaster, natal.saju.daeun, bMonth, bDate, snapCache)
      const active = snapshotSet(snap)
      const dayIso = date.toISOString().slice(0, 10)

      for (const pat of APPLIED_PATTERNS) {
        const detail = pat.evaluate(count, strength, active, snap)
        if (!detail) continue

        // 상관견관 polarity 격상: 본명 정관 2+ → −3
        const polarity: Polarity = (detail.polarityAdjusted as Polarity | undefined) ?? pat.polarity

        signals.push({
          id: `saju.applied-pattern.${pat.id}.${dayIso}`,
          source: 'saju',
          kind: 'applied-pattern' as SignalKind,
          name: `${pat.name} (${pat.korean})`,
          korean: `${pat.korean} — ${APPLIED_FLOW[pat.id] ?? ''}`.replace(/ — $/, ''),
          english: APPLIED_FLOW_EN[pat.id] ?? pat.id,
          polarity,
          layer: 'daily',
          active: {
            start: `${dayIso}T00:00:00.000Z`,
            peak: `${dayIso}T12:00:00.000Z`,
            end: `${dayIso}T23:59:59.999Z`,
          },
          weight: pat.weight,
          evidence: {
            module: 'saju-applied-pattern',
            detail: {
              patternId: pat.id,
              korean: pat.korean,
              hanja: pat.name,
              snapshot: {
                daeunStem: snap.daeunStem,
                daeunBranch: snap.daeunBranch,
                seunStem: snap.seunStem,
                wolunStem: snap.wolunStem,
                iljinStem: snap.iljinStem,
              },
              natalStrength: strength,
              ...detail,
            },
          },
        })
      }
    }

    return signals
  },
}

export default sajuAppliedPatternExtractor

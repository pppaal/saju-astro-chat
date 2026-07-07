/**
 * 인생 유형(life pattern) — 대운 흐름을 "신강약 기준"으로 읽어 사람마다 다른
 * 생애 시나리오(대기만성·초년발복·중년절정·굴곡…)를 도출한다.
 *
 * 왜 신강약 기준인가: 단순 "용신 오행이면 좋다" 매칭은 신약에게 부담이 되는
 * 관성·재성운까지 좋게 쳐서 인생 곡선을 거꾸로 만든다(재다신약인데 초년 황금기 등).
 * 정통 억부 논리 — 신약은 비겁·인성운에 힘이 붙고, 신강은 식상·재성·관성운에 풀린다 —
 * 으로 각 대운의 우호 방향을 잡는다. 중화는 방향이 약하므로 용신 오행으로 판정.
 *
 * 점수가 아니라 *방향(+/−)* 과 *시나리오 라벨* 만 낸다(점수 제거 방침과 일관).
 * 순수 함수 — saju 입력만.
 */
import { getStemElement, getBranchElement } from '@/lib/saju/stemBranchUtils'
import { FIVE_ELEMENT_RELATIONS } from '@/lib/saju/constants'
import { favorOf as toneFavorOf, type YongsinLike } from './cycleTone'

export type SibsinCategory = '비겁' | '식상' | '재성' | '관성' | '인성'
export type LifePatternKey =
  | 'late-bloomer' // 대기만성
  | 'early-peak' // 초년발복 → 후반 하강
  | 'midlife-peak' // 중년 절정
  | 'steady-rise' // 꾸준히 상승
  | 'smooth' // 전반적 순탄
  | 'hard' // 전반적 고전
  | 'undulating' // 굴곡형

export interface DaeunFavor {
  startAge: number
  gz: string
  stemCat: SibsinCategory
  branchCat: SibsinCategory
  /** −2 ~ +2, 신강약(또는 중화는 용신) 기준 우호 방향. */
  favor: number
}
export interface LifePattern {
  key: LifePatternKey
  ko: string
  /** 유형명(영문). */
  en: string
  /** 한 줄 서사(ko). */
  line: string
  /** 한 줄 서사(en). */
  lineEn: string
  /** 대운별 방향 시퀀스. */
  daeun: DaeunFavor[]
}

// 오행 상생(GEN)·상극(CTRL) — 정본 FIVE_ELEMENT_RELATIONS(saju/constants)에서 파생.
const GEN: Record<string, string> = FIVE_ELEMENT_RELATIONS.생하는관계
const CTRL: Record<string, string> = FIVE_ELEMENT_RELATIONS.극하는관계

/** 일간 오행 대비 어떤 오행이 어느 십신 카테고리인지. */
function categoryOf(dmEl: string, el: string): SibsinCategory {
  if (el === dmEl) return '비겁'
  if (GEN[dmEl] === el) return '식상'
  if (CTRL[dmEl] === el) return '재성'
  if (CTRL[el] === dmEl) return '관성'
  return '인성' // GEN[el] === dmEl
}

type Strength = 'weak' | 'medium' | 'strong' | string

/**
 * 한 대운(천간 또는 지지)의 우호 부호(+1/0/−1).
 *
 * SSOT 통일(2026-06): 인생 흐름 favor 와 lifeStages 톤이 *서로 반대로* 판정하던
 * 버그를 없애기 위해 cycleTone.favorOf(용신 우선) 하나로 모은다. 그 함수는
 * 오행+용신이 있으면 용신/희신=순(+1)·기신/구신=고비(−1)·한신=중립(0) 으로
 * 판정하고(억부가 이미 용신에 반영돼 있으므로 정확), 정보가 없을 때만 신강약×
 * 십신 fallback 으로 떨어진다. (예전엔 신강/신약을 십신 카테고리 단순표로만 봐
 * 용신/기신과 정반대 결과를 내, 같은 페이지의 용신 카드와 모순됐다.)
 */
function favorSign(
  cat: SibsinCategory,
  el: string,
  strength: Strength,
  yongsin?: YongsinLike
): number {
  const f = toneFavorOf(strength, cat, el, yongsin)
  return f === 'good' ? 1 : f === 'hard' ? -1 : 0
}

interface SajuLike {
  dayMaster?: { name?: string }
  strength?: string
  yongsin?: { primary?: string; secondary?: string; avoid?: string[] }
  daeun?: Array<{ stem: string; branch: string; startAge: number; startYear?: number }>
}

const PATTERN_KO: Record<LifePatternKey, { ko: string; en: string; line: string; lineEn: string }> =
  {
    'late-bloomer': {
      ko: '대기만성형',
      en: 'Late bloomer',
      line: '처음엔 더디고 애써야 하지만, 해를 거듭할수록 자리를 잡아가요. 늦게 피어 오래가는, 뒤로 갈수록 환해지는 결이에요.',
      lineEn:
        'A slow, effortful start — but you find your ground as the years go on. Yours is a life that blooms late and lasts, brightening toward the end.',
    },
    'early-peak': {
      ko: '초년발복형',
      en: 'Early peak',
      line: '이른 봄에 일찍 꽃을 피우는 결이에요. 한창때 멀리 나아가고, 뒤로는 넓히기보다 지켜낼 때 더 단단해져요.',
      lineEn:
        'You flower early, in the first warmth of the year. You travel far while the season is at its height; later, you grow steadier by keeping what you have rather than reaching for more.',
    },
    'midlife-peak': {
      ko: '중년절정형',
      en: 'Midlife peak',
      line: '한낮에 해가 가장 높이 뜨듯, 인생의 한가운데서 가장 크게 펼쳐지는 결이에요. 그 길목에서 마음먹고 나아가면 멀리 닿아요.',
      lineEn:
        'Like the sun standing highest at noon, your life opens widest at its middle. Make your move at that crossing and it carries far.',
    },
    'steady-rise': {
      ko: '점진상승형',
      en: 'Steady rise',
      line: '서두르지 않아도 물이 차오르듯 한 해 한 해 나아져요. 조금씩, 그러나 멈추지 않고 높아지는 결이에요.',
      lineEn:
        'Without hurrying, you rise like water filling a basin, a little more each year — slow, but never still.',
    },
    smooth: {
      ko: '순탄형',
      en: 'Smooth path',
      line: '큰 파도 없이 잔잔하게 흐르는 강 같은 결이에요. 굽이는 적어도, 멀리까지 고르게 닿아요.',
      lineEn: 'Yours flows like a calm river with few rapids — gentle, even, and far-reaching.',
    },
    hard: {
      ko: '인고형',
      en: 'The long haul',
      line: '쉬운 길은 아니에요. 바람을 안고 오래 걷는 동안, 버틴 만큼 단단해지는 결이에요.',
      lineEn:
        'Not an easy road. You walk a long way into the wind, and what you endure is what makes you unbreakable.',
    },
    undulating: {
      ko: '굴곡형',
      en: 'Ups and downs',
      line: '밀물과 썰물처럼 좋을 때와 힘든 때가 번갈아 와요. 물때를 읽을 줄 알면, 그 리듬이 오히려 힘이 돼요.',
      lineEn:
        'Like tides, bright spells and hard spells take turns. Learn to read the water, and the rhythm itself becomes your strength.',
    },
  }

/** 정점 시점을 단정하는 유형 — favor 가 없어도 곡선 마루 시점만이라도 붙여 화면
 * 곡선과 한 줄 서사가 어긋나지 않게 한다(굴곡/순탄/고전은 정점을 단정하지 않음). */
const PEAK_WINDOW_KEYS = new Set<LifePatternKey>([
  'late-bloomer',
  'steady-rise',
  'midlife-peak',
  'early-peak',
])

/** 인생 곡선(거시 macro)을 입력으로 받아 인생유형과 정점을 *곡선 기준*으로 산출하기
 * 위한 최소 형상. 곡선이 주어지면 분류·정점을 곡선에서 뽑아 lifePattern 과 곡선이
 * 화면에서 모순되지 않게 한다(감사 B1). */
export interface LifeCurveShape {
  points: Array<{ age: number; macro: number }>
}

export function deriveLifePattern(
  saju: SajuLike,
  currentAge?: number,
  curve?: LifeCurveShape
): LifePattern | null {
  const dm = saju.dayMaster?.name
  const daeun = saju.daeun ?? []
  if (!dm || daeun.length === 0) return null
  const dmEl = getStemElement(dm)
  const strength = saju.strength ?? 'medium'
  const yongsin = saju.yongsin

  const startYears = new Map<number, number>()
  const seq: DaeunFavor[] = daeun.map((d) => {
    const se = getStemElement(d.stem)
    const be = getBranchElement(d.branch)
    const stemCat = categoryOf(dmEl, se)
    const branchCat = categoryOf(dmEl, be)
    const favor =
      favorSign(stemCat, se, strength, yongsin) + favorSign(branchCat, be, strength, yongsin)
    if (typeof d.startYear === 'number') startYears.set(d.startAge, d.startYear)
    return { startAge: d.startAge, gz: `${d.stem}${d.branch}`, stemCat, branchCat, favor }
  })

  // 구간 평균 (성인기 중심).
  const seg = (lo: number, hi: number) => {
    const a = seq.filter((x) => x.startAge >= lo && x.startAge < hi)
    return a.length ? a.reduce((p, c) => p + c.favor, 0) / a.length : 0
  }
  const early = seg(15, 40)
  const mid = seg(40, 60)
  const late = seg(60, 90)
  const mean = (early + mid + late) / 3
  const maxSeg = Math.max(early, mid, late)
  const D = 0.5 // 의미 있는 구간 단차(±2 스케일에서 한 글자 차이의 절반).
  // 굴곡형은 "힘든 때"가 실제로 있어야 한다 — 한 번도 음수가 아닌 곡선을
  // 구간 평균차만으로 'V'라 부르면 "좋을 때와 힘들 때가 번갈아"가 거짓이 된다.
  const hasRealDip = seq.some((s) => s.favor < 0)

  // 분류 순서가 핵심: "형태가 뚜렷한" 시나리오(고전·굴곡·중년절정·반전)를 먼저 잡고,
  // 그다음 단조 흐름(초년발복·점진상승), 마지막에 무난(순탄)으로 떨어뜨린다.
  // 이렇게 해야 steady-rise/hard/undulating 이 위 버킷에 다 흡수되지 않고 실제로 발화한다.
  let key: LifePatternKey
  if (mean <= -0.4 && maxSeg < 0.5) {
    // 전반적 고전 — 어느 구간도 뚜렷이 풀리지 않고 평균이 음수.
    key = 'hard'
  } else if (hasRealDip && early - mid >= D && late - mid >= D) {
    // 굴곡형 — 중년이 양옆보다 분명히 꺼진 V자 골 (실제 음수 골이 있을 때만).
    key = 'undulating'
  } else if (mid - early >= D && mid - late >= D) {
    // 중년 절정 — 중년이 양옆보다 분명히 솟음.
    key = 'midlife-peak'
  } else if (late >= maxSeg - 1e-9 && late - early >= D && early <= 0.1) {
    // 대기만성 — 초년이 부진(≤0)했다가 말년이 가장 높은 분명한 반전.
    key = 'late-bloomer'
  } else if (early >= maxSeg - 1e-9 && early - late >= D) {
    // 초년발복 — 초년이 정점이고 말년이 분명히 하강.
    key = 'early-peak'
  } else if (late - early >= D && mid >= early - 0.34 && late >= mid - 0.34) {
    // 점진상승 — 단조 비감소 상승(말>초)이되 급반전(대기만성)엔 못 미침.
    key = 'steady-rise'
  } else {
    // 그 외 — 큰 굴곡 없이 흐름.
    key = 'smooth'
  }

  // 곡선이 주어지면 분류·정점을 *곡선 기준*으로 덮어쓴다(감사 B1) — 단, 전반적
  // 고전(hard)은 곡선 정규화로 사라지므로 daeun favor 기준을 유지한다.
  let curvePeakAge: number | undefined
  if (curve && curve.points.length >= 10 && key !== 'hard') {
    const cls = classifyFromCurve(curve.points, currentAge, hasRealDip)
    if (cls) {
      key = cls.key
      curvePeakAge = cls.peakAge
    }
  }

  const { line, lineEn } = personalize(key, seq, startYears, currentAge, curvePeakAge)
  return { key, ...PATTERN_KO[key], line, lineEn, daeun: seq }
}

/** macro 곡선 형상 → 인생유형 키 + 전역 정점 나이. lifePattern 과 곡선의 모순을
 * 없애기 위해 *같은 곡선*에서 분류·정점을 뽑는다(감사 B1). 정규화(0..1) 후 구간
 * 평균 + 전역 극값 위치로 판정. */
function classifyFromCurve(
  pointsAll: Array<{ age: number; macro: number }>,
  currentAge?: number,
  /**
   * 실제 음수 favor 구간이 있나(용신 기준). 없으면 곡선 형상만으로 'undulating'
   * (“힘든 때가 번갈아”)을 붙이지 않는다 — 곡선은 min-max 정규화라 전부 양호한
   * 인생의 얕은 잔물결도 V 로 증폭해 거짓 “힘든 때” 카피를 냈다(감사 F3). favor
   * 경로의 hasRealDip 가드와 동일 기준을 곡선 경로에도 적용.
   */
  hasRealDip: boolean = true
): { key: LifePatternKey; peakAge: number } | null {
  // 호라이즌 90 통일(감사 R2) — 옛 85 컷은 말년(86~90) 전역정점을 분류·정점창에서
  // 못 봐 매우-말년발복형을 오분류했다. lifeCurve span·toLifetime 필터와 한 값으로.
  const p = pointsAll.filter((x) => x.age >= 0 && x.age <= 90)
  if (p.length < 10) return null
  const macros = p.map((x) => x.macro)
  const lo = Math.min(...macros)
  const hi = Math.max(...macros)
  // 굴곡형(undulating="힘든 때") 게이트 — hasRealDip 은 *사주 favor* 부호라
  // 0.6·사주+0.4·점성 곡선의 *점성 주도 골*을 놓친다(감사 R2). macro 는 z-정규화
  // (mean~0)라 lo 가 실제로 음(-0.35↓)이면 그건 진짜 저점 — 사주 favor 가 전부
  // ≥0 이어도 곡선이 실제로 꺼졌으면 굴곡형을 허용한다.
  const realDip = hasRealDip || lo <= -0.35
  // 절대 진폭 게이트(감사 A-4) — min-max 스트레치는 *거의 평탄한* 곡선의 미세
  // 잔물결도 풀스케일로 증폭해 극적 유형(undulating 등)으로 오분류한다. macro 는
  // z-정규화 합성(±1 스케일, 7년 이동평균)이라 절대 범위가 의미를 가짐: 범위가
  // 0.25σ 미만이면 실질 굴곡이 없는 인생 — 'smooth' 로 확정하고 증폭하지 않는다.
  if (hi - lo < 0.25) {
    const flatPeak = p.reduce((best, x) => (x.macro > best.macro ? x : best), p[0]).age
    return { key: 'smooth', peakAge: Math.max(16, flatPeak) }
  }
  const range = hi - lo || 1
  const nv = (m: number) => (m - lo) / range
  const seg = (a: number, b: number): number => {
    const s = p.filter((x) => x.age >= a && x.age < b)
    return s.length ? s.reduce((acc, x) => acc + nv(x.macro), 0) / s.length : 0.5
  }
  const early = seg(12, 38)
  const mid = seg(38, 58)
  const late = seg(58, 85)
  const globalPeakAge = p.reduce((best, x) => (x.macro > best.macro ? x : best), p[0]).age
  const spread = Math.max(early, mid, late) - Math.min(early, mid, late)
  const D = 0.1
  let key: LifePatternKey
  if (mid + D < early && mid + D < late)
    key = realDip ? 'undulating' : 'smooth' // 중년이 양옆보다 꺼진 V (실 저점 있을 때만 굴곡형)
  else if (mid > early + D && mid > late + D)
    key = 'midlife-peak' // 중년 솟음
  else if (late > early + D && late >= mid - 1e-9 && globalPeakAge >= 52)
    key = 'late-bloomer' // 말년 정점 반전
  else if (early > late + D && early >= mid - 1e-9 && globalPeakAge < 38)
    key = 'early-peak' // 초년 정점 후 하강
  else if (late > early + D)
    key = 'steady-rise' // 단조 상승
  else if (spread > 0.3 && realDip)
    key = 'undulating' // 큰 진폭 + 실 저점 — 형태는 위와 안 맞지만 굴곡
  else key = 'smooth'
  // 정점 나이는 *유형이 가리키는 구간* 안의 최댓값으로 — base.line 방향과 detail
  // "정점 시점"이 어긋나지 않게(예: 점진상승인데 정점이 11세이면 모순).
  // early-peak '정점'은 *유년기*(<16)가 아니라 젊은 시절(초년발복)을 가리켜야 —
  // "14세에 가장 크게"는 발복 서사와 어긋난다. undulating/smooth 도 유년 정점은 피한다.
  const win: [number, number] =
    key === 'late-bloomer' || key === 'steady-rise'
      ? [50, 85]
      : key === 'early-peak'
        ? [16, 40]
        : key === 'midlife-peak'
          ? [35, 60]
          : [16, 85]
  const wp = p.filter((x) => x.age >= win[0] && x.age < win[1])
  let pool = wp.length ? wp : p
  // 현재 나이를 알면 *가까운 지평*(현재−3 ~ +28년) 안의 정점을 우선한다 — 31세에게
  // "81세부터 가장 크게"처럼 50년 뒤 정점을 가리키면 비현실적이라(사용자 지적).
  // 지평 안에 후보가 있으면 그쪽, 없으면(이미 지난 정점뿐인 고령 등) 구간 최댓값.
  if (typeof currentAge === 'number') {
    const near = pool.filter((x) => x.age >= currentAge - 3 && x.age <= currentAge + 28)
    if (near.length) pool = near
  }
  const peakAge = pool.reduce((best, x) => (x.macro > best.macro ? x : best), pool[0]).age
  return { key, peakAge }
}

/** 십신 카테고리의 짧은 라벨(ko/en) — 우호 운의 성격을 한 단어로. */
const CAT_KO: Record<SibsinCategory, string> = {
  비겁: '경쟁·동료',
  식상: '표현·재능',
  재성: '재물·실리',
  관성: '직위·책임',
  인성: '학문·후원',
}
const CAT_EN: Record<SibsinCategory, string> = {
  비겁: 'peers and rivalry',
  식상: 'expression and talent',
  재성: 'money and results',
  관성: 'status and duty',
  인성: 'learning and support',
}

/** 나이대를 한국어 구어로(마흔 줄/쉰 줄 …). */
function ageBandKo(age: number): string {
  const bands: Array<[number, string]> = [
    [20, '스무 살 무렵'],
    [30, '서른 줄'],
    [40, '마흔 줄'],
    [50, '쉰 줄'],
    [60, '예순 줄'],
    [70, '일흔 줄'],
  ]
  let best = bands[0]
  for (const b of bands) if (age >= b[0]) best = b
  return best[1]
}

/**
 * 한 줄 서사를 생애 곡선의 *정점 대운* 으로 개인화한다. 같은 유형 키라도 정점이
 * 오는 나이·연도·우호 십신이 사람마다 달라 문장이 갈린다(제너릭 폴백 제거).
 */
function personalize(
  key: LifePatternKey,
  seq: DaeunFavor[],
  startYears: Map<number, number>,
  currentAge?: number,
  curvePeakAge?: number
): { line: string; lineEn: string } {
  const base = PATTERN_KO[key]
  if (seq.length === 0) return { line: base.line, lineEn: base.lineEn }

  // 곡선 정점 나이가 주어지면(B1) 그 나이를 덮는 대운을 정점으로 — lifePattern 의
  // "정점 시점"이 화면의 곡선 마루와 일치한다. 십신(cat)·연도·시제 모두 그 기준.
  if (typeof curvePeakAge === 'number') {
    const covering = seq.filter((c) => c.startAge <= curvePeakAge).slice(-1)[0] ?? seq[0]
    const past = typeof currentAge === 'number' ? curvePeakAge < currentAge : false
    const baseLineKo = past ? (LINE_PAST_KO[key] ?? base.line) : base.line
    const baseLineEn = past ? (LINE_PAST_EN[key] ?? base.lineEn) : base.lineEn
    const cat = covering.stemCat
    const baseYr = startYears.get(covering.startAge)
    const yr = baseYr != null ? baseYr + (curvePeakAge - covering.startAge) : undefined
    const whenKo = yr
      ? `${yr}년(${curvePeakAge}세) 무렵`
      : `${ageBandKo(curvePeakAge)}(${curvePeakAge}세 무렵)`
    const whenEn = yr ? `around ${yr} (age ${curvePeakAge})` : `around age ${curvePeakAge}`
    // 정점 대운의 십신 우호(favor)가 없어도, 정점 시점을 단정하는 유형은 *곡선 마루
    // 시점*만이라도 붙여 base.line 의 막연한 어조와 화면 곡선이 어긋나지 않게 한다
    // (예: late-bloomer 인데 곡선 마루가 60대면 "마흔" 대신 실제 60대를 가리킨다).
    // 십신 방향은 favor 가 양일 때만 단정한다(없으면 시점만).
    if (covering.favor <= 0) {
      if (!PEAK_WINDOW_KEYS.has(key)) return { line: baseLineKo, lineEn: baseLineEn }
      const tKo = past
        ? `특히 ${whenKo}, 가장 깊이 무르익었던 철이었어요.`
        : `특히 ${whenKo}부터, 가장 깊이 무르익는 철이에요.`
      const tEn = past
        ? `Your fullest ripening was ${whenEn}.`
        : `Your fullest ripening comes ${whenEn} onward.`
      return { line: `${baseLineKo} ${tKo}`, lineEn: `${baseLineEn} ${tEn}` }
    }
    const detailKo = past
      ? `특히 ${whenKo}, ${CAT_KO[cat]} 쪽으로 가장 환하게 피어났던 때였어요.`
      : `특히 ${whenKo}부터, ${CAT_KO[cat]} 쪽으로 가장 환하게 피어나요.`
    const detailEn = past
      ? `Your fullest bloom was ${whenEn}, turned toward ${CAT_EN[cat]}.`
      : `Your fullest bloom comes ${whenEn} onward, turned toward ${CAT_EN[cat]}.`
    return { line: `${baseLineKo} ${detailKo}`, lineEn: `${baseLineEn} ${detailEn}` }
  }

  // 정점 대운을 *유형 서사가 가리키는 구간* 안에서 고른다 — 그래야 "대기만성인데
  // 정점이 한 살" 같은 자기모순이 안 난다.
  //   late-bloomer/steady-rise → 후반(40세~), early-peak → 전반(~40세),
  //   midlife-peak → 중년(35~60), undulating/smooth/hard → 활동기 전체(~75세).
  const inWindow = (c: DaeunFavor): boolean => {
    if (key === 'late-bloomer' || key === 'steady-rise') return c.startAge >= 40
    if (key === 'early-peak') return c.startAge < 40
    if (key === 'midlife-peak') return c.startAge >= 35 && c.startAge < 60
    return c.startAge < 75 // undulating / smooth / hard
  }
  const windowed = seq.filter(inWindow)
  let pool = windowed.length ? windowed : seq

  // 현재 나이를 알면, *지금 또는 앞으로 올* 대운을 우선 정점으로 잡는다(현 대운부터
  // 이후 ~30년 지평). 이렇게 해야 31세에게 "1세가 절정", 65세에게 "32세가 절정"
  // 같은 과거/유아기 정점이 안 나온다. 앞으로 남은 후보가 없으면(고령) 지나온
  // 정점을 회고형(past)으로 서술한다.
  if (typeof currentAge === 'number') {
    const ahead = pool.filter((c) => c.startAge + 10 > currentAge && c.startAge <= currentAge + 30)
    // 지금~30년 안에 후보가 있으면 그쪽을 우선. 없으면(고령이거나, 어린 사람의
    // 정점 창이 30년보다 멀거나) pool 을 그대로 두고 시제는 *정점의 실제 위치*로만
    // 판정한다 — 옛 코드는 'ahead 비었음'을 무조건 past 로 봐서, 9세에게 2074년
    // (57세) 정점을 "…였어요" 과거형으로 서술했다(감사 BUG-6).
    if (ahead.length) pool = ahead
  }
  // favor 동률이면 더 빠른(먼저 오는) 대운을 정점으로 — reduce 가 첫 최대를 유지.
  const peak = pool.reduce((best, c) => (c.favor > best.favor ? c : best), pool[0])
  // 시제는 오직 정점 대운이 *이미 지났는가*(decade 끝 ≤ 현재 나이)로 결정.
  const past = typeof currentAge === 'number' ? peak.startAge + 10 <= currentAge : false

  // 정점 창이 이미 지난 사람에겐 base.line 의 미래 지시 어조도 회고형으로 바꾼다.
  // midlife-peak "…풀려요. 그때 승부를 보면 좋아요."(미래 조언)를 80세에게 그대로
  // 주던 문제(감사 BUG-6). 시간 창을 단정하는 유형만 past 변형을 둔다.
  const baseLineKo = past ? (LINE_PAST_KO[key] ?? base.line) : base.line
  const baseLineEn = past ? (LINE_PAST_EN[key] ?? base.lineEn) : base.lineEn

  // 가리킬 만한 진짜 순풍(favor>0)이 없으면 강조 절을 붙이지 않는다 — 평탄/역풍
  // 곡선에 "가장 크게 힘을 실어줘요"를 붙이면 거짓이 된다.
  if (peak.favor <= 0) return { line: baseLineKo, lineEn: baseLineEn }

  // 그 대운에서 우호 방향을 끄는 십신(둘 다 같으면 stem, 다르면 stem 우선).
  const cat = peak.stemCat
  const yr = startYears.get(peak.startAge)
  const ageBand = ageBandKo(peak.startAge)

  // 정점 시점 디테일(연도 범위가 있으면 더 구체적으로).
  const whenKo = yr ? `${yr}년(${peak.startAge}세) 무렵` : `${ageBand}(${peak.startAge}세 무렵)`
  const whenEn = yr ? `around ${yr} (age ${peak.startAge})` : `around age ${peak.startAge}`

  const detailKo = past
    ? `특히 ${whenKo} ${CAT_KO[cat]} 쪽으로 가장 크게 힘이 실렸던 시기였어요.`
    : `특히 ${whenKo}부터 ${CAT_KO[cat]} 쪽으로 가장 크게 힘을 실어줘요.`
  const detailEn = past
    ? `Your strongest stretch was ${whenEn}, leaning toward ${CAT_EN[cat]}.`
    : `Your strongest stretch is ${whenEn} onward, leaning toward ${CAT_EN[cat]}.`

  return {
    line: `${baseLineKo} ${detailKo}`,
    lineEn: `${baseLineEn} ${detailEn}`,
  }
}

// 정점 시간 창을 단정하는 유형의 회고(past) 변형 — 그 창이 이미 지난 사람에게
// 미래 지시 어조 대신 과거형으로(감사 BUG-6). 미정의 유형은 base.line 유지.
const LINE_PAST_KO: Partial<Record<LifePatternKey, string>> = {
  'midlife-peak': '한낮의 해가 높이 떠오르듯, 인생의 한가운데서 가장 크게 펼쳐졌던 때예요.',
}
const LINE_PAST_EN: Partial<Record<LifePatternKey, string>> = {
  'midlife-peak': 'Like the noon sun at its height, your life opened widest at its middle.',
}

/**
 * 인생 유형(life pattern) — 대운 흐름을 읽어 사람마다 다른 생애 시나리오
 * (대기만성·초년발복·중년절정·굴곡…)를 도출한다. *사주* 개념이므로 라벨은
 * 사주 신호에서만 나온다(점성은 화면 곡선 텍스처일 뿐 라벨을 뒤집지 않는다).
 *
 * 각 대운의 우호 방향은 cycleTone.favorOf 로 잡는다 — 용신/희신=순(+)·기신/구신=
 * 고비(−)·한신=중립(0). 억부는 이미 용신 판정에 반영돼 있어(신약이면 관성·재성이
 * 기신으로 잡힘) 용신-오행 매칭만으로 "재다신약인데 초년 황금기" 같은 역전이 안 난다.
 * 용신에 오행 정보가 없을 때만 신강약×십신 fallback 으로 떨어진다(favorSign 주석 참고).
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
  | 'youth-peak' // 청년절정 (20~30대 정점)
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
  /** 서사의 첫 문장(인용 머리) — 정점 창이 지났으면 회고형. line 은 lead + body + (정점 절). */
  lead: string
  leadEn: string
  /** 서사의 나머지 문장(정점 절 제외). */
  body: string
  bodyEn: string
  /** 한 줄 태그 — '늦게 피어 오래가는' / 'Blooms late, lasts long'. */
  tagline: string
  taglineEn: string
  /**
   * 서사가 가리키는 정점 — 한 줄 서사 끝에 정점 절('… 2077년(80세) 무렵부터 …')을 붙였을 때만.
   * note 는 그 절 그대로(엔진 문구), past 는 정점이 이미 지났는지.
   */
  peak?: LifePatternPeak
  /** 대운별 방향 시퀀스. */
  daeun: DaeunFavor[]
}

export interface LifePatternPeak {
  age: number
  year: number
  past: boolean
  note: string
  noteEn: string
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

/**
 * 유형별 고정 문구. 한 줄 서사(line)는 `${lead} ${body}` — 화면은 lead 를 인용 머리로,
 * body 를 본문으로 나눠 그린다(v9.2 Life Reading). tagline 은 한 줄 태그(에센스) — 예전엔
 * components/calendar/lifeTypeStyle 에 따로 있었다. 상담사 · 캘린더는 line/lineEn 을 그대로 쓴다.
 */
interface PatternCopy {
  ko: string
  en: string
  /** 첫 문장(인용 머리). */
  lead: string
  leadEn: string
  /** 나머지 문장. */
  body: string
  bodyEn: string
  /** 한 줄 태그 — '늦게 피어 오래가는' / 'Blooms late, lasts long'. */
  tagline: string
  taglineEn: string
}

const PATTERN_KO: Record<LifePatternKey, PatternCopy> = {
  'late-bloomer': {
    ko: '대기만성형',
    en: 'Late bloomer',
    lead: '어릴 땐 “왜 나만 이렇게 더디지” 싶어 속으로 많이 앓았을 거예요.',
    leadEn: 'Early on you probably ached inside, wondering “why am I the slow one?”',
    body: '근데 당신은 원래 늦게 자리 잡는 사람이에요. 급하게 안 터지는 대신, 한번 잡으면 안 흔들려요. 나이 들수록 진가가 드러나는 쪽.',
    bodyEn:
      'But you’re simply built to land late. You don’t pop off early — yet once you settle in, you don’t waver. Your real worth shows more with age.',
    tagline: '늦게 피어 오래가는',
    taglineEn: 'Blooms late, lasts long',
  },
  'early-peak': {
    ko: '초년발복형',
    en: 'Early peak',
    lead: '당신은 아주 일찍부터 두각을 드러내는 사람이에요.',
    leadEn:
      'You stand out very early — your own color is already clear in childhood and your teens.',
    body: '어린 시절·10대에 이미 자기 색이 뚜렷하죠. 뒤로는 새로 벌이기보다, 그때 잡은 걸 지키고 다질 때 더 단단해져요.',
    bodyEn:
      'Later on, you grow steadier by protecting and refining what you grabbed then rather than starting new things.',
    tagline: '일찍부터 두각',
    taglineEn: 'Ahead from the start',
  },
  'youth-peak': {
    ko: '청년절정형',
    en: 'Youth peak',
    lead: '당신은 이십대·삼십대에 확 치고 나가는 사람이에요.',
    leadEn: 'You’re someone who breaks out hard in your twenties and thirties.',
    body: '남들 아직 몸 풀 때 이미 자기 걸 잡고 달리죠. 그 기세를 잘 굴리면 그때 만든 게 평생을 받쳐줘요.',
    bodyEn:
      'While others are still warming up, you’ve already grabbed your thing and started running. Ride that momentum well and what you build then carries the rest of your life.',
    tagline: '이십·삼십대가 전성기',
    taglineEn: 'Peaks in your 20s–30s',
  },
  'midlife-peak': {
    ko: '중년절정형',
    en: 'Midlife peak',
    lead: '당신의 전성기는 인생 한가운데예요.',
    leadEn: 'Your prime is the middle of life.',
    body: '젊을 때 쌓은 게 중년에 한꺼번에 터지는 타입. 그 길목에서 마음먹고 밀어붙이면 진짜 멀리 가요.',
    bodyEn:
      'You’re the type whose early groundwork all pays off at once in midlife. Make your move at that crossing and it truly carries far.',
    tagline: '한가운데가 절정',
    taglineEn: 'Peaks at the middle',
  },
  'steady-rise': {
    ko: '점진상승형',
    en: 'Steady rise',
    lead: '당신은 반짝 터지는 대신, 한 해 한 해 꾸준히 올라가는 사람이에요.',
    leadEn: 'Instead of flashing bright, you’re someone who climbs steadily year by year.',
    body: '조급해 보여도 결국 멈춘 적 없이 높아지는 게 당신 강점.',
    bodyEn: 'It can feel slow, but never once stalling is exactly your strength.',
    tagline: '멈춘 적 없이 오르는',
    taglineEn: 'Never stops climbing',
  },
  smooth: {
    ko: '순탄형',
    en: 'Smooth path',
    lead: '당신은 큰 사건 없이 무던하게 흘러가는 편이에요.',
    leadEn: 'You tend to move through life without big incidents.',
    body: '극적인 반전은 적어도, 그만큼 흔들림 없이 꾸준히 멀리 가는 힘이 있어요.',
    bodyEn:
      'There’s little dramatic reversal — and that’s exactly what lets you keep going far, unshaken.',
    tagline: '큰 파도 없이 멀리',
    taglineEn: 'Calm and far-reaching',
  },
  hard: {
    ko: '인고형',
    en: 'The long haul',
    lead: '쉬운 길은 아니었을 거예요.',
    leadEn:
      'It probably wasn’t an easy road — you’ve had to try harder than most, again and again.',
    body: '남들보다 애써야 하는 일이 유독 많았던 사람. 근데 그렇게 버틴 만큼, 어지간한 일엔 안 흔들리는 단단함이 생겼어요.',
    bodyEn: 'But all that enduring gave you a solidness ordinary troubles can’t shake.',
    tagline: '버틴 만큼 단단한',
    taglineEn: 'Forged by endurance',
  },
  undulating: {
    ko: '굴곡형',
    en: 'Ups and downs',
    lead: '당신은 좋을 때와 힘든 때가 크게 번갈아 오는 사람이에요.',
    leadEn: 'For you, good stretches and hard stretches swing back and forth in a big way.',
    body: '기복이 있는 대신, 그 리듬을 읽을 줄만 알면 오히려 그게 남들 없는 무기가 돼요.',
    bodyEn:
      'The ups and downs are real — but once you learn to read that rhythm, it becomes a weapon others don’t have.',
    tagline: '오르내림이 무기인',
    taglineEn: 'Rides the waves',
  },
}

/** 인용 머리 + 본문 → 한 줄 서사. 본문이 없으면 머리만. */
const joinLine = (lead: string, body: string): string => (body ? `${lead} ${body}` : lead)

/** 유형 한 줄 태그(ko/en) — 미정의 키면 null. */
export function lifePatternTagline(key: string | undefined): { ko: string; en: string } | null {
  const c =
    key && Object.prototype.hasOwnProperty.call(PATTERN_KO, key)
      ? PATTERN_KO[key as LifePatternKey]
      : undefined
  return c ? { ko: c.tagline, en: c.taglineEn } : null
}

/** 정점 시점을 단정하는 유형 — favor 가 없어도 곡선 마루 시점만이라도 붙여 화면
 * 곡선과 한 줄 서사가 어긋나지 않게 한다(굴곡/순탄/고전은 정점을 단정하지 않음). */
const PEAK_WINDOW_KEYS = new Set<LifePatternKey>([
  'late-bloomer',
  'steady-rise',
  'midlife-peak',
  'youth-peak',
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

  const p = personalize(key, seq, startYears, currentAge, curvePeakAge)
  const copy = PATTERN_KO[key]
  return {
    key,
    ko: copy.ko,
    en: copy.en,
    line: p.line,
    lineEn: p.lineEn,
    lead: p.lead,
    leadEn: p.leadEn,
    body: p.body,
    bodyEn: p.bodyEn,
    tagline: copy.tagline,
    taglineEn: copy.taglineEn,
    ...(p.peak ? { peak: p.peak } : {}),
    daeun: seq,
  }
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
  // 화면 4단계(초년 0-19 / 청년 20-39 / 중년 40-59 / 장년 60+)와 *같은 밴드*로 분류해
  // 라벨↔단계 톤↔곡선이 구조적으로 일치하게 한다(감사 30인: 초년발복인데 초년 곡선이
  // 낮고 청년이 정점인 오분류 다수 — 초년/청년을 한 밴드로 뭉치던 옛 seg(12,38) 탓).
  const s1 = seg(0, 20) // 초년
  const s2 = seg(20, 40) // 청년
  const s3 = seg(40, 60) // 중년
  const s4 = seg(60, 85) // 장년
  const bands = [s1, s2, s3, s4]
  const maxV = Math.max(...bands)
  const minV = Math.min(...bands)
  const maxI = bands.indexOf(maxV)
  const D = 0.1
  let key: LifePatternKey
  if (maxV - minV < 0.18) {
    // 밴드 편차가 작음 — 뚜렷한 정점/골 없이 무난.
    key = 'smooth'
  } else if (realDip && ((s2 + D < s1 && s2 + D < s3) || (s3 + D < s2 && s3 + D < s4))) {
    // 가운데(청년 또는 중년)가 양옆보다 꺼진 V — 실 저점 있을 때만 굴곡형.
    key = 'undulating'
  } else if (maxI === 0) {
    key = 'early-peak' // 초년(0-19) 정점
  } else if (maxI === 1) {
    key = 'youth-peak' // 청년(20-39) 정점
  } else if (maxI === 2) {
    key = 'midlife-peak' // 중년(40-59) 정점
  } else {
    // 장년(60+) 정점 — 초년 저점에서의 반전이면 대기만성, 실 저점 없는 완만한
    // 오름이면 점진상승.
    const monotoneRise = s1 <= s2 + 1e-9 && s2 <= s3 + 1e-9 && s3 <= s4 + 1e-9
    key = monotoneRise && !realDip ? 'steady-rise' : 'late-bloomer'
  }
  // 정점 나이는 *유형이 가리키는 밴드* 안의 최댓값으로 — 서사 "정점 시점"과 곡선
  // 마루가 어긋나지 않게. early-peak 은 진짜 초년(0-19), youth-peak 은 청년(20-39).
  const win: [number, number] =
    key === 'late-bloomer' || key === 'steady-rise'
      ? [55, 85]
      : key === 'early-peak'
        ? [3, 20]
        : key === 'youth-peak'
          ? [20, 40]
          : key === 'midlife-peak'
            ? [40, 60]
            : [16, 85]
  const wp = p.filter((x) => x.age >= win[0] && x.age < win[1])
  let pool = wp.length ? wp : p
  // 현재 나이를 알면 *가까운 지평*(현재−3 ~ +28년) 안의 정점을 우선한다 — 31세에게
  // "81세부터 가장 크게"처럼 50년 뒤 정점을 가리키면 비현실적이라(사용자 지적).
  // 단, 대기만성·점진상승은 정점이 *본래 말년(장년 60+)* 이라 지평으로 자르면 젊은
  // 사람의 하이라이트가 실제 장년 마루가 아니라 중년 끝(55~59)으로 당겨져 곡선과
  // 어긋난다(감사 30인: "57세 가장 환하게"인데 곡선 정점은 장년). 이 두 유형은
  // 지평 캡을 걸지 않고 장년 창의 실제 최댓값을 그대로 가리킨다.
  const farPeakType = key === 'late-bloomer' || key === 'steady-rise'
  if (typeof currentAge === 'number' && !farPeakType) {
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

/** 서사 머리 · 본문(정점 창이 지났으면 회고형) — line 의 정점 절 앞부분. */
interface StoryBase {
  lead: string
  leadEn: string
  body: string
  bodyEn: string
}

interface Personalized extends StoryBase {
  line: string
  lineEn: string
  peak?: LifePatternPeak
}

/** 유형의 서사 머리 · 본문 — past 이고 회고 변형이 있으면 그것. */
function storyBase(key: LifePatternKey, past: boolean): StoryBase {
  const c = PATTERN_KO[key]
  const p = past ? STORY_PAST[key] : undefined
  return p ?? { lead: c.lead, leadEn: c.leadEn, body: c.body, bodyEn: c.bodyEn }
}

/** 정점 절을 붙인 결과 — line = 머리 + 본문 + 절, peak = 그 절의 구조. */
function withPeak(
  base: StoryBase,
  noteKo: string,
  noteEn: string,
  at: { age: number; year: number | undefined; past: boolean }
): Personalized {
  return {
    ...base,
    line: `${joinLine(base.lead, base.body)} ${noteKo}`,
    lineEn: `${joinLine(base.leadEn, base.bodyEn)} ${noteEn}`,
    // 연도를 모르면(대운 시작 연도 없음) 구조 필드는 싣지 않는다 — 서사 문장만.
    ...(at.year != null
      ? { peak: { age: at.age, year: at.year, past: at.past, note: noteKo, noteEn } }
      : {}),
  }
}

/** 정점 절 없이 — 머리 + 본문만. */
function plain(base: StoryBase): Personalized {
  return {
    ...base,
    line: joinLine(base.lead, base.body),
    lineEn: joinLine(base.leadEn, base.bodyEn),
  }
}

/**
 * 한 줄 서사를 생애 곡선의 *정점 대운* 으로 개인화한다. 같은 유형 키라도 정점이
 * 오는 나이·연도·우호 십신이 사람마다 달라 문장이 갈린다(제너릭 폴백 제거).
 * 정점 절을 붙였으면 그 정점(나이 · 연도 · 절 문장)을 구조로도 돌려준다(peak).
 */
function personalize(
  key: LifePatternKey,
  seq: DaeunFavor[],
  startYears: Map<number, number>,
  currentAge?: number,
  curvePeakAge?: number
): Personalized {
  if (seq.length === 0) return plain(storyBase(key, false))

  // 곡선 정점 나이가 주어지면(B1) 그 나이를 덮는 대운을 정점으로 — lifePattern 의
  // "정점 시점"이 화면의 곡선 마루와 일치한다. 십신(cat)·연도·시제 모두 그 기준.
  if (typeof curvePeakAge === 'number') {
    const covering = seq.filter((c) => c.startAge <= curvePeakAge).slice(-1)[0] ?? seq[0]
    const past = typeof currentAge === 'number' ? curvePeakAge < currentAge : false
    const base = storyBase(key, past)
    const cat = covering.stemCat
    const baseYr = startYears.get(covering.startAge)
    const yr = baseYr != null ? baseYr + (curvePeakAge - covering.startAge) : undefined
    const at = { age: curvePeakAge, year: yr, past }
    const whenKo = yr
      ? `${yr}년(${curvePeakAge}세) 무렵`
      : `${ageBandKo(curvePeakAge)}(${curvePeakAge}세 무렵)`
    const whenEn = yr ? `around ${yr} (age ${curvePeakAge})` : `around age ${curvePeakAge}`
    // 정점 대운의 십신 우호(favor)가 없어도, 정점 시점을 단정하는 유형은 *곡선 마루
    // 시점*만이라도 붙여 base.line 의 막연한 어조와 화면 곡선이 어긋나지 않게 한다
    // (예: late-bloomer 인데 곡선 마루가 60대면 "마흔" 대신 실제 60대를 가리킨다).
    // 십신 방향은 favor 가 양일 때만 단정한다(없으면 시점만).
    if (covering.favor <= 0) {
      if (!PEAK_WINDOW_KEYS.has(key)) return plain(base)
      const tKo = past
        ? `특히 ${whenKo}, 가장 깊이 무르익었던 철이었어요.`
        : `특히 ${whenKo}부터, 가장 깊이 무르익는 철이에요.`
      const tEn = past
        ? `Your fullest ripening was ${whenEn}.`
        : `Your fullest ripening comes ${whenEn} onward.`
      return withPeak(base, tKo, tEn, at)
    }
    const detailKo = past
      ? `특히 ${whenKo}, ${CAT_KO[cat]} 쪽으로 가장 크게 열렸던 때였어요.`
      : `특히 ${whenKo}부터, ${CAT_KO[cat]} 쪽으로 가장 크게 열려요.`
    const detailEn = past
      ? `It opened widest ${whenEn}, toward ${CAT_EN[cat]}.`
      : `It opens widest ${whenEn} onward, toward ${CAT_EN[cat]}.`
    return withPeak(base, detailKo, detailEn, at)
  }

  // 정점 대운을 *유형 서사가 가리키는 구간* 안에서 고른다 — 그래야 "대기만성인데
  // 정점이 한 살" 같은 자기모순이 안 난다.
  //   late-bloomer/steady-rise → 후반(40세~), early-peak → 전반(~40세),
  //   midlife-peak → 중년(35~60), undulating/smooth/hard → 활동기 전체(~75세).
  const inWindow = (c: DaeunFavor): boolean => {
    if (key === 'late-bloomer' || key === 'steady-rise') return c.startAge >= 40
    if (key === 'early-peak') return c.startAge < 22
    if (key === 'youth-peak') return c.startAge >= 18 && c.startAge < 42
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
  const base = storyBase(key, past)

  // 가리킬 만한 진짜 순풍(favor>0)이 없으면 강조 절을 붙이지 않는다 — 평탄/역풍
  // 곡선에 "가장 크게 힘을 실어줘요"를 붙이면 거짓이 된다.
  if (peak.favor <= 0) return plain(base)

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

  return withPeak(base, detailKo, detailEn, { age: peak.startAge, year: yr, past })
}

// 정점 시간 창을 단정하는 유형의 회고(past) 변형 — 그 창이 이미 지난 사람에게
// 미래 지시 어조 대신 과거형으로(감사 BUG-6). 미정의 유형은 기본 머리 · 본문 유지.
// 한 문장짜리 회고(midlife-peak EN)는 본문이 비어 있다 — line 은 머리만.
const STORY_PAST: Partial<Record<LifePatternKey, StoryBase>> = {
  'midlife-peak': {
    lead: '당신의 전성기는 인생 한가운데였어요.',
    body: '젊을 때 쌓은 게 그 무렵 한꺼번에 터졌던 사람.',
    leadEn:
      'Your prime was the middle of life — the type whose early groundwork all paid off at once back then.',
    bodyEn: '',
  },
  'youth-peak': {
    lead: '당신은 이십대·삼십대에 확 치고 나갔던 사람이에요.',
    body: '그때 만든 게 지금까지 받쳐줘요.',
    leadEn: 'You broke out hard in your twenties and thirties.',
    bodyEn: 'What you built then still holds you up today.',
  },
}

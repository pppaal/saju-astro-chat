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

/** 신강약(또는 중화는 용신)으로 한 카테고리의 우호 부호. */
function favorOf(
  cat: SibsinCategory,
  el: string,
  strength: Strength,
  yong: Set<string>,
  avoid: Set<string>
): number {
  if (strength === 'weak') return cat === '비겁' || cat === '인성' ? 1 : -1
  if (strength === 'strong') return cat === '식상' || cat === '재성' || cat === '관성' ? 1 : -1
  // 중화 — 방향이 약하므로 용신/기신 오행으로.
  if (yong.has(el)) return 1
  if (avoid.has(el)) return -1
  return 0
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
      line: '젊을 때는 좀 고생해도, 마흔 넘어가면서 자리 잡고 늦게 잘 풀리는 편이에요.',
      lineEn: 'A rougher start, but from your forties on, things settle and finally open up.',
    },
    'early-peak': {
      ko: '초년발복형',
      en: 'Early peak',
      line: '젊을 때 빨리 자리 잡는 편이고, 나이 들수록 무리하기보다 지키는 게 나아요.',
      lineEn: 'You find your footing early; later in life, holding steady beats overreaching.',
    },
    'midlife-peak': {
      ko: '중년절정형',
      en: 'Midlife peak',
      line: '마흔~쉰 무렵에 가장 크게 풀려요. 그때 승부를 보면 좋아요.',
      lineEn: 'Things open widest in your forties to fifties — a good window to make your move.',
    },
    'steady-rise': {
      ko: '점진상승형',
      en: 'Steady rise',
      line: '나이 들수록 조금씩 좋아지는 편이에요.',
      lineEn: 'Things tend to get a little better with each decade.',
    },
    smooth: {
      ko: '순탄형',
      en: 'Smooth path',
      line: '큰 굴곡 없이 무난하게 흘러가는 편이에요.',
      lineEn: 'Your life tends to flow without big swings.',
    },
    hard: {
      ko: '인고형',
      en: 'The long haul',
      line: '전반적으로 쉽지 않아서, 버티면서 단단해지는 편이에요.',
      lineEn: 'Not an easy road overall — you grow tougher by enduring.',
    },
    undulating: {
      ko: '굴곡형',
      en: 'Ups and downs',
      line: '좋을 때와 힘들 때가 번갈아 와요. 타이밍을 잘 보면 좋아요.',
      lineEn: 'Good spells and hard spells alternate — read the timing well.',
    },
  }

export function deriveLifePattern(saju: SajuLike): LifePattern | null {
  const dm = saju.dayMaster?.name
  const daeun = saju.daeun ?? []
  if (!dm || daeun.length === 0) return null
  const dmEl = getStemElement(dm)
  const strength = saju.strength ?? 'medium'
  const yong = new Set(
    [saju.yongsin?.primary, saju.yongsin?.secondary].filter((x): x is string => !!x)
  )
  const avoid = new Set(saju.yongsin?.avoid ?? [])

  const startYears = new Map<number, number>()
  const seq: DaeunFavor[] = daeun.map((d) => {
    const se = getStemElement(d.stem)
    const be = getBranchElement(d.branch)
    const stemCat = categoryOf(dmEl, se)
    const branchCat = categoryOf(dmEl, be)
    const favor =
      favorOf(stemCat, se, strength, yong, avoid) + favorOf(branchCat, be, strength, yong, avoid)
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

  // 분류 순서가 핵심: "형태가 뚜렷한" 시나리오(고전·굴곡·중년절정·반전)를 먼저 잡고,
  // 그다음 단조 흐름(초년발복·점진상승), 마지막에 무난(순탄)으로 떨어뜨린다.
  // 이렇게 해야 steady-rise/hard/undulating 이 위 버킷에 다 흡수되지 않고 실제로 발화한다.
  let key: LifePatternKey
  if (mean <= -0.4 && maxSeg < 0.5) {
    // 전반적 고전 — 어느 구간도 뚜렷이 풀리지 않고 평균이 음수.
    key = 'hard'
  } else if (early - mid >= D && late - mid >= D) {
    // 굴곡형 — 중년이 양옆보다 분명히 꺼진 V자 골.
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

  const { line, lineEn } = personalize(key, seq, startYears)
  return { key, ...PATTERN_KO[key], line, lineEn, daeun: seq }
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
  startYears: Map<number, number>
): { line: string; lineEn: string } {
  const base = PATTERN_KO[key]
  if (seq.length === 0) return { line: base.line, lineEn: base.lineEn }

  // 정점 대운을 *유형 서사가 가리키는 구간* 안에서 고른다 — 그래야 "대기만성인데
  // 정점이 한 살" 같은 자기모순이 안 난다. 같은 키라도 그 구간 안 최고 favor 대운의
  // 나이·연도·십신이 사람마다 달라 문장이 갈린다.
  //   late-bloomer/steady-rise → 후반(40세~), early-peak → 전반(~40세),
  //   midlife-peak → 중년(35~60), undulating/smooth/hard → 활동기 전체(~75세).
  const inWindow = (c: DaeunFavor): boolean => {
    if (key === 'late-bloomer' || key === 'steady-rise') return c.startAge >= 40
    if (key === 'early-peak') return c.startAge < 40
    if (key === 'midlife-peak') return c.startAge >= 35 && c.startAge < 60
    return c.startAge < 75 // undulating / smooth / hard
  }
  const windowed = seq.filter(inWindow)
  const pool = windowed.length ? windowed : seq
  // favor 동률이면 더 빠른(먼저 오는) 대운을 정점으로 — reduce 가 첫 최대를 유지.
  const peak = pool.reduce((best, c) => (c.favor > best.favor ? c : best), pool[0])
  // 그 대운에서 우호 방향을 끄는 십신(둘 다 같으면 stem, 다르면 stem 우선).
  const cat = peak.stemCat
  const yr = startYears.get(peak.startAge)
  const ageBand = ageBandKo(peak.startAge)

  // 정점 시점 디테일(연도 범위가 있으면 더 구체적으로).
  const whenKo = yr ? `${yr}년(${peak.startAge}세) 무렵부터` : `${ageBand}(${peak.startAge}세 무렵)`
  const whenEn = yr ? `around ${yr} (age ${peak.startAge})` : `around age ${peak.startAge}`

  const detailKo = `특히 ${whenKo} ${CAT_KO[cat]} 쪽으로 가장 크게 힘을 실어줘요.`
  const detailEn = `Your strongest stretch is ${whenEn}, leaning toward ${CAT_EN[cat]}.`

  return {
    line: `${base.line} ${detailKo}`,
    lineEn: `${base.lineEn} ${detailEn}`,
  }
}

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
  daeun?: Array<{ stem: string; branch: string; startAge: number }>
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

  const seq: DaeunFavor[] = daeun.map((d) => {
    const se = getStemElement(d.stem)
    const be = getBranchElement(d.branch)
    const stemCat = categoryOf(dmEl, se)
    const branchCat = categoryOf(dmEl, be)
    const favor =
      favorOf(stemCat, se, strength, yong, avoid) + favorOf(branchCat, be, strength, yong, avoid)
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
  const M = 0.5

  let key: LifePatternKey
  if (late > early + M && late >= mid - 0.1) key = 'late-bloomer'
  else if (early > late + M && early >= mid - 0.1) key = 'early-peak'
  else if (mid > early + M && mid > late + M) key = 'midlife-peak'
  else if (late > mid && mid > early) key = 'steady-rise'
  else if (early > 0.3 && mid > 0.3 && late > 0.3) key = 'smooth'
  else if (early < -0.3 && mid < -0.3 && late < -0.3) key = 'hard'
  else key = 'undulating'

  return { key, ...PATTERN_KO[key], daeun: seq }
}

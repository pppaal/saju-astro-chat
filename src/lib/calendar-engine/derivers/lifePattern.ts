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
  /** 한 줄 서사. */
  line: string
  /** 대운별 방향 시퀀스. */
  daeun: DaeunFavor[]
}

const GEN: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CTRL: Record<string, string> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }

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

const PATTERN_KO: Record<LifePatternKey, { ko: string; line: string }> = {
  'late-bloomer': {
    ko: '대기만성형',
    line: '젊을 때 힘이 부치다가 중년 이후 내 편이 붙어 늦게 단단해지는 결이에요.',
  },
  'early-peak': {
    ko: '초년발복형',
    line: '일찍 기운이 트여 앞서 나가고, 후반엔 지킴·정리가 중요해지는 결이에요.',
  },
  'midlife-peak': {
    ko: '중년절정형',
    line: '중년에 무대가 가장 크게 열리는 결 — 그 시기에 승부를 거는 타입이에요.',
  },
  'steady-rise': { ko: '점진상승형', line: '나이 들수록 차근차근 올라가는 결이에요.' },
  smooth: { ko: '순탄형', line: '큰 굴곡 없이 고르게 흐르는 결이에요.' },
  hard: { ko: '인고형', line: '전반적으로 버티며 다지는 결 — 환경보다 내공으로 가는 타입이에요.' },
  undulating: { ko: '굴곡형', line: '오르내림이 번갈아 오는 결 — 시기를 골라 움직이면 좋아요.' },
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

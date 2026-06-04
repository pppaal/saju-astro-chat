/**
 * 순탄/고비 톤 — 신강·신약 × 십신으로 그 주기(대운·세운·월운·일진)가 우호적인지
 * 힘에 부치는지 판정해 한 줄로 푼다. 인생 흐름(대운)과 올해·이달·오늘 탭이 *같은*
 * 규칙을 쓰도록 여기에 모은다(SSOT). 결정론적·LLM 무사용.
 *
 * 원리: 신약(身弱)은 일간을 받쳐주는 인성·비겁이 우호, 기운을 빼가거나 치는
 * 식상·재성·관성이 고비. 신강(身强)은 반대 — 같은 십신도 사람마다 다르게 읽힌다.
 */
// SSOT: 십신 카테고리 타입과 10→5 매핑은 chart-dictionary 에 정의.
// 여기서는 기존 import 사이트(matcher/lifetimeFlow/dateDetail)가 그대로 동작하도록
// 동일한 이름으로 alias 후 re-export 한다.
import type { SibsinCategory } from '@/lib/chart-dictionary'
export { SIBSIN_NAME_TO_CATEGORY as SIBSIN_CAT } from '@/lib/chart-dictionary'
export type SibsinCat = SibsinCategory

export type Favor = 'good' | 'hard' | 'mid'

/** 용신 구조 (오행 한글: 목·화·토·금·수). avoid = 기신·구신. */
export interface YongsinLike {
  primary?: string
  secondary?: string
  avoid?: string[]
}

/**
 * 그 주기가 순탄/고비인지. **모든 조합**을 덮는다:
 *  1순위 — 용신운 판정(가장 정확): 그 주기 오행이 용신/희신이면 순탄, 기신/구신이면
 *          고비, 한신이면 중립. (예: 병오 정관이라도 火가 용신이면 '순탄')
 *  2순위 — 오행/용신 정보가 없을 때만 신강·신약 × 십신 fallback.
 */
export function favorOf(
  strength: string | undefined,
  cat: SibsinCat,
  element?: string,
  yongsin?: YongsinLike
): Favor {
  if (element && yongsin) {
    if (element === yongsin.primary || element === yongsin.secondary) return 'good'
    if (yongsin.avoid?.includes(element)) return 'hard'
    return 'mid'
  }
  const support: SibsinCat[] = ['인성', '비겁']
  if (strength === 'weak') return support.includes(cat) ? 'good' : 'hard'
  if (strength === 'strong') return support.includes(cat) ? 'hard' : 'good'
  return 'mid'
}

// 십신 짧은 테마 — 괄호로 한 번만. 풀어쓴 문장은 간지 룰(계사 月…)과 겹쳐서 압축.
const SIBSIN_SHORT: Record<SibsinCat, string> = {
  재성: '돈·현실',
  관성: '책임·자리',
  식상: '표현·재능',
  비겁: '경쟁·독립',
  인성: '배움·내면',
}
const PERIOD_LEAD: Record<'year' | 'month' | 'day', string> = {
  year: '올해는',
  month: '이달은',
  day: '오늘은',
}
// 순탄/고비 결론 — 같은 십신도 신강·신약(용신)에 따라 다른 말. (period × favor)
const FAV_CLAUSE: Record<'year' | 'month' | 'day', Record<Favor, string>> = {
  year: {
    good: '기운이 잘 받쳐줘서 밀어붙인 만큼 결과가 따라와요.',
    hard: '힘이 실리는 자리라, 무리한 확장보다 내실·건강을 먼저 챙기는 게 이득이에요.',
    mid: '큰 굴곡 없이 꾸준함이 그대로 성과가 되는 흐름이에요.',
  },
  month: {
    good: '받쳐주는 흐름이라 손댄 일이 매끄럽게 풀려요.',
    hard: '힘이 좀 실리니 한 번에 다 하려 말고 중요한 것부터 천천히 가세요.',
    mid: '무난한 흐름이라 벌여둔 일을 차분히 마무리하기 좋아요.',
  },
  day: {
    good: '기운이 우호적이라 평소보다 잘 풀리는 날이에요.',
    hard: '기운이 조금 거스르는 날이라, 무리한 결정·충돌은 피하고 가볍게 가세요.',
    mid: '평이한 날이라 루틴을 지키며 무던하게 보내기 좋아요.',
  },
}

/**
 * 그 주기의 십신 + 일간 강약(용신) → 사주 순탄/고비 한 줄 (ko). 십신명 + 짧은
 * 테마(괄호)만 달고 곧장 순탄/고비 결론으로 — 풀어쓰면 간지 룰과 겹쳐서 압축.
 * 못 구하면 undefined.
 */
export function deriveCycleTone(
  period: 'year' | 'month' | 'day',
  strength: string | undefined,
  cat: SibsinCat | undefined,
  element?: string,
  yongsin?: YongsinLike
): string | undefined {
  if (!cat) return undefined
  const fav = favorOf(strength, cat, element, yongsin)
  return `${PERIOD_LEAD[period]} ${cat}운(${SIBSIN_SHORT[cat]}) — ${FAV_CLAUSE[period][fav]}`
}

// 점성 순탄/고비 — period별 문구. year 는 프로펙션 줄 뒤에 이어 붙어 '점성으로는' 생략.
const ASTRO_CLAUSE: Record<'year' | 'month' | 'day', Record<Favor, string>> = {
  year: {
    good: '본명에 닿는 흐름도 대체로 우호적이라, 새 시도·확장에 바람이 실려요.',
    hard: '다만 본명을 흔드는 각도가 강한 해라, 변화·관계의 시험이 잦으니 단단히 버티는 게 나아요.',
    mid: '본명에 닿는 흐름은 좋고 나쁨이 섞여, 시기별로 결이 갈려요.',
  },
  month: {
    good: '점성으로도 이번 달 본명에 닿는 각도가 대체로 우호적이라, 큰 마찰 없이 흐름을 타기 좋아요.',
    hard: '점성으로는 이번 달 본명에 부딪히는 각도가 많아, 관계·결정에서 마찰이 생기기 쉬우니 한 박자 늦춰 가세요.',
    mid: '점성으로는 이번 달 본명에 닿는 각도가 좋고 나쁨이 팽팽히 섞여, 날마다 결이 갈려요.',
  },
  day: {
    good: '점성으로도 오늘 본명에 닿는 각도가 우호적이라, 흐름을 타기 좋은 날이에요.',
    hard: '점성으로는 오늘 본명에 부딪히는 각도가 있어, 마찰·충돌은 피하고 가볍게 가세요.',
    mid: '점성으로는 오늘 본명에 닿는 각도가 섞여, 상황 봐가며 움직이는 게 나아요.',
  },
}

/**
 * 점성 순탄/고비 한 줄 — transit 이 *본명 차트*에 닿는 각도(natal aspect)의 polarity
 * 합 부호로 판정. '그 시기 하늘'(만인 공통)이 아니라 개인 차트 대비라 사람마다 갈린다.
 * 올해·이달·오늘 모두 같은 방식 — 사주(용신) 톤과 짝을 이뤄 9조합을 만든다.
 */
export function deriveAstroTone(
  period: 'year' | 'month' | 'day',
  signals: Array<{ source?: string; kind?: string; korean?: string; polarity?: number; weight?: number }>
): string | undefined {
  let sum = 0
  let n = 0
  for (const s of signals) {
    if (s.source !== 'astro' || s.kind !== 'transit') continue
    if (!(s.korean ?? '').includes('본명')) continue
    sum += (s.polarity ?? 0) * (s.weight ?? 1)
    n++
  }
  if (n === 0) return undefined
  const thr = period === 'day' ? 0 : 1 // 하루는 신호가 적어 부호만으로
  const fav: Favor = sum > thr ? 'good' : sum < -thr ? 'hard' : 'mid'
  return ASTRO_CLAUSE[period][fav]
}

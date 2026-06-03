/**
 * 순탄/고비 톤 — 신강·신약 × 십신으로 그 주기(대운·세운·월운·일진)가 우호적인지
 * 힘에 부치는지 판정해 한 줄로 푼다. 인생 흐름(대운)과 올해·이달·오늘 탭이 *같은*
 * 규칙을 쓰도록 여기에 모은다(SSOT). 결정론적·LLM 무사용.
 *
 * 원리: 신약(身弱)은 일간을 받쳐주는 인성·비겁이 우호, 기운을 빼가거나 치는
 * 식상·재성·관성이 고비. 신강(身强)은 반대 — 같은 십신도 사람마다 다르게 읽힌다.
 */
export type SibsinCat = '관성' | '재성' | '식상' | '비겁' | '인성'

/** 정/편 십신 10종 → 5 카테고리 */
export const SIBSIN_CAT: Record<string, SibsinCat> = {
  비견: '비겁',
  겁재: '비겁',
  식신: '식상',
  상관: '식상',
  정재: '재성',
  편재: '재성',
  정관: '관성',
  편관: '관성',
  정인: '인성',
  편인: '인성',
}

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

const SIBSIN_THEME: Record<SibsinCat, string> = {
  재성: '돈·현실 성취가 전면에 나오는',
  관성: '책임·자리·평가가 들어오는',
  식상: '표현·재능·아이디어가 살아나는',
  비겁: '경쟁·독립·내 힘으로 밀어붙이는',
  인성: '배움·내면·받쳐주는 힘이 깊어지는',
}
const PERIOD_LEAD: Record<'year' | 'month' | 'day', string> = {
  year: '올해는',
  month: '이달은',
  day: '오늘은',
}
// 받침 맞춘 종결('날'은 이에요)
const PERIOD_TAIL: Record<'year' | 'month' | 'day', string> = {
  year: '해예요',
  month: '시기예요',
  day: '날이에요',
}
// 순탄/고비 결론 — 같은 십신도 신강·신약에 따라 다른 말. (period × favor)
const FAV_CLAUSE: Record<'year' | 'month' | 'day', Record<Favor, string>> = {
  year: {
    good: '기운이 잘 받쳐줘서 밀어붙인 만큼 결과가 따라와요.',
    hard: '다만 그만큼 힘이 실리는 자리라, 무리한 확장보다 내실·건강을 먼저 챙기는 게 이득이에요.',
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
 * 그 주기의 십신 + 일간 강약 → 사주 순탄/고비 한 줄 (ko). 십신을 문장에 박아
 * "무엇에 관한 시기인지"까지 말한다(같은 십신×강약이면 같은 문장, 5×3=15종/주기).
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
  return `${PERIOD_LEAD[period]} ${cat}운 — ${SIBSIN_THEME[cat]} ${PERIOD_TAIL[period]}. ${FAV_CLAUSE[period][fav]}`
}

const ASTRO_MONTH_CLAUSE: Record<Favor, string> = {
  good: '점성으로도 이번 달 본명에 닿는 각도가 대체로 우호적이라, 큰 마찰 없이 흐름을 타기 좋아요.',
  hard: '점성으로는 이번 달 본명에 부딪히는 각도가 많아, 관계·결정에서 마찰이 생기기 쉬우니 한 박자 늦춰 가세요.',
  mid: '점성으로는 이번 달 본명에 닿는 각도가 좋고 나쁨이 팽팽히 섞여, 날마다 결이 갈려요.',
}

/**
 * 이달 점성 한 줄 — 그 달 transit 이 *본명 차트*에 닿는 각도(natal aspect)의 우호/
 * 마찰 합으로 판정. '그 달 하늘'(만인 공통)이 아니라 개인 차트 대비라 사람마다 갈린다.
 * astro·transit·'본명' 포함 신호의 polarity×weight 합 부호로 good/hard/mid.
 */
export function deriveAstroMonthTone(
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
  const fav: Favor = sum > 1 ? 'good' : sum < -1 ? 'hard' : 'mid'
  return ASTRO_MONTH_CLAUSE[fav]
}

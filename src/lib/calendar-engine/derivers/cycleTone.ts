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

export function favorOf(strength: string | undefined, cat: SibsinCat): Favor {
  const support: SibsinCat[] = ['인성', '비겁']
  if (strength === 'weak') return support.includes(cat) ? 'good' : 'hard'
  if (strength === 'strong') return support.includes(cat) ? 'hard' : 'good'
  return 'mid'
}

const TONE: Record<'year' | 'month' | 'day', Record<Favor, string>> = {
  year: {
    good: '올해는 사주 흐름이 순한 편이라, 욕심만 줄이면 노력한 만큼 결과가 따라와요.',
    hard: '올해는 사주 흐름이 만만치 않아요. 무리한 확장보다 자기 페이스와 건강을 지키는 게 이득이에요.',
    mid: '올해는 큰 굴곡 없이 평이한 흐름이라, 꾸준함이 그대로 성과가 돼요.',
  },
  month: {
    good: '이달은 기운이 받쳐줘서 일이 비교적 매끄럽게 풀려요.',
    hard: '이달은 힘이 좀 부치는 흐름이에요. 한 번에 다 하려 말고 중요한 것부터 천천히 가세요.',
    mid: '이달은 무난한 흐름이라, 벌여둔 일을 차분히 마무리하기 좋아요.',
  },
  day: {
    good: '오늘은 기운이 우호적이라 평소보다 일이 잘 풀리는 날이에요.',
    hard: '오늘은 기운이 조금 거슬리는 날이라, 무리한 결정·충돌은 피하고 가볍게 가세요.',
    mid: '오늘은 평이한 날이라, 루틴을 지키며 무던하게 보내기 좋아요.',
  },
}

/** 그 주기의 십신 카테고리 + 일간 강약 → 순탄/고비 한 줄 (ko). 못 구하면 undefined. */
export function deriveCycleTone(
  period: 'year' | 'month' | 'day',
  strength: string | undefined,
  cat: SibsinCat | undefined
): string | undefined {
  if (!cat) return undefined
  return TONE[period][favorOf(strength, cat)]
}

/**
 * deriveMonthSummary — 그 달 데이터를 이어지는 자연스러운 총평 문단으로 합성.
 *
 * 기존 월 narrative 는 인트로 1줄 + topReason 토막 4개라, 정작 계산돼 있는
 * 타이밍(best/caution/converge 날짜·이유)·전반 톤·지배 테마를 글에 안 녹였다.
 * 이 deriver 는 그 조각들을 연결어로 이어 한 문단으로 만든다 — 결정적(LLM 없음).
 * 더 매끄럽게 원하면 이 출력을 LLM 후처리로 다듬는 단계만 얹으면 된다.
 *
 * 순수 함수 — 이미 파생된 값만 입력. (점수·신호 재계산 없음.)
 *
 * 개인화: 각 문장 역할(role)마다 동의어 풀을 두고 personSeed 로 회전해 사람마다
 * 다른 문구를 결정론적으로 고른다. 판단(톤·날수·날짜·근거)은 그대로, *표현*만
 * 바뀐다. role 별로 다른 key 를 줘서 한 문단 안에서도 같은 index 가 재사용되지
 * 않도록 한다.
 */

import { pickBySeed } from './personSeed'

export interface MonthSummaryInput {
  /** 월운 한글 (예: '갑오') — 없으면 생략. */
  woolunKr?: string
  /** 그 달 band 분포 — 좋은 날 / 주의 날 / 전체. */
  goodDays: number
  cautionDays: number
  /**
   * 나쁜 날(band 'avoid', 점수 <30) 수. 톤·날수 문구에서 *주의-측*으로 caution 에
   * 합산한다. 예전엔 이 값을 안 받아 나쁜 날을 통째로 무시했다 — 나쁜 날이 대부분인
   * 달이 톤 'bright'(good>=caution*2)로 뒤집히고, 날수 문구에서도 avoid 일이 증발해
   * (예: 30일 중 good 8·caution 3만 표기, 나머지 19일 실종) 위험을 심각하게 축소
   * 표기했다(감사). 미지정 시 0(하위호환).
   */
  avoidDays?: number
  totalDays: number
  /** 그 달 지배 신호(이미 정제·로컬라이즈된 topReasons 본문) 상위 몇 개. */
  topReasons: string[]
  /** 최고일 'MM-DD' + 그날 한 줄 이유(있으면). */
  bestDay?: string
  bestDayReason?: string
  /** 첫 주의일 'MM-DD'(있으면). */
  cautionDay?: string
  /** 사주×점성 수렴일 'MM-DD'(있으면). */
  convergeDate?: string
  lang: 'ko' | 'en'
  /** 본명 고정 개인 시드 — 문구 풀 회전용. 없으면 0(첫 변형). */
  seed?: number
}

/** role 별 key — 한 문단 안에서 풀들이 같은 index 로 동기화되지 않게 분산. */
const KEY = {
  toneOpen: 11,
  count: 23,
  theme: 37,
  bestDay: 53,
  bestAction: 67,
  cautionDay: 83,
  converge: 97,
  closing: 113,
} as const

/** 'MM-DD' → 'M월 D일' / 'M/D'. */
function fmtDate(mmdd: string, ko: boolean): string {
  const [m, d] = mmdd.split('-').map((n) => Number(n))
  if (!m || !d) return mmdd
  return ko ? `${m}월 ${d}일` : `${m}/${d}`
}

/** topReason 본문에서 핵심구만 — 선행 마크·라벨·'— 설명' 꼬리 제거. */
function coreReason(s: string): string {
  return s
    .replace(/^[↑↓·\s]+/, '')
    .replace(/^\[[^\]]*\]\s*/, '')
    .replace(/^(이달|오늘|month|day|year|decade|hour|peak)\s·\s/i, '')
    .split('—')[0]
    .split(' — ')[0]
    .trim()
}

/**
 * 산문(총평)에 박을 테마 문구 정리 — 기술적 괄호 주석을 떼어 읽기 쉽게.
 * 신호 라벨이 "목성 가장 좋은 자리(고양) (게자리)"처럼 (글로스)·(별자리) 괄호를
 * 달고 오는데, 한 문단 산문에선 거슬린다. 괄호 그룹을 모두 제거하고 공백 정리.
 */
function themePhrase(s: string): string {
  let out = coreReason(s)
  // 점성 위계(dignity) raw 용어 → 평이. themePhrase 가 괄호 글로스를 떼면
  // "목성 엑잘테이션" 처럼 raw 만 남아 누출되던 문제(감사 캘린더 jargon). 괄호 제거
  // *전에* 평이어로 치환한다. EN 도 동일.
  out = out
    .replace(/엑잘테이션\s*\([^)]*\)/g, '고양')
    .replace(/엑잘테이션/g, '고양')
    .replace(/도미사일\s*\([^)]*\)/g, '제자리')
    .replace(/도미사일/g, '제자리')
    .replace(/디트리먼트\s*\([^)]*\)/g, '불리한 자리')
    .replace(/디트리먼트/g, '불리한 자리')
    .replace(/폴\s*\(추락\)/g, '약한 자리')
    .replace(/\bExaltation\b/g, 'at its best')
    .replace(/\bDomicile\b/g, 'at home')
    .replace(/\bDetriment\b/g, 'out of place')
    .replace(/\bFall\b/g, 'weakened')
  out = out
    .replace(/\s*[(（][^)）]*[)）]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  // 테마는 *명사구*여야 템플릿("…${th} 흐름이에요")이 자연스럽다. 문장형 topReason
  // ("압박과 추진력이 흐르는 한 달이에요")이 들어오면 비문이 됐다(감사). 명사화하고,
  // 그래도 서술 종결형이면 테마에서 제외(filter Boolean).
  if (/[가-힣]/.test(out)) {
    out = out
      .replace(/\s*[이가]?\s*흐르는\s*한?\s*달이에요\.?$/, '')
      .replace(/\s*흐름이에요\.?$/, '')
      .trim()
    if (/(이에요|예요|어요|아요|해요|세요|네요|다|요)\.?$/.test(out)) return ''
  } else if (out.split(/\s+/).length > 6 || /\b(runs?|run|defines?|sets?|through)\b/.test(out)) {
    return '' // EN 문장형 절은 테마 부적합
  }
  // raw 한자(午月·간지)·saju 전문어(조후/통근/월령/득령/운성/격국/용신)를 단 차트
  // 메커닉 라벨은 사용자 테마로 부적합 — 제외(감사 jargon). 평이 테마만 남긴다.
  if (/[㐀-鿿]/.test(out)) return ''
  if (/조후|통근|월령|득령|운성|격국|용신/.test(out)) return ''
  return out
}

type Tone = 'bright' | 'mixed' | 'careful'

/**
 * 문구 풀 — role 마다 ko/en 3~4 변형. 동적 슬롯(${...})은 그대로 보존하고
 * 조사/연결어가 어색하지 않게 변형 사이에서 문법을 맞춘다. 의미는 동일.
 */

// 1) 전반 톤 — wool 접두({wool})는 한글 변형 앞에만. 톤별 풀.
const TONE_OPEN_KO: Record<Tone, ((wool: string) => string)[]> = {
  bright: [
    (w) => `${w}전반적으로 바람을 등진 듯 흐름이 순하게 풀리는 달이에요.`,
    (w) => `${w}대체로 막힘 없이 흐름이 순하게 풀리며 손을 잡아주는 달이에요.`,
    (w) => `${w}전반적으로 순풍을 탄 듯 일이 순하게 풀려 나가는 달이에요.`,
    (w) => `${w}큰 결림 없이 흐름이 순하게 트이는, 등 떠밀리듯 가벼운 달이에요.`,
  ],
  careful: [
    (w) => `${w}크게 벌이기보다 한 박자 늦춰 가는 게 좋은, 조심스러운 결의 달이에요.`,
    (w) => `${w}서두르기보다 차분히 다지며 가는 편이 나은, 조심스러운 결의 달이에요.`,
    (w) => `${w}무리한 확장보다 속도를 줄여 가는 게 좋은, 조심스러운 결의 달이에요.`,
    (w) => `${w}밀어붙이기보다 한 템포 늦춰 살피는 편이 좋은, 조심스러운 결의 달이에요.`,
  ],
  mixed: [
    (w) => `${w}좋은 날과 조심할 날이 번갈아 드는, 굴곡이 또렷한 달이에요.`,
    (w) => `${w}트이는 날과 가라앉는 날이 엇갈리며 오가는, 굴곡이 또렷한 달이에요.`,
    (w) => `${w}순한 날과 조심할 날이 교대로 찾아드는, 굴곡이 또렷한 달이에요.`,
    (w) => `${w}오르내림이 번갈아 이어지는, 굴곡이 또렷한 결의 달이에요.`,
  ],
}

const TONE_OPEN_EN: Record<Tone, string[]> = {
  bright: [
    'Overall a favorable month — the flow is on your side.',
    'On the whole a favorable month, with the current running your way.',
    'Broadly a favorable month — momentum leans in your favor.',
    'Mostly a favorable month, the flow carrying you along.',
  ],
  careful: [
    'A month that rewards a steadier hand over bold moves.',
    'A month where a steadier hand serves you better than bold moves.',
    'A month that favors a steadier hand rather than bold strokes.',
    'A month asking for a steadier hand instead of bold pushes.',
  ],
  mixed: [
    'A month of swings — good days and cautious ones alternate.',
    'A month of swings, with bright days and cautious ones taking turns.',
    'A month of swings — open days and guarded ones trade off.',
    'A month of swings, good stretches and careful ones alternating.',
  ],
}

// 1b) 날수 문구 — {total}/{good}/{caution} 슬롯 보존, 숫자 뒤 조사 안전.
const COUNT_KO: ((total: number, good: number, caution: number) => string)[] = [
  (t, g, c) =>
    ` 전체 ${t}일 가운데 흐름이 트이는 날이 ${g}일, 한 박자 늦추면 좋은 날이 ${c}일쯤 돼요.`,
  (t, g, c) => ` ${t}일 가운데 ${g}일은 흐름이 트이고, ${c}일은 한 박자 늦추는 편이 좋아요.`,
  (t, g, c) => ` 전체 ${t}일 중 트이는 날이 ${g}일, 한 템포 늦춰 가면 좋은 날이 ${c}일쯤이에요.`,
  (t, g, c) =>
    ` ${t}일을 놓고 보면 순하게 트이는 날이 ${g}일, 속도를 줄이면 좋은 날이 ${c}일쯤 돼요.`,
]

const COUNT_EN: ((total: number, good: number, caution: number) => string)[] = [
  (t, g, c) =>
    ` Of its ${t} days, about ${g} run with the current and ${c} ask for a steadier hand.`,
  (t, g, c) =>
    ` Across its ${t} days, roughly ${g} flow freely while ${c} call for a steadier hand.`,
  (t, g, c) => ` Out of ${t} days, some ${g} carry you along and ${c} want a steadier hand.`,
  (t, g, c) =>
    ` Among its ${t} days, around ${g} move with the current and ${c} ask you to slow down.`,
]

// 2) 지배 테마 — {themes} 슬롯 보존.
const THEME_KO: ((themes: string) => string)[] = [
  (th) => `무엇보다 ${th} 흐름이 이 달의 결을 이끌어요.`,
  (th) => `그 중심에는 ${th} 흐름이 자리해 이 달의 결을 이끌어요.`,
  (th) => `무엇보다 ${th} 흐름이 이 달 전체의 가락을 잡아줘요.`,
  (th) => `이 달의 결을 이끄는 건 단연 ${th} 흐름이에요.`,
]

const THEME_EN: ((themes: string) => string)[] = [
  (th) => `Above all, ${th} set the grain of the month.`,
  (th) => `More than anything, ${th} set the grain of the month.`,
  (th) => `At the heart of it, ${th} shape the grain of the month.`,
  (th) => `Above all, ${th} define how the month runs.`,
]

// 3) 가장 좋은 날 — {date}/{why} 슬롯 보존.
const BEST_DAY_KO: ((date: string, whyTail: string) => string)[] = [
  (d, w) => `그중 ${d} 무렵이 가장 무게가 실리는 날이에요${w}.`,
  (d, w) => `그중에서도 ${d} 언저리가 가장 무게가 실리는 날이에요${w}.`,
  (d, w) => `그 가운데 ${d} 무렵에 가장 큰 무게가 실려요${w}.`,
  (d, w) => `특히 ${d} 즈음이 한 달 중 무게가 가장 실리는 날이에요${w}.`,
]

const BEST_DAY_EN: ((date: string, whyTail: string) => string)[] = [
  (d, w) => `Among them, ${d} carries the most weight${w}.`,
  (d, w) => `Of these, ${d} carries the most weight${w}.`,
  (d, w) => `Within that, ${d} is the day that carries the most weight${w}.`,
  (d, w) => `In particular, ${d} carries the heaviest weight of the month${w}.`,
]

// 3b) 좋은 날 행동 제안 — 동적 슬롯 없음.
const BEST_ACTION_KO: string[] = [
  ' 미뤄둔 일이 있다면 이때 앞당겨 잡아보세요.',
  ' 미뤄둔 일이 있다면 이 무렵으로 당겨보세요.',
  ' 묵혀둔 일이 있다면 이때를 노려 밀어보세요.',
  ' 보류해둔 일이 있다면 이 시기에 맞춰 움직여보세요.',
]

const BEST_ACTION_EN: string[] = [
  " If something's been on hold, this is the window to bring it forward.",
  " If something's been waiting, this is the window to move it forward.",
  " If a plan's been on hold, aim it at this stretch.",
  " If you've been holding something back, this is the moment to act on it.",
]

// 4) 조심할 날 — {date} 슬롯 보존.
const CAUTION_DAY_KO: ((date: string) => string)[] = [
  (d) => `다만 ${d} 전후로는 무리한 결정이나 이동을 한 박자 늦추는 편이 안전해요.`,
  (d) => `다만 ${d} 무렵에는 무리한 결정이나 이동을 한 템포 미뤄두는 편이 안전해요.`,
  (d) => `다만 ${d} 언저리에는 큰 결정이나 이동을 서두르지 않는 편이 안전해요.`,
  (d) => `다만 ${d} 전후엔 중요한 결정이나 이동을 잠시 늦추는 게 안전해요.`,
]

const CAUTION_DAY_EN: ((date: string) => string)[] = [
  (d) => `That said, around ${d} it's wiser to hold off on big moves and travel.`,
  (d) => `That said, near ${d} it's wiser to delay big moves and travel.`,
  (d) => `Even so, around ${d} it's safer to ease off big decisions and travel.`,
  (d) => `That said, around ${d} better to slow down on major moves and travel.`,
]

// 4b) 수렴일 — {date} 슬롯 보존.
const CONVERGE_KO: ((date: string) => string)[] = [
  (d) =>
    `또 ${d}은 사주와 점성의 신호가 한꺼번에 겹치는 분기점이라, 큰 흐름이 바뀔 수 있으니 특히 눈여겨보세요.`,
  (d) =>
    `더불어 ${d}은 사주와 점성의 신호가 한데 겹치는 분기점이라, 큰 흐름이 돌아설 수 있으니 특히 눈여겨보세요.`,
  (d) =>
    `또 ${d}은 사주와 점성이 한꺼번에 맞물리는 분기점이니, 흐름이 크게 바뀔 수 있어 특히 챙겨보세요.`,
  (d) =>
    `여기에 ${d}은 사주와 점성의 신호가 겹치는 분기점이라, 큰 물줄기가 바뀔 수 있으니 눈여겨보세요.`,
]

const CONVERGE_EN: ((date: string) => string)[] = [
  (d) =>
    `And ${d} is a pivot where Saju and astrology converge at once — a turn worth watching closely.`,
  (d) =>
    `Likewise, ${d} is a pivot where Saju and astrology line up at once — a turn worth watching closely.`,
  (d) =>
    `On top of that, ${d} is a pivot where Saju and astrology converge — a shift worth watching closely.`,
  (d) =>
    `And ${d} marks a pivot where Saju and astrology meet at once — a turn well worth your attention.`,
]

// 5) 마무리 — 톤별 풀, 동적 슬롯 없음.
const CLOSING_KO: Record<Tone, string[]> = {
  bright: [
    '전반적으로는 벌여도 좋은 달이니, 망설이던 일이 있다면 이때 밀어붙여 보세요.',
    '대체로 밀어붙여도 좋은 달이니, 망설이던 일이 있다면 이참에 나서보세요.',
    '전반적으로 손을 뻗어도 좋은 달이니, 미뤄온 일이 있다면 이때 추진해보세요.',
    '대체로 벌여도 무방한 달이니, 망설이던 일이 있다면 이 흐름에 올라타 보세요.',
  ],
  careful: [
    '큰 욕심보다 마무리와 점검에 무게를 두면 한결 무난하게 지나갈 거예요.',
    '욕심을 키우기보다 마무리와 점검에 힘을 실으면 한결 수월하게 지나갈 거예요.',
    '새로 벌이기보다 마무리와 점검에 무게를 두면 큰 탈 없이 지나갈 거예요.',
    '무리한 확장보다 마무리와 점검에 집중하면 한결 매끄럽게 지나갈 거예요.',
  ],
  mixed: [
    '좋은 날엔 밀고 조심할 날엔 쉬어 가는 리듬만 지키면 충분한 달이에요.',
    '트이는 날엔 밀고 조심할 날엔 쉬어 가는 리듬만 지켜도 충분한 달이에요.',
    '순한 날엔 나아가고 조심할 날엔 쉬어 가는 리듬만 잡으면 무난한 달이에요.',
    '좋은 날엔 속도를 내고 조심할 날엔 한 박자 쉬는 리듬이면 넉넉한 달이에요.',
  ],
}

const CLOSING_EN: Record<Tone, string[]> = {
  bright: [
    "Overall a month to act on — if something's been on hold, this is the time to push.",
    "On the whole a month to act on — if something's been waiting, now is the time to push.",
    "Broadly a month to move on — if a plan's been on hold, this is the time to push.",
    "Largely a month to act on — if you've been hesitating, this is the time to push.",
  ],
  careful: [
    'Lean into wrapping up and review rather than big ambitions, and it passes smoothly.',
    'Favor wrapping up and review over big ambitions, and the month passes smoothly.',
    'Put your weight on finishing and review rather than big plans, and it passes smoothly.',
    'Lean toward tidying up and checking over rather than bold aims, and it passes smoothly.',
  ],
  mixed: [
    'Push on the good days, rest on the cautious ones, and the rhythm carries you through.',
    'Press on the good days and ease off on the cautious ones, and the rhythm carries you through.',
    'Move on the open days, pause on the cautious ones, and the rhythm carries you through.',
    'Lean in on the good days, hold back on the cautious ones, and the rhythm carries you through.',
  ],
}

export function deriveMonthSummary(i: MonthSummaryInput): string {
  const ko = i.lang === 'ko'
  const seed = i.seed ?? 0
  const parts: string[] = []
  const good = i.goodDays
  // 주의-측 = caution(30~40) + avoid(<30). 나쁜 날을 톤·날수에서 빠뜨리지 않게 합산.
  const caution = i.cautionDays + (i.avoidDays ?? 0)
  const total = i.totalDays

  // 1) 전반 톤 — 좋은 날 vs 주의 날 분포. 한 문장 안에 톤 + 날수까지 녹여 길게.
  const tone: Tone = good >= caution * 2 ? 'bright' : caution > good ? 'careful' : 'mixed'
  const wool = i.woolunKr ? (ko ? `${i.woolunKr}월은 ` : '') : ''
  const countKo = total > 0 ? pickBySeed(COUNT_KO, seed, KEY.count)(total, good, caution) : ''
  const countEn = total > 0 ? pickBySeed(COUNT_EN, seed, KEY.count)(total, good, caution) : ''
  if (ko) {
    parts.push(pickBySeed(TONE_OPEN_KO[tone], seed, KEY.toneOpen)(wool) + countKo)
  } else {
    parts.push(pickBySeed(TONE_OPEN_EN[tone], seed, KEY.toneOpen) + countEn)
  }

  // 2) 지배 테마 — 그 달 가장 센 신호 1~2개. 톤에 맞춰 자연스럽게 이어 붙임.
  const themes = i.topReasons.map(themePhrase).filter(Boolean).slice(0, 2)
  if (themes.length) {
    const joined = ko ? themes.join(' · ') : themes.join(' and ')
    parts.push(
      ko
        ? pickBySeed(THEME_KO, seed, KEY.theme)(joined)
        : pickBySeed(THEME_EN, seed, KEY.theme)(joined)
    )
  }

  // 3) 가장 좋은 날 — 날짜 + 이유. 앞 문장과 '그중'으로 연결.
  if (i.bestDay) {
    const why = i.bestDayReason ? coreReason(i.bestDayReason) : ''
    const date = fmtDate(i.bestDay, ko)
    const whyTail = why ? ` — ${why}` : ''
    const action = ko
      ? pickBySeed(BEST_ACTION_KO, seed, KEY.bestAction)
      : pickBySeed(BEST_ACTION_EN, seed, KEY.bestAction)
    parts.push(
      (ko
        ? pickBySeed(BEST_DAY_KO, seed, KEY.bestDay)(date, whyTail)
        : pickBySeed(BEST_DAY_EN, seed, KEY.bestDay)(date, whyTail)) + action
    )
  }

  // 4) 조심할 날 — '다만'으로 전환, 수렴일은 '또'로 덧붙임.
  if (i.cautionDay) {
    const date = fmtDate(i.cautionDay, ko)
    parts.push(
      ko
        ? pickBySeed(CAUTION_DAY_KO, seed, KEY.cautionDay)(date)
        : pickBySeed(CAUTION_DAY_EN, seed, KEY.cautionDay)(date)
    )
  }
  if (i.convergeDate && i.convergeDate !== i.bestDay) {
    const date = fmtDate(i.convergeDate, ko)
    parts.push(
      ko
        ? pickBySeed(CONVERGE_KO, seed, KEY.converge)(date)
        : pickBySeed(CONVERGE_EN, seed, KEY.converge)(date)
    )
  }

  // 5) 마무리 한 줄 — 톤별 행동 제안으로 문단을 자연스럽게 닫는다(길이·완결감).
  parts.push(
    ko
      ? pickBySeed(CLOSING_KO[tone], seed, KEY.closing)
      : pickBySeed(CLOSING_EN[tone], seed, KEY.closing)
  )

  return parts.join(' ')
}

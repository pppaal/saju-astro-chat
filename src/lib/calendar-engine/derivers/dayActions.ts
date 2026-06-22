/**
 * dayActions — 그날 "이렇게 해보세요" 행동 처방 (KO/EN).
 *
 * 기존 화면은 점수 구간(band)만 보고 칩 2개를 띄워 빈약했다. 여기선 그날 *일진
 * 십신*(일간 기준 그날의 십신)을 명리 표준 의미로 풀어 — 오늘 하면 좋은 구체
 * 행동(do) · 오늘은 피할 것(avoid) · 한 끗 팁(tip) — 을 만든다. band 는 톤만
 * 조절(순풍=밀기 / 평이=핵심만 / 역풍=정리·점검). 새 점괘는 짓지 않는다:
 * 십신·band 라는 *이미 계산된* 판단을 행동어로 옮길 뿐. 같은 입력 → 같은 출력.
 *
 * seed(본명 개인 시드)로 표현만 사람마다 회전(판단 불변).
 */

import { pickBySeed, hashStringToInt } from './personSeed'

type Pair = { ko: string; en: string }

export type DayActionBand = 'good' | 'mid' | 'low'

export interface DayActions {
  /** 오늘 하면 좋은 구체 행동 (3개). */
  do: string[]
  doEn: string[]
  /** 오늘은 피할 것 (2개). */
  avoid: string[]
  avoidEn: string[]
  /** 한 끗 — 태도/타이밍 한 줄. */
  tip: string
  tipEn: string
}

/** 십신 10종 → 그날의 행동. do 2개·avoid 2개·tip 1개(seed 회전 풀). */
interface SibsinActions {
  do: readonly Pair[] // 이 십신이 오늘 밀어주는 행동 (2개 고정 노출)
  avoid: readonly Pair[] // 이 십신의 그늘 — 피할 것 (2개 고정 노출)
  tip: readonly Pair[] // 한 끗 팁 풀 (seed 로 1개 회전)
}

// 명리 표준 의미 기반. 십신별 "오늘 이 기운이 켜졌을 때" 실전 행동.
const SIBSIN_ACTIONS: Record<string, SibsinActions> = {
  비견: {
    do: [
      {
        ko: '혼자 끝낼 수 있는 일부터 내 손으로 처리하기',
        en: 'tackle what you can finish solo, by your own hand',
      },
      {
        ko: '동료·친구와 경쟁 대신 협력으로 풀기',
        en: 'turn peers into teammates instead of rivals',
      },
    ],
    avoid: [
      {
        ko: '동업·보증·돈 빌려주기 (오늘은 빠져나가기 쉬움)',
        en: 'partnerships, guarantees or lending — money slips out today',
      },
      { ko: '고집으로 밀어붙여 기 싸움 만들기', en: 'forcing your will into a turf battle' },
    ],
    tip: [
      {
        ko: '내 페이스대로 가되, 상대 말도 한 번 더 들어주세요.',
        en: 'Keep your pace, but give the other side one more listen.',
      },
      {
        ko: '독립적으로 움직일수록 일이 깔끔해집니다.',
        en: 'The more independently you move, the cleaner it lands.',
      },
    ],
  },
  겁재: {
    do: [
      {
        ko: '추진력이 필요한 일을 단숨에 밀고 나가기',
        en: 'drive the thing that needs momentum in one push',
      },
      {
        ko: '한 팀으로 묶일 사람과 역할 나누기',
        en: 'split roles with someone you can truly team with',
      },
    ],
    avoid: [
      {
        ko: '큰 지출·충동구매·투자 (돈이 새기 쉬움)',
        en: 'big spends, impulse buys or bets — money leaks today',
      },
      { ko: '욱하는 마음에 관계 밀어붙이기', en: 'pushing a relationship on a hot impulse' },
    ],
    tip: [
      {
        ko: '속도는 살리되, 돈과 감정엔 한 박자 브레이크를.',
        en: 'Keep the speed, but brake a beat on money and temper.',
      },
      {
        ko: '경쟁심은 일에만 쓰고 사람에겐 거두세요.',
        en: 'Spend the competitive edge on tasks, not on people.',
      },
    ],
  },
  식신: {
    do: [
      {
        ko: '만들고 표현하는 일 (콘텐츠·기획·요리·운동)',
        en: 'making and expressing — content, planning, cooking, a workout',
      },
      {
        ko: '꾸준히 쌓는 작업을 즐기면서 이어가기',
        en: 'enjoy and continue the steady, building work',
      },
    ],
    avoid: [
      { ko: '과식·과음·늘어지는 게으름', en: 'overeating, overdrinking, drifting into idleness' },
      { ko: '벌여만 놓고 마무리 안 하기', en: 'starting lots and finishing none' },
    ],
    tip: [
      {
        ko: '편안할 때 가장 잘 나옵니다 — 즐기듯 하세요.',
        en: 'You do best at ease — work it like play.',
      },
      {
        ko: '오늘 만든 것은 내일의 밑천이 됩니다.',
        en: 'What you make today becomes tomorrow’s seed money.',
      },
    ],
  },
  상관: {
    do: [
      {
        ko: '재능·말솜씨로 발표·세일즈·창작 풀기',
        en: 'use your talent and tongue for pitching, sales, creating',
      },
      { ko: '새로운 방식으로 판을 다시 짜보기', en: 'reframe the setup in a fresh, original way' },
    ],
    avoid: [
      {
        ko: '윗사람·규칙에 대한 직설 비판 (설화 주의)',
        en: 'blunt criticism of bosses or rules — loose talk bites',
      },
      { ko: '잘난 척으로 비치는 과한 말', en: 'overtalking that reads as showing off' },
    ],
    tip: [
      {
        ko: '말 한마디만 다듬으면 재능이 빛납니다.',
        en: 'Polish one sentence and the talent shines.',
      },
      {
        ko: '비판은 대안과 함께 — 그래야 힘이 됩니다.',
        en: 'Pair any critique with a fix — then it lands as strength.',
      },
    ],
  },
  정재: {
    do: [
      {
        ko: '받을 돈 챙기기·계약·정산·합리적 소비 판단',
        en: 'collect what’s owed, settle contracts, spend sensibly',
      },
      {
        ko: '성실하게 쌓는 일에 꾸준히 시간 쓰기',
        en: 'put steady hours into work that compounds honestly',
      },
    ],
    avoid: [
      { ko: '한탕·투기·즉흥적인 큰 지출', en: 'get-rich-quick bets and impulsive big spends' },
      { ko: '확실치 않은 곳에 돈 묶기', en: 'tying money up where it isn’t certain' },
    ],
    tip: [
      {
        ko: '오늘은 지키고 모으는 쪽이 버는 쪽입니다.',
        en: 'Today, guarding and saving is the way you earn.',
      },
      {
        ko: '작게 자주 — 꾸준함이 곧 수익입니다.',
        en: 'Small and often — consistency is the return.',
      },
    ],
  },
  편재: {
    do: [
      {
        ko: '기회·인맥·유통을 넓히는 영업·확장 움직임',
        en: 'widen opportunity — sales, networks, distribution',
      },
      {
        ko: '여러 갈래를 동시에 굴려 흐름 만들기',
        en: 'run several threads at once to build flow',
      },
    ],
    avoid: [
      {
        ko: '욕심에 베팅 키우기·무리한 빚',
        en: 'sizing up the bet on greed, or overreaching on debt',
      },
      { ko: '돈과 인연을 가볍게 다루기', en: 'treating money and ties too lightly' },
    ],
    tip: [
      { ko: '판은 크게 보되 베팅은 작게 가세요.', en: 'See the board big, place the bet small.' },
      { ko: '굴리는 손은 많게, 거는 돈은 적게.', en: 'Many hands turning, little money staked.' },
    ],
  },
  정관: {
    do: [
      {
        ko: '책임 맡기·규칙 지키기·공식 자리에서 신뢰 쌓기',
        en: 'take responsibility, keep the rules, earn trust formally',
      },
      { ko: '맡은 일을 원칙대로 깔끔히 마무리', en: 'finish your duties cleanly, by the book' },
    ],
    avoid: [
      {
        ko: '편법·약속 어기기 (오늘 특히 표가 남)',
        en: 'shortcuts or broken promises — they show today',
      },
      { ko: '융통성 없이 사람 몰아붙이기', en: 'cornering people with rigid rules' },
    ],
    tip: [
      {
        ko: '바르게 처신하는 모습이 그대로 점수가 됩니다.',
        en: 'Conducting yourself well scores directly today.',
      },
      {
        ko: '책임을 먼저 지면 자리가 따라옵니다.',
        en: 'Shoulder the duty first and the standing follows.',
      },
    ],
  },
  편관: {
    do: [
      {
        ko: '결단·위기관리·미뤄둔 어려운 일 정면 돌파',
        en: 'decide, manage risk, face the hard thing head-on',
      },
      { ko: '압박이 큰 자리에서 중심 잡기', en: 'hold your center where the pressure is heavy' },
    ],
    avoid: [
      {
        ko: '무리한 강행·충돌·과로 (몸·사고 주의)',
        en: 'forcing it, clashing, overwork — watch body and accidents',
      },
      { ko: '욱한 결정으로 일 키우기', en: 'enlarging a problem with a hot-headed call' },
    ],
    tip: [
      {
        ko: '센 기운이라 방향만 잡으면 멀리 갑니다.',
        en: 'It’s strong energy — aim it and it carries far.',
      },
      { ko: '밀어붙이기 전에 한 번 숨 고르세요.', en: 'Take one breath before you push.' },
    ],
  },
  정인: {
    do: [
      {
        ko: '공부·자격·문서 검토·멘토에게 조언 구하기',
        en: 'study, credentials, reviewing papers, asking a mentor',
      },
      { ko: '충분히 쉬고 재충전하기', en: 'rest properly and refill your tank' },
    ],
    avoid: [
      { ko: '서두른 결정·즉흥 지출', en: 'rushed decisions and impulse spending' },
      { ko: '생각만 하다 실행 미루기', en: 'thinking in circles and deferring action' },
    ],
    tip: [
      {
        ko: '받아들이고 익히는 데 좋은 날 — 채우세요.',
        en: 'A day for taking in and learning — fill up.',
      },
      {
        ko: '막히면 혼자 끙끙대지 말고 먼저 물어보세요.',
        en: 'When stuck, ask first instead of grinding alone.',
      },
    ],
  },
  편인: {
    do: [
      {
        ko: '연구·특수 기술·직관이 필요한 일 파고들기',
        en: 'dig into research, niche skills, intuition-led work',
      },
      { ko: '혼자만의 시간으로 재충전·재정비', en: 'recharge and regroup in solo time' },
    ],
    avoid: [
      { ko: '잡생각으로 일 미루기·고립되기', en: 'stalling in overthought, isolating yourself' },
      {
        ko: '근거 없는 의심으로 관계 비틀기',
        en: 'twisting a relationship with groundless suspicion',
      },
    ],
    tip: [
      { ko: '남다른 관점이 무기가 되는 날입니다.', en: 'Your offbeat angle is the weapon today.' },
      { ko: '깊이 파되, 한 가지만 끝까지.', en: 'Dig deep — but only one thing, to the end.' },
    ],
  },
}

// band 선두 행동 — do 맨 앞에 얹어 그날 톤을 잡는다(순풍/평이/역풍).
const BAND_LEAD: Record<DayActionBand, readonly Pair[]> = {
  good: [
    {
      ko: '잘 풀리는 일은 오늘 한 발 더 밀어붙이기',
      en: 'push what’s working one step further today',
    },
    { ko: '미뤄둔 좋은 기회를 오늘 잡기', en: 'grab the good chance you’ve been putting off' },
  ],
  mid: [
    {
      ko: '무리한 확장은 빼고 핵심부터 처리하기',
      en: 'drop the overreach and handle the core first',
    },
    {
      ko: '벌이기보다 지금 가진 일을 끝까지 다듬기',
      en: 'refine what you already hold rather than start more',
    },
  ],
  low: [
    {
      ko: '새로 벌이기보다 정리·점검부터 하기',
      en: 'tidy and review before starting anything new',
    },
    { ko: '큰 결정은 미루고 몸·마음 추스르기', en: 'defer big calls and steady body and mind' },
  ],
}

// band 가 low 면 avoid 에 공통 한 줄을 더한다(과욕·큰 결정 누르기).
const BAND_AVOID_LOW: Pair = {
  ko: '오늘 큰 승부·새 계약 띄우기 (역풍이라 한 박자 늦게)',
  en: 'launching a big play or new contract — headwind, so a beat late',
}

const SIBSIN_CATEGORY_FALLBACK: Record<string, keyof typeof SIBSIN_ACTIONS> = {
  // 혹시 모를 표기 변형 대비 — 표준 10종 외 입력은 가장 가까운 십신으로.
}

export function deriveDayActions(args: {
  iljinSibsin: string
  scoreBand: DayActionBand
  seed?: number
}): DayActions | null {
  const key = SIBSIN_ACTIONS[args.iljinSibsin]
    ? args.iljinSibsin
    : SIBSIN_CATEGORY_FALLBACK[args.iljinSibsin]
  if (!key) return null
  const sib = SIBSIN_ACTIONS[key]
  const seed = args.seed ?? 0

  // band 선두 행동 1개(seed 회전) + 십신 행동 2개 = do 3개.
  const lead = pickBySeed(
    BAND_LEAD[args.scoreBand],
    seed,
    hashStringToInt('lead:' + args.scoreBand)
  )
  const doKo = [lead.ko, sib.do[0].ko, sib.do[1].ko]
  const doEn = [lead.en, sib.do[0].en, sib.do[1].en]

  // 십신 avoid 2개 (+ low band 공통 1개).
  const avoidKo = [sib.avoid[0].ko, sib.avoid[1].ko]
  const avoidEn = [sib.avoid[0].en, sib.avoid[1].en]
  if (args.scoreBand === 'low') {
    avoidKo.push(BAND_AVOID_LOW.ko)
    avoidEn.push(BAND_AVOID_LOW.en)
  }

  // 한 끗 팁 — 십신 풀에서 seed 회전.
  const tip = pickBySeed(sib.tip, seed, hashStringToInt('tip:' + key))

  return {
    do: doKo,
    doEn,
    avoid: avoidKo,
    avoidEn,
    tip: tip.ko,
    tipEn: tip.en,
  }
}

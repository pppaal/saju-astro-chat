/**
 * dayDeepRead — 그날(일진)의 *합성 해석* 한 문단 (KO/EN).
 *
 * 새 점괘를 지어내지 않는다. 그날 이미 계산된 신호 — 일진 십신, 사주×점성 교차
 * 페어(polarity), 화해된 톤 — 을 명리/점성 표준 의미로 **이어 붙여** 2~4문장의
 * 읽을거리로 만든다. 같은 입력이면 항상 같은 문장(결정론·재현가능).
 *
 * 구성:
 *   1) 오늘 일진의 기운 한 줄 (일진 + 십신 분야).
 *   2) 가장 센 *우호* 교차가 있으면 — 그 페어가 힘을 보탠다.
 *   3) 가장 센 *충돌* 교차가 있으면 — 그 페어가 마찰을 준다(조심).
 *   4) 톤별 마무리 조언(순풍/평이/역풍).
 * 교차가 없으면 1)+4)만 — 여전히 십신·톤에 근거한 두 문장.
 *
 * 한글 조사 안전: 동적 페어 텍스트("정재 × 금성")엔 주격/목적격 조사를 붙이지
 * 않고 em-dash 로 절을 잇는다(비문 방지).
 */

import { sibsinArea, sibsinAreaEn } from './plainLanguage'
import { pickBySeed } from './personSeed'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'

export type DeepReadTone = 'positive' | 'caution' | 'mixed'

export interface DeepReadCross {
  /** 사주측 키 — 십신/신살명(KO, 로케일 무관). */
  sajuKo: string
  /** 점성측 키 — 행성명(KO, 예 '금성'). */
  astroKo: string
  polarity: number
}

export interface DayDeepReadArgs {
  /** 일진 한글 읽기 — '갑자'. */
  iljinKr: string
  /** 일진 십신 — '편재'. */
  iljinSibsin: string
  /** 화해된 톤(헤드라인과 동일 권위). */
  tone: DeepReadTone
  /** 그날 사주×점성 교차 페어 (polarity 포함). */
  crosses: DeepReadCross[]
  /** 그날 활성 신살 (이미 ko/en 한 쌍으로). 있으면 한 줄 더 엮는다. */
  shinsal?: Array<{ ko: string; en: string }>
  /** 그날 가장 센 시진(時) — 시각창 + 길/주의 톤. 있으면 타이밍 한 줄. */
  peakHour?: { whenKo: string; whenEn: string; tone: 'good' | 'caution' } | null
  /**
   * 본명 고정 개인 시드(personSeed). 문구 *표현*만 사람마다 회전시킨다(판단 불변).
   * 같은 시드+입력 → 같은 문장. 기본 0(시드 없으면 첫 변형).
   */
  seed?: number
}

/**
 * 문장 역할별 안정 키 — pickBySeed(pool, seed, key) 의 key 로 써서 한 사람의 여섯
 * 문장이 전부 같은 인덱스로 쏠리지 않게 한다(역할마다 다른 오프셋).
 */
const ROLE = {
  opener: 0,
  lift: 1,
  drag: 2,
  shinsal: 3,
  hour: 4,
  close: 5,
} as const

// KO 행성명 → EN (교차 페어 EN 표기용). plainLanguage 의 행성 평이어와 별개로
// 페어엔 행성 *이름* 을 쓴다("정재 × 금성" / "Direct Wealth × Venus").
const PLANET_KO_EN: Record<string, string> = {
  태양: 'Sun',
  달: 'Moon',
  수성: 'Mercury',
  금성: 'Venus',
  화성: 'Mars',
  목성: 'Jupiter',
  토성: 'Saturn',
  천왕성: 'Uranus',
  해왕성: 'Neptune',
  명왕성: 'Pluto',
}

// ── 변형 풀 (variant pools) ───────────────────────────────────────────────
// 같은 구조라도 사람(seed)마다 다른 표현이 나오게 역할별 풀을 둔다. 동적 슬롯
// ({kr}/{area}/pair/when)엔 한글 조사를 붙이지 않는다(비문 방지) — em-dash/콜론으로.

/** 1) 오프너 — "오늘은 {kr}({area}) …". {kr}/{area} 슬롯 유지. */
const OPENER: ReadonlyArray<{
  ko: (kr: string, area: string) => string
  en: (kr: string, area: string) => string
}> = [
  {
    ko: (kr, area) => `오늘은 ${kr}(${area}) 기운이 흐르는 하루입니다.`,
    en: (kr, area) => `Today carries the energy of ${kr} — ${area}.`,
  },
  {
    ko: (kr, area) => `오늘 하루는 ${kr}(${area})의 결을 탑니다.`,
    en: (kr, area) => `The day rides the grain of ${kr} — ${area}.`,
  },
  {
    ko: (kr, area) => `오늘을 이끄는 기운은 ${kr}(${area})입니다.`,
    en: (kr, area) => `Leading today is ${kr} — ${area}.`,
  },
  {
    ko: (kr, area) => `${kr}(${area}) 기운이 오늘 하루를 감쌉니다.`,
    en: (kr, area) => `${kr} energy — ${area} — colours the whole day.`,
  },
]

/** 2) 우호 교차 — "${pair} — …". pair 슬롯 + em-dash 유지. */
const LIFT: ReadonlyArray<{ ko: (pair: string) => string; en: (pair: string) => string }> = [
  {
    ko: (pair) => `${pair} — 두 결이 맞물려 힘을 보탭니다.`,
    en: (pair) => `${pair} — the two lines mesh and lend force.`,
  },
  {
    ko: (pair) => `${pair} — 결이 나란히 흘러 서로를 밀어줍니다.`,
    en: (pair) => `${pair} — the lines run parallel and push each other on.`,
  },
  {
    ko: (pair) => `${pair} — 두 흐름이 손을 맞잡아 기운을 더합니다.`,
    en: (pair) => `${pair} — the two currents join hands and add momentum.`,
  },
  {
    ko: (pair) => `${pair} — 맞물린 결이 오늘을 든든히 받칩니다.`,
    en: (pair) => `${pair} — the locked grain steadies the day.`,
  },
]

/**
 * 3) 충돌 교차 — "[다만 ]${pair} — …". pair 슬롯 + em-dash 유지.
 * 선행 우호 줄이 있을 때만 lead("다만 "/"That said, ")를 붙인다.
 */
const DRAG: ReadonlyArray<{
  leadKo: string
  leadEn: string
  ko: (pair: string) => string
  en: (pair: string) => string
}> = [
  {
    leadKo: '다만 ',
    leadEn: 'That said, ',
    ko: (pair) => `${pair} — 부딪치는 결이 있어 한 박자 조심하세요.`,
    en: (pair) => `${pair} — these grind, so take it a beat carefully.`,
  },
  {
    leadKo: '다만 ',
    leadEn: 'Even so, ',
    ko: (pair) => `${pair} — 결이 엇갈리니 한 템포 늦춰 가세요.`,
    en: (pair) => `${pair} — the lines cross, so drop a tempo and ease through.`,
  },
  {
    leadKo: '한편 ',
    leadEn: 'That said, ',
    ko: (pair) => `${pair} — 서로 밀어내는 기운이 있어 무리는 금물입니다.`,
    en: (pair) => `${pair} — the energies push apart, so don't force it.`,
  },
  {
    leadKo: '다만 ',
    leadEn: 'Still, ',
    ko: (pair) => `${pair} — 마찰이 끼는 자리라 조심스레 다루세요.`,
    en: (pair) => `${pair} — friction sits here, so handle it with care.`,
  },
]

/** 4) 신살 — "…: ${list}". 동적 목록 앞은 콜론(조사 금지). */
const SHINSAL: ReadonlyArray<{ ko: (list: string) => string; en: (list: string) => string }> = [
  {
    ko: (list) => `오늘 함께하는 기운: ${list}.`,
    en: (list) => `Stars in play: ${list}.`,
  },
  {
    ko: (list) => `곁에 도는 기운: ${list}.`,
    en: (list) => `Alongside today: ${list}.`,
  },
  {
    ko: (list) => `오늘 머무는 별: ${list}.`,
    en: (list) => `Stars lingering: ${list}.`,
  },
  {
    ko: (list) => `함께 도는 신살: ${list}.`,
    en: (list) => `In company today: ${list}.`,
  },
]

/** 5) 시진(時) — "특히 ${when}, …". when 슬롯 뒤는 쉼표(조사 금지). 톤별 풀. */
const HOUR: Record<
  'good' | 'caution',
  ReadonlyArray<{ ko: (when: string) => string; en: (when: string) => string }>
> = {
  good: [
    {
      ko: (when) => `특히 ${when}, 결이 또렷해집니다.`,
      en: (when) => `Especially around ${when}, the day reads clearest.`,
    },
    {
      ko: (when) => `특히 ${when}, 흐름이 가장 맑습니다.`,
      en: (when) => `Around ${when} in particular, the current runs cleanest.`,
    },
    {
      ko: (when) => `무엇보다 ${when}, 기운이 가장 또렷합니다.`,
      en: (when) => `Above all around ${when}, the energy is sharpest.`,
    },
    {
      ko: (when) => `특히 ${when}, 좋은 결이 또렷이 섭니다.`,
      en: (when) => `Especially near ${when}, a good grain stands out.`,
    },
  ],
  caution: [
    {
      ko: (when) => `특히 ${when}, 한 박자 조심하세요.`,
      en: (when) => `Especially around ${when}, ease off a beat.`,
    },
    {
      ko: (when) => `특히 ${when}, 한 템포 늦추는 게 좋아요.`,
      en: (when) => `Around ${when} in particular, it's best to slow a tempo.`,
    },
    {
      ko: (when) => `무엇보다 ${when}, 발끝을 살펴 가세요.`,
      en: (when) => `Above all around ${when}, watch your step.`,
    },
    {
      ko: (when) => `특히 ${when}, 서두름은 잠시 내려놓으세요.`,
      en: (when) => `Especially near ${when}, set haste aside for a moment.`,
    },
  ],
}

/** 6) 톤 마무리 — 톤별 풀. */
const TONE_CLOSE: Record<DeepReadTone, ReadonlyArray<{ ko: string; en: string }>> = {
  positive: [
    {
      ko: '흐름을 믿고 한 발 더 나아가도 좋아요.',
      en: 'Trust the current and you can step a little further today.',
    },
    {
      ko: '결이 받쳐주니 마음 가는 대로 밀고 가세요.',
      en: 'The grain backs you, so push on where your heart leads.',
    },
    {
      ko: '바람을 등졌으니 자신 있게 움직여도 됩니다.',
      en: 'The wind is at your back — move with confidence.',
    },
    {
      ko: '좋은 결을 타고 한 걸음 더 내디뎌 보세요.',
      en: 'Ride this good grain and take one more step.',
    },
  ],
  caution: [
    {
      ko: '큰 결정은 미루고, 무리 없이 천천히 가세요.',
      en: 'Postpone the big calls and move slowly, without strain.',
    },
    {
      ko: '서두르지 말고, 큰 일은 다음으로 미뤄두세요.',
      en: 'Do not rush; leave the big matters for another day.',
    },
    {
      ko: '오늘은 발걸음을 늦추고 몸을 아끼는 날입니다.',
      en: 'Today is for slowing your pace and sparing yourself.',
    },
    {
      ko: '무게 있는 선택은 한 박자 미뤄두는 편이 낫습니다.',
      en: 'Weighty choices are better held back a beat.',
    },
  ],
  mixed: [
    {
      ko: '결단은 빠르게, 충돌은 한 박자 늦추세요.',
      en: 'Decide quickly, but slow any clash by a beat.',
    },
    {
      ko: '나아갈 곳엔 빠르게, 부딪칠 곳엔 천천히 가세요.',
      en: 'Move fast where it opens, slow where it grinds.',
    },
    {
      ko: '추진할 일은 밀고, 거슬리는 일은 한 템포 늦추세요.',
      en: 'Push what flows, and ease what resists by a tempo.',
    },
    {
      ko: '속도는 살리되 마찰엔 한 호흡 두고 가세요.',
      en: 'Keep your pace, but leave a breath before any friction.',
    },
  ],
}

function pairKo(c: DeepReadCross): string {
  return `${c.sajuKo} × ${c.astroKo}`
}
function pairEn(c: DeepReadCross): string {
  return `${SIBSIN_EN[c.sajuKo] ?? c.sajuKo} × ${PLANET_KO_EN[c.astroKo] ?? c.astroKo}`
}

export function deriveDayDeepRead(args: DayDeepReadArgs): { ko: string; en: string } {
  const areaKo = sibsinArea(args.iljinSibsin)
  const areaEn = sibsinAreaEn(args.iljinSibsin)
  const seed = args.seed ?? 0

  // 가장 센 우호/충돌 교차 (polarity 부호로 분리, |polarity| 최대).
  let pos: DeepReadCross | null = null
  let neg: DeepReadCross | null = null
  for (const c of args.crosses) {
    if (c.polarity > 0 && (!pos || c.polarity > pos.polarity)) pos = c
    else if (c.polarity < 0 && (!neg || c.polarity < neg.polarity)) neg = c
  }

  const ko: string[] = []
  const en: string[] = []

  // 1) 오늘 일진의 기운.
  const opener = pickBySeed(OPENER, seed, ROLE.opener)
  ko.push(opener.ko(args.iljinKr, areaKo))
  en.push(opener.en(args.iljinKr, areaEn))

  // 2) 우호 교차.
  if (pos) {
    const lift = pickBySeed(LIFT, seed, ROLE.lift)
    ko.push(lift.ko(pairKo(pos)))
    en.push(lift.en(pairEn(pos)))
  }
  // 3) 충돌 교차. (우호가 없으면 lead 없이 단독으로.)
  if (neg) {
    const drag = pickBySeed(DRAG, seed, ROLE.drag)
    ko.push(`${pos ? drag.leadKo : ''}${drag.ko(pairKo(neg))}`)
    en.push(`${pos ? drag.leadEn : ''}${drag.en(pairEn(neg))}`)
  }

  // 4) 신살 — 그날 함께하는 기운(최대 2개). 동적 텍스트엔 조사 안 붙이고 콜론으로.
  if (args.shinsal?.length) {
    const ss = args.shinsal.slice(0, 2)
    const line = pickBySeed(SHINSAL, seed, ROLE.shinsal)
    ko.push(line.ko(ss.map((x) => x.ko).join(' · ')))
    en.push(line.en(ss.map((x) => x.en).join(' · ')))
  }

  // 5) 시진(時) — 가장 센 시각의 타이밍 한 줄.
  if (args.peakHour) {
    const hour = pickBySeed(HOUR[args.peakHour.tone], seed, ROLE.hour)
    ko.push(hour.ko(args.peakHour.whenKo))
    en.push(hour.en(args.peakHour.whenEn))
  }

  // 6) 톤 마무리.
  const close = pickBySeed(TONE_CLOSE[args.tone], seed, ROLE.close)
  ko.push(close.ko)
  en.push(close.en)

  return { ko: ko.join(' '), en: en.join(' ') }
}

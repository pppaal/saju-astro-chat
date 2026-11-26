/**
 * v9.2 캘린더 뷰모델 테스트 픽스처 — 디자인 샘플(1997-03-21 14:30 여 · 서울, 2026-11, 오늘 19일)의
 * 그리드 모양(FIX9b E5 · calendar9 템플릿): 좋음 3·4·6·9·12·13·16·22·23·27 + 최고 24,
 * 조심 8·10·14·20, 피함 2·11·17·29, 나머지 잔잔. 큰 날(수렴) 5·9·14·17·29 + 최고 24.
 *
 * 실제 엔진 출력이 아니라 *모양* 픽스처다 — 엔진 값은 calendarSample.real.node.test.ts 가
 * 실제 천체력으로 확인한다. 여기선 뷰모델 규칙(마크 라벨·카운트·지난 날·오늘·축·범례)을 본다.
 * 오늘·지난 날 표지는 assembleTiers 와 같은 규칙(targetDayIso '2026-11-19')으로 싣는다.
 */
import type { DestinyDay, DestinyMonth, DestinyDayMark } from '@/types/calendar'
import { reconcileMonthTone } from '@/lib/calendar-engine/derivers/reconcile'
import type { EvidenceRung } from '@/lib/calendar-engine/derivers/evidenceLadder'

export const SAMPLE_SEED = 3804016609
export const TODAY = 19

const GOOD = [3, 4, 6, 9, 12, 13, 16, 22, 23, 27]
const CAUTION = [8, 10, 14, 20]
const AVOID = [2, 11, 17, 29]
const BEST = 24
const HEIGHT: Record<number, number> = {
  1: 31,
  2: 21,
  3: 43,
  4: 50,
  5: 31,
  6: 50,
  7: 30,
  8: 27,
  9: 43,
  10: 27,
  11: 12,
  12: 55,
  13: 50,
  14: 25,
  15: 30,
  16: 49,
  17: 19,
  18: 41,
  19: 32,
  20: 22,
  21: 35,
  22: 47,
  23: 47,
  24: 57,
  25: 41,
  26: 32,
  27: 43,
  28: 35,
  29: 21,
  30: 35,
}

const ds = (d: number) => `11-${String(d).padStart(2, '0')}`

export function markOf(d: number): DestinyDayMark | null {
  if (d === BEST) return 'best'
  if (GOOD.includes(d)) return 'good'
  if (CAUTION.includes(d)) return 'caution'
  if (AVOID.includes(d)) return 'avoid'
  // toMonth — 밴드 무색인 포커스 일(오늘)은 'focus' 마크.
  return d === TODAY ? 'focus' : null
}

export const KEY_DAY_DS = ['11-05', '11-09', '11-14', '11-17', '11-29']

const REASON_17 = {
  saju: '상관',
  sajuEn: 'Hurting Officer',
  sajuHanja: '傷官',
  astro: '태양',
  astroEn: 'Sun',
  meaning: '윗사람·권위와 부딪히기 쉬운 결(상관견관). 상사 앞 직설·공개 반박은 오늘 접기.',
  meaningEn:
    'friction with authority runs high. Shelve blunt words and public pushback in front of the boss today.',
  polarity: -2,
  astroDetail: {
    transitPlanet: 'Sun',
    sourceKind: 'transit',
    aspect: 'square',
    natalPoint: 'Moon',
    transitSign: 'Scorpio',
    transitDeg: 24,
  },
}

export const TODAY_REASON = {
  saju: '정관',
  sajuEn: 'Direct Officer',
  sajuHanja: '正官',
  astro: '태양',
  astroEn: 'Sun',
  meaning: '윗선의 인정·승진·공식 무대에 우호',
  meaningEn: 'Favors recognition from above, promotion, and the formal stage',
  polarity: 2,
  astroDetail: {
    transitPlanet: 'Sun',
    sourceKind: 'transit',
    aspect: 'trine',
    natalPoint: 'Venus',
    orb: 0.28,
    transitSign: 'Scorpio',
    transitDeg: 26,
  },
}

export function makeV9Month(overrides: Partial<DestinyMonth> = {}): DestinyMonth {
  const calendar = Array.from({ length: 30 }, (_, i) => {
    const d = i + 1
    return {
      d,
      ds: ds(d),
      intensity: HEIGHT[d] / 72,
      mark: markOf(d),
      focus: d === TODAY,
      isToday: d === TODAY,
      past: d < TODAY,
      ...(d === 17 ? { reason: REASON_17 } : {}),
    }
  })
  const goodDays = [...GOOD, BEST].sort((a, b) => a - b).map(ds)
  const cautionDays = CAUTION.map(ds)
  const avoidDays = AVOID.map(ds)
  return {
    label: '2026년 11월',
    ym: '2026-11',
    woolun: { hanja: '己亥', kr: '기해', en: 'gihae' },
    woolunSibsin: '정관',
    woolunStemSibsin: '정관',
    cautionDays,
    goodDays,
    avoidDays,
    bestDay: { date: ds(BEST), score: 79 },
    keyDays: KEY_DAY_DS.map((date) => ({
      date,
      meaning: 'server meaning',
      tone: 'negative' as const,
      astro: [],
      saju: [],
      bothSystems: true,
    })),
    focusDay: TODAY,
    todayDay: TODAY,
    calendar,
    seed: SAMPLE_SEED,
    verdict: reconcileMonthTone({
      goodN: goodDays.length,
      cautionN: cautionDays.length,
      avoidN: avoidDays.length,
      totalN: 30,
    }),
    evidenceLadder: [monthRung('ko')],
    evidenceLadderEn: [monthRung('en')],
    ...overrides,
  }
}

function monthRung(lang: 'ko' | 'en'): EvidenceRung {
  return {
    scale: 'monthly',
    scaleLabel: lang === 'ko' ? '이달' : 'This month',
    conclusion:
      lang === 'ko'
        ? '일·책임 쪽에 마찰 — 이달 걸리는 지점'
        : 'friction around duty & standing — a sticking point this month',
    polarity: -2,
    chips: [{ text: lang === 'ko' ? '정관' : 'Direct Officer', source: 'saju' }],
    range: { start: '2026-11-07', end: '2026-12-06' },
    saju: { ko: '정관', en: 'Direct Officer', hanja: '正官' },
  }
}

/** 오늘(19일)의 4칸 사다리 — 디자인 샘플의 칸 모양. */
export function dayRungs(lang: 'ko' | 'en'): EvidenceRung[] {
  const ko = lang === 'ko'
  return [
    {
      scale: 'decadal',
      scaleLabel: ko ? '10년' : '10-yr',
      conclusion: ko ? 'ZR 챕터 흐름이 10년의 결을 잡아요' : 'ZR sets the tone for 10-yr',
      polarity: -2,
      chips: [
        { text: ko ? '정재' : 'Direct Wealth', source: 'saju' },
        { text: 'ZR', source: 'astro' },
      ],
      range: { start: '2021-03-21', end: '2031-03-20' },
      saju: { ko: '정재', en: 'Direct Wealth', hanja: '正財' },
      astro: {
        kind: 'zodiacal-releasing',
        planet: 'Saturn',
        sign: 'Aquarius',
        lots: [
          {
            lot: 'spirit',
            sign: 'Taurus',
            ruler: 'Venus',
            years: 8,
            range: { start: '2024-03-21', end: '2032-03-21' },
          },
          {
            lot: 'fortune',
            sign: 'Aquarius',
            ruler: 'Saturn',
            years: 30,
            range: { start: '2024-03-21', end: '2054-03-21' },
          },
        ],
      },
    },
    {
      scale: 'yearly',
      scaleLabel: ko ? '올해' : 'This year',
      conclusion: ko
        ? '돈·현실 쪽에 마찰 — 올해 눌리기 쉬운 축'
        : 'friction around opportunity & money — an axis that gets pressed this year',
      polarity: -2,
      chips: [
        { text: ko ? '편재' : 'Indirect Wealth', source: 'saju' },
        { text: ko ? '토성 폴 (양자리)' : 'Saturn in Fall (Aries)', source: 'astro' },
      ],
      range: { start: '2026-02-04', end: '2027-02-03' },
      saju: { ko: '편재', en: 'Indirect Wealth', hanja: '偏財' },
      astro: {
        kind: 'dignity',
        planet: 'Saturn',
        dignity: 'fall',
        sign: 'Aries',
        event: {
          kind: 'saturn_return_1',
          planet: 'Saturn',
          ko: '첫 토성 회귀',
          en: 'First Saturn return',
          range: { start: '2026-04-21', end: '2027-01-29' },
        },
      },
    },
    monthRung(lang),
    {
      scale: 'daily',
      scaleLabel: ko ? '오늘' : 'Today',
      conclusion: ko
        ? '태양 △ 금성 흐름이 오늘의 결을 잡아요'
        : 'Sun trine Venus sets the tone for today',
      polarity: 2,
      chips: [
        { text: ko ? '정재' : 'Direct Wealth', source: 'saju' },
        { text: ko ? '태양 △ 금성' : 'Sun △ Venus', source: 'astro' },
      ],
      range: { start: '2026-11-19', end: '2026-11-19' },
      saju: { ko: '정재', en: 'Direct Wealth', hanja: '正財' },
      astro: { kind: 'transit', planet: 'Sun', aspect: 'trine', natalPoint: 'Venus' },
    },
  ]
}

export function makeV9Day(overrides: Partial<DestinyDay> = {}): DestinyDay {
  return {
    date: '2026-11-19',
    dateKo: '2026년 11월 19일',
    iljin: { hanja: '丙寅', kr: '병인', en: 'byeongin' },
    iljinSibsin: '편재',
    dayMaster: { hanja: '壬', kr: '임', en: 'im' },
    seed: SAMPLE_SEED,
    score: 44,
    oneLine: '큰 일 없이 기본에 충실하기 좋은 하루.',
    oneLineEn: 'A steady, uneventful day — good for the basics.',
    totalSignals: 0,
    signals: [],
    transits: [],
    geokgukStatus: {
      name: '상관격',
      status: '반성반파',
      factors: { positive: [], negative: [] },
      description: '',
    },
    gongmang: { natalBranches: [], activeBranches: [], activeAxes: [], note: '' },
    appliedPatterns: [],
    crossActivations: [
      {
        id: 'x1',
        sajuSide: '정관',
        astroSide: '태양',
        sajuKo: '정관',
        astroKo: '태양',
        meaning: TODAY_REASON.meaning,
        meaningEn: TODAY_REASON.meaningEn,
        polarity: 2,
        weight: 0.4,
        layer: 'daily',
      },
      {
        id: 'x2',
        sajuSide: '편재',
        astroSide: '화성',
        sajuKo: '편재',
        astroKo: '화성',
        meaning: '충동이 지출로 새기 쉬운 결.',
        meaningEn: 'impulse leaks into spending.',
        polarity: -1,
        weight: 0.3,
        layer: 'monthly',
      },
    ],
    reason: TODAY_REASON,
    shinsalActive: [],
    topReasons: [],
    topReasonsEn: [],
    cautions: ['부딪히는 기운이 깔림'],
    cautionsEn: ['a little friction underneath'],
    evidenceLadder: dayRungs('ko'),
    evidenceLadderEn: dayRungs('en'),
    dayTone: {
      band: 'mid',
      tone: 'mixed',
      tense: false,
      bright: false,
      flavor: 'flat',
      score: 44,
    },
    ...overrides,
  } as DestinyDay
}

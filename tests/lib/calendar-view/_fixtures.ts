/**
 * 공용 NatalContext / CalendarCell 픽스처 빌더 — calendar adapter 단위 테스트용.
 *
 * 어댑터(toYear/toDecade/toDay/toUser)는 순수 변환 함수이지만 내부에서 실제 saju
 * 유틸(getSibsinKo/getTwelveStage/getGongmang/getStemElement 등)을 호출한다. 이
 * 유틸들은 **한자** 천간/지지를 기대하므로(예: getSibsinKo('甲','丙')='식신'),
 * 픽스처도 한자로 구성한다. dayMaster.name 을 한자로 두면 십신 계산이 실제로
 * 돌아가고, 한글로 두면 '' → safeSibsin '—' 폴백 경로를 탄다.
 */
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type {
  ActiveSignal,
  CalendarCell,
  SignalKind,
  SignalLayer,
  Polarity,
} from '@/lib/calendar-engine/types'
import type { Chart, PlanetBase, ZodiacKo } from '@/lib/astrology/foundation/types'

export const SIGNS: ZodiacKo[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

export function makePlanet(name: string, sign: ZodiacKo, house = 1, degree = 10): PlanetBase {
  const idx = SIGNS.indexOf(sign)
  return {
    name,
    longitude: idx * 30 + degree,
    sign,
    degree,
    minute: 0,
    formatted: `${sign} ${degree}deg`,
    house,
    speed: 1,
    retrograde: false,
  }
}

export function makeChart(opts: {
  planets?: PlanetBase[]
  ascSign?: ZodiacKo
  mcSign?: ZodiacKo
}): Chart {
  const ascSign = opts.ascSign ?? 'Aries'
  const mcSign = opts.mcSign ?? 'Capricorn'
  return {
    planets: opts.planets ?? [],
    ascendant: makePlanet('Ascendant', ascSign),
    mc: makePlanet('MC', mcSign),
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: SIGNS[i],
      formatted: `${SIGNS[i]} 0deg`,
    })),
  } as Chart
}

export interface NatalFixtureOpts {
  /** 일간(한자). 한글로 주면 십신 계산이 빈 문자열 → '—'. */
  dayMasterName?: string
  dayMasterElement?: string
  pillars?: Record<string, unknown>
  daeun?: NatalContext['saju']['daeun']
  strength?: 'strong' | 'medium' | 'weak'
  fiveElements?: NatalContext['saju']['fiveElements']
  yongsin?: NatalContext['saju']['yongsin']
  dayJijanggan?: NatalContext['saju']['dayJijanggan']
  analyses?: unknown
  // astro
  chart?: Chart
  sect?: 'day' | 'night'
  dignities?: unknown
  lots?: unknown
  almutenFiguris?: unknown
  zodiacalReleasing?: unknown
  input?: Partial<NatalContext['input']>
}

export function makeNatal(opts: NatalFixtureOpts = {}): NatalContext {
  return {
    input: {
      year: 1990,
      month: 6,
      date: 15,
      hour: 12,
      minute: 0,
      latitude: 37.5,
      longitude: 127,
      timeZone: 'Asia/Seoul',
      ...(opts.input ?? {}),
    } as NatalContext['input'],
    saju: {
      pillars: (opts.pillars ?? {}) as never,
      dayMaster: {
        name: opts.dayMasterName ?? '甲',
        element: opts.dayMasterElement ?? '목',
      } as never,
      yongsin: opts.yongsin ?? { primary: '화', secondary: '토', avoid: [] },
      strength: opts.strength ?? 'medium',
      natalShinsal: [],
      natalRelations: [],
      daeun: opts.daeun ?? [],
      fiveElements: opts.fiveElements ?? { wood: 2, fire: 1, earth: 2, metal: 2, water: 1 },
      analyses: (opts.analyses ?? {}) as never,
      dayJijanggan: (opts.dayJijanggan ?? { jeonggi: '己' }) as never,
    },
    astro: {
      chart: opts.chart ?? makeChart({}),
      sect: opts.sect ?? 'day',
      location: { latitude: 37.5, longitude: 127, timeZone: 'Asia/Seoul' },
      natalAspects: [],
      zodiacalReleasing:
        (opts.zodiacalReleasing as never) ?? ({ spirit: null, fortune: null } as never),
      dignities: (opts.dignities ?? []) as never,
      lots: (opts.lots ?? []) as never,
      almutenFiguris: (opts.almutenFiguris ?? null) as never,
    },
  }
}

let signalSeq = 0
export function makeSignal(over: Partial<ActiveSignal> & { kind: SignalKind }): ActiveSignal {
  signalSeq += 1
  return {
    id: over.id ?? `sig.${over.kind}.${signalSeq}`,
    source: over.source ?? 'saju',
    kind: over.kind,
    name: over.name ?? 'signal',
    korean: over.korean,
    english: over.english,
    polarity: (over.polarity ?? 0) as Polarity,
    layer: (over.layer ?? 'daily') as SignalLayer,
    active:
      over.active ??
      ({
        start: '2026-01-01T00:00:00.000Z',
        peak: '2026-01-01T00:00:00.000Z',
        end: '2026-01-01T00:00:00.000Z',
      } as ActiveSignal['active']),
    weight: over.weight ?? 1,
    evidence: over.evidence ?? { module: 'test', detail: {} },
  }
}

export function makeCell(over: Partial<CalendarCell> & { datetime: string }): CalendarCell {
  return {
    datetime: over.datetime,
    signals: over.signals ?? [],
    derivedScore: over.derivedScore ?? 50,
    salience: over.salience ?? 0,
    matchedPatterns: over.matchedPatterns ?? [],
    topReasons: over.topReasons ?? [],
    cautions: over.cautions ?? [],
    topReasonsEn: over.topReasonsEn,
    cautionsEn: over.cautionsEn,
  }
}

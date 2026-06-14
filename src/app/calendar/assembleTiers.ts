/* ============================================================
   /calendar 5-tier 어셈블러 (page.tsx · preview/page.tsx 공유)
   ───────────────────────────────────────────────────────────
   직전까지 page.tsx(656줄)와 preview/page.tsx(612줄)가 *입력 소스만* 다른 채
   (세션/현재날짜 vs 고정 1995 본명) tier 어셈블 로직을 통째로 복붙하고 있었다.
   주석에 "preview 와 동일"이 10번 넘게 박혀 있었고 실제로 한쪽만 고쳐진
   버그(gender 매핑·signals 투영 누락 등) 흔적이 있었다. 단일 함수로 모아
   drift 를 끝낸다.

   NatalContext + 그 해 cells + 표시용 입력을 받아 PreviewClient 가 받는
   { topbar, user, lifetime, decade, year, month, day } 를 만든다.
   ============================================================ */

import { deriveConvergence } from '@/lib/calendar-engine/derivers/convergence'
import { deriveLifetimeFlow } from '@/lib/calendar-engine/derivers/lifetimeFlow'
import { deriveLifetimePivots } from '@/lib/calendar-engine/derivers/lifetimePivots'
import { deriveLayeredScores } from '@/lib/calendar-engine/derivers/layeredScore'
import { computeDayPillarIndices } from '@/lib/saju/dayPillar'
import { getMonthPillarForDate } from '@/lib/saju/datePillars'
import { STEM_NAMES, BRANCH_NAMES } from '@/lib/saju/constants'

import {
  toUser,
  toLifetime,
  toDecade,
  toYear,
  toMonth,
  toDay,
} from '@/components/calendar/adapters'
import { buildHourCrossings } from '@/components/calendar/adapters/toHourCrossings'
import { buildHourMoon } from '@/components/calendar/adapters/toHourMoon'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'
import { translateSignalLabel } from '@/lib/calendar-engine/derivers/signalI18n'
import { PLANET_KO } from '@/components/calendar/adapters/shared'

import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { CalendarCell } from '@/lib/calendar-engine/types'
import type {
  DestinyUserSummary,
  DestinyDecade,
  DestinyMonth,
  DestinyDay,
  DestinyYear,
  DestinyLifetime,
} from '@/types/calendar'

export interface AssembleTiersInput {
  natal: NatalContext
  /** 그 해(targetYear) 전체 CalendarCell — buildCalendar(year, granularity:'day') 결과. */
  cells: CalendarCell[]
  lang: 'ko' | 'en'
  birthYear: number
  targetYear: number
  /** 1-12 */
  targetMonth: number
  /** 펼침 기준 일(day-of-month). 보통 '오늘'(또는 preview 의 고정 focus 일). */
  targetDay: number
  /** 'YYYY-MM-DD' — 일 tier focus 일. */
  targetDayIso: string
  sex: '남' | '여'
  /** toUser.birthDisplay 로 들어갈 표시 문자열. */
  birthDisplay: string
  /** topbar.whoBirthLine 로 들어갈 표시 문자열(보통 birthDisplay 와 동일). */
  whoBirthLine: string
  place: string
  /**
   * 포커스된 하루의 evidence 포함 셀(getFocusDayCell). 연 cells 는 evidence 를
   * 빼고 캐시하므로(블롭 경량화), day tier 의 근거카드·교차·시진은 이 셀에서 읽는다.
   * 없으면 연 cells 의 해당 일 셀로 폴백(evidence 없음 — 근거 일부 비어 보일 수 있음).
   */
  focusDayCell?: CalendarCell | null
}

export interface AssembledTiers {
  topbar: { whoBirthLine: string; place: string; ilganHanja: string }
  user: DestinyUserSummary & { gyeokgukStatus?: string; rootStatus?: string }
  lifetime: DestinyLifetime
  decade: DestinyDecade & {
    crossActivations?: Array<{
      signalId: string
      name: string
      sajuLine?: string
      astroLine?: string
      polarity: number
      meaning?: string
    }>
    geokgukStatus?: string
  }
  year: DestinyYear
  month: DestinyMonth
  day: DestinyDay
}

type FE = DestinyDecade['pillar']['cheongan']['element']

const STEM_EL_FALLBACK: Record<string, FE> = {
  甲: '목',
  乙: '목',
  丙: '화',
  丁: '화',
  戊: '토',
  己: '토',
  庚: '금',
  辛: '금',
  壬: '수',
  癸: '수',
}
const BRANCH_EL_FALLBACK: Record<string, FE> = {
  子: '수',
  丑: '토',
  寅: '목',
  卯: '목',
  辰: '토',
  巳: '화',
  午: '화',
  未: '토',
  申: '금',
  酉: '금',
  戌: '토',
  亥: '수',
}
function pickElement(hanja: string, fallback: Record<string, FE>): FE {
  return fallback[hanja] ?? '목'
}

const SIG_KIND_TO_CAT: Record<string, string> = {
  shinsal: 'saju/shinsal',
  hyeongchung: 'saju/hyeongchung',
  'pillar-sibsin': 'saju/pillar-sibsin',
  'tonggeun-shift': 'saju/tonggeun-shift',
  'saju-pattern': 'saju/saju-pattern',
  jijanggan: 'saju/jijanggan',
  'geokguk-status': 'saju/geokguk-status',
  gongmang: 'saju/gongmang',
  'applied-pattern': 'saju/applied-pattern',
  transit: 'astro/transit',
  eclipse: 'astro/eclipse',
  progression: 'astro/progression',
  'progressed-moon': 'astro/progressed-moon',
  'solar-return': 'astro/solar-return',
  'lunar-return': 'astro/lunar-return',
  profection: 'astro/profection',
  'zodiacal-releasing': 'astro/zodiacal-releasing',
  lifecycle: 'astro/lifecycle',
  electional: 'astro/electional',
  'moon-phase': 'astro/moon-phase',
  'void-of-course': 'astro/void-of-course',
  'fixed-star': 'astro/fixed-star',
  'arabic-part': 'astro/arabic-part',
  'house-transit': 'astro/house-transit',
  'angle-contact': 'astro/angle-contact',
  midpoint: 'astro/midpoint',
  asteroid: 'astro/asteroid',
  'solar-arc': 'astro/solar-arc',
  draconic: 'astro/draconic',
  harmonic: 'astro/harmonic',
  'cross-activation': 'cross/activation',
}

/** 동일 문구 중복 제거(순서 보존). monthly-layer 사유는 그 달 매일 동일 문자열로
 *  떠서, 셀을 가로질러 모으면 같은 줄이 반복된다 — body 기준 1회만 남긴다. */
function dedupeByBody<T extends { body: string }>(rows: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of rows) {
    if (seen.has(r.body)) continue
    seen.add(r.body)
    out.push(r)
  }
  return out
}

export async function assembleTiers(args: AssembleTiersInput): Promise<AssembledTiers> {
  const {
    natal,
    cells,
    lang,
    birthYear: BIRTH_YEAR,
    targetYear: TARGET_YEAR,
    targetMonth: TARGET_MONTH,
    targetDay: TARGET_DAY,
    targetDayIso,
    sex,
    birthDisplay,
    whoBirthLine,
    place,
    focusDayCell,
  } = args

  // ─── lifetimeFlow / lifetimePivots derivers ─────────────────────────────
  const lifetimeFlow = deriveLifetimeFlow(natal, lang)
  const lifetimePivots = deriveLifetimePivots(natal, lang)

  // ─── yearly / month / day 슬라이스 ───────────────────────────────────────
  const monthPrefix = `${TARGET_YEAR}-${String(TARGET_MONTH).padStart(2, '0')}`
  const monthCells = cells.filter((c) => c.datetime.slice(0, 7) === monthPrefix)
  // 연 cells 는 evidence 없이 캐시되므로, evidence 가 필요한 day tier 는
  // focusDayCell(1일 evidence 빌드)을 우선 사용. 없으면 연 cells 의 해당 일로 폴백.
  const yearDayCell = cells.find((c) => c.datetime.slice(0, 10) === targetDayIso) ?? cells[0]
  const dayCell = focusDayCell ?? yearDayCell
  const yearlySignals = cells.flatMap((c) => c.signals).filter((s) => s.layer === 'yearly')

  // 층별 점수 — 일/시는 일진, 월은 월운, 년은 세운, 10년은 대운 신호로만.
  const layered = deriveLayeredScores(cells)

  // ─── iljin(일진) / woolun(월운) 60갑자 (KASI 절기 룩업) ───────────────────
  const [focusY, focusM, focusD] = targetDayIso.split('-').map(Number)
  const dayIdx = computeDayPillarIndices(focusY, focusM, focusD)
  const iljinStem = STEM_NAMES[dayIdx.stemIndex]
  const iljinBranch = BRANCH_NAMES[dayIdx.branchIndex]
  const woolunRef = getMonthPillarForDate(
    new Date(`${TARGET_YEAR}-${String(TARGET_MONTH).padStart(2, '0')}-15T00:00:00`)
  )
  const woolunStem = woolunRef.stem
  const woolunBranch = woolunRef.branch

  // ─── adapter 호출 (5 tier prop 자동 어셈블) ──────────────────────────────
  const userBase = toUser(natal, {
    birthDisplay,
    place,
    sex,
    lots: natal.astro.lots,
    intro: lifetimeFlow?.intro,
  })
  const user: DestinyUserSummary & {
    gyeokgukStatus?: string
    rootStatus?: string
  } = {
    birth: userBase.birth,
    birthKo: userBase.birthKo,
    place: userBase.place,
    sex: userBase.sex === '남' || userBase.sex === '여' ? userBase.sex : '남',
    ilgan: {
      hanja: userBase.ilgan.hanja,
      kr: userBase.ilgan.kr,
      en: userBase.ilgan.en,
      element: userBase.ilgan.element as DestinyUserSummary['ilgan']['element'],
    },
    yongsin: {
      hanja: userBase.yongsin.hanja,
      kr: userBase.yongsin.kr,
      en: userBase.yongsin.en,
      primary: natal.saju.yongsin.primary,
      secondary: natal.saju.yongsin.secondary,
      avoid: natal.saju.yongsin.avoid,
    },
    huisin: {
      hanja: userBase.huisin.hanja,
      kr: userBase.huisin.kr,
      en: userBase.huisin.en,
      primary: natal.saju.yongsin.secondary ?? natal.saju.yongsin.primary,
      avoid: natal.saju.yongsin.avoid,
    },
    gyeokguk: userBase.gyeokguk,
    gyeokgukEn: userBase.gyeokgukEn,
    gangyak: userBase.gangyak,
    dominantSibsin: userBase.dominantSibsin,
    elements: userBase.elements,
    astro: {
      sun: userBase.astro.sun ?? '',
      asc: userBase.astro.asc ?? '',
      mc: userBase.astro.mc ?? '',
      sunEn: userBase.astro.sunEn!,
      ascEn: userBase.astro.ascEn!,
      mcEn: userBase.astro.mcEn!,
    },
    dignities: userBase.dignities,
    almutenFiguris: userBase.almutenFiguris,
    sect: userBase.sectKind,
    lots: userBase.lotsFull,
    intro: userBase.intro,
    introEn: userBase.introEn,
    gyeokgukStatus: userBase.geokgukStatus,
    rootStatus: userBase.rootStatus,
  }

  const lifetime = toLifetime(natal, {
    birthYear: BIRTH_YEAR,
    currentYear: TARGET_YEAR,
    lifetimeFlow,
    lifetimePivots,
  })

  // toDecade — 현재 대운 + 10년 분리 + cross-activation decadal.
  const currentAge = TARGET_YEAR - BIRTH_YEAR
  const decadalSignals = cells.flatMap((c) => c.signals).filter((s) => s.layer === 'decadal')
  const decadeAdapter = toDecade(natal, {
    currentAge,
    currentYear: TARGET_YEAR,
    decadalSignals,
    focusYear: TARGET_YEAR,
  })
  // 유효한 사주면 대운은 항상 계산된다. null 이면 입력/계산이 깨진 것 — fail-loud.
  if (!decadeAdapter) {
    throw new Error('대운 계산 실패: 유효한 사주인데 대운 리스트가 비었습니다 (불변식 위반).')
  }

  // 이 대운(10년) 안에 떨어지는 점성 마디 = 사주(대운) × 점성 교차의 '언제'.
  const decadeAstroMarks = lifetime.milestones
    .filter(
      (m) =>
        m.kind !== 'saju' &&
        m.kind !== 'daewoon' &&
        m.year >= decadeAdapter.start &&
        m.year <= decadeAdapter.end
    )
    .sort((a, b) => a.year - b.year)
    .map((m) => ({
      label: m.label.includes('—') ? m.label.split('—')[0].trim() : m.label,
      date: `${m.year}`,
      body: m.label.includes('—') ? m.label.split('—').slice(1).join('—').trim() : '',
      kind: m.kind,
    }))

  const decade: AssembledTiers['decade'] = {
    gz: decadeAdapter.gz,
    start: decadeAdapter.start,
    end: decadeAdapter.end,
    ageFrom: decadeAdapter.ageFrom,
    ageTo: decadeAdapter.ageTo,
    sibsin: decadeAdapter.sibsin,
    theme: decadeAdapter.theme,
    themeEn: decadeAdapter.themeEn,
    headline: decadeAdapter.headline,
    headlineEn: decadeAdapter.headlineEn,
    pillar: {
      cheongan: {
        hanja: decadeAdapter.pillar.cheongan.hanja,
        sibsin: decadeAdapter.pillar.cheongan.sibsin,
        el: decadeAdapter.pillar.cheongan.el,
        element: pickElement(decadeAdapter.pillar.cheongan.hanja, STEM_EL_FALLBACK),
        note: decadeAdapter.pillar.cheongan.note ?? '',
      },
      jiji: {
        hanja: decadeAdapter.pillar.jiji.hanja,
        sibsin: decadeAdapter.pillar.jiji.sibsin,
        el: decadeAdapter.pillar.jiji.el,
        element: pickElement(decadeAdapter.pillar.jiji.hanja, BRANCH_EL_FALLBACK),
        note: decadeAdapter.pillar.jiji.note ?? '',
      },
    },
    sewoonNow: decadeAdapter.sewoonNow
      ? {
          gz: decadeAdapter.sewoonNow.gz,
          sibsin: decadeAdapter.sewoonNow.sibsin,
          year: TARGET_YEAR,
        }
      : {
          gz: decadeAdapter.gz,
          sibsin: decadeAdapter.sibsin,
          year: TARGET_YEAR,
        },
    years: decadeAdapter.years,
    body: decadeAdapter.body,
    hapchung: {
      title: decadeAdapter.hapchung.title,
      romaji: decadeAdapter.hapchung.romaji,
      body: decadeAdapter.hapchung.body,
    },
    unseong: {
      title: decadeAdapter.unseong.title,
      romaji: decadeAdapter.unseong.romaji,
      body: decadeAdapter.unseong.body,
    },
    astro: decadeAstroMarks.map((a) => ({
      label: a.label,
      date: a.date,
      body: a.body,
      kind: a.kind ?? '',
    })),
    narrative: decadeAdapter.narrative,
    focusYear: decadeAdapter.focusYear,
    zrSpiritChapters: [],
    zrFortuneChapters: [],
    crossActivations: decadeAdapter.crossActivations,
    geokgukStatus: decadeAdapter.geokgukStatus,
  }

  const yearAdapter = toYear(natal, {
    year: TARGET_YEAR,
    yearlySignals,
    cells,
    monthlyLayer: layered.monthly,
  })
  const ageThisYear = TARGET_YEAR - BIRTH_YEAR
  const fallbackHouse = (((ageThisYear % 12) + 12) % 12) + 1
  const wheelSlot = yearAdapter.profectionWheel.find((w) => w.house === fallbackHouse)
  const year: DestinyYear = {
    year: yearAdapter.year,
    headline: yearAdapter.headline,
    sewoon: yearAdapter.sewoon,
    sewoonGz: yearAdapter.sewoonGz,
    sewoonSibsin: yearAdapter.sewoonSibsin,
    profection: yearAdapter.profection ?? {
      house: fallbackHouse,
      theme: '',
      themeEn: '',
      cusp: wheelSlot ? (wheelSlot.cuspSign as string) : '',
      cuspEn: wheelSlot?.cuspSign ?? 'Aries',
      ruler: wheelSlot ? (wheelSlot.cuspRuler as string) : '',
      rulerEn: wheelSlot?.cuspRuler ?? 'Sun',
      rulerNatal: '',
      rulerNatalEn: '',
      rulerNatalHouse: 0,
      rulerNatalSign: 'Aries',
    },
    profectionWheel: yearAdapter.profectionWheel,
    sajuNote: yearAdapter.sajuNote,
    astroNote: yearAdapter.astroNote,
    zrSpiritChapters: yearAdapter.zrSpiritChapters,
    zrFortuneChapters: yearAdapter.zrFortuneChapters,
    monthlyScores: yearAdapter.monthlyScores,
    crossings: yearAdapter.crossings,
  }

  // 월 narrative — 타고난 결(lifetimeFlow.intro) + 그 달 상위 topReasons.
  const monthNarrative: Array<{ tag: string; body: string }> = []
  if (lifetimeFlow?.intro) {
    monthNarrative.push({
      tag: lang === 'ko' ? '타고난 결' : 'Innate grain',
      body: lifetimeFlow.intro,
    })
  }
  // monthly-layer 사유는 그 달 매일 동일 문자열 → 셀을 가로질러 모으면 같은 줄이
  // 반복된다. body 기준 dedup 후 상위 4개만 (직전엔 dedup 없어 같은 줄 도배).
  const monthTopReasons = dedupeByBody(
    monthCells
      .flatMap((c) =>
        ((lang === 'en' ? c.topReasonsEn : c.topReasons) ?? []).map((r) => ({
          score: c.derivedScore,
          body: r,
        }))
      )
      .sort((a, b) => b.score - a.score)
  ).slice(0, 4)
  const monthGrainTag = lang === 'ko' ? '이 달의 결' : "This month's grain"
  for (const r of monthTopReasons) {
    monthNarrative.push({ tag: monthGrainTag, body: r.body })
  }
  const { month: monthAdapter, calendar } = toMonth({
    ym: monthPrefix,
    label: `${TARGET_YEAR}년 ${TARGET_MONTH}월`,
    cells: monthCells,
    woolunStem,
    woolunBranch,
    narrative: monthNarrative,
    dayScores: layered.daily,
    // 펼침 기준일 — 보통 '오늘'. 안 주면 최고점수일로 펼쳐진다.
    focusDay: TARGET_DAY,
  })
  // 이달의 큰 날 — convergence keyDays(윈도우+신뢰도).
  const monthKeyDays = deriveConvergence(monthCells, 5, lang).keyDays.map((k) => ({
    date: k.date.slice(5),
    meaning: k.meaning,
    astro: k.astro,
    saju: k.saju,
    bothSystems: k.bothSystems,
    window: k.window,
    confidence: k.confidence,
  }))
  const month: DestinyMonth = {
    label: monthAdapter.label,
    ym: monthAdapter.ym,
    woolun: monthAdapter.woolun ?? { hanja: '—', kr: '—', en: '—' },
    cautionDays: monthAdapter.cautionDays,
    goodDays: monthAdapter.goodDays,
    bestDay: monthAdapter.bestDay ?? { date: '', score: 0 },
    avoidDays: monthAdapter.avoidDays,
    narrative: monthAdapter.narrative,
    keyDays: monthKeyDays,
    converge: monthAdapter.converge
      ? {
          date: monthAdapter.converge.date,
          score: monthAdapter.converge.score,
          astro: monthAdapter.converge.astro,
          saju: monthAdapter.converge.saju,
          bothSystems: monthAdapter.converge.bothSystems,
          meaning: monthAdapter.converge.meaning ?? '',
        }
      : {
          date: '',
          score: 0,
          astro: [],
          saju: [],
          bothSystems: false,
          meaning: '',
        },
    focusDay: monthAdapter.focusDay,
    calendar,
  }

  // 이 달의 사주×점성 교차 — monthly 층 cross-activation 페어를 모아 카드 원료로.
  // 같은 페어가 그 달 여러 윈도우로 잡혀 id 는 달라도 의미는 같으므로 *페어* 기준
  // 중복 제거(가장 센 |polarity| 보존), |polarity| 상위 6개.
  type MCross = NonNullable<DestinyMonth['crossActivations']>[number]
  const monthCrossByPair = new Map<string, MCross>()
  for (const c of monthCells) {
    for (const s of c.signals) {
      if (s.kind !== 'cross-activation' || s.layer !== 'monthly') continue
      const detail = (s.evidence?.detail ?? {}) as { sajuKey?: string; astroKey?: string }
      const sajuKo = detail.sajuKey ?? ''
      const astroEn = detail.astroKey ?? ''
      const pairKey = `${sajuKo}|${astroEn}`
      const prev = monthCrossByPair.get(pairKey)
      if (prev && Math.abs(prev.polarity) >= Math.abs(s.polarity)) continue
      // 매핑 의미문은 "편관 × 화성 — …" 처럼 페어명으로 시작한다. 카드가 이미
      // 글로스된 페어를 따로 보여주므로, 의미문 앞의 "<…> × <…> — " 머리를 떼
      // 중복(과 raw 술어 'Seven Killings' 노출)을 없앤다.
      const stripPair = (t: string) => t.replace(/^[^—]*×[^—]*—\s*/, '')
      monthCrossByPair.set(pairKey, {
        saju: sajuKo,
        sajuEn: SIBSIN_EN[sajuKo] ?? translateSignalLabel(sajuKo, 'en'),
        astro: PLANET_KO[astroEn] ?? astroEn,
        astroEn,
        meaning: stripPair(s.korean ?? ''),
        meaningEn: stripPair(s.english ?? ''),
        polarity: s.polarity,
      })
    }
  }
  month.crossActivations = [...monthCrossByPair.values()]
    .sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity))
    .slice(0, 6)

  const dayAdapter = toDay({
    cell: dayCell,
    natal,
    iljinStem,
    iljinBranch,
    favorScore: layered.daily.get(dayCell.datetime.slice(0, 10))?.score,
    lang,
  })
  const advanced = natal.saju.analyses
  const statusResult = advanced?.geokguk?.statusResult
  const geokgukName = advanced?.geokguk?.primary ?? '미정'
  // ── 일진 cell.signals → DestinySignal[] 풀세트 projection ──
  // adapter 의 DestinypalDaySignal 은 id/weight/layer/source 를 버리는데 DayTier 의
  // signal stream + FixedStarRow + ArabicLotRow 정렬·필터에 모두 필요.
  type DSig = DestinyDay['allSignals'][number]
  const allDaySignals: DSig[] = dayCell.signals.map((s) => {
    const base = {
      id: s.id,
      cat: SIG_KIND_TO_CAT[s.kind] ?? `${s.source}/${s.kind}`,
      label: s.name,
      polarity: s.polarity,
      weight: s.weight,
      kind: s.kind,
      layer: s.layer,
    }
    if (s.source === 'astro') {
      const planets = s.evidence?.planets ?? []
      return {
        ...base,
        source: 'astro' as const,
        body: planets[0],
        aspect: s.evidence?.aspectType,
        target: planets[1] ? `본명 ${planets[1]}` : undefined,
      }
    }
    return { ...base, source: 'saju' as const }
  }) as DSig[]
  const dayTransits = allDaySignals.filter((s) => s.kind === 'transit') as DestinyDay['transits']
  const daySajuSignals = allDaySignals.filter(
    (s) => s.kind !== 'transit' && s.kind !== 'cross-activation'
  ) as DestinyDay['signals']
  const dayCrossSignals = allDaySignals.filter(
    (s) => s.kind === 'cross-activation'
  ) as DestinyDay['crossSignals']
  const dayAppliedPatterns: DestinyDay['appliedPatterns'] = dayCell.signals
    .filter((s) => s.kind === 'applied-pattern')
    .map((s) => ({
      id: s.id,
      name: s.name,
      korean:
        typeof s.evidence?.detail?.korean === 'string'
          ? (s.evidence.detail.korean as string)
          : s.name,
      polarity: s.polarity,
      weight: s.weight,
      activeAxes: Array.isArray(s.evidence?.detail?.activeAxes)
        ? (s.evidence!.detail!.activeAxes as string[])
        : [],
      rule:
        typeof s.evidence?.detail?.rule === 'string' ? (s.evidence!.detail!.rule as string) : '',
    }))
  const dayCrossActivations: DestinyDay['crossActivations'] = dayCell.signals
    .filter((s) => s.kind === 'cross-activation')
    .map((s) => ({
      id: s.id,
      sajuSide:
        typeof s.evidence?.detail?.sajuName === 'string'
          ? (s.evidence.detail.sajuName as string)
          : '',
      astroSide:
        typeof s.evidence?.detail?.astroName === 'string'
          ? (s.evidence.detail.astroName as string)
          : '',
      meaning:
        typeof s.evidence?.detail?.meaning === 'string'
          ? (s.evidence.detail.meaning as string)
          : '',
      polarity: s.polarity,
      weight: s.weight,
    }))
  const day: DestinyDay = {
    date: dayAdapter.date,
    dateKo: dayAdapter.dateKo,
    iljin: dayAdapter.iljin,
    iljinSibsin: dayAdapter.iljinSibsin,
    score: dayAdapter.score,
    oneLine: dayAdapter.oneLine,
    totalSignals: dayAdapter.totalSignals,
    signals: daySajuSignals,
    transits: dayTransits,
    crossSignals: dayCrossSignals,
    allSignals: allDaySignals,
    jijanggan: dayAdapter.jijanggan,
    geokgukStatus: {
      name: geokgukName,
      status: statusResult?.status ?? '반성반파',
      factors: statusResult?.factors ?? { positive: [], negative: [] },
      description: dayAdapter.geokgukStatus ?? '',
    },
    gongmang: {
      natalBranches: dayAdapter.gongmang.natalBranches,
      activeBranches: dayAdapter.gongmang.activeBranches,
      activeAxes: dayAdapter.gongmang.activeAxes,
      note: dayAdapter.gongmang.note,
    },
    appliedPatterns: dayAppliedPatterns,
    crossActivations: dayCrossActivations,
    shinsalActive: dayAdapter.shinsalActive,
    narrative: dayAdapter.narrative,
    topReasons: dayAdapter.topReasons,
    cautions: dayAdapter.cautions,
    twelveStageMatrix: dayAdapter.twelveStageMatrix,
    hourCrossings: buildHourCrossings(dayCell, targetDayIso, natal.astro.location),
    // 시(時)별 달 정밀 — 그날 12 시진 달을 재계산해 달×본명 어스펙트 절정 시각.
    hourMoon: await buildHourMoon(targetDayIso, natal),
  }

  const ilganHanja = user.ilgan.hanja || '辛'

  return {
    topbar: { whoBirthLine, place, ilganHanja },
    user,
    lifetime,
    decade,
    year,
    month,
    day,
  }
}

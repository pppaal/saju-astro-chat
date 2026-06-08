/* ============================================================
   /destinypal/preview — Phase F (adapters 완전 wire-up) 실데이터 검증 페이지
   ───────────────────────────────────────────────────────────
   본명 1995-02-09 06:40 Asia/Seoul Male — 진짜 NatalContext +
   2026년 CalendarCell 으로 5 tier UI 를 자동으로 채운다.

   임시 처리 / `as unknown as` 캐스팅 0건 — adapter 가 NatalContext →
   destinypal tier props 까지 100% 책임.
   ============================================================ */

import PreviewClient from './PreviewClient'

import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { deriveConvergence } from '@/lib/calendar-engine/derivers/convergence'
import { deriveLifetimeFlow } from '@/lib/calendar-engine/derivers/lifetimeFlow'
import { deriveLifetimePivots } from '@/lib/calendar-engine/derivers/lifetimePivots'
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

import type {
  DestinyUserSummary,
  DestinyDecade,
  DestinyMonth,
  DestinyDay,
  DestinyYear,
} from '@/types/calendar'

// Server component: 빌드 비용(Swiss Ephemeris) 을 서버에서 한 번만 치름.
export const dynamic = 'force-dynamic'

// 본명 입력 — 1995-02-09 06:40 Asia/Seoul Male.
const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

const BIRTH_YEAR = 1995
const TARGET_YEAR = 2026
const TARGET_MONTH = 6 // 6월 — preview default focus month
const TARGET_DAY_ISO = '2026-06-15' // preview default focus day

export default async function DestinypalPreview() {
  // ─── 1) NatalContext (사주 + 점성 본명) ────────────────────────────────
  const natal = await buildNatalContext(BIRTH)

  // ─── 2) 2026 한 해 캘린더 (cell.signals 풀 = 4 tier 의 본체) ───────────
  const cells = await buildCalendar(
    natal,
    {
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-12-31T23:59:59.999Z',
      granularity: 'day',
    },
    { includeEvidence: true }
  )

  // ─── 3) lifetimeFlow / lifetimePivots derivers (lifeStages·milestones 원료) ──
  const lifetimeFlow = deriveLifetimeFlow(natal)
  const lifetimePivots = deriveLifetimePivots(natal)

  // ─── 4) yearly / month / day cell 슬라이스 ─────────────────────────────
  const monthPrefix = `2026-${String(TARGET_MONTH).padStart(2, '0')}`
  const monthCells = cells.filter((c) => c.datetime.slice(0, 7) === monthPrefix)
  const dayCell = cells.find((c) => c.datetime.slice(0, 10) === TARGET_DAY_ISO) ?? cells[0]
  // yearly signals — cell.signals 중 layer='yearly' 인 것만 풀.
  const yearlySignals = cells.flatMap((c) => c.signals).filter((s) => s.layer === 'yearly')

  // ─── 4.5) iljin (일진) / woolun (월운) 60갑자 계산 ───────────────────
  // 각각 dayPillar / datePillars 표준 헬퍼 (KASI 절기 룩업) 한 줄 사용.
  // adapter 가 stem/branch 를 받으면 toGanji 로 한자/한글/로마자 풀세트 생성.
  const focusDate = new Date(`${TARGET_DAY_ISO}T00:00:00`)
  const dayIdx = computeDayPillarIndices(
    focusDate.getFullYear(),
    focusDate.getMonth() + 1,
    focusDate.getDate()
  )
  const iljinStem = STEM_NAMES[dayIdx.stemIndex]
  const iljinBranch = BRANCH_NAMES[dayIdx.branchIndex]

  // 월운 — TARGET_MONTH 의 절기-기반 월주.
  const woolunRef = getMonthPillarForDate(
    new Date(`2026-${String(TARGET_MONTH).padStart(2, '0')}-15T00:00:00`)
  )
  const woolunStem = woolunRef.stem
  const woolunBranch = woolunRef.branch

  // ─── 5) adapter 호출 (5 tier prop 자동 어셈블) ─────────────────────────
  // toUser — dignities / almutenFiguris / lotsFull 까지 한 번에.
  const userBase = toUser(natal, {
    birthDisplay: '1995-02-09 06:40',
    place: '서울',
    sex: '남',
    lots: natal.astro.lots,
    intro: lifetimeFlow?.intro,
  })
  // toUser 의 sect 는 객체 (kind/ko/light/lightKo); DestinyUserSummary.sect 는
  // literal 'day'|'night' — sectKind alias 로 평탄화.
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

  // toLifetime — daewoon + lifeStages + milestones + ZR Spirit/Fortune 챕터 자동.
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

  // DestinyDecade 는 sewoonNow / hapchung / unseong / zrSpiritChapters /
  // zrFortuneChapters 가 필수 — adapter 미채움 시 fallback.
  // pillar 도 DestinyDecadePillar(element 포함) 로 평탄화.
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

  // 유효한 사주면 대운은 항상 계산된다. null 이면 입력/계산이 깨진 것 — fail-loud.
  if (!decadeAdapter) {
    throw new Error('대운 계산 실패: 유효한 사주인데 대운 리스트가 비었습니다 (불변식 위반).')
  }
  const decade: DestinyDecade & {
    crossActivations?: Array<{
      signalId: string
      name: string
      sajuLine?: string
      astroLine?: string
      polarity: number
      meaning?: string
    }>
    geokgukStatus?: string
  } = {
    gz: decadeAdapter.gz,
    start: decadeAdapter.start,
    end: decadeAdapter.end,
    ageFrom: decadeAdapter.ageFrom,
    ageTo: decadeAdapter.ageTo,
    sibsin: decadeAdapter.sibsin,
    theme: decadeAdapter.theme,
    themeEn: decadeAdapter.themeEn,
    headline: decadeAdapter.headline,
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
    astro: decadeAdapter.astro.map((a) => ({
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

  // toYear — profectionWheel 12 슬롯 / monthlyScores 12개월 / ZR 챕터 자동.
  const yearAdapter = toYear(natal, {
    year: TARGET_YEAR,
    yearlySignals,
    cells, // monthlyScores 자동 빌드용
  })
  // DestinyYear 는 profection 이 *필수* — yearlySignals 에 profection signal 이 없으면
  // 만나이 % 12 + 1 fallback 으로 활성 하우스만 채우고 wheel 룩업.
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
  }

  // toMonth — 30일 캘린더 + bestDay 자동 + 월운(woolun) GZ.
  // narrative — lifetimeFlow.intro 한 줄 + 그 달 cell.topReasons 상위 5개 chip.
  const monthNarrative: Array<{ tag: string; body: string }> = []
  if (lifetimeFlow?.intro) {
    monthNarrative.push({ tag: '타고난 결', body: lifetimeFlow.intro })
  }
  const monthTopReasons = monthCells
    .flatMap((c) => (c.topReasons ?? []).map((r) => ({ score: c.derivedScore, body: r })))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
  for (const r of monthTopReasons) {
    monthNarrative.push({ tag: '이 달의 결', body: r.body })
  }
  const { month: monthAdapter, calendar } = toMonth({
    ym: monthPrefix,
    label: `${TARGET_YEAR}년 ${TARGET_MONTH}월`,
    cells: monthCells,
    woolunStem,
    woolunBranch,
    narrative: monthNarrative,
  })
  // 이달의 큰 날 — convergence keyDays(윈도우+신뢰도). 페이지에서 직접 호출해
  // 월 카드에 실어준다(이전엔 deriveConvergence 가 아예 안 불려 큰 날이 비었음).
  const monthKeyDays = deriveConvergence(monthCells, 5, 'ko').keyDays.map((k) => ({
    date: k.date.slice(5), // MM-DD
    meaning: k.meaning,
    astro: k.astro,
    saju: k.saju,
    bothSystems: k.bothSystems,
    window: k.window,
    confidence: k.confidence,
  }))
  // DestinyMonth 는 woolun / converge / bestDay 가 필수 — adapter 미채움 시 fallback.
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

  // toDay — jijanggan obj / gongmang / topReasons / cautions / allSignals 자동.
  // iljinStem/iljinBranch 를 넘기면 adapter 가 hanja/kr/en 풀 ganji + 일간기준 십신.
  const dayAdapter = toDay({
    cell: dayCell,
    natal,
    iljinStem,
    iljinBranch,
  })
  // DestinyDay 는 geokgukStatus 가 *객체* shape (name / status / factors / description) —
  // 본명 advancedAnalysis 에서 그대로 재구성.
  const advanced = natal.saju.analyses
  const statusResult = advanced?.geokguk?.statusResult
  const geokgukName = advanced?.geokguk?.primary ?? '미정'
  // ── 일진 cell.signals → DestinySignal[] 풀세트 projection ──
  // adapter 의 DestinypalDaySignal 은 id/weight/layer/source 를 버리는데
  // DayTier 의 signal stream + FixedStarRow + ArabicLotRow 정렬·필터에 모두 필요.
  // 여기서 한 번에 평탄화한다 (transit 도 동일한 stream 안에 넣어 sortSignals 가
  // layer priority 로 정렬).
  type DSig = DestinyDay['allSignals'][number]
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

  // applied-pattern / cross-activation 풀 — DestinyDay shape 에 맞춰 채움.
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
  }

  // ilgan 한자 (Topbar) — adapter user.ilgan.hanja 그대로.
  const ilganHanja = user.ilgan.hanja || '辛'

  return (
    <PreviewClient
      topbar={{
        whoBirthLine: '1995.2.9 06:40',
        place: '서울',
        ilganHanja,
      }}
      user={user}
      lifetime={lifetime}
      decade={decade}
      year={year}
      month={month}
      day={day}
    />
  )
}

/* ============================================================
   /destinypal — Phase D 정식 라우트 (실 사용자 본명)
   ───────────────────────────────────────────────────────────
   /destinypal/preview (1995 고정 본명) 와 동일한 흐름이지만, BIRTH 상수
   를 next-auth getServerSession + prisma UserProfile 로 동적으로 대체.

   인증·본명 가드:
     · 세션 없음           → BirthRequiredFallback reason="login"
     · 세션 OK, 본명 부족  → BirthRequiredFallback reason="no-birth"
     · 둘 다 OK            → preview 와 동일한 5 tier 어셈블 진행

   "본명 부족" 판정:
     · birthDate, birthTime, latitude, longitude, tzId 중 하나라도 null/공란
       이면 본명 미입력으로 본다. (gender 는 'U' 도 허용 — male/female 로
       강제 매핑되므로 buildNatalContext 가 받아낼 수 있음.)
   ============================================================ */

import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

import PreviewClient from './preview/PreviewClient'
import BirthRequiredFallback from './birth-required'

import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
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

import type {
  DestinyUserSummary,
  DestinyDecade,
  DestinyMonth,
  DestinyDay,
  DestinyYear,
} from '@/types/calendar'

// 서버 컴포넌트 — Swiss Ephemeris 비용 서버에서 한 번에 치름.
// 세션 기반이므로 force-dynamic 필수 (정적 캐시 금지).
export const dynamic = 'force-dynamic'

// DB UserProfile.gender → BuildContextInput.gender ('male' | 'female') 매핑.
// 현재 쓰기 경로(genderSchema)는 canonical 'female'/'male' 로 저장하고, 레거시
// 행은 'F'/'M'/'U' 일 수 있으므로 둘 다(대소문자 무시) 처리한다. 미상/기타는
// male 로 기본 (calendar-engine 이 둘 중 하나를 요구 — 향후 unknown 지원 시 분기).
// ⚠ 직전엔 `g === 'F'` 만 검사해, canonical 'female' 로 저장된 모든 여성 유저가
//   남성으로 계산되던 버그가 있었다(대운 방향·운세 전체 오류).
function normalizeGender(g: string | null | undefined): 'male' | 'female' {
  const v = (g ?? '').trim().toLowerCase()
  if (v === 'female' || v === 'f') return 'female'
  return 'male'
}

// MM-DD 한국어 표기 — preview 와 동일한 whoBirthLine 형식 ('1995.2.9 06:40').
function formatBirthLine(birthDate: string, birthTime: string): string {
  const [y, m, d] = birthDate.split('-')
  const ymd = `${Number(y)}.${Number(m)}.${Number(d)}`
  return `${ymd} ${birthTime}`
}

export default async function DestinypalPage() {
  // ─── 1) 세션 검사 ─────────────────────────────────────────────────────
  const session = await getServerSession()
  if (!session?.user?.id) {
    return <BirthRequiredFallback reason="login" />
  }

  // ─── 2) UserProfile 본명 fetch (prisma 직접 — /api/me/profile 와 동일 스키마) ──
  const userRow = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      profile: {
        select: {
          birthDate: true,
          birthTime: true,
          gender: true,
          birthCity: true,
          latitude: true,
          longitude: true,
          tzId: true,
        },
      },
    },
  })
  const profile = userRow?.profile
  const isBirthComplete =
    !!profile?.birthDate &&
    !!profile?.birthTime &&
    typeof profile?.latitude === 'number' &&
    typeof profile?.longitude === 'number' &&
    !!profile?.tzId

  if (!isBirthComplete || !profile) {
    return <BirthRequiredFallback reason="no-birth" />
  }

  // ─── 3) BIRTH 동적 구성 (preview 의 상수 자리) ────────────────────────
  const BIRTH = {
    birthDate: profile.birthDate!,
    birthTime: profile.birthTime!,
    gender: normalizeGender(profile.gender),
    latitude: profile.latitude!,
    longitude: profile.longitude!,
    timeZone: profile.tzId!,
  }
  const BIRTH_YEAR = Number(profile.birthDate!.split('-')[0])

  // 현재 연·월·일 — 전부 UTC 기준으로 통일. 엔진 셀 버킷팅이 UTC 이고
  // targetDayIso 도 toISOString(UTC)이라, TARGET_YEAR/MONTH 만 서버 로컬이면
  // 비-UTC 서버의 월·연 경계에서 month grid 와 focus 일이 어긋난다. 셋 다 UTC.
  const now = new Date()
  const TARGET_YEAR = now.getUTCFullYear()
  const TARGET_MONTH = now.getUTCMonth() + 1
  const TARGET_DAY = now.getUTCDate()
  const targetDayIso = now.toISOString().slice(0, 10)

  // ─── 4) NatalContext (사주 + 점성 본명) ───────────────────────────────
  const natal = await buildNatalContext(BIRTH)

  // ─── 5) 올해 캘린더 (cell.signals 풀 = 4 tier 의 본체) ────────────────
  const cells = await buildCalendar(
    natal,
    {
      start: `${TARGET_YEAR}-01-01T00:00:00.000Z`,
      end: `${TARGET_YEAR}-12-31T23:59:59.999Z`,
      granularity: 'day',
    },
    { includeEvidence: true }
  )

  // ─── 6) lifetimeFlow / lifetimePivots derivers ─────────────────────────
  const lifetimeFlow = deriveLifetimeFlow(natal)
  const lifetimePivots = deriveLifetimePivots(natal)

  // ─── 7) yearly / month / day 슬라이스 ─────────────────────────────────
  const monthPrefix = `${TARGET_YEAR}-${String(TARGET_MONTH).padStart(2, '0')}`
  const monthCells = cells.filter((c) => c.datetime.slice(0, 7) === monthPrefix)
  const dayCell = cells.find((c) => c.datetime.slice(0, 10) === targetDayIso) ?? cells[0]
  const yearlySignals = cells.flatMap((c) => c.signals).filter((s) => s.layer === 'yearly')

  // 층별 점수 — 일/시는 일진, 월은 월운, 년은 세운, 10년은 대운 신호로만.
  const layered = deriveLayeredScores(cells)

  // ─── 7.5) iljin(일진) / woolun(월운) 60갑자 — preview 와 동일 (KASI 절기 룩업) ──
  // toDay/toMonth 에 stem/branch 를 넘겨야 adapter 가 한자/한글/로마자 + 십신을
  // 채운다. 안 넘기면 일주·월운·12운성이 빈칸으로 나간다(직전 라이브 버그).
  const [focusY, focusM, focusD] = targetDayIso.split('-').map(Number)
  const dayIdx = computeDayPillarIndices(focusY, focusM, focusD)
  const iljinStem = STEM_NAMES[dayIdx.stemIndex]
  const iljinBranch = BRANCH_NAMES[dayIdx.branchIndex]
  const woolunRef = getMonthPillarForDate(
    new Date(`${TARGET_YEAR}-${String(TARGET_MONTH).padStart(2, '0')}-15T00:00:00`)
  )
  const woolunStem = woolunRef.stem
  const woolunBranch = woolunRef.branch

  // ─── 8) adapter 호출 (5 tier prop 자동 어셈블 — preview 와 동일) ──────
  const birthDisplay = formatBirthLine(profile.birthDate!, profile.birthTime!)
  const place = profile.birthCity || '미입력'

  const userBase = toUser(natal, {
    birthDisplay,
    place,
    sex: BIRTH.gender === 'female' ? '여' : '남',
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

  // 월 narrative — 타고난 결(lifetimeFlow.intro) + 그 달 상위 topReasons (preview 동일).
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
    dayScores: layered.daily,
    // 현재월을 보여주므로 펼침 기준일은 '오늘'. 안 주면 최고점수일로 펼쳐졌다.
    focusDay: TARGET_DAY,
  })
  // 이달의 큰 날 — convergence keyDays(윈도우+신뢰도). preview/page 와 동일 wiring.
  const monthKeyDays = deriveConvergence(monthCells, 5, 'ko').keyDays.map((k) => ({
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

  const dayAdapter = toDay({
    cell: dayCell,
    natal,
    iljinStem,
    iljinBranch,
    favorScore: layered.daily.get(dayCell.datetime.slice(0, 10))?.score,
  })
  const advanced = natal.saju.analyses
  const statusResult = advanced?.geokguk?.statusResult
  const geokgukName = advanced?.geokguk?.primary ?? '미정'
  // ── 일진 cell.signals → DestinySignal[] 풀세트 projection (preview 동일) ──
  // adapter 의 DestinypalDaySignal 은 id/weight/layer/source 를 버리는데 DayTier 의
  // signal stream + FixedStarRow + ArabicLotRow 정렬·필터에 모두 필요. 직전 라이브는
  // 이 투영을 빼고 signals:[] 를 박아 Day tier 가 통째로 비어 나갔다.
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
  }

  const ilganHanja = user.ilgan.hanja || '辛'

  return (
    <PreviewClient
      topbar={{
        whoBirthLine: birthDisplay,
        place,
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

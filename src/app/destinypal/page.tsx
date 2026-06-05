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

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'

import PreviewClient from './preview/PreviewClient'
import BirthRequiredFallback from './birth-required'

import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { deriveLifetimeFlow } from '@/lib/calendar-engine/derivers/lifetimeFlow'
import { deriveLifetimePivots } from '@/lib/calendar-engine/derivers/lifetimePivots'

import {
  toUser,
  toLifetime,
  toDecade,
  toYear,
  toMonth,
  toDay,
} from '@/components/destinypal/adapters'

import type {
  DestinyUserSummary,
  DestinyDecade,
  DestinyMonth,
  DestinyDay,
  DestinyYear,
} from '@/types/destinypal'

// 서버 컴포넌트 — Swiss Ephemeris 비용 서버에서 한 번에 치름.
// 세션 기반이므로 force-dynamic 필수 (정적 캐시 금지).
export const dynamic = 'force-dynamic'

// DB UserProfile.gender ('M' | 'F' | 'U' | null) → BuildContextInput.gender
// ('male' | 'female') 매핑. 미상은 male 로 기본 (calendar-engine 이 둘 중
// 하나를 요구 — 향후 unknown 지원 시 여기서 분기).
function normalizeGender(g: string | null | undefined): 'male' | 'female' {
  if (g === 'F') return 'female'
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
  const session = await getServerSession(authOptions)
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

  // 현재 연·월·일 — 서버 시각 기준. preview 의 TARGET_YEAR/MONTH/DAY 고정값 대체.
  const now = new Date()
  const TARGET_YEAR = now.getFullYear()
  const TARGET_MONTH = now.getMonth() + 1
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
    { includeEvidence: true },
  )

  // ─── 6) lifetimeFlow / lifetimePivots derivers ─────────────────────────
  const lifetimeFlow = deriveLifetimeFlow(natal)
  const lifetimePivots = deriveLifetimePivots(natal)

  // ─── 7) yearly / month / day 슬라이스 ─────────────────────────────────
  const monthPrefix = `${TARGET_YEAR}-${String(TARGET_MONTH).padStart(2, '0')}`
  const monthCells = cells.filter((c) => c.datetime.slice(0, 7) === monthPrefix)
  const dayCell =
    cells.find((c) => c.datetime.slice(0, 10) === targetDayIso) ?? cells[0]
  const yearlySignals = cells
    .flatMap((c) => c.signals)
    .filter((s) => s.layer === 'yearly')

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
    sex: (userBase.sex === '남' || userBase.sex === '여' ? userBase.sex : '남'),
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
      primary: (natal.saju.yongsin.secondary ?? natal.saju.yongsin.primary),
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
  const decadalSignals = cells
    .flatMap((c) => c.signals)
    .filter((s) => s.layer === 'decadal')
  const decadeAdapter = toDecade(natal, {
    currentAge,
    currentYear: TARGET_YEAR,
    decadalSignals,
    focusYear: TARGET_YEAR,
  })
  type FE = DestinyDecade['pillar']['cheongan']['element']
  const STEM_EL_FALLBACK: Record<string, FE> = {
    甲: '목', 乙: '목', 丙: '화', 丁: '화',
    戊: '토', 己: '토', 庚: '금', 辛: '금',
    壬: '수', 癸: '수',
  }
  const BRANCH_EL_FALLBACK: Record<string, FE> = {
    子: '수', 丑: '토', 寅: '목', 卯: '목',
    辰: '토', 巳: '화', 午: '화', 未: '토',
    申: '금', 酉: '금', 戌: '토', 亥: '수',
  }
  function pickElement(hanja: string, fallback: Record<string, FE>): FE {
    return fallback[hanja] ?? '목'
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
  } = decadeAdapter
    ? {
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
        hapchung: decadeAdapter.hapchung
          ? {
              title: decadeAdapter.hapchung.title,
              romaji: decadeAdapter.hapchung.romaji,
              body: decadeAdapter.hapchung.body,
            }
          : { title: '—', body: '본명 × 대운 합·충 분석 준비 중.' },
        unseong: decadeAdapter.unseong
          ? {
              title: decadeAdapter.unseong.title,
              romaji: decadeAdapter.unseong.romaji,
              body: decadeAdapter.unseong.body,
            }
          : { title: '—', body: '12운성 분석 준비 중.' },
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
    : {
        gz: { hanja: '—', kr: '—', en: '—' },
        start: TARGET_YEAR,
        end: TARGET_YEAR + 10,
        ageFrom: currentAge,
        ageTo: currentAge + 10,
        sibsin: '—',
        theme: '대운 정보 준비 중',
        themeEn: 'Decade pending',
        headline: '대운 정보가 아직 준비되지 않았습니다.',
        pillar: {
          cheongan: { hanja: '—', sibsin: '—', el: '—', element: '목', note: '' },
          jiji: { hanja: '—', sibsin: '—', el: '—', element: '목', note: '' },
        },
        sewoonNow: { gz: { hanja: '—', kr: '—', en: '—' }, sibsin: '—', year: TARGET_YEAR },
        years: [],
        body: [],
        hapchung: { title: '—', body: '' },
        unseong: { title: '—', body: '' },
        astro: [],
        narrative: [],
        focusYear: TARGET_YEAR,
        zrSpiritChapters: [],
        zrFortuneChapters: [],
        crossActivations: [],
      }

  const yearAdapter = toYear(natal, {
    year: TARGET_YEAR,
    yearlySignals,
    cells,
  })
  const ageThisYear = TARGET_YEAR - BIRTH_YEAR
  const fallbackHouse = ((ageThisYear % 12) + 12) % 12 + 1
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

  const { month: monthAdapter, calendar } = toMonth({
    ym: monthPrefix,
    label: `${TARGET_YEAR}년 ${TARGET_MONTH}월`,
    cells: monthCells,
  })
  const month: DestinyMonth = {
    label: monthAdapter.label,
    ym: monthAdapter.ym,
    woolun: monthAdapter.woolun ?? { hanja: '—', kr: '—', en: '—' },
    cautionDays: monthAdapter.cautionDays,
    goodDays: monthAdapter.goodDays,
    bestDay: monthAdapter.bestDay ?? { date: '', score: 0 },
    avoidDays: monthAdapter.avoidDays,
    themes: monthAdapter.themes,
    narrative: monthAdapter.narrative,
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
  })
  const advanced = natal.saju.analyses
  const statusResult = advanced?.geokguk?.statusResult
  const geokgukName = advanced?.geokguk?.primary ?? '미정'
  const day: DestinyDay = {
    date: dayAdapter.date,
    dateKo: dayAdapter.dateKo,
    iljin: dayAdapter.iljin,
    iljinSibsin: dayAdapter.iljinSibsin,
    score: dayAdapter.score,
    oneLine: dayAdapter.oneLine,
    totalSignals: dayAdapter.totalSignals,
    themes: dayAdapter.themes,
    signals: [],
    transits: [],
    crossSignals: [],
    allSignals: [],
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
    appliedPatterns: [],
    crossActivations: [],
    shinsalActive: dayAdapter.shinsalActive,
    narrative: dayAdapter.narrative,
    topReasons: dayAdapter.topReasons,
    cautions: dayAdapter.cautions,
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

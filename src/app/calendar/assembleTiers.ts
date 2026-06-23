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
import { deriveMonthSummary } from '@/lib/calendar-engine/derivers/monthSummary'
import { personSeed } from '@/lib/calendar-engine/derivers/personSeed'
import { deriveLayeredScores } from '@/lib/calendar-engine/derivers/layeredScore'
import { computeDayPillarIndices } from '@/lib/saju/dayPillar'
import { getMonthPillarForDate } from '@/lib/saju/datePillars'
import { STEM_NAMES, BRANCH_NAMES } from '@/lib/saju/constants'
import { getSibsinKo } from '@/lib/saju/cycleRelations'

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
import { PROFECTION_THEMES } from '@/components/calendar/adapters/toYear'
import { SIGN_KO } from '@/lib/astrology/signLabels'

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
   * 없으면 연 cells 의 해당 일 셀로 폴백(evidence 없음 — 근거 일부 비어 보일 수 있다).
   */
  focusDayCell?: CalendarCell | null
  /**
   * "지금" 주입점 — lifetime pivot 의 현재 나이/phase(past·current·upcoming)
   * 기준. 미지정 시 호출 시점(new Date()). 프로덕션은 그대로, 테스트는 고정.
   */
  now?: Date
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

// cross-activation 페어 파서 — 연 셀(경량 캐시)은 evidence.detail 을 비우므로
// detail.sajuKey/astroKey 가 없을 수 있다. 신호 name("편관 × 화성")은 항상 살아남아
// 거기서 십신·행성을 뽑는다. (예전엔 detail 만 읽어 월교차 "() ↔" / 일교차 빈 ↔ 버그.)
const PLANET_EN_FROM_KO: Record<string, string> = Object.fromEntries(
  Object.entries(PLANET_KO).map(([en, ko]) => [ko, en])
)
function parseCrossName(name: string | undefined): { sajuKo: string; astroKo: string } {
  const parts = (name ?? '').split('×').map((x) => x.trim())
  return { sajuKo: parts[0] ?? '', astroKo: parts[1] ?? '' }
}
// 교차 페어 키 — 구조화 evidence.detail(sajuKey=KO 십신/신살, astroKey=영문 행성)이
// 있으면 그걸 쓰고, 없으면(연 셀은 detail 을 비움) 표시 name 파싱으로 폴백. detail
// 우선이 견고하다 — name 의 '×' 글리프/구분자/로케일 포맷 변경에 안 흔들린다.
function crossKeys(s: {
  name?: string
  evidence?: { detail?: Record<string, unknown> | null } | null
}): { sajuKo: string; astroKo: string } {
  const d = s.evidence?.detail
  const sajuKey = typeof d?.sajuKey === 'string' ? d.sajuKey : ''
  const astroKey = typeof d?.astroKey === 'string' ? d.astroKey : ''
  if (sajuKey && astroKey) {
    return { sajuKo: sajuKey, astroKo: PLANET_KO[astroKey] ?? astroKey }
  }
  return parseCrossName(s.name)
}
// 매핑 의미문은 "편관 × 화성 — …" 로 시작 — 카드가 페어를 따로 보여주므로 머리 제거.
function stripCrossPair(t: string): string {
  return t.replace(/^[^—]*×[^—]*—\s*/, '')
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
    now,
  } = args

  // ─── lifetimeFlow / lifetimePivots derivers ─────────────────────────────
  // 두 deriver 에 동일한 now 를 주입 — "현재 단계"와 "현재 pivot"이 같은 날짜를
  // 가리키도록(예전엔 flow 가 now 미주입으로 서버 시계를 읽어 둘이 어긋났다).
  const lifetimeFlow = deriveLifetimeFlow(natal, lang, undefined, now)
  const lifetimePivots = deriveLifetimePivots(natal, lang, undefined, now)

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
  // 월운 기준 인스턴트는 *UTC* 로 만든다. tz-less `new Date('YYYY-MM-15T00:00:00')`
  // 는 서버 로컬로 해석돼 절입(節入) 근처에서 서버 시간대별로 60갑자가 갈렸다
  // (Honolulu↔Seoul ~19h 차). 15일이라 실제 플립은 드물지만 결정성 위반이라 고정.
  // (extractor 경로 saju-pillar.ts 는 이미 UTC — 이 표시 경로만 회귀였다.)
  const woolunRef = getMonthPillarForDate(new Date(Date.UTC(TARGET_YEAR, TARGET_MONTH - 1, 15)))
  const woolunStem = woolunRef.stem
  const woolunBranch = woolunRef.branch

  // ─── adapter 호출 (5 tier prop 자동 어셈블) ──────────────────────────────
  const userBase = toUser(natal, {
    birthDisplay,
    place,
    sex,
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
    iljuArchetype: userBase.iljuArchetype,
  }

  // 개인 시드 — 본명 고정 값(일간·용신·격국·신강약)에서 한 번 산출. 템플릿 문구를
  // 사람마다 다르게 고르는 데 쓴다(month.seed·day.seed 로 전달). 날짜 무관.
  const seed = personSeed([
    user.ilgan.hanja,
    user.ilgan.kr,
    user.yongsin.hanja,
    user.gyeokguk,
    user.gangyak,
  ])

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
    bodyEn: decadeAdapter.bodyEn,
    hapchung: {
      title: decadeAdapter.hapchung.title,
      romaji: decadeAdapter.hapchung.romaji,
      body: decadeAdapter.hapchung.body,
      bodyEn: decadeAdapter.hapchung.bodyEn,
    },
    unseong: {
      title: decadeAdapter.unseong.title,
      romaji: decadeAdapter.unseong.romaji,
      body: decadeAdapter.unseong.body,
      bodyEn: decadeAdapter.unseong.bodyEn,
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
    // evidence 없는 (캐시) cells 또는 7~12월생(신호창 미겹침)이면 yearAdapter.profection
    // 이 undefined → 여기 fallback. house 는 나이로 정확히 복원되므로, theme 는 정본
    // PROFECTION_THEMES 에서 채우고 cusp/ruler 도 한글화한다(영어 누수·빈 theme 방지).
    profection: yearAdapter.profection ?? {
      house: fallbackHouse,
      theme: PROFECTION_THEMES[fallbackHouse]?.theme ?? '',
      themeEn: PROFECTION_THEMES[fallbackHouse]?.themeEn ?? '',
      cusp: wheelSlot ? (SIGN_KO[wheelSlot.cuspSign] ?? (wheelSlot.cuspSign as string)) : '',
      cuspEn: wheelSlot?.cuspSign ?? 'Aries',
      ruler: wheelSlot ? (PLANET_KO[wheelSlot.cuspRuler] ?? (wheelSlot.cuspRuler as string)) : '',
      rulerEn: wheelSlot?.cuspRuler ?? 'Sun',
      rulerNatal: '',
      rulerNatalEn: '',
      rulerNatalHouse: 0,
      rulerNatalSign: 'Aries',
    },
    // fallback 일 때 휠의 active 슬롯이 비어 "현재 하우스" 강조가 사라지므로 채워준다.
    profectionWheel: yearAdapter.profection
      ? yearAdapter.profectionWheel
      : yearAdapter.profectionWheel.map((w) => ({ ...w, active: w.house === fallbackHouse })),
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
    tone: k.tone,
    astro: k.astro,
    saju: k.saju,
    bothSystems: k.bothSystems,
    window: k.window,
    confidence: k.confidence,
  }))
  // 월운 천간 십신 — 본명 일간 기준 상대 십신. MonthTier 의 '한 줄 총평' 리드 문장
  // ("이달은 '○○' 쪽으로 결이 기울어요") + 용어 태그(甲午 · 편재)가 이 값을 쓴다.
  // 이전엔 어디서도 할당하지 않아 항상 undefined → 리드 문장 누락 + 태그에 십신 빠짐.
  const woolunStemSibsin = getSibsinKo(user.ilgan.hanja, woolunStem) || undefined

  const month: DestinyMonth = {
    label: monthAdapter.label,
    ym: monthAdapter.ym,
    woolun: monthAdapter.woolun ?? { hanja: '—', kr: '—', en: '—' },
    woolunSibsin: woolunStemSibsin,
    woolunStemSibsin,
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
    seed,
  }

  // 이달 총평 — 타이밍·톤·지배 테마를 이어지는 한 문단으로 합성(deriveMonthSummary).
  // 기존 narrative(인트로+토막)가 안 녹이던 best/caution/converge 날짜·분포를 글로.
  // narrative 맨 앞에 '이달 총평' 태그로 넣어 카드 선두에 노출.
  // 양쪽 로케일 요약을 함께 만들어 보관 — 클라이언트 로케일 토글 시 서버언어로
  // 굳어 한글/영문이 어긋나던 문제(감사 #1 가시성) 해소. 정본 태그 '이달 총평'으로
  // 찾고, body=ko / bodyEn=en 를 MonthTier 가 로케일로 고른다.
  const monthReasonsBy = (en: boolean): string[] =>
    dedupeByBody(
      monthCells
        .flatMap((c) =>
          ((en ? c.topReasonsEn : c.topReasons) ?? []).map((r) => ({
            score: c.derivedScore,
            body: r,
          }))
        )
        .sort((a, b) => b.score - a.score)
    )
      .slice(0, 4)
      .map((r) => r.body)
  const summaryCommon = {
    woolunKr: month.woolun?.kr && month.woolun.kr !== '—' ? month.woolun.kr : undefined,
    goodDays: month.goodDays.length,
    cautionDays: month.cautionDays.length,
    totalDays: monthCells.length,
    bestDay: month.bestDay?.date || undefined,
    cautionDay: month.cautionDays[0],
    convergeDate: month.converge?.date || undefined,
  }
  // bestDayReason(keyDays meaning)은 서버 lang 으로만 산출돼 있어 그 로케일 요약에만 싣는다.
  const bestDayReason = monthKeyDays.find((k) => k.date === month.bestDay?.date)?.meaning
  const summaryKo = deriveMonthSummary({
    ...summaryCommon,
    topReasons: monthReasonsBy(false),
    bestDayReason: lang === 'ko' ? bestDayReason : undefined,
    lang: 'ko',
    seed,
  })
  const summaryEn = deriveMonthSummary({
    ...summaryCommon,
    topReasons: monthReasonsBy(true),
    bestDayReason: lang === 'en' ? bestDayReason : undefined,
    lang: 'en',
    seed,
  })
  if (summaryKo || summaryEn) {
    month.narrative = [{ tag: '이달 총평', body: summaryKo, bodyEn: summaryEn }, ...month.narrative]
  }

  // 이 달의 사주×점성 교차 — monthly 층 cross-activation 페어를 모아 카드 원료로.
  // 같은 페어가 그 달 여러 윈도우로 잡혀 id 는 달라도 의미는 같으므로 *페어* 기준
  // 중복 제거(가장 센 |polarity| 보존), |polarity| 상위 6개.
  type MCross = NonNullable<DestinyMonth['crossActivations']>[number]
  const monthCrossByPair = new Map<string, MCross>()
  for (const c of monthCells) {
    for (const s of c.signals) {
      if (s.kind !== 'cross-activation' || s.layer !== 'monthly') continue
      // 구조화 detail 우선(연 셀은 비어 name 파싱으로 폴백).
      const { sajuKo, astroKo } = crossKeys(s)
      if (!sajuKo || !astroKo) continue
      const pairKey = `${sajuKo}|${astroKo}`
      const prev = monthCrossByPair.get(pairKey)
      if (prev && Math.abs(prev.polarity) >= Math.abs(s.polarity)) continue
      monthCrossByPair.set(pairKey, {
        saju: sajuKo,
        sajuEn: SIBSIN_EN[sajuKo] ?? translateSignalLabel(sajuKo, 'en'),
        astro: astroKo,
        astroEn: PLANET_EN_FROM_KO[astroKo] ?? astroKo,
        meaning: stripCrossPair(s.korean ?? ''),
        meaningEn: stripCrossPair(s.english ?? ''),
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

  // ── 포커스(오늘) 셀 톤 정합 ──
  // 월 grid 의 셀 색은 *원점수 밴드*(60/35)인데, 일 카드 헤드라인은 toDay 가 화해한
  // verdict(tense/bright)다. 밴드↔신호 톤이 어긋난 날(tense: 좋은밴드인데 흉신 우세 /
  // bright: 낮은밴드인데 살릴 구석)은 같은 날 월=초록"좋음" vs 일=평이 로 모순됐다.
  // 포커스일(양쪽에 동시에 보이는 유일한 날)만 화해와 어긋나는 밴드 바를 중립화해
  // (mark→'focus': 바 없음, 오늘 링만) 두 화면의 톤을 일치시킨다. 비포커스일은
  // evidence 가 없어 화해 불가 — 그날로 다이브하면 그 셀이 포커스가 되어 동일 처리.
  if (dayAdapter.dayTone?.tense || dayAdapter.dayTone?.bright) {
    const focusCell = month.calendar.find((c) => c.focus)
    if (
      focusCell &&
      focusCell.mark &&
      focusCell.mark !== 'focus' &&
      focusCell.mark !== 'converge'
    ) {
      focusCell.mark = 'focus'
      // 밴드 바를 중립화한 날은 good/caution/avoid 버킷에서도 빼야 한다 —
      // 안 그러면 헤더·총평의 카운트(goodN/cautionN/avoidN)가 그리드의 실제
      // 색 셀보다 1 많아진다(off-by-one). MM-DD 키로 세 버킷에서 제거.
      const focusDs = focusCell.ds
      month.cautionDays = month.cautionDays.filter((d) => d !== focusDs)
      month.goodDays = month.goodDays.filter((d) => d !== focusDs)
      month.avoidDays = month.avoidDays.filter((d) => d !== focusDs)
    }
  }

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
      // 엔진이 EN 라벨을 별도 방출했으면(있을 때만) 보존 — DayTier 신호 스트림이
      // EN 로케일에서 s.english 우선 사용(없으면 localizeLabel 폴백, KO 유지).
      english: s.english,
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
  // name("편관 × 화성")에서 파싱 — detail.sajuName/astroName 은 존재하지 않는 필드라
  // 양쪽이 늘 빈 ↔ 로 떴다. name 파싱 + korean/english 로 교정. 같은 페어가 여러
  // 층(daily/monthly…)에서 잡혀 중복되므로 페어 기준 1개(가장 센 것)만 남긴다.
  const dayCrossByPair = new Map<string, DestinyDay['crossActivations'][number]>()
  for (const s of dayCell.signals) {
    if (s.kind !== 'cross-activation') continue
    // 포커스일 셀은 evidence.detail 이 살아 있어 구조화 키를 직접 쓴다(견고).
    const { sajuKo, astroKo } = crossKeys(s)
    if (!sajuKo || !astroKo) continue
    const key = `${sajuKo}|${astroKo}`
    const prev = dayCrossByPair.get(key)
    if (prev && Math.abs(prev.polarity) >= Math.abs(s.polarity)) continue
    const ko = lang === 'ko'
    dayCrossByPair.set(key, {
      id: s.id,
      sajuSide: ko ? sajuKo : (SIBSIN_EN[sajuKo] ?? translateSignalLabel(sajuKo, 'en')),
      astroSide: ko ? astroKo : (PLANET_EN_FROM_KO[astroKo] ?? astroKo),
      sajuKo, // raw — 분야 라우팅이 로케일에 흔들리지 않게(EN 에선 영문이라 키워드 매칭 실패).
      astroKo,
      // 양쪽 로케일 보관 — DayTier 가 클라이언트 로케일로 고른다(토글 불일치 방지).
      meaning: stripCrossPair(s.korean ?? ''),
      meaningEn: stripCrossPair(s.english ?? ''),
      polarity: s.polarity,
      weight: s.weight,
    })
  }
  const dayCrossActivations: DestinyDay['crossActivations'] = [...dayCrossByPair.values()].sort(
    (a, b) => Math.abs(b.polarity) - Math.abs(a.polarity)
  )
  // ── 타이밍 컨텍스트 (이달 흐름 추이 + 다가오는 7일) ──
  // 이달 일별 점수(추이선) — monthCells 순서대로, layered.daily 의 정규화 점수.
  const dayMonthScores = monthCells.map((c) => {
    const iso = c.datetime.slice(0, 10)
    return {
      day: Number(iso.slice(8, 10)),
      score: Math.round(layered.daily.get(iso)?.score ?? 50),
      today: iso === targetDayIso,
    }
  })
  // 다가오는 7일 — 오늘 다음날부터. cells 범위 밖(월말 등)은 자연히 짧아진다.
  const cellByIso = new Map(cells.map((c) => [c.datetime.slice(0, 10), c]))
  const upcoming: Array<{ date: string; score: number }> = []
  for (let i = 1; i <= 7; i++) {
    const d = new Date(`${targetDayIso}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + i)
    const iso = d.toISOString().slice(0, 10)
    if (!cellByIso.has(iso)) continue
    upcoming.push({ date: iso, score: Math.round(layered.daily.get(iso)?.score ?? 50) })
  }

  const day: DestinyDay = {
    date: dayAdapter.date,
    dateKo: dayAdapter.dateKo,
    iljin: dayAdapter.iljin,
    iljinSibsin: dayAdapter.iljinSibsin,
    // 본명 일간 — 그날 십신의 기준점. 화면 맨 위 기준선에 노출.
    dayMaster: { hanja: user.ilgan.hanja, kr: user.ilgan.kr, en: user.ilgan.en },
    seed,
    score: dayAdapter.score,
    oneLine: dayAdapter.oneLine,
    oneLineEn: dayAdapter.oneLineEn,
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
    topReasonsEn: dayAdapter.topReasonsEn,
    cautions: dayAdapter.cautions,
    cautionsEn: dayAdapter.cautionsEn,
    // 출력 화해 verdict — toDay 가 산출한 단일 권위. 빠뜨리면 DayTier 가 중립
    // fallback 으로 떨어져 tense/bright 화해가 프로덕션에서 죽는다(반드시 전달).
    dayTone: dayAdapter.dayTone,
    twelveStageMatrix: dayAdapter.twelveStageMatrix,
    monthScores: dayMonthScores,
    upcoming,
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

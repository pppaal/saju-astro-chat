import { calculateSajuData } from '@/lib/saju/saju'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { calculateChiron, calculateLilith } from '@/lib/astrology/foundation/extraPoints'
import { natalToJD, matchHouseForCusps, UNKNOWN_HOUSE } from '@/lib/astrology/foundation/shared'
import { determineYongsin } from '@/lib/saju/yongsin'
import { determineGeokguk } from '@/lib/saju/geokguk'
import { annotateShinsal, type ShinsalHit as ShinsalHitInternal, getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/saju/relations'
import { performAdvancedAnalysis } from '@/app/api/saju/services/advancedAnalysis'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import { calculateZodiacalReleasing } from '@/lib/astrology/foundation/zodiacalReleasing'
import { calculateArabicLots, type ArabicLot } from '@/lib/astrology/foundation/arabicParts'
import { dignityTiers, dignityScore } from '@/lib/astrology/foundation/dignities'
import {
  calculateAlmutenFiguris,
  type AlmutenFigurisResult,
} from '@/lib/astrology/foundation/almutenFiguris'
import { JIJANGGAN } from '@/lib/saju/constants'
import { logger } from '@/lib/logger'
import type {
  NatalContext,
  NatalDayJijanggan,
  NatalArabicLot,
  ZodiacalReleasingResult,
  DignityResult,
  NatalDignityEntry,
} from './types'
import type { FiveElement, SajuPillarsInput, CalculateSajuDataResult } from '@/lib/saju/types'
import type { AspectHit, NatalInput, Chart, ZodiacKo } from '@/lib/astrology/foundation/types'
import type { NatalChartData } from '@/lib/astrology/foundation/astrologyService'

export interface BuildContextInput {
  birthDate: string // 'YYYY-MM-DD' (solar)
  birthTime: string // 'HH:MM' or 'HH:MM:SS'
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string // IANA
  calendarType?: 'solar' | 'lunar'
  lunarLeap?: boolean
}

/**
 * 같은 요청 안에서 이미 계산된 본명 결과를 재사용.
 * /api/calendar route가 기존 엔진용으로 계산한 sajuResult / natalChart를
 * 새 엔진에 주입해 중복 Swiss Ephemeris 호출 방지.
 */
export interface PreComputedNatal {
  saju?: CalculateSajuDataResult
  /** 이미 toChart() 처리된 Chart, 또는 raw NatalChartData (자동 변환) */
  astroChart?: Chart | NatalChartData
}

/**
 * 사용자 입력으로부터 NatalContext 빌드.
 * 사주 + 점성 차트 동시 계산, 용신·강약·신살·관계까지 한 번에 채움.
 *
 * preComputed 인자가 있으면 그 결과를 재사용 (중복 계산 방지).
 */
export async function buildNatalContext(
  input: BuildContextInput,
  preComputed: PreComputedNatal = {}
): Promise<NatalContext> {
  const [yearStr, monthStr, dayStr] = input.birthDate.split('-')
  const [hourStr, minuteStr] = input.birthTime.split(':')

  const natalInput: NatalInput = {
    year: Number(yearStr),
    month: Number(monthStr),
    date: Number(dayStr),
    hour: Number(hourStr),
    minute: Number(minuteStr),
    latitude: input.latitude,
    longitude: input.longitude,
    timeZone: input.timeZone,
  }

  // ─── 사주 계산 (pre-computed 있으면 재사용) ───
  // calculateSajuData는 내부 LRU 캐시 있어 호출 자체 비용 낮음.
  // 그래도 같은 요청에서 두 번 호출 방지.
  const saju =
    preComputed.saju ??
    calculateSajuData(
      input.birthDate,
      input.birthTime,
      input.gender,
      input.calendarType ?? 'solar',
      input.timeZone,
      input.lunarLeap,
      // 진태양시(진경도) 보정 — 출생지 경도가 있으면 운세 차트와 동일하게 적용.
      // 없으면 undefined → 한국 LMT 기존 동작 유지.
      input.longitude
    )
  const pillars = saju.pillars

  // 용신·강약
  const pillarsInput: SajuPillarsInput = {
    year: { stem: pillars.year.heavenlyStem.name, branch: pillars.year.earthlyBranch.name },
    month: { stem: pillars.month.heavenlyStem.name, branch: pillars.month.earthlyBranch.name },
    day: { stem: pillars.day.heavenlyStem.name, branch: pillars.day.earthlyBranch.name },
    time: { stem: pillars.time.heavenlyStem.name, branch: pillars.time.earthlyBranch.name },
  }
  const yongsinResult = determineYongsin(pillarsInput)

  // 격국 판정 — 명리상 主格(primary structure). 사주의 본질 구조를 한 마디로
  // 요약하는 라벨. 본명에 한 번만 결정되는 정적 속성이라 컨텍스트에 캐시.
  // 판정 불가('미정')인 경우는 노출하지 않는다 — 카드에서 비어 보이는 게 낫다.
  let geokguk: string | undefined
  try {
    const geokgukResult = determineGeokguk(pillarsInput)
    if (geokgukResult.primary && geokgukResult.primary !== '미정') {
      geokguk = geokgukResult.primary
    }
  } catch {
    geokguk = undefined
  }

  // 신살·관계
  const shinsalAnnot = annotateShinsal(pillars)
  const relations = analyzeRelations(toAnalyzeInputFromSaju(pillars))

  // 격국·용신·통근·득령·조후·십신·건강·직업·점수·해석 종합 분석.
  // pure compute (Swiss Ephemeris 호출 없음) — 한번 계산해서 캐시에 저장하면
  // 운명/궁합 차트 PersonaCard·InsightStrip 가 advancedAnalysis.geokguk /
  // yongsin / sibsin 등을 cache hit 으로 받음 (기존: 매 요청 재계산).
  const dayMasterStem = pillars.day.heavenlyStem.name
  const monthBranch = pillars.month.earthlyBranch.name
  const twelveStages = getTwelveStagesForPillars(pillars)
  const simplePillarsForAdvanced: SajuPillarsInput = pillarsInput
  const pillarsWithHourForAdvanced = {
    year: pillarsInput.year,
    month: pillarsInput.month,
    day: pillarsInput.day,
    hour: pillarsInput.time,
  }
  const simplePillarsWithHour = {
    ...simplePillarsForAdvanced,
    hour: pillarsInput.time,
  }
  const fiveElementsRaw = (saju as unknown as { fiveElements: NatalContext['saju']['fiveElements'] })
    .fiveElements
  // performAdvancedAnalysis 의 fiveElements 인자는 Record<string, number> 라
  // Korean key 도 English key 도 다 받지만, 내부적으로 isFiveElement 로 한자만
  // pick 하므로 wood/fire/etc. 던지면 elements 해석이 비어 나옴. Korean key 로
  // 변환해서 전달.
  const fiveElementsKo: Record<string, number> = {
    목: fiveElementsRaw.wood,
    화: fiveElementsRaw.fire,
    토: fiveElementsRaw.earth,
    금: fiveElementsRaw.metal,
    수: fiveElementsRaw.water,
  }
  const advancedAnalysis = performAdvancedAnalysis(
    simplePillarsWithHour,
    pillarsWithHourForAdvanced,
    pillars,
    dayMasterStem,
    monthBranch,
    twelveStages,
    fiveElementsKo
  )

  // 대운 리스트 (CalculateSajuDataResult.daeWoon에서)
  const daeWoonList =
    (
      saju as unknown as {
        daeWoon?: { list?: Array<{ age: number; heavenlyStem: string; earthlyBranch: string }> }
      }
    ).daeWoon?.list ?? []
  const daeun = daeWoonList.map((d) => ({
    startAge: d.age,
    // d.age 는 만 나이 — daysToDaeunAge SSOT (2026-06: +1 제거, 글로벌 만 나이
    // 통일). 만 N세는 (출생연도 + N) 년에 도달하므로 그대로 더한다.
    startYear: natalInput.year + d.age,
    stem: d.heavenlyStem,
    branch: d.earthlyBranch,
  }))

  // ─── 점성 차트 계산 (pre-computed 있으면 재사용) ───
  // ★ Swiss Ephemeris 호출 회피 — 가장 비싼 단계.
  let chart: Chart
  if (preComputed.astroChart) {
    // Chart인지 NatalChartData인지 판별 — Chart에는 .houses[].cusp 가 있고
    // NatalChartData에는 .houses[].cusp + .formatted 가 있음. 안전하게 toChart 항상 통과.
    const candidate = preComputed.astroChart as Chart & NatalChartData
    chart =
      'planets' in candidate && Array.isArray(candidate.planets) && 'sign' in candidate.planets[0]
        ? (candidate as Chart)
        : toChart(candidate as NatalChartData)
  } else {
    const natalChartData = await calculateNatalChart(natalInput)
    chart = toChart(natalChartData)
  }

  // 섹트 결정 — Sun이 지평선 위(7~12궁 또는 1궁)에 있으면 day, 아니면 night
  const sun = chart.planets.find((p) => p.name === 'Sun')
  const sect: 'day' | 'night' = sun && sun.house >= 7 ? 'day' : 'night'

  // 본명 카이런·릴리스 — 차트 planets(10행성+노드)엔 없는 천체. 트랜짓이 이 점들로
  // 들어오는 신호(예: 토성 ☌ 본명 카이런)를 잡기 위해 별도 보관. 실패해도 무시.
  let extraPoints: NatalContext['astro']['extraPoints']
  try {
    const utJd = natalToJD(natalInput)
    const houseCusps = chart.houses.map((h) => h.cusp)
    extraPoints = [calculateChiron(utJd, houseCusps), calculateLilith(utJd, houseCusps)]
  } catch {
    extraPoints = undefined
  }

  // ─── 본명 aspects (major + minor) ──────────────────────────────────────
  // findNatalAspects 의 default rules — natal orb +3°, maxResults=100, major
  // only (rules.includeMinor 안 켜면). 한 명당 보통 30-50 hits.
  // chart 가 깨져있어도 안전하게 빈 배열 반환하도록 try/catch.
  let natalAspects: AspectHit[]
  try {
    natalAspects = findNatalAspects(chart, { includeMinor: true })
  } catch (err) {
    logger.warn('[natal-context] findNatalAspects failed, defaulting to []', {
      err: err instanceof Error ? err.message : String(err),
    })
    natalAspects = []
  }

  // ─── 7 Arabic Lots (정통 Hellenistic 산술점) ───────────────────────────
  // calculateArabicLots 는 sect-aware 공식으로 7대 lot (Fortune·Spirit·Eros·
  // Necessity·Courage·Victory·Nemesis) 의 sign · degree · longitude 를 한 번에
  // 산출. 차트 결손 (행성 missing) 시 한 lot 이라도 빠지면 전체 throw — 빈 배열.
  let lots: ArabicLot[] = []
  try {
    lots = calculateArabicLots(chart, sect === 'day')
  } catch (err) {
    logger.warn('[natal-context] Arabic lots calc failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    lots = []
  }

  // ─── lot → house 매핑 (UI 표시용) ──────────────────────────────────────
  // ArabicLot 원 타입은 sign + degreeInSign + longitude 만 갖고 house 는 없다.
  // matchHouseForCusps SSOT (chart.planets house 룩업이 쓰는 동일 함수) 로
  // lot 별 house 산출. cusp 결손 시 UNKNOWN_HOUSE(0) 반환.
  const houseCuspsForLots = chart.houses.map((h) => h.cusp)
  const lotsWithHouse: NatalArabicLot[] = lots.map((l) => ({
    ...l,
    house: matchHouseForCusps(l.longitude, houseCuspsForLots) ?? UNKNOWN_HOUSE,
  }))

  // ─── Zodiacal Releasing L1 (Spirit / Fortune) ──────────────────────────
  // ZR 시작점은 Spirit / Fortune 두 lot 의 sign. 위에서 이미 산출한 lots 재사용 —
  // 한 lot 이 빠지면 (chart missing planet 등) null 로 저장하고 계속 진행.
  const zodiacalReleasing: ZodiacalReleasingResult = { spirit: null, fortune: null }
  const spiritLot = lots.find((l) => l.name === 'Spirit')
  const fortuneLot = lots.find((l) => l.name === 'Fortune')
  if (spiritLot) {
    try {
      zodiacalReleasing.spirit = {
        startSign: spiritLot.sign,
        periods: calculateZodiacalReleasing(spiritLot.sign as ZodiacKo, 90),
      }
    } catch (err) {
      logger.warn('[natal-context] ZR Spirit calc failed', {
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }
  if (fortuneLot) {
    try {
      zodiacalReleasing.fortune = {
        startSign: fortuneLot.sign,
        periods: calculateZodiacalReleasing(fortuneLot.sign as ZodiacKo, 90),
      }
    } catch (err) {
      logger.warn('[natal-context] ZR Fortune calc failed', {
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // ─── 본명 5-tier dignities (per planet) ─────────────────────────────────
  // dignityTiers() 자체는 table look-up 이지만 chart.planets 전체에 매번 부르는
  // 게 extractor 코드 양을 늘림. 캐시 = 본명 행성 list × tiers + score.
  const dignities: DignityResult = []
  for (const p of chart.planets) {
    if (!p.sign) continue
    try {
      const tiers = dignityTiers(p.name, p.sign, p.degree, sect)
      const score = dignityScore(tiers)
      const entry: NatalDignityEntry = {
        planet: p.name,
        sign: p.sign,
        degree: p.degree,
        tiers,
        score,
      }
      dignities.push(entry)
    } catch (err) {
      logger.warn('[natal-context] dignityTiers failed for planet', {
        planet: p.name,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // ─── Almuten Figuris — 4-point (Sun/Moon/ASC/Fortune) ─────────────────
  // Prenatal Lunation 빠진 modern Holden 식. fortuneLot 가 있을 때만 4점,
  // 없으면 3점 (Sun/Moon/ASC) 으로 자동 강등 — calculateAlmutenFiguris 내부 분기.
  let almutenFiguris: AlmutenFigurisResult | null = null
  try {
    almutenFiguris = calculateAlmutenFiguris({
      chart,
      sect,
      fortune: fortuneLot ? { longitude: fortuneLot.longitude } : undefined,
    })
  } catch (err) {
    logger.warn('[natal-context] Almuten Figuris calc failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    almutenFiguris = null
  }

  // ─── 본명 일주 지장간 3층 ─────────────────────────────────────────────
  // JIJANGGAN SSOT (constants.ts) 룩업. 子·卯·午·酉 같은 왕지는 정기만 보유.
  // 정기 결손은 정통상 발생하지 않지만 (모든 지지가 정기는 갖음) 방어적으로 ''.
  const dayBranchName = pillars.day.earthlyBranch.name
  const dayJj = JIJANGGAN[dayBranchName] ?? {}
  const dayJijanggan: NatalDayJijanggan = {
    jeonggi: dayJj['정기'] ?? '',
    junggi: dayJj['중기'] || undefined,
    yeogi: dayJj['여기'] || undefined,
  }

  return {
    input: natalInput,
    saju: {
      pillars,
      dayMaster: {
        name: pillars.day.heavenlyStem.name,
        element: pillars.day.heavenlyStem.element,
        yin_yang: pillars.day.heavenlyStem.yin_yang,
      },
      yongsin: {
        primary: yongsinResult.primaryYongsin,
        secondary: yongsinResult.secondaryYongsin,
        avoid: [yongsinResult.kibsin, yongsinResult.gusin].filter(Boolean) as FiveElement[],
      },
      geokguk,
      strength: mapStrength(yongsinResult.daymasterStrength),
      natalShinsal: shinsalAnnot.hits as unknown as NatalContext['saju']['natalShinsal'],
      natalRelations: relations,
      daeun,
      fiveElements: fiveElementsRaw,
      advancedAnalysis,
      dayJijanggan,
    },
    astro: {
      chart,
      extraPoints,
      sect,
      location: {
        latitude: input.latitude,
        longitude: input.longitude,
        timeZone: input.timeZone,
      },
      natalAspects,
      zodiacalReleasing,
      dignities,
      lots: lotsWithHouse,
      almutenFiguris,
    },
  }
}

function mapStrength(s: string): 'strong' | 'medium' | 'weak' {
  if (s === '극신강' || s === '신강') return 'strong'
  if (s === '극신약' || s === '신약') return 'weak'
  return 'medium'
}

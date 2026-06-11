import { collectSajuFacts } from '@/lib/destiny/sajuFacts'
import { collectAstroFacts } from '@/lib/destiny/astroFacts'
import { toChart } from '@/lib/astrology/foundation/astrologyService'
import { determineYongsin } from '@/lib/saju/yongsin'
import { determineGeokguk } from '@/lib/saju/geokguk'
import {
  annotateShinsal,
  type ShinsalHit as ShinsalHitInternal,
  getTwelveStagesForPillars,
} from '@/lib/saju/shinsal'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/saju/relations'
import { performAnalyses } from '@/lib/saju/analyses'
import { JIJANGGAN } from '@/lib/saju/constants'
import { parseHourMinute } from '@/lib/saju/timeParse'
import { logger } from '@/lib/logger'
import type { NatalContext, NatalDayJijanggan } from './types'
import type { FiveElement, SajuPillarsInput, CalculateSajuDataResult } from '@/lib/saju/types'
import type { NatalInput, Chart } from '@/lib/astrology/foundation/types'
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
  // AM/PM('11:30 PM') 정확히 24h 정규화 — 직접 split(':') 하면 PM 12h 누락 + 분
  // NaN(Number('30 PM'))으로 시주·하우스가 깨졌다. 사주와 동일 파서 사용.
  const { h: birthHour, m: birthMinute } = parseHourMinute(input.birthTime)

  const natalInput: NatalInput = {
    year: Number(yearStr),
    month: Number(monthStr),
    date: Number(dayStr),
    hour: birthHour,
    minute: birthMinute,
    latitude: input.latitude,
    longitude: input.longitude,
    timeZone: input.timeZone,
  }

  // ─── 사주 계산 (pre-computed 있으면 재사용) ───
  // 2026-06-06: collectSajuFacts (운명 SSOT) 위임 — calculateSajuData 직접
  // 호출 대신 facts 의 _raw escape hatch 사용. 모든 raw saju 계산이 한
  // 가공소(facts) 통과. 내부 LRU 캐시 적중으로 비용 동일.
  const saju =
    preComputed.saju ??
    collectSajuFacts({
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      gender: input.gender,
      timezone: input.timeZone,
      // 진태양시(진경도) 보정 — 출생지 경도 있으면 운세 차트와 동일.
      longitude: input.longitude,
      calendarType: input.calendarType,
      lunarLeap: input.lunarLeap,
    })._raw
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
  const fiveElementsRaw = (
    saju as unknown as { fiveElements: NatalContext['saju']['fiveElements'] }
  ).fiveElements
  const analyses = performAnalyses(
    simplePillarsWithHour,
    pillarsWithHourForAdvanced,
    dayMasterStem,
    monthBranch
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

  // ─── 점성 차트 + Hellenistic (collectAstroFacts SSOT) ──────────────────
  // 2026-06-06: 옛 코드는 calculateChiron/Lilith / findNatalAspects /
  // calculateArabicLots / calculateZodiacalReleasing / dignityTiers /
  // calculateAlmutenFiguris 를 여기서 직접 호출했다. 같은 코드가 facts 에도
  // 필요해지면서 중복이 됐고, 본 단계에서 facts 가 includeHellenistic 옵션으로
  // 통째 흡수. build.ts 는 facts 의 hellenistic 객체에서 받기만 한다.
  //
  // preComputed.astroChart 옵션은 calendar/route.ts 의 cascade 캐시 패턴
  // (같은 요청 안 chart 재사용) 호환용 — 단 collectAstroFacts 가 LRU 캐시
  // 적중으로 같은 chart 반환하므로 새 path 에선 무시. 같은 입력 → 같은 chart.
  const astroFacts = await collectAstroFacts({
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone: input.timeZone,
    includeHellenistic: true,
  })
  if (!astroFacts) {
    throw new Error('buildNatalContext: collectAstroFacts returned null')
  }
  void toChart // preComputed.astroChart 옛 caller 호환 import — 새 path 에선 미사용
  let chart: Chart = astroFacts._chart
  if (preComputed.astroChart) {
    const candidate = preComputed.astroChart as Chart & NatalChartData
    chart =
      'planets' in candidate && Array.isArray(candidate.planets) && 'sign' in candidate.planets[0]
        ? (candidate as Chart)
        : toChart(candidate as NatalChartData)
  }
  if (!astroFacts.hellenistic) {
    throw new Error(
      'buildNatalContext: astroFacts.hellenistic missing (includeHellenistic ignored?)'
    )
  }
  const {
    sect,
    extraPoints,
    natalAspects,
    lots: lotsWithHouse,
    zodiacalReleasing,
    dignities,
    almutenFiguris,
  } = astroFacts.hellenistic

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
      analyses,
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

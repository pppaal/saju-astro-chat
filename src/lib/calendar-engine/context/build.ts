import { calculateSajuData } from '@/lib/saju/saju'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { calculateChiron, calculateLilith } from '@/lib/astrology/foundation/extraPoints'
import { natalToJD } from '@/lib/astrology/foundation/shared'
import { determineYongsin } from '@/lib/saju/yongsin'
import { determineGeokguk } from '@/lib/saju/geokguk'
import { annotateShinsal, type ShinsalHit as ShinsalHitInternal, getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/saju/relations'
import { performAdvancedAnalysis } from '@/app/api/saju/services/advancedAnalysis'
import type { NatalContext } from './types'
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
      input.lunarLeap
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

  return {
    input: natalInput,
    gender: input.gender,
    saju: {
      pillars,
      dayMaster: {
        name: pillars.day.heavenlyStem.name,
        element: pillars.day.heavenlyStem.element,
        yin_yang: pillars.day.heavenlyStem.yin_yang,
      },
      yongsin: (() => {
        const primary = yongsinResult.primaryYongsin
        const secondary = yongsinResult.secondaryYongsin
        // 기신·구신에서 용신(primary/secondary)과 겹치는 원소 제외 — 같은 오행이
        // 용신이면서 기신으로 동시 표기되면 길흉이 ±상쇄돼 무작위가 됨(데이터 모순).
        const good = new Set<FiveElement>([primary, secondary].filter(Boolean) as FiveElement[])
        const avoid = ([yongsinResult.kibsin, yongsinResult.gusin].filter(Boolean) as FiveElement[])
          .filter((e) => !good.has(e))
        return { primary, secondary, avoid }
      })(),
      geokguk,
      strength: mapStrength(yongsinResult.daymasterStrength),
      natalShinsal: shinsalAnnot.hits as unknown as NatalContext['saju']['natalShinsal'],
      natalRelations: relations,
      daeun,
      fiveElements: fiveElementsRaw,
      advancedAnalysis,
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
    },
  }
}

function mapStrength(s: string): 'strong' | 'medium' | 'weak' {
  if (s === '극신강' || s === '신강') return 'strong'
  if (s === '극신약' || s === '신약') return 'weak'
  return 'medium'
}

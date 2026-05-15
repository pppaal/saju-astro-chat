import { calculateSajuData } from '@/lib/saju/saju'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { determineYongsin } from '@/lib/saju/yongsin'
import { annotateShinsal, type ShinsalHit as ShinsalHitInternal } from '@/lib/saju/shinsal'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/saju/relations'
import type { NatalContext } from './types'
import type { FiveElement, SajuPillarsInput, CalculateSajuDataResult } from '@/lib/saju/types'
import type { NatalInput, Chart } from '@/lib/astrology/foundation/types'
import type { NatalChartData } from '@/lib/astrology/foundation/astrologyService'

export interface BuildContextInput {
  birthDate: string        // 'YYYY-MM-DD' (solar)
  birthTime: string        // 'HH:MM' or 'HH:MM:SS'
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string         // IANA
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
  preComputed: PreComputedNatal = {},
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
  const saju = preComputed.saju
    ?? calculateSajuData(
      input.birthDate,
      input.birthTime,
      input.gender,
      input.calendarType ?? 'solar',
      input.timeZone,
      input.lunarLeap,
    )
  const pillars = saju.pillars

  // 용신·강약
  const pillarsInput: SajuPillarsInput = {
    year:  { stem: pillars.year.heavenlyStem.name,  branch: pillars.year.earthlyBranch.name },
    month: { stem: pillars.month.heavenlyStem.name, branch: pillars.month.earthlyBranch.name },
    day:   { stem: pillars.day.heavenlyStem.name,   branch: pillars.day.earthlyBranch.name },
    time:  { stem: pillars.time.heavenlyStem.name,  branch: pillars.time.earthlyBranch.name },
  }
  const yongsinResult = determineYongsin(pillarsInput)

  // 신살·관계
  const shinsalAnnot = annotateShinsal(pillars)
  const relations = analyzeRelations(toAnalyzeInputFromSaju(pillars))

  // 대운 리스트 (CalculateSajuDataResult.daeWoon에서)
  const daeWoonList = (saju as unknown as {
    daeWoon?: { list?: Array<{ age: number; heavenlyStem: string; earthlyBranch: string }> }
  }).daeWoon?.list ?? []
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
    chart = 'planets' in candidate && Array.isArray(candidate.planets) && 'sign' in candidate.planets[0]
      ? (candidate as Chart)
      : toChart(candidate as NatalChartData)
  } else {
    const natalChartData = await calculateNatalChart(natalInput)
    chart = toChart(natalChartData)
  }

  // 섹트 결정 — Sun이 지평선 위(7~12궁 또는 1궁)에 있으면 day, 아니면 night
  const sun = chart.planets.find((p) => p.name === 'Sun')
  const sect: 'day' | 'night' = sun && sun.house >= 7 ? 'day' : 'night'

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
      strength: mapStrength(yongsinResult.daymasterStrength),
      natalShinsal: shinsalAnnot.hits as unknown as NatalContext['saju']['natalShinsal'],
      natalRelations: relations,
      daeun,
    },
    astro: {
      chart,
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

import { calculateSajuData } from '@/lib/saju/saju'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { determineYongsin } from '@/lib/saju/yongsin'
import { annotateShinsal, type ShinsalHit as ShinsalHitInternal } from '@/lib/saju/shinsal'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/saju/relations'
import type { NatalContext } from './types'
import type { FiveElement, SajuPillarsInput } from '@/lib/saju/types'
import type { NatalInput } from '@/lib/astrology/foundation/types'

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
 * 사용자 입력으로부터 NatalContext 빌드.
 * 사주 + 점성 차트 동시 계산, 용신·강약·신살·관계까지 한 번에 채움.
 */
export async function buildNatalContext(input: BuildContextInput): Promise<NatalContext> {
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

  // ─── 사주 계산 ───
  const saju = calculateSajuData(
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

  // ─── 점성 차트 계산 ───
  const natalChartData = await calculateNatalChart(natalInput)
  const chart = toChart(natalChartData)

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

// Astrology adapter: birth + queryDate + place → AstroNormalizerInput.
// Calls existing astro engine; bridges TransitAspect → AspectHit shape.

import {
  calculateNatalChart,
  toChart,
  type NatalChartInput,
} from '@/lib/astrology/foundation/astrologyService'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import {
  calculateTransitChart,
  findTransitAspects,
  type TransitAspect,
} from '@/lib/astrology/foundation/transit'
import {
  calculateSolarReturn,
  calculateLunarReturn,
} from '@/lib/astrology/foundation/returns'
import type { AspectHit, Chart } from '@/lib/astrology/foundation/types'
import type { AstroNormalizerInput } from '../normalizer/astro'

export interface AstroAdapterInput {
  // Birth fields aligned with NatalChartInput.
  year: number
  month: number
  date: number
  hour: number
  minute: number
  latitude: number
  longitude: number
  timeZone: string
  // Query date for transits / returns / profection.
  queryDate: Date
  // Optional: skip slow returns to reduce latency.
  includeSolarReturn?: boolean
  includeLunarReturn?: boolean
}

function toAspectHit(t: TransitAspect): AspectHit {
  return {
    from: t.from,
    to: t.to,
    type: t.type,
    orb: t.orb,
    applying: t.isApplying,
    score: t.score,
  }
}

function profectionHouseFor(birth: { year: number; month: number; date: number }, queryDate: Date): number {
  const birthDate = new Date(birth.year, birth.month - 1, birth.date)
  const ageYears = Math.floor(
    (queryDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000),
  )
  // Annual profection: house = (age mod 12) + 1.
  return ((Math.max(0, ageYears) % 12) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
}

export async function buildAstroNormalizerInput(
  input: AstroAdapterInput,
): Promise<AstroNormalizerInput> {
  const natalInput: NatalChartInput = {
    year: input.year,
    month: input.month,
    date: input.date,
    hour: input.hour,
    minute: input.minute,
    latitude: input.latitude,
    longitude: input.longitude,
    timeZone: input.timeZone,
  }

  const natalData = await calculateNatalChart(natalInput)
  const natal: Chart = toChart(natalData)
  const natalAspects = findNatalAspects(natal)

  const q = input.queryDate
  const pad = (n: number) => String(n).padStart(2, '0')
  const transitIso = `${q.getUTCFullYear()}-${pad(q.getUTCMonth() + 1)}-${pad(q.getUTCDate())}T${pad(q.getUTCHours())}:${pad(q.getUTCMinutes())}:00`
  const transits = await calculateTransitChart({
    iso: transitIso,
    latitude: input.latitude,
    longitude: input.longitude,
    timeZone: input.timeZone,
  })
  const transitAspects = findTransitAspects(transits, natal).map(toAspectHit)

  let solarReturn: AstroNormalizerInput['solarReturn']
  let lunarReturn: AstroNormalizerInput['lunarReturn']
  if (input.includeSolarReturn !== false) {
    try {
      const sr = await calculateSolarReturn({ natal: natalInput, year: q.getFullYear() })
      solarReturn = { chart: sr }
    } catch {
      solarReturn = undefined
    }
  }
  if (input.includeLunarReturn !== false) {
    try {
      const lr = await calculateLunarReturn({
        natal: natalInput,
        year: q.getFullYear(),
        month: q.getMonth() + 1,
      })
      lunarReturn = { chart: lr }
    } catch {
      lunarReturn = undefined
    }
  }

  const profectionHouse = profectionHouseFor(input, q)

  return {
    natal,
    natalAspects,
    transits,
    transitAspects,
    solarReturn,
    lunarReturn,
    profectionHouse,
  }
}

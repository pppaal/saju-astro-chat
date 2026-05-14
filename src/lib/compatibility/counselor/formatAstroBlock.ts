/**
 * formatAstroBlock — convert two natal charts + their synastry into the
 * canonical chart-sharing one-line format:
 *
 *   Sun in Aquarius Conjunction Sun in Aquarius (Orb: 6°22')
 *   Partner A's Sun in the 4th of Partner B
 *
 * LLMs are well-trained on this format (it's how cafeastrology.com,
 * astro-charts.com etc. share data), so we keep it verbatim rather than
 * pre-digesting into JSON.
 */

import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { calculateSynastry } from '@/lib/astrology/foundation/synastry'
import type { AspectHit, AspectType, Chart } from '@/lib/astrology/foundation/types'
import { logger } from '@/lib/logger'
import type { CounselorPerson } from './types'

const FALLBACK = {
  latitude: 37.5665,
  longitude: 126.978,
  tzId: 'Asia/Seoul',
}

const ASPECT_LABEL: Record<AspectType, string> = {
  conjunction: 'Conjunction',
  sextile: 'Sextile',
  square: 'Square',
  trine: 'Trine',
  opposition: 'Opposition',
  semisextile: 'Semi-sextile',
  quincunx: 'Quincunx',
  quintile: 'Quintile',
  biquintile: 'Bi-quintile',
}

interface BirthParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function parseBirthParts(date: string, time: string): BirthParts | null {
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const timeMatch = (time || '00:00').match(/^(\d{2}):(\d{2})$/)
  if (!dateMatch || !timeMatch) return null
  return {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
  }
}

function formatOrb(orb: number): string {
  const deg = Math.floor(orb)
  const min = Math.round((orb - deg) * 60)
  // 60' rounding edge case
  if (min === 60) return `${deg + 1}°00'`
  return `${deg}°${String(min).padStart(2, '0')}'`
}

interface PersonChart {
  person: CounselorPerson
  chart: Chart
  hasLocation: boolean
}

async function loadChart(p: CounselorPerson): Promise<PersonChart | null> {
  const parts = parseBirthParts(p.birthDate, p.birthTime || '00:00')
  if (!parts) return null
  const hasLocation = p.latitude != null && p.longitude != null
  try {
    const natal = await calculateNatalChart({
      year: parts.year,
      month: parts.month,
      date: parts.day,
      hour: parts.hour,
      minute: parts.minute,
      latitude: p.latitude ?? FALLBACK.latitude,
      longitude: p.longitude ?? FALLBACK.longitude,
      timeZone: p.tzId || FALLBACK.tzId,
    })
    return { person: p, chart: toChart(natal), hasLocation }
  } catch (err) {
    logger.warn('[counselor] natal chart failed', err)
    return null
  }
}

function formatAspectLine(hit: AspectHit): string {
  const fromName = hit.from.name
  const toName = hit.to.name
  const fromSign = hit.from.sign ?? '-'
  const toSign = hit.to.sign ?? '-'
  const aspect = ASPECT_LABEL[hit.type] || hit.type
  return `${fromName} in ${fromSign} ${aspect} ${toName} in ${toSign} (Orb: ${formatOrb(hit.orb)})`
}

function houseOverlayLine(side: 'A' | 'B', planet: string, inHouse: number): string {
  // "Partner A's Sun in the 4th of Partner B"
  return `Partner ${side}'s ${planet} in the ${ordinal(inHouse)} of Partner ${side === 'A' ? 'B' : 'A'}`
}

function ordinal(n: number): string {
  const map: Record<number, string> = {
    1: '1st',
    2: '2nd',
    3: '3rd',
    4: '4th',
    5: '5th',
    6: '6th',
    7: '7th',
    8: '8th',
    9: '9th',
    10: '10th',
    11: '11th',
    12: '12th',
  }
  return map[n] || `${n}th`
}

export async function formatAstroBlock(
  personA: CounselorPerson,
  personB: CounselorPerson
): Promise<{ block: string; missingLocation: string[] }> {
  const [chartA, chartB] = await Promise.all([loadChart(personA), loadChart(personB)])
  if (!chartA || !chartB) {
    return {
      block: '(점성 데이터 계산에 실패했어요. 출생 정보를 다시 확인해 주세요.)',
      missingLocation: [],
    }
  }

  const missingLocation: string[] = []
  if (!chartA.hasLocation) missingLocation.push(personA.name)
  if (!chartB.hasLocation) missingLocation.push(personB.name)

  const synastry = calculateSynastry({ chartA: chartA.chart, chartB: chartB.chart })

  // Sort aspects by tightest orb first — most diagnostic ones lead the list.
  const sortedAspects = [...synastry.aspects].sort((a, b) => a.orb - b.orb)

  const aspectLines = sortedAspects.map(formatAspectLine)

  const overlayA = synastry.houseOverlaysAtoB.map((o) => houseOverlayLine('A', o.planet, o.inHouse))
  const overlayB = synastry.houseOverlaysBtoA.map((o) => houseOverlayLine('B', o.planet, o.inHouse))

  const lines: string[] = []
  lines.push("— Synastry Aspects (Partner A's planet → Partner B's planet) —")
  lines.push('')
  lines.push(...aspectLines)
  lines.push('')
  lines.push('— House Overlays (whose planet falls into whose house) —')
  lines.push('')
  lines.push(...overlayA)
  lines.push('')
  lines.push(...overlayB)

  return { block: lines.join('\n'), missingLocation }
}

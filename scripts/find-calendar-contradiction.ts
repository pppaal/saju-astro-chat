import { calculateSajuData } from '../src/lib/Saju/saju'
import { STEM_TO_ELEMENT_EN as STEM_TO_ELEMENT } from '../src/lib/Saju/constants'
import { calculateNatalChart } from '../src/lib/astrology/foundation/astrologyService'
import { calculateYearlyImportantDates } from '../src/lib/destiny-map/destinyCalendar'

type CalendarDate = {
  date: string
  score: number
  grade: number
  title?: string
  summary?: string
  warnings?: string[]
  recommendations?: string[]
  evidence?: {
    confidence?: number
    crossAgreementPercent?: number
  }
}

type RawDate = {
  date: string
  score: number
  grade: number
  recommendationKeys: string[]
  warningKeys: string[]
}

const DEFAULT_QUERY = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  birthPlace: 'Seoul',
  year: 2026,
  locale: 'ko',
}

const LOCATION_COORDS: Record<string, { lat: number; lng: number; tz: string }> = {
  Seoul: { lat: 37.5665, lng: 126.978, tz: 'Asia/Seoul' },
}

const IRREVERSIBLE_PATTERN =
  /(\uACC4\uC57D|\uC11C\uBA85|\uD655\uC815|\uC608\uC57D|\uACB0\uD63C\uC2DD|\uCCAD\uCCA9\uC7A5|\uC774\uC9C1\s*\uD655\uC815|\uCC3D\uC5C5\s*\uD655\uC815|\uB7F0\uCE6D|\uD070\s*\uACB0\uC815|\uC989\uC2DC\s*\uACB0\uC815|sign(?: now)?|finalize|confirm|book|wedding|invitation|big decision|resign|launch|commit now)/i

const COMMUNICATION_PATTERN =
  /(\uC7AC\uD655\uC778|\uCEE4\uBBA4\uB2C8\uCF00\uC774\uC158|communication|recheck|\uC624\uB958|retrograde|void)/i

const CONFLICT_PATTERN =
  /(\uCDA9\uB3CC|\uD574\uC11D\s*\uAC08\uB9BC|\uAC08\uB9BC|conflict|mixed signals|\uAE34\uC7A5\+\uACBD\uACC4)/i

function deriveFallbackSunSign(birthDate: Date): string {
  const month = birthDate.getMonth()
  const day = birthDate.getDate()
  if ((month === 2 && day >= 21) || (month === 3 && day <= 19)) return 'Aries'
  if ((month === 3 && day >= 20) || (month === 4 && day <= 20)) return 'Taurus'
  if ((month === 4 && day >= 21) || (month === 5 && day <= 20)) return 'Gemini'
  if ((month === 5 && day >= 21) || (month === 6 && day <= 22)) return 'Cancer'
  if ((month === 6 && day >= 23) || (month === 7 && day <= 22)) return 'Leo'
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Virgo'
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Libra'
  if ((month === 9 && day >= 23) || (month === 10 && day <= 21)) return 'Scorpio'
  if ((month === 10 && day >= 22) || (month === 11 && day <= 21)) return 'Sagittarius'
  if ((month === 11 && day >= 22) || (month === 0 && day <= 19)) return 'Capricorn'
  if ((month === 0 && day >= 20) || (month === 1 && day <= 18)) return 'Aquarius'
  return 'Pisces'
}

function getStemName(pillar: unknown): string {
  const p = pillar as {
    heavenlyStem?: { name?: string } | string
    stem?: { name?: string } | string
  }
  if (typeof p?.heavenlyStem === 'object' && p.heavenlyStem && 'name' in p.heavenlyStem) {
    return p.heavenlyStem.name || ''
  }
  if (typeof p?.stem === 'object' && p.stem && 'name' in p.stem) {
    return p.stem.name || ''
  }
  if (typeof p?.heavenlyStem === 'string') return p.heavenlyStem
  if (typeof p?.stem === 'string') return p.stem
  return ''
}

function getBranchName(pillar: unknown): string {
  const p = pillar as {
    earthlyBranch?: { name?: string } | string
    branch?: { name?: string } | string
  }
  if (typeof p?.earthlyBranch === 'object' && p.earthlyBranch && 'name' in p.earthlyBranch) {
    return p.earthlyBranch.name || ''
  }
  if (typeof p?.branch === 'object' && p.branch && 'name' in p.branch) {
    return p.branch.name || ''
  }
  if (typeof p?.earthlyBranch === 'string') return p.earthlyBranch
  if (typeof p?.branch === 'string') return p.branch
  return ''
}

function isFailingDay(day: CalendarDate): boolean {
  const confidence = day.evidence?.confidence ?? 100
  const lowConfidence = confidence < 45
  const labels = `${day.title || ''} ${day.summary || ''}`
  const warningText = (day.warnings || []).join(' ')
  const recommendationText = (day.recommendations || []).join(' ')
  const hasConflictLabel = CONFLICT_PATTERN.test(labels)
  const hasCommunicationWarning = COMMUNICATION_PATTERN.test(warningText)
  const hasVerificationTone =
    /(\uC7AC\uD655\uC778|24\uC2DC\uAC04|review|verify|recheck|draft)/i.test(recommendationText)
  const hasIrreversible = IRREVERSIBLE_PATTERN.test(recommendationText) && !hasVerificationTone
  return (lowConfidence || hasConflictLabel || hasCommunicationWarning) && hasIrreversible
}

async function buildRawDates() {
  const birthDate = new Date(`${DEFAULT_QUERY.birthDate}T00:00:00`)
  const coords = LOCATION_COORDS[DEFAULT_QUERY.birthPlace]
  const [birthHour, birthMinute] = DEFAULT_QUERY.birthTime.split(':').map(Number)

  const sajuResult = calculateSajuData(
    DEFAULT_QUERY.birthDate,
    DEFAULT_QUERY.birthTime,
    'male',
    'solar',
    coords.tz
  )

  const pillars = sajuResult?.pillars || {}
  const dayMaster = getStemName(pillars.day)
  const dayMasterElement = STEM_TO_ELEMENT[dayMaster] || 'wood'

  const sajuProfile = {
    dayMaster,
    dayMasterElement,
    dayBranch: getBranchName(pillars.day),
    birthYear: birthDate.getFullYear(),
    yearBranch: getBranchName(pillars.year),
    daeunCycles:
      sajuResult.unse?.daeun
        ?.map((d) => ({
          age: d.age || 0,
          heavenlyStem: d.heavenlyStem || '',
          earthlyBranch: d.earthlyBranch || '',
        }))
        .filter((d) => d.heavenlyStem && d.earthlyBranch) || [],
    daeunsu: sajuResult.daeWoon?.startAge ?? 0,
    pillars: {
      year: { stem: getStemName(pillars.year), branch: getBranchName(pillars.year) },
      month: { stem: getStemName(pillars.month), branch: getBranchName(pillars.month) },
      day: { stem: getStemName(pillars.day), branch: getBranchName(pillars.day) },
      hour: { stem: getStemName(pillars.time), branch: getBranchName(pillars.time) },
    },
  }

  let sunSign = deriveFallbackSunSign(birthDate)
  let sunElement = 'fire'
  let sunLongitude = 0
  try {
    const natalChart = await calculateNatalChart({
      year: birthDate.getFullYear(),
      month: birthDate.getMonth() + 1,
      date: birthDate.getDate(),
      hour: birthHour || 12,
      minute: birthMinute || 0,
      latitude: coords.lat,
      longitude: coords.lng,
      timeZone: coords.tz,
    })
    const sunPlanet = natalChart.planets.find((p) => p.name === 'Sun')
    if (sunPlanet?.sign) sunSign = sunPlanet.sign
    sunLongitude = sunPlanet?.longitude || 0
    const zodiacToElement: Record<string, string> = {
      Aries: 'fire',
      Leo: 'fire',
      Sagittarius: 'fire',
      Taurus: 'earth',
      Virgo: 'earth',
      Capricorn: 'earth',
      Gemini: 'metal',
      Libra: 'metal',
      Aquarius: 'metal',
      Cancer: 'water',
      Scorpio: 'water',
      Pisces: 'water',
    }
    sunElement = zodiacToElement[sunSign] || 'fire'
  } catch {
    // fallback already set above
  }

  const astroProfile = {
    sunSign,
    sunElement,
    sunLongitude,
    birthMonth: birthDate.getMonth() + 1,
    birthDay: birthDate.getDate(),
  }

  return calculateYearlyImportantDates(DEFAULT_QUERY.year, sajuProfile, astroProfile, {
    minGrade: 4,
  }) as RawDate[]
}

async function main() {
  const baseUrl = process.env.CALENDAR_BASE_URL || 'http://localhost:3010'
  const token = process.env.CALENDAR_API_TOKEN || process.env.PUBLIC_API_TOKEN || 'public-token'
  const qs = new URLSearchParams({
    birthDate: DEFAULT_QUERY.birthDate,
    birthTime: DEFAULT_QUERY.birthTime,
    birthPlace: DEFAULT_QUERY.birthPlace,
    year: String(DEFAULT_QUERY.year),
    locale: DEFAULT_QUERY.locale,
  })

  const response = await fetch(`${baseUrl}/api/calendar?${qs.toString()}`, {
    headers: { 'x-api-token': token },
  })

  if (!response.ok) {
    throw new Error(`/api/calendar failed with ${response.status}`)
  }

  const payload = (await response.json()) as { allDates?: CalendarDate[] }
  const allDates = payload.allDates || []
  const failingDay = allDates.find(isFailingDay)

  if (!failingDay) {
    console.log(
      JSON.stringify(
        {
          status: 'NO_FAILING_DAY',
          checkedCount: allDates.length,
          query: DEFAULT_QUERY,
        },
        null,
        2
      )
    )
    return
  }

  const rawDates = await buildRawDates()
  const raw = rawDates.find((d) => d.date === failingDay.date)

  console.log(
    JSON.stringify(
      {
        status: 'FOUND_FAILING_DAY',
        query: DEFAULT_QUERY,
        date: failingDay.date,
        score: failingDay.score,
        grade: failingDay.grade,
        confidence: failingDay.evidence?.confidence,
        crossAgreementPercent: failingDay.evidence?.crossAgreementPercent,
        title: failingDay.title,
        summary: failingDay.summary,
        warningKeys: raw?.warningKeys || [],
        recommendationKeys: raw?.recommendationKeys || [],
        warnings: failingDay.warnings || [],
        recommendations: failingDay.recommendations || [],
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

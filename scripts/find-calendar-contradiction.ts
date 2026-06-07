// Standalone valence-contradiction scanner for the yearly calendar.
//
// calculateYearlyImportantDates 의 ko 출력(titleKey/descKey/사주·점성 요소)을
// 직접 훑어, 그날 등급(grade)과 어긋나는 길흉 문구가 한 날에 섞여 있는지 잡는다.
// 서버/번역 불필요 — ko locale 키가 이미 완성 문장이라 텍스트 그대로 스캔.
//
// 좋은 날(grade<=1)에 강한 부정 verdict, 나쁜 날(grade>=3)에 강한 긍정 verdict가
// 박히면 모순으로 신고하고 exit 1 — narrative valence 일관성 회귀 가드로 쓴다.
import { calculateSajuData } from '../src/lib/saju/saju'
import { STEM_TO_ELEMENT_EN as STEM_TO_ELEMENT } from '../src/lib/saju/constants'
import { calculateNatalChart } from '../src/lib/astrology/foundation/astrologyService'
import { calculateYearlyImportantDates } from '../src/lib/calendar/destinyCalendar'

type ScannedDate = {
  date: string
  grade: number
  score: number
  titleKey: string
  descKey: string
  sajuFactorKeys: string[]
  astroFactorKeys: string[]
}

const DEFAULT_QUERY = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  birthPlace: 'Seoul',
  year: 2026,
}

const LOCATION_COORDS: Record<string, { lat: number; lng: number; tz: string }> = {
  Seoul: { lat: 37.5665, lng: 126.978, tz: 'Asia/Seoul' },
}

// 그날 등급과 어긋나면 안 되는 verdict 문구.
// 좋은 날(grade<=1)에 나오면 모순:
const NEGATIVE_VERDICTS = [
  '제동을 걸어요',
  '한 박자 두세요',
  '흩트리는 분위기',
  '리스크부터 줄이',
  '추진력이 약한',
  '큰 결정은 다음',
]
// 나쁜 날(grade>=3)에 나오면 모순:
const POSITIVE_VERDICTS = [
  '힘을 실어줘요',
  '가벼워지는 날',
  '받쳐주는 분위기',
  '진도 빼기 좋',
  '또렷한 신호를 보태',
]

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

async function buildDates(): Promise<ScannedDate[]> {
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
    pillars: {
      year: { stem: getStemName(pillars.year), branch: getBranchName(pillars.year) },
      month: { stem: getStemName(pillars.month), branch: getBranchName(pillars.month) },
      day: { stem: getStemName(pillars.day), branch: getBranchName(pillars.day) },
      hour: { stem: getStemName(pillars.time), branch: getBranchName(pillars.time) },
    },
  }

  let sunSign = deriveFallbackSunSign(birthDate)
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
  } catch {
    // fallback already set
  }

  const astroProfile = {
    sunSign,
    birthMonth: birthDate.getMonth() + 1,
    birthDay: birthDate.getDate(),
  }

  return calculateYearlyImportantDates(
    DEFAULT_QUERY.year,
    sajuProfile as never,
    astroProfile as never,
    {
      minGrade: 4,
      locale: 'ko',
    }
  ) as unknown as ScannedDate[]
}

function scanDay(d: ScannedDate): string[] {
  const text = [
    d.titleKey,
    d.descKey,
    ...(d.sajuFactorKeys || []),
    ...(d.astroFactorKeys || []),
  ].join(' │ ')
  const hits: string[] = []
  if (d.grade <= 1) {
    for (const p of NEGATIVE_VERDICTS)
      if (text.includes(p)) hits.push(`길일(grade ${d.grade})에 부정 verdict "${p}"`)
  }
  if (d.grade >= 3) {
    for (const p of POSITIVE_VERDICTS)
      if (text.includes(p)) hits.push(`흉일(grade ${d.grade})에 긍정 verdict "${p}"`)
  }
  return hits
}

async function main() {
  const dates = await buildDates()
  const contradictions: Array<{ date: string; grade: number; hits: string[] }> = []
  for (const d of dates) {
    const hits = scanDay(d)
    if (hits.length) contradictions.push({ date: d.date, grade: d.grade, hits })
  }

  console.log(`스캔: ${dates.length}일 (${DEFAULT_QUERY.year}, ${DEFAULT_QUERY.birthDate})`)
  if (contradictions.length === 0) {
    console.log('✅ valence 모순 없음 — narrative가 그날 등급과 일치.')
    return
  }
  console.log(`❌ valence 모순 ${contradictions.length}건:\n`)
  for (const c of contradictions) {
    console.log(`📅 ${c.date} (grade ${c.grade})`)
    for (const h of c.hits) console.log(`   - ${h}`)
  }
  process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

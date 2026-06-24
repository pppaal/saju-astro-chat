/**
 * Generate 50 diverse lifetime-flow dumps for the fleet audit.
 * Each `${PREFIX}-lifetime.json` carries BOTH ko and en copy (tone/toneEn,
 * body/bodyEn, label/labelEn, line/lineEn …) so one file = 영한 둘다.
 *
 *   npx tsx scripts/gen-lifetime-fleet.ts
 */
import { writeFileSync } from 'node:fs'
import { calculateSajuData } from '../src/lib/saju/saju'
import { buildNatalContext } from '../src/lib/calendar-engine/context/build'
import { buildCalendar } from '../src/lib/calendar-engine'
import { assembleTiers } from '../src/app/calendar/assembleTiers'

const OUT =
  '/tmp/claude-0/-home-user-saju-astro-chat/1d20fb2f-d849-5d3d-9e88-c2bd904a0a34/scratchpad/fleet'

// A few real coordinates so non-Seoul births are exercised too.
const PLACES = [
  { place: '서울', lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' },
  { place: '부산', lat: 35.1796, lon: 129.0756, tz: 'Asia/Seoul' },
  { place: '제주', lat: 33.4996, lon: 126.5312, tz: 'Asia/Seoul' },
  { place: 'New York', lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
  { place: 'London', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
]

// 50 profiles: birth years spread 1942→2017 so "now"(2026) lands in every
// life stage incl. elders & children; genders alternate; month/day/time vary.
type P = { date: string; time: string; gender: 'male' | 'female'; loc: number }
const profiles: P[] = []
for (let i = 0; i < 50; i++) {
  const year = 1942 + Math.round((i * 75) / 49) // 1942 … 2017
  const month = ((i * 7) % 12) + 1
  const day = ((i * 13) % 27) + 1
  const hour = (i * 5) % 24
  const minute = (i * 17) % 60
  profiles.push({
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    gender: i % 2 === 0 ? 'male' : 'female',
    loc: i % PLACES.length,
  })
}

const TARGET_YEAR = 2026
const FOCUS = '2026-06-15'

async function one(p: P, idx: number) {
  const loc = PLACES[p.loc]
  const BIRTH = {
    birthDate: p.date,
    birthTime: p.time,
    gender: p.gender,
    latitude: loc.lat,
    longitude: loc.lon,
    timeZone: loc.tz,
  }
  const saju = calculateSajuData(BIRTH.birthDate, BIRTH.birthTime, BIRTH.gender, 'solar', BIRTH.timeZone)
  const natal = await buildNatalContext(BIRTH, { saju })
  const cells = await buildCalendar(
    natal,
    { start: `${FOCUS}T00:00:00.000Z`, end: `${FOCUS}T23:59:59.000Z`, granularity: 'day' },
    { includeEvidence: false }
  )
  const { lifetime } = await assembleTiers({
    natal,
    cells,
    lang: 'ko',
    birthYear: Number(BIRTH.birthDate.slice(0, 4)),
    targetYear: TARGET_YEAR,
    targetMonth: 6,
    targetDay: 15,
    targetDayIso: FOCUS,
    sex: p.gender === 'female' ? '여' : '남',
    birthDisplay: `${BIRTH.birthDate} ${BIRTH.birthTime}`,
    whoBirthLine: `${BIRTH.birthDate} ${BIRTH.birthTime}`,
    place: loc.place,
    focusDayCell: cells[0] ?? null,
  })
  const prefix = `p${String(idx + 1).padStart(2, '0')}`
  const meta = {
    profile: prefix,
    birth: `${p.date} ${p.time}`,
    gender: p.gender,
    place: loc.place,
    ageNow: TARGET_YEAR - Number(p.date.slice(0, 4)),
  }
  writeFileSync(`${OUT}/${prefix}-lifetime.json`, JSON.stringify({ meta, lifetime }, null, 2))
  return `${prefix} ${meta.birth} ${p.gender} ${loc.place} age≈${meta.ageNow}`
}

async function main() {
  const { mkdirSync } = await import('node:fs')
  mkdirSync(OUT, { recursive: true })
  for (let i = 0; i < profiles.length; i++) {
    const line = await one(profiles[i], i)
    console.log(line)
  }
  console.log(`\n✓ wrote ${profiles.length} lifetime dumps to ${OUT}`)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})

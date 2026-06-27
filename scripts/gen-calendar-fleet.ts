/**
 * 캘린더 + 운흐름 감사용 — 12개 다양한 프로필의 month/year/day/lifetime 티어 덤프.
 * 풀 month 캘린더(ephemeris)를 빌드해 실제 day/month/year 티어를 만든다.
 *   npx tsx scripts/gen-calendar-fleet.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { calculateSajuData } from '../src/lib/saju/saju'
import { buildNatalContext } from '../src/lib/calendar-engine/context/build'
import { buildCalendar } from '../src/lib/calendar-engine'
import { assembleTiers } from '../src/app/calendar/assembleTiers'

const OUT =
  '/tmp/claude-0/-home-user-saju-astro-chat/1d20fb2f-d849-5d3d-9e88-c2bd904a0a34/scratchpad/calfleet'

const PLACES = [
  { place: '서울', lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' },
  { place: '부산', lat: 35.1796, lon: 129.0756, tz: 'Asia/Seoul' },
  { place: 'New York', lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
  { place: 'London', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
]
const TY = 2026
const TM = 6
const FOCUS = '2026-06-15'

type P = { date: string; time: string; gender: 'male' | 'female'; loc: number }
const profiles: P[] = []
for (let i = 0; i < 12; i++) {
  const year = 1948 + Math.round((i * 66) / 11) // 1948 … 2014
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
  const lastDay = new Date(Date.UTC(TY, TM, 0)).getUTCDate()
  const cells = await buildCalendar(
    natal,
    {
      start: `${TY}-06-01T00:00:00.000Z`,
      end: `${TY}-06-${lastDay}T23:59:59.000Z`,
      granularity: 'day',
    },
    { includeEvidence: true }
  )
  const focusCells = await buildCalendar(
    natal,
    { start: `${FOCUS}T00:00:00.000Z`, end: `${FOCUS}T23:59:59.000Z`, granularity: 'day' },
    { includeEvidence: true }
  )
  const { topbar, user, lifetime, decade, year, month, day } = await assembleTiers({
    natal,
    cells,
    lang: 'ko',
    birthYear: Number(p.date.slice(0, 4)),
    targetYear: TY,
    targetMonth: TM,
    targetDay: 15,
    targetDayIso: FOCUS,
    sex: p.gender === 'female' ? '여' : '남',
    birthDisplay: `${p.date} ${p.time}`,
    whoBirthLine: `${p.date} ${p.time}`,
    place: loc.place,
    focusDayCell: focusCells[0] ?? null,
  })
  const prefix = `c${String(idx + 1).padStart(2, '0')}`
  const meta = { profile: prefix, birth: `${p.date} ${p.time}`, gender: p.gender, place: loc.place, ageNow: TY - Number(p.date.slice(0, 4)) }
  writeFileSync(`${OUT}/${prefix}-month.json`, JSON.stringify({ meta, month }, null, 2))
  writeFileSync(`${OUT}/${prefix}-year.json`, JSON.stringify({ meta, year }, null, 2))
  writeFileSync(`${OUT}/${prefix}-day.json`, JSON.stringify({ meta, day }, null, 2))
  writeFileSync(`${OUT}/${prefix}-decade.json`, JSON.stringify({ meta, decade }, null, 2))
  writeFileSync(`${OUT}/${prefix}-lifetime.json`, JSON.stringify({ meta, intro: (user as { intro?: string }).intro ?? '', lifetime }, null, 2))
  return `${prefix} ${meta.birth} ${p.gender} ${loc.place} age≈${meta.ageNow}`
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  for (let i = 0; i < profiles.length; i++) console.log(await one(profiles[i], i))
  console.log(`\n✓ wrote ${profiles.length} calendar-tier dumps to ${OUT}`)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})

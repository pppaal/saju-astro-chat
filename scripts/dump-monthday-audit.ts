/**
 * 월/일 캘린더 엔진 출력 덤프 — 멀티 에이전트 검사용.
 * preview/page.tsx 와 동일 경로(buildNatalContext → buildCalendar → assembleTiers)
 * 를 DB 없이 재현해 실제 DestinyMonth / DestinyDay + raw cell 점수를 JSON 으로 출력.
 *
 *   기본: 현우 1995-02-09 06:40 男 서울 / target 2026-06 / focus 2026-06-15
 *
 * 실행(기본): npx tsx scripts/dump-monthday-audit.ts
 * 실행(다른 사람): 환경변수로 덮어쓴다 —
 *   BIRTH_DATE=1988-11-22 BIRTH_TIME=14:30 GENDER=female \
 *   LAT=35.1796 LON=129.0756 TZ=Asia/Seoul \
 *   TY=2026 TM=9 FOCUS=2026-09-09 PLACE=부산 OUT_PREFIX=case2 \
 *   npx tsx scripts/dump-monthday-audit.ts
 */
import { writeFileSync } from 'node:fs'
import { calculateSajuData } from '../src/lib/saju/saju'
import { buildNatalContext } from '../src/lib/calendar-engine/context/build'
import { buildCalendar } from '../src/lib/calendar-engine'
import { assembleTiers } from '../src/app/calendar/assembleTiers'

const env = process.env
const GENDER = (env.GENDER as 'male' | 'female') ?? 'male'
const BIRTH = {
  birthDate: env.BIRTH_DATE ?? '1995-02-09',
  birthTime: env.BIRTH_TIME ?? '06:40',
  gender: GENDER as 'male',
  latitude: env.LAT ? Number(env.LAT) : 37.5665,
  longitude: env.LON ? Number(env.LON) : 126.978,
  timeZone: env.TZ ?? 'Asia/Seoul',
}
const TARGET_YEAR = env.TY ? Number(env.TY) : 2026
const TARGET_MONTH = env.TM ? Number(env.TM) : 6
const TARGET_DAY_ISO = env.FOCUS ?? '2026-06-15'
const PLACE = env.PLACE ?? '서울'
const PREFIX = env.OUT_PREFIX ?? 'audit'
const OUT =
  '/tmp/claude-0/-home-user-saju-astro-chat/1d20fb2f-d849-5d3d-9e88-c2bd904a0a34/scratchpad'

async function main() {
  const saju = calculateSajuData(
    BIRTH.birthDate,
    BIRTH.birthTime,
    BIRTH.gender,
    'solar',
    BIRTH.timeZone
  )
  const natal = await buildNatalContext(BIRTH, { saju })

  const mm = String(TARGET_MONTH).padStart(2, '0')
  const lastDay = new Date(Date.UTC(TARGET_YEAR, TARGET_MONTH, 0)).getUTCDate()
  const dd = String(lastDay).padStart(2, '0')
  const cells = await buildCalendar(
    natal,
    {
      start: `${TARGET_YEAR}-${mm}-01T00:00:00.000Z`,
      end: `${TARGET_YEAR}-${mm}-${dd}T23:59:59.000Z`,
      granularity: 'day',
    },
    { includeEvidence: true }
  )
  const focusCells = await buildCalendar(
    natal,
    {
      start: `${TARGET_DAY_ISO}T00:00:00.000Z`,
      end: `${TARGET_DAY_ISO}T23:59:59.000Z`,
      granularity: 'day',
    },
    { includeEvidence: true }
  )
  const focusDayCell = focusCells[0] ?? null

  const { topbar, user, lifetime, decade, year, month, day } = await assembleTiers({
    natal,
    cells,
    lang: 'ko',
    birthYear: Number(BIRTH.birthDate.slice(0, 4)),
    targetYear: TARGET_YEAR,
    targetMonth: TARGET_MONTH,
    targetDay: Number(TARGET_DAY_ISO.split('-')[2]),
    targetDayIso: TARGET_DAY_ISO,
    sex: GENDER === 'female' ? '여' : '남',
    birthDisplay: `${BIRTH.birthDate} ${BIRTH.birthTime}`,
    whoBirthLine: `${BIRTH.birthDate} ${BIRTH.birthTime}`,
    place: PLACE,
    focusDayCell,
  })

  // raw 일별 점수/신호 (검사 핵심)
  const rawDays = cells.map((c: any) => {
    const sigs = (c.signals ?? [])
      .slice()
      .sort((a: any, b: any) => Math.abs(b.polarity ?? 0) - Math.abs(a.polarity ?? 0))
      .slice(0, 6)
      .map((s: any) => ({
        layer: s.layer,
        kind: s.kind,
        name: s.name,
        sibsin: s.evidence?.sibsin,
        polarity: s.polarity,
      }))
    return {
      datetime: c.datetime,
      derivedScore: c.derivedScore,
      themeScores: c.themeScores,
      signalCount: (c.signals ?? []).length,
      topSignals: sigs,
    }
  })

  writeFileSync(`${OUT}/${PREFIX}-month.json`, JSON.stringify(month, null, 2))
  writeFileSync(`${OUT}/${PREFIX}-day.json`, JSON.stringify(day, null, 2))
  writeFileSync(`${OUT}/${PREFIX}-rawcells.json`, JSON.stringify(rawDays, null, 2))
  writeFileSync(`${OUT}/${PREFIX}-year.json`, JSON.stringify(year, null, 2))
  writeFileSync(`${OUT}/${PREFIX}-decade.json`, JSON.stringify(decade, null, 2))
  writeFileSync(`${OUT}/${PREFIX}-lifetime.json`, JSON.stringify(lifetime, null, 2))
  writeFileSync(`${OUT}/${PREFIX}-user.json`, JSON.stringify({ topbar, user }, null, 2))

  // 콘솔 요약
  const scores = cells.map((c: any) => c.derivedScore)
  console.log('=== month meta ===')
  console.log(
    'ym:',
    month.ym,
    '| label:',
    month.label,
    '| woolun:',
    month.woolun,
    '| woolunSibsin:',
    month.woolunSibsin
  )
  console.log(
    'bestDay:',
    month.bestDay,
    '| good:',
    month.goodDays?.length,
    'caution:',
    month.cautionDays?.length,
    'avoid:',
    month.avoidDays?.length,
    'keyDays:',
    month.keyDays
  )
  console.log(
    'score min/avg/max:',
    Math.min(...scores),
    '/',
    Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length),
    '/',
    Math.max(...scores)
  )
  console.log('crossActivations:', month.crossActivations?.length)
  console.log('calendar marks:', month.calendar?.map((d: any) => `${d.d}:${d.mark}`).join(' '))
  console.log(`\nWrote ${PREFIX}-{month,day,rawcells}.json to scratchpad`)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})

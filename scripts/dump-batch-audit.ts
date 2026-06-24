/**
 * 배치 감사 — 다양한 생년 N명을 실엔진(buildNatalContext→buildCalendar→assembleTiers)
 * 으로 돌려 정체성·연/월/일 해석 핵심 필드를 compact JSON 으로 모은다. "사람마다
 * 해석이 실제로 다른가 / 빈칸·중복·제너릭 폴백이 있나"를 데이터로 보기 위한 근거.
 *
 * 실행: npx tsx scripts/dump-batch-audit.ts   (출력: scratchpad/batch-audit.json)
 */
import { writeFileSync } from 'node:fs'
import { calculateSajuData } from '../src/lib/saju/saju'
import { buildNatalContext } from '../src/lib/calendar-engine/context/build'
import { buildCalendar } from '../src/lib/calendar-engine'
import { assembleTiers } from '../src/app/calendar/assembleTiers'

const OUT =
  '/tmp/claude-0/-home-user-saju-astro-chat/1d20fb2f-d849-5d3d-9e88-c2bd904a0a34/scratchpad/batch-audit.json'

const SEOUL = { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }
const BUSAN = { latitude: 35.1796, longitude: 129.0756, timeZone: 'Asia/Seoul' }
const NYC = { latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }

type B = { d: string; t: string; g: 'male' | 'female'; loc: typeof SEOUL; tag: string }
// 다양성: 1959~2004, 12개월 고루, 시간대 다양, 남녀, 서울/부산/뉴욕.
const BIRTHS: B[] = [
  { d: '1959-01-05', t: '03:20', g: 'male', loc: SEOUL, tag: '59-1남' },
  { d: '1963-03-21', t: '23:10', g: 'female', loc: SEOUL, tag: '63-3여' },
  { d: '1967-06-12', t: '11:45', g: 'male', loc: BUSAN, tag: '67-6남' },
  { d: '1971-09-08', t: '06:40', g: 'female', loc: SEOUL, tag: '71-9여' },
  { d: '1974-11-30', t: '14:30', g: 'male', loc: SEOUL, tag: '74-11남' },
  { d: '1977-02-14', t: '08:05', g: 'female', loc: BUSAN, tag: '77-2여' },
  { d: '1980-05-01', t: '19:50', g: 'male', loc: SEOUL, tag: '80-5남' },
  { d: '1983-07-19', t: '01:15', g: 'female', loc: SEOUL, tag: '83-7여' },
  { d: '1985-10-27', t: '17:00', g: 'male', loc: NYC, tag: '85-10남NY' },
  { d: '1988-11-22', t: '14:30', g: 'female', loc: BUSAN, tag: '88-11여' },
  { d: '1990-04-03', t: '09:30', g: 'male', loc: SEOUL, tag: '90-4남' },
  { d: '1992-08-16', t: '22:40', g: 'female', loc: SEOUL, tag: '92-8여' },
  { d: '1995-02-09', t: '06:40', g: 'male', loc: SEOUL, tag: '95-2남(현우)' },
  { d: '1997-12-25', t: '12:00', g: 'female', loc: SEOUL, tag: '97-12여' },
  { d: '1999-06-30', t: '04:55', g: 'male', loc: BUSAN, tag: '99-6남' },
  { d: '2001-03-11', t: '15:35', g: 'female', loc: SEOUL, tag: '01-3여' },
  { d: '2003-09-23', t: '20:20', g: 'male', loc: SEOUL, tag: '03-9남' },
  { d: '2004-07-07', t: '07:07', g: 'female', loc: NYC, tag: '04-7여NY' },
]

const TY = 2026
const TM = 6
const FOCUS = '2026-06-15'

async function one(b: B) {
  const saju = calculateSajuData(b.d, b.t, b.g, 'solar', b.loc.timeZone)
  const natal = await buildNatalContext(
    { birthDate: b.d, birthTime: b.t, gender: b.g, ...b.loc },
    { saju }
  )
  const cells = await buildCalendar(
    natal,
    { start: `${TY}-06-01T00:00:00.000Z`, end: `${TY}-06-30T23:59:59.000Z`, granularity: 'day' },
    { includeEvidence: true }
  )
  const focusCells = await buildCalendar(
    natal,
    { start: `${FOCUS}T00:00:00.000Z`, end: `${FOCUS}T23:59:59.000Z`, granularity: 'day' },
    { includeEvidence: true }
  )
  const { user, lifetime, year, month, day } = await assembleTiers({
    natal,
    cells,
    lang: 'ko',
    birthYear: Number(b.d.slice(0, 4)),
    targetYear: TY,
    targetMonth: TM,
    targetDay: 15,
    targetDayIso: FOCUS,
    sex: b.g === 'female' ? '여' : '남',
    birthDisplay: `${b.d} ${b.t}`,
    whoBirthLine: `${b.d} ${b.t}`,
    place: '—',
    focusDayCell: focusCells[0] ?? null,
  })
  const nowDw = lifetime.daewoon.find((d: any) => d.now)
  return {
    tag: b.tag,
    birth: `${b.d} ${b.t} ${b.g} ${b.loc.timeZone}`,
    identity: {
      ilgan: user.ilgan.hanja,
      gyeokguk: user.gyeokguk,
      gangyak: user.gangyak,
      yongsin: user.yongsin?.kr,
      dominantSibsin: user.dominantSibsin,
      elements: user.elements,
      sun: user.astro?.sun,
      asc: user.astro?.asc,
      mc: user.astro?.mc,
    },
    lifetime: {
      lifePatternKey: lifetime.lifePattern?.key,
      lifePatternKo: lifetime.lifePattern?.ko,
      lifePatternLine: lifetime.lifePattern?.line,
      nowDaewoon: nowDw ? `${nowDw.gz.hanja} ${nowDw.sibsin}` : null,
      daewoonSeq: lifetime.daewoon.map((d: any) => d.sibsin).join(','),
      milestones: lifetime.milestones.length,
    },
    year: {
      sewoonGz: year.sewoonGz.hanja,
      sewoonSibsin: year.sewoonSibsin,
      profHouse: year.profection?.house,
      profTheme: year.profection?.theme,
      headline: year.headline,
      crossings: (year.crossings ?? []).length,
    },
    month: {
      woolun: month.woolun.hanja,
      woolunSibsin: month.woolunSibsin,
      good: month.goodDays.length,
      caution: month.cautionDays.length,
      avoid: month.avoidDays.length,
      narrative0: month.narrative?.[0]?.body,
      crossActs: (month.crossActivations ?? []).map(
        (c: any) => `${c.saju}×${c.astro}:${c.meaning}`
      ),
      keyDays: (month.keyDays ?? []).map((k: any) => `${k.date}:${k.tone}:${k.meaning}`),
    },
    day: {
      iljin: day.iljin.hanja,
      iljinSibsin: day.iljinSibsin,
      score: day.score,
      oneLine: day.oneLine,
      crossActs: (day.crossActivations ?? [])
        .slice(0, 4)
        .map((c: any) => `${c.sajuKo ?? c.sajuSide}×${c.astroKo ?? c.astroSide}:${c.meaning}`),
      hourCrossings: (day.hourCrossings ?? []).length,
    },
  }
}

async function main() {
  const out: any[] = []
  for (const b of BIRTHS) {
    try {
      out.push(await one(b))
      process.stdout.write('.')
    } catch (e: any) {
      out.push({ tag: b.tag, error: String(e?.message ?? e) })
      process.stdout.write('X')
    }
  }
  writeFileSync(OUT, JSON.stringify(out, null, 2))
  console.log(`\nWrote ${out.length} people to batch-audit.json`)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})

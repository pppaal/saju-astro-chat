/**
 * dump-calendar-full — /calendar/preview 가 렌더하는 month + day 타이어 전체를
 * KO / EN 양쪽으로 그대로 어셈블해 텍스트로 덤프. 서버/DB 없이 assembleTiers()
 * 를 직접 호출(persistence 빌더는 DB 실패 시 fresh build 폴백).
 *
 *   본명 1995-02-09 06:40 男 서울 · focus 2026-06-15
 *
 * 실행: npx tsx scripts/dump-calendar-full.ts
 */

import {
  getOrBuildNatalContext,
  getOrBuildYearCells,
  getFocusDayCell,
} from '../src/lib/calendar-engine/persistence'
import { assembleTiers } from '../src/app/calendar/assembleTiers'

const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}
const BIRTH_YEAR = 1995
const TARGET_YEAR = 2026
const TARGET_MONTH = 6
const TARGET_DAY_ISO = '2026-06-15'
const TARGET_DAY = 15

async function assembleFor(lang: 'ko' | 'en') {
  const natal = await getOrBuildNatalContext(BIRTH)
  const cells = await getOrBuildYearCells(BIRTH, natal, TARGET_YEAR, { includeEvidence: false })
  const focusDayCell = await getFocusDayCell(natal, TARGET_DAY_ISO)
  return assembleTiers({
    natal,
    cells,
    lang,
    birthYear: BIRTH_YEAR,
    targetYear: TARGET_YEAR,
    targetMonth: TARGET_MONTH,
    targetDay: TARGET_DAY,
    targetDayIso: TARGET_DAY_ISO,
    sex: '남',
    birthDisplay: '1995-02-09 06:40',
    whoBirthLine: '1995.2.9 06:40',
    place: '서울',
    focusDayCell,
  })
}

async function main() {
  const out: Record<string, unknown> = {}
  for (const lang of ['ko', 'en'] as const) {
    const { topbar, user, lifetime, decade, year, month, day } = await assembleFor(lang)
    out[lang] = { topbar, user, lifetime, decade, year, month, day }
  }
  process.stdout.write(JSON.stringify(out, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

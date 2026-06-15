/**
 * format-cal-dump — assembleTiers month+day JSON 을 사람이 읽는 텍스트로.
 * 각 문자열 leaf 에 컴포넌트 렌더와 동일한 localizeLabel(value, ko) 을 적용해
 * 화면 출력에 근사. KO / EN 따로 emit.
 *
 *   npx tsx scripts/format-cal-dump.ts
 */
import {
  getOrBuildNatalContext,
  getOrBuildYearCells,
  getFocusDayCell,
} from '../src/lib/calendar-engine/persistence'
import { assembleTiers } from '../src/app/calendar/assembleTiers'
import { localizeLabel } from '../src/components/calendar/adapters/localizeLabel'

const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

function walk(node: unknown, ko: boolean): unknown {
  if (typeof node === 'string') return localizeLabel(node, ko)
  if (Array.isArray(node)) return node.map((n) => walk(n, ko))
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(node)) out[k] = walk(v, ko)
    return out
  }
  return node
}

async function main() {
  const lines: string[] = []
  for (const lang of ['ko', 'en'] as const) {
    const natal = await getOrBuildNatalContext(BIRTH)
    const cells = await getOrBuildYearCells(BIRTH, natal, 2026, { includeEvidence: false })
    const focusDayCell = await getFocusDayCell(natal, '2026-06-15')
    const { month, day } = await assembleTiers({
      natal,
      cells,
      lang,
      birthYear: 1995,
      targetYear: 2026,
      targetMonth: 6,
      targetDay: 15,
      targetDayIso: '2026-06-15',
      sex: '남',
      birthDisplay: '1995-02-09 06:40',
      whoBirthLine: '1995.2.9 06:40',
      place: '서울',
      focusDayCell,
    })
    const ko = lang === 'ko'
    lines.push(`\n\n################## LOCALE: ${lang.toUpperCase()} ##################`)
    lines.push('\n========== MONTH TIER ==========')
    lines.push(JSON.stringify(walk(month, ko), null, 2))
    lines.push('\n========== DAY TIER ==========')
    lines.push(JSON.stringify(walk(day, ko), null, 2))
  }
  process.stdout.write(lines.join('\n'))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

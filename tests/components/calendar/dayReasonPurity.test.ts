import { describe, it, expect } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { assembleTiers } from '@/app/calendar/assembleTiers'
import { plainReason, isPlainReason } from '@/lib/calendar-engine/derivers/plainLanguage'

/**
 * 일 카드 "지금 일어나는 일 / 조심할 것" 쉬운말 가드레일.
 *
 * 그 리스트는 day.topReasons/cautions 를 plainReason 후 isPlainReason 으로 거른
 * 결과다(전문용어·한자 사유는 drop-on-doubt). 실제 하루를 조립해, 화면에 나갈
 * 최종 라인에 한자·사주/점성 전문용어가 0 임을 단언한다.
 */

// DayTier 가 적용하는 변환을 그대로 재현(인라인 마커 제거 → plainReason → 필터).
const stripMarker = (s: string) => s.replace(/^[↑↓▲▼]\s*[^·]*·\s*/, '').trim()
function displayLines(reasons: string[] | undefined, ko: boolean): string[] {
  return (reasons ?? []).map((r) => plainReason(stripMarker(r), ko)).filter(isPlainReason)
}

function hasHanja(s: string): boolean {
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0
    if ((c >= 0x3400 && c <= 0x4dbf) || (c >= 0x4e00 && c <= 0x9fff) || (c >= 0xf900 && c <= 0xfaff))
      return true
  }
  return false
}
function hasHangul(s: string): boolean {
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0
    if (c >= 0xac00 && c <= 0xd7a3) return true
  }
  return false
}

const LOC = { lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' }
const PROFILES: Array<[string, string, 'male' | 'female']> = [
  ['1972-03-15', '12:00', 'male'],
  ['1995-02-09', '06:49', 'male'],
  ['1988-11-22', '06:49', 'female'],
  ['2001-07-30', '21:10', 'male'],
]
// 한 달 안 여러 날을 표본 — 날마다 신호가 달라 누수 케이스를 폭넓게 친다.
const DAYS = ['2026-06-03', '2026-06-11', '2026-06-15', '2026-06-22', '2026-06-27']

async function assembleDay(
  date: string,
  time: string,
  gender: 'male' | 'female',
  iso: string,
  lang: 'ko' | 'en'
) {
  const saju = calculateSajuData(date, time, gender, 'solar', LOC.tz)
  const natal = await buildNatalContext(
    {
      birthDate: date,
      birthTime: time,
      gender,
      latitude: LOC.lat,
      longitude: LOC.lon,
      timeZone: LOC.tz,
    },
    { saju }
  )
  const cells = await buildCalendar(
    natal,
    { start: `${iso}T00:00:00.000Z`, end: `${iso}T23:59:59.000Z`, granularity: 'day' },
    { includeEvidence: true }
  )
  const [y, m, d] = iso.split('-').map(Number)
  return assembleTiers({
    natal,
    cells,
    lang,
    birthYear: Number(date.slice(0, 4)),
    targetYear: y,
    targetMonth: m,
    targetDay: d,
    targetDayIso: iso,
    sex: gender === 'female' ? '여' : '남',
    birthDisplay: `${date} ${time}`,
    whoBirthLine: `${date} ${time}`,
    place: 'Seoul',
    focusDayCell: cells[0] ?? null,
  })
}

describe('일 카드 사유 쉬운말 무결성', () => {
  it('지금 일어나는 일·조심할 것 라인에 한자/전문용어 0 (fleet × 날 × ko/en)', async () => {
    const leaks: string[] = []
    let lineCount = 0
    for (const [date, time, gender] of PROFILES) {
      for (const iso of DAYS) {
        for (const lang of ['ko', 'en'] as const) {
          const t = await assembleDay(date, time, gender, iso, lang)
          const reasons = lang === 'ko' ? t.day.topReasons : (t.day.topReasonsEn ?? t.day.topReasons)
          const cautions = lang === 'ko' ? t.day.cautions : (t.day.cautionsEn ?? t.day.cautions)
          for (const line of [...displayLines(reasons, lang === 'ko'), ...displayLines(cautions, lang === 'ko')]) {
            lineCount++
            if (hasHanja(line)) leaks.push(`${date} ${iso}/${lang} 한자: "${line}"`)
            if (!isPlainReason(line)) leaks.push(`${date} ${iso}/${lang} 전문어: "${line}"`)
            // EN 화면에 한글이 섞이면 = english 누락으로 한국어 폴백된 것.
            if (lang === 'en' && hasHangul(line)) leaks.push(`${date} ${iso}/en 한글누수: "${line}"`)
          }
        }
      }
    }
    expect(lineCount).toBeGreaterThan(0)
    expect(leaks, `사유 누수:\n  ${leaks.join('\n  ')}`).toEqual([])
  }, 120_000)
})

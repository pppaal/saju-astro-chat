import { describe, it, expect } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { assembleTiers } from '@/app/calendar/assembleTiers'

/**
 * 월 그리드 "근거" 쉬운말 가드레일.
 *
 * 선택일 리드아웃의 근거(calendar[].reason)는 topReasons(전문용어) 대신 교차의
 * *쉬운 뜻* 을 써야 한다. 이 테스트가 실제 한 달을 조립해, 모든 날의
 * reason.meaning 에 raw 한자가 0, reason.meaningEn 에 한글이 0 임을 단언한다.
 * (사주/별자리 용어는 chip 으로 따로 — meaning 본문엔 누수 금지.)
 */

// 코드포인트로 직접 판정 — 리터럴 CJK 정규식은 mojibake 로 깨져 한글까지 매칭하는
// 거짓양성을 낸다(가드레일 자기검증). 코드포인트 범위엔 그 함정이 없다.
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
]

async function assembleMonth(
  date: string,
  time: string,
  gender: 'male' | 'female',
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
    { start: '2026-06-01T00:00:00.000Z', end: '2026-06-30T23:59:59.000Z', granularity: 'day' },
    { includeEvidence: true }
  )
  const focus = cells.find((c) => c.datetime.slice(0, 10) === '2026-06-15') ?? cells[0]
  return assembleTiers({
    natal,
    cells,
    lang,
    birthYear: Number(date.slice(0, 4)),
    targetYear: 2026,
    targetMonth: 6,
    targetDay: 15,
    targetDayIso: '2026-06-15',
    sex: gender === 'female' ? '여' : '남',
    birthDisplay: `${date} ${time}`,
    whoBirthLine: `${date} ${time}`,
    place: 'Seoul',
    focusDayCell: focus ?? null,
  })
}

describe('월 근거(reason) 쉬운말 무결성', () => {
  it('reason.meaning 에 한자 0, reason.meaningEn 에 한글 0 (fleet × ko/en)', async () => {
    const leaks: string[] = []
    let reasonCount = 0
    for (const [date, time, gender] of PROFILES) {
      for (const lang of ['ko', 'en'] as const) {
        const t = await assembleMonth(date, time, gender, lang)
        for (const c of t.month.calendar) {
          if (!c.reason) continue
          reasonCount++
          if (hasHanja(c.reason.meaning)) {
            leaks.push(`${date}/${lang} ${c.ds} meaning 한자: "${c.reason.meaning}"`)
          }
          if (hasHangul(c.reason.meaningEn)) {
            leaks.push(`${date}/${lang} ${c.ds} meaningEn 한글: "${c.reason.meaningEn}"`)
          }
          // EN 본문이 비면 UI 가 KO meaning 으로 폴백 → 영어 사용자가 한국어를 봄.
          if (!c.reason.meaningEn || !c.reason.meaningEn.trim()) {
            leaks.push(`${date} ${c.ds} meaningEn 비어있음(EN 폴백→KO 누수)`)
          }
        }
      }
    }
    // 최소한 몇 개는 실제로 채워졌는지(빈 검사 방지)
    expect(reasonCount).toBeGreaterThan(0)
    expect(leaks, `근거 누수:\n  ${leaks.join('\n  ')}`).toEqual([])
  }, 90_000)
})

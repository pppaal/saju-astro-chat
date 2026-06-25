import { describe, it, expect } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { assembleTiers } from '@/app/calendar/assembleTiers'

/**
 * 표면 산문 무결성 가드레일 — "찾아도 또 나오는" 누수의 그물.
 *
 * 결정론 엔진이 수천 개의 이중언어 문자열을 코드 곳곳에서 손으로 조립하는데,
 * 중앙 렌더 경계도, 불변식을 지켜보는 자동 검사도 없어서 한자 누수·EN 에 한글
 * 누수·문장 파편이 끝없이 생겼다(사람 눈 말고는 잡는 게 없었음). 이 테스트가
 * 그 그물이다 — fleet × ko/en 전 티어를 실제로 조립해, *novice 산문 필드*에
 *   (1) raw CJK 한자가 0,
 *   (2) EN 변형 필드에 한글이 0
 * 임을 단언한다. 새 누수가 들어오는 순간 CI 가 잡는다.
 *
 * ⚠ 정규식은 반드시 \u 이스케이프로 — 리터럴 CJK 경계문자는 mojibake 로 깨져
 * 한글까지 매칭하는 거짓양성을 낸다(이 가드레일을 만들다 직접 겪음).
 */

// CJK 통합한자 + 호환한자. (한글 AC00–D7A3 은 *제외* — 한글은 한자가 아님.)
const HANJA = /[㐀-鿿豈-﫿]/
const HANGUL = /[가-힣]/

// novice 표면에 나가는 "산문" 필드 — 여기엔 한자/언어누수가 절대 없어야 한다.
// (sibsin·element·gz.hanja 같은 *렌더 시 번역되거나 expert/hover 전담* 필드는
//  제외 — 그건 표면 산문이 아니라 토큰이라 별도 계약이다.)
const PROSE_KEYS = new Set([
  'line', 'lineEn', 'tone', 'toneEn', 'headline', 'headlineEn',
  'theme', 'themeEn', 'meaning', 'meaningEn', 'label', 'labelEn',
  'daewoonText', 'sajuNote', 'sajuNoteEn', 'astroNote', 'astroNoteEn',
  'body', 'bodyEn', 'intro', 'introEn',
])

interface Leak { rule: string; key: string; text: string }

function collect(node: unknown, key: string, out: Leak[]): void {
  if (node == null) return
  if (typeof node === 'string') {
    if (!PROSE_KEYS.has(key) || !node.trim()) return
    if (HANJA.test(node)) out.push({ rule: 'CJK-hanja-on-prose-surface', key, text: node })
    if (key.endsWith('En') && HANGUL.test(node)) out.push({ rule: 'Hangul-in-EN-prose', key, text: node })
    return
  }
  if (Array.isArray(node)) {
    for (const v of node) collect(v, key, out)
    return
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) collect(v, k, out)
  }
}

const LOC = { lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' }
// 출생연도(유아~노년)·성별·시각을 흩뿌린 소수 프로필 — 전 생애단계/대운이 'now'에
// 걸리도록. 데이터는 결정론이라 고정 프로필이면 충분히 대표적이다.
const PROFILES: Array<[string, string, 'male' | 'female']> = [
  ['1955-07-07', '19:00', 'female'],
  ['1972-03-15', '12:00', 'male'],
  ['1988-11-22', '06:49', 'female'],
  ['1995-02-09', '06:49', 'male'],
  ['2001-07-30', '21:10', 'male'],
]

async function assembleFor(date: string, time: string, gender: 'male' | 'female', lang: 'ko' | 'en') {
  const birth = {
    birthDate: date, birthTime: time, gender,
    latitude: LOC.lat, longitude: LOC.lon, timeZone: LOC.tz,
  }
  const saju = calculateSajuData(date, time, gender, 'solar', LOC.tz)
  const natal = await buildNatalContext(birth, { saju })
  const cells = await buildCalendar(
    natal,
    { start: '2026-06-15T00:00:00.000Z', end: '2026-06-15T23:59:59.000Z', granularity: 'day' },
    { includeEvidence: true }
  )
  return assembleTiers({
    natal, cells, lang,
    birthYear: Number(date.slice(0, 4)),
    targetYear: 2026, targetMonth: 6, targetDay: 15, targetDayIso: '2026-06-15',
    sex: gender === 'female' ? '여' : '남',
    birthDisplay: `${date} ${time}`, whoBirthLine: `${date} ${time}`, place: 'Seoul',
    focusDayCell: cells[0] ?? null,
  })
}

describe('티어 표면 산문 무결성 (가드레일)', () => {
  it('novice 산문 필드에 raw 한자·EN 한글 누수가 없다 (fleet × ko/en)', async () => {
    const leaks: Leak[] = []
    for (const [date, time, gender] of PROFILES) {
      for (const lang of ['ko', 'en'] as const) {
        const t = await assembleFor(date, time, gender, lang)
        collect({ lifetime: t.lifetime, decade: t.decade, year: t.year }, 'root', leaks)
      }
    }
    // 위반이 있으면 어떤 필드·문장인지 그대로 보여주고 실패한다.
    const report = leaks
      .map((l) => `  [${l.rule}] ${l.key}: ${l.text.slice(0, 90)}`)
      .join('\n')
    expect(leaks, `표면 산문 누수 ${leaks.length}건:\n${report}`).toEqual([])
  }, 60_000)

  it('가드레일 정규식이 한글을 한자로 오판하지 않는다 (mojibake 자기검증)', () => {
    // 리터럴 CJK 경계문자가 깨지면 한글까지 매칭한다 — 이 자기검증이 그걸 잡는다.
    expect(HANJA.test('월')).toBe(false)
    expect(HANJA.test('편관')).toBe(false)
    expect(HANJA.test('辛亥')).toBe(true)
    expect(HANGUL.test('辛')).toBe(false)
    expect(HANGUL.test('가')).toBe(true)
  })
})

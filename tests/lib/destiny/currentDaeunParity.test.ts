/**
 * 현재 대운 — 모든 표면이 같은 대운을 말한다, 100세+ 포함 (재감사 SI-5 · SP-1, CONVENTIONS §14).
 *
 * 1925-03-30 08:44 F America/New_York (경도 −73.82), now = 2026-11-25T03:00Z (뉴욕 11/24).
 * 기대값(엔진 코드 미사용 — 재감사 판정 스크립트의 독립 도출: astronomy-engine 節 instant,
 * Intl 오프셋): 1925 乙丑년(음간) + 여자 → 순행, 月 己卯. 淸明이 출생 5.735일 뒤 → 대운수
 * floor(5.735/3)=1. 만 나이 101 → 11번째 대운 = 己卯에서 11칸 순행 = 庚寅@101 (101~110세).
 * 예전엔 /api/saju·상담사(en/ko)·궁합이 끝난 己丑@91 을, Life 티어는 '현재 없음'을 말했다.
 *
 * 표면: 엔진(calculateSajuData) · /api/saju 경로(캐시된 결과 → resolveDaeunAt) · sajuFacts ·
 * 상담사 타이밍 블록(en/ko) · 궁합 facts · Life 티어(toLifetime now 플래그).
 */
import { describe, expect, it } from 'vitest'
import { calculateSajuData, daeunSeedOf, resolveDaeunAt } from '@/lib/saju/saju'
import { parseCivilDate } from '@/lib/saju/daeunAge'
import { collectSajuFacts } from '@/lib/destiny/sajuFacts'
import { buildDestinyContext, type DestinyBirth } from '@/lib/destiny/counselorContext'
import { collectCompatSajuFacts } from '@/lib/compatibility/compatSajuFacts'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { toLifetime } from '@/lib/calendar-view/toLifetime'
import { currentManAge } from '@/lib/datetime/currentAge'

const BIRTH = {
  birthDate: '1925-03-30',
  birthTime: '08:44',
  gender: 'female' as const,
  latitude: 40.4812,
  longitude: -73.8248,
  timeZone: 'America/New_York',
}
const NOW = new Date('2026-11-25T03:00:00Z')
// 상담사는 사용자 tz 날짜의 UTC 정오를 now 로 받는다(ensureCounselorContext 규약) — 뉴욕 11/24.
const COUNSELOR_NOW = new Date('2026-11-24T12:00:00Z')
const EXPECTED = { stem: '庚', branch: '寅', age: 101 }
const SAJU_ONLY = { saju: true, astro: false }

const engine = (now: Date) =>
  calculateSajuData(
    BIRTH.birthDate,
    BIRTH.birthTime,
    BIRTH.gender,
    'solar',
    BIRTH.timeZone,
    false,
    BIRTH.longitude,
    now
  )
const short = (d: { heavenlyStem: string; earthlyBranch: string; age: number } | null) =>
  d ? { stem: d.heavenlyStem, branch: d.earthlyBranch, age: d.age } : null

describe('현재 대운 표면 일치 — 1925-03-30 F 뉴욕, 만 101세', () => {
  it('엔진: current = 庚寅@101, 목록 11칸', () => {
    const dw = engine(NOW).daeWoon
    expect(dw.startAge).toBe(1)
    expect(dw.isForward).toBe(true)
    expect(dw.list).toHaveLength(11)
    expect(short(dw.current)).toEqual(EXPECTED)
  })

  it('/api/saju 경로: 만 100세 때 캐시된 10칸 결과를 요청 시각으로 다시 맞춰도 庚寅@101', () => {
    // 2025-06-01 (만 100세) 에 계산돼 Redis 에 남은 결과 — 목록 10칸, current 己丑@91.
    const cached = engine(new Date('2025-06-01T15:00:00Z'))
    expect(cached.daeWoon.list).toHaveLength(10)
    expect(short(cached.daeWoon.current)).toEqual({ stem: '己', branch: '丑', age: 91 })
    const civil = parseCivilDate(cached.meta!.civilBirthDate!)!
    const re = resolveDaeunAt(daeunSeedOf(cached), civil, cached.meta!.timeZone!, NOW)
    expect(short(re.current)).toEqual(EXPECTED)
    expect(re.preDaeun).toBeNull()
  })

  it('sajuFacts (상담사·리포트 재료): daeun.current = 庚寅@101', () => {
    const facts = collectSajuFacts({
      birthDate: BIRTH.birthDate,
      birthTime: BIRTH.birthTime,
      gender: BIRTH.gender,
      timezone: BIRTH.timeZone,
      longitude: BIRTH.longitude,
      now: NOW,
    })
    expect(short(facts.daeun.current)).toEqual(EXPECTED)
    expect(facts.daeun.list.at(-1)?.age).toBe(101)
  })

  it('궁합 facts: currentDaeun = 庚寅@101', () => {
    const seed = {
      birthDate: BIRTH.birthDate,
      birthTime: BIRTH.birthTime,
      gender: BIRTH.gender,
      timezone: BIRTH.timeZone,
      longitude: BIRTH.longitude,
    }
    const other = {
      birthDate: '1990-05-05',
      birthTime: '10:00',
      gender: 'male' as const,
      timezone: 'Asia/Seoul',
      longitude: 126.978,
    }
    const compat = collectCompatSajuFacts(seed, other, NOW)
    expect(compat.a.currentDaeun).toEqual(EXPECTED)
  })

  it.each(['en', 'ko'] as const)(
    '상담사 타이밍 블록(%s): 庚寅@101 에만 현재 표시, 끝난 己丑@91 은 아님',
    async (locale) => {
      const birth: DestinyBirth = {
        birthDate: BIRTH.birthDate,
        birthTime: BIRTH.birthTime,
        gender: BIRTH.gender,
        latitude: BIRTH.latitude,
        longitude: BIRTH.longitude,
        timezone: BIRTH.timeZone,
      }
      const ctx = await buildDestinyContext(birth, COUNSELOR_NOW, locale, undefined, SAJU_ONLY)
      const head = locale === 'en' ? 'daeun:' : '대운:'
      const line = ctx.daily.split('\n').find((l) => l.startsWith(head))
      expect(line).toBeDefined()
      const nowMark = locale === 'en' ? '(now ' : '(현재 '
      expect(line).toContain(`庚寅${nowMark}`)
      expect(line).not.toContain(`己丑${nowMark}`)
      expect(line!.split(nowMark)).toHaveLength(2) // 현재 표시는 하나뿐
    },
    60000
  )

  it('Life 티어: now 플래그 = 庚寅@101 (10칸 격자 — 지금 대운으로 끝나는 10칸)', async () => {
    const natal = await buildNatalContext(BIRTH, { saju: engine(NOW) })
    const manAge = currentManAge({
      birthYear: 1925,
      birthMonth: 3,
      birthDate: 30,
      birthTimeZone: BIRTH.timeZone,
      now: NOW,
    })
    expect(manAge).toBe(101)
    const lt = toLifetime(natal, { birthYear: 1925, currentYear: 2026, manAge })
    const now = lt.daewoon.filter((d) => d.now)
    expect(now).toHaveLength(1)
    expect(now[0].gz.hanja).toBe('庚寅')
    expect(now[0].startAge).toBe(101)
    expect(lt.daewoon).toHaveLength(10)
    expect(lt.daewoon.at(-1)?.startAge).toBe(101)
  }, 60000)

  it('Life 티어: 영구 캐시된 본명 컨텍스트(만 100세 때 10칸)도 같은 순서열로 이어 庚寅@101', async () => {
    const stale = await buildNatalContext(BIRTH, { saju: engine(new Date('2025-06-01T15:00:00Z')) })
    expect(stale.saju.daeun).toHaveLength(10)
    const lt = toLifetime(stale, { birthYear: 1925, currentYear: 2026, manAge: 101 })
    const now = lt.daewoon.find((d) => d.now)
    expect(now?.gz.hanja).toBe('庚寅')
    expect(now?.startAge).toBe(101)
    expect(now?.start).toBe(2026)
  }, 60000)
})

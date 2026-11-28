// tests/app/home/homeDial.test.ts
//
// 홈 다이얼 · 카드 뒷면 세운 — 서버가 주입한 now 와 보는 사람 시간대의 민용 날짜로 정한다
// (오너 결정 17: 立春 이 든 그날부터 새 세운). 다이얼 가운데와 카드 뒷면은 언제나 같은 해.

import { describe, it, expect } from 'vitest'
import { buildHomeDial } from '@/app/(main)/home/homeDial'
import { SAMPLE_DIAL } from '@/app/(main)/home/sampleCard'

describe('buildHomeDial', () => {
  it('2026-11-19 → 丙午 2026, ko/en 두 벌, 뒷면 = 가운데', () => {
    const home = buildHomeDial({ now: new Date('2026-11-19T03:00:00Z'), timeZone: 'Asia/Seoul' })
    expect(home.dial.en.centre.ganji).toBe('丙午')
    expect(home.dial.ko.centre.ganji).toBe('丙午')
    expect(home.backYear).toEqual({ ganji: '丙午', year: 2026 })
    const en = home.dial.en.labels.map((l) => l.text)
    const ko = home.dial.ko.labels.map((l) => l.text)
    expect(en).toContain('NOW')
    expect(ko).toContain('지금')
    expect(en).toContain(`BORN · 丁丑 ${SAMPLE_DIAL.bornYear}`)
    expect(en).toContain(String(SAMPLE_DIAL.turn!.year))
    for (const t of en) expect(t).not.toMatch(/[가-힣]/)
  })

  it('立春 날의 민용 날짜 — 서울은 2027-02-04 부터 丁未, 같은 순간 UTC 폴백은 아직 丙午', () => {
    // 2027-02-03T18:00Z = 서울 2월 4일 03:00 · UTC 2월 3일.
    const instant = new Date('2027-02-03T18:00:00Z')
    expect(buildHomeDial({ now: instant, timeZone: 'Asia/Seoul' }).backYear).toEqual({
      ganji: '丁未',
      year: 2027,
    })
    expect(buildHomeDial({ now: instant, timeZone: null }).backYear).toEqual({
      ganji: '丙午',
      year: 2026,
    })
    expect(buildHomeDial({ now: instant, timeZone: 'Not/AZone' }).backYear.ganji).toBe('丙午')
  })

  it('같은 입력이면 같은 모델(결정적)', () => {
    const a = buildHomeDial({ now: new Date('2026-11-19T03:00:00Z'), timeZone: 'Asia/Seoul' })
    const b = buildHomeDial({ now: new Date('2026-11-19T03:00:00Z'), timeZone: 'Asia/Seoul' })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

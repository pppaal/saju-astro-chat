// tests/app/home/exploreRows.test.ts
//
// 홈 둘러보기 행 — 경로, 출생 쿼리, 가격 라벨이 SSOT(CREDIT_COSTS · creditsFromLabel)와 같다.

import { describe, it, expect } from 'vitest'
import {
  EXPLORE_ROWS,
  counselorHref,
  exploreHref,
  explorePriceLabel,
  exploreRowsIn,
} from '@/app/(main)/home/exploreRows'
import { CREDIT_COSTS } from '@/lib/config/creditCosts'
import { creditsFromLabel } from '@/lib/config/pricing'
import type { StoredBirthInfo } from '@/lib/birth/storage'

const INFO: StoredBirthInfo = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  birthTimeUnknown: false,
  gender: 'male',
  city: 'Busan, KR',
  latitude: 35.1796,
  longitude: 129.0756,
  timeZone: 'Asia/Seoul',
  savedAt: '2026-01-01T00:00:00.000Z',
}

describe('EXPLORE_ROWS', () => {
  it('경로 — /destiny · /calendar · /tarot · /compatibility/free · /integrated-report · /destiny-counselor', () => {
    expect(EXPLORE_ROWS.map((r) => r.href)).toEqual([
      '/destiny',
      '/calendar',
      '/tarot',
      '/compatibility/free',
      '/integrated-report',
      '/destiny-counselor',
    ])
    expect(exploreRowsIn('main').map((r) => r.id)).toEqual([
      'life',
      'calendar',
      'tarot',
      'compat',
      'report',
    ])
    expect(exploreRowsIn('after').map((r) => r.id)).toEqual(['counselor'])
  })

  it('행마다 퍼널 이벤트 home.explore.* 가 하나씩', () => {
    const events = EXPLORE_ROWS.map((r) => r.event)
    expect(new Set(events).size).toBe(EXPLORE_ROWS.length)
    for (const e of events) expect(e.startsWith('home.explore.')).toBe(true)
  })

  it('출생 연결 행은 date/time/lat/lng/tz/gender/lang 을 싣는다', () => {
    for (const row of EXPLORE_ROWS.filter((r) => r.birthLink)) {
      const href = exploreHref(row, INFO, 'ko')
      const [path, qs] = href.split('?')
      expect(path).toBe(row.href)
      const p = new URLSearchParams(qs)
      expect(p.get('date')).toBe('1995-02-09')
      expect(p.get('time')).toBe('06:40')
      expect(p.get('lat')).toBe('35.1796')
      expect(p.get('lng')).toBe('129.0756')
      expect(p.get('tz')).toBe('Asia/Seoul')
      expect(p.get('gender')).toBe('male')
      expect(p.get('lang')).toBe('ko')
    }
    expect(EXPLORE_ROWS.filter((r) => r.birthLink).map((r) => r.id)).toEqual([
      'life',
      'calendar',
      'report',
    ])
  })

  it('출생 정보가 없으면 lang 만 싣는다(페이지가 샘플로 폴백)', () => {
    const report = EXPLORE_ROWS.find((r) => r.id === 'report')!
    expect(exploreHref(report, null, 'en')).toBe('/integrated-report?lang=en')
  })

  it('출생 연결이 아닌 행은 쿼리 없이', () => {
    const tarot = EXPLORE_ROWS.find((r) => r.id === 'tarot')!
    const compat = EXPLORE_ROWS.find((r) => r.id === 'compat')!
    expect(exploreHref(tarot, INFO, 'en')).toBe('/tarot')
    expect(exploreHref(compat, INFO, 'en')).toBe('/compatibility/free')
  })

  it('상담사 — 출생 정보가 있으면 buildCounselorHref, 없으면 /destiny-counselor', () => {
    const counselor = EXPLORE_ROWS.find((r) => r.id === 'counselor')!
    expect(exploreHref(counselor, null, 'en')).toBe('/destiny-counselor')
    const href = exploreHref(counselor, INFO, 'en')
    expect(href).toBe(counselorHref(INFO, 'en'))
    const p = new URLSearchParams(href.split('?')[1])
    expect(href.startsWith('/destiny-counselor?')).toBe(true)
    expect(p.get('birthDate')).toBe('1995-02-09')
    expect(p.get('lang')).toBe('en')
    expect(p.has('q')).toBe(false)
  })

  it('가격 라벨은 SSOT 값과 같다', () => {
    const tarot = EXPLORE_ROWS.find((r) => r.id === 'tarot')!
    const counselor = EXPLORE_ROWS.find((r) => r.id === 'counselor')!
    expect(tarot.price).toEqual({ fromCredits: CREDIT_COSTS.tarotReading.small })
    expect(counselor.price).toEqual({ fromCredits: CREDIT_COSTS.counselorTurn })
    for (const locale of ['en', 'ko'] as const) {
      const label = explorePriceLabel(tarot.price, locale)
      expect('from' in label).toBe(true)
      if (!('from' in label)) continue
      expect(label.from).toContain(String(CREDIT_COSTS.tarotReading.small))
      expect(label.packs).toContain(creditsFromLabel(locale))
    }
    expect(explorePriceLabel(tarot.price, 'en')).toEqual({
      from: `From ${CREDIT_COSTS.tarotReading.small} credit${CREDIT_COSTS.tarotReading.small === 1 ? '' : 's'}`,
      packs: `Credits from ${creditsFromLabel('en')}`,
    })
    expect(explorePriceLabel('free', 'en')).toEqual({ free: 'Free' })
    expect(explorePriceLabel('free', 'ko')).toEqual({ free: '무료' })
  })

  it('행에는 이모지가 없다', () => {
    const emoji = /\p{Extended_Pictographic}/u
    for (const r of EXPLORE_ROWS) {
      for (const s of [r.title.ko, r.title.en, r.desc.ko, r.desc.en]) expect(s).not.toMatch(emoji)
    }
  })
})

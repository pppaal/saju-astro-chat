// tests/lib/birth/format.test.ts
//
// 출생 스탬프(v9 폴리오·사람 칩) — 시간 미상이면 시각을 빼고, 도시는 첫 쉼표 앞만 붙인다.

import { describe, it, expect } from 'vitest'
import { formatBirthStamp, cityLabel } from '@/lib/birth/format'

const SAMPLE = {
  birthDate: '1997-03-21',
  birthTime: '14:30',
  birthTimeUnknown: false,
  city: 'Seoul, KR',
}

describe('formatBirthStamp', () => {
  it('en: 1997.3.21 14:30 · Seoul', () => {
    expect(formatBirthStamp(SAMPLE, 'en')).toBe('1997.3.21 14:30 · Seoul')
  })

  it('ko: 1997년 3월 21일 14:30 · Seoul', () => {
    expect(formatBirthStamp(SAMPLE, 'ko')).toBe('1997년 3월 21일 14:30 · Seoul')
  })

  it('시간 미상이면 날짜만 (정오 앵커를 찍지 않는다)', () => {
    const unknown = { ...SAMPLE, birthTime: '12:00', birthTimeUnknown: true }
    expect(formatBirthStamp(unknown, 'en')).toBe('1997.3.21 · Seoul')
    expect(formatBirthStamp(unknown, 'ko')).toBe('1997년 3월 21일 · Seoul')
    // 레거시(플래그 없음 + '00:00') 도 미상.
    expect(formatBirthStamp({ birthDate: '1997-03-21', birthTime: '00:00' }, 'en')).toBe(
      '1997.3.21'
    )
    // 플래그 false + '00:00' 은 실제 자정 출생.
    expect(
      formatBirthStamp(
        { birthDate: '1997-03-21', birthTime: '00:00', birthTimeUnknown: false },
        'en'
      )
    ).toBe('1997.3.21 00:00')
  })

  it('12시간 표기 입력도 24시간으로', () => {
    expect(formatBirthStamp({ ...SAMPLE, birthTime: '02:30 PM' }, 'en')).toBe(
      '1997.3.21 14:30 · Seoul'
    )
    expect(formatBirthStamp({ ...SAMPLE, birthTime: '9:05' }, 'en')).toBe('1997.3.21 09:05 · Seoul')
  })

  it('옵션 — 사람 칩은 시각 없이, 도시 생략 가능', () => {
    expect(formatBirthStamp(SAMPLE, 'en', { time: false })).toBe('1997.3.21 · Seoul')
    expect(formatBirthStamp(SAMPLE, 'en', { city: false })).toBe('1997.3.21 14:30')
  })

  it('도시가 없으면 구분점도 없다 · 날짜가 깨지면 빈 문자열', () => {
    expect(formatBirthStamp({ ...SAMPLE, city: '' }, 'en')).toBe('1997.3.21 14:30')
    expect(formatBirthStamp({ ...SAMPLE, city: undefined }, 'ko')).toBe('1997년 3월 21일 14:30')
    expect(formatBirthStamp({ birthDate: '' }, 'en')).toBe('')
  })
})

describe('cityLabel', () => {
  it('첫 쉼표 앞만, 공백 정리', () => {
    expect(cityLabel('Seoul, KR')).toBe('Seoul')
    expect(cityLabel('  New York, NY, US ')).toBe('New York')
    expect(cityLabel(null)).toBe('')
  })
})

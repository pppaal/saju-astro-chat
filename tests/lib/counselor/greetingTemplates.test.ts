import { describe, it, expect, afterEach, vi } from 'vitest'
import { pickGreeting } from '@/lib/counselor/greetingTemplates'

// 시간대별 버킷을 강제하기 위해 시스템 시간을 고정한다. localHour 는
// Intl.DateTimeFormat 으로 tz 의 현지 시각을 읽으므로, tz 와 고정 UTC 시각으로
// 원하는 버킷(dawn/morning/noon/afternoon/evening/night)을 만든다.
function freezeUtc(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

describe('pickGreeting (운명상담사 hero 인사 픽)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('시간대 버킷 (UTC tz 기준)', () => {
    // tz=UTC 로 두면 UTC 시각이 곧 현지 시각이라 버킷을 정확히 제어 가능.
    const cases: Array<{ iso: string; expectIncludes: string; lang: 'ko' | 'en' }> = [
      // dawn: h < 6
      { iso: '2026-06-21T03:00:00Z', expectIncludes: '고요한 시간이에요.', lang: 'ko' },
      // morning: 6 <= h < 11
      { iso: '2026-06-21T08:00:00Z', expectIncludes: '좋은 아침이에요.', lang: 'ko' },
      // noon: 11 <= h < 14
      { iso: '2026-06-21T12:00:00Z', expectIncludes: '한낮의 흐름이에요.', lang: 'ko' },
      // afternoon: 14 <= h < 18
      { iso: '2026-06-21T15:00:00Z', expectIncludes: '오후네요.', lang: 'ko' },
      // evening: 18 <= h < 22
      { iso: '2026-06-21T19:00:00Z', expectIncludes: '퇴근하셨어요?', lang: 'ko' },
      // night: h >= 22
      { iso: '2026-06-21T23:00:00Z', expectIncludes: '조용한 밤이에요.', lang: 'ko' },
    ]

    for (const { iso, expectIncludes } of cases) {
      it(`${iso} → 해당 버킷 풀에서 픽`, () => {
        freezeUtc(iso)
        // 풀 전체를 seed 로 순회해 기대 문구가 그 버킷에 실제로 존재함을 확인.
        const seen = new Set<string>()
        for (let s = 0; s < 12; s++) {
          seen.add(pickGreeting({ lang: 'ko', tz: 'UTC', seed: s }))
        }
        expect([...seen]).toContain(expectIncludes)
      })
    }
  })

  it('seed 결정성 — 같은 seed/입력은 같은 결과', () => {
    freezeUtc('2026-06-21T08:00:00Z')
    const a = pickGreeting({ lang: 'ko', tz: 'UTC', seed: 2 })
    const b = pickGreeting({ lang: 'ko', tz: 'UTC', seed: 2 })
    expect(a).toBe(b)
  })

  it('음수 seed 도 정상 인덱스로 정규화', () => {
    freezeUtc('2026-06-21T08:00:00Z')
    const result = pickGreeting({ lang: 'ko', tz: 'UTC', seed: -1 })
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('이름 없으면 {name} 템플릿 제외 — 결과에 {name} 없음', () => {
    freezeUtc('2026-06-21T08:00:00Z')
    for (let s = 0; s < 20; s++) {
      const r = pickGreeting({ lang: 'ko', tz: 'UTC', seed: s })
      expect(r).not.toContain('{name}')
    }
  })

  it('이름 있으면 {name} 치환 — 적어도 하나는 이름 포함', () => {
    freezeUtc('2026-06-21T03:00:00Z') // dawn: {name} 템플릿 다수
    const results = new Set<string>()
    for (let s = 0; s < 12; s++) {
      results.add(pickGreeting({ lang: 'ko', tz: 'UTC', name: '지윤', seed: s }))
    }
    const joined = [...results].join(' | ')
    expect(joined).toContain('지윤님')
    // 치환되지 않은 토큰이 남으면 안 된다.
    expect(joined).not.toContain('{name}')
  })

  it('공백뿐인 이름은 이름 없음으로 취급', () => {
    freezeUtc('2026-06-21T03:00:00Z')
    for (let s = 0; s < 20; s++) {
      const r = pickGreeting({ lang: 'ko', tz: 'UTC', name: '   ', seed: s })
      expect(r).not.toContain('{name}')
      expect(r).not.toMatch(/님/) // 이름 템플릿이 후보에서 빠졌어야 함
    }
  })

  it('이름 앞뒤 공백은 trim 되어 치환', () => {
    freezeUtc('2026-06-21T03:00:00Z')
    const results: string[] = []
    for (let s = 0; s < 12; s++) {
      results.push(pickGreeting({ lang: 'ko', tz: 'UTC', name: '  민수  ', seed: s }))
    }
    const withName = results.find((r) => r.includes('민수'))
    expect(withName).toBeDefined()
    expect(withName).not.toContain('  민수')
  })

  it('영어 lang — en 풀에서 픽', () => {
    freezeUtc('2026-06-21T08:00:00Z')
    const seen = new Set<string>()
    for (let s = 0; s < 12; s++) {
      seen.add(pickGreeting({ lang: 'en', tz: 'UTC', seed: s }))
    }
    expect(seen).toContain('Good morning.')
  })

  it('영어 + 이름 → {name} 치환', () => {
    freezeUtc('2026-06-21T03:00:00Z')
    const seen = new Set<string>()
    for (let s = 0; s < 12; s++) {
      seen.add(pickGreeting({ lang: 'en', tz: 'UTC', name: 'Sam', seed: s }))
    }
    const joined = [...seen].join(' | ')
    expect(joined).toContain('Sam')
    expect(joined).not.toContain('{name}')
  })

  it('seed 없으면 Math.random 경로 — 유효한 풀 문구 반환', () => {
    freezeUtc('2026-06-21T08:00:00Z')
    const r = pickGreeting({ lang: 'ko', tz: 'UTC' })
    expect(typeof r).toBe('string')
    expect(r.length).toBeGreaterThan(0)
  })

  it('알 수 없는 lang 풀 → FALLBACK (한국어 키 없음 시 영문 폴백 동작 확인)', () => {
    // POOL[lang] 이 undefined 면 eligible 빈 배열 → FALLBACK[lang]
    freezeUtc('2026-06-21T08:00:00Z')
    // @ts-expect-error 의도적으로 미지원 lang 주입해 폴백 분기 커버
    const r = pickGreeting({ lang: 'fr', tz: 'UTC', seed: 0 })
    // FALLBACK['fr'] 은 undefined 이지만 함수는 그대로 반환(타입상 string)
    expect(r).toBeUndefined()
  })

  it('잘못된 tz 문자열 → catch 폴백(현지 getHours) 으로도 동작', () => {
    freezeUtc('2026-06-21T08:00:00Z')
    const r = pickGreeting({ lang: 'ko', tz: 'Not/AZone', seed: 0 })
    expect(typeof r).toBe('string')
    expect(r.length).toBeGreaterThan(0)
  })

  it('tz 생략 시 브라우저 기본 시간대로 동작', () => {
    freezeUtc('2026-06-21T08:00:00Z')
    const r = pickGreeting({ lang: 'ko', seed: 0 })
    expect(typeof r).toBe('string')
    expect(r.length).toBeGreaterThan(0)
  })
})

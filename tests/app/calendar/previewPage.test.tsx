// tests/app/calendar/previewPage.test.tsx
//
// /calendar/preview — 샘플 본명의 도시가 로케일을 따른다(R-VC-5). KO 칩·폴리오에 'Seoul'/'SEOUL' 이
// 찍히던 회귀: 스탬프와 assembleTiers 가 같은 지역화된 장소를 쓴다. 엔진·DB 는 목으로 막는다.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const locale = vi.hoisted(() => ({ value: 'ko' as 'ko' | 'en' }))
vi.mock('@/i18n/server', () => ({ detectServerLocale: vi.fn(async () => locale.value) }))
vi.mock('@/lib/calendar-engine/persistence', () => ({
  getOrBuildNatalContext: vi.fn(async () => ({ natal: true })),
  getOrBuildMonthCells: vi.fn(async () => []),
  getFocusDayCell: vi.fn(async () => null),
}))
const assembleTiers = vi.hoisted(() =>
  vi.fn(async (_opts: { place: string }) => ({
    topbar: { ilganHanja: '甲' },
    user: { sex: '여', ilgan: { hanja: '甲' } },
    month: {},
    day: { isMinor: false },
  }))
)
vi.mock('@/app/calendar/assembleTiers', () => ({ assembleTiers }))
vi.mock('@/lib/calendar-view/monthViewModel', () => ({ buildMonthViewModel: vi.fn(() => ({})) }))
vi.mock('@/lib/calendar-view/dayViewModel', () => ({ buildDayViewModel: vi.fn(() => ({})) }))
vi.mock('@/app/calendar/CalendarClient', () => ({ default: () => null }))

import DestinypalPreview from '@/app/calendar/preview/page'

type PreviewProps = { chipStamp: string; folioStamp: string; showCounselor: boolean }

async function previewProps(lang: 'ko' | 'en'): Promise<PreviewProps> {
  locale.value = lang
  const el = (await DestinypalPreview()) as unknown as { props: PreviewProps }
  return el.props
}

describe('/calendar/preview — 샘플 도시 지역화(R-VC-5)', () => {
  beforeEach(() => assembleTiers.mockClear())

  it('ko — 칩 · 폴리오 · assembleTiers 모두 서울, 라틴 Seoul 없음', async () => {
    const p = await previewProps('ko')
    expect(p.chipStamp).toBe('1997년 3월 21일 · 서울')
    expect(p.folioStamp).toBe('1997년 3월 21일 14:30 · 서울')
    expect(`${p.chipStamp} ${p.folioStamp}`).not.toMatch(/seoul/i)
    expect(assembleTiers.mock.calls[0][0].place).toBe('서울')
  })

  it('en — 칩 · 폴리오 · assembleTiers 모두 Seoul', async () => {
    const p = await previewProps('en')
    expect(p.chipStamp).toBe('1997.3.21 · Seoul')
    expect(p.folioStamp).toBe('1997.3.21 14:30 · Seoul')
    expect(assembleTiers.mock.calls[0][0].place).toBe('Seoul')
    expect(p.showCounselor).toBe(false)
  })
})

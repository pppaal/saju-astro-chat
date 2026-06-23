import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// useI18n 은 locale 만 읽힌다 — mutable 변수로 ko/en 토글.
let mockLocale: 'ko' | 'en' = 'ko'
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: mockLocale }),
}))

import { DecadeTier } from '@/components/calendar/tiers/DecadeTier'
import type { DecadeTierProps } from '@/components/calendar/tiers/DecadeTier'

// ── 실 덤프(audit-decade.json / audit-user.json) 를 인라인 상수로 — presentation
//    only 라 엔진 shape 그대로. as 캐스팅으로 prop 모양에 맞춘다.
const decadeDump = {
  gz: { hanja: '甲戌', kr: '갑술', en: 'gapsul' },
  start: 2026,
  end: 2036,
  ageFrom: 31,
  ageTo: 41,
  sibsin: '정재',
  theme: '꾸준한 축적의 무대',
  themeEn: 'Steady Accumulation',
  headline: '정재 대운 — 차근차근 자산이 쌓이는 10년.',
  headlineEn: 'Steady-wealth cycle — a decade where assets build up bit by bit.',
  pillar: {
    cheongan: {
      hanja: '甲',
      sibsin: '정재',
      el: '목(木)',
      element: '목',
      note: '재성 천간 — 안정적 축적',
    },
    jiji: {
      hanja: '戌',
      sibsin: '정인',
      el: '토(土)',
      element: '토',
      note: '인성 지지 — 배움·지원·안정의 뿌리',
    },
  },
  sewoonNow: { gz: { hanja: '丙午', kr: '병오', en: 'byeongo' }, sibsin: '정관', year: 2026 },
  years: [
    {
      year: 2026,
      gz: { hanja: '丙午', kr: '병오', en: 'byeongo' },
      score: 50,
      now: true,
      sibsin: '정관',
    },
    {
      year: 2027,
      gz: { hanja: '丁未', kr: '정미', en: 'jeongmi' },
      score: 50,
      now: false,
      sibsin: '편관',
    },
    {
      year: 2028,
      gz: { hanja: '戊申', kr: '무신', en: 'musin' },
      score: 50,
      now: false,
      sibsin: '정인',
    },
    {
      year: 2029,
      gz: { hanja: '己酉', kr: '기유', en: 'giyu' },
      score: 50,
      now: false,
      sibsin: '편인',
    },
    {
      year: 2030,
      gz: { hanja: '庚戌', kr: '경술', en: 'gyeongsul' },
      score: 50,
      now: false,
      sibsin: '겁재',
    },
    {
      year: 2031,
      gz: { hanja: '辛亥', kr: '신해', en: 'sinhae' },
      score: 50,
      now: false,
      sibsin: '비견',
    },
    {
      year: 2032,
      gz: { hanja: '壬子', kr: '임자', en: 'imja' },
      score: 50,
      now: false,
      sibsin: '상관',
    },
    {
      year: 2033,
      gz: { hanja: '癸丑', kr: '계축', en: 'gyechuk' },
      score: 50,
      now: false,
      sibsin: '식신',
    },
    {
      year: 2034,
      gz: { hanja: '甲寅', kr: '갑인', en: 'gapin' },
      score: 50,
      now: false,
      sibsin: '정재',
    },
    {
      year: 2035,
      gz: { hanja: '乙卯', kr: '을묘', en: 'eulmyo' },
      score: 50,
      now: false,
      sibsin: '편재',
    },
  ],
  body: ['정재 대운 — 차근차근 자산이 쌓이는 10년.'],
  bodyEn: ['Steady-wealth cycle — a decade where assets build up bit by bit.'],
  hapchung: {
    title: '卯戌육합',
    body: '본명 시지 卯(묘) × 대운 戌(술) → 卯戌육합 — 환경이 손발을 맞춰줘요.',
    bodyEn:
      'Natal hour branch 卯 (myo) × decade 戌 (sul) → 卯戌 harmony — your surroundings fall into step with you.',
  },
  unseong: {
    title: '관대',
    body: '대운 자리(戌·술)는 관대 — 막 자리를 잡아가는 기세',
    bodyEn:
      'The decade seat (戌·sul) sits at the Coming-of-age stage — momentum just finding its footing.',
  },
  astro: [
    { label: '세 번째 목성 회귀', date: '2030', body: '인생 중반 직전의 확장', kind: 'jupiter' },
    { label: '명왕성 사각', date: '2031', body: '깊은 재구성', kind: 'pluto' },
    { label: '천왕성 마주봄', date: '2035', body: '자유의 각성', kind: 'uranus' },
    { label: '해왕성 사각', date: '2036', body: '의미의 시험', kind: 'neptune' },
  ],
  narrative: [],
  focusYear: 2026,
  zrSpiritChapters: [],
  zrFortuneChapters: [],
  crossActivations: [
    {
      signalId: 'cross.정관-x-Saturn.2026-06-01',
      name: '일·책임 × 책임·인내',
      nameEn: 'duty & standing × duty & limits',
      sajuLine: '정관',
      sajuLineEn: 'Direct Officer',
      astroLine: '토성',
      astroLineEn: 'Saturn',
      polarity: 1,
      meaning: '정관 × 토성 — 책임·법·구조가 강화되는 시기. 공식 절차·약속을 다지기 좋음.',
      meaningEn:
        'Direct Officer × Saturn — responsibility, law, and structure all firm up; a window to lock in formal commitments.',
    },
    {
      signalId: 'cross.정재-x-Saturn.2026-06-01',
      name: '돈·안정 × 책임·인내',
      nameEn: 'steady wealth × duty & limits',
      sajuLine: '정재',
      sajuLineEn: 'Direct Wealth',
      astroLine: '토성',
      astroLineEn: 'Saturn',
      polarity: 1,
      meaning:
        '정재 × 토성 — 꾸준한 가치·약속·자산이 시간을 들여 단단해지는 결. 서두르지 않고 쌓을수록 오래 갑니다.',
      meaningEn:
        'Direct Wealth × Saturn — steady value, commitments, and assets harden with time. The less you rush, the longer it lasts.',
    },
    {
      signalId: 'cross.편인-x-Saturn.2026-06-01',
      name: '공부·사유 × 책임·인내',
      nameEn: 'study & depth × duty & limits',
      sajuLine: '편인',
      sajuLineEn: 'Indirect Resource',
      astroLine: '토성',
      astroLineEn: 'Saturn',
      polarity: 0,
      meaning: '편인 × 토성 — 고립된 사고·종교·연구의 결이 깊어지는 시기. 혼자 파고드는 일에 우호.',
      meaningEn:
        'Indirect Resource × Saturn — solitary thought, faith, and deep research run deeper. Favours single-minded study.',
    },
  ],
  geokgukStatus: '정인격 · 반성반파 (+정인 존재 / -재성이 인성 파괴)',
}

const userDump = {
  birth: '1995-02-09 06:40',
  birthKo: '1995년 2월 9일 06:40',
  place: '서울',
  sex: '남',
  ilgan: { hanja: '辛', kr: '신금', en: 'Sin · Yin Metal', element: '금' },
  yongsin: {
    hanja: '화·토',
    kr: '화·토',
    en: 'Fire · Earth',
    primary: '화',
    secondary: '토',
    avoid: [],
  },
  huisin: { hanja: '토', kr: '토', en: 'Earth', primary: '토', avoid: [] },
  gyeokguk: '정인격',
  gyeokgukEn: '정인격 · Jeongin (Direct-resource)',
  gangyak: '중화(中和)',
  gyeokgukStatus: '정인격 · 반성반파 (+정인 존재 / -재성이 인성 파괴)',
  rootStatus: '월령 寅 실령 · 뿌리 없음',
}

const decade = decadeDump as unknown as DecadeTierProps['decade']
const user = userDump as unknown as DecadeTierProps['user']

const noop = () => {}

beforeEach(() => {
  mockLocale = 'ko'
})

describe('DecadeTier (이 10년 · LIGHT)', () => {
  it('renders without throwing from the real decade + user dump', () => {
    expect(() =>
      render(<DecadeTier user={user} decade={decade} onDive={noop} onRise={noop} />)
    ).not.toThrow()
  })

  it('surfaces the 大運 干支 hanja + 십신 on the main surface', () => {
    render(<DecadeTier user={user} decade={decade} onDive={noop} onRise={noop} />)
    expect(screen.getAllByText('甲戌').length).toBeGreaterThan(0)
    // 십신 chip + term-tag both surface 정재.
    expect(screen.getAllByText('정재').length).toBeGreaterThan(0)
  })

  it('renders the eyebrow with the decade span + age range', () => {
    render(<DecadeTier user={user} decade={decade} onDive={noop} onRise={noop} />)
    expect(screen.getByText(/10년 · DECADE · 2026–2036/)).toBeInTheDocument()
    expect(screen.getByText(/31–41세/)).toBeInTheDocument()
  })

  it('renders a crossActivations term using DECADE field names (토성)', () => {
    render(<DecadeTier user={user} decade={decade} onDive={noop} onRise={noop} />)
    expect(screen.getByText('겹치는 흐름')).toBeInTheDocument()
    // astroLine = 토성 — proves DECADE field names (not Month's saju/astro) wired.
    expect(screen.getAllByText('토성').length).toBeGreaterThan(0)
    // strongest cross flag present
    expect(screen.getByText('가장 또렷한 흐름')).toBeInTheDocument()
  })

  it('renders hapchung + unseong titles', () => {
    render(<DecadeTier user={user} decade={decade} onDive={noop} onRise={noop} />)
    expect(screen.getByText('卯戌육합')).toBeInTheDocument()
    expect(screen.getByText('관대')).toBeInTheDocument()
  })

  it('fires onRise from the zoom-out button (always present, no showRise)', () => {
    const onRise = vi.fn()
    render(<DecadeTier user={user} decade={decade} onDive={noop} onRise={onRise} />)
    fireEvent.click(screen.getByRole('button', { name: /인생으로 줌아웃/ }))
    expect(onRise).toHaveBeenCalledTimes(1)
  })

  it('fires onDive from the CTA with the focus year', () => {
    const onDive = vi.fn()
    render(<DecadeTier user={user} decade={decade} onDive={onDive} onRise={noop} />)
    fireEvent.click(screen.getByRole('button', { name: /2026년으로 줌인/ }))
    expect(onDive).toHaveBeenCalledTimes(1)
  })

  it('renders English labels under the en locale', () => {
    mockLocale = 'en'
    render(<DecadeTier user={user} decade={decade} onDive={noop} onRise={noop} />)
    expect(screen.getByText(/10 Years · DECADE · 2026–2036/)).toBeInTheDocument()
    // EN sibsin label via SIBSIN_EN.
    expect(screen.getAllByText('Direct Wealth').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Zoom in to 2026/ })).toBeInTheDocument()
  })
})

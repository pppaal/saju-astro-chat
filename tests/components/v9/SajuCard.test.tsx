// tests/components/v9/SajuCard.test.tsx
//
// 사주 카드 — 기둥 4칸(숨긴 시주는 점선), 일주 칸 YOU, 로마자/한글 읽기, ASC null → '—',
// 세리프 타입 이름(사주 타입 라벨, 결정 2), 인생 모양, 정체성 판정(TONE_LABEL), 합의 줄과 막대
// 비율, 머리말 훅 + 도메인. mini 는 정체성 띠 없음, export 는 기둥·ASC 없음(공유 개인정보).

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import SajuCard from '@/components/v9/SajuCard'
import { TONE_LABEL } from '@/lib/report/toneLabel'
import { SAJU_TYPE_LABEL } from '@/lib/report/viralArchetype'
import { shareDomain } from '@/lib/share/site'
import { sampleCard } from './fixtures'

afterEach(() => {
  vi.unstubAllEnvs()
})

const q = (root: HTMLElement, sel: string) => root.querySelector(sel) as HTMLElement | null

describe('SajuCard full', () => {
  it('기둥 4칸 — 시주 숨김은 점선 빈 칸, 일주 칸에 YOU', () => {
    const { container } = render(<SajuCard data={sampleCard()} locale="en" />)
    const cols = container.querySelectorAll('[data-col]')
    expect([...cols].map((c) => c.getAttribute('data-col'))).toEqual([
      'hour',
      'day',
      'month',
      'year',
    ])
    const hour = q(container, '[data-col="hour"]')!
    expect(hour.hasAttribute('data-hidden')).toBe(true)
    expect(hour.querySelectorAll('[data-tile="hidden"]')).toHaveLength(2)
    expect(hour.textContent).toBe('')
    const day = q(container, '[data-col="day"]')!
    expect(day.textContent).toBe('壬戌')
    expect(day.querySelector('[data-tile="water"]')?.textContent).toBe('壬')
    expect(day.querySelector('[data-tile="earth"]')?.textContent).toBe('戌')
    expect(q(container, '[data-caption="day"]')?.textContent).toBe('Day · YouImsul')
    expect(q(container, '[data-caption="hour"]')?.textContent).toBe('HourHidden')
  })

  it('로마자 읽기(en)와 한글 읽기(ko)', () => {
    const en = render(<SajuCard data={sampleCard()} locale="en" />).container
    expect(q(en, '[data-caption="month"]')?.textContent).toBe('MonthGyemyo')
    expect(q(en, '[data-caption="year"]')?.textContent).toBe('YearJeongchuk')
    const ko = render(<SajuCard data={sampleCard()} locale="ko" />).container
    expect(q(ko, '[data-caption="day"]')?.textContent).toBe('일 · 나임술')
    expect(q(ko, '[data-caption="month"]')?.textContent).toBe('월계묘')
  })

  it('시주를 숨기지 않으면 시주 타일이 보인다', () => {
    const { container } = render(<SajuCard data={sampleCard({ hourHidden: false })} locale="en" />)
    expect(q(container, '[data-col="hour"]')?.textContent).toBe('丁未')
    expect(q(container, '[data-caption="hour"]')?.textContent).toBe('HourJeongmi')
  })

  it('빅 쓰리 — ASC 가 null 이면 —', () => {
    const known = render(<SajuCard data={sampleCard()} locale="en" />).container
    expect(q(known, '[data-big-three]')?.textContent).toContain('Aries')
    expect(q(known, '[data-asc]')?.textContent).toBe('Leo')
    const unknown = render(
      <SajuCard
        data={sampleCard({
          bigThree: {
            sun: { ko: '양자리', en: 'Aries' },
            moon: { ko: '사자자리', en: 'Leo' },
            asc: null,
          },
        })}
        locale="en"
      />
    ).container
    const asc = q(unknown, '[data-asc]')!
    expect(asc.textContent).toBe('—')
    expect(asc.getAttribute('data-asc')).toBe('unknown')
  })

  it("빅 쓰리 구분점은 앞 항목 끝에 붙는다 — 줄바꿈된 줄이 '·' 로 시작하지 않는다(QA VH-8)", () => {
    const ko = render(<SajuCard data={sampleCard()} locale="ko" />).container
    const items = [...q(ko, '[data-big-three]')!.children] as HTMLElement[]
    expect(items).toHaveLength(3)
    expect(items[0].textContent?.trim().endsWith('·')).toBe(true)
    expect(items[1].textContent?.trim().endsWith('·')).toBe(true)
    for (const it of items) expect(it.textContent?.trim().startsWith('·')).toBe(false)
    expect(items[2].textContent).not.toContain('·')
  })

  it('ko 카드엔 ko 클래스(한글 타입 이름 = 바로 선 산세리프, 자간 좁힘) · 한자 타일은 lang="ko"', () => {
    const ko = render(<SajuCard data={sampleCard()} locale="ko" />).container
    const en = render(<SajuCard data={sampleCard()} locale="en" />).container
    const koCard = q(ko, 'article')!
    const enCard = q(en, 'article')!
    expect(koCard.className.split(/\s+/).length).toBe(enCard.className.split(/\s+/).length + 1)
    const tiles = [...en.querySelectorAll('[data-tile]:not([data-tile="hidden"])')]
    expect(tiles.length).toBeGreaterThan(0)
    for (const t of tiles) expect(t.getAttribute('lang')).toBe('ko')
  })

  it('세리프 타입 이름 + 사주 타입 라벨 + 인생 모양', () => {
    const { container } = render(<SajuCard data={sampleCard()} locale="en" />)
    const type = q(container, '[data-card-type]')!
    expect(type.textContent).toContain(SAJU_TYPE_LABEL.plain.en)
    expect(type.textContent).not.toMatch(/stars type/i)
    expect(q(container, '[data-type-name]')?.textContent).toBe('steady-building Free Spirit')
    expect(q(container, '[data-life-shape]')?.textContent).toBe('Life shapeLate bloomer')
    const mine = render(<SajuCard data={sampleCard()} locale="ko" typeLabel="mine" />).container
    expect(q(mine, '[data-card-type]')?.textContent).toContain(SAJU_TYPE_LABEL.mine.ko)
  })

  it('정체성 판정 문구는 TONE_LABEL 에서', () => {
    const en = render(<SajuCard data={sampleCard()} locale="en" />).container
    const idEn = q(en, '[data-card-identity]')!
    expect(idEn.textContent).toContain('Water × Fire')
    expect(within(idEn).getByText(TONE_LABEL.tension.en)).toBeTruthy()
    const ko = render(<SajuCard data={sampleCard()} locale="ko" />).container
    expect(within(q(ko, '[data-card-identity]')!).getByText(TONE_LABEL.tension.ko)).toBeTruthy()
    const same = render(
      <SajuCard
        data={sampleCard({ identity: { saju: 'fire', astro: 'fire', verdictKey: 'resonant' } })}
        locale="en"
      />
    ).container
    expect(q(same, '[data-card-identity]')?.textContent).toContain(TONE_LABEL.resonant.en)
  })

  it('별 쪽은 서양 원소 — 공기 태양은 Air / 공기(판정 계산의 air→木 근사가 이름으로 새지 않는다)', () => {
    const air = sampleCard({
      bigThree: {
        sun: { ko: '쌍둥이자리', en: 'Gemini' },
        moon: { ko: '사자자리', en: 'Leo' },
        asc: null,
      },
      identity: { saju: 'water', astro: 'air', verdictKey: 'complement' },
    })
    const en = q(render(<SajuCard data={air} locale="en" />).container, '[data-card-identity]')!
    expect(en.textContent).toContain('Water × Air')
    expect(en.textContent).not.toContain('Wood')
    const ko = q(render(<SajuCard data={air} locale="ko" />).container, '[data-card-identity]')!
    expect(ko.textContent).toContain('수 × 공기')
  })

  it("합의 줄 'line up on N of M' 과 막대 비율", () => {
    const { container } = render(<SajuCard data={sampleCard()} locale="en" />)
    const agree = q(container, '[data-agree]')!
    expect(agree.getAttribute('data-agree')).toBe('13/16')
    expect(agree.textContent).toContain('Saju × stars line up on 13 of 16 traits')
    const bar = agree.querySelector('[data-ratio]') as HTMLElement
    expect(bar.getAttribute('data-ratio')).toBe((13 / 16).toFixed(3))
    expect(bar.style.gridTemplateColumns).toBe('13fr 3fr')
    const ko = render(<SajuCard data={sampleCard()} locale="ko" />).container
    expect(q(ko, '[data-agree]')?.textContent).toContain(
      '사주와 별자리가 16가지 중 13가지에서 맞아요'
    )
  })

  it("머리말 'What's yours? · destinypal.com' (lib/share/site)", () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://destinypal.com/')
    expect(shareDomain()).toBe('destinypal.com')
    const { container } = render(<SajuCard data={sampleCard()} locale="en" />)
    const header = q(container, '[data-card-header]')!
    expect(header.textContent).toMatch(/What.s yours\?/)
    expect(header.textContent).toContain('destinypal.com')
    // 도메인은 하드코딩이 아니라 site.ts 에서 — env 를 바꾸면 따라 바뀐다.
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://staging.example.org')
    const staging = render(<SajuCard data={sampleCard()} locale="ko" />).container
    expect(q(staging, '[data-card-header]')?.textContent).toContain('staging.example.org')
    expect(q(staging, '[data-card-header]')?.textContent).toContain('당신의 카드는?')
  })

  it('backYear 가 있으면 뒷면(세운 표기)이 비친다 · 없으면 앞면만', () => {
    const withBack = render(<SajuCard data={sampleCard()} locale="en" />).container
    expect(q(withBack, '[data-card-back]')?.textContent).toContain('丙午 · 2026')
    const noBack = render(<SajuCard data={sampleCard({ backYear: null })} locale="en" />).container
    expect(q(noBack, '[data-card-back]')).toBeNull()
    expect(q(noBack, '[data-card-stage]')).toBeNull()
  })

  it('같은 입력은 같은 마크업 (결정적)', () => {
    const a = renderToStaticMarkup(<SajuCard data={sampleCard()} locale="en" />)
    const b = renderToStaticMarkup(<SajuCard data={sampleCard()} locale="en" />)
    expect(a).toBe(b)
  })
})

describe('SajuCard mini / export', () => {
  it('mini — 정체성 띠·일간 띠 없음, 기둥과 타입 띠는 있음', () => {
    const { container } = render(<SajuCard data={sampleCard()} variant="mini" locale="en" />)
    expect(q(container, '[data-variant="mini"]')).not.toBeNull()
    expect(q(container, '[data-card-identity]')).toBeNull()
    expect(q(container, '[data-card-daymaster]')).toBeNull()
    expect(q(container, '[data-card-pillars]')).not.toBeNull()
    expect(q(container, '[data-type-name]')?.textContent).toBe('steady-building Free Spirit')
    expect(q(container, '[data-card-back]')).toBeNull()
  })

  it('mini 머리말도 도메인 워드마크(디자인 life9 .card.mini)', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://destinypal.com/')
    const { container } = render(<SajuCard data={sampleCard()} variant="mini" locale="en" />)
    expect(q(container, '[data-card-header]')?.textContent).toContain('destinypal.com')
  })

  it('export — 기둥·ASC·빅 쓰리·뒷면 연도 없음, 타입 이름과 인생 모양만', () => {
    const { container } = render(<SajuCard data={sampleCard()} variant="export" locale="en" />)
    expect(q(container, '[data-card-pillars]')).toBeNull()
    expect(q(container, '[data-card-captions]')).toBeNull()
    expect(q(container, '[data-big-three]')).toBeNull()
    expect(q(container, '[data-asc]')).toBeNull()
    expect(q(container, '[data-card-back]')).toBeNull()
    expect(q(container, '[data-card-identity]')).toBeNull()
    const text = container.textContent ?? ''
    for (const leak of ['壬', '戌', '癸', '卯', '丑', 'Imsul', 'Leo', 'Aries', '2026']) {
      expect(text).not.toContain(leak)
    }
    expect(q(container, '[data-type-name]')?.textContent).toBe('steady-building Free Spirit')
    expect(q(container, '[data-life-shape]')?.textContent).toContain('Late bloomer')
  })
})

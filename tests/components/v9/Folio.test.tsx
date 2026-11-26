// tests/components/v9/Folio.test.tsx
//
// 폴리오 'COMPUTED · {stamp}' + 오른쪽 칸, 그리고 v9 크롬(상단 바·푸터·판독 띠·스위치·뼈대·까치).

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import Folio from '@/components/v9/Folio'
import V9TopBar from '@/components/v9/V9TopBar'
import V9Footer from '@/components/v9/V9Footer'
import ReadoutStrip from '@/components/v9/ReadoutStrip'
import SegSwitch from '@/components/v9/SegSwitch'
import V9Skeleton from '@/components/v9/V9Skeleton'
import ElementTile from '@/components/v9/ElementTile'
import KkachiMark from '@/components/branding/KkachiMark'
import { formatBirthStamp } from '@/lib/birth/format'

const INFO = {
  birthDate: '1997-03-21',
  birthTime: '14:30',
  birthTimeUnknown: false,
  city: 'Seoul, KR',
}

describe('Folio', () => {
  it('COMPUTED · 1997.3.21 14:30 · Seoul + Sample', () => {
    const { container } = render(
      <Folio stamp={formatBirthStamp(INFO, 'en')} right="Sample" locale="en" />
    )
    const f = container.querySelector('[data-folio]') as HTMLElement
    expect(f.getAttribute('data-folio')).toBe('top')
    expect(f.textContent).toBe('COMPUTED · 1997.3.21 14:30 · SeoulSample')
    expect(f.querySelector('b')?.textContent).toBe('1997.3.21 14:30 · Seoul')
  })

  it('ko · end 위치 · 스탬프 없으면 COMPUTED 만', () => {
    const { container } = render(<Folio position="end" locale="ko" right="destinypal.com" />)
    const f = container.querySelector('[data-folio]') as HTMLElement
    expect(f.getAttribute('data-folio')).toBe('end')
    expect(f.textContent).toBe('계산됨destinypal.com')
  })
})

describe('V9TopBar', () => {
  it('뒤로 링크 · 제목 · 사람 칩(일간 원판)', () => {
    const { container, getByLabelText } = render(
      <V9TopBar
        title="Life flow"
        locale="en"
        backHref="/"
        who={{
          stamp: formatBirthStamp(INFO, 'en', { time: false }),
          dayMaster: { stem: '壬', element: 'water' },
        }}
      />
    )
    expect(getByLabelText('Back').getAttribute('href')).toBe('/')
    expect(container.textContent).toContain('Life flow')
    const chip = container.querySelector('[data-who]') as HTMLElement
    expect(chip.textContent).toBe('1997.3.21 · Seoul壬')
    expect(container.querySelector('h1')).toBeNull()
  })

  it('onBack · onWho 는 버튼', () => {
    const onBack = vi.fn()
    const onWho = vi.fn()
    const { getByLabelText } = render(
      <V9TopBar
        title="Calendar"
        locale="ko"
        onBack={onBack}
        who={{ stamp: '1997년 3월 21일' }}
        onWho={onWho}
        whoLabel="출생 정보 바꾸기"
      />
    )
    fireEvent.click(getByLabelText('뒤로'))
    fireEvent.click(getByLabelText('출생 정보 바꾸기'))
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onWho).toHaveBeenCalledTimes(1)
  })
})

describe('V9Footer', () => {
  it('면책 · 출처 줄 · 링크 4개 (en)', () => {
    const { container } = render(<V9Footer locale="en" />)
    expect(container.textContent).toContain('For self-reflection.')
    expect(container.textContent).toContain('Math: our engine · Words in the counselor: AI')
    const links = [...container.querySelectorAll('nav a')].map((a) => [
      a.textContent,
      a.getAttribute('href'),
    ])
    expect(links).toEqual([
      ['Pricing', '/pricing'],
      ['Privacy', '/policy/privacy'],
      ['Terms', '/policy/terms'],
      ['Refund', '/policy/refund'],
    ])
  })

  it("ko — '계산: 우리 엔진 · 상담의 말: AI', Pricing = 요금제", () => {
    const { container } = render(<V9Footer locale="ko" line="이 화면의 한 문장." />)
    expect(container.textContent).toContain('계산: 우리 엔진 · 상담의 말: AI')
    expect(container.textContent).toContain('이 화면의 한 문장.')
    expect(container.querySelector('nav a')?.textContent).toBe('요금제')
  })
})

describe('ReadoutStrip · SegSwitch · V9Skeleton · ElementTile · KkachiMark', () => {
  it('판독 띠 — 칸 수만큼 열, 라벨/값/단위', () => {
    const { container } = render(
      <ReadoutStrip
        cells={[
          { label: 'Cost', value: 'FREE' },
          { label: 'Account', value: 'NO SIGN-UP' },
          { label: 'Time', value: '30', unit: 'SECONDS' },
        ]}
      />
    )
    const dl = container.querySelector('dl') as HTMLElement
    expect(dl.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))')
    expect([...container.querySelectorAll('dt')].map((d) => d.textContent)).toEqual([
      'Cost',
      'Account',
      'Time',
    ])
    expect(container.textContent).toContain('30SECONDS')
  })

  it('스위치 — aria-pressed, 다른 갈래를 누를 때만 onChange', () => {
    const onChange = vi.fn()
    const { getByText } = render(
      <SegSwitch
        ariaLabel="View"
        value="month"
        onChange={onChange}
        options={[
          { value: 'month', label: 'Monthly' },
          { value: 'day', label: 'Daily' },
        ]}
      />
    )
    expect(getByText('Monthly').getAttribute('aria-pressed')).toBe('true')
    expect(getByText('Daily').getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(getByText('Monthly'))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(getByText('Daily'))
    expect(onChange).toHaveBeenCalledWith('day')
  })

  it('뼈대 — aria-busy + 로딩 문구(ko/en)', () => {
    const en = render(<V9Skeleton />).container.firstElementChild as HTMLElement
    expect(en.getAttribute('aria-busy')).toBe('true')
    expect(en.textContent).toBe('Loading')
    const ko = render(<V9Skeleton variant="page" locale="ko" />).container
      .firstElementChild as HTMLElement
    expect(ko.getAttribute('data-v9-skeleton')).toBe('page')
    expect(ko.textContent).toBe('불러오는 중')
  })

  it('오행 타일 · 숨긴 칸', () => {
    const t = render(<ElementTile char="壬" element="water" />).container
      .firstElementChild as HTMLElement
    expect(t.getAttribute('data-tile')).toBe('water')
    expect(t.textContent).toBe('壬')
    const h = render(<ElementTile hidden />).container.firstElementChild as HTMLElement
    expect(h.getAttribute('data-tile')).toBe('hidden')
    expect(h.getAttribute('aria-hidden')).toBe('true')
  })

  it('까치 마크 — 기본 장식(aria-hidden), 이름을 주면 img', () => {
    const d = render(<KkachiMark />).container.querySelector('svg')!
    expect(d.getAttribute('aria-hidden')).toBe('true')
    expect(d.getAttribute('width')).toBe('20')
    const n = render(
      <KkachiMark size={24} decorative={false} label="Kkachi" />
    ).container.querySelector('svg')!
    expect(n.getAttribute('role')).toBe('img')
    expect(n.getAttribute('aria-label')).toBe('Kkachi')
  })
})

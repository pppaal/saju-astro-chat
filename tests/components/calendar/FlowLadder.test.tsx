/**
 * FlowLadder — 시간 층 흐름 사다리(대운→세운→월운→일진) + 충/합/형 렌더 검증.
 * (DOM 환경은 vitest.config 의 기본 happy-dom 사용.)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FlowLadder from '@/components/calendar/premium/shared/FlowLadder'

const longCycle = {
  daeun: { ganji: '戊辰', ageStart: 30, ageEnd: 39, sibsinStem: '편재' },
  sewoon: { ganji: '乙巳', year: 2026, sibsinStem: '정관' },
  wolwoon: { ganji: '丁卯', sibsinStem: '상관' },
  iljin: { ganji: '甲子', sibsinStem: '비견', sibsinBranch: '정인' },
}

const interactions = [
  { pair: '세운-일운', kind: '지지충' as const, blurb: '巳-子 충돌' },
  { pair: '대운-세운', kind: '천간합' as const, blurb: '戊-乙 합' },
]

describe('FlowLadder', () => {
  it('renders all four time layers with ganji + sibsin', () => {
    render(<FlowLadder longCycle={longCycle} interactions={interactions} locale="ko" />)
    expect(screen.getByText('흐름 사다리')).toBeTruthy()
    // 4층 간지
    for (const g of ['戊辰', '乙巳', '丁卯', '甲子']) {
      expect(screen.getByText(g)).toBeTruthy()
    }
    // 십신 칩
    expect(screen.getByText('편재')).toBeTruthy()
    expect(screen.getByText('정관')).toBeTruthy()
    // 층 라벨 (ko)
    expect(screen.getByText('대운')).toBeTruthy()
    expect(screen.getByText('일진')).toBeTruthy()
  })

  it('renders 충/합/형 interaction badges with harmony/clash tone', () => {
    render(<FlowLadder longCycle={longCycle} interactions={interactions} locale="ko" />)
    expect(screen.getByText(/세운-일운 지지충/)).toBeTruthy()
    expect(screen.getByText(/대운-세운 천간합/)).toBeTruthy()
  })

  it('uses English layer labels + kind glosses for en locale', () => {
    render(<FlowLadder longCycle={longCycle} interactions={interactions} locale="en" />)
    expect(screen.getByText('10-yr')).toBeTruthy()
    expect(screen.getByText('Day')).toBeTruthy()
    expect(screen.getByText(/branch clash/)).toBeTruthy()
  })

  it('omits the daeun rung when daeunCycles are absent', () => {
    const noDaeun = { ...longCycle, daeun: undefined }
    render(<FlowLadder longCycle={noDaeun} interactions={[]} locale="ko" />)
    expect(screen.queryByText('戊辰')).toBeNull()
    expect(screen.getByText('乙巳')).toBeTruthy() // 세운은 남음
  })

  it('shows the daeun transition indicator when transitionImminent', () => {
    const transitioning = {
      ...longCycle,
      daeun: { ...longCycle.daeun, transitionImminent: true, nextGanji: '己巳' },
    }
    render(<FlowLadder longCycle={transitioning} locale="ko" />)
    expect(screen.getByText(/전환 임박 → 己巳/)).toBeTruthy()
  })

  it('hides the transition indicator when not imminent', () => {
    render(<FlowLadder longCycle={longCycle} locale="ko" />)
    expect(screen.queryByText(/전환 임박/)).toBeNull()
  })

  it('returns null when no layers are present', () => {
    const { container } = render(<FlowLadder longCycle={{}} locale="ko" />)
    expect(container.firstChild).toBeNull()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataSourceToggles } from '@/components/destiny-map/chat-panels/DataSourceToggles'

// 운명상담사(개인)·궁합상담사(시너스트리)가 공유하는 데이터 소스 체크박스.
// 체크박스가 무엇을 위한 건지 라벨/팝업으로 알리고, 최소 한 소스는 항상 켜둔다.
describe('DataSourceToggles', () => {
  it('synastry variant: shows the visible label + compatibility-tailored info popup', () => {
    render(
      <DataSourceToggles
        sources={{ saju: true, astro: true }}
        onChange={vi.fn()}
        lang="ko"
        showGroupLabel
        showInfo
        variant="synastry"
      />
    )
    // 체크박스 위 보이는 안내 라벨
    expect(screen.getByText('상담에 사용할 데이터')).toBeTruthy()
    // 궁합 전용 트리거 + 팝업 문구 (개인용과 달라야 함)
    const trigger = screen.getByText('사주·점성 궁합이란?')
    fireEvent.click(trigger)
    expect(screen.getByText('사주 궁합 vs 점성 궁합')).toBeTruthy()
    expect(screen.getByText('사주 궁합 (동양 명리)')).toBeTruthy()
    expect(screen.getByText('점성 궁합 (서양 시너스트리)')).toBeTruthy()
  })

  it('self variant: uses the individual (natal) info copy, not the synastry one', () => {
    render(
      <DataSourceToggles
        sources={{ saju: true, astro: true }}
        onChange={vi.fn()}
        lang="ko"
        showInfo
        variant="self"
      />
    )
    const trigger = screen.getByText('사주·점성이란?')
    fireEvent.click(trigger)
    expect(screen.getByText('사주와 점성, 무엇이 다를까요?')).toBeTruthy()
    // 궁합 전용 섹션 제목은 나오면 안 됨
    expect(screen.queryByText('사주 궁합 (동양 명리)')).toBeNull()
  })

  it('no group label / info button unless opted in (default = bare checkboxes)', () => {
    render(<DataSourceToggles sources={{ saju: true, astro: true }} onChange={vi.fn()} lang="ko" />)
    expect(screen.queryByText('상담에 사용할 데이터')).toBeNull()
    expect(screen.queryByText('사주·점성이란?')).toBeNull()
    expect(screen.queryByText('사주·점성 궁합이란?')).toBeNull()
  })

  it('toggles a source via onChange when it is not the last one on', () => {
    const onChange = vi.fn()
    render(
      <DataSourceToggles sources={{ saju: true, astro: true }} onChange={onChange} lang="ko" />
    )
    fireEvent.click(screen.getAllByRole('checkbox')[1]) // turn astro off (saju stays on)
    expect(onChange).toHaveBeenCalledWith({ saju: true, astro: false })
  })

  it('keeps at least one source on — unchecking the last active source is ignored', () => {
    const onChange = vi.fn()
    render(
      <DataSourceToggles sources={{ saju: true, astro: false }} onChange={onChange} lang="ko" />
    )
    fireEvent.click(screen.getAllByRole('checkbox')[0]) // try to turn off the only-on source
    expect(onChange).not.toHaveBeenCalled()
  })
})

/**
 * ChartModal — 모바일 ghost-tap 방어 가드.
 *
 * 버그: 운명상담사 입력창 ☯ 버튼을 누르면 모달이 열리는 그 탭이 갓 마운트된 하단
 * "→ 캘린더" 버튼으로 통과(ghost tap)해 즉시 /calendar 로 navigate → 팝업이 안 보임.
 * 수정: 연 직후 ~320ms 동안 내부 클릭을 무시(armed 가드).
 *
 * 자식 차트는 스텁으로 대체 — 가드 동작에 집중.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/hooks/useFocusTrap', () => ({ useFocusTrap: () => ({ current: null }) }))
vi.mock('@/lib/destiny-map/local-report-generator', () => ({
  generateChartSummary: () => '요약',
}))
vi.mock('@/components/destiny-map/charts/SajuChart', () => ({ SajuChart: () => null }))
vi.mock('@/components/destiny-map/charts/ElementRadar', () => ({ ElementRadar: () => null }))
vi.mock('@/components/destiny-map/charts/NatalChart', () => ({ NatalChart: () => null }))
vi.mock('@/components/destiny-map/charts/ChartReading', () => ({ ChartReading: () => null }))
vi.mock('@/components/destiny-map/charts/atoms/CrossRefTable', () => ({ CrossRefTable: () => null }))
vi.mock('@/components/destiny-map/charts/atoms/PillarDrawer', () => ({ PillarDrawer: () => null }))

import ChartModal from '@/components/destiny-map/charts/ChartModal'

function renderOpen() {
  return render(<ChartModal open onClose={() => {}} saju={{}} astro={{}} lang="ko" />)
}

describe('ChartModal ghost-tap 가드', () => {
  beforeEach(() => {
    push.mockClear()
    vi.useFakeTimers()
  })

  it('연 직후 캘린더 버튼 클릭은 무시된다 (navigate 안 함)', () => {
    const { getByText } = renderOpen()
    const calBtn = getByText(/캘린더에서/).closest('button')!
    fireEvent.click(calBtn)
    expect(push).not.toHaveBeenCalled() // armed=false → 여는 탭 무력화
    vi.useRealTimers()
  })

  it('320ms 경과 후엔 캘린더 버튼이 정상 동작한다', () => {
    const { getByText } = renderOpen()
    act(() => {
      vi.advanceTimersByTime(350)
    })
    const calBtn = getByText(/캘린더에서/).closest('button')!
    fireEvent.click(calBtn)
    expect(push).toHaveBeenCalledWith('/calendar')
    vi.useRealTimers()
  })
})

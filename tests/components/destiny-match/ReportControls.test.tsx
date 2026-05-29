import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// next/navigation (MatchModal uses useRouter)
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// next/image -> plain img for happy-dom
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return React.createElement('img', props as Record<string, unknown>)
  },
}))

// logger (client import inside ReportModal)
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { ReportModal } from '@/components/destiny-match/ReportModal'
import { SwipeCard } from '@/components/destiny-match/SwipeCard'
import { MatchModal } from '@/components/destiny-match/MatchModal'
import { pickDMCopy } from '@/components/destiny-match/destiny-match-i18n'
import type { DiscoverCard } from '@/components/destiny-match/types'

const copy = pickDMCopy('en')

const mockCard: DiscoverCard = {
  id: 'profile-1',
  userId: 'user-456',
  displayName: 'Alex',
  bio: 'Hello there',
  occupation: 'Designer',
  photos: [],
  city: 'Seoul',
  interests: ['hiking', 'coffee'],
  verified: true,
  age: 28,
  distance: 3,
  zodiacSign: 'Leo',
  sajuElement: 'Fire',
  personalityType: null,
  personalityName: null,
  compatibilityScore: 88,
  compatibilityGrade: 'A',
  compatibilityEmoji: '🔥',
  compatibilityTagline: 'Great match',
  synergy: { saju: null, astro: null },
  lastActiveAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn()
})

describe('ReportModal (shared)', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ReportModal copy={copy} open={false} reportedUserId="user-456" reportedName="Alex" onClose={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when reportedUserId is null', () => {
    const { container } = render(
      <ReportModal copy={copy} open={true} reportedUserId={null} reportedName="Alex" onClose={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders all report categories when open', () => {
    render(
      <ReportModal copy={copy} open={true} reportedUserId="user-456" reportedName="Alex" onClose={vi.fn()} />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(copy.reportCategoryInappropriate)).toBeInTheDocument()
    expect(screen.getByText(copy.reportCategorySpam)).toBeInTheDocument()
    expect(screen.getByText(copy.reportCategoryFake)).toBeInTheDocument()
    expect(screen.getByText(copy.reportCategoryHarassment)).toBeInTheDocument()
    expect(screen.getByText(copy.reportCategoryOther)).toBeInTheDocument()
  })

  it('POSTs the selected category and description to the report API', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    })

    render(
      <ReportModal copy={copy} open={true} reportedUserId="user-456" reportedName="Alex" onClose={vi.fn()} />
    )

    fireEvent.click(screen.getByDisplayValue('spam'))
    fireEvent.change(screen.getByPlaceholderText(copy.reportDescriptionPlaceholder), {
      target: { value: '  bad actor  ' },
    })
    fireEvent.click(screen.getByText(copy.reportSubmit))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/destiny-match/report',
        expect.objectContaining({ method: 'POST' })
      )
    })

    const body = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
    )
    expect(body).toEqual({
      reportedUserId: 'user-456',
      category: 'spam',
      description: 'bad actor',
    })
  })

  it('omits description when blank', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    })

    render(
      <ReportModal copy={copy} open={true} reportedUserId="user-456" reportedName="Alex" onClose={vi.fn()} />
    )
    fireEvent.click(screen.getByText(copy.reportSubmit))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const body = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
    )
    expect(body.description).toBeUndefined()
    expect(body.category).toBe('inappropriate')
  })

  it('shows success feedback after a successful report', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    })

    render(
      <ReportModal copy={copy} open={true} reportedUserId="user-456" reportedName="Alex" onClose={vi.fn()} />
    )
    fireEvent.click(screen.getByText(copy.reportSubmit))

    await waitFor(() => {
      expect(screen.getByText(copy.reportSuccess)).toBeInTheDocument()
    })
  })

  it('shows the already-reported message on a 400 response', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'dup' }),
    })

    render(
      <ReportModal copy={copy} open={true} reportedUserId="user-456" reportedName="Alex" onClose={vi.fn()} />
    )
    fireEvent.click(screen.getByText(copy.reportSubmit))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(copy.reportAlready)
    })
  })

  it('shows a generic error on network failure', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'))

    render(
      <ReportModal copy={copy} open={true} reportedUserId="user-456" reportedName="Alex" onClose={vi.fn()} />
    )
    fireEvent.click(screen.getByText(copy.reportSubmit))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(copy.reportError)
    })
  })

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn()
    render(
      <ReportModal copy={copy} open={true} reportedUserId="user-456" reportedName="Alex" onClose={onClose} />
    )
    fireEvent.click(screen.getByText(copy.reportCancel))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('SwipeCard report entry points (swipe + profile)', () => {
  it('renders a report flag button on the top card and fires onReport (swipe)', () => {
    const onReport = vi.fn()
    render(
      <SwipeCard
        card={mockCard}
        copy={copy}
        isTop={true}
        depth={0}
        onDecide={vi.fn()}
        onReport={onReport}
      />
    )
    const flagBtn = screen.getByLabelText(copy.report)
    fireEvent.click(flagBtn)
    expect(onReport).toHaveBeenCalledWith(mockCard)
  })

  it('does not render the report flag on non-top cards', () => {
    render(
      <SwipeCard
        card={mockCard}
        copy={copy}
        isTop={false}
        depth={1}
        onDecide={vi.fn()}
        onReport={vi.fn()}
      />
    )
    expect(screen.queryByLabelText(copy.report)).not.toBeInTheDocument()
  })

  it('reveals a report action inside the expanded profile detail (profile)', () => {
    const onReport = vi.fn()
    render(
      <SwipeCard
        card={mockCard}
        copy={copy}
        isTop={true}
        depth={0}
        onDecide={vi.fn()}
        onReport={onReport}
      />
    )
    // Expand profile details
    fireEvent.click(screen.getByText(copy.profileDetails))
    // Now there are two "Report" affordances (flag aria-label + detail text button)
    const reportButtons = screen.getAllByText(copy.report)
    fireEvent.click(reportButtons[reportButtons.length - 1])
    expect(onReport).toHaveBeenCalledWith(mockCard)
  })
})

describe('MatchModal report entry point (chat)', () => {
  it('renders a report button and opens the report modal for the matched partner', () => {
    render(
      <MatchModal
        copy={copy}
        open={true}
        otherName="Alex"
        otherPhoto={null}
        otherUserId="user-456"
        connectionId="conn-1"
        onClose={vi.fn()}
      />
    )
    // The match modal report button
    const reportBtn = screen.getByLabelText(copy.report)
    fireEvent.click(reportBtn)
    // Report dialog appears
    expect(screen.getByRole('dialog', { name: copy.reportTitle })).toBeInTheDocument()
  })

  it('hides the report button when partner userId is unknown', () => {
    render(
      <MatchModal
        copy={copy}
        open={true}
        otherName="Alex"
        otherPhoto={null}
        otherUserId={null}
        connectionId="conn-1"
        onClose={vi.fn()}
      />
    )
    expect(screen.queryByLabelText(copy.report)).not.toBeInTheDocument()
  })
})

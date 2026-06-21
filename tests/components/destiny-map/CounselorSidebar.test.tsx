import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSession } from 'next-auth/react'
import CounselorSidebar from '@/components/destiny-map/CounselorSidebar'

// ---- Mocks ----
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({
    // The component calls t(key, fallback) — return the fallback so assertions
    // can match the English defaults baked into the component.
    t: (_key: string, fallback?: string) => fallback ?? _key,
    locale: 'en',
  }),
}))

const apiFetchMock = vi.fn()
vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}))

vi.mock('@/components/branding/HexDPLogo', () => ({
  default: () => <span data-testid="hex-logo" />,
}))

// PromptModal: render a minimal confirm dialog driven by `open` so we can test
// the delete confirmation flow.
vi.mock('@/components/ui/PromptModal', () => ({
  default: (props: {
    open: boolean
    onConfirm: () => void
    onClose: () => void
    confirmLabel: string
  }) =>
    props.open ? (
      <div data-testid="prompt-modal">
        <button data-testid="modal-confirm" onClick={() => props.onConfirm()}>
          {props.confirmLabel}
        </button>
        <button data-testid="modal-cancel" onClick={() => props.onClose()}>
          cancel
        </button>
      </div>
    ) : null,
}))

const mockUseSession = useSession as ReturnType<typeof vi.fn>

const SESSIONS = [
  { id: 's1', title: 'Career talk', updatedAt: '2026-06-20T10:00:00.000Z' },
  { id: 's2', title: 'Love reading', updatedAt: '2026-06-19T10:00:00.000Z' },
]

function authed() {
  mockUseSession.mockReturnValue({
    status: 'authenticated',
    data: { user: { email: 'me@test.com' } },
    update: vi.fn(),
  })
}

function unauthed() {
  mockUseSession.mockReturnValue({
    status: 'unauthenticated',
    data: null,
    update: vi.fn(),
  })
}

function mockListResponse(sessions: unknown[], ok = true, status = 200) {
  apiFetchMock.mockResolvedValue({
    ok,
    status,
    json: async () => ({ sessions }),
  })
}

const baseProps = {
  open: true,
  onClose: vi.fn(),
  onNewChat: vi.fn(),
}

describe('CounselorSidebar', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    baseProps.onClose = vi.fn()
    baseProps.onNewChat = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('unauthenticated', () => {
    beforeEach(unauthed)

    it('shows a sign-in prompt instead of the chat list', () => {
      render(<CounselorSidebar {...baseProps} />)
      expect(screen.getByText('Sign in to see past chats.')).toBeInTheDocument()
    })

    it('does not fetch the session list when not authenticated', () => {
      render(<CounselorSidebar {...baseProps} />)
      expect(apiFetchMock).not.toHaveBeenCalled()
    })

    it('renders a Sign in button in the footer', () => {
      render(<CounselorSidebar {...baseProps} />)
      expect(screen.getByText('Sign in')).toBeInTheDocument()
    })
  })

  describe('authenticated list rendering', () => {
    beforeEach(authed)

    it('fetches the destiny session list on mount', async () => {
      mockListResponse(SESSIONS)
      render(<CounselorSidebar {...baseProps} />)
      await waitFor(() => {
        expect(apiFetchMock).toHaveBeenCalledWith(
          '/api/counselor/session/list?limit=30&type=destiny'
        )
      })
    })

    it('scopes the list to compat when serviceType is compat', async () => {
      mockListResponse(SESSIONS)
      render(<CounselorSidebar {...baseProps} serviceType="compat" />)
      await waitFor(() => {
        expect(apiFetchMock).toHaveBeenCalledWith(
          '/api/counselor/session/list?limit=30&type=compat'
        )
      })
    })

    it('renders fetched sessions as rows', async () => {
      mockListResponse(SESSIONS)
      render(<CounselorSidebar {...baseProps} />)
      expect(await screen.findByText('Career talk')).toBeInTheDocument()
      expect(screen.getByText('Love reading')).toBeInTheDocument()
    })

    it('shows the empty state when no sessions exist', async () => {
      mockListResponse([])
      render(<CounselorSidebar {...baseProps} />)
      expect(await screen.findByText('아직 저장된 채팅이 없어요.')).toBeInTheDocument()
    })

    it('renders the Sign out button with the user email', async () => {
      mockListResponse([])
      render(<CounselorSidebar {...baseProps} />)
      await waitFor(() => {
        expect(screen.getByText(/Sign out/)).toBeInTheDocument()
        expect(screen.getByText(/me@test\.com/)).toBeInTheDocument()
      })
    })

    it('links each session row to the destiny counselor path', async () => {
      mockListResponse(SESSIONS)
      render(<CounselorSidebar {...baseProps} />)
      const link = await screen.findByText('Career talk')
      const anchor = link.closest('a')
      expect(anchor).toHaveAttribute('href', '/destiny-counselor?session=s1')
    })

    it('honors a custom sessionHrefBase', async () => {
      mockListResponse(SESSIONS)
      render(<CounselorSidebar {...baseProps} sessionHrefBase="/custom/base" />)
      const link = await screen.findByText('Career talk')
      expect(link.closest('a')).toHaveAttribute('href', '/custom/base?session=s1')
    })

    it('falls back to "Untitled chat" when title and preview are empty', async () => {
      mockListResponse([{ id: 'x', title: '', preview: '', updatedAt: null }])
      render(<CounselorSidebar {...baseProps} />)
      expect(await screen.findByText('Untitled chat')).toBeInTheDocument()
    })
  })

  describe('subtitles', () => {
    beforeEach(authed)

    it('shows the profile name as subtitle for destiny sessions', async () => {
      mockListResponse([{ id: 's1', title: 'Talk', meta: { profile: { name: 'Jun' } } }])
      render(<CounselorSidebar {...baseProps} />)
      expect(await screen.findByText('Jun')).toBeInTheDocument()
    })

    it('shows "A ↔ B" subtitle for compat sessions with two persons', async () => {
      mockListResponse([
        { id: 's1', title: 'Talk', meta: { persons: [{ name: 'Jun' }, { name: 'Yuna' }] } },
      ])
      render(<CounselorSidebar {...baseProps} serviceType="compat" />)
      expect(await screen.findByText('Jun ↔ Yuna')).toBeInTheDocument()
    })
  })

  describe('new chat + close', () => {
    beforeEach(authed)

    it('calls onNewChat and onClose when the New chat button is clicked', async () => {
      mockListResponse([])
      render(<CounselorSidebar {...baseProps} />)
      await screen.findByText('아직 저장된 채팅이 없어요.')
      fireEvent.click(screen.getByText('New chat'))
      expect(baseProps.onNewChat).toHaveBeenCalledTimes(1)
      expect(baseProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when the close button is clicked', async () => {
      mockListResponse([])
      render(<CounselorSidebar {...baseProps} />)
      await screen.findByText('아직 저장된 채팅이 없어요.')
      fireEvent.click(screen.getByLabelText('Close'))
      expect(baseProps.onClose).toHaveBeenCalled()
    })
  })

  describe('rename', () => {
    beforeEach(authed)

    it('shows a rename input when the rename action is clicked', async () => {
      mockListResponse(SESSIONS)
      render(<CounselorSidebar {...baseProps} />)
      await screen.findByText('Career talk')
      const renameButtons = screen.getAllByLabelText('Rename')
      fireEvent.click(renameButtons[0])
      const input = screen.getByDisplayValue('Career talk')
      expect(input).toBeInTheDocument()
    })

    it('commits a rename via PATCH and updates the row', async () => {
      mockListResponse(SESSIONS)
      render(<CounselorSidebar {...baseProps} />)
      await screen.findByText('Career talk')
      fireEvent.click(screen.getAllByLabelText('Rename')[0])
      const input = screen.getByDisplayValue('Career talk')

      // Next apiFetch call (the PATCH) resolves ok.
      apiFetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })

      fireEvent.change(input, { target: { value: 'Renamed' } })
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' })
      })

      await waitFor(() => {
        expect(apiFetchMock).toHaveBeenCalledWith(
          '/api/counselor/session/list',
          expect.objectContaining({ method: 'PATCH' })
        )
      })
      expect(await screen.findByText('Renamed')).toBeInTheDocument()
    })

    it('cancels rename on Escape without calling PATCH', async () => {
      mockListResponse(SESSIONS)
      render(<CounselorSidebar {...baseProps} />)
      await screen.findByText('Career talk')
      fireEvent.click(screen.getAllByLabelText('Rename')[0])
      const input = screen.getByDisplayValue('Career talk')
      apiFetchMock.mockClear()
      fireEvent.keyDown(input, { key: 'Escape' })
      expect(screen.queryByDisplayValue('Career talk')).not.toBeInTheDocument()
      expect(apiFetchMock).not.toHaveBeenCalled()
      // Original title still shown.
      expect(screen.getByText('Career talk')).toBeInTheDocument()
    })

    it('reports a rename failure to onActionError', async () => {
      mockListResponse(SESSIONS)
      const onActionError = vi.fn()
      render(<CounselorSidebar {...baseProps} onActionError={onActionError} />)
      await screen.findByText('Career talk')
      fireEvent.click(screen.getAllByLabelText('Rename')[0])
      const input = screen.getByDisplayValue('Career talk')
      apiFetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      fireEvent.change(input, { target: { value: 'Renamed' } })
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' })
      })
      await waitFor(() => {
        expect(onActionError).toHaveBeenCalledWith({ kind: 'rename', status: 401 })
      })
    })
  })

  describe('delete', () => {
    beforeEach(authed)

    it('opens the confirm modal when delete action is clicked', async () => {
      mockListResponse(SESSIONS)
      render(<CounselorSidebar {...baseProps} />)
      await screen.findByText('Career talk')
      fireEvent.click(screen.getAllByLabelText('Delete')[0])
      expect(screen.getByTestId('prompt-modal')).toBeInTheDocument()
    })

    it('does not delete when the modal is cancelled', async () => {
      mockListResponse(SESSIONS)
      render(<CounselorSidebar {...baseProps} />)
      await screen.findByText('Career talk')
      fireEvent.click(screen.getAllByLabelText('Delete')[0])
      apiFetchMock.mockClear()
      fireEvent.click(screen.getByTestId('modal-cancel'))
      expect(screen.queryByTestId('prompt-modal')).not.toBeInTheDocument()
      expect(apiFetchMock).not.toHaveBeenCalled()
    })

    it('DELETEs the session and removes the row on confirm', async () => {
      mockListResponse(SESSIONS)
      render(<CounselorSidebar {...baseProps} />)
      await screen.findByText('Career talk')
      fireEvent.click(screen.getAllByLabelText('Delete')[0])
      apiFetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await act(async () => {
        fireEvent.click(screen.getByTestId('modal-confirm'))
      })
      await waitFor(() => {
        expect(apiFetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/api/counselor/session/list?sessionId=s1'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })
      await waitFor(() => {
        expect(screen.queryByText('Career talk')).not.toBeInTheDocument()
      })
    })

    it('reports a delete failure to onActionError', async () => {
      mockListResponse(SESSIONS)
      const onActionError = vi.fn()
      render(<CounselorSidebar {...baseProps} onActionError={onActionError} />)
      await screen.findByText('Career talk')
      fireEvent.click(screen.getAllByLabelText('Delete')[0])
      apiFetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      await act(async () => {
        fireEvent.click(screen.getByTestId('modal-confirm'))
      })
      await waitFor(() => {
        expect(onActionError).toHaveBeenCalledWith({ kind: 'delete', status: 500 })
      })
    })
  })

  describe('grouping + optional slots', () => {
    beforeEach(authed)

    it('renders grouped buckets when enableGrouping is set', async () => {
      mockListResponse([{ id: 'a', title: 'Old chat', updatedAt: '2000-01-01T00:00:00.000Z' }])
      render(<CounselorSidebar {...baseProps} enableGrouping />)
      // The single old session lands in the "Older" bucket.
      expect(await screen.findByText('Older')).toBeInTheDocument()
      expect(screen.getByText('Old chat')).toBeInTheDocument()
    })

    it('renders the footerSlot content', async () => {
      mockListResponse([])
      render(<CounselorSidebar {...baseProps} footerSlot={<div data-testid="footer-extra" />} />)
      await screen.findByText('아직 저장된 채팅이 없어요.')
      expect(screen.getByTestId('footer-extra')).toBeInTheDocument()
    })

    it('injects the optimistic active session at the top of the list', async () => {
      mockListResponse([])
      render(
        <CounselorSidebar {...baseProps} activeSessionId="live-1" activeSessionTitle="Live chat" />
      )
      expect(await screen.findByText('Live chat')).toBeInTheDocument()
    })
  })
})

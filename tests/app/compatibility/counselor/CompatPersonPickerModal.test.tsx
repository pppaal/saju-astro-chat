import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

/**
 * 궁합 상담사 인라인 인물 picker 모달. 두 카드(PersonCard) + 분석 시작(SubmitButton).
 * 무거운 데이터 hook / 자식 컴포넌트는 mock 하고, picker 자체 로직만 검증:
 *   - title/subtitle 렌더, 두 PersonCard 렌더
 *   - submit → validate → onSubmit(personsData)
 *   - validate 실패 시 error 표시 + onSubmit 미호출
 *   - 로그인 시 dropdown 옵션 collect (/api/me/profile, /api/me/circle)
 */

// --- mocks (must precede component import) ---
const mockPersons = [
  {
    name: '준영',
    date: '1990-01-01',
    time: '12:00',
    timeUnknown: false,
    gender: 'M' as const,
    relation: 'self',
    cityQuery: '서울',
    lat: 37.5,
    lon: 127,
    timeZone: 'Asia/Seoul',
  },
  {
    name: '민지',
    date: '1992-05-05',
    time: '09:30',
    timeUnknown: false,
    gender: 'F' as const,
    relation: 'lover',
    cityQuery: '부산',
    lat: 35.1,
    lon: 129,
    timeZone: 'Asia/Seoul',
  },
]

const setPersons = vi.fn()
const updatePerson = vi.fn()
const fillFromCircle = vi.fn()

vi.mock('@/hooks/useCompatibilityForm', () => ({
  useCompatibilityForm: () => ({
    count: 2,
    persons: mockPersons,
    setPersons,
    updatePerson,
    fillFromCircle,
  }),
}))

vi.mock('@/hooks/useCityAutocomplete', () => ({
  useCityAutocomplete: vi.fn(),
}))

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}))

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    locale: 'ko',
  }),
}))

vi.mock('@/app/(main)/birthInfoStorage', () => ({
  getStoredBirthInfo: vi.fn(() => null),
  normGender: (g: unknown) => (g === 'M' ? 'male' : g === 'F' ? 'female' : ''),
  timeToState: (raw: unknown) => ({ birthTime: String(raw ?? ''), timeUnknown: false }),
}))

// validatePersons controllable per-test via a mutable holder
const validateState: { error: string | null } = { error: null }
vi.mock('@/app/compatibility/validatePersons', () => ({
  validatePersons: vi.fn(() => validateState.error),
}))

// Lightweight stand-ins for the heavy form components.
vi.mock('@/app/compatibility/components', () => ({
  PersonCard: ({
    index,
    showLoadDropdown,
    onToggleLoadDropdown,
    onLoadOption,
    loadOptions,
  }: {
    index: number
    showLoadDropdown: boolean
    onToggleLoadDropdown: () => void
    onLoadOption: (idx: number, opt: unknown) => void
    loadOptions: Array<{ key: string; label: string }>
  }) => (
    <div data-testid={`person-card-${index}`} data-circle-dropdown="">
      <span>card-{index}</span>
      <button type="button" onClick={onToggleLoadDropdown}>
        toggle-load-{index}
      </button>
      {showLoadDropdown && (
        <ul>
          {loadOptions.map((o) => (
            <li key={o.key}>
              <button type="button" onClick={() => onLoadOption(index, o)}>
                load-{o.key}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  ),
  SubmitButton: ({ isLoading, t }: { isLoading: boolean; t: (k: string, f: string) => string }) => (
    <button type="submit">{isLoading ? 'loading' : t('submit', 'Analyze')}</button>
  ),
}))

import { useSession } from 'next-auth/react'
import { CompatPersonPickerModal } from '@/app/compatibility/counselor/CompatPersonPickerModal'

const mockUseSession = useSession as unknown as ReturnType<typeof vi.fn>

describe('CompatPersonPickerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    validateState.error = null
    mockUseSession.mockReturnValue({ status: 'unauthenticated', data: null, update: vi.fn() })
    global.fetch = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('renders a dialog with the default ko title (KO_FALLBACKS)', () => {
      render(<CompatPersonPickerModal onSubmit={vi.fn()} />)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      // ko locale → compatT applies KO_FALLBACKS for analysisTitle
      expect(screen.getByText('궁합 분석')).toBeInTheDocument()
    })

    it('renders a custom title + subtitle when provided', () => {
      render(
        <CompatPersonPickerModal
          onSubmit={vi.fn()}
          title="다른 관계로"
          subtitle="새 상대를 골라요"
        />
      )
      expect(screen.getByText('다른 관계로')).toBeInTheDocument()
      expect(screen.getByText('새 상대를 골라요')).toBeInTheDocument()
    })

    it('renders two person cards', () => {
      render(<CompatPersonPickerModal onSubmit={vi.fn()} />)
      expect(screen.getByTestId('person-card-0')).toBeInTheDocument()
      expect(screen.getByTestId('person-card-1')).toBeInTheDocument()
    })

    it('renders the submit button', () => {
      render(<CompatPersonPickerModal onSubmit={vi.fn()} />)
      expect(screen.getByRole('button', { name: 'Analyze' })).toBeInTheDocument()
    })
  })

  describe('submit flow', () => {
    it('calls onSubmit with mapped person data when validation passes', () => {
      const onSubmit = vi.fn()
      render(<CompatPersonPickerModal onSubmit={onSubmit} />)
      fireEvent.click(screen.getByRole('button', { name: 'Analyze' }))
      expect(onSubmit).toHaveBeenCalledTimes(1)
      const data = onSubmit.mock.calls[0][0]
      expect(data).toHaveLength(2)
      expect(data[0]).toMatchObject({
        name: '준영',
        date: '1990-01-01',
        time: '12:00',
        city: '서울',
        latitude: 37.5,
        longitude: 127,
        timeZone: 'Asia/Seoul',
        gender: 'M',
      })
      expect(data[1]).toMatchObject({ name: '민지', gender: 'F', relation: 'lover' })
    })

    it('shows the validation error and does not call onSubmit when invalid', () => {
      validateState.error = '생년월일을 입력해 주세요'
      const onSubmit = vi.fn()
      render(<CompatPersonPickerModal onSubmit={onSubmit} />)
      fireEvent.click(screen.getByRole('button', { name: 'Analyze' }))
      expect(screen.getByText('생년월일을 입력해 주세요')).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('load dropdown (authenticated)', () => {
    it('does not collect options for an unauthenticated user', async () => {
      render(<CompatPersonPickerModal onSubmit={vi.fn()} />)
      // toggle dropdown open — no options collected, so no load buttons
      fireEvent.click(screen.getByRole('button', { name: 'toggle-load-0' }))
      expect(screen.queryByText(/^load-/)).not.toBeInTheDocument()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('collects profile + circle options when authenticated', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { name: 'me' } },
        update: vi.fn(),
      })
      global.fetch = vi.fn((url: string) => {
        if (String(url).includes('/api/me/profile')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ user: { name: '나', birthDate: '1990-01-01', gender: 'M' } }),
          })
        }
        if (String(url).includes('/api/me/circle')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: { people: [{ id: 'p1', name: '친구', birthDate: '1991-02-02' }] },
            }),
          })
        }
        return Promise.resolve({ ok: false, json: async () => ({}) })
      }) as unknown as typeof fetch

      render(<CompatPersonPickerModal onSubmit={vi.fn()} />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())

      fireEvent.click(screen.getByRole('button', { name: 'toggle-load-0' }))
      // me + circle person should both be offered as load options
      expect(await screen.findByText('load-me')).toBeInTheDocument()
      expect(screen.getByText('load-circle-p1')).toBeInTheDocument()
    })

    it('applies a chosen load option via setPersons', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { name: 'me' } },
        update: vi.fn(),
      })
      global.fetch = vi.fn((url: string) => {
        if (String(url).includes('/api/me/profile')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ user: { name: '나', birthDate: '1990-01-01', gender: 'M' } }),
          })
        }
        return Promise.resolve({ ok: true, json: async () => ({ data: { people: [] } }) })
      }) as unknown as typeof fetch

      render(<CompatPersonPickerModal onSubmit={vi.fn()} />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      fireEvent.click(screen.getByRole('button', { name: 'toggle-load-0' }))
      fireEvent.click(await screen.findByText('load-me'))
      expect(setPersons).toHaveBeenCalled()
    })
  })
})

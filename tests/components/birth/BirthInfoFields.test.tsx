import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// useCitySearch reaches out to searchCities (16MB JSON via fetch) + tz-lookup;
// stub it so the form renders deterministically and we can drive suggestions.
const cityState = vi.hoisted(() => ({
  suggestions: [] as any[],
  openSug: false,
}))
const setOpenSug = vi.fn((v: boolean) => {
  cityState.openSug = v
})
const handleCityInputChange = vi.fn()
const handleCitySelect = vi.fn((hit: any) => ({
  ...hit,
  timezone: hit.timezone ?? 'Asia/Seoul',
}))

vi.mock('@/hooks/calendar/useCitySearch', () => ({
  useCitySearch: () => ({
    suggestions: cityState.suggestions,
    selectedCity: null,
    openSug: cityState.openSug,
    isUserTyping: false,
    cityErr: null,
    setOpenSug,
    setSelectedCity: vi.fn(),
    handleCityInputChange,
    handleCitySelect,
  }),
}))

vi.mock('@/lib/cities/formatter', () => ({
  formatCityForDropdown: (name: string, country: string) => `${name}, ${country}`,
}))

import { BirthInfoFields } from '@/components/birth/BirthInfoFields'

function renderFields(overrides: Partial<React.ComponentProps<typeof BirthInfoFields>> = {}) {
  const onChange = vi.fn()
  const props: React.ComponentProps<typeof BirthInfoFields> = {
    locale: 'ko',
    birthDate: '',
    birthTime: '',
    timeUnknown: false,
    gender: '',
    city: '',
    onChange,
    ...overrides,
  }
  const utils = render(<BirthInfoFields {...props} />)
  return { onChange, ...utils }
}

describe('BirthInfoFields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cityState.suggestions = []
    cityState.openSug = false
  })

  it('renders Korean labels by default', () => {
    renderFields()
    expect(screen.getByText('생년월일')).toBeInTheDocument()
    expect(screen.getByText('출생 시간')).toBeInTheDocument()
    expect(screen.getByText('성별')).toBeInTheDocument()
    expect(screen.getByText('출생 도시 (선택)')).toBeInTheDocument()
  })

  it('renders English labels when locale=en', () => {
    renderFields({ locale: 'en' })
    expect(screen.getByText('Birth date')).toBeInTheDocument()
    expect(screen.getByText('Birth time')).toBeInTheDocument()
    expect(screen.getByText('Gender')).toBeInTheDocument()
  })

  it('renders the three date selects with year/month/day options', () => {
    renderFields()
    expect(screen.getByLabelText('년')).toBeInTheDocument()
    expect(screen.getByLabelText('월')).toBeInTheDocument()
    expect(screen.getByLabelText('일')).toBeInTheDocument()
  })

  it('emits an ISO birthDate only once year, month and day are all selected', () => {
    const { onChange } = renderFields()
    fireEvent.change(screen.getByLabelText('년'), { target: { value: '1990' } })
    // Year alone → emits '' (partial)
    expect(onChange).toHaveBeenCalledWith({ birthDate: '' })

    onChange.mockClear()
    fireEvent.change(screen.getByLabelText('월'), { target: { value: '5' } })
    expect(onChange).toHaveBeenCalledWith({ birthDate: '' })
  })

  it('emits a full ISO date once all three parts are picked', () => {
    // Drive parent value so the controlled selects keep prior parts.
    let value = ''
    const onChange = vi.fn((patch: any) => {
      if (patch.birthDate !== undefined) value = patch.birthDate
    })
    const { rerender } = render(
      <BirthInfoFields
        locale="ko"
        birthDate={value}
        birthTime=""
        timeUnknown={false}
        gender=""
        city=""
        onChange={onChange}
      />
    )
    fireEvent.change(screen.getByLabelText('년'), { target: { value: '1990' } })
    fireEvent.change(screen.getByLabelText('월'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('일'), { target: { value: '15' } })
    rerender(
      <BirthInfoFields
        locale="ko"
        birthDate={value}
        birthTime=""
        timeUnknown={false}
        gender=""
        city=""
        onChange={onChange}
      />
    )
    expect(onChange).toHaveBeenCalledWith({ birthDate: '1990-05-15' })
  })

  it('hydrates the date selects from an incoming ISO birthDate value', () => {
    renderFields({ birthDate: '1988-12-03' })
    expect((screen.getByLabelText('년') as HTMLSelectElement).value).toBe('1988')
    expect((screen.getByLabelText('월') as HTMLSelectElement).value).toBe('12')
    expect((screen.getByLabelText('일') as HTMLSelectElement).value).toBe('3')
  })

  it('emits birthTime and clears timeUnknown when a time is typed', () => {
    const { onChange } = renderFields()
    const time = document.getElementById('birth-time') as HTMLInputElement
    fireEvent.change(time, { target: { value: '09:30' } })
    expect(onChange).toHaveBeenCalledWith({ birthTime: '09:30', timeUnknown: false })
  })

  it('disables the time input when timeUnknown is true', () => {
    renderFields({ timeUnknown: true })
    const time = document.getElementById('birth-time') as HTMLInputElement
    expect(time).toBeDisabled()
  })

  it('toggles time-unknown checkbox on and clears birthTime', () => {
    const { onChange } = renderFields({ birthTime: '08:00' })
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith({ timeUnknown: true, birthTime: '' })
  })

  it('toggles time-unknown checkbox off', () => {
    const { onChange } = renderFields({ timeUnknown: true })
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith({ timeUnknown: false })
  })

  it('emits gender selection', () => {
    const { onChange } = renderFields()
    fireEvent.change(screen.getByLabelText('성별'), { target: { value: 'female' } })
    expect(onChange).toHaveBeenCalledWith({ gender: 'female' })
  })

  it('calls onChange with cleared coords and delegates to hook on city typing', () => {
    const { onChange } = renderFields()
    const city = document.getElementById('birth-city') as HTMLInputElement
    fireEvent.change(city, { target: { value: 'Seo' } })
    expect(onChange).toHaveBeenCalledWith({
      city: 'Seo',
      latitude: null,
      longitude: null,
      timeZone: null,
    })
    expect(handleCityInputChange).toHaveBeenCalledWith('Seo')
  })

  it('does not render the city field when showCity is false', () => {
    renderFields({ showCity: false })
    expect(document.getElementById('birth-city')).toBeNull()
  })

  it('shows the timezone warning when city is filled but latitude is null', () => {
    renderFields({ city: 'Seoul', latitude: null })
    expect(screen.getByText(/목록에서 도시를 선택해 주세요/)).toBeInTheDocument()
  })

  it('does not show the warning when latitude is undefined (untracked)', () => {
    renderFields({ city: 'Seoul', latitude: undefined })
    expect(screen.queryByText(/목록에서 도시를 선택/)).not.toBeInTheDocument()
  })

  it('renders city suggestions and fires selection', async () => {
    cityState.suggestions = [
      { name: 'Seoul', country: 'KR', lat: 37.5, lon: 127, displayKr: '서울, 대한민국' },
    ]
    cityState.openSug = true
    const { onChange } = renderFields({ city: 'Seo', latitude: null })

    const option = await screen.findByRole('button', { name: '서울, 대한민국' })
    fireEvent.click(option)
    expect(handleCitySelect).toHaveBeenCalled()
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: 37.5, longitude: 127 })
      )
    })
    expect(setOpenSug).toHaveBeenCalledWith(false)
  })

  it('respects a custom idPrefix', () => {
    renderFields({ idPrefix: 'profile' })
    expect(document.getElementById('profile-time')).toBeInTheDocument()
    expect(document.getElementById('profile-gender')).toBeInTheDocument()
  })
})

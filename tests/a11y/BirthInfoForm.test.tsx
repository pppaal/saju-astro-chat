/**
 * Accessibility Tests for UnifiedBirthForm Component
 * Tests birth info form for WCAG compliance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { axe } from './axe-helper'
import React from 'react'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
}))

// Mock DateTimePicker
vi.mock('@/components/ui/DateTimePicker', () => ({
  default: ({
    label,
    value,
    onChange,
    required,
    locale,
  }: {
    label: string
    value: string
    onChange: (v: string) => void
    required?: boolean
    locale?: string
  }) => (
    <div>
      <label htmlFor="birth-date">
        {label}
        {required && ' *'}
      </label>
      <input
        id="birth-date"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-required={required}
      />
    </div>
  ),
}))

// Mock TimePicker
vi.mock('@/components/ui/TimePicker', () => ({
  default: ({
    label,
    value,
    onChange,
    disabled,
    required,
  }: {
    label: string
    value: string
    onChange: (v: string) => void
    disabled?: boolean
    required?: boolean
    locale?: string
  }) => (
    <div>
      <label htmlFor="birth-time">{label}</label>
      <input
        id="birth-time"
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      />
    </div>
  ),
}))

// Mock CitySearchField
vi.mock('@/components/common/BirthForm/CitySearchField', () => ({
  CitySearchField: ({
    value,
    onChange,
    locale,
    required,
  }: {
    value: string
    onChange: (v: string) => void
    onCitySelect: (c: unknown) => void
    locale?: string
    required?: boolean
  }) => (
    <div>
      <label htmlFor="birth-city">{locale === 'ko' ? '태어난 도시' : 'Birth City'}</label>
      <input
        id="birth-city"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  ),
}))

// Mock ProfileLoader
vi.mock('@/components/common/BirthForm/ProfileLoader', () => ({
  ProfileLoader: () => <div data-testid="profile-loader">Profile Loader</div>,
}))

// Mock CSS module
vi.mock('@/components/common/BirthForm/UnifiedBirthForm.module.css', () => ({
  default: new Proxy({}, { get: (_, prop) => String(prop) }),
}))

// Mock GenderSelector CSS module
vi.mock('@/components/common/BirthForm/GenderSelector.module.css', () => ({
  default: new Proxy({}, { get: (_, prop) => String(prop) }),
}))

import { UnifiedBirthForm } from '@/components/common/BirthForm/UnifiedBirthForm'

describe('Accessibility: UnifiedBirthForm', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('should have no accessibility violations with all fields visible', async () => {
    const { container } = render(
      <UnifiedBirthForm
        onSubmit={vi.fn()}
        includeCity={true}
        allowTimeUnknown={true}
        showHeader={true}
        includeProfileLoader={false}
      />
    )

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('should have proper labels for date and time inputs', () => {
    render(<UnifiedBirthForm onSubmit={vi.fn()} locale="ko" includeProfileLoader={false} />)

    const dateInput = screen.getByLabelText(/생년월일/)
    expect(dateInput).toBeInTheDocument()

    const timeInput = screen.getByLabelText(/태어난 시간/)
    expect(timeInput).toBeInTheDocument()
  })

  it('should have accessible gender selector with role="group"', () => {
    const { container } = render(
      <UnifiedBirthForm onSubmit={vi.fn()} locale="ko" includeProfileLoader={false} />
    )

    const genderGroup = container.querySelector('[role="group"]')
    expect(genderGroup).toBeInTheDocument()
    expect(genderGroup).toHaveAttribute('aria-label', '성별')
  })

  it('should have accessible gender buttons with aria-pressed', () => {
    render(<UnifiedBirthForm onSubmit={vi.fn()} locale="ko" includeProfileLoader={false} />)

    const maleButton = screen.getByRole('button', { name: '남성' })
    const femaleButton = screen.getByRole('button', { name: '여성' })

    expect(maleButton).toHaveAttribute('aria-pressed')
    expect(femaleButton).toHaveAttribute('aria-pressed')
  })

  it('should have accessible time-unknown checkbox with label', () => {
    render(
      <UnifiedBirthForm
        onSubmit={vi.fn()}
        locale="ko"
        allowTimeUnknown={true}
        includeProfileLoader={false}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()

    // Checkbox should have associated text
    const label = checkbox.closest('label')
    expect(label).toBeInTheDocument()
    expect(label?.textContent).toContain('출생 시간을 모름')
  })

  it('should have accessible submit button', () => {
    render(<UnifiedBirthForm onSubmit={vi.fn()} locale="ko" includeProfileLoader={false} />)

    const submitButton = screen.getByRole('button', { name: /시작하기/ })
    expect(submitButton).toBeInTheDocument()
  })

  it('should show validation hint with role="status"', () => {
    const { container } = render(
      <UnifiedBirthForm onSubmit={vi.fn()} locale="ko" includeProfileLoader={false} />
    )

    const hint = container.querySelector('[role="status"]')
    expect(hint).toBeInTheDocument()
    expect(hint?.textContent).toContain('필수 항목')
  })

  it('should have no violations in English locale', async () => {
    const { container } = render(
      <UnifiedBirthForm onSubmit={vi.fn()} locale="en" includeProfileLoader={false} />
    )

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

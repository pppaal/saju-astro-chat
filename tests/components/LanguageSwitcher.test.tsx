import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import LanguageSwitcher from '@/components/LanguageSwitcher/LanguageSwitcher'

const mockSetLocale = vi.fn()
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'common.selectLanguage': 'Select language',
  }
  return translations[key] || key
})

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({
    locale: 'en',
    setLocale: mockSetLocale,
    dir: 'ltr',
    t: mockT,
  }),
  SUPPORTED_LOCALES: ['en', 'ko'],
}))

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders trigger with current language', () => {
    render(<LanguageSwitcher />)
    expect(screen.getByRole('button', { name: /language/i })).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('opens and closes dropdown', () => {
    render(<LanguageSwitcher />)
    const button = screen.getByRole('button', { name: /language/i })
    fireEvent.click(button)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.click(button)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows only supported locale options', () => {
    render(<LanguageSwitcher />)
    fireEvent.click(screen.getByRole('button', { name: /language/i }))
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
    expect(screen.getByRole('option', { name: /english/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /한국어/i })).toBeInTheDocument()
  })

  it('calls setLocale when selecting korean', () => {
    render(<LanguageSwitcher />)
    fireEvent.click(screen.getByRole('button', { name: /language/i }))
    fireEvent.click(screen.getByRole('option', { name: /한국어/i }))
    expect(mockSetLocale).toHaveBeenCalledWith('ko')
  })

  it('closes dropdown after selection', async () => {
    render(<LanguageSwitcher />)
    fireEvent.click(screen.getByRole('button', { name: /language/i }))
    fireEvent.click(screen.getByRole('option', { name: /한국어/i }))
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('supports Escape to close', () => {
    render(<LanguageSwitcher />)
    const button = screen.getByRole('button', { name: /language/i })
    fireEvent.click(button)
    fireEvent.keyDown(button.parentElement!, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'

const replace = vi.fn()
let searchParams = new URLSearchParams()
const getStoredBirthInfo = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => searchParams,
}))

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'ko', setLocale: vi.fn() }),
}))

vi.mock('@/app/(main)/birthInfoStorage', () => ({
  getStoredBirthInfo: () => getStoredBirthInfo(),
}))

vi.mock('@/components/branding/BrandSplash', () => ({
  default: () => <div data-testid="splash" />,
}))

import ReportPage from '@/app/report/page'

const target = () => {
  const url = replace.mock.calls.at(-1)?.[0] as string
  const [path, query] = url.split('?')
  return { url, path, params: new URLSearchParams(query || '') }
}

describe('ReportPage — clicking report goes straight to the report', () => {
  beforeEach(() => {
    cleanup()
    replace.mockClear()
    getStoredBirthInfo.mockReset()
    searchParams = new URLSearchParams()
  })

  it('forwards chip deep-link birth info to the result page', async () => {
    searchParams = new URLSearchParams(
      'birthDate=1990-01-01&birthTime=08:30&gender=F&birthCity=Busan'
    )
    getStoredBirthInfo.mockReturnValue(null)
    render(<ReportPage />)

    await waitFor(() => expect(replace).toHaveBeenCalled())
    const { path, params } = target()
    expect(path).toBe('/destiny-map/result')
    expect(params.get('birthDate')).toBe('1990-01-01')
    expect(params.get('birthTime')).toBe('08:30')
    expect(params.get('gender')).toBe('F')
    expect(params.get('city')).toBe('Busan')
    expect(params.get('theme')).toBe('focus_love')
    expect(params.get('lang')).toBe('ko')
    // coords default to Seoul when the chip omits them
    expect(params.get('latitude')).toBe('37.5665')
    expect(params.get('longitude')).toBe('126.978')
  })

  it('falls back to stored birth info when the URL has none', async () => {
    getStoredBirthInfo.mockReturnValue({
      birthDate: '1985-12-03',
      birthTime: '23:00',
      gender: 'male',
      city: '서울',
    })
    render(<ReportPage />)

    await waitFor(() => expect(replace).toHaveBeenCalled())
    const { path, params } = target()
    expect(path).toBe('/destiny-map/result')
    expect(params.get('birthDate')).toBe('1985-12-03')
    expect(params.get('gender')).toBe('M')
    expect(params.get('birthTime')).toBe('23:00')
  })

  it('bounces to the home modal when there is no birth info at all', async () => {
    getStoredBirthInfo.mockReturnValue(null)
    render(<ReportPage />)

    await waitFor(() => expect(replace).toHaveBeenCalled())
    expect(replace).toHaveBeenCalledWith('/?openBirth=1&next=/report')
  })
})

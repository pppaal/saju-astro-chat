import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock the city search lib + timezone lookup + logger before importing the hook.
vi.mock('@/lib/cities', () => ({
  searchCities: vi.fn(),
}))

vi.mock('tz-lookup', () => ({
  default: vi.fn(() => 'America/New_York'),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { useCitySearch } from '@/hooks/calendar/useCitySearch'
import { searchCities } from '@/lib/cities'
import tzLookup from 'tz-lookup'

const mockedSearch = searchCities as ReturnType<typeof vi.fn>
const mockedTz = tzLookup as unknown as ReturnType<typeof vi.fn>

const DEBOUNCE_MS = 80

const sampleCity = {
  name: 'Seoul',
  country: 'KR',
  lat: 37.5665,
  lon: 126.978,
}

describe('useCitySearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Default fetch mock so the mount prewarm fire-and-forget resolves cleanly.
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({}),
      text: async () => '{}',
    })
    mockedTz.mockReturnValue('America/New_York')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with empty default state', () => {
    const { result } = renderHook(() => useCitySearch('ko'))
    expect(result.current.suggestions).toEqual([])
    expect(result.current.selectedCity).toBeNull()
    expect(result.current.openSug).toBe(false)
    expect(result.current.isUserTyping).toBe(false)
    expect(result.current.cityErr).toBeNull()
  })

  it('does not search for queries shorter than MIN_QUERY_LENGTH', () => {
    const { result } = renderHook(() => useCitySearch('ko'))

    act(() => {
      result.current.handleCityInputChange('S')
    })

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 50)
    })

    expect(mockedSearch).not.toHaveBeenCalled()
    expect(result.current.suggestions).toEqual([])
    expect(result.current.isUserTyping).toBe(false)
  })

  it('trims whitespace and treats short trimmed input as too short', () => {
    const { result } = renderHook(() => useCitySearch('ko'))

    act(() => {
      result.current.handleCityInputChange('  a  ')
    })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 50)
    })

    expect(mockedSearch).not.toHaveBeenCalled()
  })

  it('searches after debounce and populates suggestions on success', async () => {
    mockedSearch.mockResolvedValue([sampleCity])
    const { result } = renderHook(() => useCitySearch('ko'))

    act(() => {
      result.current.handleCityInputChange('Seoul')
    })

    // Before debounce elapses, no search yet.
    expect(mockedSearch).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })

    await waitFor(() => {
      expect(result.current.suggestions).toEqual([sampleCity])
    })
    expect(mockedSearch).toHaveBeenCalledWith('Seoul', { limit: 20 })
    expect(result.current.openSug).toBe(true)
    expect(result.current.isUserTyping).toBe(false)
    expect(result.current.cityErr).toBeNull()
  })

  it('sets an error (ko) when no results are found', async () => {
    mockedSearch.mockResolvedValue([])
    const { result } = renderHook(() => useCitySearch('ko'))

    act(() => {
      result.current.handleCityInputChange('Nowhere')
    })
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })

    await waitFor(() => {
      expect(result.current.cityErr).toBe('도시를 찾을 수 없습니다')
    })
    expect(result.current.suggestions).toEqual([])
  })

  it('sets an English error when no results are found and locale=en', async () => {
    mockedSearch.mockResolvedValue([])
    const { result } = renderHook(() => useCitySearch('en'))

    act(() => {
      result.current.handleCityInputChange('Nowhere')
    })
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })

    await waitFor(() => {
      expect(result.current.cityErr).toBe('City not found')
    })
  })

  it('sets a search-failed error when searchCities rejects (ko)', async () => {
    mockedSearch.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useCitySearch('ko'))

    act(() => {
      result.current.handleCityInputChange('Seoul')
    })
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })

    await waitFor(() => {
      expect(result.current.cityErr).toBe('검색 실패')
    })
    expect(result.current.suggestions).toEqual([])
    expect(result.current.isUserTyping).toBe(false)
  })

  it('sets an English search-failed error when locale=en', async () => {
    mockedSearch.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useCitySearch('en'))

    act(() => {
      result.current.handleCityInputChange('Seoul')
    })
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })

    await waitFor(() => {
      expect(result.current.cityErr).toBe('Search failed')
    })
  })

  it('serves repeated queries from the local cache without re-fetching', async () => {
    mockedSearch.mockResolvedValue([sampleCity])
    const { result } = renderHook(() => useCitySearch('ko'))

    // First query populates the cache.
    act(() => {
      result.current.handleCityInputChange('Seoul')
    })
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })
    await waitFor(() => {
      expect(result.current.suggestions).toEqual([sampleCity])
    })
    expect(mockedSearch).toHaveBeenCalledTimes(1)

    // Clear suggestions by typing something short, then re-type the cached query.
    act(() => {
      result.current.handleCityInputChange('S')
    })

    act(() => {
      result.current.handleCityInputChange('Seoul')
    })

    // Cache hit is synchronous — no new debounce/fetch.
    expect(mockedSearch).toHaveBeenCalledTimes(1)
    expect(result.current.suggestions).toEqual([sampleCity])
    expect(result.current.openSug).toBe(true)
    expect(result.current.isUserTyping).toBe(false)
  })

  it('keeps openSug false when a cached result is empty', async () => {
    mockedSearch.mockResolvedValue([])
    const { result } = renderHook(() => useCitySearch('ko'))

    act(() => {
      result.current.handleCityInputChange('Empty')
    })
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })
    await waitFor(() => {
      expect(result.current.cityErr).toBe('도시를 찾을 수 없습니다')
    })

    // Re-query the now-cached empty result.
    act(() => {
      result.current.handleCityInputChange('S')
    })
    act(() => {
      result.current.handleCityInputChange('Empty')
    })

    expect(result.current.suggestions).toEqual([])
    expect(result.current.openSug).toBe(false)
  })

  it('debounces rapid input, only firing the latest query', async () => {
    mockedSearch.mockResolvedValue([sampleCity])
    const { result } = renderHook(() => useCitySearch('ko'))

    act(() => {
      result.current.handleCityInputChange('Se')
    })
    act(() => {
      vi.advanceTimersByTime(40)
    })
    act(() => {
      result.current.handleCityInputChange('Seo')
    })
    act(() => {
      vi.advanceTimersByTime(40)
    })
    act(() => {
      result.current.handleCityInputChange('Seoul')
    })

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })

    await waitFor(() => {
      expect(mockedSearch).toHaveBeenCalledTimes(1)
    })
    expect(mockedSearch).toHaveBeenCalledWith('Seoul', { limit: 20 })
  })

  it('ignores a stale in-flight response when a newer request supersedes it', async () => {
    // First search resolves slowly; a second search bumps requestId so the
    // first response is discarded.
    let resolveFirst: (v: unknown) => void = () => {}
    const firstPromise = new Promise((res) => {
      resolveFirst = res
    })
    mockedSearch.mockReturnValueOnce(firstPromise)
    mockedSearch.mockResolvedValueOnce([sampleCity])

    const { result } = renderHook(() => useCitySearch('ko'))

    act(() => {
      result.current.handleCityInputChange('Seo')
    })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS) // fires first search (pending)
    })

    act(() => {
      result.current.handleCityInputChange('Seoul')
    })
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS) // fires second search
    })

    // Now resolve the stale first request — it should be ignored.
    await act(async () => {
      resolveFirst([{ ...sampleCity, name: 'StaleCity' }])
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.suggestions).toEqual([sampleCity])
    })
    expect(result.current.suggestions.some((c) => c.name === 'StaleCity')).toBe(false)
  })

  it('clears suggestions and typing state when input becomes too short again', async () => {
    mockedSearch.mockResolvedValue([sampleCity])
    const { result } = renderHook(() => useCitySearch('ko'))

    act(() => {
      result.current.handleCityInputChange('Seoul')
    })
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })
    await waitFor(() => {
      expect(result.current.suggestions).toEqual([sampleCity])
    })

    act(() => {
      result.current.handleCityInputChange('S')
    })

    expect(result.current.suggestions).toEqual([])
    expect(result.current.isUserTyping).toBe(false)
  })

  it('handleCitySelect enriches with a looked-up timezone and resets state', () => {
    mockedTz.mockReturnValue('Asia/Seoul')
    const { result } = renderHook(() => useCitySearch('ko'))

    let returned: ReturnType<typeof result.current.handleCitySelect> | undefined
    act(() => {
      returned = result.current.handleCitySelect(sampleCity)
    })

    expect(mockedTz).toHaveBeenCalledWith(sampleCity.lat, sampleCity.lon)
    expect(returned).toEqual({ ...sampleCity, timezone: 'Asia/Seoul' })
    expect(result.current.selectedCity).toEqual({ ...sampleCity, timezone: 'Asia/Seoul' })
    expect(result.current.openSug).toBe(false)
    expect(result.current.suggestions).toEqual([])
    expect(result.current.cityErr).toBeNull()
  })

  it('handleCitySelect uses the city-provided timezone without calling tzLookup', () => {
    const { result } = renderHook(() => useCitySearch('ko'))
    const withTz = { ...sampleCity, timezone: 'Asia/Tokyo' }

    let returned: ReturnType<typeof result.current.handleCitySelect> | undefined
    act(() => {
      returned = result.current.handleCitySelect(withTz)
    })

    expect(mockedTz).not.toHaveBeenCalled()
    expect(returned?.timezone).toBe('Asia/Tokyo')
  })

  it('handleCitySelect returns the original city and sets an error when tzLookup throws (ko)', () => {
    mockedTz.mockImplementation(() => {
      throw new Error('tz fail')
    })
    const { result } = renderHook(() => useCitySearch('ko'))

    let returned: ReturnType<typeof result.current.handleCitySelect> | undefined
    act(() => {
      returned = result.current.handleCitySelect(sampleCity)
    })

    expect(returned).toBe(sampleCity)
    expect(result.current.cityErr).toBe('타임존 조회 실패')
  })

  it('handleCitySelect sets an English error when tzLookup throws and locale=en', () => {
    mockedTz.mockImplementation(() => {
      throw new Error('tz fail')
    })
    const { result } = renderHook(() => useCitySearch('en'))

    act(() => {
      result.current.handleCitySelect(sampleCity)
    })

    expect(result.current.cityErr).toBe('Timezone lookup failed')
  })

  it('exposes setOpenSug and setSelectedCity setters', () => {
    const { result } = renderHook(() => useCitySearch('ko'))

    act(() => {
      result.current.setOpenSug(true)
    })
    expect(result.current.openSug).toBe(true)

    act(() => {
      result.current.setSelectedCity(sampleCity)
    })
    expect(result.current.selectedCity).toEqual(sampleCity)
  })

  it('cleans up the pending debounce timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    const { result, unmount } = renderHook(() => useCitySearch('ko'))

    act(() => {
      result.current.handleCityInputChange('Seoul')
    })

    unmount()
    expect(clearTimeoutSpy).toHaveBeenCalled()
  })
})

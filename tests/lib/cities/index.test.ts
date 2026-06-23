import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchCities } from '@/lib/cities/index'

/**
 * cities/index — searchCities: client-side cached fetch against /api/cities.
 * happy-dom provides `window`, and tests/setup.ts mocks `global.fetch`.
 * The module keeps an in-memory query cache + cached origin, so each test
 * uses a unique query string to avoid cross-test cache hits.
 */

const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>

function mockCitiesResponse(results: unknown, ok = true, status = 200) {
  fetchMock.mockResolvedValueOnce({
    ok,
    status,
    json: async () => ({ results }),
    text: async () => JSON.stringify({ results }),
  })
}

describe('cities/index searchCities', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  afterEach(() => {
    fetchMock.mockReset()
  })

  it('returns [] for empty / nullish queries without fetching', async () => {
    expect(await searchCities('')).toEqual([])
    expect(await searchCities(null)).toEqual([])
    expect(await searchCities(undefined)).toEqual([])
    expect(await searchCities('   ')).toEqual([]) // norm() trims to empty
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches and returns the results array on success', async () => {
    const results = [{ name: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.978, nameKr: '서울' }]
    mockCitiesResponse(results)

    const out = await searchCities('seoul-unique-1')
    expect(out).toEqual(results)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('/api/cities')
    expect(calledUrl).toContain('q=seoul-unique-1')
    expect(calledUrl).toContain('limit=20') // default limit
  })

  it('normalizes the query (trim + lowercase) before sending', async () => {
    mockCitiesResponse([])
    await searchCities('  ToKyO-UNIQUE  ')
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('q=tokyo-unique')
  })

  it('honors a custom limit', async () => {
    mockCitiesResponse([])
    await searchCities('paris-unique', { limit: 5 })
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('limit=5')
  })

  it('returns [] when the API result is not an array', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: null }),
      text: async () => '{}',
    })
    expect(await searchCities('noarray-unique')).toEqual([])
  })

  it('returns [] when the payload has no results field', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '{}',
    })
    expect(await searchCities('empty-payload-unique')).toEqual([])
  })

  it('throws when the response is not ok', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => '',
    })
    await expect(searchCities('boom-unique')).rejects.toThrow(/Failed to search cities: 500/)
  })

  it('caches results — a repeated query within TTL does not refetch', async () => {
    const results = [{ name: 'Berlin', country: 'DE', lat: 52.52, lon: 13.405 }]
    mockCitiesResponse(results)

    const first = await searchCities('berlin-cache')
    expect(first).toEqual(results)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Second call hits the cache; no further fetch.
    const second = await searchCities('berlin-cache')
    expect(second).toEqual(results)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('uses a separate cache entry per limit', async () => {
    mockCitiesResponse([{ name: 'A', country: 'XX', lat: 0, lon: 0 }])
    await searchCities('limitkey-cache', { limit: 10 })
    mockCitiesResponse([{ name: 'B', country: 'YY', lat: 1, lon: 1 }])
    await searchCities('limitkey-cache', { limit: 20 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
